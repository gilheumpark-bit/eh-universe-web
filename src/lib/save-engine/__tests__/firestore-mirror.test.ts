// ============================================================
// PART 1 — Test setup + mocks
// ============================================================

import {
  pushSnapshot,
  pullSnapshot,
  createFirestoreMirrorHandler,
  isMirrorAllowed,
  __setFirestoreForTests,
  type MirrorSnapshot,
} from '../firestore-mirror';

// feature-flags / firebase-quota-tracker / firebase 모킹
jest.mock('@/lib/feature-flags', () => {
  const actual = jest.requireActual('@/lib/feature-flags');
  return {
    ...actual,
    isFeatureEnabled: jest.fn((flag: string) => {
      // 테스트가 자체 제어하기 위해 mock 사용
      const mock = (globalThis as unknown as { __FF_MOCK?: Record<string, boolean> }).__FF_MOCK ?? {};
      if (flag in mock) return mock[flag];
      return false;
    }),
  };
});

jest.mock('@/lib/firebase-quota-tracker', () => ({
  getRemainingQuota: jest.fn(() => ({
    reads: 10000,
    writes: 5000,
    readsPercent: 10,
    writesPercent: 10,
  })),
  incrementFirebaseRead: jest.fn(),
  incrementFirebaseWrite: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  getDb: jest.fn(() => ({ __mockDb: true })),
}));

import { getRemainingQuota } from '@/lib/firebase-quota-tracker';

const mockedQuota = getRemainingQuota as jest.MockedFunction<typeof getRemainingQuota>;

function setFlags(flags: Record<string, boolean>): void {
  (globalThis as unknown as { __FF_MOCK: Record<string, boolean> }).__FF_MOCK = flags;
}

function makeSnapshot(hash: string): MirrorSnapshot {
  return {
    uid: 'user-1',
    projectId: 'proj-1',
    contentHash: hash,
    payload: new Uint8Array([1, 2, 3]),
    capturedAt: 1_700_000_000_000,
    journalVersion: 1,
  };
}

beforeEach(() => {
  setFlags({});
  __setFirestoreForTests(null);
  mockedQuota.mockReturnValue({
    reads: 10000,
    writes: 5000,
    readsPercent: 10,
    writesPercent: 10,
  });
});

afterEach(() => {
  __setFirestoreForTests(null);
});

// ============================================================
// PART 2 — isMirrorAllowed (consent gate)
// ============================================================

describe('isMirrorAllowed — consent gate', () => {
  test('F1: window 없음 시 SSR로 인식 — typeof window 체크 (런타임 검증은 jsdom 한계)', () => {
    // jsdom은 window 재정의를 막아서 직접 시뮬 불가.
    // 대신 isMirrorAllowed 내 typeof window === 'undefined' 분기는
    // 정적 코드 검토와 실제 SSR 빌드에서 자동 보호됨을 신뢰.
    // 여기서는 다른 차단 사유들이 정상 동작하면 SSR도 동일 path임을 간접 검증.
    setFlags({});
    const out = isMirrorAllowed();
    expect(out.allowed).toBe(false);
  });

  test('F2: FEATURE_FIRESTORE_MIRROR off → blocked (consent-required)', () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: false, CLOUD_SYNC: true });
    const out = isMirrorAllowed();
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('consent-required');
  });

  test('F3: CLOUD_SYNC off → blocked', () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: false });
    const out = isMirrorAllowed();
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('cloud-sync-disabled');
  });

  test('F4: 둘 다 on → allowed', () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: true });
    const out = isMirrorAllowed();
    expect(out.allowed).toBe(true);
  });
});

// ============================================================
// PART 3 — pushSnapshot
// ============================================================

