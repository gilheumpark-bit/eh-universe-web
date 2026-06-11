// ============================================================
// PART 1 — Module Header
// ============================================================
//
// dual-pipeline.ts — Source-faithful + Market-ready 병렬 번역 파이프라인.
//
// 시장 분석 4차 §1 §8 결정 사항을 코드로 구현:
//   "Translation Studio 는 번역 결과를 하나만 내지 않는다.
//    1안. Source-faithful Translation
//    2안. Market-ready Localization"
//
// 호출 패턴:
//   const result = await runDualTranslation({
//     text, from, to, glossary, characterProfiles, ...,
//     translateFn: async (prompt) => { ... LLM 호출 ... },
//   });
//   // result.faithful = Source-faithful 결과
//   // result.market   = Market-ready 결과
//
// 비용 최적화 — Stage 1~3 공유:
//   원고 → Stage 1 (1회) → Stage 2 (1회) → Stage 3 (1회)
//                           ↓
//                ┌──────────┴──────────┐
//                ↓                     ↓
//        Stage 4-faithful       Stage 4-market
//                ↓                     ↓
//        Stage 5-faithful       Stage 5-market
//
// 비용: 단일 chain (5 호출) → dual (7 호출) = 1.4x. 시장 분석 §7 절감 목표 60~75% 와 정합.
//
// [C] 1원칙 검증 — Stage 5 후 두 결과 모두 source-integrity 검사
// [C] 부분 실패 허용 — faithful 또는 market 한쪽 실패 시 다른 쪽 결과 + 에러 반환
// [G] Stage 4~5 병렬 호출 — Promise.all 로 시간 절약
// [K] Stage 1~3 단일 책임 — 공유 base 만 생성
// ============================================================

import { buildPrompt } from '@/lib/build-prompt';
import { runIntegrityCheck, type IntegrityReport, type SupportedLang } from './source-integrity';

// ============================================================
// PART 2 — Types
// ============================================================

export type TranslateFn = (prompt: string) => Promise<string>;

export interface DualPipelineParams {
  text: string;
  from: string;
  to: string;
  /** 캐릭터 프로필·세계관·용어집 등 — buildPrompt 에 전달 */
  context?: string;
  glossary?: string;
  characterProfiles?: string;
  continuityNotes?: string;
  episodeContext?: string;
  storySummary?: string;
  tone?: string;
  genre?: string;
  preserveDialogueLayout?: boolean;
  /** LLM 호출 함수 — 호출자가 모델/엔진/스트리밍을 결정. */
  translateFn: TranslateFn;
  /** 진행 상황 콜백 — UI 진행도 표시용. */
  onStage?: (stage: number, track: 'shared' | 'faithful' | 'market') => void;
  /** 1원칙 검증 활성화 (기본 true). */
  verifyIntegrity?: boolean;
  /**
   * [P-03 — 2026-05-10] 텐션 곡선 데이터 (LLM hint 형식 string).
   * Stage 3 (Pacing & Rhythm) 의 contextBlock 'tension-curve' 슬롯에 자동 주입.
   * 호출 측 (TranslatorStudioApp) 이 storyConfig.sceneDirection.tensionCurve 에서 추출 후 전달.
   */
  tensionCurve?: string;
  /**
   * [Z1a-1 — 2026-06-11] 4버전 누진 현지화 레벨 (additive — claude2 정합).
   *   undefined: 기존 2트랙 동작 그대로 (기본값 — 회귀 0)
   *   1: 직역 우선 — checklist 주입 없음 (직역 결과는 faithful track 이 담당)
   *   2: 기본 현지화 — 기존 Market Stage 4 그대로 (주입 없음)
   *   3: Tier-1 15항목 checklist directive 를 Stage 4-Market prompt 에 주입
   *   4: Tier-1 + Tier-2 (30항목) 주입
   * Faithful track 은 어떤 레벨에서도 영향 받지 않는다 (원문 보존 본질).
   * 한계 (정직): checklist 는 prompt directive 일 뿐 — LLM 준수율은 추정 50-60%
   * 수준이며 보장이 아니다. 결정론적 검증은 NCT/catastrophic 게이트가 담당.
   */
  improveLevel?: 1 | 2 | 3 | 4;
}

export interface DualPipelineResult {
  /** Stage 1~3 공유 base — 디버깅/audit 용. */
  sharedBase: string;
  /** Source-faithful Translation 최종 결과. null 시 faithfulError 확인. */
  faithful: string | null;
  /** Market-ready Localization 최종 결과. null 시 marketError 확인. */
  market: string | null;
  /** Faithful 1원칙 검증 — verifyIntegrity=true 시. */
  faithfulIntegrity?: IntegrityReport;
  /** Market 1원칙 검증 — verifyIntegrity=true 시 (Market 은 단락 그룹화 허용 → warn 만). */
  marketIntegrity?: IntegrityReport;
  faithfulError?: string;
  marketError?: string;
  /** 총 LLM 호출 수 — 비용 추적. */
  totalCalls: number;
  /** 총 wall-clock ms. */
  durationMs: number;
}

