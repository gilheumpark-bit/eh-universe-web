// ============================================================
// PART 1 — Overview (M1.5.0 Shadow Diff Analyzer)
// ============================================================
//
// Shadow Log 스트림을 분석해 일치율·불일치 패턴을 수치화한다.
// 대시보드가 이 모듈을 통해 "On 승격 준비도"를 판정.
//
// 진단:
//   1) 전체 일치율 (%)
//   2) operation별 불일치 집중도
//   3) diffSummary 필드 수준 반복 패턴
//   4) 시간대별 변동 (최근 1h / 24h)
//
// [C] 빈 로그 / null 필드 방어, 분모 0 가드
// [G] 단일 pass로 집계 — 반복 filter 금지
// [K] 순수 함수 — 부작용 없음, 테스트 용이

import type { ShadowLogEntry, ShadowOperation } from './shadow-logger';

// ============================================================
// PART 2 — Types
// ============================================================

export interface OperationMismatch {
  operation: ShadowOperation;
  total: number;
  unmatched: number;
  matchRatePct: number;
}

export interface DiffAnalysisReport {
  /** 전체 엔트리 수. */
  total: number;
  /** 일치한 엔트리 수. */
  matched: number;
  /** 불일치 엔트리 수. */
  unmatched: number;
  /** 일치율 (0 ~ 100). 엔트리 0이면 100. */
  matchRatePct: number;
  /** operation별 집계. */
  byOperation: OperationMismatch[];
  /** 최근 1h 일치율. 해당 구간 엔트리 없으면 null. */
  recent1hMatchRatePct: number | null;
  /** 최근 24h 일치율. 해당 구간 엔트리 없으면 null. */
  recent24hMatchRatePct: number | null;
  /** 반복되는 diff 필드 패턴 (상위 5). */
  topDiffPatterns: Array<{ pattern: string; count: number }>;
  /** 분석 생성 시각. */
  generatedAt: number;
}

// ============================================================
// PART 3 — Main analyzer
// ============================================================

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Shadow Log 전체를 분석해 DiffAnalysisReport 생성.
 * 입력: ShadowLogEntry[] (ts 내림차순/오름차순 무관).
 */
export function analyzeShadowLog(log: readonly ShadowLogEntry[]): DiffAnalysisReport {
  const now = Date.now();
  const generatedAt = now;

  if (!log || log.length === 0) {
    return {
      total: 0,
      matched: 0,
      unmatched: 0,
      matchRatePct: 100,
      byOperation: [],
      recent1hMatchRatePct: null,
      recent24hMatchRatePct: null,
      topDiffPatterns: [],
      generatedAt,
    };
  }

  // 단일 pass 집계
  let matched = 0;
  let unmatched = 0;
  let recent1hTotal = 0;
  let recent1hMatched = 0;
  let recent24hTotal = 0;
  let recent24hMatched = 0;

  const byOp = new Map<ShadowOperation, { total: number; unmatched: number }>();
  const patternCount = new Map<string, number>();

  for (const e of log) {
    if (e.matched) matched++; else unmatched++;

    // operation 집계
    let bucket = byOp.get(e.operation);
    if (!bucket) {
      bucket = { total: 0, unmatched: 0 };
      byOp.set(e.operation, bucket);
    }
    bucket.total++;
    if (!e.matched) bucket.unmatched++;

    // 시간대
    const age = now - e.ts;
    if (age <= HOUR_MS) {
      recent1hTotal++;
      if (e.matched) recent1hMatched++;
    }
    if (age <= DAY_MS) {
      recent24hTotal++;
      if (e.matched) recent24hMatched++;
    }

    // diff 패턴 — diffSummary "fieldA:x≠y | fieldB:x≠y" 에서 필드명 추출
    if (!e.matched && e.diffSummary && e.diffSummary !== 'hash-only' && e.diffSummary !== 'diff-unknown') {
      const parts = e.diffSummary.split('|').map((p) => p.trim()).filter(Boolean);
      for (const p of parts) {
        const colonIdx = p.indexOf(':');
        if (colonIdx <= 0) continue;
        const field = p.slice(0, colonIdx);
        if (!field) continue;
        patternCount.set(field, (patternCount.get(field) ?? 0) + 1);
      }
    }
  }

  const total = matched + unmatched;
  const matchRatePct = total === 0 ? 100 : (matched / total) * 100;

  const byOperation: OperationMismatch[] = Array.from(byOp.entries())
    .map(([operation, v]) => {
      const opMatched = v.total - v.unmatched;
      return {
        operation,
        total: v.total,
        unmatched: v.unmatched,
        matchRatePct: v.total === 0 ? 100 : (opMatched / v.total) * 100,
      };
    })
    .sort((a, b) => a.matchRatePct - b.matchRatePct); // 낮은 일치율부터

  const topDiffPatterns = Array.from(patternCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern, count]) => ({ pattern, count }));

  return {
    total,
    matched,
    unmatched,
    matchRatePct,
    byOperation,
    recent1hMatchRatePct: recent1hTotal === 0 ? null : (recent1hMatched / recent1hTotal) * 100,
    recent24hMatchRatePct: recent24hTotal === 0 ? null : (recent24hMatched / recent24hTotal) * 100,
    topDiffPatterns,
    generatedAt,
  };
}

