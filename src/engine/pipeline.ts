import { StoryConfig, AppLanguage } from '../lib/studio-types';
import { PlatformType, getActFromEpisode } from './types';
import { tensionCurve } from './models';
import { getTargetCharRange } from './serialization';
import { createT } from '@/lib/i18n';
import { GENRE_BENCHMARKS } from './genre-review';
import { buildPublishPlatformBlock } from './builders/platform-builder';
import { buildPrismBlock, buildPrismModeBlock } from './builders/prism-builder';
import { GRAMMAR_PACKS } from '@/lib/grammar-packs';
import { buildShadowPrompt } from './shadow';
import { logger } from '@/lib/logger';
import { getGenreSystemPrompt, type PromptLang } from './genre-prompts';
import {
  ACT_GUIDELINES,
  LANG_NAMES,
  buildEHRules,
  buildGenrePreset,
  buildLanguagePackBlock,
  buildStyleDNA,
  pickLang,
} from './pipeline-prompt-blocks';
import { buildCharacterPromptBlocks } from './pipeline-character-blocks';
import { buildSceneDirectionBlock } from './pipeline-scene-direction';
// [I-02 — 2026-05-10 — Studio 마이그레이션 진입점] writing-agent-registry 통합 헬퍼.
// buildSystemInstruction 본문은 800+ LOC + 30+ 테스트 의존이라 점진 전환 (다음 phase).
// 호출 측은 buildAgentBaseStudioPrompt() 를 통해 레지스트리 base prompt 추출 가능.
import { buildAgentSystemPrompt } from '@/lib/ai/writing-agent-registry';
import { toAgentLang } from '@/lib/ai/lang-normalize';
// [N1-noa-identity — 2026-06-11] 단일 노아 화자 정본 — studio-constants.SYSTEM_INSTRUCTION
// 와 2벌이던 화자 2줄·ENGINE LOGIC·OUTPUT RULES 를 noa-identity 로 단일화하고,
// 모든 생성 경로(레거시/레지스트리)의 시스템 프롬프트 최상단에 노아 헤더를 주입한다.
import {
  buildNoaSystemHeader,
  NOA_ENGINE_PREAMBLE,
  NOA_ENGINE_LOGIC,
  buildNoaOutputRules,
} from '@/lib/ai/noa-identity';
export { buildPublishPlatformBlock, buildPrismBlock, buildPrismModeBlock };
export { buildEHRules, buildGenrePreset, buildLanguagePackBlock, buildStyleDNA } from './pipeline-prompt-blocks';
export { buildUserPrompt } from './pipeline-user-prompt';
export { postProcessResponse, stripEngineArtifacts } from './pipeline-postprocess';

// ============================================================
// [I-02 — 2026-05-10] Studio Draft 레지스트리 통합 헬퍼
// ============================================================
//
// studio-draft 레지스트리 정의에서 base prompt 만 추출.
// 현재 buildSystemInstruction (line ~430~1240) 가 자체 조립하는 layer 와 정합:
//   role + duty + no-english-thinking-korean-novel + ip-brand-guard + LANG_DIRECTIVE
// 점진 마이그레이션 시 buildSystemInstruction 의 시작 부분을 이 출력으로 교체 예정.
//
// 회귀 보호: 본 phase 는 진입점만 — buildSystemInstruction 본문 미변경.
// 호출 측 (geminiService 등) 이 명시적으로 사용 가능. 30+ 테스트 영향 0.
//
// 활성화 사용 예시 (다음 phase 마이그레이션 시 권장 패턴):
//
//   import { buildSystemInstruction, buildAgentBaseStudioPrompt } from '@/engine/pipeline';
//   import { buildSparkSystemPrompt } from '@/lib/dgx-models';
//
//   const baseFromRegistry = buildAgentBaseStudioPrompt(language, {
//     characterDna: dnaBlock,
//     worldBook: worldBlock,
//     sceneSheet: sceneBlock,
//     // ...
//   });
//   const legacy = buildSystemInstruction(config, language, platform, ruleLevel);
//   // dedup: 두 출력의 가드 ('/no_think') 중복은 buildSparkSystemPrompt 가 흡수
//   const finalSystem = buildSparkSystemPrompt([baseFromRegistry, legacy].join('\n\n'));
//
// 위 패턴은 출력 prompt 의 시작이 레지스트리 정의로 통일되며, 기존 layer (act/dna/
// tension/origin) 는 그대로 유지된다. 회귀 평가는 30+ 단위 테스트 fixture 비교 필요.
//
// ============================================================

