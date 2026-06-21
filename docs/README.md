# Loreguard Docs Index

Last updated: 2026-06-16

This folder contains the current documentation baseline for the Loreguard web app.

## Current Source Of Truth

Read these first:

- `docs/ARCHITECTURE.md` — current app shape and active/removed surfaces
- `docs/API.md` — API route contract
- `docs/FEATURE_FLAGS.md` — runtime and local feature gates
- `docs/PRODUCT-FRAME.md` — product framing
- `docs/loreguard-creative-ide-design-master-plan-2026-06-18.md` — Creative IDE design master plan and 1000-point design gate
- `docs/redeem-agent-operations-2026-06-14.md` — redeem, entitlement, Noa, and inactive agent-route state
- `docs/stripe-revenue-path.md` — Stripe, subscription entitlement, and release-credit flow
- `docs/release-evidence/README.md` — external evidence intake rules for release gates
- `docs/security/auth-matrix.md` — auth and route protection matrix

## Active Product Surfaces

- Loreguard Studio: `/studio`
- Translation Studio: `/translation-studio`
- Public docs/status/pricing/legal routes
- Verify and creative-process public verification support

## Removed Public Surfaces

The following names may remain in historical documents or compatibility route notes, but must not be treated as active product promises:

- Code Studio
- Network
- Archive
- Codex
- Reports
- Reference
- Rulebook
- Tools

When a current feature needs an old capability, describe it with Loreguard terms such as history, import, reference context, export package, and settings.

## Release State

The static/local app checks can pass while release evidence remains on HOLD. The current external blockers are tracked by:

```powershell
npm run gate:evidence:remaining
```

Do not mark Stripe billing, signed C2PA manifest storage, legal review, provider attestation, or staging replay as complete until a real evidence JSON under `docs/release-evidence/` passes `npm run gate:evidence`.
