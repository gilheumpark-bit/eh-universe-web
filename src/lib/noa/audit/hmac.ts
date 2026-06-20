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

/**
 * HMAC unavailable 명시적 거부 마커.
 * WebCrypto 미지원 환경에서 가짜 서명을 만들지 않고 verify가 즉시 false 처리하도록.
 */
const HMAC_UNAVAILABLE_MARKER = "__HMAC_UNAVAILABLE__";

export async function signHmac(data: string, secret: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    // [C] WebCrypto 미지원 — fallback 키드해시는 가짜 서명을 만들어 감사 무결성을 위협한다.
    // 명시적 거부 마커 반환 → verifyHmac이 즉시 false 처리.
    throw new Error(
      "HMAC requires Web Crypto API. Environment not supported — audit chain disabled.",
    );
  }
  try {
    const encoder = new TextEncoder();
    const key = await getCachedKey(secret);
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (err) {
    // [C] WebCrypto 호출 실패 — fallback 금지. 호출자에게 명시적 실패 전달.
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`HMAC signing failed: ${detail}`);
  }
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
  secret: string,
): Promise<boolean> {
  // [C] 명시적 거부 마커 또는 비어있는 서명은 즉시 invalid 처리.
  if (!signature || signature === HMAC_UNAVAILABLE_MARKER) return false;

  let expected: string;
  try {
    expected = await signHmac(data, secret);
  } catch {
    // signHmac이 throw하면 (WebCrypto 미지원) 검증 불가 → invalid 처리.
    return false;
  }

  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
