// ============================================================
// PART 1 — Setup & mocks
// ============================================================
//
// useRecovery 훅 — 부팅 시 복구 실행 + Dialog 표시 + 토스트 고지.
// runBootRecovery를 mock해서 결과별 동작을 검증.

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { RecoveryResult } from '@/lib/save-engine/recovery';
import {
  RecoveryProvider,
  useRecoveryContext,
} from '@/contexts/RecoveryContext';

// runBootRecovery 모킹 — 테스트별로 구현을 바꿔 다양한 결과 반환.
jest.mock('@/lib/save-engine/recovery', () => {
  const actual = jest.requireActual('@/lib/save-engine/recovery');
  return {
    ...actual,
    runBootRecovery: jest.fn(),
  };
});

import { runBootRecovery } from '@/lib/save-engine/recovery';
import { useRecovery } from '@/hooks/useRecovery';

const mockedRun = runBootRecovery as jest.MockedFunction<typeof runBootRecovery>;

// 기본 baseline RecoveryResult
function makeResult(over: Partial<RecoveryResult> = {}): RecoveryResult {
  return {
    projects: [],
    recoveredFromCrash: false,
    chainDamaged: false,
    quarantinedCount: 0,
    snapshotId: null,
    deltasReplayed: 0,
    durationMs: 10,
    environment: { indexedDB: true, localStorage: true },
    phases: [],
    strategy: 'full',
    recoveredUpTo: null,
    estimatedLossMs: 0,
    corruptedEntries: 0,
    fallbackSnapshotId: null,
    state: [],
    ...over,
  };
}

// Provider wrapper (onDecision 옵션으로 resolve 콜백 수집 가능)
function wrapper(onDecision?: jest.Mock) {
  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <RecoveryProvider onDecision={onDecision}>{children}</RecoveryProvider>
  );
  Wrap.displayName = 'TestRecoveryWrapper';
  return Wrap;
}

// 토스트 리스너 — noa:alert 이벤트 수집
function captureAlerts() {
  const alerts: Array<{ kind: string; text: string }> = [];
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<{ kind: string; text: string }>).detail;
    if (detail) alerts.push(detail);
  };
  window.addEventListener('noa:alert', listener);
  return {
    alerts,
    dispose: () => window.removeEventListener('noa:alert', listener),
  };
}

beforeEach(() => {
  mockedRun.mockReset();
});

// ============================================================
// PART 2 — 비활성 (enabled=false) 기본 동작
// ============================================================

describe('useRecovery — enabled=false', () => {
  test('enabled=false면 runBootRecovery 호출 안 함', () => {
    mockedRun.mockResolvedValue(makeResult());
    renderHook(() => useRecovery({ enabled: false }), { wrapper: wrapper() });
    expect(mockedRun).not.toHaveBeenCalled();
  });

  test('enabled 기본값은 false', () => {
    mockedRun.mockResolvedValue(makeResult());
    renderHook(() => useRecovery(), { wrapper: wrapper() });
    expect(mockedRun).not.toHaveBeenCalled();
  });
});

// ============================================================
// PART 3 — 정상 부팅 (first-launch / clean)
// ============================================================

describe('useRecovery — 정상 부팅', () => {
  test('enabled=true일 때 1회 실행 + bootComplete=true', async () => {
    mockedRun.mockResolvedValue(makeResult({ strategy: 'none' }));
    const { result } = renderHook(() => useRecovery({ enabled: true }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.bootComplete).toBe(true));
    expect(mockedRun).toHaveBeenCalledTimes(1);
  });

  test('최초 부팅은 dialogVisible=false', async () => {
    mockedRun.mockResolvedValue(makeResult({ strategy: 'none', recoveredFromCrash: false }));
    const { result } = renderHook(() => useRecovery({ enabled: true }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.bootComplete).toBe(true));
    expect(result.current.dialogVisible).toBe(false);
  });

  test('최초 부팅은 alert 토스트 없음', async () => {
    const cap = captureAlerts();
    mockedRun.mockResolvedValue(makeResult({ strategy: 'none' }));
    const { result } = renderHook(() => useRecovery({ enabled: true }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.bootComplete).toBe(true));
    expect(cap.alerts.length).toBe(0);
    cap.dispose();
  });
});

// ============================================================
// PART 4 — 크래시 복구 (recoveredFromCrash=true)
// ============================================================

