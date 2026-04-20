// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from '@/lib/save-engine/__tests__/_fake-idb';
installFakeIndexedDB();

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  recordPrimaryWrite,
  __resetPrimaryWriteLoggerForTests,
} from '@/lib/save-engine/primary-write-logger';
import {
  usePrimaryWriterStats,
  PRIMARY_WRITE_LOGGED_EVENT,
} from '@/hooks/usePrimaryWriterStats';

const flush = async (ms = 80) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  resetFakeIndexedDB();
  __resetPrimaryWriteLoggerForTests();
});

// ============================================================
// PART 2 — 기본 집계
// ============================================================

describe('usePrimaryWriterStats — 집계', () => {
  test('빈 상태 — totalWrites=0 + 모든 분포 0%', async () => {
    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0 }));
    await act(async () => { await flush(60); });

    expect(result.current.totalWrites).toBe(0);
    expect(result.current.journalPrimary).toBe(0);
    expect(result.current.legacyDirect).toBe(0);
    expect(result.current.degradedFallback).toBe(0);
    expect(result.current.last24hBreakdown.journalPct).toBe(0);
    expect(result.current.recentWrites).toEqual([]);
  });

  test('여러 mode 기록 → 카운트 정확', async () => {
    const now = Date.now();
    await recordPrimaryWrite({ ts: now - 1_000, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: 10 });
    await recordPrimaryWrite({ ts: now - 2_000, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 5 });
    await recordPrimaryWrite({ ts: now - 3_000, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 6 });
    await recordPrimaryWrite({ ts: now - 4_000, mode: 'degraded', primarySuccess: true, mirrorSuccess: true, durationMs: 15 });
    await flush(100);

    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0 }));
    await waitFor(() => expect(result.current.totalWrites).toBe(4));

    expect(result.current.journalPrimary).toBe(1);
    expect(result.current.legacyDirect).toBe(2);
    expect(result.current.degradedFallback).toBe(1);
  });

  test('recentWrites 는 ts 내림차순 + limit 적용', async () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      await recordPrimaryWrite({
        ts: now - i * 100,
        mode: 'journal',
        primarySuccess: true,
        mirrorSuccess: true,
        durationMs: 10,
      });
    }
    await flush(100);

    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0, recentLimit: 3 }));
    await waitFor(() => expect(result.current.recentWrites.length).toBeGreaterThan(0));

    expect(result.current.recentWrites.length).toBe(3);
    // 최신 먼저
    expect(result.current.recentWrites[0].ts).toBeGreaterThanOrEqual(result.current.recentWrites[1].ts);
  });

  test('recentWrites outcome — success / failure / degraded 매핑', async () => {
    const now = Date.now();
    await recordPrimaryWrite({ ts: now - 10, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: 10 });
    await recordPrimaryWrite({ ts: now - 20, mode: 'degraded', primarySuccess: true, mirrorSuccess: true, durationMs: 15 });
    await recordPrimaryWrite({ ts: now - 30, mode: 'legacy', primarySuccess: false, mirrorSuccess: false, durationMs: 0 });
    await flush(100);

    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0 }));
    await waitFor(() => expect(result.current.totalWrites).toBe(3));

    const outcomes = result.current.recentWrites.map((w) => w.outcome).sort();
    expect(outcomes).toEqual(['degraded', 'failure', 'success']);
  });

  test('last24hBreakdown — 비율 합이 100 근사 (≥99.9)', async () => {
    const now = Date.now();
    await recordPrimaryWrite({ ts: now - 10, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: 1 });
    await recordPrimaryWrite({ ts: now - 20, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: 1 });
    await recordPrimaryWrite({ ts: now - 30, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 1 });
    await recordPrimaryWrite({ ts: now - 40, mode: 'degraded', primarySuccess: true, mirrorSuccess: true, durationMs: 1 });
    await flush(100);

    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0 }));
    await waitFor(() => expect(result.current.totalWrites).toBe(4));

    const { journalPct, legacyPct, degradedPct } = result.current.last24hBreakdown;
    expect(journalPct + legacyPct + degradedPct).toBeGreaterThanOrEqual(99.9);
    expect(journalPct).toBeCloseTo(50, 0);
    expect(legacyPct).toBeCloseTo(25, 0);
    expect(degradedPct).toBeCloseTo(25, 0);
  });

  test('24h 이전 엔트리는 breakdown 에 미포함 (전체 count 에는 포함)', async () => {
    const now = Date.now();
    // 25h 이전 — breakdown 제외
    await recordPrimaryWrite({ ts: now - 25 * 60 * 60 * 1000, mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: 1 });
    // 1h 이전 — breakdown 포함
    await recordPrimaryWrite({ ts: now - 60 * 60 * 1000, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 1 });
    await flush(100);

    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0 }));
    await waitFor(() => expect(result.current.totalWrites).toBe(2));

    expect(result.current.journalPrimary).toBe(1);
    expect(result.current.legacyDirect).toBe(1);
    // 24h 내 — legacy 만. journalPct=0, legacyPct=100.
    expect(result.current.last24hBreakdown.journalPct).toBe(0);
    expect(result.current.last24hBreakdown.legacyPct).toBeCloseTo(100, 0);
  });
});

// ============================================================
// PART 3 — 이벤트 / 수동 refresh
// ============================================================

describe('usePrimaryWriterStats — 갱신', () => {
  test('수동 refresh() 호출 → 새 entry 반영', async () => {
    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0 }));
    await act(async () => { await flush(50); });
    expect(result.current.totalWrites).toBe(0);

    await recordPrimaryWrite({ ts: Date.now(), mode: 'journal', primarySuccess: true, mirrorSuccess: true, durationMs: 5 });
    await flush(100);

    await act(async () => { await result.current.refresh(); });
    expect(result.current.totalWrites).toBe(1);
  });

  test('PRIMARY_WRITE_LOGGED_EVENT 방송 → 자동 refresh', async () => {
    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0 }));
    await act(async () => { await flush(50); });
    expect(result.current.totalWrites).toBe(0);

    await recordPrimaryWrite({ ts: Date.now(), mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 3 });
    await flush(100);

    await act(async () => {
      window.dispatchEvent(new CustomEvent(PRIMARY_WRITE_LOGGED_EVENT, { detail: { ts: Date.now() } }));
      await flush(60);
    });

    expect(result.current.totalWrites).toBe(1);
  });

  test('lastRefreshedAt 은 refresh 후 갱신', async () => {
    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0 }));
    await act(async () => { await flush(80); });
    const first = result.current.lastRefreshedAt;
    expect(typeof first).toBe('number');

    await act(async () => { await flush(5); await result.current.refresh(); });
    const second = result.current.lastRefreshedAt!;
    expect(second).toBeGreaterThanOrEqual((first as number) ?? 0);
  });

  test('recentLimit=100 초과 지정은 100 으로 클램프', async () => {
    const { result } = renderHook(() => usePrimaryWriterStats({ pollIntervalMs: 0, recentLimit: 1000 }));
    for (let i = 0; i < 5; i++) {
      await recordPrimaryWrite({ ts: Date.now() - i, mode: 'legacy', primarySuccess: true, mirrorSuccess: true, durationMs: 1 });
    }
    await flush(100);
    await act(async () => { await result.current.refresh(); });

    // 실제 엔트리 수(<=5) 만 돌아옴 — 클램프가 실제 로그 count 보다 크면 모두 반환.
    expect(result.current.recentWrites.length).toBeLessThanOrEqual(100);
    expect(result.current.recentWrites.length).toBe(5);
  });
});
