import * as Sentry from "@sentry/nextjs";

// DSN은 공개값이지만 환경별 분리를 위해 env 우선 → 하드코딩 폴백
const DEFAULT_DSN = "https://6b8351f49a77ad3ea62ebf749f0193a9@o4511125585068032.ingest.us.sentry.io/4511125587099648";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || DEFAULT_DSN;
// 샘플링 레이트 — 환경별 조절 가능 (프로덕션 기본 10%, 그 외 0%)
const tracesSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1");

Sentry.init({
  dsn,
  tracesSampleRate,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    "Network Error",
    /WebGL.*context lost/i,
    /Failed to fetch/i,
    /Load failed/i
  ],
});