// ============================================================
// PART 4 — Promotion gate
// ============================================================

export interface ReadinessCheck {
  ready: boolean;
  reason: string;
  matchRatePct: number;
  threshold: number;
  sampleSize: number;
  minSampleSize: number;
}

const DEFAULT_THRESHOLD_PCT = 99.9;
const MIN_SAMPLE_SIZE = 100;

/**
 * 'On' 승격 가능 여부 판단.
 * - 최소 샘플 크기 이상이어야 함 (기본 100)
 * - 일치율이 threshold(99.9) 이상이어야 함
 * - 최근 1h 일치율도 threshold 이상이어야 함 (단기 회귀 방지)
 */
export function isReadyForOnPromotion(
  report: DiffAnalysisReport,
  thresholdPct: number = DEFAULT_THRESHOLD_PCT,
): ReadinessCheck {
  if (report.total < MIN_SAMPLE_SIZE) {
    return {
      ready: false,
      reason: `표본 부족 (${report.total}/${MIN_SAMPLE_SIZE})`,
      matchRatePct: report.matchRatePct,
      threshold: thresholdPct,
      sampleSize: report.total,
      minSampleSize: MIN_SAMPLE_SIZE,
    };
  }
  if (report.matchRatePct < thresholdPct) {
    return {
      ready: false,
      reason: `전체 일치율 부족 (${report.matchRatePct.toFixed(2)}% < ${thresholdPct}%)`,
      matchRatePct: report.matchRatePct,
      threshold: thresholdPct,
      sampleSize: report.total,
      minSampleSize: MIN_SAMPLE_SIZE,
    };
  }
  if (report.recent1hMatchRatePct !== null && report.recent1hMatchRatePct < thresholdPct) {
    return {
      ready: false,
      reason: `최근 1h 회귀 감지 (${report.recent1hMatchRatePct.toFixed(2)}%)`,
      matchRatePct: report.matchRatePct,
      threshold: thresholdPct,
      sampleSize: report.total,
      minSampleSize: MIN_SAMPLE_SIZE,
    };
  }
  return {
    ready: true,
    reason: 'On 승격 가능',
    matchRatePct: report.matchRatePct,
    threshold: thresholdPct,
    sampleSize: report.total,
    minSampleSize: MIN_SAMPLE_SIZE,
  };
}

// ============================================================
// PART 5 — Top-N helpers
// ============================================================

/**
 * 불일치 집중도 상위 N개 operation 반환.
 * unmatched 개수 내림차순 → 일치율 오름차순 (동률 tie-break).
 */
export function getUnmatchedOperations(
  log: readonly ShadowLogEntry[],
  topN: number = 10,
): OperationMismatch[] {
  if (!log || log.length === 0) return [];
  const report = analyzeShadowLog(log);
  return report.byOperation
    .filter((o) => o.unmatched > 0)
    .sort((a, b) => {
      if (b.unmatched !== a.unmatched) return b.unmatched - a.unmatched;
      return a.matchRatePct - b.matchRatePct;
    })
    .slice(0, Math.max(0, topN));
}

// IDENTITY_SEAL: PART-1..5 | role=diff-analyzer | inputs=ShadowLogEntry[] | outputs=DiffAnalysisReport
