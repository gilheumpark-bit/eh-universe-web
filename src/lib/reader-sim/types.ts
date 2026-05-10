// ============================================================
// Reader Simulation Types
//
// 5 페르소나 × N화 → engagement curve + dropout 예측.
// LLM 없이 결정론 휴리스틱 (Phase 1) — Phase 2 LLM 보강.
// ============================================================

/** 페르소나 ID */
export type PersonaId = 'genre-fan' | 'general' | 'critical' | 'casual' | 'expert';

export interface ReaderPersona {
  id: PersonaId;
  /** 4언어 라벨 */
  label: { ko: string; en: string; ja: string; zh: string };
  /** 집중도 (1.0 = 평균) — 본문 길이/장면 변화에 대한 인내력 */
  attentionSpan: number;
  /** 장르 매니아 점수 — 장르 클리셰 발견 시 +engagement */
  genreAffinity: number;
  /** 비판 강도 — 모순/단조 발견 시 -engagement */
  criticality: number;
  /** 이탈 임계값 (engagement 이 미만이면 dropout) */
  dropoutThreshold: number;
}

/** 화별 engagement 결과 */
export interface EngagementPoint {
  episodeId: number;
  /** 페르소나별 engagement (0~100) */
  perPersona: Record<PersonaId, number>;
  /** 평균 engagement */
  average: number;
}

/** 화별 dropout 예측 */
export interface DropoutPrediction {
  episodeId: number;
  /** 페르소나별 이탈 여부 */
  perPersona: Record<PersonaId, boolean>;
  /** 누적 이탈률 (0~1) */
  dropoutRate: number;
}

/** 시뮬 결과 — 작품 전체 */
export interface EngagementProfile {
  points: EngagementPoint[];
  predictions: DropoutPrediction[];
  /** 평균 engagement */
  averageEngagement: number;
  /** 100화 도달 시 누적 이탈률 (마지막 화 기준) */
  finalDropoutRate: number;
  /** 페르소나별 이탈 화수 (없으면 undefined) */
  dropoutEpisodeByPersona: Record<PersonaId, number | undefined>;
  /** 빌드 시간 ms */
  durationMs: number;
}
