// ============================================================
// PART 1 — Shared In-Memory Rate Limiter (sliding window, per-IP)
// ============================================================
// Used by all API routes to enforce request limits.
// Map-based, no external dependencies. Lazy cleanup every 60s.

const MAX_ENTRIES = 2_000;
const CLEANUP_INTERVAL_MS = 60_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Global shared map — singleton across all route imports in the same serverless instance.
// ⚠️ Vercel 서버리스 환경 주의: 각 람다 인스턴스마다 독립 Map이므로, 분산 공격 방어력은 제한적.
// 프로덕션에서 DDoS 방어가 필요하면 Cloudflare/Vercel WAF + Upstash Redis 레이어 추가 권장.
const rateLimitMap = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

function lazyCleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
  lastCleanup = now;
}

/**
 * Check if a request from the given IP is within the rate limit.
 * Returns { allowed, retryAfterMs }.
 */
export function checkRateLimit(
  ip: string,
  route: string,
  config: RateLimitConfig,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  lazyCleanup(now);

  const key = `${route}:${ip}`;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // Evict oldest entry if map is full
    if (rateLimitMap.size >= MAX_ENTRIES) {
      const firstKey = rateLimitMap.keys().next().value;
      if (firstKey !== undefined) rateLimitMap.delete(firstKey);
    }
    rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

// ============================================================
// PART 2 — Pre-configured rate limit profiles
// ============================================================

export const RATE_LIMITS = {
  chat:     { windowMs: 60_000, maxRequests: 30 },  // 30/min (was 60)
  imageGen: { windowMs: 60_000, maxRequests: 10 },  // 10/min (was 30)
  default:  { windowMs: 60_000, maxRequests: 60 },   // 60/min (was 120)
  /** /api/translate — 번역 엔진 프록시 */
  translate: { windowMs: 60_000, maxRequests: 30 },
  /** /api/upload — 문서 파싱 */
  upload: { windowMs: 60_000, maxRequests: 24 },
} as const;

/**
 * Extract client IP from NextRequest headers.
 *
 * [S2-XFF 방어, 2026-04-24] 우선순위:
 *   1) x-vercel-forwarded-for — Vercel 엣지만 생성, 클라이언트 위조 불가 (Vercel 환경 한정)
 *   2) x-real-ip — Vercel 엣지가 실제 client IP 로 덮어쓰기
 *   3) x-forwarded-for — 일반 프록시 체인 (client 가 앞부분 위조 가능하나 Vercel 이 실제 IP prepend)
 *   4) 'unknown' — fallback
 *
 * Vercel 프로덕션에선 1/2 가 정상 제공되므로 XFF 스푸핑 내성 확보.
 * Self-host 또는 다른 reverse proxy 환경에선 1 이 없으므로 3 로 폴백 — defense-in-depth 유지.
 */
export function getClientIp(headers: Headers): string {
  const vercelFwd = headers.get('x-vercel-forwarded-for');
  if (vercelFwd) {
    const first = vercelFwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

// IDENTITY_SEAL: PART-1 | role=shared rate limiter | inputs=ip,route,config | outputs=allowed,retryAfterMs
// IDENTITY_SEAL: PART-2 | role=rate limit profiles | inputs=none | outputs=preset configs
