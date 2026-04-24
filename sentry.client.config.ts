import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./sentry-scrub";

// DSN — env 필수. 미설정 시 Sentry 비활성화 (하드코딩 폴백 제거, 2026-04-24)
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1");

Sentry.init({
  dsn,
  tracesSampleRate,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    "Network Error",
    /WebGL.*context lost/i,
    /Failed to fetch/i,
    /Load failed/i
  ],
  // PII / secret 전수 치환 (API 키, 이메일, Bearer 토큰, 카드번호 등)
  beforeSend: scrubSentryEvent,
  beforeBreadcrumb: (breadcrumb) => scrubSentryEvent(breadcrumb),
});
