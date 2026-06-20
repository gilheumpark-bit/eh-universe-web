# Stripe Revenue Path — 활성화·검증 가이드 (2026-06-15)

> 결제 → Pro tier(`stripeRole`) 활성 경로. 코드 배선 완료, **활성화는 config + 런타임 검증 필요**(아래).
> 리딤 코드는 아직 활성 기능이 아니다. 리딤 기준은 `docs/redeem-agent-operations-2026-06-14.md`를 따른다.

## 배선된 것 (코드)
| 단계 | 파일 | 동작 |
|---|---|---|
| checkout 생성 | `lib/stripe.ts` `getStripeSession` | 인증 `auth.uid`와 서버 해석 `planId` → `client_reference_id`, 세션 metadata, 구독 metadata에 심음 |
| checkout 호출 | `api/checkout/route.ts` | `getStripeSession(price, undefined, returnUrl, auth.uid, planId)` |
| webhook | `api/stripe/webhook/route.ts` | `checkout.session.completed`/`subscription.updated(active)` → `subscriptions/{uid}` 플랜 동기화 + `setStripeRoleClaim(uid)` · `subscription.deleted` → 구독 상태 취소 기록 + `clearStripeRoleClaim(uid)` |
| claim set | `lib/firebase-auth-admin-rest.ts` | Identity Toolkit `accounts:update` (service-account JWT, scope `identitytoolkit`) |
| tier read | `lib/firebase-id-token.ts` | token claim `stripeRole==='pro'` → tier 'pro' (무변경) |
| Hosted 모델 제한 | `lib/server-tier-limit.ts` | `/api/chat`, `/api/complete`, `/api/structured-generate`, `/api/gemini-structured`, `/api/analyze-chapter`, `/api/translate`, `/api/image-gen`의 `local-spark`에서 Firebase tier claim 또는 사용자 연결 키 여부를 확인 |
| Paywall 안내 | `lib/noa/paywall-notice.ts`, `components/loreguard/PaywallNoticeCard.tsx` | `401 login_or_byok_required` 또는 `402 plan_limit_reached` 응답을 플랜 보기/키 설정 안내로 표시 |

**fail-safe**: claim 동기화 실패해도 webhook 항상 200 (Stripe 재전송 방지). 미설정 시 graceful no-op(로그만).
**테스트**: webhook 17개(claim-sync 5) + claim-setter fail-safe 4개 green.

## 활성화 (사용자 config) — 모두 충족해야 결제→Pro 동작
1. **Stripe** (Vercel 환경변수, Production scope):
   - `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `NEXT_PUBLIC_STRIPE_PRICE_ID`
   - `FEATURE_STRIPE_CHECKOUT=on` (checkout route feature gate 해제)
   - `NEXT_PUBLIC_SHOW_PUBLIC_PRICES=on` (오디션/사전 이용 기간이 끝난 뒤 공개 가격 숫자 노출)
2. **Stripe Dashboard → Webhooks**: endpoint `https://<도메인>/api/stripe/webhook`, 이벤트 `checkout.session.completed`·`customer.subscription.*`·`invoice.*`
3. **Service account** (`VERTEX_AI_CREDENTIALS`): 해당 서비스 계정에 **Firebase Authentication Admin** 역할 부여 (custom claim set 권한). `NEXT_PUBLIC_FIREBASE_PROJECT_ID` 설정.
4. **클라이언트**: 결제 성공 후 ID token **force-refresh** (`getIdToken(true)`) — custom claim 은 다음 토큰 갱신 시 전파됨(즉시 X, 최대 1시간).

## 리딤/이용권 적용 상태

