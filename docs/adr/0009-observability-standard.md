# 0009. Observability Standard — Logs/Metrics/Traces 3-Pillar

- Status: Proposed
- Date: 2026-06-08
- Deciders: 프로젝트 오너
- Supersedes: 없음 (신규)
- Related: ADR-0010 (Error Recovery), api-logger.ts

## Context

**[루프 3 P4 — 2026-06-08] Phase 1.5 (request-context 추가):**
- `src/lib/request-context.ts` 신규 — AsyncLocalStorage 기반 request-scoped trace_id 전파.
- `src/lib/logger.ts` 의 `emitStructured()` 가 `getCurrentTraceId()` 자동 조회 → 모든 structured log 에 `trace_id` 자동 첨부.
- API route 진입점에서 `withRequestContext({ traceId: extractOrCreateTraceId(headers), route }, async () => handler())` wrap 필요. (점진 마이그레이션 — chat / image-gen / readiness 우선)
- 클라이언트는 `fetch(url, { headers: { 'x-request-id': crypto.randomUUID() } })` interceptor 보강 (별도 PR).
- Phase 2 (RED Metrics) 시작 시 동일 trace_id 가 OTel context 와 연결.

---

루프 2 P4 진단 결과 — claude3 _observability 표준 (3 Pillars · OTel · structured logs · SLO) 대비 현재 상태:

| 영역 | claude3 표준 | 현재 EH | 격차 |
|---|---|---|---|
| Logs | 구조화 JSON · 단일 스키마 | api-logger.ts (3/28 routes 사용) | 25 routes 미적용 |
| Metrics | RED (Rate/Errors/Duration) + USE (Util/Sat/Errors) | 없음 | 전체 |
| Traces | OpenTelemetry (OTLP export) | 없음 | 전체 |
| SLO | 라우트별 p99/오류율 정의 | 없음 | 전체 |
| Correlation | requestId / traceId 전파 | 일부 (apiLog meta) | 미흡 |

api-logger.ts 모듈이 자체적으로 "P11 blocking commercial scale" 라고 self-document.
이번 ADR 은 phased 도입 계획 + 단기 (alpha) / 중기 (beta) / 장기 (commercial) 단계 분리.

## Decision

### 1) Phase 1 — Logs 일원화 (alpha → beta 사이)

**즉시 강제**:
- 모든 신규 API route → `apiLog` + `createRequestTimer` 의무 사용
- 28 기존 routes 단계적 마이그레이션 (priority: chat / image-gen / network-agent → 25 routes)
- structured log schema 단일화 → 모든 모듈 동일 필드 (`level`, `event`, `route`, `requestId`, `durationMs`, `meta`)

**ESLint rule 추가** (선택, Phase 1 종료 시):
- POST/PUT/PATCH/DELETE handler 안에서 `console.log/error/warn` 직접 호출 금지
- 위반 시 `apiLog` 또는 신규 `logger` (P19) 사용 강제

### 2) Phase 2 — RED Metrics (beta)

**스택**: `@opentelemetry/api-metrics` + `@opentelemetry/sdk-metrics`

**지표**:
- `http.server.request.count` (route, status_code, method)
- `http.server.request.duration` (histogram, route, status_code)
- `http.server.request.errors` (route, error_type)

**Export**:
- Vercel — OTLP HTTP exporter → Vercel Observability or self-hosted Grafana Mimir
- Local dev — Prometheus scrape endpoint

### 3) Phase 3 — Traces (commercial 직전)

**스택**: `@opentelemetry/sdk-node` (Node runtime) + `@opentelemetry/sdk-web` (선택, client)

**계측 대상**:
- API routes (auto)
- AI provider 호출 (manual span, retry count + token usage attribute)
- Firestore / Stripe / GitHub 외부 호출 (manual span)
- DGX vLLM SSE (streaming, end-to-end latency)

**Sampling**:
- Production: 10% trace sampling + always-on error sampling
- Dev: 100% (debugging)

**Propagation**:
- W3C Trace Context (traceparent / tracestate)
- `requestId` → `traceId` 양방향 매핑 (apiLog meta 자동 주입)

### 4) Phase 4 — SLO 정의 (commercial)

**SLO 표** (raw — 추후 측정 기반 calibrate):

| 라우트 | Latency p99 | Error budget | Availability |
|---|---|---|---|
| /api/chat (non-stream) | 5s | 1% | 99.5% |
| /api/chat (stream first token) | 800ms | 1% | 99.5% |
| /api/image-gen | 30s | 2% | 99% |
| /api/translate | 8s | 1% | 99.5% |
| /api/network-agent/search | 3s | 1% | 99.5% |
| /api/upload | 15s | 2% | 99% |
| /api/health | 200ms | 0.1% | 99.9% |

**Alerting**:
- p99 SLO violation > 5min → PagerDuty (or 이메일 fallback)
- Error budget burn rate > 2x → Slack #ops
- Cold start > 3s → Vercel build alert

### 5) 비결정 사항 (defer)

- Frontend RUM (Real User Monitoring) — Sentry @sentry/nextjs 가 이미 있으므로 Phase 5 까지 defer
- Log retention policy — Vercel 기본 (7 days) → Commercial 시 datalake export 결정
- USE metrics (CPU/Memory/Network util) — Vercel infrastructure metrics 사용 (자체 계측 X)

## Consequences

### Positive
- claude3 _observability 표준 (3 Pillars) 정합화 경로 명확화
- production 사고 시 root cause 추적 가능 (trace + log + metric correlation)
- SLO 위반 시 자동 알림 → 사용자 신고 전 대응

### Negative
- 4 dependency 추가: `@opentelemetry/{api,sdk-node,sdk-web,api-metrics}` (대략 ~150KB gzip on server, 0 on client until Phase 3 web SDK)
- OTLP collector 비용 (Vercel Observability 또는 self-host)
- Sampling 미설정 시 cardinality 폭발 (route + status_code 조합)

### Mitigation
- Phase 별 단계 도입 — alpha (Phase 1) / beta (Phase 2) / pre-commercial (Phase 3) / commercial (Phase 4)
- Sampling rate 보수 시작 (10%) → 측정 후 calibrate
- High-cardinality attribute (user_id 등) metric 에 부착 금지 — trace span 으로만

## Implementation Hooks (현재 commit 범위)

- 본 ADR 작성 (P4)
- api-logger.ts header comment 정정 — "ADR-0009 참조" 추가
- 신규 routes 가 apiLog 사용하도록 PR 리뷰 체크리스트 추가 (별도 commit)

Phase 1-4 본격 작업은 별도 백로그 (`docs/roadmap/observability-phase-{1,2,3,4}.md`).
