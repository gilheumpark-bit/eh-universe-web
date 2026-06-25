// ============================================================
// api-logger — Structured JSON logging for API routes
// Vercel captures stdout as structured logs automatically.
//
// [루프 2 P4 — 2026-06-08] Observability 3-Pillar 도입 계획 확정:
//   현재: Logs (이 모듈) 만, 28 API routes 중 3/28 만 wrapper 사용.
//   대기: Metrics (RED/USE), Traces (OpenTelemetry), SLO 정의.
//   계획: ADR-0009 'Observability Standard' (docs/adr/0009-observability-standard.md)
//         Phase 1 (alpha→beta): Logs 일원화 (이 모듈 확장)
//         Phase 2 (beta): RED Metrics via @opentelemetry/api-metrics
//         Phase 3 (pre-commercial): Traces via @opentelemetry/sdk-node
//         Phase 4 (commercial): SLO 정의 + alerting
//   추적: claude3 _observability 표준 정합화 (Logs/Metrics/Traces, OTel, structured logs, SLO).
//   현재 단계는 single-pillar — production 차단 사항 아님이나 본격 commercial scale 전 완성 필요.
// ============================================================

import { recordApiMetric } from '@/lib/observability/runtime-metrics';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  route: string;
  ip?: string;
  provider?: string;
  model?: string;
  requestId?: string;
  durationMs?: number;
  status?: number;
  error?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

/** Emit a structured JSON log line to stdout/stderr (Vercel captures these automatically) */
export function apiLog(entry: Omit<LogEntry, 'timestamp'>): void {
  const log: LogEntry = { ...entry, timestamp: new Date().toISOString() };
  recordApiMetric({
    route: entry.route,
    event: entry.event,
    status: entry.status,
    durationMs: entry.durationMs,
  });
  if (entry.level === 'error') {
    console.error(JSON.stringify(log));
  } else {
    console.log(JSON.stringify(log));
  }
}

/** @returns Timer object with `elapsed()` method for measuring API route duration in ms */
export function createRequestTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}

// IDENTITY_SEAL: PART-1 | role=structured-logging | inputs=log entries | outputs=JSON to stdout
