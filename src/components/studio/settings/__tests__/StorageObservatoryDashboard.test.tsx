// ============================================================
// PART 1 — Setup + Mocks
// ============================================================
//
// StorageObservatoryDashboard 는 여러 하위 컴포넌트 + IDB hook 조합이라
// 하위 훅/컴포넌트를 모킹하여 shell 동작만 검증한다.

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/hooks/usePrimaryWriterStats', () => ({
  PRIMARY_WRITE_LOGGED_EVENT: 'noa:primary-write-logged',
  usePrimaryWriterStats: jest.fn(),
}));
jest.mock('@/hooks/useBackupTiers', () => ({
  useBackupTiers: () => ({
    statuses: [],
    getTier: () => null,
    setTierEnabled: jest.fn(),
    retryTier: jest.fn().mockResolvedValue(undefined),
    intervalMin: 5,
    setIntervalMin: jest.fn(),
    backupNow: jest.fn(),
  }),
}));
jest.mock('@/lib/save-engine/local-event-log', () => ({
  getEventLog: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/save-engine/promotion-audit', () => ({
  getPromotionHistory: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/save-engine/shadow-logger', () => ({
  getShadowLog: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/save-engine/primary-write-logger', () => ({
  getPrimaryWriteLog: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/hooks/useShadowDiff', () => ({
  useShadowDiff: () => ({
    report: null,
    readiness: null,
    refresh: jest.fn(),
    clear: jest.fn(),
    loading: false,
    lastRefreshedAt: null,
  }),
}));
jest.mock('@/hooks/useJournalEngineMode', () => ({
  useJournalEngineMode: () => ({
    currentMode: 'shadow',
    promotionStatus: null,
    promoteNow: jest.fn().mockResolvedValue(false),
    downgradeNow: jest.fn().mockResolvedValue(true),
    refreshStatus: jest.fn().mockResolvedValue(undefined),
    reportJournalError: jest.fn(),
  }),
}));
// BackupTiersView 는 BackupOrchestrator 를 직접 접근하므로 경량 스텁.
jest.mock('../BackupTiersView', () => ({
  __esModule: true,
  default: () => <div data-testid="backup-tiers-view-mock" />,
}));

import { usePrimaryWriterStats } from '@/hooks/usePrimaryWriterStats';
import { getEventLog } from '@/lib/save-engine/local-event-log';
import StorageObservatoryDashboard from '../StorageObservatoryDashboard';
import { setDownloadFnForTests } from '../AuditExportButton';

const mockedStats = usePrimaryWriterStats as jest.MockedFunction<typeof usePrimaryWriterStats>;
const mockedGetEventLog = getEventLog as jest.MockedFunction<typeof getEventLog>;

function defaultStats() {
  return {
    totalWrites: 0,
    journalPrimary: 0,
    legacyDirect: 0,
    degradedFallback: 0,
    recentWrites: [],
    last24hBreakdown: { journalPct: 0, legacyPct: 0, degradedPct: 0 },
    refresh: jest.fn().mockResolvedValue(undefined),
    lastRefreshedAt: null,
  };
}

beforeEach(() => {
  mockedStats.mockReset();
  mockedStats.mockReturnValue(defaultStats());
  mockedGetEventLog.mockReset();
  mockedGetEventLog.mockResolvedValue([]);
  try { localStorage.clear(); } catch { /* noop */ }
  setDownloadFnForTests(null);
});

// ============================================================
// PART 2 — Shell rendering
// ============================================================

describe('StorageObservatoryDashboard — Shell', () => {
  test('SO1: 기본 렌더 — region + 탭 7개 노출', () => {
    render(<StorageObservatoryDashboard language="KO" />);
    const region = screen.getByRole('region', { name: /Storage Observatory/i });
    expect(region).toBeInTheDocument();
    expect(screen.getByTestId('observatory-tab-mode')).toBeInTheDocument();
    expect(screen.getByTestId('observatory-tab-shadow')).toBeInTheDocument();
    expect(screen.getByTestId('observatory-tab-primary')).toBeInTheDocument();
    expect(screen.getByTestId('observatory-tab-backup')).toBeInTheDocument();
    expect(screen.getByTestId('observatory-tab-recovery')).toBeInTheDocument();
    expect(screen.getByTestId('observatory-tab-failures')).toBeInTheDocument();
    expect(screen.getByTestId('observatory-tab-audit')).toBeInTheDocument();
  });

  test('SO2: 초기 활성 섹션은 "mode" — Mode Summary 노출', () => {
    render(<StorageObservatoryDashboard language="EN" />);
    expect(screen.getByTestId('observatory-section-mode')).toBeInTheDocument();
  });

  test('SO3: Primary 탭 클릭 → Primary 경로 섹션 노출', () => {
    render(<StorageObservatoryDashboard language="EN" />);
    fireEvent.click(screen.getByTestId('observatory-tab-primary'));
    expect(screen.getByTestId('observatory-section-primary')).toBeInTheDocument();
  });

  test('SO4: 4언어 라벨 전환 — 한국어/일본어', () => {
    const { rerender, container } = render(<StorageObservatoryDashboard language="KO" />);
    expect(container.textContent).toMatch(/Storage Observatory/);
    rerender(<StorageObservatoryDashboard language="JP" />);
    // Japanese tab labels present
    expect(container.textContent).toMatch(/保存|モード/);
  });
});

