# RUNBOOK — EH Universe 운영 장애 대응 (H3-ops)

**갱신**: 2026-06-11
**관련 문서**: `docs/incident-response.md` (심각도 매트릭스·S0 절차) · `docs/rollback-policy.md` (롤백 상세) · `docs/ops-runbook.md` (v2.2.0 일상 운영 루틴) · `docs/dgx-runbook.md` (DGX 서버)
**원칙**: 본 문서의 모든 timeout/retry 수치는 코드에서 직접 확인한 실측값 (file:line 병기). 발명값 없음.

---

## 0. 첫 5분 — 공통 triage

1. `https://ehsu.app/api/health` — `{ status, version, timestamp }`. `unhealthy`(503) = 서버 env 결손.
2. `https://ehsu.app/api/readiness` — 다운스트림 probe (각 probe 2초 timeout, `src/app/api/readiness/route.ts:47`).
3. Vercel Dashboard → Deployments(최근 배포 상태) + Logs(error/fatal 필터).
4. 심각도 분류: `docs/incident-response.md` §1 (S0 데이터/보안 ~ S3 경미).

---

## 1. AI 공급자 다운 (Gemini / OpenAI / Claude / Groq / Mistral / DGX)

### 증상
- `/api/chat` `/api/structured-generate` `/api/gemini-structured`가 400/500 반환 또는 응답 지연.
- Vercel Logs에서 `chat_error` / `API:structured-generate` 에러 반복.

### 코드에 박힌 자동 방어선 (수동 조치 전 확인)
| 경로 | timeout | retry | 위치 |
|---|---|---|---|
| `/api/chat` → 외부 프로바이더 스트림 (OpenAI호환·Claude·Gemini) | 120초 | 없음 (1회) | `src/services/aiProviders.ts:27,57,86` |
| `/api/chat` → DGX Spark 스트림 | 180초 | 최대 2회 재시도, 지연 1.5s→3s | `src/services/sparkService.ts:67-68,184,199` |
| `/api/structured-generate` → OpenAI호환·Gemini JSON | 60초 | 최대 2회 재시도(5xx/INTERNAL/resource exhausted만), 백오프 1s→2s | `src/services/aiProvidersStructured.ts:10,29-63,119-141` |
| `/api/structured-generate` → Claude JSON | 60초 | 없음 (1회) | `src/services/aiProvidersStructured.ts:89` |
| `/api/gemini-structured` → Gemini | 60초 | (Spark 폴백 시) 2회, 지연 1.5s→3s, 재시도 대상 502/503/520-524 | `src/services/geminiStructuredTaskService.ts:28,32-34,59` |
| `/api/complete` (인라인 자동완성) → DGX | 10초 | 없음 | `src/app/api/complete/route.ts:121` |
| `/api/translate` → Gemini | 120초 | 없음 | `src/app/api/translate/route.ts:90,106` |
| `/api/analyze-chapter` → Gemini | 30초 | 없음 | `src/app/api/analyze-chapter/route.ts:74` |
| `/api/image-gen` | 55초 (FLUX 8K는 180초) | 없음 | `src/app/api/image-gen/route.ts:95,153,201` |
| `/api/cron/universe-daily` → Gemini | 30초 | 없음 | `src/app/api/cron/universe-daily/route.ts` (2026-06-11 보강) |
| 클라이언트 → `/api/structured-generate` fetch | 120초 (Vercel maxDuration=60이 실제 상한) | — | `src/services/geminiService.ts:72,191` |

- Vercel 함수 상한: `/api/chat` `/api/structured-generate` `/api/gemini-structured` 모두 `maxDuration = 60`.
- 자동 폴백 체인 (`/api/chat`, `src/app/api/chat/route.ts:440-455`):
  1. Gemini 호스팅 할당 소진 → 사용자 BYOK 키로 1회 재시도 (`isGeminiAllocationExhaustedError`).
  2. 모든 프로바이더 실패 + `SPARK_SERVER_URL` 설정됨 → DGX Spark(vLLM)로 재시도.
- 레이트리밋 (IP당, `src/lib/rate-limit.ts:140-147`): chat 30/분 · 기본 60/분 · imageGen 10/분 · translate 30/분 · upload 24/분. 비-BYOK 일일 출력 토큰 예산 500,000/IP (`src/app/api/chat/route.ts:55`).

### 수동 조치 (BYOK 안내)
1. 호스팅 키(Gemini 등) 크레딧 고갈/공급자 전면 다운 시 — 사용자 안내문:
   > "현재 호스팅 AI 엔진이 일시 중단되었습니다. Settings → AI 키 설정에서 본인의 API 키(BYOK)를 등록하면 즉시 계속 사용 가능합니다."
   - BYOK 요청은 토큰 예산·호스팅 경로를 우회한다 (`src/app/api/chat/route.ts:229-230`).
2. 특정 프로바이더만 다운 → 사용자에게 다른 프로바이더 선택 안내 (chat은 provider 파라미터 기반).
3. DGX 게이트웨이 다운 → 클라이언트가 BYOK 모드로 자동 전환 (`docs/ops-runbook.md` S6). DGX 상세는 `docs/dgx-runbook.md`.
4. 비용 폭주 의심 시 → 해당 기능 플래그 off (`src/lib/feature-flags.ts`) 후 커밋·푸시 (1~2분 내 전파).

---

## 2. Firestore 장애 (로컬 IDB 폴백 — save-engine 동작)

### 핵심: 사용자 원고는 Firestore 없이도 유실되지 않는다
저장 엔진은 **로컬 우선(local-first)** 설계다:

