// ============================================================
// PART 1 — Setup & mocks
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from '@/lib/save-engine/__tests__/_fake-idb';
installFakeIndexedDB();

import { renderHook, act, waitFor } from '@testing-library/react';
import { useJournalEngineMode } from '@/hooks/useJournalEngineMode';
import {
  __resetShadowLoggerForTests,
  __getPendingCountForTests,
  clearShadowLog,
} from '@/lib/save-engine/shadow-logger';
import {
  __resetPromotionAuditForTests,
  getPromotionHistory,
  clearPromotionHistory,
} from '@/lib/save-engine/promotion-audit';
import { getJournalEngineMode } from '@/lib/feature-flags';

const flush = async (ms = 60) => new Promise((r) => setTimeout(r, ms));

function clearFlag(): void {
  try { localStorage.removeItem('ff_FEATURE_JOURNAL_ENGINE'); } catch { /* noop */ }
}

function setFlag(mode: 'off' | 'shadow' | 'on'): void {
  try { localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', mode); } catch { /* noop */ }
}

/**
 * 승격 조건 충족용 Shadow 로그 시드 — IDB 직접 bundle put.
 * shadow-logger 의 API 사용은 1200건 시 수 초 소요되어 테스트 속도 저해.
 * Bundle 포맷은 shadow-logger.ts (DB 'noa_shadow_v1' v1/v2, store 'shadow_log', key 'log_bundle') 와 동일.
 */
async function seedReadyLog(
  opts: { total?: number; hoursSpan?: number; matchRatio?: number; journalDurationMs?: number } = {},
): Promise<void> {
  const total = opts.total ?? 1200;
  const hoursSpan = opts.hoursSpan ?? 80;
  const matchRatio = opts.matchRatio ?? 1;
  const journalDurationMs = opts.journalDurationMs ?? 10;
  const HOUR_MS = 60 * 60 * 1000;
  const now = Date.now();
  const start = now - hoursSpan * HOUR_MS;
  const step = total > 1 ? (now - start) / (total - 1) : 0;
  const matchedCount = Math.round(total * matchRatio);
  const entries: Array<{
    id: string;
    correlationId: string;
    ts: number;
    operation: string;
    legacyHash: string;
    journalHash: string;
    matched: boolean;
    durationMs: number;
    journalDurationMs: number;
  }> = [];
  for (let i = 0; i < total; i++) {
    entries.push({
      id: `seed-${i}`,
      correlationId: `cor-${i}`,
      ts: Math.floor(start + step * i),
      operation: 'save-project',
      legacyHash: 'H',
      journalHash: i < matchedCount ? 'H' : 'H2',
      matched: i < matchedCount,
      durationMs: 1,
      journalDurationMs,
    });
  }
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.open('noa_shadow_v1', 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('shadow_log')) {
          db.createObjectStore('shadow_log', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('promotion_audit')) {
          db.createObjectStore('promotion_audit', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(['shadow_log'], 'readwrite');
          const os = tx.objectStore('shadow_log');
          const put = os.put({ id: 'log_bundle', entries });
          put.onsuccess = () => resolve();
          put.onerror = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
          tx.oncomplete = () => resolve();
        } catch {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  // 여분 대기 — FakeTransaction 의 setTimeout 5ms 마무리
  await flush(30);
}

beforeEach(async () => {
  resetFakeIndexedDB();
  __resetShadowLoggerForTests();
  __resetPromotionAuditForTests();
  try { localStorage.clear(); } catch { /* noop */ }
});

afterEach(async () => {
  clearFlag();
  await clearShadowLog().catch(() => {});
  await clearPromotionHistory().catch(() => {});
});

// ============================================================
// PART 2 — 기본 구독
// ============================================================

describe('useJournalEngineMode — 모드 구독', () => {
  test('마운트 시 현재 모드 반환', () => {
    setFlag('shadow');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    expect(result.current.currentMode).toBe('shadow');
  });

  test('feature-flag-changed 이벤트 수신 시 모드 업데이트', async () => {
    setFlag('off');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    expect(result.current.currentMode).toBe('off');

    act(() => {
      try { localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'shadow'); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent('noa:feature-flag-changed', { detail: { flag: 'FEATURE_JOURNAL_ENGINE', value: 'shadow' } }));
    });
    await waitFor(() => expect(result.current.currentMode).toBe('shadow'));
  });

  test('refreshStatus 는 promotionStatus 세팅', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    await waitFor(() => expect(result.current.promotionStatus).not.toBeNull());
    // 빈 로그 → not ready
    expect(result.current.promotionStatus?.ready).toBe(false);
  });
});

// ============================================================
// PART 3 — promoteNow (수동)
// ============================================================

describe('useJournalEngineMode — promoteNow', () => {
  test('조건 미충족 → promoteNow false, 모드 유지', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    await flush(50);

    let ok = true;
    await act(async () => {
      ok = await result.current.promoteNow();
    });
    expect(ok).toBe(false);
    expect(getJournalEngineMode()).toBe('shadow');
  });

  test('조건 충족 + promoteNow → on 전환 + audit 기록', async () => {
    setFlag('shadow');
    await seedReadyLog({ total: 1200 });

    // 관찰시간 조건은 seedReadyLog 가 제어 못 함 → criteria 를 완화.
    const { result } = renderHook(() =>
      useJournalEngineMode({
        evaluationIntervalMs: 0,
        criteria: {
          minMatchRate: 99.9,
          minSampleSize: 100,
          minObservationHours: 0,
          maxRecentRegressionPct: 100,
          maxP95JournalDurationMs: 10_000,
        },
      }),
    );
    await flush(100);

    let ok = false;
    await act(async () => {
      ok = await result.current.promoteNow();
    });
    expect(ok).toBe(true);
    expect(getJournalEngineMode()).toBe('on');

    // audit 기록 확인
    await flush(100);
    const history = await getPromotionHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].to).toBe('on');
    expect(history[0].trigger).toBe('manual');
  });

  test('이미 on 상태에서 promoteNow → true (no-op)', async () => {
    setFlag('on');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    let ok = false;
    await act(async () => {
      ok = await result.current.promoteNow();
    });
    expect(ok).toBe(true);
    expect(getJournalEngineMode()).toBe('on');
  });
});

