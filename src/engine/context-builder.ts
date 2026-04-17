// ============================================================
// PART 1 — Story Bible Context Builder
// 망각 방지 동적 시스템 프롬프트 생성
// Phase 5: Hybrid Context 3-Tier 명시화
// ============================================================

import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import { buildContinuityReport, type ContinuityReport } from './continuity-tracker';
import { loadProfile, buildProfileHint } from './writer-profile';
import { buildShadowPrompt, type ShadowState } from './shadow';
import { logger } from '@/lib/logger';

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
function formatCharacterStates(report: ContinuityReport, isKO: boolean): string {
  if (!report.episodes.length) return '';
  const latest = report.episodes[report.episodes.length - 1];
  const activeChars = latest.characters.filter(c => c.present);
  if (!activeChars.length) return '';

  return activeChars.map(c => {
    const flags = c.stateFlags;
    const lastAction = c.dialogueCount > 0 ? `대사 ${c.dialogueCount}회` : undefined;
    const state = flags.length > 0 ? flags.join(', ') : (lastAction || (isKO ? '특이사항 없음' : 'No notable state'));
    return `- ${c.name}: ${state}${c.dialogueCount > 0 && flags.length > 0 ? ` (대사 ${c.dialogueCount}회)` : ''}`;
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
  isKO: boolean,
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

  for (const m of prevEpisodes) {
    // --------------------------------------------------------
    // TIER C (N-1): FULL content (up to 2000 chars) + last 3 sentences 🔥
    // 가장 최근 에피소드 — 최대 해상도
    // --------------------------------------------------------
    if (m.episode === nMinus1) {
      const fullContent = m.content.slice(0, 2000);
      const last3 = extractLast3Sentences(m.content);
      let tierCText = isKO
        ? `[Tier C — ${m.episode}화 전문 (직전 화)]:\n${fullContent}`
        : `[Tier C — Ep.${m.episode} Full Text (Previous)]:\n${fullContent}`;
      if (last3) {
        tierCText += isKO
          ? `\n\n[마지막 3문장 — 연결 필수]:\n${last3}`
          : `\n\n[Last 3 Sentences — Must Continue]:\n${last3}`;
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
      let tierBText = isKO
        ? `[Tier B — ${m.episode}화 상세 요약 (2화 전)]:\n${detail}`
        : `[Tier B — Ep.${m.episode} Detailed Summary (2 eps ago)]:\n${detail}`;

      // Shadow State 힌트를 Tier B에 인라인 주입
      if (shadowState) {
        const total = totalEpisodes ?? 25;
        const shadowHint = buildShadowPrompt(shadowState, currentEpisode, total, isKO);
        if (shadowHint) {
          tierBText += isKO
            ? `\n[서사 파수꾼 상태]:\n${shadowHint}`
            : `\n[Narrative Sentinel State]:\n${shadowHint}`;
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
      tierALines.push(`- ${m.episode}${isKO ? '화' : ''}: ${m.summary}`);
    } else {
      const firstLines = m.content.split(/\n/).filter(l => l.trim()).slice(0, 2).join(' ').slice(0, 150);
      tierALines.push(`- ${m.episode}${isKO ? '화' : ''}: ${firstLines}`);
    }
  }

  // 조립
  const parts: string[] = [];

  if (tierALines.length > 0) {
    parts.push(isKO
      ? `[Tier A — 초기 에피소드 요약 (압축)]:\n${tierALines.join('\n')}`
      : `[Tier A — Early Episodes (Compact)]:\n${tierALines.join('\n')}`);
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
  const isKO = language === 'KO';

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
  const charStates = formatCharacterStates(report, isKO);

  // 미해결 복선
  const openThreads = formatOpenThreads(report);

  // ── Phase 5: 3-Tier Hybrid Context ──
  // Shadow State는 Tier B(N-2) 섹션에 인라인으로 주입됨
  const tieredContext = buildTieredEpisodeSummaries(
    manuscripts,
    currentEpisode,
    isKO,
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
    if (rewriteCount >= 2) patterns.push(isKO ? '문장 표현을 자주 다듬음' : 'Frequently polishes phrasing');
    if (compressCount >= 2) patterns.push(isKO ? '간결한 문체 선호' : 'Prefers concise style');
    if (expandCount >= 2) patterns.push(isKO ? '상세한 묘사 선호' : 'Prefers detailed description');
    if (patterns.length > 0) {
      writerStyleHint = (isKO ? '\n\n📝 작가 스타일 메모:\n' : '\n\n📝 Writer Style Notes:\n')
        + patterns.map(p => `- ${p}`).join('\n');
    }
  }

  // 프롬프트 조립 (800토큰 이내)
  const sections: string[] = [];

  // 헤더
  sections.push(isKO
    ? `# 작품 사전 (Story Bible) — ${config.title || '무제'}`
    : `# Story Bible — ${config.title || 'Untitled'}`);

  // Phase 6: Branch Context — 분기 우주 정보
  const activeBranch = input.branch;
  if (activeBranch && activeBranch !== 'main') {
    const forkEp = input.branchForkEpisode;
    const forkInfo = forkEp
      ? (isKO ? `${forkEp}화에서 분기` : `branched from ep.${forkEp}`)
      : (isKO ? '분기점 미상' : 'fork point unknown');
    sections.push(isKO
      ? `\n🌌 [현재 우주: ${activeBranch} (${forkInfo})]\n(※ 이 우주는 메인 타임라인과 다른 전개입니다. 분기 이후의 설정 변경을 존중하십시오.)`
      : `\n🌌 [Active Universe: ${activeBranch} (${forkInfo})]\n(※ This is an alternate timeline. Respect divergent developments after the branch point.)`);
  }

  // 현재 장소 (P0)
  if (currentLocation) {
    sections.push(isKO
      ? `\n📍 현재 장소: ${currentLocation}\n(※ 명시적 이동 묘사 없이 장소를 바꾸지 마십시오.)`
      : `\n📍 Current Location: ${currentLocation}\n(※ Do not change location without explicit movement description.)`);
  }

  // 캐릭터 상태 (P0)
  if (charStates) {
    sections.push(isKO
      ? `\n👥 캐릭터 상태:\n${charStates}\n(※ 부상/상태가 있는 캐릭터의 행동 묘사에 반드시 반영하십시오.)`
      : `\n👥 Character States:\n${charStates}\n(※ Reflect injuries/states in character actions.)`);
  }

  // 이전 줄거리 — Phase 5: 3-Tier Hybrid Context (P0)
  if (tieredContext.text) {
    sections.push(isKO
      ? `\n📜 이전 줄거리 (Hybrid Context):\n${tieredContext.text}`
      : `\n📜 Story So Far (Hybrid Context):\n${tieredContext.text}`);
  }

  // 미해결 복선 (P1 — 소프트)
  if (openThreads) {
    sections.push(isKO
      ? `\n🧩 미해결 복선 (흐름에 맞으면 자연스럽게 언급):\n${openThreads}`
      : `\n🧩 Active Hooks (weave naturally if fitting):\n${openThreads}`);
  }

  // 직전 화 꼬리물기 (P0 — 최우선)
  if (lastScene) {
    sections.push(isKO
      ? `\n---\n🔥 직전 화 마지막 씬:\n"${lastScene}"\n\n위 장면에서 1초의 단절도 없이 바로 다음 행동/대사로 시작하십시오. 배경 설명이나 과거 회상으로 시작하지 마십시오.`
      : `\n---\n🔥 Last Scene (Episode ${currentEpisode - 1}):\n"${lastScene}"\n\nContinue IMMEDIATELY from this scene. No background exposition or flashbacks to start.`);
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
    const profileHint = buildProfileHint(profile, isKO);
    if (profileHint) {
      sections.push((isKO ? '\n\n🎯 작가 프로필 힌트:\n' : '\n\n🎯 Writer Profile Hints:\n') + profileHint);
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
  const isKO = language === 'KO';

  const tiered = buildTieredEpisodeSummaries(
    manuscripts, currentEpisode, isKO, input.shadowState, input.config.totalEpisodes,
  );

  const prevEps = manuscripts.filter(m => m.episode < currentEpisode && m.content);
  const nMinus1 = currentEpisode - 1;
  const nMinus2 = currentEpisode - 2;
  const tierACount = prevEps.filter(m => m.episode < nMinus2).length;

  return {
    tierA: {
      label: isKO ? `Tier A: ${tierACount}화 요약` : `Tier A: ${tierACount} ep summaries`,
      episodes: tierACount,
      tokens: tiered.tierATokens,
    },
    tierB: {
      label: isKO ? `Tier B: ${nMinus2}화 상세` : `Tier B: Ep.${nMinus2} detailed`,
      episodes: nMinus2 > 0 ? 1 : 0,
      tokens: tiered.tierBTokens,
    },
    tierC: {
      label: isKO ? `Tier C: ${nMinus1}화 원문` : `Tier C: Ep.${nMinus1} full text`,
      episodes: nMinus1 > 0 ? 1 : 0,
      tokens: tiered.tierCTokens,
    },
    total: tiered.tierATokens + tiered.tierBTokens + tiered.tierCTokens,
  };
}

// IDENTITY_SEAL: PART-5 | role=context budget summary | inputs=StoryBibleInput | outputs=ContextBudgetSummary