export function buildAgentBaseStudioPrompt(
  language: AppLanguage,
  context: {
    characterDna?: string;
    worldBook?: string;
    sceneSheet?: string;
    genreRules?: string;
    storySummary?: string;
    glossary?: string;
    actGuide?: string;
    styleDna?: string;
    tensionCurve?: string;
    originGuide?: string;
  } = {},
): string {
  // [M-07 — 2026-05-10] autoTrim 활성화 — critical token pressure 도달 시
  // CONTEXT_BLOCK_TRIM_ORDER 따라 우선순위 낮은 contextBlock 자동 제거.
  // origin-guide → continuity-notes → tension-curve → story-summary → world-book → ... 순.
  // CRITICAL (character-dna / scene-sheet / act-guide / style-dna) 은 마지막까지 유지.
  return buildAgentSystemPrompt('studio-draft', {
    language: toAgentLang(language),
    'character-dna': context.characterDna,
    'world-book': context.worldBook,
    'scene-sheet': context.sceneSheet,
    'genre-rules': context.genreRules,
    'story-summary': context.storySummary,
    'glossary': context.glossary,
    'act-guide': context.actGuide,
    'style-dna': context.styleDna,
    'tension-curve': context.tensionCurve,
    'origin-guide': context.originGuide,
  }, { autoTrim: true });
}

