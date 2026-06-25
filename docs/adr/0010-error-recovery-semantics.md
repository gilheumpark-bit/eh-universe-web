# 0010. Error Recovery Semantics — Retriable / Fail-Safe / Circuit Breaker

- Status: Proposed
- Date: 2026-06-08
- Deciders: 프로젝트 오너
- Supersedes: 없음 (신규)
- Related: ADR-0009 (Observability), provider retry and gateway failover policy

## Context

루프 2 P12 진단 — 비동기 경계의 에러 처리 일관성 부재:

- `firebase-auth-admin-rest.ts` → fail-safe `{ ok: false }` 반환
- `api/chat/route.ts` → eager throw + try/catch in handler
- AI provider retry (ai-providers.ts) → 자체 retry 루프 (3회 + jitter backoff)
- 외부 webhook (stripe) → 200 항상 반환 (시그니처 검증 실패는 400)
- 글로벌 unhandled promise rejection 처리기 없음 — 콘솔만 출력
- 다중 retry 정책이 모듈마다 상이 (3회 / 5회 / 0회 — 일관성 0)

claude3 _error-handling 표준 (이번 ADR 에서 우리 표준 정의) 대비:
- 재시도 가능 (5xx, timeout, ECONNRESET) vs 불가 (4xx) 명시적 분기 → ❌
- Webhook DLQ 전략 → ❌
- Circuit breaker 통합 → ⚠️ provider failover 일부만 적용
- Idempotency key 강제 → ❌ (Stripe 만)

## Decision

### 1) Error 분류 표

| 분류 | HTTP code | 원인 예 | 재시도 | Circuit Breaker |
|---|---|---|---|---|
| **Retriable** | 5xx, 429, network | timeout, 502, rate-limit | YES (exp backoff + jitter) | 카운트 +1 |
| **Non-retriable** | 4xx (429 제외) | 잘못된 입력, 권한 부족 | NO | 카운트 안 함 |
| **Fatal** | 코드 버그 | TypeError, null deref | NO + 즉시 알림 | 트립 |

### 2) Retry 정책 (통일)

```ts
// 표준 retry 옵션 — lib/retry-policy.ts 신설 (Phase 2)
{
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  jitter: 0.3,            // ±30%
  retryOn: (err) => isRetriableError(err),
  onRetry: (attempt, err) => apiLog({ level: 'warn', event: 'retry', meta: { attempt, err } }),
}
```

모든 AI / 외부 호출은 이 옵션 통과 의무 — `withRetry(fn, options)`.

### 3) Webhook 처리

| 항목 | 원칙 |
|---|---|
| Status code | 항상 200 (Stripe / GitHub 재전송 트리거 차단) |
| 처리 실패 시 | payload → DLQ (Firestore `dead-letter-webhooks` collection) |
| Idempotency | webhook event ID 를 키로 dedup |
| 재처리 | 운영자 수동 또는 cron 으로 DLQ scan + replay |

Stripe webhook signature 검증 실패 → 400 (위조 가능성, 재전송 X 합당).

### 4) Circuit Breaker

**확장 (Phase 2)**:
- AI 외 외부 호출 (Firestore / GitHub / Stripe) 도 circuit breaker 적용
- Tripped state (≥3 consecutive 5xx) → 30s cooldown
- Half-open: 1 probe 통과 시 closed 복귀

### 5) Global error handler

`src/middleware.ts` 또는 layout.tsx 에서:

```ts
// 클라이언트
window.addEventListener('unhandledrejection', (event) => {
  apiLog({ level: 'error', event: 'unhandled_rejection', meta: { reason: String(event.reason) } });
});

// 서버 (route handler 외부) — Next.js 의 instrumentation.ts 사용
process.on('unhandledRejection', (reason) => {
  apiLog({ level: 'error', event: 'unhandled_rejection_server', meta: { reason: String(reason) } });
});
```

### 6) Fail-safe 가이드

| 컴포넌트 | 실패 처리 |
|---|---|
| Authentication (Firebase admin) | `{ ok: false, reason }` — 호출자가 401 변환 |
| Storage (Firestore) | 캐시 폴백 또는 빈 결과 + 토스트 |
| AI 호출 | provider failover → 폴백 모델 또는 graceful "잠시 후 재시도" |
| RAG | 빈 결과 + 명시 안내 |
| Image gen | 폴백 placeholder + 재시도 버튼 |

## Consequences

### Positive
- 모든 비동기 경계의 에러 동작 예측 가능
- DLQ 로 webhook 손실 0
- Circuit breaker 확장으로 외부 의존 cascade 차단

### Negative
- retry-policy.ts 신설 + 28 routes 마이그레이션 비용
- DLQ Firestore collection 운영 비용 (low — webhook 빈도 낮음)
- Test 추가 (재시도 + circuit breaker 시나리오)

### Mitigation
- 단계별 도입 — Phase 1 (정의 + 글로벌 핸들러), Phase 2 (retry-policy + circuit breaker 확장), Phase 3 (DLQ)
- 기존 provider retry 테스트 인프라 활용

## Implementation Hooks (현재 commit 범위)

- 본 ADR 작성 (P12)
- Phase 1-3 작업은 별도 백로그
