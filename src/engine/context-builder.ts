// ============================================================
// PART 1 — Story Bible Context Builder
// 망각 방지 동적 시스템 프롬프트 생성
// Phase 5: Hybrid Context 3-Tier 명시화
// ============================================================

import type { StoryConfig, EpisodeManuscript, AppLanguage } from '@/lib/studio-types';
import { buildContinuityReport, type ContinuityReport } from './continuity-tracker';
import { loadProfile, buildProfileHint } from './writer-profile';
import { buildShadowPrompt, type ShadowState } from './shadow';
import { logger } from '@/lib/logger';

/**
 * 언어별 텍스트 픽업 헬퍼.
 * KO/EN/JP/CN 4언어 직접 분기. 누락 키는 KO → EN 순으로 fallback.
 */
function pickLang(language: AppLanguage, dict: Partial<Record<AppLanguage, string>>): string {
  return dict[language] ?? dict.KO ?? dict.EN ?? '';
}

// IDENTITY_SEAL: PART-1 | role=module header + imports | inputs=none | outputs=none

// ============================================================
// PART 2 — 데이터 추출 헬퍼
// ============================================================

/** 원고에서 마지막 문단(3문장) 추출 — 꼬리물기용 */
function extractLastScene(content: string): string {
  if (!content) return '';
  const sentences = content.split(/(?<=[.!?。！？\n])\s*/).filter(s => s.trim().length > 5);
  return sentences.slice(-3).join(' ').trim().slice(0, 500);
}

/** 원고에서 마지막 3문장 추출 + 🔥 태깅 — Tier C 전용 */
function extractLast3Sentences(content: string): string {
  if (!content) return '';
  const sentences = content.split(/(?<=[.!?。！？])\s*/).filter(s => s.trim().length > 5);
  const last3 = sentences.slice(-3);
  if (last3.length === 0) return '';
  return last3.map(s => `🔥 ${s.trim()}`).join('\n');
}

/** 토큰 추정 (CJK 혼합 텍스트용) */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkChars = (text.match(/[\u3000-\u9fff\uac00-\ud7af]/g) || []).length;
  const cjkRatio = text.length > 0 ? cjkChars / text.length : 0;
  const tokensPerChar = cjkRatio * 1.5 + (1 - cjkRatio) * 0.35;
  return Math.round(text.length * tokensPerChar);
}

/** 캐릭터 상태를 마크다운 텍스트로 변환 */
function formatCharacterStates(report: ContinuityReport, language: AppLanguage): string {
  if (!report.episodes.length) return '';
  const latest = report.episodes[report.episodes.length - 1];
  const activeChars = latest.characters.filter(c => c.present);
  if (!activeChars.length) return '';

  const dialogueLabel = (n: number) => pickLang(language, {
    KO: `대사 ${n}회`,
    EN: `${n} dialogue lines`,
    JP: `セリフ ${n}回`,
    CN: `对话 ${n} 次`,
  });
  const noStateLabel = pickLang(language, {
    KO: '특이사항 없음',
    EN: 'No notable state',
    JP: '特記事項なし',
    CN: '无特殊状态',
  });

  return activeChars.map(c => {
    const flags = c.stateFlags;
    const lastAction = c.dialogueCount > 0 ? dialogueLabel(c.dialogueCount) : undefined;
    const state = flags.length > 0 ? flags.join(', ') : (lastAction || noStateLabel);
    return `- ${c.name}: ${state}${c.dialogueCount > 0 && flags.length > 0 ? ` (${dialogueLabel(c.dialogueCount)})` : ''}`;
  }).join('\n');
}

/** 미해결 복선 중 상위 2개 추출 */
function formatOpenThreads(report: ContinuityReport): string {
  if (!report.episodes.length) return '';
  const allOpen: string[] = [];
  for (const ep of report.episodes) {
    for (const t of ep.openThreads) {
      if (!allOpen.includes(t)) allOpen.push(t);
    }
  }
  // 오래된 것 우선 (먼저 등장한 것)
  return allOpen.slice(0, 2).map((t, i) => `${i + 1}. ${t}`).join('\n');
}

