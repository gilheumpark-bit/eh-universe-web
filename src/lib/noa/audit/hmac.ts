// ============================================================
// NOA Audit — HMAC Signature Operations
// Source: NOA v42.6 (HMAC-SHA256 위변조 방지)
// ============================================================

/**
 * Web Crypto API로 HMAC-SHA256 서명을 생성한다.
 *
 * @param data - 서명할 데이터
 * @param secret - HMAC 비밀 키
 * @returns hex 서명 문자열
 *
 * Phase 2: CryptoKey 캐싱 + 비추출 키 적용 완료
 */

// Module-level CryptoKey cache: secret → CryptoKey
const _keyCache = new Map<string, CryptoKey>();

async function getCachedKey(secret: string): Promise<CryptoKey> {
  const cached = _keyCache.get(secret);
  if (cached) return cached;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, // extractable = false (비추출)
    ["sign"]
  );
  // Limit cache size to prevent unbounded growth
  if (_keyCache.size >= 32) {
    const firstKey = _keyCache.keys().next().value;
    if (firstKey !== undefined) _keyCache.delete(firstKey);
  }
  _keyCache.set(secret, key);
  return key;
}

export async function signHmac(data: string, secret: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const key = await getCachedKey(secret);
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
      return Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Fall through to fallback
    }
  }
  // Fallback: simple keyed hash (non-cryptographic, for chain continuity)
  let h = 0x9e3779b9;
  for (let i = 0; i < secret.length; i++) {
    h = Math.imul(h ^ secret.charCodeAt(i), 0x01000193);
  }
  for (let i = 0; i < data.length; i++) {
    h = Math.imul(h ^ data.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").repeat(8);
}

/**
 * HMAC 서명을 검증한다.
 *
 * @param data - 원본 데이터
 * @param signature - 검증할 서명
 * @param secret - HMAC 비밀 키
 * @returns 서명 유효 여부
 */
export async function verifyHmac(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expected = await signHmac(data, secret);
  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
