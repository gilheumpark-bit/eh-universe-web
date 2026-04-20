// ============================================================
// PART 1 — Fixtures
// ============================================================

import {
  evaluatePromotion,
  shouldDowngrade,
  DEFAULT_CRITERIA,
  DEFAULT_DOWNGRADE_OPTIONS,
  type PromotionCriteria,
  type DowngradeOptions,
  type JournalError,
} from '../promotion-controller';
import type { ShadowLogEntry, ShadowOperation } from '../shadow-logger';
import type { DiffAnalysisReport } from '../diff-analyzer';

const HOUR_MS = 60 * 60 * 1000;

function makeEntry(partial: Partial<ShadowLogEntry> = {}): ShadowLogEntry {
  const ts = partial.ts ?? Date.now();
  return {
    id: partial.id ?? `id-${Math.random().toString(36).slice(2)}`,
    correlationId: partial.correlationId ?? `cor-${Math.random().toString(36).slice(2)}`,
    ts,
    operation: (partial.operation ?? 'save-project') as ShadowOperation,
    legacyHash: partial.legacyHash ?? 'A',
    journalHash: partial.journalHash ?? 'A',
    matched: partial.matched ?? true,
    diffSummary: partial.diffSummary,
    durationMs: partial.durationMs ?? 5,
    journalDurationMs: partial.journalDurationMs ?? 10,
  };
}

function makeReport(over: Partial<DiffAnalysisReport> = {}): DiffAnalysisReport {
  return {
    total: over.total ?? 0,
    matched: over.matched ?? 0,
    unmatched: over.unmatched ?? 0,
    matchRatePct: over.matchRatePct ?? 100,
    byOperation: over.byOperation ?? [],
    recent1hMatchRatePct: over.recent1hMatchRatePct ?? null,
    recent24hMatchRatePct: over.recent24hMatchRatePct ?? null,
    topDiffPatterns: over.topDiffPatterns ?? [],
    generatedAt: over.generatedAt ?? Date.now(),
  };
}

/**
 * 대량 샘플 합성 — observationHours 와 matchRate 를 제어.
 * - total 개 엔트리를 생성
 * - 시작 ts = now - hoursSpan * HOUR_MS, 종료 ts = now
 * - unmatchedRatio: 0 ~ 1 — 불일치 비율
 * - journalDurationMs: 고정 (기본 10ms)
 */
function seedEntries(opts: {
  total: number;
  hoursSpan: number;
  unmatchedRatio?: number;
  journalDurationMs?: number;
  now?: number;
}): ShadowLogEntry[] {
  const { total, hoursSpan } = opts;
  const unmatchedRatio = opts.unmatchedRatio ?? 0;
  const journalDurationMs = opts.journalDurationMs ?? 10;
  const now = opts.now ?? Date.now();
  if (total <= 0) return [];
  const start = now - hoursSpan * HOUR_MS;
  const step = total > 1 ? (now - start) / (total - 1) : 0;
  const unmatchedCount = Math.round(total * unmatchedRatio);
  const arr: ShadowLogEntry[] = [];
  for (let i = 0; i < total; i++) {
    arr.push(
      makeEntry({
        ts: Math.floor(start + step * i),
        matched: i >= unmatchedCount, // 앞쪽 N개는 불일치로
        journalDurationMs,
      }),
    );
  }
  return arr;
}

// ============================================================
// PART 2 — evaluatePromotion: 4-condition AND + boundaries
// ============================================================

