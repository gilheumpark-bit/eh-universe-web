# Loreguard Feature Flags

Last updated: 2026-06-24

2026-06-24 baseline note:

- Reviewed after the cleanup/document refresh pass.
- Current public-surface rule and disabled compatibility-route policy remain unchanged.

This file records the current app feature gates. Code remains the source of truth; this document prevents stale docs from reviving removed surfaces.

## Server And Commercial Gates

| Flag / Env | Default | Source | Meaning |
|---|---:|---|---|
| `FEATURE_STRIPE_CHECKOUT` | `off` | `.env.example`, `src/app/api/checkout/route.ts`, `src/app/api/release-credit/checkout/route.ts` | Enables Stripe Checkout routes when set to `on` and Stripe env vars are present. |
| `NEXT_PUBLIC_SHOW_PUBLIC_PRICES` | `off` | `.env.example`, `src/app/pricing/page.tsx`, `src/components/loreguard/tabs/TabExport.tsx` | Keeps public price amounts hidden during audition/request-first operation. Set to `on` only when public sales copy is ready. |
| `NEXT_PUBLIC_PAYMENT_LIVE` | unset / false | `src/lib/tier-gate.ts`, `src/lib/server-tier-limit.ts` | Turns off open-beta assumptions and applies Hosted usage limits. This is the single public payment-live switch. |
| `FEATURE_AGENT_SEARCH` | `off` | `.env.example`, disabled route docs | Kept off. Agent Search and Network Agent routes are compatibility responses only. |
| `RELEASE_CREDIT_ADMIN_SECRET` | unset | `src/app/api/release-credit/operation/route.ts` | Required for internal purchase/refund/void release-credit operations. |
| `STRIPE_SECRET_KEY` | unset | `src/lib/stripe.ts` | Required for subscription and release-credit checkout sessions. |
| `STRIPE_WEBHOOK_SECRET` | unset | `src/app/api/stripe/webhook/route.ts` | Required for Stripe webhook signature verification. |

## Client Feature Flags

Boolean client flags use local override key `ff_<FLAG>` and environment override `NEXT_PUBLIC_FF_<FLAG>`.

| Flag | Default | Source | Meaning |
|---|---:|---|---|
| `IMAGE_GENERATION` | `false` | `src/lib/feature-flags.ts` | Keeps in-app visual generation disabled by default. Enable only for internal/development API testing with explicit env override. |
| `GOOGLE_DRIVE_BACKUP` | `true` | `src/lib/feature-flags.ts` | Enables Google Drive backup surface. |
| `OFFLINE_CACHE` | `true` | `src/lib/feature-flags.ts` | Enables local offline cache and backup behavior. |
| `EPISODE_COMPARE` | `true` | `src/lib/feature-flags.ts` | Enables cross-episode comparison tools. |
| `CLOUD_SYNC` | `false` | `src/lib/feature-flags.ts` | Firestore cloud sync. Must remain opt-in because of cost and privacy implications. |
| `GITHUB_SYNC` | `true` | `src/lib/feature-flags.ts` | Enables GitHub manuscript backup/sync utilities. |
| `SECURITY_GATE` | `true` | `src/lib/feature-flags.ts` | Enables request/input security checks. |
| `GITHUB_ETAG_CACHE` | `true` | `src/lib/feature-flags.ts` | Enables GitHub cache/rate-limit protection. |
| `ARI_ENHANCED` | `true` | `src/lib/feature-flags.ts` | Enables provider health tracking and route fallback metrics. |
| `FEATURE_FIRESTORE_MIRROR` | `false` | `src/lib/feature-flags.ts` | Secondary Firestore mirror; requires explicit user consent. |

## Three-Mode Flags

| Flag | Default | Values | Source | Meaning |
|---|---:|---|---|---|
| `FEATURE_JOURNAL_ENGINE` | `shadow` | `off`, `shadow`, `on` | `src/lib/feature-flags.ts` | Shadow mode writes observational journal data without replacing the primary save path. |
| `FEATURE_DRAFT_DETAIL_V2` | `off` | `off`, `shadow`, `on` | `src/lib/feature-flags.ts` | Draft/detail generation flow. It is not a public default surface while `off`. |

## Release Evidence Gates

These are not feature flags. They are evidence requirements:

- T2 live Stripe billing
- T11 signed C2PA external chain

Local code and tests can prepare these paths, but they remain HOLD until real external or staging evidence files are attached and `npm run gate:evidence` passes.

## Removed Surface Rule

Do not add flags that expose Code Studio, Network, Archive, Codex, Reports, Reference, Rulebook, or Tools as public product surfaces. If an old route remains, document it as disabled compatibility or a private developer route only.
