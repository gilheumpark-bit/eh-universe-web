// ============================================================
// PART 0: TYPES — HFCP v3.1 + HCRF 1.0 (TypeScript Port)
// Conversation quality control — NOT applied to story generation
// ============================================================

export type HFCPVerdict = 'engagement' | 'normal_free' | 'normal_analysis' | 'limited' | 'silent';
export type InputMode = 'generate' | 'chat';
export type NRGStrategy = 'normal' | 'light_variation' | 'frame_shift' | 'perspective_shift' | 'meta_ack';

export interface TurnSignal {
  length: number;
  hasQuestion: boolean;
  humorLevel: number;
  connectiveDensity: number;
  objectionMarker: boolean;
}

export interface HFCPState {
  score: number;
  momentumK: number;
  lastDelta: number;
  turns: number;
  verdict: HFCPVerdict;
  nrgStrategy: NRGStrategy;
  lastQuestionHash: string;
}

// ============================================================
// PART 1: INPUT CLASSIFIER — 생성 명령 vs 대화 구분
// ============================================================

const GENERATE_COMMAND_PATTERNS_KO = [
  '써줘', '써 줘', '써라', '작성해', '작성해줘', '생성해', '생성해줘',
  '집필해', '집필해줘', '계속 써', '이어서 써', '초안 써',
  '1단계', '2단계', '3단계', '패스',
];

const GENERATE_COMMAND_PATTERNS_EN = [
  'write', 'generate', 'create', 'draft', 'continue writing',
  'pass 1', 'pass 2', 'pass 3',
];

const REVIEW_PATTERNS_KO = [
  '검토', '평가', '분석', '봐줘', '어때', '어떻게 생각',
  '약하지', '문제', '리스크', '클릭 이유', '이유 봐', '말고',
];

const REVIEW_PATTERNS_EN = [
  'review', 'evaluate', 'analyze', 'check', 'what do you think',
  'weak', 'risk', 'instead of writing',
];

export function classifyInput(text: string): InputMode {
  const lower = text.toLowerCase();
  const generatePatterns = [...GENERATE_COMMAND_PATTERNS_KO, ...GENERATE_COMMAND_PATTERNS_EN];
  for (const p of generatePatterns) {
    if (lower.includes(p)) return 'generate';
  }
  const reviewPatterns = [...REVIEW_PATTERNS_KO, ...REVIEW_PATTERNS_EN];
  for (const p of reviewPatterns) {
    if (lower.includes(p)) return 'chat';
  }
  return 'chat';
}

// ============================================================
// PART 2: OBSERVATION — 사용자 입력 분석
// ============================================================

const QUESTION_PATTERNS: RegExp[] = [/\?/, /왜/, /어떻게/, /무엇/, /뭐야/, /why/i, /how/i, /what/i];
const HUMOR_MARKERS = ['ㅋㅋ', 'ㅎㅎ', 'lol', 'haha', '😂', '😅'];
const CONNECTIVES = ['그래서', '하지만', '그리고', '또한', 'because', 'however', 'and'];
const OBJECTION_MARKERS = ['아니', '근데', '그건 아닌데', 'but', 'however', 'i disagree'];

export function buildTurnSignal(text: string): TurnSignal {
  const lower = text.toLowerCase();
  return {
    length: text.length,
    hasQuestion: QUESTION_PATTERNS.some(p => p.test(lower)),
    humorLevel: Math.min(1, HUMOR_MARKERS.filter(m => lower.includes(m)).length * 0.3),
    connectiveDensity: Math.min(1, CONNECTIVES.filter(c => lower.includes(c)).length / Math.max(1, text.length / 100)),
    objectionMarker: OBJECTION_MARKERS.some(p => lower.includes(p)),
  };
}

// ============================================================
// PART 3: SCORING ENGINE
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeDelta(signal: TurnSignal): number {
  let delta = 0;
  if (signal.hasQuestion) delta += 3;
  delta += signal.humorLevel * 2;
  delta += signal.connectiveDensity * 4;
  if (signal.objectionMarker) delta += 3;
  if (signal.length > 300) delta += 1.5;
  else if (signal.length < 50) delta -= 2;
  return clamp(delta, -10, 10);
}

function updateMomentum(state: HFCPState, delta: number): number {
  if (delta * state.lastDelta > 0) {
    state.momentumK += 1;
  } else {
    state.momentumK = 1;
  }
  const k = state.momentumK;
  const cap = state.score >= 110 ? 1.4 : 2.0;
  if (k === 1) return 1.0;
  if (k === 2) return Math.min(1.2, cap);
  if (k === 3) return Math.min(1.5, cap);
  return Math.min(2.0, cap);
}