- **Primary**: IndexedDB 저널 (durability strict) + LocalStorage 폴백 어댑터 — `src/lib/save-engine/indexeddb-adapter.ts`, `localstorage-adapter.ts`, `journal.ts`.
- **Secondary (Firestore mirror)**: `src/lib/save-engine/firestore-mirror.ts` —
  - `FEATURE_FIRESTORE_MIRROR` 플래그 기본 **off** → off면 완전 noop, 네트워크 호출 0건 (PART 1 주석).
  - on이어도: 5분 주기(`intervalMs` 기본값) 해시 비교 후 변경분만 push, quota 90% 도달 시 자동 pause + 7일 후 자동 재시도 (`quotaThreshold` 기본 0.9).
  - Primary와 미러는 상호 독립 — 한쪽 실패가 다른 쪽을 막지 않는다.
- **3-Tier 백업**: Tier1 IDB+LocalStorage / Tier2 저널 스냅샷 30개 보관 / Tier3 GitHub Octokit 선택 동기화 (`docs/ops-runbook.md` §5).

### Firestore 다운 시 절차
1. **사용자 데이터 영향 없음 확인**: 집필·저장은 로컬 IDB로 계속 동작. 사용자 공지에 "작성 중 원고는 기기에 안전하게 저장됨" 명시.
2. 영향 범위 = Firestore 의존 기능만: 커뮤니티 posts, universe-daily 뉴스, 계정 간 동기화(미러 on 사용자), Firebase Auth 토큰 검증 경로.
3. 서버 쓰기 실패는 fail-soft: 예) universe-daily는 Firestore 쓰기 실패 시에도 200 + `persistWarning` 반환 (`src/app/api/cron/universe-daily/route.ts:101-109`).
4. 과금 폭증/악용 의심 시 긴급 잠금: Firebase Console → Rules → `allow write: if false` (`docs/incident-response.md` §3.1).
5. 복구 후: 미러 on 사용자는 다음 5분 주기에서 해시 비교 → 자동 재동기화. 별도 수동 조치 불요.

---

## 3. 배포 롤백 (Vercel)

> 상세·트리거 기준은 `docs/rollback-policy.md`. 요약:

1. **즉시 롤백 (P0)**: Vercel Dashboard → Deployments → 직전 정상 배포 → **"Promote to Production"** (~수초).
   - CLI: `vercel rollback <deployment-url>` 또는 `vercel promote <url>`.
2. **git 롤백**: `git revert <bad-sha> && git push` (force-push 금지 — 이력 보존).
3. 롤백 후 검증: `/api/health` 200 + `/api/readiness` probe 통과 확인.
4. 롤백 트리거: 5xx 급증(Vercel Logs/Sentry) · `stripe_claim_sync_failed` 연속 · `/api/readiness` fail · 빌드 실패(CI가 머지 차단).

---

## 4. 웹훅 장애 (Stripe 재전송)

### 코드 동작 (`src/app/api/stripe/webhook/route.ts`)
| 상황 | 응답 | Stripe 재전송 여부 |
|---|---|---|
| `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` 미설정 | **503** | 재전송됨 (의도된 설계 — line 46 주석) |
| 시그너처 검증 실패 | 400 | 재전송됨 (단, 시크릿 불일치면 계속 실패 — 설정 수정 필요) |
| claim 동기화 실패 (`stripe_claim_sync_failed`) | **200** (fail-safe) | **재전송 안 됨** ← 주의 |

### 절차
1. **운영상 가장 위험한 케이스 = claim 동기화 실패**: webhook은 200을 반환하므로 Stripe는 재전송하지 않는다. Vercel Logs에서 `stripe_claim_sync_failed` / `stripe_claim_sync_threw` 이벤트를 감시하고, 검출 시:
   - 원인 진단: `VERTEX_AI_CREDENTIALS` service account에 **Firebase Authentication Admin** 역할 부여 여부 확인 (route 헤더 주석).
   - 수동 재처리: Stripe Dashboard → Developers → Webhooks → 해당 endpoint → 이벤트 선택 → **Resend**.
2. webhook endpoint 전체 다운(5xx) 시: Stripe가 자동 재시도하므로 endpoint 복구가 우선. 복구 후 Dashboard에서 실패 이벤트 일괄 Resend.
3. 시크릿 회전 시: Stripe Dashboard에서 새 signing secret 발급 → Vercel env `STRIPE_WEBHOOK_SECRET` 교체 → 재배포 → 테스트 이벤트 발송으로 확인.
4. 결제 자체가 깨졌으면 (`checkout` 5xx 등): `docs/stripe-revenue-path.md` 진단 + 필요 시 결제 기능 플래그 보류 (`docs/rollback-policy.md` §2).

---

## 5. 인시던트 연락 체크리스트

- [ ] 심각도 분류 (S0~S3 — `docs/incident-response.md` §1)
- [ ] 1차 연락: `gilheumpark@gmail.com`
- [ ] GitHub Issue 생성: `gilheumpark-bit/eh-universe-web` + label `incident`
- [ ] S0(데이터/보안)이면: 배포 중단 · 증거 보존 (Vercel 로그 스크린샷, Sentry issue ID, 영향 Firestore 문서 export)
- [ ] 키 유출 시 즉시 회전: Gemini / OpenAI / Claude / Stripe / CRON_SECRET
- [ ] 사용자 영향 공지 (S1+): 배너 또는 `/status`
- [ ] 종결 후: 타임라인·근본원인·재발방지 3줄 이상을 GitHub Issue에 기록

### 미구현 (정직 표기)
- 24/7 on-call 없음 (1인 운영 — 오프라인 시 대응 지연).
- 자동 알람(Slack/Discord webhook) 0건 — Sentry DSN 설정 시 에러 알람만 (`docs/rollback-policy.md` §6).
- `/status` 페이지의 자동 장애 공지 파이프라인 없음 (수동 게시).
