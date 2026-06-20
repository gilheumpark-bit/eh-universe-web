// ============================================================
// [루프 4 P3 — 2026-06-08] /api/metrics — Prometheus 호환 endpoint stub
// ADR-0009 Phase 2 (RED Metrics) 진입점.
//
// 현재 상태: Phase 1 운영 통계만 노출 (build info, uptime).
// Phase 2 완성 시: @opentelemetry/sdk-metrics 의 PrometheusExporter 가
// 이 endpoint 를 자동 핸들링하도록 instrumentation.ts 에서 연결.
//
// 보안:
//   - GET only — no body 처리.
//   - 환경변수 METRICS_ENABLED=on 일 때만 200 — 기본 503 (production 토글).
//   - Prometheus scrape 만 가정 (no rate limit — 모니터링 인프라가 직접 호출).
//
// Phase 2 미래:
//   - http.server.request.count (route, status_code, method)
//   - http.server.request.duration (histogram)
//   - http.server.request.errors (route, error_type)
// ============================================================

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let bootTime: number | null = null;

export async function GET() {
  if (process.env.METRICS_ENABLED !== 'on') {
    return NextResponse.json(
      {
        error: 'metrics_disabled',
        hint: 'Set METRICS_ENABLED=on to expose Prometheus metrics. See ADR-0009 Phase 2.',
        phase: 1,
      },
      { status: 503 },
    );
  }

  if (bootTime === null) bootTime = Date.now();
  const uptimeMs = Date.now() - bootTime;

  // Prometheus exposition format — Phase 1 stub.
  // Phase 2 시 PrometheusExporter 가 이 응답을 대체.
  const body = [
    '# HELP eh_app_info Build / runtime info',
    '# TYPE eh_app_info gauge',
    `eh_app_info{version="${process.env.npm_package_version ?? 'unknown'}",runtime="${process.env.NEXT_RUNTIME ?? 'nodejs'}"} 1`,
    '',
    '# HELP eh_app_uptime_seconds Uptime since boot',
    '# TYPE eh_app_uptime_seconds counter',
    `eh_app_uptime_seconds ${Math.floor(uptimeMs / 1000)}`,
    '',
    '# HELP eh_app_phase Observability ADR-0009 phase (1=logs, 2=metrics, 3=traces, 4=slo)',
    '# TYPE eh_app_phase gauge',
    'eh_app_phase 1',
    '',
  ].join('\n');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
