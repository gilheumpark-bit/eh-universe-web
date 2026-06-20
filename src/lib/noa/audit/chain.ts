// ============================================================
// NOA Audit — SHA-256 Hash Chain Operations
// Source: NOA v42.6 (Canonical JSON + Hash Chaining)
// ============================================================

/**
 * 객체를 결정론적 JSON 문자열로 변환한다.
 * (키 정렬, 공백 제거 → 같은 입력이면 항상 같은 출력)
 *
 * @param obj - 직렬화할 객체
 * @returns 정규화된 JSON 문자열
 */
export function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

/**
 * Web Crypto API를 사용하여 SHA-256 해시를 계산한다.
 *
 * @param data - 해시할 문자열
 * @returns hex 해시 문자열
 *
 * Phase 2: fallback (non-secure context) — FNV-1a 64-bit polyfill
 */
export async function computeHash(data: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const buf = await crypto.subtle.digest("SHA-256", encoder.encode(data));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // crypto.subtle may throw in insecure contexts; fall through
    }
  }
  // Fallback: FNV-1a inspired multi-round hash (not cryptographic, but
  // provides good distribution for chain-continuity purposes)
  return fnv1aFallback(data);
}

/**
 * FNV-1a 기반 폴리필 해시 (non-secure context용).
 * 4개의 독립 시드로 32비트 해시를 각각 계산하여 128-bit hex를 생성한다.
 */
function fnv1aFallback(data: string): string {
  const seeds = [0x811c9dc5, 0x01000193, 0x050c5d1f, 0x1493f157];
  const parts: string[] = [];
  for (const seed of seeds) {
    let h = seed;
    for (let i = 0; i < data.length; i++) {
      h ^= data.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    parts.push((h >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("");
}
