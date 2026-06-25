# ADR-0011: Rate-limit Backend (Memory ↔ Upstash Redis)

**Status:** Accepted
**Date:** 2026-06-08
**Loop:** 루프 3 / P1
**Owner:** senior-architect

## Context

`src/lib/rate-limit.ts` 는 모든 API route (`/api/chat`, `/api/translate`, `/api/upload`, `/api/image-gen`, ...) 의 per-IP rate enforcement 단일 source. 기본 backend 는 in-memory `Map`.

Vercel serverless 환경에선 lambda instance 마다 메모리가 독립 — 같은 IP 가 N 개 instance 에 분산되면 실제 enforcement 가 N 배 약해진다. P1 루프 2 까지는 `RateLimitBackend` 인터페이스만 정의돼 있었고 prod boot path 가 비어 있었다.

또한 `/api/chat/route.ts` 의 `dailyTokenMap` (per-IP 일일 토큰 버짓) 도 동일 한계 — lambda local Map 으로 cost runaway 차단 불완전.

## Decision

### 1. Boot path 명시

`src/lib/server-ai-init.ts` 신규 — module-eval 시점 1회 실행:

```ts
if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  setRateLimitBackend(createUpstashBackend({ url, token }));
}
```

API route 진입점에서 1회 `import '@/lib/server-ai-init'` 만 하면 backend 가 자동 교체됨. 적용 위치:
- `src/app/api/chat/route.ts` — 첫 진입.
- `src/app/api/readiness/route.ts` — readiness probe 가 backend 상태 노출 (`probeRateLimitBackend`).

### 2. Upstash Redis 어댑터

`src/lib/rate-limit-upstash.ts` 신규. REST API 만 사용 (npm 패키지 추가 0). atomic pipeline:
```
INCR rl:<key>
PEXPIRE rl:<key> windowMs NX   # 첫 요청만 TTL 설정
PTTL rl:<key>                   # retryAfter 계산
```

Fail mode: REST 오류 → fail-open (allowed=true). Redis 장애가 사용자 차단 유발 안 함.

### 3. 토큰 버짓 마이그레이션

`src/lib/rate-limit-upstash.ts:reserveTokenBudgetUpstash()` — INCRBY + PEXPIRE NX atomic. 분산 enforcement.

`chat/route.ts` 의 `checkTokenBudget` / `recordTokenUsage` 는 backend 가 `upstash` 일 때 자동으로 Redis 경로로 전환할 수 있도록 hook 추가 (현재는 dailyTokenMap memory 폴백 유지 — 점진 마이그레이션).

### 4. Readiness 노출

`/api/readiness` 응답의 `checks.rateLimit`:
- `ok` + `'rate-limit: upstash (distributed)'` — prod 정상
- `warn` + `'rate-limit: memory (per-lambda) — set UPSTASH_REDIS_REST_URL/_TOKEN ...'` — prod 결손
- `ok` + `'rate-limit: memory (dev/test acceptable)'` — non-prod

## Consequences

**Positive:**
- Vercel multi-instance 환경에서 분산 rate-limit 일관 enforcement.
- npm 의존성 추가 0 (REST fetch only).
- fail-open 정책으로 Redis 장애가 service 차단으로 번지지 않음.
- readiness probe 로 backend 상태 자동 감시 가능.

**Negative:**
- Redis network latency (~5-30ms p50 from Vercel edge) 가 critical-path 추가.
- Upstash 비용 (free tier: 10K commands/day → small alpha 충분).

**Mitigation:**
- timeoutMs=1500ms 짧게 잡아 latency cap.
- 캐시 hot path (예: GET 만) → memory hint 캐싱은 추후 검토.

## ENV Vars

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `UPSTASH_REDIS_REST_URL` | prod only | none | Upstash REST URL (`https://<region>-<id>.upstash.io`) |
| `UPSTASH_REDIS_REST_TOKEN` | prod only | none | Upstash REST API token |

## Boot path

```
Vercel cold start
  → import '@/app/api/chat/route'
  → import '@/lib/server-ai-init'  (chat/route line 21)
  → bootRateLimit() runs (module top-level)
  → setRateLimitBackend(createUpstashBackend({...}))
  → getRateLimitBackendName() === 'upstash'
```

## Verification

```bash
curl https://<deploy>/api/readiness | jq .checks.rateLimit
# Expected (prod with env): { status: 'ok', detail: 'rate-limit: upstash (distributed)' }
# Expected (prod without env): { status: 'warn', detail: 'rate-limit: memory ...' }
```

## References

- `src/lib/rate-limit.ts:80-93` — `setRateLimitBackend()` API
- `src/lib/rate-limit-upstash.ts` — backend implementation
- `src/lib/server-ai-init.ts` — boot path
- `src/app/api/readiness/route.ts:probeRateLimitBackend` — diagnostics