describe('evaluatePromotion — 4 조건 AND', () => {
  test('빈 로그 → not ready (sampleSize 실패)', () => {
    const r = evaluatePromotion([], makeReport());
    expect(r.ready).toBe(false);
    expect(r.criteriaChecks.sampleSize).toBe(false);
    expect(r.metrics.sampleSize).toBe(0);
    expect(r.blockedReason).toMatch(/sampleSize/);
  });

  test('모든 조건 통과 → ready=true', () => {
    const entries = seedEntries({
      total: 1000,
      hoursSpan: 72,
      unmatchedRatio: 0,
      journalDurationMs: 10,
    });
    const report = makeReport({
      total: 1000,
      matched: 1000,
      matchRatePct: 100,
      recent1hMatchRatePct: 100,
    });
    const r = evaluatePromotion(entries, report);
    expect(r.ready).toBe(true);
    expect(r.blockedReason).toBeUndefined();
    expect(r.criteriaChecks.sampleSize).toBe(true);
    expect(r.criteriaChecks.observationTime).toBe(true);
    expect(r.criteriaChecks.matchRate).toBe(true);
    expect(r.criteriaChecks.recentRegression).toBe(true);
    expect(r.criteriaChecks.p95Performance).toBe(true);
  });

  // ----------------------------------------------------------
  // 경계값 (sampleSize) — 999 vs 1000
  // ----------------------------------------------------------
  test('sampleSize 경계: 999 → 실패', () => {
    const entries = seedEntries({ total: 999, hoursSpan: 80 });
    const r = evaluatePromotion(entries, makeReport({ total: 999, matched: 999, matchRatePct: 100 }));
    expect(r.criteriaChecks.sampleSize).toBe(false);
    expect(r.ready).toBe(false);
  });

  test('sampleSize 경계: 1000 → 통과', () => {
    const entries = seedEntries({ total: 1000, hoursSpan: 80 });
    const r = evaluatePromotion(entries, makeReport({ total: 1000, matched: 1000, matchRatePct: 100 }));
    expect(r.criteriaChecks.sampleSize).toBe(true);
  });

  // ----------------------------------------------------------
  // 경계값 (matchRate) — 99.89% vs 99.91%
  // ----------------------------------------------------------
  test('matchRate 경계: 99.89% → 실패', () => {
    const entries = seedEntries({ total: 1000, hoursSpan: 80 });
    const report = makeReport({ total: 1000, matched: 999, unmatched: 1, matchRatePct: 99.89 });
    const r = evaluatePromotion(entries, report);
    expect(r.criteriaChecks.matchRate).toBe(false);
    expect(r.blockedReason).toMatch(/matchRate/);
  });

  test('matchRate 경계: 99.9% (정확) → 통과', () => {
    const entries = seedEntries({ total: 1000, hoursSpan: 80 });
    const report = makeReport({ total: 1000, matched: 999, unmatched: 1, matchRatePct: 99.9 });
    const r = evaluatePromotion(entries, report);
    expect(r.criteriaChecks.matchRate).toBe(true);
  });

  test('matchRate 경계: 99.91% → 통과', () => {
    const entries = seedEntries({ total: 1000, hoursSpan: 80 });
    const report = makeReport({ total: 1000, matched: 999, unmatched: 1, matchRatePct: 99.91 });
    const r = evaluatePromotion(entries, report);
    expect(r.criteriaChecks.matchRate).toBe(true);
  });

  // ----------------------------------------------------------
  // 경계값 (observationHours) — 71.9h vs 72h
  // ----------------------------------------------------------
  test('observationTime 경계: 71.5h → 실패', () => {
    const entries = seedEntries({ total: 1200, hoursSpan: 71.5 });
    const report = makeReport({ total: 1200, matched: 1200, matchRatePct: 100 });
    const r = evaluatePromotion(entries, report);
    expect(r.criteriaChecks.observationTime).toBe(false);
    expect(r.metrics.observationHours).toBeLessThan(72);
  });

  test('observationTime 경계: 72h (정확) → 통과', () => {
    const entries = seedEntries({ total: 1200, hoursSpan: 72 });
    const report = makeReport({ total: 1200, matched: 1200, matchRatePct: 100 });
    const r = evaluatePromotion(entries, report);
    expect(r.criteriaChecks.observationTime).toBe(true);
  });

  // ----------------------------------------------------------
  // 경계값 (recentRegression) — regression 허용치 0.1%p
  // ----------------------------------------------------------
  test('recentRegression: 최근 1h 가 10%p 급락 → 실패', () => {
    // 72시간 전체 = 100% 일치, 최근 1h = 90% 일치 (10%p 회귀)
    const now = Date.now();
    const older = seedEntries({
      total: 500,
      hoursSpan: 70, // 70h ~ 72h 전반 전체를 깔되, 최근 1h 밖
      now: now - 2 * HOUR_MS,
      unmatchedRatio: 0,
    });
    const recent: ShadowLogEntry[] = [];
    for (let i = 0; i < 500; i++) {
      recent.push(
        makeEntry({
          ts: now - Math.floor(Math.random() * HOUR_MS * 0.9),
          matched: i >= 50, // 10% unmatched
        }),
      );
    }
    const all = [...older, ...recent];
    const report = makeReport({
      total: all.length,
      matched: all.filter((e) => e.matched).length,
      matchRatePct: 99, // 대략
      recent1hMatchRatePct: 90,
    });
    const r = evaluatePromotion(all, report);
    expect(r.criteriaChecks.recentRegression).toBe(false);
  });

  test('recentRegression: 최근 1h 표본 없음 → regression=0, 통과', () => {
    // 모든 엔트리가 1h 이전
    const now = Date.now();
    const older = seedEntries({
      total: 1100,
      hoursSpan: 72,
      now: now - 5 * HOUR_MS,
    });
    const report = makeReport({
      total: 1100,
      matched: 1100,
      matchRatePct: 100,
      recent1hMatchRatePct: null,
    });
    const r = evaluatePromotion(older, report);
    expect(r.metrics.recentRegressionPct).toBe(0);
    expect(r.criteriaChecks.recentRegression).toBe(true);
  });

  // ----------------------------------------------------------
  // 경계값 (p95JournalMs) — 50ms vs 51ms
  // ----------------------------------------------------------
  test('p95Performance 경계: P95 = 50ms → 통과', () => {
    const entries: ShadowLogEntry[] = [];
    const now = Date.now();
    // 95개 50ms, 5개 100ms → 정렬 후 95번째(0-index) = 50ms
    for (let i = 0; i < 1000; i++) {
      entries.push(
        makeEntry({
          ts: now - Math.floor(Math.random() * 72 * HOUR_MS),
          journalDurationMs: i < 950 ? 50 : 200,
        }),
      );
    }
    const report = makeReport({ total: 1000, matched: 1000, matchRatePct: 100 });
    const r = evaluatePromotion(entries, report);
    expect(r.metrics.p95JournalMs).toBeLessThanOrEqual(50);
    expect(r.criteriaChecks.p95Performance).toBe(true);
  });

  test('p95Performance 경계: P95 = 51ms → 실패', () => {
    const entries: ShadowLogEntry[] = [];
    const now = Date.now();
    for (let i = 0; i < 1000; i++) {
      entries.push(
        makeEntry({
          ts: now - Math.floor(Math.random() * 72 * HOUR_MS),
          journalDurationMs: i < 950 ? 51 : 200,
        }),
      );
    }
    const report = makeReport({ total: 1000, matched: 1000, matchRatePct: 100 });
    const r = evaluatePromotion(entries, report);
    expect(r.metrics.p95JournalMs).toBeGreaterThan(50);
    expect(r.criteriaChecks.p95Performance).toBe(false);
  });

  // ----------------------------------------------------------
  // Custom criteria
  // ----------------------------------------------------------
  test('custom criteria 적용 (낮은 표본 기준)', () => {
    const criteria: PromotionCriteria = {
      ...DEFAULT_CRITERIA,
      minSampleSize: 100,
      minObservationHours: 1,
    };
    const entries = seedEntries({ total: 100, hoursSpan: 1 });
    const r = evaluatePromotion(entries, makeReport({ total: 100, matched: 100, matchRatePct: 100 }), criteria);
    expect(r.ready).toBe(true);
  });

  // ----------------------------------------------------------
  // 방어 — 비정상 criteria
  // ----------------------------------------------------------
  test('NaN criteria 주입 → DEFAULT 값으로 폴백', () => {
    const criteria = {
      minMatchRate: NaN,
      minSampleSize: -5,
      minObservationHours: NaN,
      maxRecentRegressionPct: NaN,
      maxP95JournalDurationMs: NaN,
    } as unknown as PromotionCriteria;
    const entries = seedEntries({ total: 1000, hoursSpan: 80 });
    const r = evaluatePromotion(entries, makeReport({ total: 1000, matched: 1000, matchRatePct: 100 }), criteria);
    // DEFAULT 로 폴백되므로 기본 조건과 동일하게 통과
    expect(r.criteria.minMatchRate).toBe(DEFAULT_CRITERIA.minMatchRate);
    expect(r.criteria.minSampleSize).toBe(DEFAULT_CRITERIA.minSampleSize);
    expect(r.ready).toBe(true);
  });

  test('log 가 null → 빈 배열로 취급', () => {
    // TypeScript 타입 우회
    const r = evaluatePromotion(null as unknown as ShadowLogEntry[], makeReport());
    expect(r.ready).toBe(false);
    expect(r.metrics.sampleSize).toBe(0);
  });
});

