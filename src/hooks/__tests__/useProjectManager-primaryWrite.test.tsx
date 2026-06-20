// ============================================================
// PART 1 — Setup & mocks
// ============================================================
//
// [M1.5.5] useProjectManager 옵셔널 primaryWriteFn 검증.
//
// 역호환 축 (핵심):
//   1) primaryWriteFn 미주입 → 기존 saveProjects 직접 호출 (M1.5.2 경로 불변)
//   2) primaryWriteFn 주입  → saveProjects 직접 호출 0, primaryWriteFn 만 호출
//   3) primaryWriteFn 내부 legacy fallback 성공 시 onSaveComplete 콜백 여전히 호출
//   4) primaryWriteFn throw → 훅이 saveProjects 로 복귀 (Primary 유지 계약)
//   5) primarySuccess=false → onSaveComplete 미호출 (M1.5.2 규약 유지)

import { act, renderHook } from '@testing-library/react';
import { useProjectManager } from '@/hooks/useProjectManager';
import type { PrimaryWriteFn } from '@/hooks/useProjectManager';

// saveProjects 모킹 — 실제 localStorage 쓰기 회피 + 호출 카운트 추적.
jest.mock('@/lib/project-migration', () => {
  const actual = jest.requireActual('@/lib/project-migration');
  return {
    ...actual,
    saveProjects: jest.fn(() => true),
    loadProjects: jest.fn(() => []),
    getStorageUsageBytes: jest.fn(() => 0),
  };
});

import { saveProjects } from '@/lib/project-migration';
const mockedSave = saveProjects as jest.MockedFunction<typeof saveProjects>;

beforeEach(() => {
  mockedSave.mockClear();
  mockedSave.mockImplementation(() => true);
  jest.useFakeTimers();
  try { localStorage.clear(); } catch { /* noop */ }
});

afterEach(() => {
  jest.useRealTimers();
});

// ============================================================
// PART 2 — 역호환 (primaryWriteFn 미주입)
// ============================================================

describe('useProjectManager — primaryWriteFn 미주입 (역호환)', () => {
  test('미주입 → saveProjects 직접 호출 (기존 M1.5.2 경로와 동일)', async () => {
    const { result } = renderHook(() => useProjectManager('KO'));
    await act(async () => { result.current.createNewProject(); });
    await act(async () => { jest.advanceTimersByTime(600); });

    expect(mockedSave).toHaveBeenCalled();
    // primaryWriteFn 미주입 케이스 → saveProjects 가 1회 이상 호출됨
    expect(mockedSave.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test('미주입 + onSaveComplete 주입 → M1.5.2 콜백 시나리오 그대로', async () => {
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useProjectManager('KO', null, { onSaveComplete: cb }),
    );
    await act(async () => { result.current.createNewProject(); });
    await act(async () => { jest.advanceTimersByTime(600); });

    expect(mockedSave).toHaveBeenCalled();
    expect(cb).toHaveBeenCalled();
  });
});

// ============================================================
// PART 3 — primaryWriteFn 주입 경로
// ============================================================

describe('useProjectManager — primaryWriteFn 주입', () => {
  test('주입 → saveProjects 직접 호출 대신 primaryWriteFn 만 호출', async () => {
    const primaryWriteFn: PrimaryWriteFn = jest.fn(async () => ({
      mode: 'journal' as const,
      primarySuccess: true,
      mirrorSuccess: true,
      journalEntryId: 'j-1',
      durationMs: 5,
    }));

    const { result } = renderHook(() =>
      useProjectManager('KO', null, { primaryWriteFn }),
    );

    await act(async () => { result.current.createNewProject(); });
    await act(async () => {
      jest.advanceTimersByTime(600);
      // primaryWriteFn 은 async — runAllTicks 로 microtask flush
      await Promise.resolve();
      await Promise.resolve();
    });

    // primaryWriteFn 호출됨
    expect(primaryWriteFn).toHaveBeenCalled();
    // saveProjects 는 훅 내부에서 호출되지 않음 (mirror 는 primaryWriteFn 내부 책임)
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('primarySuccess=true → onSaveComplete 호출', async () => {
    const cb = jest.fn();
    const primaryWriteFn: PrimaryWriteFn = jest.fn(async () => ({
      mode: 'journal' as const,
      primarySuccess: true,
      mirrorSuccess: true,
      journalEntryId: 'j-2',
      durationMs: 7,
    }));

    const { result } = renderHook(() =>
      useProjectManager('KO', null, { onSaveComplete: cb, primaryWriteFn }),
    );

    await act(async () => { result.current.createNewProject(); });
    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(cb).toHaveBeenCalled();
    const args = cb.mock.calls[cb.mock.calls.length - 1];
    expect(Array.isArray(args[0])).toBe(true);
    expect(typeof args[1]).toBe('number');
  });

  test('primarySuccess=false → onSaveComplete 미호출', async () => {
    const cb = jest.fn();
    const primaryWriteFn: PrimaryWriteFn = jest.fn(async () => ({
      mode: 'degraded' as const,
      primarySuccess: false,
      mirrorSuccess: false,
      durationMs: 3,
    }));

    const { result } = renderHook(() =>
      useProjectManager('KO', null, { onSaveComplete: cb, primaryWriteFn }),
    );

    await act(async () => { result.current.createNewProject(); });
    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(primaryWriteFn).toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();
  });

  test('primaryWriteFn throw → saveProjects 로 fallback (Primary 유지 계약)', async () => {
    const primaryWriteFn: PrimaryWriteFn = jest.fn(async () => {
      throw new Error('primary-writer-contract-break');
    });

    const { result } = renderHook(() =>
      useProjectManager('KO', null, { primaryWriteFn }),
    );

    await act(async () => { result.current.createNewProject(); });
    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });

    // primaryWriteFn 호출 + throw → 훅이 saveProjects 로 복귀
    expect(primaryWriteFn).toHaveBeenCalled();
    expect(mockedSave).toHaveBeenCalled();
  });
});

// IDENTITY_SEAL: PART-1..3 | role=pm-primary-write-tests | inputs=options.primaryWriteFn | outputs=call sequence
