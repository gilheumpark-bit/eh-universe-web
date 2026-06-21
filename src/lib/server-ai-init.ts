// ============================================================
// PART 1 — Module Header
// ============================================================
// server-ai-init — Server-side AI / rate-limit boot.
//
// [P1 루프3/senior-architect+UX, 2026-06-08] 수리:
//   Vercel lambda instance 마다 in-memory Map 독립 → 분산 rate-limit 깨짐.
//   이 모듈은 module-eval 시점에 한 번만 실행되어,
//     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN 가 있으면
//     setRateLimitBackend(createUpstashBackend(...)) 자동 호출.
//   API route 1개에서라도 import 하면 boot 됨 (Next.js Edge/Node 양쪽 호환).
//
// 안전 정책:
//   - env 없음 → 메모리 backend 유지 (dev/test). 경고 1회 (prod 만).
//   - import side-effect 최소화 — 한 번만 실행되도록 internal flag.
//   - throw 금지 — boot 실패가 route 자체를 막지 않게.
//
// 사용:
//   import '@/lib/server-ai-init';   // (chat/route.ts 등 entry 에서 단 한 번)
//
// ADR-0011 (rate-limit backend) prod boot path 의 정식 등록 지점.
// ============================================================

import { setRateLimitBackend, getRateLimitBackendName } from './rate-limit';
import { createUpstashBackend, type UpstashConfig } from './rate-limit-upstash';
import { logger } from './logger';

// ============================================================
// PART 2 — Boot guard (module-eval once)
// ============================================================

let booted = false;
let bootResult: 'upstash' | 'memory' = 'memory';
const PROD_MEMORY_WARNING_KEY = '__loreguardServerAiInitProdMemoryWarning__';

function shouldLogProdMemoryWarning(): boolean {
  const scope = globalThis as typeof globalThis & {
    [PROD_MEMORY_WARNING_KEY]?: boolean;
  };
  if (scope[PROD_MEMORY_WARNING_KEY]) return false;
  scope[PROD_MEMORY_WARNING_KEY] = true;
  return true;
}

function bootRateLimit(): void {
  if (booted) return;
  booted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const isProd = process.env.NODE_ENV === 'production';
  const isE2EServer = process.env.LOREGUARD_E2E === '1';
  const isProductionBuild =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build';

  if (url && token) {
    const cfg: UpstashConfig = {
      url,
      token,
      prefix: 'rl:',
      timeoutMs: 1500,
    };
    setRateLimitBackend(createUpstashBackend(cfg));
    bootResult = 'upstash';
    return;
  }

  bootResult = 'memory';
  if (isProd && !isE2EServer && !isProductionBuild && shouldLogProdMemoryWarning()) {
    // 운영에서 in-memory 면 분산 회피 가능 — 1회 경고. crash 는 X (graceful).
    logger.warn(
      'server-ai-init',
      'PROD running with memory rate-limit backend. ' +
      'Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable distributed enforcement.',
    );
  }
}

// Module eval — 자동 실행.
bootRateLimit();

// ============================================================
// PART 3 — Diagnostics API
// ============================================================

/**
 * Boot 결과 (readiness probe 등에서 사용).
 * - 'upstash': 분산 backend 활성
 * - 'memory': lambda-local backend (dev/test 또는 prod env 누락)
 */
export function getServerAiInitBackend(): 'upstash' | 'memory' {
  return bootResult;
}

/** rate-limit backend name 직접 조회 (rate-limit 모듈 단일 source). */
export function getCurrentRateLimitBackend(): string {
  return getRateLimitBackendName();
}

// IDENTITY_SEAL: PART-1..3 | role=server-ai/rate-limit boot | inputs=env vars | outputs=backend installed
