/**
 * Tests for useStudioSync hook.
 * Covers: sync flow, 401 retry, error states, sync reminder.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { useStudioSync } from '@/hooks/useStudioSync';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/services/driveService', () => ({
  syncAllProjects: jest.fn(),
}));

import { syncAllProjects } from '@/services/driveService';
const mockSyncAll = syncAllProjects as jest.MockedFunction<typeof syncAllProjects>;

// ============================================================
// PART 1 — Test Harness
// ============================================================

type HookReturn = ReturnType<typeof useStudioSync>;

function createHarness(overrides: {
  user?: any;
  accessToken?: string | null;
  refreshAccessToken?: jest.Mock;
} = {}) {
  const params = {
    user: overrides.user ?? { uid: 'u1' },
    accessToken: 'accessToken' in overrides ? overrides.accessToken : 'token-123',
    refreshAccessToken: overrides.refreshAccessToken ?? jest.fn().mockResolvedValue('new-token'),
    projects: [{ id: 'p1', name: 'Project 1' }] as any[],
    setProjects: jest.fn(),
    setUxError: jest.fn(),
  } as any;

  const ref: { current: HookReturn | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    const hook = useStudioSync(params);
    React.useEffect(() => { ref.current = hook; });
    return null;
  }

  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(TestComponent));
  });

  return {
    get: () => ref.current!,
    params,
    cleanup: () => {
      act(() => { root.unmount(); });
      document.body.removeChild(container);
    },
  };
}

// ============================================================
// PART 2 — Tests
// ============================================================

describe('useStudioSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with idle sync status', () => {
    const { get, cleanup } = createHarness();
    expect(get().syncStatus).toBe('idle');
    expect(get().lastSyncTime).toBeNull();
    expect(get().showSyncReminder).toBe(false);
    cleanup();
  });

  it('handleSync sets syncing status and calls syncAllProjects', async () => {
    mockSyncAll.mockResolvedValue({ merged: [], failedCount: 0 });

    const { get, params, cleanup } = createHarness();

    await act(async () => { await get().handleSync(); });

    expect(mockSyncAll).toHaveBeenCalledWith('token-123', params.projects);
    expect(params.setProjects).toHaveBeenCalledWith([]);
    expect(get().lastSyncTime).not.toBeNull();
    cleanup();
  });

  it('reports partial failures via setUxError', async () => {
    mockSyncAll.mockResolvedValue({ merged: [], failedCount: 2 });

    const { get, params, cleanup } = createHarness();

    await act(async () => { await get().handleSync(); });

    expect(params.setUxError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining('2 file(s) failed'),
        }),
      }),
    );
    cleanup();
  });

  it('refreshes token when accessToken is null', async () => {
    mockSyncAll.mockResolvedValue({ merged: [], failedCount: 0 } as any);

    const { get, params, cleanup } = createHarness({ accessToken: null });

    await act(async () => { await get().handleSync(); });

    expect(params.refreshAccessToken).toHaveBeenCalled();
    expect(mockSyncAll).toHaveBeenCalledWith('new-token', params.projects);
    cleanup();
  });

  it('aborts sync when no token is available', async () => {
    const { get, params, cleanup } = createHarness({
      accessToken: null,
      refreshAccessToken: jest.fn().mockResolvedValue(null),
    });

    await act(async () => { await get().handleSync(); });

    expect(mockSyncAll).not.toHaveBeenCalled();
    cleanup();
  });

  it('retries on 401 error with refreshed token', async () => {
    mockSyncAll
      .mockRejectedValueOnce(new Error('401 Unauthorized'))
      .mockResolvedValueOnce({ merged: [{ id: 'p1' }], failedCount: 0 });

    const { get, params, cleanup } = createHarness();

    await act(async () => { await get().handleSync(); });

    expect(params.refreshAccessToken).toHaveBeenCalled();
    expect(mockSyncAll).toHaveBeenCalledTimes(2);
    expect(params.setProjects).toHaveBeenCalledWith([{ id: 'p1' }]);
    cleanup();
  });

  it('sets error status on non-401 failure', async () => {
    mockSyncAll.mockRejectedValue(new Error('Network error'));

    const { get, cleanup } = createHarness();

    await act(async () => { await get().handleSync(); });

    // syncStatus transitions to 'error' then back to 'idle' after 5s
    expect(get().syncStatus).toBe('error');

    act(() => { jest.advanceTimersByTime(5000); });
    expect(get().syncStatus).toBe('idle');
    cleanup();
  });

  it('sync reminder controls', () => {
    const { get, cleanup } = createHarness();

    act(() => { get().setShowSyncReminder(true); });
    expect(get().showSyncReminder).toBe(true);

    act(() => { get().setShowSyncReminder(false); });
    expect(get().showSyncReminder).toBe(false);
    cleanup();
  });
});