function loadLeveling(score: number): number {
  if (score <= 70) return 0.7;
  if (score >= 130) return 0.5;
  return 1.0;
}

function hysteresis(delta: number): number {
  return delta < 0 ? 0.5 : 1.0;
}

function applyLongSessionSoftCap(score: number, nextTurnCount: number): number {
  if (nextTurnCount < 5 || score <= 124) return score;
  const pressure = clamp((nextTurnCount - 5) / 5, 0, 1);
  const overflow = score - 124;
  return clamp(score - (overflow * pressure), 50, 150);
}

export function updateScore(state: HFCPState, signal: TurnSignal): number {
  const delta = computeDelta(signal);
  const M = updateMomentum(state, delta);
  const L = loadLeveling(state.score);
  const H = hysteresis(delta);
  const nextTurnCount = state.turns + 1;
  const rawScore = clamp(state.score + (delta * M * L * H), 50, 150);
  const newScore = applyLongSessionSoftCap(rawScore, nextTurnCount);
  state.lastDelta = delta;
  state.score = newScore;
  state.turns = nextTurnCount;
  return newScore;
}

// ============================================================
// PART 4: VERDICT — 점수 → 응답 모드 결정
// ============================================================

export function resolveVerdict(score: number): HFCPVerdict {
  if (score >= 145) return 'silent';
  if (score >= 130) return 'limited';
  if (score >= 100) return 'normal_analysis';
  if (score >= 70) return 'normal_free';
  return 'engagement';
}

// ============================================================
// PART 5: NRG — 반복 응답 방지
// ============================================================

/** FNV-1a hash — better collision resistance than simple shift-hash */
function simpleHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return (h >>> 0).toString(36);
}

export function resolveNRG(state: HFCPState, inputText: string): NRGStrategy {
  const hash = simpleHash(inputText.toLowerCase().replace(/\s/g, ''));
  if (hash !== state.lastQuestionHash) {
    state.lastQuestionHash = hash;
    return 'normal';
  }
  // Same question repeated
  const s = state.score;
  if (s < 70) return 'light_variation';
  if (s < 100) return 'frame_shift';
  if (s < 130) return 'perspective_shift';
  return 'meta_ack';
}

// ============================================================
// PART 6: VERDICT → PROMPT MODIFIER (AI 대화 톤 조절)
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

export function verdictToPromptModifier(verdict: HFCPVerdict, nrg: NRGStrategy, language: AppLanguage): string {
  const t = createT(language);
  const parts: string[] = [];

  // Verdict-based tone
  switch (verdict) {
    case 'engagement':
      parts.push(t('hfcpLabels.engagement'));
      break;
    case 'normal_free':
      parts.push(t('hfcpLabels.normalFree'));
      break;
    case 'normal_analysis':
      parts.push(t('hfcpLabels.normalAnalysis'));
      break;
    case 'limited':
      parts.push(t('hfcpLabels.limited'));
      break;
    case 'silent':
      parts.push(t('hfcpLabels.silent'));
      break;
  }

  // NRG modifier
  if (nrg !== 'normal') {
    switch (nrg) {
      case 'light_variation':
        parts.push(t('hfcpLabels.nrgVariation'));
        break;
      case 'frame_shift':
        parts.push(t('hfcpLabels.nrgFrameShift'));
        break;
      case 'perspective_shift':
        parts.push(t('hfcpLabels.nrgPerspectiveShift'));
        break;
      case 'meta_ack':
        parts.push(t('hfcpLabels.nrgMetaAck'));
        break;
    }
  }

  return parts.join('\n');
}

// ============================================================
// PART 7: ENGINE — 통합 실행
// ============================================================

export function createHFCPState(): HFCPState {
  return {
    score: 60,
    momentumK: 1,
    lastDelta: 0,
    turns: 0,
    verdict: 'engagement',
    nrgStrategy: 'normal',
    lastQuestionHash: '',
  };
}

// ============================================================
// PART 7b: SUMMARY — Human-readable HFCP state summary
// ============================================================

