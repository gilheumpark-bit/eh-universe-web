import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./sentry-scrub";
import { hasAnalyticsConsent, CONSENT_CHANGE_EVENT } from "./src/lib/consent";

// [A1 2026-04-24 → H2 2026-06-11] 쿠키 동의 상태 확인 — "accepted" 일 때만 Sentry 초기화.
// GDPR Art.7 · ePrivacy · K-PIPA 대응 — 분석 목적 에러 모니터링은 사용자 동의 필요.
// 동의 상태 단일 소스 = src/lib/consent.ts (localStorage["eh-cookie-consent"]).
// [H2 2026-06-11] lazy init — 동의가 세션 중 "accepted" 로 바뀌면 리로드 없이 즉시 초기화.
// beforeSend 에서도 동의 재확인 (런타임 철회 시 이벤트 0 보장 — defense-in-depth).

// DSN — env 필수. 미설정 시 Sentry 완전 무동작 (하드코딩 폴백 제거, 2026-04-24)
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1");

// [A10 fix — 2026-05-12] release tag — 클라이언트 측에는 NEXT_PUBLIC_BUILD_SHA 만 노출 가능.
// 빌드 타임에 Vercel/GitHub Actions 가 주입 (vercel.json env 또는 ci.yml).
const release =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
  process.env.NEXT_PUBLIC_BUILD_SHA ||
  undefined;

let initialized = false;
let warnedNoDsn = false;

/**
 * 활성 조건 3중 — DSN 설정 + 프로덕션 + 분석 동의.
 * 조건 미충족 시 Sentry.init 자체를 호출하지 않음 → captureException 등 전부 no-op
 * (동의 전 이벤트 0 보장). 동의가 나중에 떨어지면 consent-changed 이벤트로 재시도.
 */
export function initSentryClient(): void {
  if (initialized) return;
  if (!dsn) {
    // DSN 부재 — 완전 무동작. 경고는 1회만 (prod 빌드에서 console.warn 은 유지됨).
    if (!warnedNoDsn && process.env.NODE_ENV === "production") {
      console.warn("[Sentry client] NEXT_PUBLIC_SENTRY_DSN unset — error reporting DISABLED");
      warnedNoDsn = true;
    }
    return;
  }
  if (process.env.NODE_ENV !== "production") return;
  if (!hasAnalyticsConsent()) return;

  initialized = true;
  Sentry.init({
    dsn,
    release,
    tracesSampleRate,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      "Network Error",
      /WebGL.*context lost/i,
      /Failed to fetch/i,
      /Load failed/i
    ],
    // PII / secret / 원고 본문 전수 치환 + 런타임 동의 철회 시 drop (null)
    beforeSend: (event) => (hasAnalyticsConsent() ? scrubSentryEvent(event) : null),
    beforeBreadcrumb: (breadcrumb) =>
      hasAnalyticsConsent() ? scrubSentryEvent(breadcrumb) : null,
  });
}

initSentryClient();

// 동의 배너에서 "accepted" 선택 시 리로드 없이 즉시 초기화 (rejected 면 initSentryClient 가 no-op).
if (typeof window !== "undefined") {
  window.addEventListener(CONSENT_CHANGE_EVENT, () => initSentryClient());
}
