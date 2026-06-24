# Current Architecture

Last updated: 2026-06-24

2026-06-24 baseline note:

- This architecture summary was rechecked after the repo cleanup pass.
- Current Playwright repo baseline changed, but the active product shape below remains valid.

## Current Shape

This repository is a Next.js web app centered on Loreguard.

Active product surfaces:

- Loreguard Studio
- Translation Studio
- Docs/about/pricing/status/legal pages
- Verify and creative-process public verification support

Removed public product surfaces:

- Code Studio
- Network
- Archive
- Codex
- Reports
- Reference
- Rulebook
- Tools
- World detail route

## Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Jest 30
- Playwright
- Tiptap editor packages
- Firebase, Supabase, Stripe, Sentry integration points

## Routes

Active app routes under `src/app`:

| Route | Role |
|---|---|
| `/` | product entry |
| `/studio` | Loreguard creative IDE |
| `/translation-studio` | translation workflow |
| `/docs` | user docs |
| `/about` | product explanation |
| `/pricing` | pricing |
| `/status` | status |
| `/changelog` | public changelog |
| `/terms`, `/privacy`, `/copyright`, `/ai-disclosure`, `/cookies`, `/refund` | legal/support |
| `/verify`, `/offline`, `/welcome`, `/preview`, `/payment` | supporting flows |

## Loreguard Studio

Primary files:

- `src/app/studio/page.tsx`
- `src/app/studio/StudioShell.tsx`
- `src/app/studio/StudioContext.tsx`
- `src/components/loreguard/LoreguardStudio.tsx`
- `src/components/loreguard/LoreguardShell.tsx`
- `src/components/loreguard/tabs/*`

Current Loreguard tabs:

1. Project creation
2. World creation
3. Character and item
4. Main scenario
5. Scene sheet
6. Direction
7. Writing
8. Revision
9. Translation and localization
10. Export package

Supporting panels:

- History
- Visual
- Memo
- Revision
- IP Asset
- Creative Process Journal
- World Ops

`StudioShell` is now a provider envelope for the Loreguard shell. Former desktop/mobile chrome and old tab-router rendering have been removed.

## Creative Process Layer

Main path:

- `src/lib/creative-process/*`

Responsibilities:

- process events
- source records
- append-only audit
- seal issuing
- chain verification
- attestation text
- process reports
- HTML/Markdown rendering
- QR rendering
- submission package
- C2PA-ready manifest
- regulatory profile

Important rule:

> Creative process modules provide records and confirmation artifacts, not legal substitutes.

## AI Layer

Main paths:

- `src/lib/ai/writing-agent-registry.ts`
- `src/lib/ai/creative-domain-prompts/*`
- `src/lib/ai/creative-domain-storage.ts`
- `src/lib/ai/safety-registry.ts`
- `src/services/geminiService.ts`
- `src/services/geminiStructuredTaskService.ts`

Current Noa and agent registry covers:

- studio drafting
- inline completion
- inline rewrite
- detail pass
- proofread report
- direction proposal
- translation stages
- story bible translation
- creative structured JSON

Removed compatibility entries:

- 구 네트워크 검색 에이전트
- 구 아카이브 검색 그라운딩 가드
- 구 HSE 검색 방어 가드

These entries are no longer registered in `writing-agent-registry.ts`. The remaining compatibility routes are not user-facing features:

- `POST /api/agent-search` — disabled compatibility response
- `GET /api/agent-search/status` — disabled compatibility response
- `GET/POST /api/network-agent/search` — retired surface response
- `GET/POST /api/network-agent/ingest` — retired surface response

Canonical current state:

- `docs/redeem-agent-operations-2026-06-14.md`
- `docs/NOA_POLICY.md`

## Redeem And Entitlement Layer

Redeem is not an active shipped feature yet.

Current billing state:

- `POST /api/checkout` exists behind `FEATURE_STRIPE_CHECKOUT=on` and Stripe env configuration.
- Stripe webhook and Firebase custom claim sync are wired but require runtime verification before commercial activation.
- `/api/redeem` does not exist.
- No public redeem-code input surface should be documented as active.

Future redeem should be implemented as entitlement application, not as a direct payment bypass. Required records:

- code id
- user id or group id
- applied entitlement type
- expiry
- idempotency key
- receipt/process log

## Writing Workspace Utilities

Main path:

- `src/lib/writing-workspace/*`

This folder contains writing IDE utilities that were formerly under a desktop-oriented path.

Examples:

- auto-save
- command palette
- context block
- export spec
- global search index
- keymap
- panel resize
- revision analysis
- toast store
- workspace prefs
- writing stats
- zen mode

These are active Loreguard writing-workspace utilities, not desktop-product code.

## Translation Studio

Main paths:

- `src/app/translation-studio`
- `src/components/translator`
- `src/lib/translation`

Responsibilities:

- translation workflow
- source integrity
- process records
- author sign-off
- DOCX/export helpers
- translation environment status

Translation author premise:

- The author may not understand the target language.
- The UI must not ask the author to judge foreign-language sentence quality.
- Translation review must surface Korean-readable risk explanations, back-translation or Korean comparison evidence, and recommendation states: `추천`, `보류`, `비추천`.
- Author decisions should focus on meaning changes, intent conflicts, character/setting drift, release hold/release approval, and process records.

Translation Studio is active.

Current product decision:

- Keep `/translation-studio` as the advanced translation workspace.
- Keep Studio tab 9, `Translation and localization`, as the in-flow release step.
- Do not delete the dedicated route until the in-flow tab has parity for source integrity, multi-language batch, author sign-off, save/backup, and translation evidence review.
- If parity is reached, the route can become a deep-link shell or redirect into Studio rather than a separate product surface.

## Removed Surface Guard

The following should not appear in active route, nav, sitemap, shortcut, action, modal, or translation-key surfaces:

- `code-studio`
- `Code Studio`
- `Codex`
- `/archive`
- `/network`
- `/reports`
- `/reference`
- `/rulebook`
- `/tools`

Historical docs may mention them if clearly treated as history.

## Verification Baseline

Use:

```bash
npx tsc --noEmit
```

For targeted behavior:

```bash
npx jest <test files> --cacheDirectory .jest-cache
```

Known existing Jest warning:

```text
Unknown option "setupFilesAfterEach"
```

This warning is a separate config cleanup item unless it blocks tests.
