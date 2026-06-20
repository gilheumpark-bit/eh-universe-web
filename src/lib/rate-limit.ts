// ============================================================
// PART 1 — Types & Backend Interface (pluggable)
// ============================================================
// Used by all API routes to enforce request limits.
// Default backend: in-memory Map (dev). Production should plug Upstash Redis
// via setRateLimitBackend() at server boot — see /docs/adr/0011-rate-limit-backend.md.
//
// [P3 루프2/Senior architect, 2026-06-08] 수리:
//   기존 Map-only 구현은 Vercel 람다 인스턴스마다 독립 → 분산 회피 가능.
//   백엔드를 인터페이스화하여 운영 환경에서 Redis/Edge KV 로 교체 가능하게 함.
//   기본값은 메모리 (dev/test). prod 부팅 시점에 setRateLimitBackend() 호출 필요.

import { logger } from './logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterMs: number;
}

export interface RateLimitBackend {
  /** Atomic check + increment. Returns allowed/retry. */
  check(key: string, config: RateLimitConfig): Promise<RateLimitCheckResult> | RateLimitCheckResult;
  /** Backend identifier for diagnostics ('memory' | 'upstash' | ...). */
  readonly name: string;
}

// ============================================================
// PART 2 — Default in-memory backend (dev/test)
// ============================================================

const MAX_ENTRIES = 2_000;
const CLEANUP_INTERVAL_MS = 60_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class MemoryBackend implements RateLimitBackend {
  readonly name = 'memory';
  private map = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();

  private lazyCleanup(now: number): void {
    if (now - this.lastCleanup < CLEANUP_INTERVAL_MS) return;
    for (const [key, entry] of this.map) {
      if (now > entry.resetAt) this.map.delete(key);
    }
    this.lastCleanup = now;
  }

  check(key: string, config: RateLimitConfig): RateLimitCheckResult {
    const now = Date.now();
    this.lazyCleanup(now);

    const entry = this.map.get(key);

    if (!entry || now > entry.resetAt) {
      // Evict oldest entry if map is full (defense vs. unbounded growth)
      if (this.map.size >= MAX_ENTRIES) {
        const firstKey = this.map.keys().next().value;
        if (firstKey !== undefined) this.map.delete(firstKey);
      }
      this.map.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, retryAfterMs: 0 };
    }

    if (entry.count >= config.maxRequests) {
      return { allowed: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
    }

    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
  }
}

let activeBackend: RateLimitBackend = new MemoryBackend();

/**
 * Replace the active backend (call at server boot before any route handles a request).
 * Production should call this with an Upstash Redis or Cloudflare Workers KV adapter.
 *
 * Example:
 *   import { setRateLimitBackend } from '@/lib/rate-limit';
 *   import { createUpstashBackend } from '@/lib/rate-limit-upstash';
 *   setRateLimitBackend(createUpstashBackend({ url, token }));
 */
export function setRateLimitBackend(backend: RateLimitBackend): void {
  activeBackend = backend;
}

export function resetRateLimitBackendForTests(): void {
  activeBackend = new MemoryBackend();
}

export function getRateLimitBackendName(): string {
  return activeBackend.name;
}

// ============================================================
// PART 3 — Public API (sync facade — memory backend stays sync)
// ============================================================

/**
 * Check if a request from the given IP is within the rate limit.
 *
 * Currently returns sync result (memory backend). If you swap in an async
 * backend (Upstash), use checkRateLimitAsync() instead.
 */
export function checkRateLimit(
  ip: string,
  route: string,
  config: RateLimitConfig,
): RateLimitCheckResult {
  const key = `${route}:${ip}`;
  const result = activeBackend.check(key, config);
  if (result instanceof Promise) {
    logger.error(
      'rate-limit',
      'async backend used via sync checkRateLimit — fail closed; migrate caller to checkRateLimitAsync',
    );
    return { allowed: false, retryAfterMs: config.windowMs };
  }
  return result;
}

/** Async variant — required when backend returns Promise. */
export async function checkRateLimitAsync(
  ip: string,
  route: string,
  config: RateLimitConfig,
): Promise<RateLimitCheckResult> {
  const key = `${route}:${ip}`;
  return Promise.resolve(activeBackend.check(key, config));
}

// ============================================================
// PART 4 — Pre-configured rate limit profiles
// ============================================================

export const RATE_LIMITS = {
  chat:     { windowMs: 60_000, maxRequests: 30 },  // 30/min (was 60)
  imageGen: { windowMs: 60_000, maxRequests: 10 },  // 10/min (was 30)
  default:  { windowMs: 60_000, maxRequests: 60 },   // 60/min (was 120)
  /** /api/translate — 번역 엔진 프록시 */
  translate: { windowMs: 60_000, maxRequests: 30 },
  /** /api/upload — 문서 파싱 */
  upload: { windowMs: 60_000, maxRequests: 24 },
  // [chaos-fix 2026-06-11] /api/vitals 전용 버킷. 한 페이지가 LCP·CLS·INP·FCP·TTFB 등
  // 5개+ 지표를 각각 비콘으로 보내고 CLS/INP 는 값 변동 시 반복 발송 → default(60/min)로는
  // 정상 SPA 탐색만으로 429 발생(카오스 하네스: 전 라우트 재현). 저위험(same-origin·10KB cap·
  // 익명 수집)이라 넉넉히. 클라 측 배치(WebVitalsReporter)와 함께 이중 댐퍼.
  vitals: { windowMs: 60_000, maxRequests: 240 },
} as const;

// ============================================================
// PART 5 — IP extraction (XFF spoofing defense)
// ============================================================

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

// IDENTITY_SEAL: PART-1 | role=rate-limit interface | inputs=key,config | outputs=allowed,retryAfterMs
// IDENTITY_SEAL: PART-2 | role=memory backend (default) | inputs=key,config | outputs=check result
// IDENTITY_SEAL: PART-3 | role=public API facade | inputs=ip,route,config | outputs=check result
// IDENTITY_SEAL: PART-4 | role=rate limit profiles | inputs=none | outputs=preset configs
// IDENTITY_SEAL: PART-5 | role=IP extraction | inputs=headers | outputs=client IP string
