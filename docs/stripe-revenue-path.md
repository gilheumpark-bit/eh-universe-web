# Stripe Revenue Path — 활성화·검증 가이드 (2026-06-06)

> 결제 → Pro tier(`stripeRole`) 활성 경로. 코드 배선 완료, **활성화는 config + 런타임 검증 필요**(아래).

## 배선된 것 (코드)
| 단계 | 파일 | 동작 |
|---|---|---|
| checkout 생성 | `lib/stripe.ts` `getStripeSession` | 인증 `auth.uid` → `client_reference_id` + `subscription_data.metadata.firebaseUid` 심음 |
| checkout 호출 | `api/checkout/route.ts` | `getStripeSession(price, undefined, returnUrl, auth.uid)` |
| webhook | `api/stripe/webhook/route.ts` | `checkout.session.completed`/`subscription.updated(active)` → `setStripeRoleClaim(uid)` · `subscription.deleted` → `clearStripeRoleClaim(uid)` |
| claim set | `lib/firebase-auth-admin-rest.ts` | Identity Toolkit `accounts:update` (service-account JWT, scope `identitytoolkit`) |
| tier read | `lib/firebase-id-token.ts` | token claim `stripeRole==='pro'` → tier 'pro' (무변경) |

**fail-safe**: claim 동기화 실패해도 webhook 항상 200 (Stripe 재전송 방지). 미설정 시 graceful no-op(로그만).
**테스트**: webhook 17개(claim-sync 5) + claim-setter fail-safe 4개 green.

## 활성화 (사용자 config) — 모두 충족해야 결제→Pro 동작
1. **Stripe** (Vercel 환경변수, Production scope):
   - `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `NEXT_PUBLIC_STRIPE_PRICE_ID`
   - `FEATURE_STRIPE_CHECKOUT=on` (checkout route feature gate 해제)
2. **Stripe Dashboard → Webhooks**: endpoint `https://<도메인>/api/stripe/webhook`, 이벤트 `checkout.session.completed`·`customer.subscription.*`·`invoice.*`
3. **Service account** (`VERTEX_AI_CREDENTIALS`): 해당 서비스 계정에 **Firebase Authentication Admin** 역할 부여 (custom claim set 권한). `NEXT_PUBLIC_FIREBASE_PROJECT_ID` 설정.
4. **클라이언트**: 결제 성공 후 ID token **force-refresh** (`getIdToken(true)`) — custom claim 은 다음 토큰 갱신 시 전파됨(즉시 X, 최대 1시간).

## ⚠️ 런타임 검증 필요 (코드만으론 미확인)
- **Identity Toolkit `accounts:update` 엔드포인트·스코프** — Firebase 문서 대조 + 실 호출 1회 검증 (`firebase-auth-admin-rest.ts` PART 3). 응답 200 + token refresh 후 `stripeRole` 반영 확인.
- 실 Stripe test mode 결제 → webhook 수신 → claim set → `verifyFirebaseIdToken` tier 'pro' end-to-end 1회.
- subscription.deleted → claim clear → tier 'free' 복귀 확인.

## 미동작 시 진단 (apiLog event)
- `stripe_claim_sync_failed` (meta.error): `no_service_account`(SA env) / `no_project_id`(project env) / `http_403`(SA 역할 부족) / `http_4xx`(엔드포인트/스코프).
- claim 동기화는 로그됨 — Vercel Logs 에서 `stripe_claim_synced`/`stripe_claim_sync_failed` 확인.
