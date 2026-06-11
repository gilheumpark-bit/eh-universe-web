// ============================================================
// /api/readiness — Production readiness probe (deep)
// ============================================================
//
// /api/health (env-presence liveness)과 분리. 본 엔드포인트는 실제 downstream
// 의존성을 probe하여 트래픽을 받을 준비가 됐는지 판단한다.
//
// Probes (2s timeout 각):
//   - DGX Spark (vLLM 8001) — SPARK_SERVER_URL/health GET
//   - Firebase Auth REST API — projects/<id>:lookup OPTIONS (auth 없이 401 응답이면 reachable)
//   - Stripe — env var 존재 + secret key prefix 형식 (실 API 호출 없음, cost 보호)
//
// 응답:
//   200 + JSON { status, checks } — 모든 probe OK
//   503 + JSON { status, checks } — 1+ probe fail
//
// 운영:
//   - load balancer / k8s liveness vs readiness 분리 패턴
//   - Vercel은 health-only이지만 모니터링 도구가 readiness 별도 polling 가능
//
// [C] 각 probe try/catch — 한 probe 실패가 다른 probe 차단 안 함.
// [C] 모든 probe AbortSignal.timeout(2000) — 무한 hang 방지.
// [G] Promise.allSettled — 병렬 실행, 전체 2s 안에 응답.
// [K] env 다양화 — SPARK_SERVER_URL / FIREBASE_PROJECT_ID / STRIPE_SECRET_KEY.

import { NextResponse } from 'next/server';
// [P1 루프3 — 2026-06-08] readiness 가 boot path 도 보증 — chat route 미진입 환경에서도 import.
import { getServerAiInitBackend } from '@/lib/server-ai-init';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// ============================================================
// PART 1 — Probe types
// ============================================================

type ProbeStatus = 'ok' | 'warn' | 'fail' | 'skip';

interface ProbeResult {
  status: ProbeStatus;
  /** 사용자 노출 안전 메시지 (구체 endpoint URL / API key 노출 금지). */
  detail?: string;
  /** Probe wall-clock ms. */
  ms: number;
}

const PROBE_TIMEOUT_MS = 2000;

// ============================================================
// PART 2 — Individual probes
// ============================================================

async function probeDgxSpark(): Promise<ProbeResult> {
  const url = process.env.SPARK_SERVER_URL || process.env.NEXT_PUBLIC_SPARK_GATEWAY_URL;
  const t0 = Date.now();
  if (!url) {
    return { status: 'skip', detail: 'SPARK_SERVER_URL not configured', ms: 0 };
  }
  try {
    // vLLM /health endpoint OR /v1/models (vLLM OpenAI-compatible)
    const probe = await fetch(`${url.replace(/\/$/, '')}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      // [security] no auth header sent in probe — DGX should accept anonymous /health
    });
    const ms = Date.now() - t0;
    if (probe.ok) return { status: 'ok', detail: `DGX reachable (${probe.status})`, ms };
    // 401/403/404 는 reachable이지만 endpoint mismatch — warn
    return { status: 'warn', detail: `DGX reached but non-OK (${probe.status})`, ms };
  } catch (err) {
    const ms = Date.now() - t0;
    const msg = err instanceof Error ? err.message : 'fetch failed';
    return { status: 'fail', detail: `DGX unreachable: ${msg.slice(0, 80)}`, ms };
  }
}

async function probeFirebase(): Promise<ProbeResult> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const t0 = Date.now();
  if (!projectId) {
    return { status: 'skip', detail: 'FIREBASE_PROJECT_ID not configured', ms: 0 };
  }
  try {
    // Identity Toolkit REST API 도달 가능성만 확인 — auth 없이 호출
    // 정상 응답은 400 (no body), 도달 자체로 reachability 확인.
    const probe = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:lookup?key=invalid-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'invalid' }),
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      },
    );
    const ms = Date.now() - t0;
    // 400 (bad request) 또는 401 (unauthorized) 모두 reachable 신호.
    if (probe.status >= 400 && probe.status < 500) {
      return { status: 'ok', detail: `Firebase reachable (${probe.status} as expected for invalid key)`, ms };
    }
    if (probe.ok) return { status: 'ok', detail: 'Firebase reachable', ms };
    return { status: 'warn', detail: `Firebase unexpected status ${probe.status}`, ms };
  } catch (err) {
    const ms = Date.now() - t0;
    const msg = err instanceof Error ? err.message : 'fetch failed';
    return { status: 'fail', detail: `Firebase unreachable: ${msg.slice(0, 80)}`, ms };
  }
}

// [P1 루프3 — 2026-06-08] rate-limit backend probe.
// prod 에서 memory 면 분산 enforcement 깨짐 (Vercel multi-lambda). warn 처리.
function probeRateLimitBackend(): ProbeResult {
  const t0 = Date.now();
  const backend = getServerAiInitBackend();
  const isProd = process.env.NODE_ENV === 'production';
  const ms = Date.now() - t0;
  if (backend === 'upstash') {
    return { status: 'ok', detail: 'rate-limit: upstash (distributed)', ms };
  }
  if (isProd) {
    return {
      status: 'warn',
      detail: 'rate-limit: memory (per-lambda) — set UPSTASH_REDIS_REST_URL/_TOKEN for distributed enforcement',
      ms,
    };
  }
  return { status: 'ok', detail: 'rate-limit: memory (dev/test acceptable)', ms };
}

function probeStripe(): ProbeResult {
  const key = process.env.STRIPE_SECRET_KEY;
  const t0 = Date.now();
  if (!key) {
    return { status: 'skip', detail: 'STRIPE_SECRET_KEY not configured', ms: 0 };
  }
  // 실제 API 호출은 비싸므로 env 형식 정합만 확인.
  // sk_live_ / sk_test_ prefix 검증.
  const ok = key.startsWith('sk_live_') || key.startsWith('sk_test_');
  const ms = Date.now() - t0;
  if (ok) return { status: 'ok', detail: 'Stripe key format valid (live API not called)', ms };
  return { status: 'fail', detail: 'Stripe key format invalid', ms };
}

// ============================================================
// PART 3 — Main handler
// ============================================================

const startedAt = Date.now();

export async function GET() {
  const t0 = Date.now();

  // 병렬 probe (Promise.allSettled — 한 probe 실패가 다른 probe 차단 안 함)
  const [dgx, firebase] = await Promise.all([
    probeDgxSpark(),
    probeFirebase(),
  ]);
  const stripe = probeStripe();
  const rateLimit = probeRateLimitBackend();

  const checks: Record<string, ProbeResult> = { dgx, firebase, stripe, rateLimit };

  // 전체 status 판정
  const statuses = Object.values(checks).map((c) => c.status);
  const hasFail = statuses.includes('fail');
  const hasWarn = statuses.includes('warn');
  const status: 'ready' | 'degraded' | 'not_ready' = hasFail
    ? 'not_ready'
    : hasWarn
      ? 'degraded'
      : 'ready';

  const probeMs = Date.now() - t0;
  const uptimeMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      status,
      timestamp: Date.now(),
      uptimeMs,
      probeMs,
      checks,
    },
    {
      status: hasFail ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

// IDENTITY_SEAL: PART-3 | role=readiness-probe | inputs=env+downstream | outputs=JSON{status,checks}
