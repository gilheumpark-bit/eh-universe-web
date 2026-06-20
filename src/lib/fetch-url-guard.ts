/**
 * Basic SSRF mitigation: block obvious private/local targets before fetch.
 * Not a substitute for network-level egress controls.
 *
 * DNS rebinding risk: An attacker can make a domain resolve to a public IP
 * during validation, then switch to a private IP before the actual fetch.
 * We mitigate this by re-validating the final redirected URL after fetch
 * via `validatePostFetchUrl()`. For full protection, network-level egress
 * controls (e.g. firewall rules blocking RFC1918 from the fetch process)
 * are recommended.
 */

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
];

/**
 * Normalize a URL hostname for security checks.
 * - Strips surrounding brackets from IPv6 literals (`[fc00::1]` → `fc00::1`)
 *   so range checks against the bare address actually match.
 * - Drops an IPv6 zone id (`fe80::1%eth0` → `fe80::1`).
 * - Lowercases for case-insensitive comparison.
 */
function normalizeHost(hostname: string): string {
  let h = hostname.trim().toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) {
    h = h.slice(1, -1);
  }
  const zoneIdx = h.indexOf('%');
  if (zoneIdx !== -1) {
    h = h.slice(0, zoneIdx);
  }
  return h;
}

/** True if the (already normalized, bracket-free) host is an IPv6 literal. */
function looksLikeIPv6(host: string): boolean {
  return host.includes(':');
}

/**
 * Classify a bracket-free IPv6 literal as private/reserved/internal.
 * Covers: loopback (::1), unspecified (::), ULA (fc00::/7), link-local
 * (fe80::/10), and IPv4-mapped (::ffff:0:0/96) — for the mapped form we
 * recurse into the embedded IPv4 so 127.0.0.1 etc. are also caught.
 * Conservative: any IPv6 literal that is NOT a normal global address is
 * rejected by the caller's allowlist policy, so this only needs to be
 * sound for the explicit private ranges plus the mapped tunnel.
 */
function isPrivateOrReservedIPv6(host: string): boolean {
  const h = host.toLowerCase();

  // loopback ::1  and unspecified ::
  if (h === '::1' || h === '::') return true;

  // ULA fc00::/7  → first hex group starts with fc or fd
  if (/^f[cd][0-9a-f]{0,2}:/.test(h)) return true;

  // link-local fe80::/10  → fe80..febf
  if (/^fe[89ab][0-9a-f]?:/.test(h)) return true;

  // IPv4-mapped ::ffff:0:0/96  (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  const mapped = /^::ffff:(.+)$/.exec(h);
  if (mapped) {
    const tail = mapped[1];
    // dotted-quad form: ::ffff:127.0.0.1
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(tail)) {
      return isPrivateOrReservedIPv4(tail);
    }
    // hex form ::ffff:7f00:1 → reconstruct the embedded IPv4 (best effort)
    const hexQuad = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(tail);
    if (hexQuad) {
      const hi = parseInt(hexQuad[1], 16);
      const lo = parseInt(hexQuad[2], 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        const dotted = `${(hi >>> 8) & 0xff}.${hi & 0xff}.${(lo >>> 8) & 0xff}.${lo & 0xff}`;
        return isPrivateOrReservedIPv4(dotted);
      }
    }
    // any other ::ffff: form → treat as suspicious
    return true;
  }

  return false;
}

function isPrivateHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (looksLikeIPv6(host)) {
    return isPrivateOrReservedIPv6(host);
  }
  if (PRIVATE_IP_PATTERNS.some((p) => p.test(host))) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return isPrivateOrReservedIPv4(host);
  }
  return false;
}

/**
 * Post-fetch DNS rebinding guard: validates the final URL after redirects.
 * Call this after `fetch()` completes, passing `response.url`.
 * Throws if the resolved destination is a private/internal address.
 */
