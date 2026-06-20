# Loreguard Local Secret Rotation Checklist

Date: 2026-06-14
Status: action required before any production handoff

## 2026-06-15 결제 전 운영 잠금

- `.env.local`의 민감 값은 배포 기준값으로 쓰지 않는다. 배포 런타임은 Vercel encrypted environment variables 또는 관리형 secret store를 정본으로 둔다.
- `NEXT_PUBLIC_PAYMENT_LIVE=true`는 Stripe checkout, webhook, tier gate, Upstash rate limit, release credit debit 검증이 끝난 뒤에만 켠다.
- `FEATURE_STRIPE_CHECKOUT=on`은 실제 결제 테스트 계정과 webhook 검증이 준비된 환경에서만 켠다.
- `npm run check:local-secrets`는 비밀값 마커뿐 아니라 `FEATURE_STRIPE_CHECKOUT=on`·`NEXT_PUBLIC_PAYMENT_LIVE=true`의 필수 환경값 조합도 차단한다. 로컬 재고 확인은 `-- --warn-only`로 실행한다.
- Upstash가 연결되지 않은 환경은 로컬 개발 또는 제한된 파일럿으로만 취급한다. 유료 공개 환경에서는 in-memory rate limit fallback을 운영 정본으로 보지 않는다.
- Stripe webhook 실패 알림, release credit 차감 실패 알림, tier claim sync 실패 알림은 결제 전 P0 운영 알림으로 묶는다.
- 리딤은 아직 활성 기능이 아니다. `/api/redeem`과 리딤 입력 UI가 생기기 전까지 문서와 화면에서 판매 중 기능처럼 말하지 않는다.

## Scope

This checklist covers secrets found in local-only environment files such as `.env.local`.
Do not paste, screenshot, or commit actual secret values into this document.

## Immediate Actions

1. Treat the current local service-account key as exposed if it appeared in a report, screen share, backup bundle, or copied transcript.
2. Revoke the old Google Cloud or Firebase service-account key from Google Cloud IAM.
3. Create a replacement key only if the app still needs service-account JSON locally.
4. Prefer Vercel encrypted environment variables for deployed runtime secrets.
5. Remove short-lived OIDC or JWT values from local env files. These should be issued by the platform at runtime, not stored as project configuration.
6. Restrict service-account roles to the minimum needed for Firestore or certificate registry writes. Avoid Owner and Editor roles.
7. Re-check Firebase authorized domains and Firestore rules after key rotation.
8. Re-run the local secret marker check:

```bash
npm run check:local-secrets -- --warn-only
```

Use `--warn-only` for local inventory. Without `--warn-only`, the command fails when blocking local secrets are present.

## Secret Storage Policy

| Secret class | Local `.env.local` | Vercel encrypted env | Notes |
|---|---:|---:|---|
| `NEXT_PUBLIC_*` public client config | allowed | allowed | Public by design; still restrict Firebase domains and rules. |
| Server provider keys | avoid | required for hosted mode | Use connection-key mode for user-supplied keys; do not expose server keys to the client. |
| Stripe secret keys and webhook secrets | avoid | required when checkout is enabled | Keep `FEATURE_STRIPE_CHECKOUT=off` until real payment tests are ready. |
| GCP/Firebase service-account private key | temporary only | preferred | Rotate if copied, logged, or shared. |
| OIDC/JWT tokens | no | platform-issued runtime token only | Do not store long opaque tokens in env files. |
| Internal LAN endpoints | allowed for local dev only | avoid | Prefer public/private deployment endpoints per environment. |

## Deployment Notes

- `vercel.json` keeps chat and translation function duration aligned with route-level `maxDuration = 60`.
- `src/lib/rate-limit.ts` defines route-level request caps. Production should use the distributed backend described in `docs/adr/0011-rate-limit-backend.md`.
- `next.config.ts` still uses `unsafe-inline` in CSP because the current Next.js app needs inline scripts. The nonce CSP follow-up remains separate work.

## Done Criteria

- Old service-account key revoked.
- Replacement secrets stored in Vercel encrypted env vars or another managed secret store.
- `.env.local` reduced to local-only public config and temporary development values.
- `npm run check:local-secrets -- --warn-only` output reviewed with no unexpected `CRITICAL` or `HIGH` rows.
- Deployed `/api/readiness` confirms distributed rate limiting when production Upstash env vars are configured.
