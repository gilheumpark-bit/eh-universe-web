// ============================================================
// PART 1 — Module Header
// ============================================================
// request-context — AsyncLocalStorage 기반 request-scoped trace_id 전파.
//
// [P4 루프3/senior-architect, 2026-06-08] 수리:
//   25 API route 가 Firebase token 검증하지만 logger 와 trace 연결 부재.
//   x-request-id header (또는 자체 생성 UUID) 를 logger 호출에 자동 첨부.
//
// 정책:
//   - Edge runtime: AsyncLocalStorage 없음 → globalThis 기반 fallback (request 별 격리는 약함, best-effort)
//   - Node runtime: AsyncLocalStorage 사용 (정상 격리)
//   - logger.ts 가 emit 시점에 getRequestContext() 조회 → trace_id 자동 첨부
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

export interface RequestContext {
  /** Trace ID — incoming x-request-id 또는 server-generated UUID. */
  traceId: string;
  /** Correlation ID — 같은 user session 의 다중 요청 묶음 (옵션). */
  correlationId?: string;
  /** Route path (예: '/api/chat') — debugging 용. */
  route?: string;
  /** Request start ms. */
  startedAt: number;
}

// ============================================================
// PART 3 — AsyncLocalStorage (Node) / fallback (Edge)
// ============================================================

type AlsLike<T> = {
  run<R>(store: T, callback: () => R): R;
  getStore(): T | undefined;
};

let als: AlsLike<RequestContext> | null = null;

// Node runtime 만 AsyncLocalStorage 사용. Edge 는 require 자체 X.
function getAls(): AlsLike<RequestContext> | null {
  if (als) return als;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require('node:async_hooks') as typeof import('node:async_hooks');
    als = new AsyncLocalStorage<RequestContext>();
    return als;
  } catch {
    return null;
  }
}

// Edge fallback — globalThis 기반. request 간 격리 약함 (best-effort).
// SSR/lambda 처리 동시성 1 가정 → 대부분 환경에서 충분.
let edgeFallback: RequestContext | null = null;

// ============================================================
// PART 4 — Public API
// ============================================================

/** 현재 active request context 조회. 없으면 null. */
export function getRequestContext(): RequestContext | null {
  const a = getAls();
  if (a) return a.getStore() ?? null;
  return edgeFallback;
}

/** 현재 trace_id 만 조회 (logger.ts 등). */
export function getCurrentTraceId(): string | null {
  const ctx = getRequestContext();
  return ctx?.traceId ?? null;
}

/**
 * Request 단위 context 로 callback 실행.
 * API route 진입점에서 호출:
 *
 *   await withRequestContext({ traceId, route }, async () => {
 *     return handler(req);
 *   });
 */
export async function withRequestContext<T>(
  ctx: Omit<RequestContext, 'startedAt'>,
  callback: () => Promise<T>,
): Promise<T> {
  const fullCtx: RequestContext = { ...ctx, startedAt: Date.now() };
  const a = getAls();
  if (a) {
    return a.run(fullCtx, callback);
  }
  // Edge fallback — globalThis. concurrency 약하지만 단일 instance 별로는 동작.
  const prev = edgeFallback;
  edgeFallback = fullCtx;
  try {
    return await callback();
  } finally {
    edgeFallback = prev;
  }
}

/**
 * Request header 에서 trace_id 추출. 없으면 crypto.randomUUID() 로 생성.
 *
 * 우선순위:
 *   1) x-request-id (client/proxy 가 명시적으로 제공)
 *   2) traceparent W3C (예: 00-<trace-id>-<span-id>-01) → trace-id 부분만 추출
 *   3) crypto.randomUUID() 자체 생성
 */
export function extractOrCreateTraceId(headers: Headers): string {
  const xrid = headers.get('x-request-id');
  if (xrid && /^[a-zA-Z0-9-]{8,128}$/.test(xrid)) return xrid;

  const traceparent = headers.get('traceparent');
  if (traceparent) {
    // 00-<32 hex>-<16 hex>-<02 flags>
    const m = traceparent.match(/^[0-9a-f]{2}-([0-9a-f]{32})-/i);
    if (m) return m[1];
  }

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 최후 폴백 — Math.random (uuid 호환 안 되지만 trace 용도 충족).
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// IDENTITY_SEAL: PART-1..4 | role=async-local-storage trace propagation | inputs=headers+callback | outputs=context-scoped exec
