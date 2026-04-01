import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

/** Verifies a Firebase Auth ID token (JWT). Returns Firebase `sub` as uid. */
export async function verifyFirebaseIdToken(token: string): Promise<{ uid: string } | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId || !token.trim()) return null;
  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const sub = payload.sub;
    if (typeof sub !== "string" || !sub) return null;
    return { uid: sub };
  } catch {
    return null;
  }
}