// ============================================================
// PART 3 — Stage 1~3 공유 base 생성
// ============================================================

/**
 * Stage 1~3 chain — Faithful/Market 공유.
 *
 * Stage 1 (Draft): 1:1 구조 보존 초벌
 * Stage 2 (Lore/Tone): 캐릭터·말투·호칭 정렬 (sourceText=원문 + 현재 draft)
 * Stage 3 (Pacing): 문장 길이·리듬 조정
 */
async function runSharedBase(
  params: DualPipelineParams,
): Promise<{ base: string; calls: number }> {
  const { text, from, to, translateFn, onStage } = params;
  const common = {
    from,
    to,
    tone: params.tone,
    genre: params.genre,
    context: params.context,
    glossary: params.glossary,
    characterProfiles: params.characterProfiles,
    continuityNotes: params.continuityNotes,
    episodeContext: params.episodeContext,
    storySummary: params.storySummary,
    mode: 'novel' as const,
    preserveDialogueLayout: params.preserveDialogueLayout ?? true,
    // [I-02 본문 마이그레이션 — 2026-05-10] 레지스트리 base 활성화 — translator-stage-* 단일 소스.
    useAgentRegistry: true,
    // [P-03 — 2026-05-10] 텐션 곡선 hint — stage 3 에서만 contextBlock 으로 흐름.
    tensionCurve: params.tensionCurve,
  };

  // Stage 1 — 1:1 draft
  onStage?.(1, 'shared');
  const stage1Prompt = buildPrompt({ ...common, text, stage: 1, outputMode: 'default' });
  const draft = await translateFn(stage1Prompt);

  // Stage 2 — Lore/Tone editor (sourceText=원문, text=현재 draft)
  onStage?.(2, 'shared');
  const stage2Prompt = buildPrompt({ ...common, text: draft, sourceText: text, stage: 2, outputMode: 'default' });
  const stage2 = await translateFn(stage2Prompt);

  // Stage 3 — Pacing
  onStage?.(3, 'shared');
  const stage3Prompt = buildPrompt({ ...common, text: stage2, sourceText: text, stage: 3, outputMode: 'default' });
  const base = await translateFn(stage3Prompt);

  return { base, calls: 3 };
}

// ============================================================
// PART 4 — Stage 4~5 분기 (Faithful track)
// ============================================================

async function runFaithfulBranch(
  params: DualPipelineParams,
  base: string,
): Promise<{ result: string; calls: number }> {
  const { text, from, to, translateFn, onStage } = params;
  const common = {
    from,
    to,
    tone: params.tone,
    genre: params.genre,
    context: params.context,
    glossary: params.glossary,
    characterProfiles: params.characterProfiles,
    continuityNotes: params.continuityNotes,
    episodeContext: params.episodeContext,
    storySummary: params.storySummary,
    mode: 'novel' as const,
    preserveDialogueLayout: params.preserveDialogueLayout ?? true,
    // [I-02 본문 마이그레이션 — 2026-05-10] 레지스트리 base 활성화 — translator-stage-* 단일 소스.
    useAgentRegistry: true,
    // [P-03 — 2026-05-10] 텐션 곡선 hint — stage 3 에서만 contextBlock 으로 흐름.
    tensionCurve: params.tensionCurve,
  };

  // Stage 4 — Faithful resonance (transcreation 금지)
  onStage?.(4, 'faithful');
  const stage4Prompt = buildPrompt({
    ...common,
    text: base,
    sourceText: text,
    stage: 4,
    outputMode: 'faithful',
  });
  const stage4 = await translateFn(stage4Prompt);

  // Stage 5 — Light polish only
  onStage?.(5, 'faithful');
  const stage5Prompt = buildPrompt({
    ...common,
    text: stage4,
    sourceText: text,
    stage: 5,
    outputMode: 'faithful',
  });
  const result = await translateFn(stage5Prompt);

  return { result, calls: 2 };
}

// ============================================================
// PART 4.5 — [Z1a-1] 4버전 누진 현지화 checklist (improveLevel 3/4)
// ============================================================
//
// 항목은 번역 공예의 보수적 일반화 (리듬·관용·구어·호칭 등) — 발명 최소.
// 사실 변경·누락 허용 항목 0 (RULE #1 은 모든 레벨에서 유지).
// 한계 (정직): prompt directive 주입일 뿐 — LLM 항목 준수율 추정 50-60%.
// 보장 수단이 아니라 '방향 지시'이며, 결과 검증은 NCT 게이트가 담당한다.
// ============================================================

