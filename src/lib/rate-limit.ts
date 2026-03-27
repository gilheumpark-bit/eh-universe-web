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

// Global shared map — singleton across all route imports in the same serverless instance
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
  chat:     { windowMs: 60_000, maxRequests: 60 },
  imageGen: { windowMs: 60_000, maxRequests: 30 },
  default:  { windowMs: 60_000, maxRequests: 120 },
} as const;

/**
 * Extract client IP from NextRequest headers.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// IDENTITY_SEAL: PART-1 | role=shared rate limiter | inputs=ip,route,config | outputs=allowed,retryAfterMs
// IDENTITY_SEAL: PART-2 | role=rate limit profiles | inputs=none | outputs=preset configs