// IDENTITY_SEAL: PART-2 | role=data extraction helpers | inputs=content/report | outputs=formatted strings

// ============================================================
// PART 3 — 3-Tier Episode Context Builder
// Tier A (1~N-3): compact summary 150자
// Tier B (N-2):   detailed summary 500자 + shadow hints
// Tier C (N-1):   full content 2000자 + last 3 sentences 🔥
// ============================================================

/**
 * Hybrid Context 3-Tier 에피소드 요약 생성.
 * 각 Tier별 다른 해상도로 이전 에피소드를 압축.
 * @returns { text: 조립된 텍스트, tierATokens, tierBTokens, tierCTokens }
 */
function buildTieredEpisodeSummaries(
  manuscripts: EpisodeManuscript[],
  currentEpisode: number,
  language: AppLanguage,
  shadowState?: ShadowState,
  totalEpisodes?: number,
): { text: string; tierATokens: number; tierBTokens: number; tierCTokens: number } {
  const prevEpisodes = manuscripts
    .filter(m => m.episode < currentEpisode && m.content)
    .sort((a, b) => a.episode - b.episode);

  if (prevEpisodes.length === 0) {
    return { text: '', tierATokens: 0, tierBTokens: 0, tierCTokens: 0 };
  }

  const tierALines: string[] = [];
  const tierBLines: string[] = [];
  const tierCLines: string[] = [];

  const nMinus2 = currentEpisode - 2; // Tier B episode
  const nMinus1 = currentEpisode - 1; // Tier C episode

  // Episode unit suffix per language (KO uses '화', JP uses '話', CN uses '集')
  const epUnit = pickLang(language, { KO: '화', EN: '', JP: '話', CN: '集' });

  for (const m of prevEpisodes) {
    // --------------------------------------------------------
    // TIER C (N-1): FULL content (up to 2000 chars) + last 3 sentences 🔥
    // 가장 최근 에피소드 — 최대 해상도
    // --------------------------------------------------------
    if (m.episode === nMinus1) {
      const fullContent = m.content.slice(0, 2000);
      const last3 = extractLast3Sentences(m.content);
      let tierCText = pickLang(language, {
        KO: `[Tier C — ${m.episode}화 전문 (직전 화)]:\n${fullContent}`,
        EN: `[Tier C — Ep.${m.episode} Full Text (Previous)]:\n${fullContent}`,
        JP: `[Tier C — 第${m.episode}話 全文 (直前話)]:\n${fullContent}`,
        CN: `[Tier C — 第${m.episode}集 全文 (上一集)]:\n${fullContent}`,
      });
      if (last3) {
        tierCText += pickLang(language, {
          KO: `\n\n[마지막 3문장 — 연결 필수]:\n${last3}`,
          EN: `\n\n[Last 3 Sentences — Must Continue]:\n${last3}`,
          JP: `\n\n[最後の3文 — 連続必須]:\n${last3}`,
          CN: `\n\n[最后3句 — 必须衔接]:\n${last3}`,
        });
      }
      tierCLines.push(tierCText);
      continue;
    }

    // --------------------------------------------------------
    // TIER B (N-2): detailed summary (500 chars) + shadow state hints
    // 2화 전 에피소드 — 중간 해상도 + 서사 파수꾼 힌트
    // --------------------------------------------------------
    if (m.episode === nMinus2) {
      let detail: string;
      if (m.detailedSummary) {
        detail = m.detailedSummary;
      } else if (m.summary) {
        detail = m.summary;
      } else {
        detail = m.content.slice(0, 500);
      }
      let tierBText = pickLang(language, {
        KO: `[Tier B — ${m.episode}화 상세 요약 (2화 전)]:\n${detail}`,
        EN: `[Tier B — Ep.${m.episode} Detailed Summary (2 eps ago)]:\n${detail}`,
        JP: `[Tier B — 第${m.episode}話 詳細要約 (2話前)]:\n${detail}`,
        CN: `[Tier B — 第${m.episode}集 详细摘要 (前2集)]:\n${detail}`,
      });

      // Shadow State 힌트를 Tier B에 인라인 주입
      if (shadowState) {
        const total = totalEpisodes ?? 25;
        // shadow.ts는 'KO' | 'EN'만 지원 — JP/CN은 EN으로 fallback
        const shadowLang: 'KO' | 'EN' = language === 'KO' ? 'KO' : 'EN';
        const shadowHint = buildShadowPrompt(shadowState, currentEpisode, total, shadowLang);
        if (shadowHint) {
          tierBText += pickLang(language, {
            KO: `\n[서사 파수꾼 상태]:\n${shadowHint}`,
            EN: `\n[Narrative Sentinel State]:\n${shadowHint}`,
            JP: `\n[ナラティブ・センチネル状態]:\n${shadowHint}`,
            CN: `\n[叙事哨兵状态]:\n${shadowHint}`,
          });
        }
      }

      tierBLines.push(tierBText);
      continue;
    }

    // --------------------------------------------------------
    // TIER A (1~N-3): compact summary (150 chars)
    // 초기 에피소드 — 최소 해상도
    // --------------------------------------------------------
    if (m.summary) {
      tierALines.push(`- ${m.episode}${epUnit}: ${m.summary}`);
    } else {
      const firstLines = m.content.split(/\n/).filter(l => l.trim()).slice(0, 2).join(' ').slice(0, 150);
      tierALines.push(`- ${m.episode}${epUnit}: ${firstLines}`);
    }
  }

  // 조립
  const parts: string[] = [];

  if (tierALines.length > 0) {
    parts.push(pickLang(language, {
      KO: `[Tier A — 초기 에피소드 요약 (압축)]:\n${tierALines.join('\n')}`,
      EN: `[Tier A — Early Episodes (Compact)]:\n${tierALines.join('\n')}`,
      JP: `[Tier A — 初期エピソード要約 (圧縮)]:\n${tierALines.join('\n')}`,
      CN: `[Tier A — 早期剧集摘要 (压缩)]:\n${tierALines.join('\n')}`,
    }));
  }
  if (tierBLines.length > 0) {
    parts.push(tierBLines.join('\n'));
  }
  if (tierCLines.length > 0) {
    parts.push(tierCLines.join('\n'));
  }

  const tierAText = tierALines.join('\n');
  const tierBText = tierBLines.join('\n');
  const tierCText = tierCLines.join('\n');

  return {
    text: parts.join('\n\n'),
    tierATokens: estimateTokens(tierAText),
    tierBTokens: estimateTokens(tierBText),
    tierCTokens: estimateTokens(tierCText),
  };
}

