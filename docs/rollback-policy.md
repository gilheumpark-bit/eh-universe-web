# 롤백·배포 회복력 정책 (2026-06-06)

> 배포 실패·회귀 시 복구 절차. Vercel 기반. 상업 운영 전 필독.

## 0. 복원 지점 원칙
- **master = 안정 기준선.** 작업은 브랜치(`work/*`)에서, 검증(test·tsc·build green) 후 master 머지.
- 본 세션: master `619db35f` 보존, 작업은 `work/commercialize-fusion`.

## 1. 즉시 롤백 (Vercel)
프로덕션 장애 시 (P0 — 결제 실패·사이트 다운·데이터 손상):
1. **Vercel Dashboard → Deployments → 직전 정상 배포 → "Promote to Production"** (즉시 트래픽 전환, ~수초).
   - CLI: `vercel rollback <deployment-url>` 또는 `vercel promote <url>`.
2. 또는 git: 문제 커밋 revert → push → 자동 재배포.
   - `git revert <bad-sha> && git push` (force-push 금지 — revert로 이력 보존).
3. 롤백 후 `/api/health` + `/api/readiness` probe 확인.

## 2. 트리거 (롤백 판단 기준)
| 신호 | 출처 | 조치 |
|---|---|---|
| 5xx 급증 | Vercel Logs / Sentry | 즉시 롤백 |
| `stripe_claim_sync_failed` 연속 | apiLog | 결제 활성 보류 + 진단(docs/stripe-revenue-path) |
| `/api/readiness` fail | probe | 다운스트림(Firestore/DGX) 확인 후 롤백 |
| 빌드 실패 | CI (ci.yml) | 머지 차단 — 프로덕션 영향 0 (브랜치 게이트) |

## 3. 배포 전 게이트 (회귀 차단)
머지 전 필수 (CI + 로컬):
- `npx jest` → **0 fail** (현재 3,916/0)
- `npx tsc --noEmit` → 0 errors
- `npx next build` → 0 errors
- 절대 금지 8파일 0byte (isolation-check.yml)

## 4. 데이터 안전 (저장 경로)
- 저장 엔진: shadow → primary 승격은 `useJournalEngineMode` 게이트(기본 수동·autoPromote=false). 오류 시 autoDowngrade(기본 true)로 shadow 복귀.
- IndexedDB 백업: `full-backup.ts` (JSON/ZIP export, atomic rollback). 사용자 원고 손실 방지.
- Firestore: 서버 쓰기는 service-account REST(`firestore-service-rest`) — 규칙 위반 시 거부(클라 무영향).

## 5. 미구현 (DR 후속)
- Blue-green / Canary 배포 (현재 Vercel 단일 prod + instant rollback 의존)
- 분산 트레이싱 (OpenTelemetry) — 현재 Vercel Logs + Sentry
- 자동 롤백 트리거 (현재 수동 판단) — 알람(Slack/Discord webhook) 후속

## 6. 알림 (후속 config)
- Sentry DSN 설정 시 에러 알람 발화 (코드 완료). Slack/Discord webhook 0건 — 후속.
