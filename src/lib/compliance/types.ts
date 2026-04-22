/**
 * Compliance Scoring — 공통 타입 (2026-04-23 신설).
 *
 * AI 초안 생성 후 7축 채점의 기반 타입 정의.
 *   축 1: 세계관 사실 일치
 *   축 2: 캐릭터 설정 준수
 *   축 3: 연출 지시 (tone·POV) 준수
 *   축 4: 장르 룰 준수
 *   축 5: 씬시트 이벤트 커버리지
 *   축 6: 어조·시점 연속성 (이전 화 대비)
 *   축 7: IP/브랜드 위반 (ip-guard/compliance-axis-7 재수출)
 *
 * MVP 구현 수준:
 *   - 정량 기반 규칙 매칭 (엔티티 카운트·키워드 매칭·POV 비율 등)
 *   - LLM Auditor 호출은 추후 옵션 추가 (현재 `scoreAllAxes`가 인터페이스만 제공)
 */

export type AxisId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type IssueSeverity = 'info' | 'warning' | 'critical';
export type Pov = 'first' | 'third' | 'omniscient' | 'unknown';

// ============================================================
// PART 1 — 채점 Context
// ============================================================

export interface CharacterCtx {
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly personality?: string;
  readonly speechStyle?: string;
  readonly speechExample?: string;
  readonly forbiddenWords?: readonly string[];
}

export interface SceneSheetCtx {
  readonly tone?: string;             // 예: '긴장', '밝음', '서늘'
  readonly pov?: Pov;
  readonly events?: readonly string[]; // 예정 이벤트 핵심 문구
  readonly atmosphereKeywords?: readonly string[];
}

export interface GenreRuleCtx {
  readonly genreId?: string;          // '회귀' | '헌터' | '로맨스' 등
  readonly forbiddenPhrases?: readonly string[];
  readonly requiredMotifs?: readonly string[];
}

export interface AxisContext {
  readonly draft: string;
  readonly worldbookEntities?: readonly string[];
  readonly characters?: readonly CharacterCtx[];
  readonly sceneSheet?: SceneSheetCtx;
  readonly genre?: GenreRuleCtx;
  readonly previousChapter?: string;
}

// ============================================================
// PART 2 — 채점 결과
// ============================================================

export interface AxisIssue {
  readonly severity: IssueSeverity;
  readonly message: string;
  readonly position?: number;
}

export interface AxisResult {
  readonly axis: AxisId;
  readonly name: string;
  /** 0~100 (높을수록 준수) */
  readonly score: number;
  /** 가중치 (0~1). orchestrator가 총점 계산에 사용 */
  readonly weight: number;
  /** 합격 여부 — score >= passThreshold */
  readonly passed: boolean;
  readonly issues: readonly AxisIssue[];
  readonly recommendations: readonly string[];
}

export interface ComplianceReport {
  /** 0~100 가중 평균 */
  readonly totalScore: number;
  /** 전 축 합격 여부 — 한 축이라도 불합격이면 false */
  readonly allPassed: boolean;
  /** critical issue 총 개수 (재생성 트리거용) */
  readonly criticalCount: number;
  /** 축별 결과 */
  readonly axes: readonly AxisResult[];
  /** 재생성에 주입할 지시문 (모든 축의 recommendations 통합) */
  readonly regenerationDirective: string;
}

// ============================================================
// PART 3 — 공통 기본값
// ============================================================

/** 축별 기본 가중치 — 합산 1.0 */
export const DEFAULT_WEIGHTS: Record<AxisId, number> = {
  1: 0.15,  // 세계관 사실
  2: 0.20,  // 캐릭터 (말투 재현이 치명)
  3: 0.10,  // 연출 지시
  4: 0.15,  // 장르 룰
  5: 0.15,  // 씬시트 커버
  6: 0.10,  // 연속성
  7: 0.15,  // IP/브랜드
};

export const DEFAULT_PASS_THRESHOLD = 80;
