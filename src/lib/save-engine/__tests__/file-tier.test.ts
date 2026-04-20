// ============================================================
// PART 1 — Mocks for full-backup
// ============================================================

jest.mock('@/lib/full-backup', () => {
  const actual = jest.requireActual('@/lib/full-backup');
  return {
    ...actual,
    exportFullBundleAsZip: jest.fn(),
    downloadZipBundle: jest.fn(),
  };
});

import {
  generateBackup,
  backupNow,
  buildBackupFilename,
  loadBackupHistory,
  getNotificationPermission,
  computeBundlePreview,
  createFileTierHandler,
  __resetFileTierLockForTests,
} from '../file-tier';
import { exportFullBundleAsZip, downloadZipBundle } from '@/lib/full-backup';

const mockedZip = exportFullBundleAsZip as jest.MockedFunction<typeof exportFullBundleAsZip>;
const mockedDownload = downloadZipBundle as jest.MockedFunction<typeof downloadZipBundle>;

// ============================================================
// PART 2 — Notification mock helpers
// ============================================================

interface NotificationLike {
  permission: 'granted' | 'denied' | 'default';
  requestPermission: () => Promise<'granted' | 'denied' | 'default'>;
}

function setNotificationPermission(state: 'granted' | 'denied' | 'default' | null): void {
  if (state === null) {
    delete (window as unknown as { Notification?: NotificationLike }).Notification;
    return;
  }
  // 생성자 형태로 만들어서 new Notification() 호출도 안전하게 받도록
  const ctor = function (this: unknown, _title: string, _opts?: unknown) {} as unknown as {
    new (title: string, opts?: unknown): unknown;
    permission: 'granted' | 'denied' | 'default';
    requestPermission: () => Promise<'granted' | 'denied' | 'default'>;
  };
  ctor.permission = state;
  ctor.requestPermission = async () => state;
  (window as unknown as { Notification: typeof ctor }).Notification = ctor;
}

// ============================================================
// PART 3 — Setup / teardown
// ============================================================

beforeEach(() => {
  __resetFileTierLockForTests();
  mockedZip.mockReset();
  mockedDownload.mockReset();
  localStorage.clear();
  setNotificationPermission(null);
});

// ============================================================
// PART 4 — Filename builder
// ============================================================

describe('buildBackupFilename', () => {
  test('FT1: 정상 projectId → 패턴 일치', () => {
    const name = buildBackupFilename('proj-1', new Date(Date.UTC(2026, 3, 19, 12, 30, 45)));
    expect(name).toBe('loreguard-backup-proj-1-20260419-123045.zip');
  });

  test('FT2: 위험 문자 sanitize', () => {
    const name = buildBackupFilename('p<>/\\?*"', new Date(Date.UTC(2026, 0, 1, 0, 0, 0)));
    expect(name).toMatch(/^loreguard-backup-p_+-20260101-000000\.zip$/);
  });
});

// ============================================================
// PART 5 — Notification permission helpers
// ============================================================

describe('getNotificationPermission', () => {
  test('FT3: Notification API 없음 → unsupported', () => {
    setNotificationPermission(null);
    expect(getNotificationPermission()).toBe('unsupported');
  });

  test('FT4: granted 상태 그대로 반환', () => {
    setNotificationPermission('granted');
    expect(getNotificationPermission()).toBe('granted');
  });
});

// ============================================================
// PART 6 — generateBackup
// ============================================================

