import { createRemoteJWKSet, jwtVerify } from "jose";
import { logger } from "@/lib/logger";

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

/**
 * [QA-robustness (3)] stripeRole desync grace.
 *
 * claim `stripeRole !== 'pro'` 인데 Firestore 구독 문서가 paid/active 면 = 불일치 상태.
 * 보통 결제 직후 claim 전파 지연(ID token 미갱신) 또는 webhook→claim 설정 실패에서 발생한다.
 * 침묵 강등(유료 사용자를 free 로) 대신 log/alert 후 1회 읽기로 grace 승급한다.
 *
 * fail-safe: 읽기 실패·문서 없음·SA 미설정 등 모든 경로는 기존 free 폴백(= false) 유지.
 * 읽기는 항상 1회만 — 재시도/루프 없음 (검증 경로 지연 상한 보장).
 */
async function isSubscriptionPaidGrace(projectId: string, uid: string): Promise<boolean> {
  try {
    const { firestoreGetDocument } = await import("@/lib/firestore-service-rest");
    const doc = await firestoreGetDocument(projectId, `subscriptions/${encodeURIComponent(uid)}`);
    if (!doc.ok) return false; // 침묵 강등 X — 읽기 실패 시 기존 free 유지 (회귀 0)

    // Firestore REST 필드 형식: { status: { stringValue: 'paid' } } 등.
    const statusField = doc.fields.status as { stringValue?: string } | undefined;
    const status = statusField?.stringValue?.toLowerCase() ?? "";
    const paid = status === "paid" || status === "active" || status === "trialing";
    if (paid) {
      logger.warn("firebase-id-token", "stripeRole desync — claim!=pro but subscription paid; granting grace pro", { uid });
    }
    return paid;
  } catch (err) {
    logger.warn("firebase-id-token", "subscription grace read threw (fail-safe to free)", err);
    return false;
  }
}

/** Verifies a Firebase Auth ID token (JWT). Returns Firebase `sub` as uid and custom claims. */
export async function verifyFirebaseIdToken(token: string): Promise<{ uid: string; tier?: 'free' | 'pro' } | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId || !token.trim()) return null;
  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const sub = payload.sub;
    if (typeof sub !== "string" || !sub) return null;
    // Extract tier from Firebase custom claims (set via Admin SDK when user subscribes)
    if ((payload as Record<string, unknown>).stripeRole === 'pro') {
      return { uid: sub, tier: 'pro' as const };
    }
    // [QA-robustness (3)] claim != pro — 침묵 강등 전에 구독 문서 1회 확인 (desync grace).
    // 읽기 실패·미설정·비-paid 면 기존대로 free.
    const graced = await isSubscriptionPaidGrace(projectId, sub);
    return { uid: sub, tier: graced ? 'pro' as const : 'free' as const };
  } catch {
    return null;
  }
}