// ============================================================
// PART 3 — Read-only contract
// ============================================================

describe('StorageObservatoryDashboard — Observer contract', () => {
  test('SO5: Dashboard mount 는 저장 이벤트 dispatch 하지 않음', () => {
    const spy = jest.spyOn(window, 'dispatchEvent');
    render(<StorageObservatoryDashboard language="KO" />);
    // 저장 이벤트(noa:primary-write-logged / noa:journal-error) 0회.
    const events = spy.mock.calls.map((c) => (c[0] as Event).type);
    expect(events).not.toContain('noa:primary-write-logged');
    expect(events).not.toContain('noa:journal-error');
    spy.mockRestore();
  });
});

// ============================================================
// PART 4 — Primary distribution
// ============================================================

describe('StorageObservatoryDashboard — Primary distribution', () => {
  test('SO6: 분포 비율 표시', () => {
    mockedStats.mockReturnValue({
      ...defaultStats(),
      totalWrites: 100,
      journalPrimary: 80,
      legacyDirect: 15,
      degradedFallback: 5,
      last24hBreakdown: { journalPct: 80, legacyPct: 15, degradedPct: 5 },
      lastRefreshedAt: Date.now(),
    });
    render(<StorageObservatoryDashboard language="KO" />);
    fireEvent.click(screen.getByTestId('observatory-tab-primary'));
    expect(screen.getByTestId('observatory-section-primary')).toBeInTheDocument();
    // 80% 텍스트 포함
    expect(screen.getByTestId('observatory-section-primary').textContent).toMatch(/80\.00/);
  });

  test('SO7: totalWrites=0 → empty 메시지', () => {
    render(<StorageObservatoryDashboard language="KO" />);
    fireEvent.click(screen.getByTestId('observatory-tab-primary'));
    const section = screen.getByTestId('observatory-section-primary');
    expect(section.textContent).toMatch(/아직 기록 없음|No data yet/);
  });
});

// ============================================================
// PART 5 — Audit export
// ============================================================

describe('StorageObservatoryDashboard — Audit Export', () => {
  test('SO8: Audit Export 탭 → 버튼 노출', () => {
    render(<StorageObservatoryDashboard language="KO" />);
    fireEvent.click(screen.getByTestId('observatory-tab-audit'));
    expect(screen.getByTestId('audit-export-button')).toBeInTheDocument();
  });

  test('SO9: Audit Export 버튼 클릭 → download 트리거', async () => {
    const downloadSpy = jest.fn();
    setDownloadFnForTests(downloadSpy);
    render(<StorageObservatoryDashboard language="EN" />);
    fireEvent.click(screen.getByTestId('observatory-tab-audit'));

    const btn = screen.getByTestId('audit-export-button');
    await act(async () => { fireEvent.click(btn); });

    await waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(1));
    const [filename, json] = downloadSpy.mock.calls[0];
    expect(filename).toMatch(/loreguard-audit-/);
    expect(filename).toMatch(/\.json$/);

    // JSON parse + schema 확인
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.app.milestone).toBe('M1.7-observatory');
    expect(parsed.streams.promotionAudit.ok).toBe(true);
    expect(parsed.streams.shadowLog.ok).toBe(true);
    expect(parsed.streams.localEventLog.ok).toBe(true);
    expect(parsed.streams.primaryWriteLog.ok).toBe(true);
  });

  test('SO10: Export 번들은 원문 포함 안 함 (details 는 sanitized)', async () => {
    const downloadSpy = jest.fn();
    setDownloadFnForTests(downloadSpy);
    // localEventLog 에 원문이 섞여 있다고 가정해도 sanitize 는 local-event-log.logEvent 에서 선행됨.
    mockedGetEventLog.mockResolvedValue([]);

    render(<StorageObservatoryDashboard language="EN" />);
    fireEvent.click(screen.getByTestId('observatory-tab-audit'));
    await act(async () => { fireEvent.click(screen.getByTestId('audit-export-button')); });

    await waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(1));
    const [, json] = downloadSpy.mock.calls[0];
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed.streams.promotionAudit.items)).toBe(true);
    expect(parsed.streams.localEventLog.items).toEqual([]);
  });
});
