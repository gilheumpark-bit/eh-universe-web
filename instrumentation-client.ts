// ============================================================
// instrumentation-client.ts — Next.js 15.3+/16 클라이언트 계측 진입점
// ============================================================
// [H2 2026-06-11] Next 16 은 dev/build 모두 Turbopack 기본 — Sentry webpack
// 플러그인의 sentry.client.config.ts 자동 주입이 동작하지 않아 클라이언트
// Sentry 가 영원히 init 안 되는 상태였음. Next 파일 컨벤션인 이 파일이
// 번들러와 무관하게 앱 코드보다 먼저 로드되므로 여기서 클라이언트 init 수행.
// 실제 init 로직(동의 게이트·DSN 가드·PII 스크럽)은 sentry.client.config.ts 유지.
// ============================================================

import * as Sentry from "@sentry/nextjs";
import "./sentry.client.config";

// App Router 네비게이션 트랜잭션 계측 (Sentry 공식 권장 export)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