// IDENTITY_SEAL: PART-3 | role=3-tier context builder | inputs=manuscripts,currentEpisode | outputs=tiered text + token counts

// ============================================================
// PART 4 — Story Bible 프롬프트 생성
// ============================================================

export interface StoryBibleInput {
  config: StoryConfig;
  manuscripts: EpisodeManuscript[];
  currentEpisode: number;
  language: 'KO' | 'EN' | 'JP' | 'CN';
  /** Optional shadow state for narrative sentinel integration */
  shadowState?: ShadowState;
  /** Phase 6: Active branch name (e.g. "universe/dark-ending"). Omit or set "main" to skip. */
  branch?: string;
  /** Phase 6: Episode number where the branch diverged from main. */
  branchForkEpisode?: number;
}

/**
 * 망각 방지 시스템 프롬프트(Story Bible)를 동적으로 생성.
 * useStudioAI에서 AI 호출 직전에 시스템 프롬프트에 주입.
 * Phase 5: Hybrid Context — 3-Tier episode context 적용
 * 토큰 예산: ~800토큰 이내 (32B 8K 컨텍스트의 10%)
 */
export function buildStoryBible(input: StoryBibleInput): string {
  const { config, manuscripts, currentEpisode, language } = input;

  // 연속성 리포트 생성
  const report = buildContinuityReport(
    manuscripts,
    config.characters || [],
    currentEpisode,
    5, // 최근 5화 윈도우
  );

  // 직전 화 마지막 씬 추출
  const prevMs = manuscripts.find(m => m.episode === currentEpisode - 1);
  const lastScene = extractLastScene(prevMs?.content || '');

  // 현재 위치 (가장 최근 에피소드)
  const latestEp = report.episodes[report.episodes.length - 1];
  const currentLocation = latestEp?.location || '';

  // 캐릭터 상태
  const charStates = formatCharacterStates(report, language);

  // 미해결 복선
  const openThreads = formatOpenThreads(report);

  // ── Phase 5: 3-Tier Hybrid Context ──
  // Shadow State는 Tier B(N-2) 섹션에 인라인으로 주입됨
  const tieredContext = buildTieredEpisodeSummaries(
    manuscripts,
    currentEpisode,
    language,
    input.shadowState,
    config.totalEpisodes,
  );

  // 토큰 분배 로그
  logger.debug(
    'StoryBible',
    `Tier A: ${tieredContext.tierATokens} tokens, ` +
    `Tier B: ${tieredContext.tierBTokens} tokens, ` +
    `Tier C: ${tieredContext.tierCTokens} tokens`
  );

  // 작가 수정 패턴 분석 (최근 corrections에서 스타일 힌트 추출)
  const allCorrections = manuscripts
    .filter(m => m.corrections && m.corrections.length > 0)
    .flatMap(m => m.corrections || [])
    .slice(-10); // 최근 10개

  let writerStyleHint = '';
  if (allCorrections.length >= 3) {
    const patterns: string[] = [];
    const rewriteCount = allCorrections.filter(c => c.action === 'rewrite').length;
    const compressCount = allCorrections.filter(c => c.action === 'compress').length;
    const expandCount = allCorrections.filter(c => c.action === 'expand').length;
    if (rewriteCount >= 2) patterns.push(pickLang(language, {
      KO: '문장 표현을 자주 다듬음',
      EN: 'Frequently polishes phrasing',
      JP: '文章表現を頻繁に推敲',
      CN: '经常打磨句式表达',
    }));
    if (compressCount >= 2) patterns.push(pickLang(language, {
      KO: '간결한 문체 선호',
      EN: 'Prefers concise style',
      JP: '簡潔な文体を好む',
      CN: '偏好简洁文体',
    }));
    if (expandCount >= 2) patterns.push(pickLang(language, {
      KO: '상세한 묘사 선호',
      EN: 'Prefers detailed description',
      JP: '詳細な描写を好む',
      CN: '偏好细致描写',
    }));
    if (patterns.length > 0) {
      const styleHeader = pickLang(language, {
        KO: '\n\n📝 작가 스타일 메모:\n',
        EN: '\n\n📝 Writer Style Notes:\n',
        JP: '\n\n📝 作家スタイルメモ:\n',
        CN: '\n\n📝 作家风格备注:\n',
      });
      writerStyleHint = styleHeader + patterns.map(p => `- ${p}`).join('\n');
    }
  }

  // 프롬프트 조립 (800토큰 이내)
  const sections: string[] = [];

  // 헤더
  const untitledLabel = pickLang(language, { KO: '무제', EN: 'Untitled', JP: '無題', CN: '无题' });
  sections.push(pickLang(language, {
    KO: `# 작품 사전 (Story Bible) — ${config.title || untitledLabel}`,
    EN: `# Story Bible — ${config.title || untitledLabel}`,
    JP: `# 作品事典 (Story Bible) — ${config.title || untitledLabel}`,
    CN: `# 作品圣经 (Story Bible) — ${config.title || untitledLabel}`,
  }));

  // Phase 6: Branch Context — 분기 우주 정보
  const activeBranch = input.branch;
  if (activeBranch && activeBranch !== 'main') {
    const forkEp = input.branchForkEpisode;
    const forkInfo = forkEp
      ? pickLang(language, {
          KO: `${forkEp}화에서 분기`,
          EN: `branched from ep.${forkEp}`,
          JP: `第${forkEp}話から分岐`,
          CN: `从第${forkEp}集分支`,
        })
      : pickLang(language, {
          KO: '분기점 미상',
          EN: 'fork point unknown',
          JP: '分岐点不明',
          CN: '分支点未知',
        });
    sections.push(pickLang(language, {
      KO: `\n🌌 [현재 우주: ${activeBranch} (${forkInfo})]\n(※ 이 우주는 메인 타임라인과 다른 전개입니다. 분기 이후의 설정 변경을 존중하십시오.)`,
      EN: `\n🌌 [Active Universe: ${activeBranch} (${forkInfo})]\n(※ This is an alternate timeline. Respect divergent developments after the branch point.)`,
      JP: `\n🌌 [現在の宇宙: ${activeBranch} (${forkInfo})]\n(※ この宇宙はメインタイムラインと異なる展開です。分岐後の設定変更を尊重してください。)`,
      CN: `\n🌌 [当前宇宙: ${activeBranch} (${forkInfo})]\n(※ 此为与主时间线不同的平行宇宙。请尊重分支后的设定变化。)`,
    }));
  }

  // 현재 장소 (P0)
  if (currentLocation) {
    sections.push(pickLang(language, {
      KO: `\n📍 현재 장소: ${currentLocation}\n(※ 명시적 이동 묘사 없이 장소를 바꾸지 마십시오.)`,
      EN: `\n📍 Current Location: ${currentLocation}\n(※ Do not change location without explicit movement description.)`,
      JP: `\n📍 現在地: ${currentLocation}\n(※ 明示的な移動描写なしに場所を変えないでください。)`,
      CN: `\n📍 当前地点: ${currentLocation}\n(※ 没有明确的移动描写时，请勿变更场所。)`,
    }));
  }

  // 캐릭터 상태 (P0)
  if (charStates) {
    sections.push(pickLang(language, {
      KO: `\n👥 캐릭터 상태:\n${charStates}\n(※ 부상/상태가 있는 캐릭터의 행동 묘사에 반드시 반영하십시오.)`,
      EN: `\n👥 Character States:\n${charStates}\n(※ Reflect injuries/states in character actions.)`,
      JP: `\n👥 キャラクター状態:\n${charStates}\n(※ 負傷・状態のあるキャラクターの行動描写に必ず反映してください。)`,
      CN: `\n👥 角色状态:\n${charStates}\n(※ 必须将伤情/状态反映到角色的行动描写中。)`,
    }));
  }

  // 이전 줄거리 — Phase 5: 3-Tier Hybrid Context (P0)
  if (tieredContext.text) {
    sections.push(pickLang(language, {
      KO: `\n📜 이전 줄거리 (Hybrid Context):\n${tieredContext.text}`,
      EN: `\n📜 Story So Far (Hybrid Context):\n${tieredContext.text}`,
      JP: `\n📜 これまでのあらすじ (Hybrid Context):\n${tieredContext.text}`,
      CN: `\n📜 前情提要 (Hybrid Context):\n${tieredContext.text}`,
    }));
  }

  // 미해결 복선 (P1 — 소프트)
  if (openThreads) {
    sections.push(pickLang(language, {
      KO: `\n🧩 미해결 복선 (흐름에 맞으면 자연스럽게 언급):\n${openThreads}`,
      EN: `\n🧩 Active Hooks (weave naturally if fitting):\n${openThreads}`,
      JP: `\n🧩 未回収の伏線 (流れに合えば自然に言及):\n${openThreads}`,
      CN: `\n🧩 未解伏笔 (合适时自然带出):\n${openThreads}`,
    }));
  }

  // 직전 화 꼬리물기 (P0 — 최우선)
  if (lastScene) {
    sections.push(pickLang(language, {
      KO: `\n---\n🔥 직전 화 마지막 씬:\n"${lastScene}"\n\n위 장면에서 1초의 단절도 없이 바로 다음 행동/대사로 시작하십시오. 배경 설명이나 과거 회상으로 시작하지 마십시오.`,
      EN: `\n---\n🔥 Last Scene (Episode ${currentEpisode - 1}):\n"${lastScene}"\n\nContinue IMMEDIATELY from this scene. No background exposition or flashbacks to start.`,
      JP: `\n---\n🔥 直前話の最終シーン:\n"${lastScene}"\n\nこのシーンから1秒の断絶もなく、次の行動・セリフで開始してください。背景説明や回想で始めないでください。`,
      CN: `\n---\n🔥 上一集最终场景:\n"${lastScene}"\n\n请从该场景无缝衔接，立即进入下一个动作或对话。不要以背景说明或回忆开场。`,
    }));
  }

  // NOTE: Shadow State는 Tier B(N-2) 섹션에 이미 인라인 주입됨 (buildTieredEpisodeSummaries)
  // 별도 shadow 섹션을 중복 추가하지 않음

  // 작가 스타일 메모 (수정 패턴 기반)
  if (writerStyleHint) {
    sections.push(writerStyleHint);
  }

  // 작가 프로필 힌트 (누적 학습 데이터 기반)
  // NOTE: 이 섹션은 모든 Tier 이후 최하위 우선순위 — 토큰 부족 시 트리밍 대상
  try {
    const profile = loadProfile();
    const profileHint = buildProfileHint(profile, language);
    if (profileHint) {
      const profileHeader = pickLang(language, {
        KO: '\n\n🎯 작가 프로필 힌트:\n',
        EN: '\n\n🎯 Writer Profile Hints:\n',
        JP: '\n\n🎯 作家プロフィール ヒント:\n',
        CN: '\n\n🎯 作家档案提示:\n',
      });
      sections.push(profileHeader + profileHint);
    }
  } catch { /* profile load failure — non-critical */ }

  return sections.join('\n');
}