| 항목 | 상태 |
|---|---|
| `/api/redeem` | 없음 |
| 리딤 코드 입력 UI | 없음 |
| 출고 상품 라인 | 반영. 과정기록 카드, C2PA 회차 패키지, 완결 과정기록, 완결 출고 패키지 Pro, Publisher 제출 패키지를 `src/lib/billing/loreguard-plans.ts`에서 관리 |
| 출고 크레딧 미리보기 | 반영. 프로젝트별 idempotency key와 발급 전 상태를 `release-credit-preview`로 남김 |
| 확인서/출고 크레딧 차감 원장 코어 | 반영. `src/lib/billing/release-credit-ledger.ts`에서 중복 차감 방지, 차감, 환불/복구, 조직 플랜 무제한 처리를 순수 원장 함수로 관리 |
| 정확한 플랜 동기화 | 반영. checkout metadata와 webhook 구독 문서로 Starter/Studio/Pro 출고 크레딧 수량을 구분 |
| 실제 서버 차감 라우트 | 반영. `POST /api/release-credit/debit`가 인증된 유료 사용자의 구독 문서로 프로젝트별 월 원장을 초기화하고, idempotency와 Firestore updateTime precondition으로 중복/경합 차감을 막음 |
| 별도 구매·재발급·환불 원장 API | 반영. `POST /api/release-credit/operation`에서 구매 반영, 환불/복구, 차감 취소, 재발급 기록을 원장 작업으로 처리. 구매·환불·복구는 내부 서버 secret 필요 |
| Stripe one-off 결제 세션 | 반영. `POST /api/release-credit/checkout`가 확인서 단건 구매용 Checkout payment mode를 만들고, webhook이 `release_credit_purchase` metadata를 읽어 `purchase-grant`를 자동 반영 |
| 구독 checkout | feature gate 뒤 준비 |
| Publisher/그룹 좌석 | 결제 설계 반영. 구독 one-click checkout 대상이 아니라 계약형 조직 플랜으로 유지하고, `publisher-package` 별도 출고 상품·조직 제출 패키지·무제한 원장 규칙으로 처리 |

리딤은 Stripe checkout의 대체 경로가 아니라, 서버 검증 후 엔타이틀먼트를 적용하고 영수증을 남기는 별도 원장으로 구현한다.
구현 전까지 가격/문서/앱 화면에서 리딤을 즉시 사용 가능한 기능처럼 쓰지 않는다.

## Hosted 노아 호출 과금 경계

`NEXT_PUBLIC_PAYMENT_LIVE=true`일 때는 Hosted 모델 호출이 Free/Pro 제한을 따른다. `OPEN_BETA` 해제 기준은 이 공개 운영 플래그 하나로 고정한다. `STRIPE_SECRET_KEY`는 checkout/webhook 서버 라우트의 실행 조건일 뿐, 키가 존재한다는 이유만으로 베타 제한이 꺼지지는 않는다. 결제 전 검증은 반드시 payment-live 로컬 시나리오로 수행한다.

| 시나리오 | 기대 동작 |
|---|---|
| 비로그인 + 사용자 키 없음 | `401 login_or_byok_required` + Paywall 안내 |
| Free + Hosted | 일일 제공량까지 허용, 초과 시 `402 plan_limit_reached` |
| Pro + Hosted | Pro 제한 기준 적용 |
| BYOK | Hosted 사용량 카운트 제외 |
| Local 모드 | 로컬 프록시/로컬 서버 계약을 따르며 Hosted tier 카운트 제외 |

적용 라우트: `/api/chat`, `/api/complete`, `/api/structured-generate`, `/api/gemini-structured`, `/api/analyze-chapter`, `/api/translate`, `/api/image-gen`의 `local-spark`.
`/api/lsp/*`는 모델 비용 라우트가 아니므로 LSP token/rate-limit 계약을 유지한다.

## ⚠️ 런타임 검증 필요 (코드만으론 미확인)
- **Identity Toolkit `accounts:update` 엔드포인트·스코프** — Firebase 문서 대조 + 실 호출 1회 검증 (`firebase-auth-admin-rest.ts` PART 3). 응답 200 + token refresh 후 `stripeRole` 반영 확인.
- 실 Stripe test mode 결제 → webhook 수신 → claim set → `verifyFirebaseIdToken` tier 'pro' end-to-end 1회.
- subscription.deleted → claim clear → tier 'free' 복귀 확인.
- `NEXT_PUBLIC_PAYMENT_LIVE=true` 로컬에서 비로그인/Free/Pro/사용자 연결 키/Local 모드별 `/api/chat`, `/api/complete`, `/api/structured-generate`, `/api/gemini-structured`, `/api/analyze-chapter`, `/api/translate`, `/api/image-gen` 제한 응답 확인.

## 미동작 시 진단 (apiLog event)
- `stripe_claim_sync_failed` (meta.error): `no_service_account`(SA env) / `no_project_id`(project env) / `http_403`(SA 역할 부족) / `http_4xx`(엔드포인트/스코프).
- claim 동기화는 로그됨 — Vercel Logs 에서 `stripe_claim_synced`/`stripe_claim_sync_failed` 확인.
