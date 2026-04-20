// ============================================================
// PART 1 — Mocks
// ============================================================

jest.mock('@/lib/save-engine/file-tier', () => ({
  backupNow: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import BackupNowButton from '../BackupNowButton';
import { backupNow } from '@/lib/save-engine/file-tier';

const mockedBackupNow = backupNow as jest.MockedFunction<typeof backupNow>;

beforeEach(() => {
  mockedBackupNow.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ============================================================
// PART 2 — Render + interaction
// ============================================================

describe('BackupNowButton', () => {
  test('B1: 기본 렌더 — 버튼 + 라벨 (KO)', () => {
    render(<BackupNowButton language="KO" projectId="p1" />);
    const btn = screen.getByTestId('backup-now-button');
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toMatch(/지금 백업/);
  });

  test('B2: compact 모드 → 라벨 텍스트 비노출 (아이콘만)', () => {
    render(<BackupNowButton language="EN" projectId="p1" compact />);
    const btn = screen.getByTestId('backup-now-button');
    // 텍스트 노드가 없거나 sr-only — span 자체가 없음
    expect(btn.textContent).toBe('');
    expect(btn.getAttribute('aria-label')).toMatch(/Backup now/);
  });

  test('B3: projectId null → 토스트 알림 + backupNow 호출 안 함', () => {
    const events: unknown[] = [];
    const handler = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('noa:alert', handler);

    render(<BackupNowButton language="JP" projectId={null} />);
    fireEvent.click(screen.getByTestId('backup-now-button'));
    window.removeEventListener('noa:alert', handler);

    expect(mockedBackupNow).not.toHaveBeenCalled();
    expect(events.length).toBe(1);
  });

  test('B4: 클릭 → busy 상태 → 성공 토스트', async () => {
    mockedBackupNow.mockResolvedValue({
      success: true,
      downloaded: true,
      mode: 'manual',
      filename: 'loreguard-backup-p1-20260419-120000.zip',
      sizeBytes: 4096,
    });

    const events: unknown[] = [];
    const handler = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('noa:alert', handler);

    render(<BackupNowButton language="CN" projectId="p1" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('backup-now-button'));
    });

    await waitFor(() => {
      expect(mockedBackupNow).toHaveBeenCalledWith('p1');
    });

    window.removeEventListener('noa:alert', handler);
    expect(events.some((e) => {
      const d = e as { message?: string };
      return d.message?.includes('p1');
    })).toBe(true);
  });

  test('B5: 실패 → 에러 토스트', async () => {
    mockedBackupNow.mockResolvedValue({
      success: false,
      downloaded: false,
      mode: 'skipped',
      filename: 'x.zip',
      sizeBytes: 0,
      error: 'disk-full',
    });

    const events: unknown[] = [];
    const handler = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('noa:alert', handler);

    render(<BackupNowButton language="EN" projectId="p1" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('backup-now-button'));
    });

    await waitFor(() => {
      expect(mockedBackupNow).toHaveBeenCalled();
    });
    window.removeEventListener('noa:alert', handler);
    expect(events.some((e) => {
      const d = e as { message?: string };
      return d.message?.includes('disk-full');
    })).toBe(true);
  });
});
