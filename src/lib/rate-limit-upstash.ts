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
 * INCRBY 로 먼저 원자적 예약 → post-increment 값이 한도 초과면 동일 amt 만큼
 * 되돌리고(compensating INCRBY -amt) reject. TOCTOU race 없이 한도 enforce.
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
    // [fix] line 155 TOCTOU: GET-then-INCRBY 사이에 동시 요청이 같은 current 를
    //   읽고 모두 통과 후 각자 INCRBY → 일일 한도 초과(overshoot). 원자적 reserve 로 교정:
    //   먼저 INCRBY 로 예약(반환값은 post-increment 라 동시 요청끼리 공유 불가) 후
    //   결과가 한도를 넘으면 동일 amt 만큼 되돌린다(compensating INCRBY -amt).
    const [incrRes, , pttlRes] = await upstashPipeline(cfg, [
      ['INCRBY', redisKey, amt],
      ['PEXPIRE', redisKey, windowMsClamped, 'NX'],
      ['PTTL', redisKey],
    ]);
    const usedAfter = typeof incrRes.result === 'number' ? incrRes.result : amt;
    const pttl = typeof pttlRes.result === 'number' && pttlRes.result > 0 ? pttlRes.result : windowMsClamped;

    if (usedAfter > limit) {
      // [fix] 한도 초과 — 방금 더한 amt 를 원자적으로 되돌려 다른 요청 카운터를 오염시키지 않음.
      //   되돌린 뒤의 실제 사용량(usedBefore)을 보고. roll-back 실패해도 fail-open catch 로 흡수.
      const [decrRes] = await upstashPipeline(cfg, [['INCRBY', redisKey, -amt]]);
      const usedBefore = typeof decrRes.result === 'number' ? decrRes.result : Math.max(0, usedAfter - amt);
      return { allowed: false, used: usedBefore, remaining: Math.max(0, limit - usedBefore), resetMs: pttl };
    }

    return { allowed: true, used: usedAfter, remaining: Math.max(0, limit - usedAfter), resetMs: pttl };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('rate-limit-upstash', 'token budget failed, fail-open', (err as Error).message);
    }
    // fail-open — 비용 폭주 방어보다 가용성 우선 (memory backend 가 lambda 단위 보호).
    return { allowed: true, used: 0, remaining: limit, resetMs: windowMsClamped };
  }
}

// IDENTITY_SEAL: PART-1..5 | role=upstash rate-limit backend | inputs=UpstashConfig+key+config | outputs=RateLimitCheckResult|TokenBudget
