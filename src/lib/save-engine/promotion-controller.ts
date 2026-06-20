// ============================================================
// PART 1 — Overview (M1.5.4 Promotion Controller)
// ============================================================
//
// Shadow 모드에서 축적된 ShadowLogEntry 로부터 "On 승격"이 안전한지 평가한다.
// 승격은 4 조건 AND:
//   (1) 최소 표본 (기본 1,000)
//   (2) 최소 관찰 시간 (기본 72h)
//   (3) 전체 + 최근 1h 일치율 99.9% 이상 (회귀 감지 포함)
//   (4) 저널 쓰기 P95 < 50ms (성능 기준)
//
// 다운그레이드 트리거:
//   Journal 경로에서 감지된 오류 시그널이 {window 내 minOccurrences} 이상이면
//   즉시 'on' → 'shadow' 로 복귀.
//
// [원칙 1] 승격은 보수적 — 4 조건 AND. 하나만 실패해도 ready=false.
// [원칙 2] 다운그레이드는 즉시 — 오류 누적 한계 넘으면 shouldDowngrade=true.
// [원칙 3] 순수 함수 — 입력만으로 결론. 부작용 없음 (테스트 용이).
// [원칙 4] 분모 0 가드 — 표본 0이어도 throw 없이 blockedReason 반환.
//
// [C] 빈 배열/음수/NaN 방어, 분모 0 시 matchRatePct=100 로 초기화,
//     경계값(== threshold) 은 통과, 미만은 차단.
// [G] 단일 pass 집계 — sort/filter 2회 이내.
// [K] 순수 함수 4개 + 상수 1개 (DEFAULT_CRITERIA).

import type { ShadowLogEntry, ShadowOperation } from './shadow-logger';
import type { DiffAnalysisReport } from './diff-analyzer';

// ============================================================
// PART 2 — Types
// ============================================================

/** 승격 판정 기준 — 기본값은 DEFAULT_CRITERIA. */
export interface PromotionCriteria {
  /** 최소 일치율 (%). 기본 99.9. */
  minMatchRate: number;
  /** 최소 표본 크기. 기본 1000. */
  minSampleSize: number;
  /** 최소 관찰 시간 (시간). 기본 72. */
  minObservationHours: number;
  /**
   * 최근 1h 회귀 감지 허용치 (%p).
   * 전체 일치율 대비 최근 1h 가 이 값 이상 하락하면 blocked.
   * 기본 0.1 (99.95% 전체 vs 99.85% 최근1h = 0.1%p 하락 → OK).
   */
  maxRecentRegressionPct: number;
  /** 저널 쓰기 P95 상한 (ms). 기본 50. */
  maxP95JournalDurationMs: number;
}

/** 측정된 지표 — 4 조건 판정 입력. */
export interface PromotionMetrics {
  /** 전체 일치율 (%). 분모 0이면 100. */
  matchRate: number;
  /** 표본 크기 (ShadowLogEntry 수). */
  sampleSize: number;
  /** 최초 ~ 최신 엔트리 ts 범위 (시간). 엔트리 0이면 0. */
  observationHours: number;
  /**
   * 최근 1h vs 그 이전 구간 일치율 차이 (%p).
   * 양수 = 최근이 더 낮음 (회귀), 음수 = 최근이 더 높음.
   * 최근 1h 표본 0 이면 0 (판정 유보 → criterion 4 통과).
   */
  recentRegressionPct: number;
  /** 저널 쓰기 소요시간 P95 (ms). 엔트리 0 이면 0. */
  p95JournalMs: number;
}

/** 승격 판정 결과. */
export interface PromotionStatus {
  /** 4 조건 모두 통과 시 true. */
  ready: boolean;
  /** 차단 사유 — ready=true 면 undefined. */
  blockedReason?: string;
  /** 각 조건별 통과 여부 (true = 통과). UI 체크리스트용. */
  criteriaChecks: {
    sampleSize: boolean;
    observationTime: boolean;
    matchRate: boolean;
    recentRegression: boolean;
    p95Performance: boolean;
  };
  /** 측정된 지표. */
  metrics: PromotionMetrics;
  /** 적용된 기준. */
  criteria: PromotionCriteria;
  /** 평가 시점. */
  evaluatedAt: number;
}

/** Journal 오류 시그널 — 다운그레이드 판정 입력. */
export interface JournalError {
  /** 오류 발생 시각 (ms). */
  ts: number;
  /** 오류 대상 operation (optional). */
  operation?: ShadowOperation;
  /** 식별자 — 로그 추적용. */
  reason: string;
}

/** 다운그레이드 판정 옵션. */
export interface DowngradeOptions {
  /** 다운그레이드 트리거 최소 오류 수. 기본 3. */
  minOccurrences: number;
  /** 평가 윈도우 (ms). 기본 60_000 (1분). */
  windowMs: number;
}

