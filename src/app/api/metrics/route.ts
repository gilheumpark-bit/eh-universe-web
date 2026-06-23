// ============================================================
// [루프 4 P3 — 2026-06-08] /api/metrics — Prometheus 호환 endpoint
// ADR-0009 Phase 2 (RED Metrics) 진입점.
//
// 현재 상태: Phase 1 운영 통계만 노출 (build info, uptime).
// Phase 2 완성 시: @opentelemetry/sdk-metrics 의 PrometheusExporter 가
// 이 endpoint 를 자동 핸들링하도록 instrumentation.ts 에서 연결.
//
// 보안:
//   - GET only — no body 처리.
//   - 환경변수 METRICS_ENABLED=on 일 때만 200 — 기본 503 (production 토글).
//   - METRICS_BEARER_TOKEN 설정 시 Authorization: Bearer <token> 필수.
//   - production 에서 토큰 없이 활성화하면 503 fail-closed.
//
// Phase 2 미래:
//   - http.server.request.count (route, status_code, method)
//   - http.server.request.duration (histogram)
//   - http.server.request.errors (route, error_type)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { snapshotRuntimeMetrics } from '@/lib/observability/runtime-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let bootTime: number | null = null;

function escapePromLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function apiLabels(row: { route: string; event: string; status: string }): string {
  return `route="${escapePromLabel(row.route)}",event="${escapePromLabel(row.event)}",status="${escapePromLabel(row.status)}"`;
}

function webVitalLabels(row: { name: string; rating: string }): string {
  return `name="${escapePromLabel(row.name)}",rating="${escapePromLabel(row.rating)}"`;
}

function checkMetricsAuth(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.METRICS_BEARER_TOKEN?.trim();
  if (expected) {
    const authHeader = req.headers.get('authorization');
    return authHeader === `Bearer ${expected}`
      ? { ok: true }
      : { ok: false, status: 401, error: 'metrics_auth_required' };
  }

  if (process.env.NODE_ENV === 'production') {
    return { ok: false, status: 503, error: 'metrics_token_required' };
  }

  return { ok: true };
}

export async function GET(req: NextRequest) {
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

  const auth = checkMetricsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (bootTime === null) bootTime = Date.now();
  const uptimeMs = Date.now() - bootTime;
  const snapshot = snapshotRuntimeMetrics();
  const apiMetricLines = snapshot.api.flatMap((row) => {
    const labels = apiLabels(row);
    return [
      `eh_api_requests_total{${labels}} ${row.count}`,
      `eh_api_request_duration_ms_count{${labels}} ${row.durationCount}`,
      `eh_api_request_duration_ms_sum{${labels}} ${row.durationSumMs}`,
      `eh_api_request_duration_ms_p95{${labels}} ${row.durationP95Ms}`,
    ];
  });
  const webVitalMetricLines = snapshot.webVitals.flatMap((row) => {
    const labels = webVitalLabels(row);
    return [
      `eh_web_vitals_total{${labels}} ${row.count}`,
      `eh_web_vitals_value_count{${labels}} ${row.valueCount}`,
      `eh_web_vitals_value_sum{${labels}} ${row.valueSum}`,
      `eh_web_vitals_value_p75{${labels}} ${row.valueP75}`,
    ];
  });

  // Prometheus exposition format — alpha runtime counters.
  // OTel exporter 전 단계에서도 RED(request/error/duration) 지표를 볼 수 있게 한다.
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
    'eh_app_phase 2',
    '',
    '# HELP eh_api_requests_total API request count captured by apiLog',
    '# TYPE eh_api_requests_total counter',
    '# HELP eh_api_request_duration_ms API request duration captured by apiLog',
    '# TYPE eh_api_request_duration_ms summary',
    ...apiMetricLines,
    '',
    '# HELP eh_web_vitals_total Web Vitals sample count captured by /api/vitals',
    '# TYPE eh_web_vitals_total counter',
    '# HELP eh_web_vitals_value Web Vitals value summary captured by /api/vitals',
    '# TYPE eh_web_vitals_value summary',
    ...webVitalMetricLines,
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
