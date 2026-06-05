// ============================================================
// PART 1 — Overview (Firebase Auth custom claims via Identity Toolkit REST)
// ============================================================
//
// Stripe webhook 에서 결제 성공 시 Firebase 유저의 custom claim(`stripeRole`)을 설정한다.
// firebase-admin SDK 를 추가하지 않고, 기존 `firestore-service-rest.ts` 와 동일한
// service-account(JWT) 패턴을 재사용한다 (의존성·번들 증가 0).
//
// [원칙 1] fail-safe — 미설정/실패 시 throw 없이 {ok:false}. webhook 은 항상 200 유지.
// [원칙 2] 호출자 = Stripe signature 검증된 webhook 단일. uid 는 우리가 checkout 시
//   client_reference_id / subscription metadata 에 심은 신뢰값.
// [원칙 3] 읽기 경로(firebase-id-token.ts)는 token claim `stripeRole` 을 그대로 읽음 — 무변경.
//   단 claim 은 다음 ID token refresh 시 전파됨(클라이언트가 결제 후 force-refresh 권장).
//
// ⚠️ [확인 필요 — 런타임 미검증] Identity Toolkit v1 `accounts:update` 엔드포인트·스코프는
//   Firebase 문서 대조 + 실 환경 검증 필요. service account 는 **Firebase Authentication Admin**
//   역할을 가져야 함(VERTEX_AI_CREDENTIALS 재사용 시 역할 부여 필요). 미설정 시 graceful no-op.
//
// [C] SA 미설정·HTTP 오류 전부 흡수. [K] 2 export: setStripeRoleClaim / clearStripeRoleClaim.

import { JWT } from 'google-auth-library';
import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Service account access token (identitytoolkit scope)
// ============================================================

const IDENTITY_TOOLKIT_SCOPE = 'https://www.googleapis.com/auth/identitytoolkit';

function parseServiceAccount(): { client_email: string; private_key: string } | null {
  const raw = process.env.VERTEX_AI_CREDENTIALS?.trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!j.client_email || !j.private_key) return null;
    return { client_email: j.client_email, private_key: j.private_key };
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  const creds = parseServiceAccount();
  if (!creds) return null;
  try {
    const client = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: [IDENTITY_TOOLKIT_SCOPE],
    });
    const t = await client.getAccessToken();
    return typeof t === 'string' ? t : t?.token ?? null;
  } catch (err) {
    logger.warn('firebase-auth-admin-rest', 'getAccessToken failed', err);
    return null;
  }
}

// ============================================================
// PART 3 — Set / clear custom claims (Identity Toolkit accounts:update)
// ============================================================

export type AdminClaimResult = { ok: true } | { ok: false; error: string };

/**
 * uid 의 custom claims 를 통째로 설정한다 (Identity Toolkit `accounts:update`).
 * customAttributes 는 claims 전체를 JSON 문자열로 덮어쓴다 (admin SDK setCustomUserClaims 동일 시맨틱).
 */
async function setCustomClaims(uid: string, claims: Record<string, unknown>): Promise<AdminClaimResult> {
  if (!uid || typeof uid !== 'string') return { ok: false, error: 'invalid_uid' };
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return { ok: false, error: 'no_project_id' };

  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'no_service_account' };

  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(claims) }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.warn('firebase-auth-admin-rest', 'accounts:update failed', { status: res.status, detail: detail.slice(0, 200) });
      return { ok: false, error: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    logger.warn('firebase-auth-admin-rest', 'accounts:update threw', err);
    return { ok: false, error: 'fetch_failed' };
  }
}

/** 결제 성공 → Pro 부여. */
export function setStripeRoleClaim(uid: string): Promise<AdminClaimResult> {
  return setCustomClaims(uid, { stripeRole: 'pro' });
}

/** 구독 해지 → Pro 제거 (claims 비움). */
export function clearStripeRoleClaim(uid: string): Promise<AdminClaimResult> {
  return setCustomClaims(uid, {});
}

// IDENTITY_SEAL: firebase-auth-admin-rest | role=custom-claim-setter | inputs=uid | outputs=ok|error(fail-safe)