export function buildSystemInstruction(
  config: StoryConfig,
  language: AppLanguage,
  platform: PlatformType = PlatformType.MOBILE,
  ruleLevel: number = 1,
  options: { useAgentRegistry?: boolean } = {},
): string {
  const totalEpisodes = config.totalEpisodes ?? 25;
  const actInfo = getActFromEpisode(config.episode, totalEpisodes);
  const targetTension = Math.round(tensionCurve(config.episode, totalEpisodes, config.genre) * 100);
  const platformTarget = getTargetCharRange(platform);
  // 가드레일이 설정되어 있으면 사용자 수치 우선, 아니면 플랫폼 기본값
  const charTarget = {
    min: config.guardrails?.min && config.guardrails.min > 0 ? config.guardrails.min : platformTarget.min,
    max: config.guardrails?.max && config.guardrails.max > 0 ? config.guardrails.max : platformTarget.max,
  };
  const t = createT(language);
  const actGuide = ACT_GUIDELINES[actInfo.act] ?? ACT_GUIDELINES[1];

  const {
    characterDNA,
    tier2Block,
    tier2DetailBlock,
    tier3DetailBlock,
    charRelations,
  } = buildCharacterPromptBlocks(config, language);
  const sceneDirectionBlock = buildSceneDirectionBlock(config.sceneDirection, language);
  // Simulator reference data (Legacy simulatorRef + New worldSimData)
  const simRef = config.simulatorRef;
  const worldSim = config.worldSimData;
  let simulatorBlock = '';
  
  const simParts: string[] = [];
  
  // Legacy simulatorRef handling
  if (simRef) {
    if (simRef.worldConsistency) simParts.push(`- ${t('pipeline.worldConsistency')}`);
    if (simRef.genreLevel && simRef.ruleLevel) simParts.push(`- ${t('pipeline.genreLevelRules')}: Lv${simRef.ruleLevel}`);
    if (simRef.genreSelections && simRef.genreSelections.length > 0) {
      const genreStr = simRef.genreSelections.map(s => `${s.genre} Lv${s.level}`).join(' + ');
      simParts.push(`- ${t('pipeline.genreBlend')}: ${genreStr} (${simRef.genreSelections.length}${t('pipeline.genreBlendSuffix')})`);
    }
    if (simRef.civRelations && simRef.civRelationSummary && simRef.civRelationSummary.length > 0) {
      simParts.push(`- ${t('pipeline.civRelations')}:`);
      simRef.civRelationSummary.forEach(s => simParts.push(`  ${s}`));
    }
    if (simRef.civNames && simRef.civNames.length > 0) {
      simParts.push(`- ${t('pipeline.civilizations')}: ${simRef.civNames.join(', ')}`);
    }
    if (simRef.timeline) simParts.push(`- ${t('pipeline.eraTimeline')}`);
    if (simRef.territoryMap) simParts.push(`- ${t('pipeline.territoryMap')}`);
    if (simRef.languageSystem) simParts.push(`- ${t('pipeline.worldLanguageSystem')}`);
  }

  // New worldSimData handling (Universe Studio)
  if (worldSim) {
    if (worldSim.genreSelections && worldSim.genreSelections.length > 0) {
      const genreStr = worldSim.genreSelections.map(s => `${s.genre} Lv${s.level}`).join(' + ');
      simParts.push(`- [UNIVERSE MODE] Genre Blend: ${genreStr}`);
    }
    if (worldSim.ruleLevel) {
      simParts.push(`- [UNIVERSE MODE] Rule Intensity: Lv${worldSim.ruleLevel}`);
    }
    if (worldSim.civs && worldSim.civs.length > 0) {
      simParts.push(`- [UNIVERSE MODE] Civilizations:`);
      worldSim.civs.forEach(c => {
        const traits = c.traits && c.traits.length > 0 ? c.traits.join(', ') : 'No traits';
        simParts.push(`  * ${c.name} (Era: ${c.era}) - Traits: ${traits}`);
      });
    }
    if (worldSim.relations && worldSim.relations.length > 0) {
      simParts.push(`- [UNIVERSE MODE] Faction Relations:`);
      worldSim.relations.forEach(r => {
        simParts.push(`  * ${r.fromName} -> ${r.toName} (${r.type})`);
      });
    }
    if (worldSim.transitions && worldSim.transitions.length > 0) {
      simParts.push(`- [UNIVERSE MODE] Historical Transitions:`);
      worldSim.transitions.forEach(tr => {
        simParts.push(`  * ${tr.fromEra} -> ${tr.toEra}: ${tr.description}`);
      });
    }
  }

  if (simParts.length > 0) {
    simulatorBlock = '\n[WORLD SIMULATOR REFERENCE]\n' + simParts.join('\n');
  }

  // World 3-tier framework injection — Tier 별 분리 출력
  // Tier 1(핵심): corePremise / powerStructure / currentConflict
  // Tier 2(구조): worldHistory / magicTechSystem / socialSystem / factionRelations / economy / survivalEnvironment
  // Tier 3(문화): culture / religion / education / lawOrder / taboo / travelComm / truthVsBeliefs / dailyLife
  let worldTierBlock = '';
  {
    const WORLD_LABELS: Record<string, Record<AppLanguage, string>> = {
      economy: { KO: '경제/생활 방식', EN: 'Economy / Livelihood', JP: '経済/生活様式', CN: '经济/生活方式' },
      survivalEnvironment: { KO: '생존 환경', EN: 'Survival Environment', JP: '生存環境', CN: '生存环境' },
      culture: { KO: '문화', EN: 'Culture', JP: '文化', CN: '文化' },
      religion: { KO: '종교/신화', EN: 'Religion / Mythology', JP: '宗教/神話', CN: '宗教/神话' },
      education: { KO: '교육/지식 전달', EN: 'Education', JP: '教育/知識伝達', CN: '教育/知识传承' },
      lawOrder: { KO: '법/질서', EN: 'Law & Order', JP: '法/秩序', CN: '法律/秩序' },
      taboo: { KO: '금기/규범', EN: 'Taboo / Norms', JP: '禁忌/規範', CN: '禁忌/规范' },
      travelComm: { KO: '이동/통신', EN: 'Travel / Communication', JP: '移動/通信', CN: '出行/通讯' },
    };
    const wl = (key: string): string =>
      WORLD_LABELS[key]?.[language] ?? WORLD_LABELS[key]?.EN ?? key;

    const tier1Parts: string[] = [];
    if (config.corePremise) tier1Parts.push(`- ${t('pipeline.corePremise')}: ${config.corePremise}`);
    if (config.powerStructure) tier1Parts.push(`- ${t('pipeline.powerStructure')}: ${config.powerStructure}`);
    if (config.currentConflict) tier1Parts.push(`- ${t('pipeline.currentConflict')}: ${config.currentConflict}`);

    const tier2Parts: string[] = [];
    if (config.worldHistory) tier2Parts.push(`- ${t('pipeline.history')}: ${config.worldHistory}`);
    if (config.magicTechSystem) tier2Parts.push(`- ${t('pipeline.magicTech')}: ${config.magicTechSystem}`);
    if (config.socialSystem) tier2Parts.push(`- ${t('pipeline.socialSystem')}: ${config.socialSystem}`);
    if (config.factionRelations) tier2Parts.push(`- ${t('pipeline.factionRelations')}: ${config.factionRelations}`);
    if (config.economy) tier2Parts.push(`- ${wl('economy')}: ${config.economy}`);
    if (config.survivalEnvironment) tier2Parts.push(`- ${wl('survivalEnvironment')}: ${config.survivalEnvironment}`);

    const tier3Parts: string[] = [];
    if (config.culture) tier3Parts.push(`- ${wl('culture')}: ${config.culture}`);
    if (config.religion) tier3Parts.push(`- ${wl('religion')}: ${config.religion}`);
    if (config.education) tier3Parts.push(`- ${wl('education')}: ${config.education}`);
    if (config.lawOrder) tier3Parts.push(`- ${wl('lawOrder')}: ${config.lawOrder}`);
    if (config.taboo) tier3Parts.push(`- ${wl('taboo')}: ${config.taboo}`);
    if (config.travelComm) tier3Parts.push(`- ${wl('travelComm')}: ${config.travelComm}`);
    if (config.truthVsBeliefs) tier3Parts.push(`- ${t('pipeline.beliefsVsTruth')}: ${config.truthVsBeliefs}`);
    if (config.dailyLife) tier3Parts.push(`- ${t('pipeline.dailyLife')}: ${config.dailyLife}`);

    const blocks: string[] = [];
    if (tier1Parts.length > 0) {
      blocks.push(`[WORLD — ${pickLang(language, { KO: 'Tier 1 핵심', EN: 'Tier 1 Core', JP: 'Tier 1 核心', CN: 'Tier 1 核心' })}]\n${tier1Parts.join('\n')}`);
    }
    if (tier2Parts.length > 0) {
      blocks.push(`[WORLD — ${pickLang(language, { KO: 'Tier 2 구조', EN: 'Tier 2 Structure', JP: 'Tier 2 構造', CN: 'Tier 2 结构' })}]\n${tier2Parts.join('\n')}`);
    }
    if (tier3Parts.length > 0) {
      blocks.push(`[WORLD — ${pickLang(language, { KO: 'Tier 3 문화/사회', EN: 'Tier 3 Culture / Society', JP: 'Tier 3 文化/社会', CN: 'Tier 3 文化/社会' })}]\n${tier3Parts.join('\n')}`);
    }
    if (blocks.length > 0) {
      worldTierBlock = '\n' + blocks.join('\n\n');
    }
  }

  // ── Resource Studio: Items / Skills / MagicSystems ──
  // 최대 20개 제한, 초과 시 "외 N개" 표기 + 토큰 버짓 경고 이벤트 발행
  const RESOURCE_LIMIT = 20;
  const resourceTruncated: { kind: string; total: number; dropped: number }[] = [];

  // "외 N개" 표현 헬퍼 (4언어)
  const moreCountLabel = (n: number) => pickLang(language, {
    KO: `외 ${n}개`,
    EN: `and ${n} more`,
    JP: `他 ${n}件`,
    CN: `另外 ${n} 项`,
  });

  // M3 — 감사 구멍 #1 해결: activeItems/activeSkills 설정 시 그것만 주입.
  // 미설정 시 기존 최대 20개 폴백.
  const activeItemIds = new Set(config.sceneDirection?.activeItems ?? []);
  const activeSkillIds = new Set(config.sceneDirection?.activeSkills ?? []);

  const buildItemsBlock = (): string => {
    const items = config.items;
    if (!Array.isArray(items) || items.length === 0) return '';
    const filtered = activeItemIds.size > 0
      ? items.filter(it => activeItemIds.has(it.id))
      : items;
    const visible = filtered.slice(0, RESOURCE_LIMIT);
    if (visible.length === 0) return '';
    const lines = visible.map(it => {
      const name = it.name || '(unnamed)';
      const category = it.category || 'misc';
      const desc = (it.description || it.effect || '').trim();
      return `  - ${name} (${category})${desc ? `: ${desc}` : ''}`;
    });
    if (filtered.length > RESOURCE_LIMIT) {
      const extra = filtered.length - RESOURCE_LIMIT;
      resourceTruncated.push({ kind: 'items', total: filtered.length, dropped: extra });
      lines.push(`  - ${moreCountLabel(extra)}`);
    }
    const headerKey = activeItemIds.size > 0
      ? { KO: '활성 아이템 (이번 화)', EN: 'Active Items (this episode)', JP: 'アクティブアイテム (今話)', CN: '活跃物品 (本话)' }
      : { KO: '등장 아이템', EN: 'Items', JP: '登場アイテム', CN: '登场物品' };
    const header = pickLang(language, headerKey);
    return `\n[INVENTORY — ${header}]\n${lines.join('\n')}`;
  };

  const buildSkillsBlock = (): string => {
    const skills = config.skills;
    if (!Array.isArray(skills) || skills.length === 0) return '';
    const filtered = activeSkillIds.size > 0
      ? skills.filter(sk => activeSkillIds.has(sk.id))
      : skills;
    const visible = filtered.slice(0, RESOURCE_LIMIT);
    if (visible.length === 0) return '';
    const lines = visible.map(sk => {
      const name = sk.name || '(unnamed)';
      const type = sk.type || 'active';
      const desc = (sk.description || '').trim();
      return `  - ${name} (${type})${desc ? `: ${desc}` : ''}`;
    });
    if (filtered.length > RESOURCE_LIMIT) {
      const extra = filtered.length - RESOURCE_LIMIT;
      resourceTruncated.push({ kind: 'skills', total: filtered.length, dropped: extra });
      lines.push(`  - ${moreCountLabel(extra)}`);
    }
    const headerKey = activeSkillIds.size > 0
      ? { KO: '활성 스킬 (이번 화)', EN: 'Active Skills (this episode)', JP: 'アクティブスキル (今話)', CN: '活跃技能 (本话)' }
      : { KO: '등장 스킬', EN: 'Skills', JP: '登場スキル', CN: '登场技能' };
    const header = pickLang(language, headerKey);
    return `\n[SKILL-SET — ${header}]\n${lines.join('\n')}`;
  };

  const buildMagicSystemsBlock = (): string => {
    const magics = config.magicSystems;
    if (!Array.isArray(magics) || magics.length === 0) return '';
    const visible = magics.slice(0, RESOURCE_LIMIT);
    const lines = visible.map(m => {
      const name = m.name || '(unnamed)';
      const source = m.source || '';
      const rules = (m.rules || '').trim();
      const head = source ? `${name} (${source})` : name;
      return `  - ${head}${rules ? `: ${rules}` : ''}`;
    });
    if (magics.length > RESOURCE_LIMIT) {
      const extra = magics.length - RESOURCE_LIMIT;
      resourceTruncated.push({ kind: 'magicSystems', total: magics.length, dropped: extra });
      lines.push(`  - ${moreCountLabel(extra)}`);
    }
    const header = pickLang(language, { KO: '마법 체계', EN: 'Magic Systems', JP: '魔法体系', CN: '魔法体系' });
    return `\n[MAGIC-SYSTEM — ${header}]\n${lines.join('\n')}`;
  };

  const itemsBlock = buildItemsBlock();
  const skillsBlock = buildSkillsBlock();
  const magicSystemsBlock = buildMagicSystemsBlock();

  // Resource 절삭 경고 이벤트 발행 (토큰 버짓 감사)
  if (resourceTruncated.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noa:token-budget-warning', {
      detail: { reason: 'resource-truncated', truncated: resourceTruncated, limit: RESOURCE_LIMIT },
    }));
  }

  // ── 현재 에피소드 씬시트 주입 ──
  // config.episodeSceneSheets 는 EpisodeSceneSheet[] 로 UI 용도지만,
  // 해당 에피소드 시트가 있으면 프롬프트에도 반영 (타 에피소드는 토큰 폭발 방지로 제외)
  let episodeSceneSheetBlock = '';
  {
    const sheets = config.episodeSceneSheets;
    if (Array.isArray(sheets) && sheets.length > 0) {
      const current = sheets.find(s => s.episode === config.episode);
      if (current) {
        const sheetLines: string[] = [];
        const sheetTitleLabel = pickLang(language, { KO: '제목', EN: 'Title', JP: 'タイトル', CN: '标题' });
        const sheetArcLabel = pickLang(language, { KO: '아크', EN: 'Arc', JP: 'アーク', CN: '弧' });
        const sheetCharsLabel = pickLang(language, { KO: '주요 캐릭터', EN: 'Main Characters', JP: '主要キャラクター', CN: '主要角色' });
        const sheetScenesLabel = pickLang(language, { KO: '씬 구성', EN: 'Scenes', JP: 'シーン構成', CN: '场景构成' });
        const sheetPresetLabel = pickLang(language, { KO: '프리셋', EN: 'Preset', JP: 'プリセット', CN: '预设' });
        if (current.title) {
          sheetLines.push(`${sheetTitleLabel}: ${current.title}`);
        }
        if (current.arc) {
          sheetLines.push(`${sheetArcLabel}: ${current.arc}`);
        }
        if (current.characters) {
          sheetLines.push(`${sheetCharsLabel}: ${current.characters}`);
        }
        if (Array.isArray(current.scenes) && current.scenes.length > 0) {
          sheetLines.push(`${sheetScenesLabel}:`);
          current.scenes.slice(0, 10).forEach(sc => {
            const parts: string[] = [`  - [${sc.sceneId}] ${sc.sceneName || ''}`.trim()];
            if (sc.tone) parts.push(`톤:${sc.tone}`);
            if (sc.summary) parts.push(`요약:${sc.summary}`);
            if (sc.emotionPoint) parts.push(`감정:${sc.emotionPoint}`);
            sheetLines.push(parts.join(' | '));
          });
          if (current.scenes.length > 10) {
            const extra = current.scenes.length - 10;
            const moreScenes = pickLang(language, {
              KO: `외 ${extra}씬`,
              EN: `and ${extra} more scenes`,
              JP: `他 ${extra}シーン`,
              CN: `另外 ${extra} 个场景`,
            });
            sheetLines.push(`  - ${moreScenes}`);
          }
        }
        if (current.presetUsed) {
          sheetLines.push(`${sheetPresetLabel}: ${current.presetUsed}`);
        }
        if (sheetLines.length > 0) {
          const sceneHeader = pickLang(language, {
            KO: `현재 에피소드(${config.episode}화) 씬시트`,
            EN: `Current Episode (Ep.${config.episode}) Scene Sheet`,
            JP: `現在のエピソード(第${config.episode}話) シーンシート`,
            CN: `当前剧集(第${config.episode}集) 场景表`,
          });
          episodeSceneSheetBlock = `\n[EPISODE SCENE — ${sceneHeader}]\n${sheetLines.join('\n')}`;
        }
      }
    }
  }

  // Sub-genre tags injection (only when user opts in)
  const subGenreBlock = (config.useSubGenrePrompt && config.subGenres && config.subGenres.length > 0)
    ? `\n[SUB-GENRE TAGS]\n${config.subGenres.map(t => `#${t}`).join(' ')}\n→ ${pickLang(language, {
        KO: '이 서브 장르의 관습과 클리셰를 숙지하고 활용하되, EH 세계관 법칙(QFR/CRL/HPP/Audit)으로 재해석하라.',
        EN: 'Master the conventions of these sub-genres and reinterpret them through EH universe physics (QFR/CRL/HPP/Audit).',
        JP: 'これらのサブジャンルの慣習とクリシェを把握・活用しつつ、EH世界観の法則(QFR/CRL/HPP/Audit)で再解釈してください。',
        CN: '请掌握并运用这些子类型的惯例与套路，同时以 EH 世界观法则 (QFR/CRL/HPP/Audit) 重新诠释。',
      })}`
    : '';

  // Grammar Pack injection — 국가별 서사 문법 (beatSheet / rhythmRules / mustHave / taboo)
  let grammarPackBlock = '';
  if (config.grammarRegion && GRAMMAR_PACKS[config.grammarRegion]) {
    const gp = GRAMMAR_PACKS[config.grammarRegion];
    const rhythmParts = gp.rhythmRules.map(r => `- ${r.name}: ${r.desc}`).join('\n');
    const mustParts = gp.mustHave.map(m => `- ${m}`).join('\n');
    const tabooParts = gp.taboo.map(t => `- ${t}`).join('\n');
    const beatParts = gp.beatSheet
      .map(b => `- ${b.position}% ${b.name}: ${b.desc}`)
      .join('\n');
    const rewardParts = gp.rewardPatterns.map(r => `- ${r.name} (${r.interval}): ${r.desc}`).join('\n');
    const gpBeatSheetLabel = pickLang(language, { KO: '서사 비트시트', EN: 'Beat Sheet', JP: '叙事ビートシート', CN: '叙事节拍表' });
    const gpRhythmLabel = pickLang(language, { KO: '리듬 규칙', EN: 'Rhythm Rules', JP: 'リズム規則', CN: '节奏规则' });
    const gpRewardLabel = pickLang(language, { KO: '독자 보상 패턴', EN: 'Reward Patterns', JP: '読者報酬パターン', CN: '读者奖励模式' });
    const gpMustHaveLabel = pickLang(language, { KO: '필수 요소', EN: 'Must Have', JP: '必須要素', CN: '必备要素' });
    const gpTabooLabel = pickLang(language, { KO: '금기', EN: 'Taboo', JP: '禁忌', CN: '禁忌' });
    const gpEpLenLabel = pickLang(language, { KO: '화당 분량', EN: 'Episode Length', JP: '1話あたりの分量', CN: '每集篇幅' });
    grammarPackBlock = `\n[NARRATIVE GRAMMAR — ${gp.region} ${gp.flag}]
