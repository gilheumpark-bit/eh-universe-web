import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./sentry-scrub";

// [A1 2026-04-24] 쿠키 동의 상태 확인 — "accepted" 일 때만 Sentry 초기화.
// GDPR Art.7 · ePrivacy 대응 — 분석 목적 에러 모니터링은 사용자 동의 필요.
// 참고: SSR/빌드 시점에는 window undefined → false 반환 (서버 측은 sentry.server.config 에서 처리).
function hasClientAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('eh-cookie-consent') === 'accepted';
  } catch {
    return false;
  }
}

// DSN — env 필수. 미설정 시 Sentry 비활성화 (하드코딩 폴백 제거, 2026-04-24)
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1");
const consented = hasClientAnalyticsConsent();

Sentry.init({
  dsn,
  tracesSampleRate,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  // 활성 조건 3중 — DSN 설정 + 프로덕션 + 분석 동의
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production" && consented,
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
