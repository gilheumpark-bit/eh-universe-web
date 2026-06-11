# SLO 초안 — EH Universe (H3-ops)

**갱신**: 2026-06-11 · **상태**: 초안 (목표치는 베타 기준 제안값 — 실측 데이터 누적 전까지 잠정)
**관련**: `docs/RUNBOOK.md` · `docs/ops-runbook.md` §1 (기존 SLA 표) · ADR-0009 (관측 단계)

> 원칙: 측정 코드가 실제로 존재하는 항목만 "측정 위치"를 기재한다. 없는 것은 **측정 미구현**으로 정직 표기.

## 1. SLO 표

| SLI | 목표 (베타) | 측정 위치 (실제 코드) | 측정 상태 |
|---|---|---|---|
| **가용성** (핵심 페이지 + `/api/health` 200 비율) | 99.5% / 월 | `/api/health` (`src/app/api/health/route.ts`) — status/version/timestamp 반환. `/api/readiness` — 다운스트림 probe (2s timeout) | ⚠️ **집계 미구현** — 외부 uptime 모니터(예: UptimeRobot→/api/health) 미연결. 현재는 Vercel 대시보드 수동 확인 |
| **AI 응답 p95** (`/api/chat` 첫 스트림 시작까지) | p95 ≤ 10s (스트림 시작 기준) | `apiLog` `chat_stream_start`의 `durationMs` (`src/app/api/chat/route.ts:461`, `src/lib/api-logger.ts` `createRequestTimer`) — Vercel Logs에 구조화 JSON으로 기록됨 | ⚠️ **로그는 있으나 p95 집계 파이프라인 미구현** — Vercel Logs 수동 쿼리만 가능. `/api/metrics`는 Phase 1 stub (uptime/build info만, `METRICS_ENABLED=on` 게이트, `src/app/api/metrics/route.ts`) — duration histogram은 ADR-0009 Phase 2 |
| **AI 요청 성공률** (`/api/chat` 비-4xx 비율) | ≥ 99% (BYOK·레이트리밋 4xx 제외) | `apiLog` `chat_error`(status 포함) vs `chat_stream_start` 건수 비교 — Vercel Logs | ⚠️ **집계 미구현** (수동 로그 대조만) |
| **저장 성공률** (로컬 IDB 저널 쓰기) | 99.99% (데이터 유실 RPO 0분) | save-engine 내부: 쓰기 실패는 `src/lib/save-engine/sentry-integration.ts` 경유 Sentry 보고 + shadow-logger diff 기록. 내부 벤치: `bench/chaos-fortress-10k.mjs` (10,000회 시뮬 × 0 유실 — `docs/ops-runbook.md` §1) | ⚠️ **프로덕션 실측 미구현** — 성공/실패 카운터·대시보드 없음. 현재 근거는 Chaos 시뮬 + Sentry 에러 부재(소극 신호) |
| **프런트 체감 성능** (Core Web Vitals) | LCP p75 ≤ 2.5s · INP p75 ≤ 200ms | `/api/vitals` (`src/app/api/vitals/route.ts`) — 클라이언트 web-vitals beacon을 구조화 로그로 수신, `rating === 'poor'`만 Sentry warning 발송 | ◐ **부분 구현** — 수집·poor 알람은 동작, p75 집계 대시보드는 미구현 |

## 2. 에러 버짓·운영 규칙 (초안)

- 가용성 99.5%/월 = 월 에러 버짓 약 3.6시간. 버짓 소진 추정 시(반복 5xx·잦은 롤백) → 신규 기능 배포 동결, 안정화 우선.
- SLO 위반 판단은 현재 **수동** (Vercel Logs + Sentry). 자동 알람은 미구현 (`docs/rollback-policy.md` §5-6).

## 3. 측정 부채 (후속 작업 목록 — 코드 없음을 명시)

1. 외부 uptime 모니터 → `/api/health` 연결 (가용성 SLI 자동화).
2. ADR-0009 Phase 2: `/api/metrics`에 request count/duration histogram (OpenTelemetry PrometheusExporter) — p95 자동 산출.
3. save-engine 쓰기 성공/실패 카운터 + 주기 beacon (저장 성공률 실측).
4. Web Vitals p75 집계 (현재 raw 로그만).