export interface HFCPSummary {
  totalTurns: number;
  currentScore: number;
  verdict: HFCPVerdict;
  nrgStrategy: NRGStrategy;
  /** Conversation quality tier */
  qualityTier: 'excellent' | 'good' | 'neutral' | 'declining' | 'poor';
  /** Verdict distribution (estimated from score trajectory) */
  verdictCounts: { pass: number; warn: number; fail: number };
  /** Human-readable text */
  text: { ko: string; en: string };
}

export function getHFCPSummary(state: HFCPState): HFCPSummary {
  const { score, turns, verdict, nrgStrategy, momentumK } = state;

  // Quality tier from score
  const qualityTier: HFCPSummary['qualityTier'] =
    score >= 120 ? 'excellent' :
    score >= 90 ? 'good' :
    score >= 70 ? 'neutral' :
    score >= 55 ? 'declining' : 'poor';

  // Estimate verdict distribution from turns and current score
  // Higher score = more passes; lower score = more engagement/warns
  const passRatio = Math.min(1, Math.max(0, (score - 50) / 100));
  const failRatio = Math.min(1, Math.max(0, (100 - score) / 100));
  const _warnRatio = 1 - passRatio - failRatio;

  const pass = Math.round(turns * Math.max(0, passRatio));
  const fail = Math.round(turns * Math.max(0, failRatio));
  const warn = Math.max(0, turns - pass - fail);

  const nrgLabel = nrgStrategy === 'normal' ? '' : `, NRG: ${nrgStrategy}`;
  const momentumLabel = momentumK > 1 ? `, momentum x${momentumK}` : '';

  const text = {
    ko: `[노아 대화 조율] ${turns}턴 | 내부 점수 ${Math.round(score)} | ${verdict}${nrgLabel}${momentumLabel} | 품질: ${qualityTier} | 통과 ~${pass}, 경고 ~${warn}, 실패 ~${fail}`,
    en: `[Noa conversation control] ${turns} turns | Internal score ${Math.round(score)} | ${verdict}${nrgLabel}${momentumLabel} | Quality: ${qualityTier} | Pass ~${pass}, Warn ~${warn}, Fail ~${fail}`,
  };

  return { totalTurns: turns, currentScore: Math.round(score), verdict, nrgStrategy, qualityTier, verdictCounts: { pass, warn, fail }, text };
}

// ============================================================
// PART 8: ENGINE — 통합 실행
// ============================================================

export function processHFCPTurn(state: HFCPState, userInput: string): {
  mode: InputMode;
  verdict: HFCPVerdict;
  nrg: NRGStrategy;
  score: number;
  promptModifier: string;
} {
  const mode = classifyInput(userInput);

  if (mode === 'generate') {
    // 생성 모드 — HFCP 비적용, EH Engine이 처리
    return { mode, verdict: state.verdict, nrg: 'normal', score: state.score, promptModifier: '' };
  }

  // 대화 모드 — HFCP 적용
  const signal = buildTurnSignal(userInput);
  updateScore(state, signal);
  const verdict = resolveVerdict(state.score);
  const nrg = resolveNRG(state, userInput);

  state.verdict = verdict;
  state.nrgStrategy = nrg;

  // 입력에 한글이 포함되면 KO, 아니면 EN (향후 lang 감지 고도화 가능)
  const hasKorean = /[가-힣]/.test(userInput);
  const promptModifier = verdictToPromptModifier(verdict, nrg, hasKorean ? 'KO' : 'EN');

  return { mode, verdict, nrg, score: state.score, promptModifier };
}

// ============================================================
// PART 9: STORY CONTEXT-AWARE COMPOSITION (Layer 1 — 2026-05-08)
// ============================================================
//
// HFCP 의 promptModifier (대화 톤) + Story Context (작품 맥락) 통합.
// useStudioAI 가 호출 — chat / generate 양쪽 prompt 에 prepend.
// 검증과 생성 분리 해소 → AI 가 "현재 작품 상태" 인지하고 응답.

import { buildStoryContextModifier, type StoryContextSnapshot } from './story-context';
import type { AppLanguage as AppLang } from '@/lib/studio-types';

export function composePromptModifier(
  hfcpModifier: string,
  storyContext: StoryContextSnapshot | null | undefined,
  language: AppLang,
  options: { storyContextCharCap?: number } = {},
): string {
  const storyText = storyContext
    ? buildStoryContextModifier(storyContext, {
        language,
        charCap: options.storyContextCharCap ?? 500,
      })
    : '';
  return [hfcpModifier, storyText]
    .filter((s) => s && s.length > 0)
    .join('\n\n---\n\n');
}
