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

const GENERATE_PATTERNS_KO = [
  '써줘', '써 줘', '생성', '작성', '집필', '다음 화', '다음 챕터',
  '계속 써', '이어서', '1단계', '2단계', '3단계', '패스',
  '뼈대', '감정선', '묘사', '클리프행어',
];

const GENERATE_PATTERNS_EN = [
  'write', 'generate', 'create', 'draft', 'next chapter', 'next episode',
  'continue', 'pass 1', 'pass 2', 'pass 3', 'skeleton', 'emotion', 'sensory',
];

export function classifyInput(text: string): InputMode {
  const lower = text.toLowerCase();
  const allPatterns = [...GENERATE_PATTERNS_KO, ...GENERATE_PATTERNS_EN];
  for (const p of allPatterns) {
    if (lower.includes(p)) return 'generate';
  }
  return 'chat';
}

// ============================================================
// PART 2: OBSERVATION — 사용자 입력 분석
// ============================================================

const QUESTION_PATTERNS = [/\?/, /왜/, /어떻게/, /무엇/, /뭐야/, /why/i, /how/i, /what/i];
const HUMOR_MARKERS = ['ㅋㅋ', 'ㅎㅎ', 'lol', 'haha', '😂', '😅'];
const CONNECTIVES = ['그래서', '하지만', '그리고', '또한', 'because', 'however', 'and'];
const OBJECTION_MARKERS = ['아니', '근데', '그건 아닌데', 'but', 'however', 'i disagree'];

export function buildTurnSignal(text: string): TurnSignal {
  const lower = text.toLowerCase();
  return {
    length: text.length,
    hasQuestion: QUESTION_PATTERNS.some(p => p.test ? p.test(lower) : lower.includes(p.toString())),
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

export function updateScore(state: HFCPState, signal: TurnSignal): number {
  const delta = computeDelta(signal);
  const M = updateMomentum(state, delta);
  const L = loadLeveling(state.score);
  const H = hysteresis(delta);
  const newScore = clamp(state.score + (delta * M * L * H), 50, 150);
  state.lastDelta = delta;
  state.score = newScore;
  state.turns += 1;
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

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
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

export function verdictToPromptModifier(verdict: HFCPVerdict, nrg: NRGStrategy, isKO: boolean): string {
  const parts: string[] = [];

  // Verdict-based tone
  switch (verdict) {
    case 'engagement':
      parts.push(isKO ? '[HFCP 모드: 적극 참여] 친근하고 적극적인 톤으로 답변하세요.' : '[HFCP Mode: Engagement] Respond warmly and proactively.');
      break;
    case 'normal_free':
      parts.push(isKO ? '[HFCP 모드: 자유 응답] 자연스러운 톤으로 답변하세요.' : '[HFCP Mode: Normal] Respond naturally.');
      break;
    case 'normal_analysis':
      parts.push(isKO ? '[HFCP 모드: 분석] 구조적이고 논리적인 톤으로 답변하세요.' : '[HFCP Mode: Analysis] Respond with structure and logic.');
      break;
    case 'limited':
      parts.push(isKO ? '[HFCP 모드: 제한] 핵심만 간결하게 답변하세요.' : '[HFCP Mode: Limited] Respond concisely, essentials only.');
      break;
    case 'silent':
      parts.push(isKO ? '[HFCP 모드: 침묵] 질문으로만 응답하세요. 직접적인 답변 금지.' : '[HFCP Mode: Silent] Respond with questions only. No direct answers.');
      break;
  }

  // NRG modifier
  if (nrg !== 'normal') {
    switch (nrg) {
      case 'light_variation':
        parts.push(isKO ? '[NRG: 변형] 이전과 다른 구조로 답변하세요.' : '[NRG: Variation] Use different structure from previous answer.');
        break;
      case 'frame_shift':
        parts.push(isKO ? '[NRG: 프레임 전환] 완전히 다른 관점에서 접근하세요.' : '[NRG: Frame Shift] Approach from a completely different angle.');
        break;
      case 'perspective_shift':
        parts.push(isKO ? '[NRG: 시점 전환] 탐색적/비평적 시점으로 답변하세요.' : '[NRG: Perspective Shift] Use exploratory/critical perspective.');
        break;
      case 'meta_ack':
        parts.push(isKO ? '[NRG: 메타 인식] "이미 다뤘지만 다른 각도에서" 식으로 시작하세요.' : '[NRG: Meta-Ack] Acknowledge repetition and offer new angle.');
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

  const isKO = /[가-힣]/.test(userInput);
  const promptModifier = verdictToPromptModifier(verdict, nrg, isKO);

  return { mode, verdict, nrg, score: state.score, promptModifier };
}