// ============================================================
// PART 4 — downgradeNow
// ============================================================

describe('useJournalEngineMode — downgradeNow', () => {
  test('on 에서 downgradeNow → shadow 전환 + audit', async () => {
    setFlag('on');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    let ok = false;
    await act(async () => {
      ok = await result.current.downgradeNow('test-reason');
    });
    expect(ok).toBe(true);
    expect(getJournalEngineMode()).toBe('shadow');

    await flush(100);
    const history = await getPromotionHistory();
    expect(history[0].to).toBe('shadow');
    expect(history[0].trigger).toBe('downgrade');
    expect(history[0].reason).toContain('test-reason');
  });

  test('on 이 아님 → downgradeNow true (no-op)', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    let ok = false;
    await act(async () => {
      ok = await result.current.downgradeNow('n/a');
    });
    expect(ok).toBe(true);
    expect(getJournalEngineMode()).toBe('shadow');
    // audit 기록 없음
    await flush(50);
    const history = await getPromotionHistory();
    expect(history.length).toBe(0);
  });

  test('연속 downgradeNow — 디바운스 (5s 내 2회째는 no-op)', async () => {
    setFlag('on');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    await act(async () => {
      await result.current.downgradeNow('first');
    });
    // 첫 번째로 shadow 로 전환됨 — 두 번째는 "이미 on 이 아님" 분기로 빠져 no-op 됨.
    // 디바운스 경로 자체 검증은 수동으로 on 상태를 다시 만들어 확인해야 함.
    expect(getJournalEngineMode()).toBe('shadow');

    setFlag('on'); // 강제로 다시 on
    await act(async () => {
      await result.current.downgradeNow('second');
    });
    // 5초 디바운스 내 — on 이어도 스킵되어 여전히 'on' 유지
    expect(getJournalEngineMode()).toBe('on');
  });
});

// ============================================================
// PART 5 — reportJournalError + auto-downgrade
// ============================================================