${gpBeatSheetLabel}:
${beatParts}

${gpRhythmLabel}:
${rhythmParts}

${gpRewardLabel}:
${rewardParts}

${gpMustHaveLabel}:
${mustParts}

${gpTabooLabel}:
${tabooParts}

${gpEpLenLabel}: ${gp.episodeLength.min.toLocaleString()}~${gp.episodeLength.max.toLocaleString()} ${gp.episodeLength.unit}`;
  }

  // Shadow State injection — Narrative Sentinel™ 맥락이탈 방지
  let shadowBlock = '';
  if (config.shadowState) {
    shadowBlock = buildShadowPrompt(
      config.shadowState,
      config.episode,
      config.totalEpisodes,
      language
    );
  }

  // Style DNA injection
  // [I-10 라우팅 — 2026-06-10] useAgentRegistry 경로에서는 inline 보간 대신
  // buildAgentBaseStudioPrompt 의 'style-dna' contextBlock 으로 전달 —
  // M-07 CONTEXT_BLOCK_TRIM_ORDER 토큰 절삭 대상이 된다 (CRITICAL 최후순위 — 사실상 항상 유지).
  // 레거시 경로(options 미지정 — pipeline.test 30+)는 기존 inline 출력 그대로 (회귀 0).
  const styleDnaBlock = buildStyleDNA(config.styleProfile, language);

  // NOA-PRISM v1.1 injection
  const prismBlock = buildPrismBlock(config, language);

  // PRISM-MODE content rating injection
  const prismModeBlock = buildPrismModeBlock(config, language);

  // Language Pack injection
  const langPackBlock = buildLanguagePackBlock(language);

  // Publish platform injection
  const publishPlatformBlock = buildPublishPlatformBlock(config.publishPlatform, language);

  // Genre-based dialogue ratio guide
  const genreBenchmark = GENRE_BENCHMARKS[config.genre];
  const dialogueGuide = (() => {
    if (!genreBenchmark?.benchmarks?.dialogueRatio) return '';
    const headerLabel = pickLang(language, {
      KO: '대화문 비율 가이드', EN: 'Dialogue Ratio Guide', JP: '会話文比率ガイド', CN: '对话比例指南',
    });
    const genreLabel = pickLang(language, { KO: '장르', EN: 'Genre', JP: 'ジャンル', CN: '类型' });
    // genreBenchmark.label has only 'ko'/'en' keys — JP/CN inherit EN naming.
    const genreNameKey: 'ko' | 'en' = language === 'KO' ? 'ko' : 'en';
    const targetLabel = pickLang(language, {
      KO: '권장 대화 비율', EN: 'Target dialogue ratio', JP: '推奨会話比率', CN: '建议对话比例',
    });
    const tipLabel = pickLang(language, {
      KO: '대화문이 부족하면 답답하고, 과하면 가벼워짐. 장르에 맞는 균형 유지.',
      EN: 'Too little dialogue feels heavy; too much feels shallow. Keep genre-appropriate balance.',
      JP: '会話が少なすぎると重く、多すぎると軽くなります。ジャンルに合った均衡を保ってください。',
      CN: '对话过少会显沉闷，过多则显轻飘。请保持类型相应的平衡。',
    });
    return `\n[${headerLabel}]\n- ${genreLabel}: ${genreBenchmark.label[genreNameKey]}\n- ${targetLabel}: ${genreBenchmark.benchmarks.dialogueRatio.min}%~${genreBenchmark.benchmarks.dialogueRatio.max}%\n- ${tipLabel}`;
  })();

  // EH v1.4 rules injection
  const ehRules = buildEHRules(ruleLevel, language);

  const systemPromptText = `${NOA_ENGINE_PREAMBLE}