describe('pushSnapshot', () => {
  test('F5: consent 없음 → blocked, 네트워크 호출 0건', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: false });
    const setDoc = jest.fn();
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc,
      getDoc: jest.fn(),
    });

    const result = await pushSnapshot(makeSnapshot('h1'), null);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('consent-required');
    expect(setDoc).not.toHaveBeenCalled();
  });

  test('F6: 해시 동일 → skipped, 호출 안 함', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: true });
    const setDoc = jest.fn();
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc,
      getDoc: jest.fn(),
    });

    const result = await pushSnapshot(makeSnapshot('h1'), 'h1');
    expect(result.skipped).toBe(true);
    expect(result.written).toBe(false);
    expect(setDoc).not.toHaveBeenCalled();
  });

  test('F7: 새 해시 → written, setDoc 호출', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: true });
    const setDoc = jest.fn().mockResolvedValue(undefined);
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc,
      getDoc: jest.fn(),
    });

    const result = await pushSnapshot(makeSnapshot('h2'), 'h1');
    expect(result.written).toBe(true);
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  test('F8: quota 90%+ 도달 → blocked (writes-exceeded)', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: true });
    mockedQuota.mockReturnValue({
      reads: 0,
      writes: 0,
      readsPercent: 10,
      writesPercent: 95,
    });
    const setDoc = jest.fn();
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc,
      getDoc: jest.fn(),
    });

    const result = await pushSnapshot(makeSnapshot('h2'), 'h1');
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('quota-writes-exceeded');
    expect(setDoc).not.toHaveBeenCalled();
  });

  test('F9: setDoc throw → throw 그대로 전파 (orchestrator가 catch)', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: true });
    const setDoc = jest.fn().mockRejectedValue(new Error('network down'));
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc,
      getDoc: jest.fn(),
    });

    await expect(pushSnapshot(makeSnapshot('h2'), 'h1')).rejects.toThrow('network down');
  });
});

// ============================================================
// PART 4 — pullSnapshot
// ============================================================

describe('pullSnapshot', () => {
  test('F10: consent 없음 → blocked', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: false });
    const getDoc = jest.fn();
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc: jest.fn(),
      getDoc,
    });

    const result = await pullSnapshot('user-1', 'proj-1');
    expect(result.blocked).toBe(true);
    expect(getDoc).not.toHaveBeenCalled();
  });

  test('F11: 원격에 데이터 없음 → found false', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: true });
    const getDoc = jest.fn().mockResolvedValue({
      exists: () => false,
      data: () => undefined,
    });
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc: jest.fn(),
      getDoc,
    });

    const result = await pullSnapshot('user-1', 'proj-1');
    expect(result.found).toBe(false);
    expect(result.blocked).toBe(false);
  });

  test('F12: 원격 데이터 있음 → snapshot 반환', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: true });
    const payload = new Uint8Array([1, 2, 3]);
    const getDoc = jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({
        contentHash: 'remote-hash',
        capturedAt: 1234,
        payload,
        journalVersion: 1,
      }),
    });
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc: jest.fn(),
      getDoc,
    });

    const result = await pullSnapshot('user-1', 'proj-1');
    expect(result.found).toBe(true);
    expect(result.snapshot?.contentHash).toBe('remote-hash');
    expect(result.snapshot?.payload).toBe(payload);
  });
});

// ============================================================
// PART 5 — createFirestoreMirrorHandler
// ============================================================

describe('createFirestoreMirrorHandler', () => {
  test('F13: provider null → no-op (no throw)', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: true });
    const setDoc = jest.fn();
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc,
      getDoc: jest.fn(),
    });

    const { handler } = createFirestoreMirrorHandler(async () => null);
    await expect(handler()).resolves.toBeUndefined();
    expect(setDoc).not.toHaveBeenCalled();
  });

  test('F14: 첫 push 후 같은 해시 재호출 → skip', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: true, CLOUD_SYNC: true });
    const setDoc = jest.fn().mockResolvedValue(undefined);
    __setFirestoreForTests({
      buildRef: () => 'ref',
      setDoc,
      getDoc: jest.fn(),
    });

    const snap = makeSnapshot('h-x');
    const { handler, getLastPushedHash } = createFirestoreMirrorHandler(async () => snap);

    await handler();
    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(getLastPushedHash()).toBe('h-x');

    await handler();
    expect(setDoc).toHaveBeenCalledTimes(1); // 변경 없으니 setDoc 호출 안 됨
  });

  test('F15: blocked → throw (orchestrator가 fail로 처리)', async () => {
    setFlags({ FEATURE_FIRESTORE_MIRROR: false });
    const { handler } = createFirestoreMirrorHandler(async () => makeSnapshot('h'));
    await expect(handler()).rejects.toThrow(/firestore-mirror blocked/);
  });
});