// IDENTITY_SEAL: PART-4 | role=story bible assembler | inputs=StoryBibleInput | outputs=system prompt string

// ============================================================
// PART 5 — Context Budget Summary (UI display helper)
// ============================================================

export interface ContextBudgetSummary {
  tierA: { label: string; episodes: number; tokens: number };
  tierB: { label: string; episodes: number; tokens: number };
  tierC: { label: string; episodes: number; tokens: number };
  total: number;
}

/** Compute a UI-friendly summary of hybrid context token budgets. */
export function getContextBudgetSummary(input: StoryBibleInput): ContextBudgetSummary {
  const { manuscripts, currentEpisode, language } = input;

  const tiered = buildTieredEpisodeSummaries(
    manuscripts, currentEpisode, language, input.shadowState, input.config.totalEpisodes,
  );

  const prevEps = manuscripts.filter(m => m.episode < currentEpisode && m.content);
  const nMinus1 = currentEpisode - 1;
  const nMinus2 = currentEpisode - 2;
  const tierACount = prevEps.filter(m => m.episode < nMinus2).length;

  return {
    tierA: {
      label: pickLang(language, {
        KO: `Tier A: ${tierACount}화 요약`,
        EN: `Tier A: ${tierACount} ep summaries`,
        JP: `Tier A: ${tierACount}話 要約`,
        CN: `Tier A: ${tierACount} 集摘要`,
      }),
      episodes: tierACount,
      tokens: tiered.tierATokens,
    },
    tierB: {
      label: pickLang(language, {
        KO: `Tier B: ${nMinus2}화 상세`,
        EN: `Tier B: Ep.${nMinus2} detailed`,
        JP: `Tier B: 第${nMinus2}話 詳細`,
        CN: `Tier B: 第${nMinus2}集 详细`,
      }),
      episodes: nMinus2 > 0 ? 1 : 0,
      tokens: tiered.tierBTokens,
    },
    tierC: {
      label: pickLang(language, {
        KO: `Tier C: ${nMinus1}화 원문`,
        EN: `Tier C: Ep.${nMinus1} full text`,
        JP: `Tier C: 第${nMinus1}話 原文`,
        CN: `Tier C: 第${nMinus1}集 原文`,
      }),
      episodes: nMinus1 > 0 ? 1 : 0,
      tokens: tiered.tierCTokens,
    },
    total: tiered.tierATokens + tiered.tierBTokens + tiered.tierCTokens,
  };
}

// IDENTITY_SEAL: PART-5 | role=context budget summary | inputs=StoryBibleInput | outputs=ContextBudgetSummary
