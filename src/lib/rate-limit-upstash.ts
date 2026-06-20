// ============================================================
// PART 1 — Module Header
// ============================================================
// rate-limit-upstash — Upstash Redis backend for distributed rate-limiting.
//
// [P1 루프3/senior-architect+UX, 2026-06-08] 수리:
//   In-memory Map 은 Vercel lambda instance 마다 독립 → 분산 enforcement 깨짐.
//   prod boot 시 setRateLimitBackend(createUpstashBackend({url, token})) 호출하여
//   모든 instance 가 동일 Redis 카운터 공유.
//
// 의존성 0 — Upstash REST API 만 사용 (fetch). 패키지 추가 안 함.
//   ENV: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
//
// 동작:
//   - INCR key + EXPIRE key windowSec (TTL=window) 가 atomic pipeline.
//   - count > maxRequests → 차단. PTTL key 로 retryAfter 계산.
//   - REST API 실패 → fail-open (allowed=true). 로그만 남기고 사용자 차단 X.
// ============================================================

import type { RateLimitBackend, RateLimitConfig, RateLimitCheckResult } from './rate-limit';
import { logger } from './logger';

// ============================================================
// PART 2 — Config types
// ============================================================

export interface UpstashConfig {
  /** Upstash REST URL (https://<region>-<id>.upstash.io) */
  url: string;
  /** Upstash REST token */
  token: string;
  /** Key prefix (default: 'rl:') */
  prefix?: string;
  /** Fetch timeout ms (default 1500) */
  timeoutMs?: number;
}

// ============================================================
// PART 3 — Internal: pipeline call
// ============================================================

interface PipelineResult {
  result: unknown;
}

async function upstashPipeline(
  cfg: UpstashConfig,
  commands: ReadonlyArray<ReadonlyArray<string | number>>,
): Promise<PipelineResult[]> {
  const url = `${cfg.url.replace(/\/$/, '')}/pipeline`;
  const timeoutMs = cfg.timeoutMs ?? 1500;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`upstash pipeline failed: ${res.status}`);
  }
  return (await res.json()) as PipelineResult[];
}

// ============================================================
// PART 4 — Upstash backend factory
// ============================================================

/**
 * Build an Upstash Redis-backed rate-limit backend.
 *
 * Atomic per-key sequence:
 *   1) INCR rl:<key>
 *   2) PEXPIRE rl:<key> windowMs NX  (first request sets TTL; later requests no-op)
 *   3) PTTL rl:<key>                 (for retryAfter)
 *
 * Fail mode: any REST error → fail-open (allowed=true, retryAfterMs=0).
 * Distributed key collision: prefix isolated (`rl:<route>:<ip>`).
 */
export function createUpstashBackend(cfg: UpstashConfig): RateLimitBackend {
  const prefix = cfg.prefix ?? 'rl:';

  return {
    name: 'upstash',
    async check(key: string, config: RateLimitConfig): Promise<RateLimitCheckResult> {
      const redisKey = `${prefix}${key}`;
      const windowMs = Math.max(1, Math.floor(config.windowMs));

      try {
        const [incrRes, , pttlRes] = await upstashPipeline(cfg, [
          ['INCR', redisKey],
          // PEXPIRE NX — only set if no TTL yet (= first request in window).
          ['PEXPIRE', redisKey, windowMs, 'NX'],
          ['PTTL', redisKey],
        ]);

        const count = typeof incrRes.result === 'number' ? incrRes.result : 0;
        const pttl = typeof pttlRes.result === 'number' ? pttlRes.result : windowMs;

        if (count > config.maxRequests) {
          return {
            allowed: false,
            retryAfterMs: pttl > 0 ? pttl : windowMs,
          };
        }
        return { allowed: true, retryAfterMs: 0 };
      } catch (err) {
        // fail-open — Redis 장애가 사용자 차단 유발하지 않도록.
        // 운영에서 backend 변경 감지 (getRateLimitBackendName === 'upstash') 후
        // probe 별도로 alarm 거는 게 정석.
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('rate-limit-upstash', 'check failed, fail-open', (err as Error).message);
        }
        return { allowed: true, retryAfterMs: 0 };
      }
    },
  };
}

// ============================================================
// PART 5 — Token budget (atomic INCRBY) for chat/route.ts
// ============================================================

export interface UpstashTokenBudget {
  /** 현재 누적 토큰 + 남은 토큰 + reset ms */
  used: number;
  remaining: number;
  resetMs: number;
}

/**
 * Reserve token budget atomically.
 *
 * GET 누적 → 이미 한도 초과면 reject. 한도 미만이면 INCRBY 로 reserve.
 * 첫 사용 시 PEXPIRE NX 로 일일 TTL 설정.
 */
export async function reserveTokenBudgetUpstash(
  cfg: UpstashConfig,
  key: string,
  amount: number,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; used: number; remaining: number; resetMs: number }> {
  const prefix = cfg.prefix ?? 'rl:';
  const redisKey = `${prefix}tok:${key}`;
  const windowMsClamped = Math.max(1, Math.floor(windowMs));
  const amt = Math.max(0, Math.floor(amount));

  try {
    // Step 1: 현재 사용량 확인.
    const [getRes] = await upstashPipeline(cfg, [['GET', redisKey]]);
    const currentRaw = getRes.result;
    const current = typeof currentRaw === 'string' ? parseInt(currentRaw, 10) || 0 : 0;

    if (current >= limit || current + amt > limit) {
      // 이미 초과 — TTL 만 조회해서 reset 정확화.
      const [pttlRes] = await upstashPipeline(cfg, [['PTTL', redisKey]]);
      const pttl = typeof pttlRes.result === 'number' && pttlRes.result > 0 ? pttlRes.result : windowMsClamped;
      return { allowed: false, used: current, remaining: 0, resetMs: pttl };
    }

    // Step 2: reserve.
    const [incrRes, , pttlRes] = await upstashPipeline(cfg, [
      ['INCRBY', redisKey, amt],
      ['PEXPIRE', redisKey, windowMsClamped, 'NX'],
      ['PTTL', redisKey],
    ]);
    const used = typeof incrRes.result === 'number' ? incrRes.result : current + amt;
    const pttl = typeof pttlRes.result === 'number' && pttlRes.result > 0 ? pttlRes.result : windowMsClamped;

    return { allowed: true, used, remaining: Math.max(0, limit - used), resetMs: pttl };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('rate-limit-upstash', 'token budget failed, fail-open', (err as Error).message);
    }
    // fail-open — 비용 폭주 방어보다 가용성 우선 (memory backend 가 lambda 단위 보호).
    return { allowed: true, used: 0, remaining: limit, resetMs: windowMsClamped };
  }
}

// IDENTITY_SEAL: PART-1..5 | role=upstash rate-limit backend | inputs=UpstashConfig+key+config | outputs=RateLimitCheckResult|TokenBudget