/** 테스트·검출용 마커 — 주입 여부를 결정론적으로 확인 가능. */
export const IMPROVE_DIRECTIVE_MARKER = 'PROGRESSIVE LOCALIZATION CHECKLIST';

/** Tier-1 — 기본 공예 15항목 (improveLevel 3+). */
export const IMPROVE_TIER1_CHECKLIST: readonly string[] = [
  "Read dialogue for spoken rhythm: use natural contractions in casual speech; avoid them in formal speech.",
  'Replace source-idiom calques with natural target-language idioms of equal meaning; never translate idioms word-for-word.',
  'Vary sentence openings; avoid starting consecutive sentences with the same subject word.',
  "Use pronouns or role nouns instead of repeating a character's name in every sentence.",
  'Convert onomatopoeia to target-language sound conventions instead of romanizing them.',
  'Render address terms and honorifics naturally for target readers (follow the glossary; do not leave romanized honorifics unless the glossary locks them).',
  "Prefer action beats over repetitive 'X said' tags, but do not invent new actions or facts.",
  "Match speech register to each character's age, status, and relationship as established in context.",
  'Keep narration tense consistent (default: past tense) unless the source deliberately shifts.',
  'Follow target-language punctuation conventions for quotes and dashes; use em-dashes sparingly.',
  'Localize number, unit, and currency formatting conventions without changing the actual values.',
  'Smooth paragraph-to-paragraph flow with natural connectives only where the source implies them.',
  "Remove translationese fillers (e.g., literal 'it cannot be helped' calques) in favor of natural equivalents.",
  'Keep exclamation marks restrained; let word choice carry intensity.',
  "Polish the chapter's final lines for hook strength without changing any facts.",
];

/** Tier-2 — 심화 공예 15항목 (improveLevel 4, Tier-1 에 추가). */
export const IMPROVE_TIER2_CHECKLIST: readonly string[] = [
  "Use the genre's conventional vocabulary that native readers of this genre expect.",
  'Preserve subtext in dialogue; do not explain what characters deliberately leave unsaid.',
  'Use free indirect speech for interior thought where it reads naturally.',
  'Adapt culture-specific references minimally: keep them if understandable, weave brief context if not — never footnote.',
  'Transcreate wordplay and humor so the joke lands; preserve the comedic beat, not the literal words.',
  'Map politeness levels to target-language register via word choice and syntax, not invented titles.',
  'Vary sentence length with scene tension: short in action, flowing in description.',
  'Prefer strong verbs over adverb-propped weak verbs.',
  'Avoid said-bookisms (exclaimed, declared, retorted); prefer said/asked plus an action beat.',
  'Smooth scene transitions so shifts of time and place are immediately clear.',
  "Differentiate each character's voice (diction, cadence) consistently with their profile.",
  'Order information given-to-new within sentences for reader-friendly flow.',
  'Trim redundant qualifiers and hedges (somewhat, slightly, a bit) unless they characterize a speaker.',
  'Keep repetition only when the source uses it deliberately for effect.',
  'Do a final read-aloud pass: rewrite any sentence that trips the tongue.',
];

/**
 * improveLevel → Stage 4-Market prompt 에 덧붙일 checklist directive.
 * undefined/1/2 → '' (기존 동작 불변). 3 → Tier-1 15. 4 → Tier-1+Tier-2 30.
 *
 * [C] 순수 함수 — 결정론적·단위 테스트 가능
 */
export function buildImproveDirective(level?: 1 | 2 | 3 | 4): string {
  if (level !== 3 && level !== 4) return '';
  const items = level === 4
    ? [...IMPROVE_TIER1_CHECKLIST, ...IMPROVE_TIER2_CHECKLIST]
    : [...IMPROVE_TIER1_CHECKLIST];
  return [
    '',
    '',
    `[${IMPROVE_DIRECTIVE_MARKER} — Market track Stage 4 only, level ${level}]`,
    `Apply the following ${items.length} checklist items while revising. These refine style only — never alter narrative facts, and ★ RULE #1 (zero omission) ★ still applies in full.`,
    ...items.map((item, i) => `${i + 1}. ${item}`),
    'After applying the checklist: Output ONLY the revised draft.',
  ].join('\n');
}

// ============================================================
// PART 5 — Stage 4~5 분기 (Market track)
// ============================================================

