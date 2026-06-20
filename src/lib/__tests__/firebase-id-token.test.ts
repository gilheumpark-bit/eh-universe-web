// [QA-robustness (3)] stripeRole desync grace 검증.
// jose.jwtVerify 와 firestore-service-rest 를 모킹해 grace 읽기 분기를 격리 테스트.

let mockPayload: Record<string, unknown> = {};
let jwtShouldThrow = false;

jest.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: jest.fn(async () => {
    if (jwtShouldThrow) throw new Error('jwt invalid');
    return { payload: mockPayload };
  }),
}));

const mockGetDoc = jest.fn();
jest.mock('@/lib/firestore-service-rest', () => ({
  firestoreGetDocument: (...args: unknown[]) => mockGetDoc(...args),
}));

import { verifyFirebaseIdToken } from '../firebase-id-token';

const origEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...origEnv, NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'proj-1' };
  mockPayload = {};
  jwtShouldThrow = false;
  mockGetDoc.mockReset();
});
afterEach(() => {
  process.env = { ...origEnv };
});

describe('verifyFirebaseIdToken — 기본', () => {
  it('project id 미설정이면 null', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    expect(await verifyFirebaseIdToken('tok')).toBeNull();
  });

  it('빈 토큰이면 null', async () => {
    expect(await verifyFirebaseIdToken('   ')).toBeNull();
  });

  it('jwtVerify 실패면 null', async () => {
    jwtShouldThrow = true;
    expect(await verifyFirebaseIdToken('tok')).toBeNull();
  });

  it('sub 없으면 null', async () => {
    mockPayload = { stripeRole: 'pro' };
    expect(await verifyFirebaseIdToken('tok')).toBeNull();
  });
});

describe('verifyFirebaseIdToken — claim=pro (grace 읽기 우회)', () => {
  it('claim stripeRole=pro 면 즉시 pro, Firestore 읽기 안 함', async () => {
    mockPayload = { sub: 'uid-1', stripeRole: 'pro' };
    const r = await verifyFirebaseIdToken('tok');
    expect(r).toEqual({ uid: 'uid-1', tier: 'pro' });
    expect(mockGetDoc).not.toHaveBeenCalled(); // 성능: pro 경로는 추가 읽기 0
  });
});

describe('verifyFirebaseIdToken — claim!=pro desync grace', () => {
  it('구독 문서가 paid 면 grace 로 pro 승급', async () => {
    mockPayload = { sub: 'uid-2' }; // stripeRole 없음
    mockGetDoc.mockResolvedValue({ ok: true, fields: { status: { stringValue: 'paid' } } });
    const r = await verifyFirebaseIdToken('tok');
    expect(r).toEqual({ uid: 'uid-2', tier: 'pro' });
    expect(mockGetDoc).toHaveBeenCalledTimes(1); // 읽기 1회만
    expect(mockGetDoc).toHaveBeenCalledWith('proj-1', 'subscriptions/uid-2');
  });

  it('구독 문서 active/trialing 도 pro 승급', async () => {
    mockPayload = { sub: 'uid-3' };
    mockGetDoc.mockResolvedValue({ ok: true, fields: { status: { stringValue: 'active' } } });
    expect((await verifyFirebaseIdToken('tok'))?.tier).toBe('pro');
  });

  it('구독 문서가 unpaid/canceled 면 free 유지', async () => {
    mockPayload = { sub: 'uid-4' };
    mockGetDoc.mockResolvedValue({ ok: true, fields: { status: { stringValue: 'canceled' } } });
    const r = await verifyFirebaseIdToken('tok');
    expect(r).toEqual({ uid: 'uid-4', tier: 'free' });
  });

  it('읽기 실패(not_found/SA 미설정)면 침묵 강등 없이 free 폴백', async () => {
    mockPayload = { sub: 'uid-5' };
    mockGetDoc.mockResolvedValue({ ok: false, error: 'not_found' });
    expect((await verifyFirebaseIdToken('tok'))?.tier).toBe('free');
  });

  it('읽기가 throw 해도 fail-safe free (예외 전파 X)', async () => {
    mockPayload = { sub: 'uid-6' };
    mockGetDoc.mockRejectedValue(new Error('network blip'));
    const r = await verifyFirebaseIdToken('tok');
    expect(r).toEqual({ uid: 'uid-6', tier: 'free' });
  });

  it('읽기는 정확히 1회 — 재시도 루프 없음 (지연 상한 보장)', async () => {
    mockPayload = { sub: 'uid-7' };
    mockGetDoc.mockResolvedValue({ ok: false, error: 'timeout' });
    await verifyFirebaseIdToken('tok');
    expect(mockGetDoc).toHaveBeenCalledTimes(1);
  });
});
