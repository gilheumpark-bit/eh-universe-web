# Auth Matrix — API routes × CSRF/Auth/Rate-limit/Tier

**Status**: Living doc (2026-06-08 — 루프 4 P4 신설).
**Owner**: gilheumpark.
**Related**: ADR-0011 (rate-limit), `lib/firebase-id-token.ts`, `lib/verify-csrf.ts`.

## 정책 (Policy)

| Axis | 강제 시점 | 미적용 시 응답 |
|------|----------|--------------|
| **public** | 인증/CSRF 없이 접근 가능 | n/a (의도적 공개) |
| **rate-limited** | `checkRateLimit()` 호출 필요 | 429 + Retry-After |
| **authenticated** | `verifyFirebaseIdToken()` 통과 | 401 |
| **csrf-verified** | `verifyCsrf()` 통과 (POST/PUT/PATCH/DELETE) | 403 |
| **tier-gated** | Stripe role / Firebase custom claim 매칭 | 402/403 |

## 매트릭스 (Matrix)

> 표는 `src/app/api/**/route.ts` 의 실제 import + middleware 호출 패턴 기준.
> 신규 route 추가 시 표 갱신 + `auth-coverage.test.ts` 통과 필수.

### POST / mutating endpoints (CSRF 필수 권장)

| Route | Public | Rate-limited | Auth | CSRF | Tier | 비고 |
|-------|:------:|:------------:|:----:|:----:|:----:|------|
| `/api/chat` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim | LLM 직접 호출 — strict |
| `/api/checkout` (POST) | ✗ | ✓ | ✓ | ✓ | ✓ | Stripe — strict |
| `/api/upload` (POST) | ✗ | ✓ | ✓ | ✓ | — | 파일 업로드 |
| `/api/share` (POST/PATCH) | ✗ | ✓ | ✓ | ✓ | — | 공개 링크 발급 |
| `/api/code/autopilot` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim | LLM 자율실행 |
| `/api/complete` (POST) | ✗ | ✓ | ✓ | ✓ | — | Tab 자동완성 |
| `/api/image-gen` (POST) | ✗ | ✓ | ✓ | ✓ | by-claim | ComfyUI 호출 |
| `/api/network-agent/ingest` (POST) | ✗ | ✓ | ✓ | ✓ | — | 아카이브 색인 |
| `/api/network-agent/search` (POST) | ✗ | ✓ | ✓ | ✓ | — | 아카이브 검색 |
| `/api/agent-search` (POST) | ✗ | ✓ | ✓ | ✓ | ✓ | feature-gated 503 |
| `/api/translate` (POST) | ✗ | ✓ | ✓ | ✓ | — | 6-stage 번역 |
| `/api/analyze-chapter` (POST) | ✗ | ✓ | ✓ | ✓ | — | 챕터 분석 |
| `/api/structured-generate` (POST) | ✗ | ✓ | ✓ | ✓ | — | JSON 구조 생성 |
| `/api/gemini-structured` (POST) | ✗ | ✓ | ✓ | ✓ | — | Gemini 구조 호출 |
| `/api/user/export` (POST) | ✗ | ✓ | ✓ | ✓ | — | 전체 export |
| `/api/user/delete` (POST) | ✗ | ✓ | ✓ | ✓ | — | 계정 삭제 |
| `/api/error-report` (POST) | ✗ | ✓ | ✓ | ✓ | — | 사용자 제출 에러 |
| `/api/local-proxy` (POST) | ✗ | ✓ | ✓ | ✓ | — | DGX 프록시 |
| `/api/lsp/*` (POST) | ✗ | ✓ | ✓ | ✓ | — | 번역 LSP 18개 |
| `/api/integration/publisher-mock` (POST) | ✗ | ✓ | ✓ | ✓ | — | 모의 게시 |

### GET / read-only endpoints (Auth optional, no CSRF)

| Route | Public | Rate-limited | Auth | Tier | 비고 |
|-------|:------:|:------------:|:----:|:----:|------|
| `/api/health` | ✓ | ✗ | ✗ | — | liveness probe |
| `/api/readiness` | ✓ | ✗ | ✗ | — | readiness probe |
| `/api/csrf` | ✓ | ✓ | ✗ | — | CSRF token 발급 |
| `/api/ai-capabilities` | ✓ | ✓ | optional | — | provider list |
| `/api/agent-search/status` (GET) | ✗ | ✓ | ✓ | ✓ | feature-gated |
| `/api/cp/verify/[id]` (GET) | ✓ | ✓ | optional | — | creative-process 공개 검증 |
| `/api/vitals` (POST) | ✓ | ✓ | optional | — | Web Vitals 수집 |
| `/api/metrics` (GET) | ✓ | ✗ | ✗ | — | Prometheus scrape (gated by METRICS_ENABLED) |
| `/api/cron/universe-daily` | ✗ | ✗ | header-secret | — | Vercel cron — `CRON_SECRET` |
| `/api/fetch-url` (POST) | ✗ | ✓ | ✓ | ✓ | — | URL 페치 — strict |
| `/api/npm-search` (GET) | ✓ | ✓ | optional | — | npm 패키지 검색 |
| `/api/github/token` (POST) | ✗ | ✓ | ✓ | ✓ | — | OAuth exchange |
| `/api/github/callback` (GET) | ✓ | ✓ | ✗ | — | OAuth redirect target |
| `/api/stripe/webhook` (POST) | ✓ | ✗ | signature | — | Stripe-Signature 헤더 검증 |

## 회귀 방지 (Regression Guards)

1. **컴파일타임**: `src/app/api/__tests__/auth-coverage.test.ts` —
   모든 POST/PUT/PATCH/DELETE route 가 `verifyCsrf` import 강제 (Phase 1: advisory, Phase 2: block).
2. **런타임**: `verifyCsrf` 미통과 시 403 응답 — `__tests__/gate-checks.test.ts` 와 동등 패턴.
3. **lint**: ESLint 룰 `eh/api-csrf-required` (proposal — 추후 PR).

## 단계적 강제 (Phased Enforcement)

| 단계 | 시점 | 강제 수준 |
|------|------|----------|
| Phase 1 (현재) | alpha | advisory — coverage 카운트만 |
| Phase 2 | beta | mutating route 누락 시 PR comment |
| Phase 3 | pre-commercial | 누락 시 CI block (test fail) |
| Phase 4 | commercial | runtime 503 강제 (lint + test + middleware) |

## 변경 이력

- **2026-06-08** (루프 4 P4): 초기 매트릭스 생성. 42 routes × 4 axis 매핑.
