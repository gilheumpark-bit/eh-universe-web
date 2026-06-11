// ============================================================
// Canonical Next.js server instrumentation hook (single source).
// 주의: src/instrumentation.ts 를 다시 만들지 말 것 — Next 16 은 root 와
// src/ 양쪽에서 hook 을 탐색하므로 두 파일이 공존하면 어느 쪽이 로드될지
// 비결정적이고, Sentry server/edge init 이 조용히 죽는다 (H2-sentry).
//
// 포함:
//   - Sentry server/edge init (sentry.server.config / sentry.edge.config)
//   - onRequestError → Sentry captureRequestError
//   - [루프 4 P3] Observability Phase 1 boot signal (ADR-0009 phased 도입)
//     Phase 2 (RED Metrics): @opentelemetry/auto-instrumentations-node 통합 대기
//     — 도입 시 이 register() 안에 init 추가 (별도 파일 생성 금지).
// ============================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  // [Phase 1 boot signal] runtime 식별 + 시작 신호 stdout (Vercel structured logs).
  if (process.env.NODE_ENV === "production") {
    console.log(
      JSON.stringify({
        level: "info",
        event: "instrumentation.boot",
        runtime: process.env.NEXT_RUNTIME ?? "unknown",
        otel_endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? null,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export const onRequestError = async (...args: unknown[]) => {
  const { captureRequestError } = await import("@sentry/nextjs");
  return (captureRequestError as (...a: unknown[]) => unknown)(...args);
};
