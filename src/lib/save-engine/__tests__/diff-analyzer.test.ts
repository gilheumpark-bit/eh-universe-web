// ============================================================
// PART 1 — Fixtures
// ============================================================

import {
  analyzeShadowLog,
  isReadyForOnPromotion,
  getUnmatchedOperations,
} from '../diff-analyzer';
import type { ShadowLogEntry, ShadowOperation } from '../shadow-logger';

function makeEntry(partial: Partial<ShadowLogEntry> & { operation?: ShadowOperation; matched?: boolean }): ShadowLogEntry {
  return {
    id: partial.id ?? `id-${Math.random()}`,
    correlationId: partial.correlationId ?? `cor-${Math.random()}`,
    ts: partial.ts ?? Date.now(),
    operation: partial.operation ?? 'save-project',
    legacyHash: partial.legacyHash ?? 'A',
    journalHash: partial.journalHash ?? 'A',
    matched: partial.matched ?? true,
    diffSummary: partial.diffSummary,
    durationMs: partial.durationMs ?? 10,
    journalDurationMs: partial.journalDurationMs ?? 10,
  };
}

// ============================================================
// PART 2 — analyzeShadowLog
// ============================================================

describe('analyzeShadowLog', () => {
  test('빈 로그 → 기본 리포트 (matchRate=100)', () => {
    const r = analyzeShadowLog([]);
    expect(r.total).toBe(0);
    expect(r.matchRatePct).toBe(100);
    expect(r.byOperation).toEqual([]);
    expect(r.topDiffPatterns).toEqual([]);
    expect(r.recent1hMatchRatePct).toBeNull();
    expect(r.recent24hMatchRatePct).toBeNull();
  });

  test('전체 일치 → 100%', () => {
    const entries = [
      makeEntry({ matched: true }),
      makeEntry({ matched: true }),
      makeEntry({ matched: true }),
    ];
    const r = analyzeShadowLog(entries);
    expect(r.total).toBe(3);
    expect(r.matched).toBe(3);
    expect(r.matchRatePct).toBe(100);
  });

  test('일부 불일치 → 정확한 % 계산', () => {
    const entries = [
      makeEntry({ matched: true }),
      makeEntry({ matched: true }),
      makeEntry({ matched: true }),
      makeEntry({ matched: false, legacyHash: 'X', journalHash: 'Y' }),
    ];
    const r = analyzeShadowLog(entries);
    expect(r.total).toBe(4);
    expect(r.matched).toBe(3);
    expect(r.unmatched).toBe(1);
    expect(r.matchRatePct).toBe(75);
  });

  test('operation별 집계', () => {
    const entries = [
      makeEntry({ operation: 'save-project', matched: true }),
      makeEntry({ operation: 'save-project', matched: false }),
      makeEntry({ operation: 'save-manuscript', matched: true }),
      makeEntry({ operation: 'save-manuscript', matched: true }),
    ];
    const r = analyzeShadowLog(entries);
    const proj = r.byOperation.find((o) => o.operation === 'save-project');
    const man = r.byOperation.find((o) => o.operation === 'save-manuscript');
    expect(proj?.total).toBe(2);
    expect(proj?.unmatched).toBe(1);
    expect(proj?.matchRatePct).toBe(50);
    expect(man?.total).toBe(2);
    expect(man?.matchRatePct).toBe(100);
  });

  test('byOperation 정렬 — 낮은 일치율 먼저', () => {
    const entries = [
      makeEntry({ operation: 'save-project', matched: true }),
      makeEntry({ operation: 'save-project', matched: true }),
      makeEntry({ operation: 'save-manuscript', matched: false }),
      makeEntry({ operation: 'save-manuscript', matched: false }),
    ];
    const r = analyzeShadowLog(entries);
    expect(r.byOperation[0].operation).toBe('save-manuscript'); // 0%가 먼저
  });

  test('recent1h / recent24h 분리 계산', () => {
    const now = Date.now();
    const entries = [
      makeEntry({ ts: now - 30 * 60 * 1000, matched: true }),       // 30분 전
      makeEntry({ ts: now - 30 * 60 * 1000, matched: false }),      // 30분 전
      makeEntry({ ts: now - 12 * 60 * 60 * 1000, matched: true }),  // 12시간 전
      makeEntry({ ts: now - 48 * 60 * 60 * 1000, matched: true }),  // 48시간 전 (window 밖)
    ];
    const r = analyzeShadowLog(entries);
    expect(r.recent1hMatchRatePct).toBe(50); // 2중 1
    expect(r.recent24hMatchRatePct).toBeCloseTo((2 / 3) * 100, 2);
  });

  test('topDiffPatterns — 상위 5 필드 빈도', () => {
    const entries = [
      makeEntry({ matched: false, diffSummary: 'title:"a"≠"b" | text:"x"≠"y"' }),
      makeEntry({ matched: false, diffSummary: 'title:"c"≠"d"' }),
      makeEntry({ matched: false, diffSummary: 'text:"e"≠"f"' }),
    ];
    const r = analyzeShadowLog(entries);
    expect(r.topDiffPatterns.length).toBeGreaterThan(0);
    const titleCount = r.topDiffPatterns.find((p) => p.pattern === 'title')?.count ?? 0;
    const textCount = r.topDiffPatterns.find((p) => p.pattern === 'text')?.count ?? 0;
    expect(titleCount).toBe(2);
    expect(textCount).toBe(2);
  });

  test('hash-only diff는 패턴 추출 안 함', () => {
    const entries = [
      makeEntry({ matched: false, diffSummary: 'hash-only' }),
      makeEntry({ matched: false, diffSummary: 'diff-unknown' }),
    ];
    const r = analyzeShadowLog(entries);
    expect(r.topDiffPatterns.length).toBe(0);
  });
});