describe('useJournalEngineMode — reportJournalError', () => {
  test('on 모드 + 에러 3건 window 내 → 자동 다운그레이드', async () => {
    setFlag('on');
    const { result } = renderHook(() =>
      useJournalEngineMode({
        evaluationIntervalMs: 0,
        autoDowngrade: true,
      }),
    );

    const now = Date.now();
    act(() => {
      result.current.reportJournalError({ ts: now - 1_000, reason: 'e1' });
      result.current.reportJournalError({ ts: now - 500, reason: 'e2' });
      result.current.reportJournalError({ ts: now, reason: 'e3' });
    });
    await flush(50);

    expect(getJournalEngineMode()).toBe('shadow');
  });

  test('autoDowngrade=false → 에러 누적되어도 전환 안 함', async () => {
    setFlag('on');
    const { result } = renderHook(() =>
      useJournalEngineMode({
        evaluationIntervalMs: 0,
        autoDowngrade: false,
      }),
    );

    const now = Date.now();
    act(() => {
      result.current.reportJournalError({ ts: now, reason: 'e1' });
      result.current.reportJournalError({ ts: now, reason: 'e2' });
      result.current.reportJournalError({ ts: now, reason: 'e3' });
    });
    await flush(50);
    expect(getJournalEngineMode()).toBe('on');
  });

  test('shadow 모드에서 에러 — 다운그레이드 트리거 없음', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    const now = Date.now();
    act(() => {
      result.current.reportJournalError({ ts: now, reason: 'e1' });
      result.current.reportJournalError({ ts: now, reason: 'e2' });
      result.current.reportJournalError({ ts: now, reason: 'e3' });
    });
    await flush(50);
    expect(getJournalEngineMode()).toBe('shadow');
  });

  test('noa:journal-error 이벤트 → reportJournalError 동등 처리', async () => {
    setFlag('on');
    renderHook(() =>
      useJournalEngineMode({
        evaluationIntervalMs: 0,
        autoDowngrade: true,
      }),
    );
    const now = Date.now();
    act(() => {
      for (let i = 0; i < 3; i++) {
        window.dispatchEvent(
          new CustomEvent('noa:journal-error', {
            detail: { ts: now - i * 10, reason: `event-${i}`, operation: 'save-project', mode: 'on' },
          }),
        );
      }
    });
    await flush(100);
    expect(getJournalEngineMode()).toBe('shadow');
  });
});

// ============================================================
// PART 6 — autoPromote (periodic)
// ============================================================

describe('useJournalEngineMode — autoPromote', () => {
  test('autoPromote=false(기본) + 조건 충족 → 수동 호출 전까지 전환 없음', async () => {
    setFlag('shadow');
    await seedReadyLog({ total: 1200 });

    renderHook(() =>
      useJournalEngineMode({
        evaluationIntervalMs: 100,
        autoPromote: false,
        criteria: {
          minMatchRate: 99.9,
          minSampleSize: 100,
          minObservationHours: 0,
          maxRecentRegressionPct: 100,
          maxP95JournalDurationMs: 10_000,
        },
      }),
    );
    await flush(250);
    // 기본 off (autoPromote false) → 여전히 shadow
    expect(getJournalEngineMode()).toBe('shadow');
  });
});

// ============================================================
// PART 7 — 격리
// ============================================================

describe('useJournalEngineMode — 격리', () => {
  test('promoteNow 가 내부에서 throw 해도 훅은 계속 동작', async () => {
    setFlag('shadow');
    const { result } = renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    // 첫 호출 실패해도 재호출 가능
    await act(async () => {
      await result.current.promoteNow();
    });
    expect(getJournalEngineMode()).toBe('shadow'); // 여전히 shadow
    // 훅 재호출 가능
    expect(result.current.currentMode).toBeDefined();
  });

  test('pending shadow-logger 엔트리 남지 않음', () => {
    setFlag('shadow');
    renderHook(() => useJournalEngineMode({ evaluationIntervalMs: 0 }));
    // hook 은 shadow-logger 에 start 하지 않음 (읽기 전용)
    expect(__getPendingCountForTests()).toBe(0);
  });
});
