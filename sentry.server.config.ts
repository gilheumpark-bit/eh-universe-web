import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./sentry-scrub";

// DSN — env 필수. 미설정 시 Sentry 비활성화 (하드코딩 폴백 제거, 2026-04-24)
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1");

// [A10 fix — 2026-05-12] release tag — Vercel/GitHub Actions 에서 자동 주입되는 SHA 우선,
// 누락 시 NEXT_PUBLIC_BUILD_SHA fallback. 에러 → 배포 SHA 매핑 핵심.
const release =
  process.env.SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.NEXT_PUBLIC_BUILD_SHA ||
  undefined;

// [A2 fix — 2026-05-12] DSN 누락 시 silent disable 대신 명시적 stderr 경고 — 운영자에게 신호.
if (!dsn && process.env.NODE_ENV === "production") {
  // eslint-disable-next-line no-console
  console.warn("[Sentry server] DSN unset — error reporting DISABLED in production");
}

Sentry.init({
  dsn,
  release,
  tracesSampleRate,
  environment: process.env.NODE_ENV,
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
  // 서버 측 PII / secret 치환 — API 키 / Bearer / 이메일 / 카드번호 등
  beforeSend: scrubSentryEvent,
  beforeBreadcrumb: (breadcrumb) => scrubSentryEvent(breadcrumb),
});
