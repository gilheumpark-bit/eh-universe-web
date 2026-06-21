# Auth Matrix — API routes × CSRF/Auth/Rate-limit/Tier

**Status**: Living doc (2026-06-21 — Backend 7축 점검: 공유 링크 인증화, 출고 크레딧 origin guard, metrics token gate 반영).
**Owner**: gilheumpark.
**Related**: ADR-0011 (rate-limit), `lib/firebase-id-token.ts`, `lib/verify-csrf.ts`.

## 정책 (Policy)

| Axis | 강제 시점 | 미적용 시 응답 |
|------|----------|--------------|
| **public** | 인증/CSRF 없이 접근 가능 | n/a (의도적 공개) |
| **rate-limited** | `checkRateLimit()` 호출 필요 | 429 + Retry-After |
| **authenticated** | `verifyFirebaseIdToken()` 통과 | 401 |
| **csrf-verified** | `verifyCsrf()` 또는 `checkSameOriginHeaders()` 통과 (POST/PUT/PATCH/DELETE) | 403 |
| **tier-gated** | Stripe role / Firebase custom claim 매칭 | 402/403 |

## 매트릭스 (Matrix)

> 표는 `src/app/api/**/route.ts` 의 실제 import + middleware 호출 패턴 기준.
> 신규 route 추가 시 표 갱신 + `auth-coverage.test.ts` 통과 필수.

### POST / mutating endpoints (CSRF 필수 권장)

| Route | Public | Rate-limited | Auth | CSRF | Tier | 비고 |
|-------|:------:|:------------:|:----:|:----:|:----:|------|
| `/api/chat` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim/BYOK | Hosted 노아 대화. Free 일일 제공량, Pro 무제한, BYOK 제한 면제 |
| `/api/checkout` (POST) | ✗ | ✓ | ✓ | ✓ | env-gated | Stripe 구독 checkout. Bearer 인증 + `FEATURE_STRIPE_CHECKOUT=on` |
| `/api/release-credit/checkout` (POST) | ✗ | ✓ | ✓ | ✓ | env-gated | 확인서/출고 크레딧 단건 결제 세션. Bearer 인증 + `FEATURE_STRIPE_CHECKOUT=on` |
| `/api/release-credit/debit` (POST) | ✗ | ✓ | ✓ | ✓ | by-subscription | 출고 크레딧 프로젝트 원장 차감 |
| `/api/release-credit/operation` (POST) | ✗ | ✓ | ✓ | ✓ | by-subscription | 구매/환불/복구/재발급 원장 작업. 구매/환불/복구는 내부 secret 추가 필요 |
| `/api/upload` (POST) | ✗ | ✓ | ✓ | ✓ | — | 파일 업로드 |
| `/api/share` (POST/PATCH) | ✗ | ✓ | ✓ | ✓ | — | 공개 링크 발급. 긴 콘텐츠 서버 저장은 로그인 사용자만 허용 |
| `/api/complete` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim/BYOK | Tab 이어쓰기. Hosted 제한, BYOK 제한 면제 |
| `/api/image-gen` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim/BYOK | 외부 provider는 BYOK 필수. `local-spark`는 Hosted 제한 |
| `/api/network-agent/ingest` (POST) | ✗ | ✗ | ✗ | ✗ | — | retired 410; downstream work 없음 |
| `/api/network-agent/search` (POST) | ✗ | ✗ | ✗ | ✗ | — | retired 410; downstream work 없음 |
| `/api/agent-search` (POST) | ✗ | ✗ | ✗ | ✗ | — | disabled 503; downstream work 없음 |
| `/api/translate` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim/BYOK | 6-stage 번역. Hosted 챕터 제한, BYOK 제한 면제 |
| `/api/analyze-chapter` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim/BYOK | 회차 분석. Hosted 제한, BYOK 제한 면제 |
| `/api/structured-generate` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim/BYOK | JSON 구조 생성. Hosted 제한, BYOK 제한 면제 |
| `/api/gemini-structured` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim/BYOK | Gemini 구조 호출. Hosted 제한, BYOK 제한 면제 |
| `/api/user/export` (POST) | ✗ | ✓ | ✓ | ✓ | — | 전체 export |
| `/api/user/delete` (POST) | ✗ | ✓ | ✓ | ✓ | — | 계정 삭제 |
| `/api/error-report` (POST) | ✗ | ✓ | ✓ | ✓ | — | 사용자 제출 에러 |
| `/api/local-proxy` (POST) | ✗ | ✓ | ✓ | ✓ | — | DGX 프록시 |
| `/api/lsp/*` (POST) | ✗ | ✓ | ✓ | ✓ | — | 번역 LSP 18개. 결정론 진단 라우트라 Hosted 모델 티어 제한 대상 아님 |
| `/api/integration/publisher-mock` (POST) | ✗ | ✓ | ✓ | ✓ | — | 모의 게시 |

### GET / read-only endpoints (Auth optional, no CSRF)

