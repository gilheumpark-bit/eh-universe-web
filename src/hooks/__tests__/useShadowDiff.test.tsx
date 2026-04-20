// ============================================================
// PART 1 — Mocks + Setup
// ============================================================

jest.mock('@/lib/save-engine/shadow-logger', () => ({
  getShadowLog: jest.fn(),
  clearShadowLog: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useShadowDiff } from '../useShadowDiff';
import { getShadowLog, clearShadowLog } from '@/lib/save-engine/shadow-logger';

const mockedGet = getShadowLog as jest.MockedFunction<typeof getShadowLog>;
const mockedClear = clearShadowLog as jest.MockedFunction<typeof clearShadowLog>;

function makeEntry(partial: { matched?: boolean; operation?: 'save-project' | 'save-manuscript' } = {}) {
  return {
    id: `id-${Math.random()}`,
    correlationId: `cor-${Math.random()}`,
    ts: Date.now(),
    operation: (partial.operation ?? 'save-project') as 'save-project' | 'save-manuscript',
    legacyHash: 'A',
    journalHash: partial.matched === false ? 'B' : 'A',
    matched: partial.matched ?? true,
    durationMs: 5,
    journalDurationMs: 5,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedClear.mockReset();
});

// ============================================================
// PART 2 — 초기 로드
// ============================================================

describe('useShadowDiff', () => {
  test('UD1: 마운트 시 getShadowLog 호출 + report 세팅', async () => {
    mockedGet.mockResolvedValue([makeEntry(), makeEntry({ matched: false })]);

    const { result } = renderHook(() => useShadowDiff({ refreshIntervalMs: 0 }));

    await waitFor(() => expect(result.current.report).not.toBeNull());
    expect(result.current.report?.total).toBe(2);
    expect(result.current.report?.matched).toBe(1);
    expect(result.current.report?.matchRatePct).toBe(50);
  });

  test('UD2: readiness도 함께 산출', async () => {
    mockedGet.mockResolvedValue([]);

    const { result } = renderHook(() => useShadowDiff({ refreshIntervalMs: 0 }));

    await waitFor(() => expect(result.current.readiness).not.toBeNull());
    // 표본 부족이므로 ready=false
    expect(result.current.readiness?.ready).toBe(false);
  });

  test('UD3: refresh 수동 호출', async () => {
    mockedGet.mockResolvedValue([]);
    const { result } = renderHook(() => useShadowDiff({ refreshIntervalMs: 0 }));
    await waitFor(() => expect(result.current.report).not.toBeNull());
    mockedGet.mockClear();

    await act(async () => {
      await result.current.refresh();
    });
    expect(mockedGet).toHaveBeenCalled();
  });

  test('UD4: clear → clearShadowLog + 재조회', async () => {
    mockedGet.mockResolvedValue([makeEntry()]);
    mockedClear.mockResolvedValue();

    const { result } = renderHook(() => useShadowDiff({ refreshIntervalMs: 0 }));
    await waitFor(() => expect(result.current.report).not.toBeNull());
    mockedGet.mockClear();

    await act(async () => {
      await result.current.clear();
    });
    expect(mockedClear).toHaveBeenCalled();
    // clear 후 refresh 호출됨
    expect(mockedGet).toHaveBeenCalled();
  });

  test('UD5: getShadowLog throw → report null (isolated)', async () => {
    mockedGet.mockRejectedValue(new Error('IDB failure'));

    const { result } = renderHook(() => useShadowDiff({ refreshIntervalMs: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // 실패해도 렌더는 유지 (null report)
    expect(result.current.report).toBeNull();
  });
});