[ENGINE VERSION: ANS 10.0 — Nexus Controller Pipeline]

${NOA_ENGINE_LOGIC}

[CURRENT NARRATIVE POSITION]
- Episode: ${config.episode} / ${totalEpisodes}
- Act: ${actInfo.act}막 (${actInfo.name})
- Act Progress: ${Math.round(actInfo.progress * 100)}%
- Target Tension: ${targetTension}%
- Genre: ${config.genre}

[ACT-SPECIFIC DIRECTIVE]
${actGuide[language] ?? actGuide.EN}

${buildGenrePreset(config.genre, language)}

[CHARACTER DATABASE / DIALOGUE DNA — Tier 1]
${characterDNA}${tier2Block}${tier2DetailBlock}${tier3DetailBlock}
${charRelations ? `\n[CHARACTER RELATIONSHIPS]\n${charRelations}` : ''}
${config.primaryEmotion ? `\n[PRIMARY EMOTION]\n${config.primaryEmotion}` : ''}
${sceneDirectionBlock}
${episodeSceneSheetBlock}
${simulatorBlock}
${worldTierBlock}
${itemsBlock}${skillsBlock}${magicSystemsBlock}${grammarPackBlock}${shadowBlock}
${subGenreBlock}
${options.useAgentRegistry ? '' : styleDnaBlock}
${prismBlock}
${prismModeBlock}
${langPackBlock}
${publishPlatformBlock}
${dialogueGuide}

