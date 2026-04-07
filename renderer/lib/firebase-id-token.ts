import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

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
    const tier = (payload as Record<string, unknown>).stripeRole === 'pro' ? 'pro' as const : 'free' as const;
    return { uid: sub, tier };
  } catch {
    return null;
  }
}