// ============================================================
// PART 3 — isReadyForOnPromotion
// ============================================================

describe('isReadyForOnPromotion', () => {
  function rep(over: { total?: number; matchRatePct?: number; recent1hMatchRatePct?: number | null }) {
    return {
      total: over.total ?? 100,
      matched: 99,
      unmatched: 1,
      matchRatePct: over.matchRatePct ?? 99,
      byOperation: [],
      recent1hMatchRatePct: over.recent1hMatchRatePct ?? null,
      recent24hMatchRatePct: null,
      topDiffPatterns: [],
      generatedAt: Date.now(),
    };
  }

  test('표본 부족 → not ready', () => {
    const r = isReadyForOnPromotion(rep({ total: 50, matchRatePct: 100 }));
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/표본|sample/i);
  });

  test('표본 충분 + 99.9%+ → ready', () => {
    const r = isReadyForOnPromotion(rep({ total: 100, matchRatePct: 99.95 }));
    expect(r.ready).toBe(true);
  });

  test('표본 충분 but 일치율 부족 → not ready', () => {
    const r = isReadyForOnPromotion(rep({ total: 200, matchRatePct: 95 }));
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/일치율|Match rate|matchRate|전체/);
  });

  test('최근 1h 회귀 → not ready', () => {
    const r = isReadyForOnPromotion(
      rep({ total: 500, matchRatePct: 100, recent1hMatchRatePct: 90 }),
    );
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/1h|회귀|regress/i);
  });

  test('custom threshold 적용', () => {
    const r = isReadyForOnPromotion(rep({ total: 200, matchRatePct: 99.5 }), 99);
    expect(r.ready).toBe(true);
  });
});

// ============================================================
// PART 4 — getUnmatchedOperations
// ============================================================

describe('getUnmatchedOperations', () => {
  test('빈 입력 → []', () => {
    expect(getUnmatchedOperations([])).toEqual([]);
  });

  test('topN 제한', () => {
    const entries: ShadowLogEntry[] = [];
    // 5 operations 각각 1개 불일치
    const ops: ShadowOperation[] = [
      'save-project', 'save-manuscript', 'save-scene-direction',
      'save-config', 'save-session',
    ];
    for (const op of ops) {
      entries.push(makeEntry({ operation: op, matched: false }));
    }
    const top3 = getUnmatchedOperations(entries, 3);
    expect(top3.length).toBe(3);
  });

  test('일치만 있는 operation 제외 (unmatched=0)', () => {
    const entries = [
      makeEntry({ operation: 'save-project', matched: true }),
      makeEntry({ operation: 'save-manuscript', matched: false }),
    ];
    const un = getUnmatchedOperations(entries);
    expect(un.length).toBe(1);
    expect(un[0].operation).toBe('save-manuscript');
  });
});
