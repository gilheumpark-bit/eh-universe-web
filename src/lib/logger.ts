// ============================================================
// PART 1 — Module Header
// ============================================================
// logger — Structured JSON logger for client/server consistency.
//
// [P19 루프2/중급+Senior, 2026-06-08] 수리:
//   기존: console wrapper. 단순 string concat → OpenTelemetry/Datadog correlation 어려움.
//   목표: structured JSON output (선택형). 기존 string ctx API 는 유지 (역호환).
//   ADR-0009 (Observability) Phase 1 의 일환.
//
// 두 API 동시 지원:
//   1) string ctx (역호환) — logger.info('keyboard-manager', 'ctrl+p triggered')
//   2) object meta (신규) — logger.info({ component: 'keyboard-manager', event: 'handler_threw', meta: {...} })
//
// 출력 형식:
//   - dev:  human-readable [component] event meta…
//   - prod: JSON one-liner { ts, level, component, event, meta }
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogEntry {
  /** 발생 모듈 / 컴포넌트 */
  component: string;
  /** 이벤트 이름 (snake_case 권장) */
  event?: string;
  /** 임의 메타 데이터 */
  meta?: Record<string, unknown>;
  /** 명시적 에러 객체 */
  error?: unknown;
  /**
   * [P4 루프3 — 2026-06-08] trace_id — request-scoped 추적 ID.
   * 명시 안 하면 request-context.ts 의 AsyncLocalStorage 에서 자동 추출.
   * 클라이언트 측 호출은 보통 undefined → 서버 측 logging 만 자동 첨부.
   */
  trace_id?: string;
}

const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';

// ============================================================
// PART 3 — Internal emit
// ============================================================

function emitStructured(level: LogLevel, entry: StructuredLogEntry): void {
  const ts = new Date().toISOString();
  // [P4 루프3 — 2026-06-08] trace_id 자동 첨부 — entry 가 명시 안 하면 ALS 에서 추출.
  // logger 가 request-context 를 직접 import 하면 client 번들 size 영향 → 동적 require (server only).
  let traceId = entry.trace_id;
  if (!traceId && typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ctx = require('./request-context') as typeof import('./request-context');
      traceId = ctx.getCurrentTraceId() ?? undefined;
    } catch {
      // request-context 미존재 또는 require 실패 → silent.
    }
  }
  const obj = {
    ts,
    level,
    component: entry.component,
    event: entry.event,
    meta: entry.meta,
    ...(traceId && { trace_id: traceId }),
    ...(entry.error !== undefined && {
      error:
        entry.error instanceof Error
          ? { name: entry.error.name, message: entry.error.message, stack: entry.error.stack }
          : String(entry.error),
    }),
  };
  // prod: JSON 한 줄 (Vercel / Datadog 파싱 친화)
  // dev: human-readable
  if (isProd) {
    const out = JSON.stringify(obj);
    if (level === 'error') console.error(out);
    else if (level === 'warn') console.warn(out);
    else console.log(out);
  } else {
    const tag = `[${entry.component}]`;
    const evt = entry.event ? ` ${entry.event}` : '';
    if (level === 'error') console.error(tag + evt, entry.meta ?? '', entry.error ?? '');
    else if (level === 'warn') console.warn(tag + evt, entry.meta ?? '', entry.error ?? '');
    else if (level === 'debug') console.debug(tag + evt, entry.meta ?? '');
    else console.log(tag + evt, entry.meta ?? '');
  }
}

function emitLegacy(level: LogLevel, ctx: string, args: unknown[]): void {
  // 역호환 경로 — 기존 호출자 (logger.info('module', 'msg', ...)) 유지.
  // prod 에서는 string concat → JSON 1줄 (meta 에 raw args 보관).
  if (isProd) {
    emitStructured(level, { component: ctx, event: 'legacy', meta: { args } });
    return;
  }
  // dev 는 기존 출력 형식 유지
  const formatted = ctx ? [`[${ctx}]`, ...args] : args;
  if (level === 'error') console.error(...formatted);
  else if (level === 'warn') console.warn(...formatted);
  else if (level === 'debug') console.debug(...formatted);
  else console.log(...formatted);
}

// ============================================================
// PART 4 — Public API
// ============================================================

/**
 * 두 시그니처:
 *   1) logger.info('component-name', 'message', ...extras)        — 역호환 string ctx
 *   2) logger.info({ component, event, meta, error })             — structured
 * 객체 첫 인자 (typeof === 'object' && !Array) 면 structured 로 분기.
 */
function makeLevel(level: LogLevel) {
  return function (...args: unknown[]): void {
    const first = args[0];
    // info/debug 는 production 에서 noop
    if ((level === 'info' || level === 'debug') && isProd) return;

    if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
      emitStructured(level, first as StructuredLogEntry);
      return;
    }
    const ctx = typeof first === 'string' ? first : '';
    const rest = ctx === first ? args.slice(1) : args;
    emitLegacy(level, ctx, rest);
  };
}

export const logger = {
  debug: makeLevel('debug'),
  info: makeLevel('info'),
  warn: makeLevel('warn'),
  error: makeLevel('error'),
};

export default logger;

// IDENTITY_SEAL: PART-1..4 | role=structured-logger | inputs=(string,...)|StructuredLogEntry | outputs=stdout/stderr
