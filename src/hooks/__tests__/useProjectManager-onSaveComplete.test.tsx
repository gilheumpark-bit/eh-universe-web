// ============================================================
// PART 1 — Setup
// ============================================================
//
// [M1.5.2] useProjectManager 옵셔널 onSaveComplete 콜백 검증.
// 기존 저장 로직(saveProjects)은 건드리지 않았음을 보장하기 위해
// callback 호출 시점/인자/격리 3가지만 확인한다.
//
// Primary 경로는 debounce 500ms + setTimeout. jest fake timers 로 즉시 trigger.

import { act, renderHook } from '@testing-library/react';
import { useProjectManager } from '@/hooks/useProjectManager';

// saveProjects 모킹 — 실제 localStorage 쓰기 회피하고 true/false 주입.
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
// PART 2 — 콜백 동작
// ============================================================

describe('useProjectManager — onSaveComplete 옵셔널 콜백', () => {
  test('옵션 미주입 시 기존 동작 100% 유지 — 아무 에러 없음', async () => {
    const { result } = renderHook(() => useProjectManager('KO'));
    // 기존 반환값 구조 불변 확인
    expect(typeof result.current.hydrated).toBe('boolean');
    expect(Array.isArray(result.current.projects)).toBe(true);
    // debounce 진행 — saveProjects 는 empty projects 에는 호출되지 않을 수도 있으나,
    // 훅이 throw 없이 렌더되는 것만 여기서 확인.
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
  });

  test('onSaveComplete — saveProjects 성공 시 (projects, durationMs) 인자로 호출', async () => {
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useProjectManager('KO', null, { onSaveComplete: cb }),
    );

    // createNewProject → projects 변경 → debounce 후 저장 → 콜백
    await act(async () => {
      result.current.createNewProject();
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(mockedSave).toHaveBeenCalled();
    expect(cb).toHaveBeenCalled();
    const args = cb.mock.calls[cb.mock.calls.length - 1];
    expect(Array.isArray(args[0])).toBe(true);
    expect(typeof args[1]).toBe('number');
    expect(args[1]).toBeGreaterThanOrEqual(0);
  });

  test('saveProjects 실패 (false) → 콜백 호출 안 함', async () => {
    mockedSave.mockImplementation(() => false);
    const cb = jest.fn();
    const { result } = renderHook(() =>
      useProjectManager('KO', null, { onSaveComplete: cb }),
    );
    await act(async () => {
      result.current.createNewProject();
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(mockedSave).toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();
  });

  test('콜백 throw → 저장 루프 영향 없음 (다음 저장 여전히 동작)', async () => {
    const cb = jest.fn(() => {
      throw new Error('callback explodes');
    });
    const { result } = renderHook(() =>
      useProjectManager('KO', null, { onSaveComplete: cb }),
    );
    await act(async () => {
      result.current.createNewProject();
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    // 다음 저장도 정상 수행
    mockedSave.mockClear();
    await act(async () => {
      result.current.createNewProject();
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(mockedSave).toHaveBeenCalled();
  });

  test('콜백 교체 (options 변경) → 최신 콜백이 호출됨 (ref 최신화)', async () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const { result, rerender } = renderHook(
      ({ cb }: { cb: (p: unknown, d: number) => void }) =>
        useProjectManager('KO', null, { onSaveComplete: cb }),
      { initialProps: { cb: cb1 } },
    );

    rerender({ cb: cb2 });

    await act(async () => {
      result.current.createNewProject();
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(cb2).toHaveBeenCalled();
    expect(cb1).not.toHaveBeenCalled();
  });
});

// IDENTITY_SEAL: PART-1..2 | role=pm-callback-tests | inputs=options.onSaveComplete | outputs=callback assertions