// ============================================================
// PART 3 — Defaults
// ============================================================

export const DEFAULT_CRITERIA: PromotionCriteria = {
  minMatchRate: 99.9,
  minSampleSize: 1000,
  minObservationHours: 72,
  maxRecentRegressionPct: 0.1,
  maxP95JournalDurationMs: 50,
};

export const DEFAULT_DOWNGRADE_OPTIONS: DowngradeOptions = {
  minOccurrences: 3,
  windowMs: 60_000,
};

// ============================================================
// PART 4 — evaluatePromotion (4-condition AND)
// ============================================================

/**
 * ShadowLogEntry 와 DiffAnalysisReport 로부터 4 조건 AND 평가.
 *
 * 경계값 처리:
 *   - sampleSize >= minSampleSize  (>=, 1000=통과 / 999=차단)
 *   - matchRate >= minMatchRate    (>=, 99.9=통과 / 99.89=차단)
 *   - observationHours >= minObservationHours (>=, 72=통과 / 71.9=차단)
 *   - recentRegressionPct <= maxRecentRegressionPct (<=, 정확히 같으면 통과)
 *   - p95JournalMs <= maxP95JournalDurationMs (<=, 50=통과 / 50.01=차단)
 */
export function evaluatePromotion(
  log: readonly ShadowLogEntry[],
  report: DiffAnalysisReport,
  criteria: PromotionCriteria = DEFAULT_CRITERIA,
): PromotionStatus {
  const safeCriteria = sanitizeCriteria(criteria);
  const metrics = computeMetrics(log, report);

  const checks = {
    sampleSize: metrics.sampleSize >= safeCriteria.minSampleSize,
    observationTime: metrics.observationHours >= safeCriteria.minObservationHours,
    matchRate: metrics.matchRate >= safeCriteria.minMatchRate,
    recentRegression: metrics.recentRegressionPct <= safeCriteria.maxRecentRegressionPct,
    p95Performance: metrics.p95JournalMs <= safeCriteria.maxP95JournalDurationMs,
  };

  const ready =
    checks.sampleSize &&
    checks.observationTime &&
    checks.matchRate &&
    checks.recentRegression &&
    checks.p95Performance;

  const blockedReason = ready ? undefined : firstFailure(checks, metrics, safeCriteria);

  return {
    ready,
    blockedReason,
    criteriaChecks: checks,
    metrics,
    criteria: safeCriteria,
    evaluatedAt: Date.now(),
  };
}

function firstFailure(
  checks: PromotionStatus['criteriaChecks'],
  m: PromotionMetrics,
  c: PromotionCriteria,
): string {
  if (!checks.sampleSize) {
    return `sampleSize:${m.sampleSize}<${c.minSampleSize}`;
  }
  if (!checks.observationTime) {
    return `observationHours:${m.observationHours.toFixed(2)}<${c.minObservationHours}`;
  }
  if (!checks.matchRate) {
    return `matchRate:${m.matchRate.toFixed(4)}<${c.minMatchRate}`;
  }
  if (!checks.recentRegression) {
    return `recentRegression:${m.recentRegressionPct.toFixed(4)}>${c.maxRecentRegressionPct}`;
  }
  if (!checks.p95Performance) {
    return `p95JournalMs:${m.p95JournalMs.toFixed(2)}>${c.maxP95JournalDurationMs}`;
  }
  return 'unknown';
}

// ============================================================
// PART 5 — Metrics computation (single pass)
// ============================================================

const HOUR_MS = 60 * 60 * 1000;