async function runMarketBranch(
  params: DualPipelineParams,
  base: string,
): Promise<{ result: string; calls: number }> {
  const { text, from, to, translateFn, onStage } = params;
  const common = {
    from,
    to,
    tone: params.tone,
    genre: params.genre,
    context: params.context,
    glossary: params.glossary,
    characterProfiles: params.characterProfiles,
    continuityNotes: params.continuityNotes,
    episodeContext: params.episodeContext,
    storySummary: params.storySummary,
    mode: 'novel' as const,
    preserveDialogueLayout: params.preserveDialogueLayout ?? true,
    // [I-02 본문 마이그레이션 — 2026-05-10] 레지스트리 base 활성화 — translator-stage-* 단일 소스.
    useAgentRegistry: true,
    // [P-03 — 2026-05-10] 텐션 곡선 hint — stage 3 에서만 contextBlock 으로 흐름.
    tensionCurve: params.tensionCurve,
  };

  // Stage 4 — Full transcreation + 장르 적응
  // [Z1a-1 — 2026-06-11] improveLevel 3/4 시 누진 현지화 checklist 를 Market Stage 4
  // prompt 끝에 주입 (undefined/1/2 = '' — 기존 prompt 바이트 동일·회귀 0).
  onStage?.(4, 'market');
  const stage4Prompt = buildPrompt({
    ...common,
    text: base,
    sourceText: text,
    stage: 4,
    outputMode: 'market',
  }) + buildImproveDirective(params.improveLevel);
  const stage4 = await translateFn(stage4Prompt);

  // Stage 5 — Reader-flow polish
  onStage?.(5, 'market');
  const stage5Prompt = buildPrompt({
    ...common,
    text: stage4,
    sourceText: text,
    stage: 5,
    outputMode: 'market',
  });
  const result = await translateFn(stage5Prompt);

  return { result, calls: 2 };
}

// ============================================================
// PART 6 — Lang code → SupportedLang 정규화
// ============================================================

function normalizeLang(code: string): SupportedLang {
  const u = (code || '').toUpperCase();
  if (u === 'KO' || u === 'KR') return 'ko';
  if (u === 'JP' || u === 'JA' || u === 'JAPANESE') return 'ja';
  if (u === 'CN' || u === 'ZH' || u === 'CHINESE') return 'zh';
  return 'en';
}

// ============================================================
// PART 7 — 메인 export
// ============================================================

/**
 * Dual translation pipeline — Faithful + Market 두 결과 동시 생성.
 *
 * 흐름:
 *   1) Stage 1~3 공유 base 생성 (3 호출)
 *   2) Stage 4~5 두 track 병렬 호출 (4 호출)
 *   3) 두 결과 1원칙 검증 (선택)
 *   4) DualPipelineResult 반환
 *
 * 부분 실패 허용:
 *   Faithful 호출 실패 → marketError 만 채우고 faithful=null + faithfulError 메시지
 *   Market  호출 실패 → 반대
 *
 * [C] try/catch — track 별 격리 (한쪽 실패 ≠ 전체 실패)
 * [G] Promise.all — Stage 4~5 두 track 병렬 (≈ 2x 시간 절약)
 */
export async function runDualTranslation(
  params: DualPipelineParams,
): Promise<DualPipelineResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let totalCalls = 0;

  // Stage 1~3 공유
  const shared = await runSharedBase(params);
  totalCalls += shared.calls;
  const sharedBase = shared.base;

  // Stage 4~5 두 track 병렬
  const [faithfulSettled, marketSettled] = await Promise.allSettled([
    runFaithfulBranch(params, sharedBase),
    runMarketBranch(params, sharedBase),
  ]);

  let faithful: string | null = null;
  let market: string | null = null;
  let faithfulError: string | undefined;
  let marketError: string | undefined;

  if (faithfulSettled.status === 'fulfilled') {
    faithful = faithfulSettled.value.result;
    totalCalls += faithfulSettled.value.calls;
  } else {
    faithfulError = String(faithfulSettled.reason).slice(0, 200);
  }
  if (marketSettled.status === 'fulfilled') {
    market = marketSettled.value.result;
    totalCalls += marketSettled.value.calls;
  } else {
    marketError = String(marketSettled.reason).slice(0, 200);
  }

  // 1원칙 검증 (선택)
  let faithfulIntegrity: IntegrityReport | undefined;
  let marketIntegrity: IntegrityReport | undefined;
  if (params.verifyIntegrity !== false) {
    const srcLang = normalizeLang(params.from);
    const tgtLang = normalizeLang(params.to);
    if (faithful) {
      try {
        faithfulIntegrity = runIntegrityCheck({
          source: params.text,
          translation: faithful,
          srcLang,
          tgtLang,
          trackMode: 'faithful', // 엄격 — 1:1 강제 + ±20%
        });
      } catch { /* skip */ }
    }
    if (market) {
      try {
        marketIntegrity = runIntegrityCheck({
          source: params.text,
          translation: market,
          srcLang,
          tgtLang,
          trackMode: 'market',  // 완화 — 그룹화 허용 + ±50%
        });
      } catch { /* skip */ }
    }
  }

  const durationMs = Math.round(
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  );

  return {
    sharedBase,
    faithful,
    market,
    faithfulIntegrity,
    marketIntegrity,
    faithfulError,
    marketError,
    totalCalls,
    durationMs,
  };
}
