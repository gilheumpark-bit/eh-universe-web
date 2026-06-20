// ============================================================
// PART 1 — Module Header
// ============================================================
//
// Long-Arc Verifier — 1~100화 전체 맥락 이탈 검증.
//
// 5축 검증:
//   1. plot-drift   — 시놉시스 vs 화별 흐름
//   2. character-arc — 화별 캐릭터 일관성
//   3. world-violation — 룰 위반
//   4. foreshadow — 떡밥 회수 추적
//   5. tension — 텐션 궤적 vs 계획
//
// [C] 모든 결과 옵셔널 — 부분 입력만으로도 부분 결과 반환
// [G] 5축 병렬 실행 (orchestrator)
// [K] 단일 책임 — types 만
// ============================================================

// ============================================================
// PART 2 — Common types
// ============================================================

/** 검증 심각도 */
export type ViolationSeverity = 'info' | 'warning' | 'error';

/** 위반 카테고리 (5축 공통) */
export type ViolationKind =
  | 'plot-drift'
  | 'character-arc-inconsistency'
  | 'world-rule-violation'
  | 'foreshadow-unresolved'
  | 'tension-trajectory-deviation'
  | 'subplot-dangling';

/** 단일 위반 항목 */
export interface Violation {
  kind: ViolationKind;
  severity: ViolationSeverity;
  episodeId?: number;
  /** 4언어 메시지 — UI 가 현재 언어 선택 */
  messages: { ko: string; en: string; ja?: string; zh?: string };
  /** 점프 좌표 (선택) — episodeId + charOffset */
  jumpTarget?: { episodeId: number; charOffset?: number };
  /** 보조 데이터 (drift 점수 / 회수 거리 등) */
  meta?: Record<string, string | number | boolean>;
}

/** 단일 축 결과 */
export interface AxisResult {
  axis: ViolationKind | 'plot-drift' | 'character-arc' | 'world' | 'foreshadow' | 'tension';
  /** 0~100 점수 (높을수록 건강) */
  score: number;
  violations: Violation[];
  /** 빌드 시간 ms */
  durationMs: number;
}

/** Drift 점수 (plot-drift / character-arc 공통) */
export interface DriftScore {
  /** 0~1 — 1 이면 완전 일치, 0 이면 무관 */
  similarity: number;
  /** 0~100 — 100 이면 정합 */
  driftScore: number;
  details?: string;
}

// ============================================================
// PART 3 — VerifierReport (orchestrator 결과)
// ============================================================

export interface VerifierReport {
  /** 작품 ID */
  projectId: string;
  /** 빌드 시각 ISO */
  generatedAt: string;
  /** 5축 결과 */
  axes: {
    plotDrift: AxisResult;
    characterArc: AxisResult;
    worldViolation: AxisResult;
    foreshadow: AxisResult;
    tension: AxisResult;
  };
  /** 종합 점수 (5축 가중 평균) */
  overallScore: number;
  /** 위험 우선순위 (severity desc, episodeId asc) */
  prioritized: Violation[];
  /** 총 위반 수 */
  totalViolations: number;
  /** 본문 hash (캐시 무효화 키) */
  manuscriptHash: string;
}

// ============================================================
// PART 4 — Foreshadow types
// ============================================================

export interface ForeshadowMarker {
  /** 떡밥 ID — 마커 패턴 [떡밥-{id}] / [복선-{id}] */
  id: string;
  /** 시작(setup) 화수 */
  setupEpisode: number;
  setupCharOffset: number;
  setupContext: string;
  /** 회수(payoff) 화수 — undefined 면 미회수 */
  payoffEpisode?: number;
  payoffCharOffset?: number;
  payoffContext?: string;
  /** 회수 거리 (회) — payoffEpisode - setupEpisode */
  resolutionDistance?: number;
  /** 마커 종류 */
  type: 'foreshadow' | 'subplot';
}

// ============================================================
// PART 5 — Tension types
// ============================================================

export interface TensionPoint {
  episodeId: number;
  /** 0~100 텐션 — series-direction-dna 또는 LLM 점수 */
  tension: number;
  /** 계획 텐션 (있으면) */
  plannedTension?: number;
  /** 꺾임 (slope 변화) — true 면 인접 화 대비 ±20 이상 변화 */
  isInflection: boolean;
}

export interface TensionTrajectory {
  points: TensionPoint[];
  inflectionCount: number;
  avgDeviation: number;
}
