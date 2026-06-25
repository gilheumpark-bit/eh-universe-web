// firebase-auth-admin-rest fail-safe 검증 — 미설정/잘못된 입력에서 throw 없이 graceful 반환.
// (실 Identity Toolkit REST 호출은 service account + project 필요 — 런타임 검증 영역.)
import { setStripeRoleClaim, clearStripeRoleClaim } from '@/lib/firebase-auth-admin-rest';

describe('firebase-auth-admin-rest — fail-safe', () => {
  const origEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('빈 uid → invalid_uid (throw 없음)', async () => {
    const r = await setStripeRoleClaim('');
    expect(r).toEqual({ ok: false, error: 'invalid_uid' });
  });

  it('project id 미설정 → no_project_id', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const r = await setStripeRoleClaim('uid-1');
    expect(r).toEqual({ ok: false, error: 'no_project_id' });
  });

  it('service account 미설정 → no_service_account (네트워크 미발생)', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'proj-1';
    delete process.env.VERTEX_AI_CREDENTIALS;
    const r = await setStripeRoleClaim('uid-1');
    expect(r).toEqual({ ok: false, error: 'no_service_account' });
  });

  it('clearStripeRoleClaim 도 동일 fail-safe', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'proj-1';
    delete process.env.VERTEX_AI_CREDENTIALS;
    const r = await clearStripeRoleClaim('uid-2');
    expect(r).toEqual({ ok: false, error: 'no_service_account' });
  });
});
