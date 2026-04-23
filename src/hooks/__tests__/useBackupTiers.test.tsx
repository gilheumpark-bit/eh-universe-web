// ============================================================
// PART 1 — Mocks
// ============================================================

jest.mock('@/lib/save-engine/file-tier', () => ({
  backupNow: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useBackupTiers } from '../useBackupTiers';
import {
  getDefaultBackupOrchestrator,
  resetDefaultBackupOrchestratorForTests,
} from '@/lib/save-engine/backup-tiers';
import { backupNow } from '@/lib/save-engine/file-tier';

const mockedBackupNow = backupNow as jest.MockedFunction<typeof backupNow>;

beforeEach(() => {
  resetDefaultBackupOrchestratorForTests();
  mockedBackupNow.mockReset();
  localStorage.clear();
});

afterEach(() => {
  resetDefaultBackupOrchestratorForTests();
});

// ============================================================
// PART 2 — statuses + getTier
// ============================================================

describe('useBackupTiers', () => {
  test('UH1: 초기 statuses — 3 Tier 모두 disabled', () => {
    const { result } = renderHook(() => useBackupTiers());
    expect(result.current.statuses.length).toBe(3);
    expect(result.current.statuses.every((s) => s.state === 'disabled')).toBe(true);
  });

  test('UH2: setTierEnabled → orchestrator 반영', () => {
    const orch = getDefaultBackupOrchestrator();
    orch.registerTier('secondary', async () => { /* ok */ });

    const { result } = renderHook(() => useBackupTiers());
    act(() => {
      result.current.setTierEnabled('secondary', true);
    });
    expect(orch.getStatus('secondary')?.state).toBe('healthy');
  });

  test('UH3: retryTier → executeTier 호출', async () => {
    let calls = 0;
    const orch = getDefaultBackupOrchestrator();
    orch.registerTier('tertiary', async () => { calls++; });
    orch.setEnabled('tertiary', true);

    const { result } = renderHook(() => useBackupTiers());
    await act(async () => {
      await result.current.retryTier('tertiary');
    });
    expect(calls).toBe(1);
  });

  test('UH4: setIntervalMin → localStorage 영속', () => {
    const { result } = renderHook(() => useBackupTiers());
    act(() => {
      result.current.setIntervalMin(15);
    });
    expect(result.current.intervalMin).toBe(15);
    expect(localStorage.getItem('noa_backup_interval_min')).toBe('15');
  });

  test('UH5: backupNow → file-tier.backupNow 위임', async () => {
    mockedBackupNow.mockResolvedValue({
      success: true,
      downloaded: true,
      mode: 'manual',
      filename: 'x.zip',
      sizeBytes: 100,
    });

    const { result } = renderHook(() => useBackupTiers());
    let returned: { success: boolean; filename?: string } | null = null;
    await act(async () => {
      returned = await result.current.backupNow('proj-1');
    });
    expect(mockedBackupNow).toHaveBeenCalledWith('proj-1');
    expect(returned!.success).toBe(true);
    expect(returned!.filename).toBe('x.zip');
  });
});