// ============================================================
// PART 3 — shouldDowngrade: 에러 window + minOccurrences
// ============================================================

describe('shouldDowngrade — 다운그레이드 트리거', () => {
  test('빈 에러 → false', () => {
    expect(shouldDowngrade([])).toBe(false);
  });

  test('minOccurrences 미만 → false', () => {
    const now = Date.now();
    const errs: JournalError[] = [
      { ts: now - 1_000, reason: 'e1' },
      { ts: now - 2_000, reason: 'e2' },
    ];
    expect(shouldDowngrade(errs)).toBe(false);
  });

  test('window 내 minOccurrences(3) 충족 → true', () => {
    const now = Date.now();
    const errs: JournalError[] = [
      { ts: now - 1_000, reason: 'e1' },
      { ts: now - 2_000, reason: 'e2' },
      { ts: now - 3_000, reason: 'e3' },
    ];
    expect(shouldDowngrade(errs)).toBe(true);
  });

  test('window 밖 에러는 무시', () => {
    const now = Date.now();
    const errs: JournalError[] = [
      // 10분 전 (window=60s 이므로 밖)
      { ts: now - 10 * 60_000, reason: 'old1' },
      { ts: now - 10 * 60_000, reason: 'old2' },
      { ts: now - 10 * 60_000, reason: 'old3' },
      // 최근
      { ts: now - 1_000, reason: 'new1' },
    ];
    expect(shouldDowngrade(errs)).toBe(false);
  });

  test('custom options — windowMs 더 넓히면 통과', () => {
    const now = Date.now();
    const errs: JournalError[] = [
      { ts: now - 10 * 60_000, reason: 'e1' },
      { ts: now - 10 * 60_000, reason: 'e2' },
      { ts: now - 10 * 60_000, reason: 'e3' },
    ];
    const opts: DowngradeOptions = { minOccurrences: 3, windowMs: 30 * 60_000 };
    expect(shouldDowngrade(errs, opts)).toBe(true);
  });

  test('ts 가 NaN 인 에러는 무시', () => {
    const now = Date.now();
    const errs: JournalError[] = [
      { ts: Number.NaN, reason: 'bad1' },
      { ts: now - 1_000, reason: 'e1' },
      { ts: now - 2_000, reason: 'e2' },
    ];
    // 유효 2건 → 미충족
    expect(shouldDowngrade(errs)).toBe(false);
  });

  test('에러 배열이 null → false (throw 없음)', () => {
    expect(shouldDowngrade(null as unknown as JournalError[])).toBe(false);
  });

  test('DEFAULT_DOWNGRADE_OPTIONS 확인', () => {
    expect(DEFAULT_DOWNGRADE_OPTIONS.minOccurrences).toBe(3);
    expect(DEFAULT_DOWNGRADE_OPTIONS.windowMs).toBe(60_000);
  });

  test('비정상 options (음수 windowMs) → DEFAULT 폴백', () => {
    const now = Date.now();
    const errs: JournalError[] = [
      { ts: now - 1_000, reason: 'e1' },
      { ts: now - 2_000, reason: 'e2' },
      { ts: now - 3_000, reason: 'e3' },
    ];
    const opts = { minOccurrences: 3, windowMs: -1 } as unknown as DowngradeOptions;
    // windowMs 가 DEFAULT(60s) 로 폴백 → 3건 모두 window 내 → true
    expect(shouldDowngrade(errs, opts)).toBe(true);
  });

  test('minOccurrences 충족 즉시 true (early return)', () => {
    const now = Date.now();
    // 첫 3건에서 충족 후 추가 순회 없음
    const errs: JournalError[] = Array.from({ length: 100 }, (_, i) => ({
      ts: now - i * 100,
      reason: `e${i}`,
    }));
    expect(shouldDowngrade(errs)).toBe(true);
  });
});