describe('useRecovery — 크래시 복구', () => {
  test('recoveredFromCrash=true면 Dialog 자동 표시', async () => {
    mockedRun.mockResolvedValue(
      makeResult({
        recoveredFromCrash: true,
        strategy: 'full',
        recoveredUpTo: Date.now() - 60_000,
      }),
    );
    const { result } = renderHook(() => useRecovery({ enabled: true }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.bootComplete).toBe(true));
    expect(result.current.dialogVisible).toBe(true);
  });

  test('recoveredFromCrash=true면 success 토스트 발행', async () => {
    const cap = captureAlerts();
    mockedRun.mockResolvedValue(
      makeResult({
        recoveredFromCrash: true,
        strategy: 'full',
        recoveredUpTo: Date.now() - 2 * 60_000,
      }),
    );
    const { result } = renderHook(() => useRecovery({ enabled: true, language: 'ko' }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.bootComplete).toBe(true));
    expect(cap.alerts.some((a) => a.kind === 'success')).toBe(true);
    cap.dispose();
  });
});

// ============================================================
// PART 5 — 손상 감지 (chainDamaged)
// ============================================================

describe('useRecovery — 부분 손실', () => {
  test('chainDamaged=true면 warn 토스트 + Dialog 표시', async () => {
    const cap = captureAlerts();
    mockedRun.mockResolvedValue(
      makeResult({
        recoveredFromCrash: true,
        chainDamaged: true,
        strategy: 'degraded',
        quarantinedCount: 3,
        corruptedEntries: 3,
        estimatedLossMs: 5 * 60_000,
      }),
    );
    const { result } = renderHook(() => useRecovery({ enabled: true, language: 'en' }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.bootComplete).toBe(true));
    expect(result.current.dialogVisible).toBe(true);
    expect(cap.alerts.some((a) => a.kind === 'warn')).toBe(true);
    cap.dispose();
  });
});

// ============================================================
// PART 6 — 복구 실패
// ============================================================

describe('useRecovery — 복구 실패', () => {
  test('runBootRecovery가 throw하면 error 토스트 + bootComplete=true', async () => {
    const cap = captureAlerts();
    mockedRun.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRecovery({ enabled: true }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.bootComplete).toBe(true));
    expect(cap.alerts.some((a) => a.kind === 'error')).toBe(true);
    expect(result.current.result).toBeNull();
    cap.dispose();
  });
});

// ============================================================
// PART 7 — 수동 실행 & Provider 없음
// ============================================================

describe('useRecovery — 수동 실행', () => {
  test('runBootRecoveryManually로 직접 호출 가능', async () => {
    mockedRun.mockResolvedValue(makeResult({ strategy: 'full' }));
    const { result } = renderHook(() => useRecovery({ enabled: false }), {
      wrapper: wrapper(),
    });
    let outcome: RecoveryResult | null = null;
    await act(async () => {
      outcome = await result.current.runBootRecoveryManually();
    });
    expect(outcome).not.toBeNull();
    expect(mockedRun).toHaveBeenCalledTimes(1);
  });

  test('onResult 콜백 호출 — 훅 소유자 알림', async () => {
    const seen: RecoveryResult[] = [];
    mockedRun.mockResolvedValue(makeResult({ strategy: 'full' }));
    renderHook(() => useRecovery({ enabled: true, onResult: (r) => seen.push(r) }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(seen.length).toBe(1));
  });
});

// ============================================================
// PART 8 — Context 연동 (resolve)
// ============================================================

describe('useRecovery + RecoveryContext — resolve 연동', () => {
  test('Dialog 표시 후 resolve("restore") 호출 시 onDecision 실행', async () => {
    const onDecision = jest.fn();
    mockedRun.mockResolvedValue(
      makeResult({ recoveredFromCrash: true, strategy: 'full' }),
    );
    const { result } = renderHook(
      () => ({
        rec: useRecovery({ enabled: true }),
        ctx: useRecoveryContext(),
      }),
      { wrapper: wrapper(onDecision) },
    );
    await waitFor(() => expect(result.current.rec.dialogVisible).toBe(true));
    act(() => {
      result.current.ctx.resolve('restore');
    });
    expect(onDecision).toHaveBeenCalledWith('restore', expect.objectContaining({ strategy: 'full' }));
    expect(result.current.ctx.visible).toBe(false);
  });
});
