// ============================================================
// PART 1 — Setup
// ============================================================

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import BackupTiersView from '../BackupTiersView';
import {
  getDefaultBackupOrchestrator,
  resetDefaultBackupOrchestratorForTests,
} from '@/lib/save-engine/backup-tiers';

beforeEach(() => {
  resetDefaultBackupOrchestratorForTests();
});

afterEach(() => {
  resetDefaultBackupOrchestratorForTests();
});

// ============================================================
// PART 2 — Render
// ============================================================

describe('BackupTiersView', () => {
  test('BV1: 기본 렌더 — 3 Tier 행 노출', () => {
    render(<BackupTiersView language="KO" />);
    expect(screen.getByTestId('backup-tiers-view')).toBeInTheDocument();
    expect(screen.getByTestId('tier-row-primary')).toBeInTheDocument();
    expect(screen.getByTestId('tier-row-secondary')).toBeInTheDocument();
    expect(screen.getByTestId('tier-row-tertiary')).toBeInTheDocument();
  });

  test('BV2: KO 라벨 — Primary/Secondary/Tertiary 한국어 노출', () => {
    render(<BackupTiersView language="KO" />);
    const view = screen.getByTestId('backup-tiers-view');
    expect(view.textContent).toMatch(/Primary/);
    expect(view.textContent).toMatch(/Secondary/);
    expect(view.textContent).toMatch(/Tertiary/);
    expect(view.textContent).toMatch(/저장소|클라우드|파일/);
  });

  test('BV3: EN 라벨', () => {
    render(<BackupTiersView language="EN" />);
    const view = screen.getByTestId('backup-tiers-view');
    expect(view.textContent).toMatch(/Local|Cloud|File/);
  });

  test('BV4: onToggle prop → 토글 버튼 노출 + 호출', () => {
    const onToggle = jest.fn();
    // tier 활성화 후 disable 버튼 노출 확인
    const orch = getDefaultBackupOrchestrator();
    orch.registerTier('secondary', async () => { /* ok */ });
    orch.setEnabled('secondary', true);

    render(<BackupTiersView language="EN" onToggleTier={onToggle} />);
    const btn = screen.getByTestId('toggle-tier-secondary');
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledWith('secondary', false);
  });

  test('BV5: onRetry prop → 재시도 버튼 + 호출', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    const orch = getDefaultBackupOrchestrator();
    orch.registerTier('tertiary', async () => { /* ok */ });
    orch.setEnabled('tertiary', true);

    render(<BackupTiersView language="EN" onRetryTier={onRetry} />);
    const btn = screen.getByTestId('retry-tier-tertiary');
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(onRetry).toHaveBeenCalledWith('tertiary');
  });

  test('BV6: 상태 변경 시 자동 갱신 (orchestrator subscribe)', () => {
    const orch = getDefaultBackupOrchestrator();
    orch.registerTier('secondary', async () => { /* ok */ });

    render(<BackupTiersView language="KO" />);
    const before = screen.getByTestId('tier-row-secondary').textContent;
    expect(before).toMatch(/꺼짐/);

    act(() => {
      orch.setEnabled('secondary', true);
    });

    const after = screen.getByTestId('tier-row-secondary').textContent;
    expect(after).toMatch(/정상/);
  });
});