| Route | Public | Rate-limited | Auth | Tier | 비고 |
|-------|:------:|:------------:|:----:|:----:|------|
| `/api/health` | ✓ | ✗ | ✗ | — | liveness probe |
| `/api/readiness` | ✓ | ✗ | ✗ | — | readiness probe |
| `/api/csrf` | ✓ | ✓ | ✗ | — | CSRF token 발급 |
| `/api/ai-capabilities` | ✓ | ✓ | optional | — | provider list |
| `/api/agent-search/status` (GET) | ✗ | ✗ | ✗ | — | disabled 503; downstream work 없음 |
| `/api/cp/verify/[id]` (GET) | ✓ | ✓ | optional | — | creative-process 공개 검증 |
| `/api/vitals` (POST) | ✓ | ✓ | optional | — | Web Vitals 수집 |
| `/api/metrics` (GET) | ✗ | ✗ | bearer-token | — | Prometheus scrape. `METRICS_ENABLED=on` + 운영 token gate |
| `/api/cron/universe-daily` | ✗ | ✗ | header-secret | — | Vercel cron — `CRON_SECRET` |
| `/api/fetch-url` (POST) | ✗ | ✓ | ✓ | ✓ | — | URL 페치 — strict |
| `/api/github/token` (POST) | ✗ | ✓ | ✓ | ✓ | — | OAuth exchange |
| `/api/github/callback` (GET) | ✓ | ✓ | ✗ | — | OAuth redirect target |
| `/api/stripe/webhook` (POST) | ✓ | ✗ | signature | — | Stripe-Signature 헤더 검증 |

## 회귀 방지 (Regression Guards)

1. **컴파일타임**: `src/app/api/__tests__/auth-coverage.test.ts` —
   모든 POST/PUT/PATCH/DELETE route 가 CSRF token 또는 same-origin guard 를 갖는지 추적 (Phase 1: advisory, Phase 2: block).
2. **런타임**: CSRF token 또는 same-origin guard 미통과 시 403 응답 — `__tests__/gate-checks.test.ts` 와 동등 패턴.
3. **lint**: ESLint 룰 `eh/api-csrf-required` (proposal — 추후 PR).

## 단계적 강제 (Phased Enforcement)

| 단계 | 시점 | 강제 수준 |
|------|------|----------|
| Phase 1 (현재) | alpha | advisory — coverage 카운트만 |
| Phase 2 | beta | mutating route 누락 시 PR comment |
| Phase 3 | pre-commercial | 누락 시 CI block (test fail) |
| Phase 4 | commercial | runtime 503 강제 (lint + test + middleware) |

## Disabled Agent Route Notes

`/api/agent-search`는 비활성 호환 라우트이고 `/api/network-agent/*`는 제거된 호환 표면이다. 문서·화면에서 활성 검색/인덱싱 기능처럼 표현하지 않는다.
이 라우트들은 리딤/에이전트 최신 기준 문서(`docs/redeem-agent-operations-2026-06-14.md`)의 비활성 목록을 따른다.

## Hosted Model Tier Notes

돈이 드는 Hosted 노아 호출은 `src/lib/server-tier-limit.ts`를 공통 게이트로 사용한다.
대상은 `/api/chat`, `/api/complete`, `/api/structured-generate`, `/api/gemini-structured`, `/api/analyze-chapter`, `/api/translate`, `/api/image-gen`의 `local-spark`이다.

- 사용자 키(BYOK)가 있으면 Hosted 사용량 카운트에 넣지 않는다.
- 사용자 키가 없으면 Firebase ID token의 custom claim tier를 확인한다.
- 로그인도 사용자 키도 없으면 `401 login_or_byok_required`와 `paywall` 객체를 반환한다.
- Free 제공량을 넘으면 `402 plan_limit_reached`와 `paywall` 객체를 반환한다.
- `/api/lsp/*`는 현재 모델 호출이 없는 진단·보조 라우트이므로 LSP token/rate-limit만 따른다.

## 변경 이력

- **2026-06-15**: `/api/release-credit/*` 단건 결제·차감·원장 작업 라우트 반영.
- **2026-06-21**: `/api/share` 서버 저장 인증화, `/api/release-credit/*` same-origin guard, `/api/metrics` bearer token gate 반영.
- **2026-06-19**: 제거된 `/api/code/autopilot` 기준 제거. 현재 Hosted 티어 제한 대상은 현행 노아/번역/분석/시각 시안 라우트 기준.
- **2026-06-15**: `gemini-structured`, `image-gen local-spark`까지 Hosted 티어 제한 계약 확장.
- **2026-06-15**: Hosted 노아 호출 5개 라우트의 by-claim/BYOK 티어 제한 계약 반영.
- **2026-06-14**: Agent Builder/Network Agent 제거 이후 실제 disabled 503 계약 반영.
- **2026-06-08** (루프 4 P4): 초기 매트릭스 생성. 42 routes × 4 axis 매핑.