// ============================================================
// PART 4 — Metrics — observation hours / P95 details
// ============================================================

describe('PromotionMetrics — 지표 계산 세부', () => {
  test('observation hours = max(ts) - min(ts)', () => {
    const now = Date.now();
    const entries = [
      makeEntry({ ts: now - 72 * HOUR_MS }),
      makeEntry({ ts: now }),
    ];
    const r = evaluatePromotion(entries, makeReport({ total: 2, matched: 2, matchRatePct: 100 }));
    expect(r.metrics.observationHours).toBeCloseTo(72, 1);
  });

  test('P95 대략 95 백분위수 근사', () => {
    const entries: ShadowLogEntry[] = [];
    const now = Date.now();
    for (let i = 0; i < 100; i++) {
      entries.push(makeEntry({ ts: now - i * 1000, journalDurationMs: i + 1 }));
    }
    const r = evaluatePromotion(entries, makeReport({ total: 100, matched: 100, matchRatePct: 100 }));
    // 1..100 정렬 후 P95 = 95
    expect(r.metrics.p95JournalMs).toBe(95);
  });

  test('엔트리 1개 → observationHours=0', () => {
    const r = evaluatePromotion([makeEntry()], makeReport({ total: 1, matched: 1, matchRatePct: 100 }));
    expect(r.metrics.observationHours).toBe(0);
  });
});