[SERIALIZATION CONSTRAINTS — MANDATORY]
- Platform: ${platform}
- MINIMUM output: approximately ${charTarget.min.toLocaleString()} characters (${t('pipeline.charLangBasis')})
- MAXIMUM output: approximately ${charTarget.max.toLocaleString()} characters
- You MUST generate at least ${charTarget.min.toLocaleString()} characters of story content. Generating less is a critical violation.
- Structure: 4 parts, each part MUST be at least ${Math.round(charTarget.min / 4).toLocaleString()} characters.
- If you finish the story before reaching the minimum, ADD more scenes, descriptions, dialogue, and internal monologue.
- NEVER end below ${charTarget.min.toLocaleString()} characters. This is a hard constraint, not a suggestion.
${ehRules}

${config.narrativeIntensity === 'iron' ? `[NARRATIVE INTENSITY: IRON — 서사 강도 강]
- 인과 없는 전개를 절대 사용하지 마라. 모든 사건에는 반드시 원인과 대가가 있어야 한다.
- "기적", "갑자기", "운명"이라는 단어를 쓸 때 반드시 인과적 근거를 함께 제시하라.
- 이득이 있으면 반드시 대가가 따라야 한다. 무상 성공은 허용되지 않는다.
- AI 요약 문구("요약하자면", "결론적으로")를 절대 사용하지 마라.
` : config.narrativeIntensity === 'soft' ? '' : `[NARRATIVE INTENSITY: STANDARD — 서사 강도 중]
- 가능하면 인과 관계를 명시하라. 사건에는 이유가 있어야 한다.
- 무상 성공보다는 대가가 수반되는 전개를 선호하라.
`}[QUALITY DIRECTIVES]
- AI톤 금지: "그러나", "반면에", "한편으로는", "따라서", "그러므로" 사용 자제
- Show Don't Tell: 감정을 직접 서술하지 말고 감각과 행동으로 전달
- 반복 표현 다양화: 같은 묘사를 3회 이상 반복하지 마십시오
- 긴장도 ${targetTension}%에 맞는 문장 리듬과 장면 전환 속도를 유지하십시오