function computeMetrics(
  log: readonly ShadowLogEntry[],
  report: DiffAnalysisReport,
): PromotionMetrics {
  const safeLog = Array.isArray(log) ? log : [];

  // 분모 0 방어
  if (safeLog.length === 0) {
    return {
      matchRate: 100,
      sampleSize: 0,
      observationHours: 0,
      recentRegressionPct: 0,
      p95JournalMs: 0,
    };
  }

  // 관찰 시간 — min(ts) ~ max(ts) 범위
  let minTs = Number.POSITIVE_INFINITY;
  let maxTs = Number.NEGATIVE_INFINITY;
  const now = Date.now();
  let recentTotal = 0;
  let recentMatched = 0;
  let olderTotal = 0;
  let olderMatched = 0;
  const journalDurations: number[] = [];

  for (const e of safeLog) {
    if (typeof e.ts === 'number' && Number.isFinite(e.ts)) {
      if (e.ts < minTs) minTs = e.ts;
      if (e.ts > maxTs) maxTs = e.ts;
    }
    if (typeof e.journalDurationMs === 'number' && Number.isFinite(e.journalDurationMs) && e.journalDurationMs >= 0) {
      journalDurations.push(e.journalDurationMs);
    }
    const age = typeof e.ts === 'number' ? now - e.ts : Number.POSITIVE_INFINITY;
    if (age <= HOUR_MS) {
      recentTotal++;
      if (e.matched) recentMatched++;
    } else {
      olderTotal++;
      if (e.matched) olderMatched++;
    }
  }

  const observationHours =
    minTs === Number.POSITIVE_INFINITY || maxTs === Number.NEGATIVE_INFINITY || maxTs < minTs
      ? 0
      : (maxTs - minTs) / HOUR_MS;

  const recentRate = recentTotal === 0 ? null : (recentMatched / recentTotal) * 100;
  const olderRate = olderTotal === 0 ? null : (olderMatched / olderTotal) * 100;

  // 최근 1h 표본 없으면 0 (판정 유보 — 통과로 간주).
  // 최근/이전 모두 있으면 (older - recent) = 회귀 %p. 양수 = 최근이 더 낮음.
  // 이전 표본 없으면 전체 matchRate 를 기준으로 비교.
  let recentRegressionPct = 0;
  if (recentRate !== null) {
    const baseline = olderRate !== null ? olderRate : report.matchRatePct;
    recentRegressionPct = baseline - recentRate;
  }

  const p95JournalMs = computeP95(journalDurations);

  return {
    matchRate: report.matchRatePct,
    sampleSize: safeLog.length,
    observationHours,
    recentRegressionPct,
    p95JournalMs,
  };
}

// ============================================================
// PART 6 — P95 computation
// ============================================================

/** 정렬된 배열의 95 백분위수 근사. 빈 배열이면 0. */
function computeP95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // nearest-rank — ceil(0.95 * N) - 1 (0-index)
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(0.95 * sorted.length) - 1),
  );
  return sorted[idx];
}

// ============================================================
// PART 7 — shouldDowngrade (즉각 트리거)
// ============================================================

/**
 * Journal 오류 시그널 평가. windowMs 내 minOccurrences 이상이면 true.
 *
 * [경계값]
 *   - errors=[], minOccurrences=3 → false
 *   - errors 3개 모두 windowMs 내 → true
 *   - errors 3개 중 2개만 windowMs 내 → false
 *   - errors 3개 모두 windowMs 밖 → false
 */
export function shouldDowngrade(
  errors: readonly JournalError[],
  options: DowngradeOptions = DEFAULT_DOWNGRADE_OPTIONS,
): boolean {
  const safe = Array.isArray(errors) ? errors : [];
  if (safe.length === 0) return false;

  const opts = sanitizeDowngradeOptions(options);
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  let count = 0;
  for (const err of safe) {
    if (typeof err?.ts !== 'number' || !Number.isFinite(err.ts)) continue;
    if (err.ts >= cutoff) count++;
    if (count >= opts.minOccurrences) return true;
  }
  return false;
}

// ============================================================
// PART 8 — Input sanitization
// ============================================================

function sanitizeCriteria(c: PromotionCriteria): PromotionCriteria {
  return {
    minMatchRate: isFinitePositive(c.minMatchRate) ? c.minMatchRate : DEFAULT_CRITERIA.minMatchRate,
    minSampleSize: Number.isInteger(c.minSampleSize) && c.minSampleSize >= 0
      ? c.minSampleSize
      : DEFAULT_CRITERIA.minSampleSize,
    minObservationHours: isFinitePositive(c.minObservationHours)
      ? c.minObservationHours
      : DEFAULT_CRITERIA.minObservationHours,
    maxRecentRegressionPct: Number.isFinite(c.maxRecentRegressionPct) && c.maxRecentRegressionPct >= 0
      ? c.maxRecentRegressionPct
      : DEFAULT_CRITERIA.maxRecentRegressionPct,
    maxP95JournalDurationMs: isFinitePositive(c.maxP95JournalDurationMs)
      ? c.maxP95JournalDurationMs
      : DEFAULT_CRITERIA.maxP95JournalDurationMs,
  };
}

function sanitizeDowngradeOptions(o: DowngradeOptions): DowngradeOptions {
  return {
    minOccurrences: Number.isInteger(o.minOccurrences) && o.minOccurrences >= 1
      ? o.minOccurrences
      : DEFAULT_DOWNGRADE_OPTIONS.minOccurrences,
    windowMs: isFinitePositive(o.windowMs)
      ? o.windowMs
      : DEFAULT_DOWNGRADE_OPTIONS.windowMs,
  };
}

function isFinitePositive(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

// IDENTITY_SEAL: PART-1..8 | role=promotion-controller | inputs=log+report+criteria | outputs=PromotionStatus