export function validatePostFetchUrl(responseUrl: string): void {
  const finalUrl = new URL(responseUrl);
  const host = normalizeHost(finalUrl.hostname);
  // Mirror the pre-fetch allowlist policy: any IPv6 literal (not just the
  // private ranges) is rejected here too, so a redirect to a raw IPv6 target
  // cannot bypass the pre-fetch guard.
  if (looksLikeIPv6(host) || isPrivateHost(host)) {
    throw new Error('SSRF blocked: resolved to private IP after redirect');
  }
}

export async function assertResolvedHostAllowedForFetch(
  rawUrl: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const allowed = assertUrlAllowedForFetch(rawUrl);
  if (!allowed.ok) {
    return { ok: false, reason: allowed.reason };
  }

  const parsed = new URL(allowed.href);
  const host = normalizeHost(parsed.hostname);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || looksLikeIPv6(host)) {
    return { ok: true };
  }

  try {
    const { lookup } = await import('node:dns/promises');
    const records = await lookup(host, { all: true, verbatim: true });
    if (!records.length) {
      return { ok: false, reason: '호스트 주소를 확인할 수 없습니다.' };
    }
    for (const record of records) {
      if (isPrivateHost(record.address)) {
        return { ok: false, reason: 'DNS 확인 결과 사설/로컬 주소로 연결되어 차단했습니다.' };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: '호스트 주소를 확인할 수 없습니다.' };
  }
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'metadata',
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

function isPrivateOrReservedIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true;
  // 10.0.0.0/8
  if ((n >>> 24) === 10) return true;
  // 172.16.0.0/12
  if ((n >>> 24) === 172) {
    const second = (n >>> 16) & 0xff;
    if (second >= 16 && second <= 31) return true;
  }
  // 192.168.0.0/16
  if ((n >>> 16) === 49320) return true;
  // 127.0.0.0/8
  if ((n >>> 24) === 127) return true;
  // 169.254.0.0/16 link-local
  if ((n >>> 16) === 0xa9fe) return true;
  // 0.0.0.0/8
  if ((n >>> 24) === 0) return true;
  // 100.64.0.0/10 CGNAT
  if (n >= 0x64400000 && n <= 0x647fffff) return true;
  return false;
}

export function assertUrlAllowedForFetch(rawUrl: string): { ok: true; href: string } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: '유효하지 않은 URL 형식입니다.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'http 또는 https URL만 허용됩니다.' };
  }

  // Normalize first: strips IPv6 brackets / zone id, lowercases.
  // Critical for IPv6 — URL.hostname returns the bracketed form ('[fc00::1]')
  // which defeats any range check done against the raw value.
  const host = normalizeHost(parsed.hostname);
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: '허용되지 않는 호스트입니다.' };
  }

  // IPv6 literal: deny every private/reserved/IPv4-mapped form, and — per the
  // allowlist policy for this proxy — deny any other IPv6 literal too, since
  // the legitimate use case is fetching public hostnames, not raw IPv6.
  if (looksLikeIPv6(host)) {
    return { ok: false, reason: '사설/로컬 주소로의 요청은 허용되지 않습니다.' };
  }

  // IPv4 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (isPrivateOrReservedIPv4(host)) {
      return { ok: false, reason: '사설/로컬 주소로의 요청은 허용되지 않습니다.' };
    }
  }

  return { ok: true, href: parsed.href };
}

type Bucket = { count: number; windowStart: number };
const RATE: Map<string, Bucket> = new Map();
const MAX_REQ = 40;
const WINDOW_MS = 60_000;

export function rateLimitFetchUrl(clientKey: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let b = RATE.get(clientKey);
  if (!b || now - b.windowStart > WINDOW_MS) {
    b = { count: 0, windowStart: now };
    RATE.set(clientKey, b);
  }
  b.count += 1;
  if (b.count > MAX_REQ) {
    return { ok: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - b.windowStart)) / 1000) || 1 };
  }
  return { ok: true };
}