[${t('pipeline.formattingRulesHeader')}]
1. ${t('pipeline.formattingRule1')}
2. ${t('pipeline.formattingRule2')}
3. ${t('pipeline.formattingRule3')}
4. ${t('pipeline.formattingRule4')}
5. ${t('pipeline.formattingRule5')}
6. ${t('pipeline.formattingRule6')}
7. ${t('pipeline.formattingRule7')}

${buildNoaOutputRules(LANG_NAMES[language])}`;

  // M5 — Genre Translation Layer: 장르 모드 프롬프트 추가분을 기존 프롬프트 뒤에 append.
  // novel 모드는 빈 문자열이므로 no-op; webtoon/drama/game만 포맷 지시 블록을 붙인다.
  const genreAddendum = getGenreSystemPrompt(
    config.genreMode ?? 'novel',
    toAgentLang(language) as PromptLang,
  );
  // [N1-noa-identity] 단일 노아 화자 헤더 — 두 return 경로(레거시/레지스트리)
  // 모두 시스템 프롬프트 "최상단"에 위치해야 하므로 여기서 만들고 반환 직전에 prepend.
  const noaHeader = buildNoaSystemHeader();
  const finalSystemPrompt = noaHeader + '\n\n' + systemPromptText + genreAddendum;

  // 토큰 버짓 감사 — CJK/영문 혼합 추정 + 클라이언트/서버 양쪽 지원
  const sysLen = finalSystemPrompt.length;
  // CJK 글자: ~1.5 토큰, ASCII 단어: ~1.3 토큰/단어(~0.25/글자)
  // 혼합 텍스트 보수적 추정: CJK 비율 감지 후 가중 평균
  const cjkChars = (finalSystemPrompt.match(/[\u3000-\u9fff\uac00-\ud7af]/g) || []).length;
  const cjkRatio = sysLen > 0 ? cjkChars / sysLen : 0;
  const tokensPerChar = cjkRatio * 1.5 + (1 - cjkRatio) * 0.35;
  const estimatedTokens = Math.round(sysLen * tokensPerChar);
  const CONTEXT_LIMITS: Record<string, number> = {
    'gemini': 1_000_000, 'claude': 200_000, 'openai': 128_000, 'groq': 128_000, 'default': 128_000,
  };
  const contextLimit = CONTEXT_LIMITS.default;
  const ratio = estimatedTokens / contextLimit;

  // Phase 5: Hybrid Context tier-level breakdown logging
  // Tier별 토큰 소비를 추적하여 컨텍스트 예산 최적화에 활용
  const tierBreakdown = {
    total: estimatedTokens,
    storyBible: Math.round(finalSystemPrompt.indexOf('📜') >= 0
      ? (finalSystemPrompt.length - finalSystemPrompt.indexOf('📜')) * tokensPerChar * 0.4
      : 0),
    contextRatio: Math.round(ratio * 100),
  };
  logger.debug(
    'Pipeline TokenBudget',
    `total: ${tierBreakdown.total} tokens (${tierBreakdown.contextRatio}% of ${contextLimit}), ` +
    `storyBible estimate: ~${tierBreakdown.storyBible} tokens`
  );

  if (ratio > 0.30 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noa:token-budget-warning', {
      detail: { estimatedTokens, contextLimit, ratio: Math.round(ratio * 100), tierBreakdown },
    }));
  }

  // [I-02 본문 마이그레이션 — 2026-05-10] 레지스트리 base prepend (옵션).
  // 가드 중복은 호출 측 buildSparkSystemPrompt 가 자동 dedup.
  // [I-10 라우팅 — 2026-06-10] style-dna 는 위 systemPromptText 분기에서 inline 제거 후
  // 여기 contextBlock 으로 단일 주입 (내용 동일·위치만 registry base 로 이동·중복 0).
  // act-guide/tension-curve 는 [ACT-SPECIFIC DIRECTIVE]/[CURRENT NARRATIVE POSITION] 등
  // 레거시 본문 구조에 얽혀 있어 본 phase 미이동 (registry contextBlocks 정의에는 등록 완료).
  if (options.useAgentRegistry) {
    // [N1-noa-identity] 노아 헤더가 registry base 보다 먼저 — 화자 선언이 항상 프롬프트 1순위.
    return noaHeader + '\n\n'
      + buildAgentBaseStudioPrompt(language, { styleDna: styleDnaBlock })
      + '\n\n' + systemPromptText + genreAddendum;
  }
  return finalSystemPrompt;
}