describe('generateBackup', () => {
  test('FT5: zip null → 실패 + skipped 모드', async () => {
    mockedZip.mockResolvedValue(null);
    const result = await generateBackup('proj-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('zip-build-failed');
  });

  test('FT6: permission granted -> 자동 다운로드 + auto mode + history 기록', async () => {
    setNotificationPermission('granted');
    const fakeBlob = new Blob(['x'.repeat(1024)], { type: 'application/zip' });
    mockedZip.mockResolvedValue(fakeBlob);

    const result = await generateBackup('proj-1');
    expect(result.success).toBe(true);
    expect(result.downloaded).toBe(true);
    expect(result.mode).toBe('auto');
    expect(mockedDownload).toHaveBeenCalledTimes(1);

    const history = loadBackupHistory();
    expect(history.length).toBe(1);
    expect(history[0]?.mode).toBe('auto');
  });

  test('FT7: permission denied → 토스트만, 다운로드 없음', async () => {
    setNotificationPermission('denied');
    const fakeBlob = new Blob(['y'.repeat(2048)], { type: 'application/zip' });
    mockedZip.mockResolvedValue(fakeBlob);

    const events: unknown[] = [];
    const handler = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('noa:alert', handler);

    const result = await generateBackup('proj-1');
    window.removeEventListener('noa:alert', handler);

    expect(result.success).toBe(true);
    expect(result.downloaded).toBe(false);
    expect(result.mode).toBe('manual');
    expect(mockedDownload).not.toHaveBeenCalled();
    expect(events.length).toBe(1);
  });

  test('FT8: 동시 호출 → 두 번째는 busy로 즉시 skip', async () => {
    setNotificationPermission('granted');
    let resolveZip!: (b: Blob) => void;
    mockedZip.mockReturnValueOnce(new Promise((r) => { resolveZip = r; }));

    const p1 = generateBackup('proj-1');
    const r2 = await generateBackup('proj-1');
    expect(r2.success).toBe(false);
    expect(r2.error).toBe('busy');
    resolveZip(new Blob(['ok']));
    const r1 = await p1;
    expect(r1.success).toBe(true);
  });
});

// ============================================================
// PART 7 — backupNow (사용자 명시)
// ============================================================

describe('backupNow', () => {
  test('FT9: permission default → requestPermission 한 번 호출', async () => {
    setNotificationPermission('default');
    const fakeBlob = new Blob(['z'.repeat(512)], { type: 'application/zip' });
    mockedZip.mockResolvedValue(fakeBlob);

    const result = await backupNow('proj-1');
    expect(result.success).toBe(true);
    expect(result.mode).toBe('manual');
    expect(mockedDownload).toHaveBeenCalled();
  });

  test('FT10: history 5개 초과 시 ring buffer 동작', async () => {
    setNotificationPermission('granted');
    mockedZip.mockResolvedValue(new Blob(['x'], { type: 'application/zip' }));

    for (let i = 0; i < 7; i++) {
      __resetFileTierLockForTests();
      await backupNow(`proj-${i}`, { historyLimit: 5 });
    }

    const history = loadBackupHistory();
    expect(history.length).toBe(5);
    // 가장 오래된 것 2개 드롭, proj-2 ~ proj-6 남음
    expect(history[0]?.projectId).toBe('proj-2');
    expect(history[4]?.projectId).toBe('proj-6');
  });
});

// ============================================================
// PART 8 — createFileTierHandler
// ============================================================

describe('createFileTierHandler', () => {
  test('FT11: provider null → no-op (no throw)', async () => {
    const { handler } = createFileTierHandler(() => null);
    await expect(handler()).resolves.toBeUndefined();
    expect(mockedZip).not.toHaveBeenCalled();
  });

  test('FT12: 실패 시 throw (orchestrator가 fail로 처리)', async () => {
    setNotificationPermission(null);
    mockedZip.mockResolvedValue(null);
    const { handler } = createFileTierHandler(() => 'p1');
    await expect(handler()).rejects.toThrow(/file-tier failed/);
  });
});

// ============================================================
// PART 9 — computeBundlePreview
// ============================================================

describe('computeBundlePreview', () => {
  test('FT13: 정상 bundle → episode/session count 반환', () => {
    const preview = computeBundlePreview({
      version: '1.0',
      exportedAt: '2026-04-19',
      project: {
        id: 'p1',
        title: 't',
        episodes: [
          { no: 1, title: 'E1', content: '...' },
          { no: 2, title: 'E2', content: '...' },
        ],
      },
      sessions: [
        { id: 's1', messages: [], config: {} },
      ],
      settings: {},
    });
    expect(preview.episodeCount).toBe(2);
    expect(preview.sessionCount).toBe(1);
    expect(preview.estimatedBytes).toBeGreaterThan(0);
  });
});
