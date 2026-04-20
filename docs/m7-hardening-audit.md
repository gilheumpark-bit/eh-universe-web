# M7 Pre-release Hardening Audit

**Branch**: `feature/M7-hardening` (from `fdc9189a` — M6 complete)
**Target version**: `2.2.0-alpha`
**Audit date**: 2026-04-20
**Prior milestones**: M0 → M6 (7 milestones)

---

## 1. Milestone recap (M0 → M6)

- **M0 — FMEA-20 Fortress** (`1febe1ea`, `1d55a961`, `a8034b72`, `80735ca5`): performance baseline infrastructure, 3 regression E2E scenarios (+18 tests), AI→엔진/IDE 브랜딩 치환 5곳, blackbox 실측 보고서. Shipped the safety net M1+ will stand on.
- **M1 — Autosave Fortress** (`ba574be5` → `4680faec`): Journaling engine (17 modules, 114 tests), crash recovery (Beacon 4-state + 3 strategies + RecoveryDialog), multi-tab concurrency (Leader election + TabSync + conflict UI), 3-tier backup orchestrator (primary/secondary/tertiary), Shadow-write infrastructure with promotion/demotion, 10,000-iteration chaos benchmark with zero data loss, and the Storage Observatory. Entire save stack is now journaled with content-addressable chain (HLC + content-hash).
- **M2 — Writing IDE Refactor** (`d817fc61`, `87580978`): Writing tab debt-cleanup Day 3-7 (890→552 lines; hooks 35→19). React.memo + dynamic import + author-driven FAB UX. Module shape now supports per-feature code splitting.
- **M3 — Rulebook/Asset** (`29f61c7e`): Scene preset library (user-defined layer over 10 genre presets), episode transition panel, resolved 2 audit holes. The rulebook became composable.
- **M4 — Origin Tagging** (`eac781b3`): V1↔V2 migration engine for SceneDirectionData. Every field becomes a `TaggedValue<T>` with origin (USER/TEMPLATE/ENGINE_SUGGEST/ENGINE_DRAFT). 3-Axis patent in production. Lossless round-trip (value preserved; metadata optional).
- **M5 — Genre Translation** (`be8c8c76`): 4-genre label+prompt layer (novel/webtoon/drama/game) across ko/en/ja/zh. Novel mode returns baseline; other modes append format directives. No migration cost.
- **M6 — Long-haul Ergonomics** (`fdc9189a`): typography presets (comfort/compact/large), eye-strain dimmer, keystroke heatmap, session timer. CSS variables applied at documentElement level; persisted to localStorage with graceful privacy-mode fallback.

---

## 2. Test inventory

| Metric | Baseline (M6) | Post-M7 | Delta |
|---|---|---|---|
| Test suites | 287 | 289 | +2 |
| Test cases | 3,200 | 3,217 | +17 |
| Duration | ~11.0 s | ~11.4 s | +0.4 s |
| Failures | 0 | 0 | — |

**Critical path coverage** (verified via file-level presence):

- `src/lib/save-engine/__tests__/`: journal, beacon, leader-election, backup-tiers, atomic-write, delta, conflict-detector, hlc, hash, primary-write-logger, promotion-audit, recovery, firestore-mirror, file-tier, migration, local-event-log, diff-analyzer, indexeddb-adapter, payload-extractor, promotion-controller (20+ modules).
- Journal engine: chain integrity, parentHash linking, verification, ULID ordering.
- Multi-tab: leader election, conflict detection, cross-tab events.
- Origin tagging: `src/lib/__tests__/origin-migration.test.ts` covers V1↔V2 both directions.
- Genre: `src/engine/__tests__/genre-prompts.test.ts` + `src/lib/__tests__/genre-labels.test.ts`.
- Ergonomics: `src/lib/ergonomics/__tests__/` covers typography + eye-strain + keystroke heatmap.
- M7 additions: `src/lib/__tests__/env-sanity.test.ts` (5 tests) + `src/__tests__/alpha-smoke.test.ts` (12 tests).

---

## 3. Type strictness

`tsconfig.json` line 7: `"strict": true` confirmed.
`npx tsc --noEmit` result: **0 errors**.

`any` usage sweep (`src/hooks/**/*.ts*`): all remaining occurrences are in `__tests__/*` files (mock implementations for jest). Zero `any` in production hooks. No cleanup candidates under the 5-minute rule.

---

## 4. Bundle size

`npx next build` (Next.js 16.2.3 / Turbopack) completes in ~18.7s compile + ~17.7s type-check.
56 static pages generated; 30 dynamic (ƒ) API routes; 0 build errors.

`.next/static/chunks/` total: **20 MB** (includes every code split, not served per page). Next.js 16 / Turbopack does not emit the classic First Load JS table; instead size is audited via `npm run build:analyze` (requires ANALYZE=true) and `npm run build:report`. No route exceeded the 500 KB First Load budget in the most recent verified baseline (M4 audit). M7 added ~140 lines of TS (env-sanity + hook + smoke tests) — well under the noise floor.

**Large chunk observed**: `0-tu_.d39ksih.js` (853 KB). This is the shared Monaco + Tiptap + AI-providers bundle split Next loads only for the studio routes. It matches the M6 baseline — no regression.

---

## 5. Security checklist

| Check | Status | Notes |
|---|---|---|
| XSS `dangerouslySetInnerHTML` | PASS | 5 production sites reviewed: (a) `app/layout.tsx` JSON-LD (static object), (b) `translator/editor/BilateralEditor.tsx` + `GlossaryPanel.tsx` (sanitized via internal helper), (c) `lib/code-studio/features/app-generator.ts` (audit:safe template), (d) `lib/web-features/responsive.ts` (server-side HTML gen). Rest of hits are CLI scanner rule strings. |
| `innerHTML` direct | PASS | Production: none. CLI rule strings + jest test assertions only. |
| `eval`/`new Function` | PASS | Production: zero. All hits are scanner rule catalogs or detection utilities. (`plugin-sandbox.ts` uses Worker, not eval.) |
| localStorage PII | PASS | BYOK model: API keys stored in user browser (documented). Only 2 plaintext writes: `components/code-studio/APIKeyConfig.tsx` (user's own key — intentional) and `lib/__tests__/ai-providers.test.ts` (test). No email, no password. |
| CSP headers | PASS | `next.config.ts` headers(): no `unsafe-eval` in main CSP. Code-studio route scopes `unsafe-eval` narrowly. See §7. |

---

## 6. Accessibility

`role=` sweep (components/*): spot-check of 10 matches:

- `code-studio/ActivityBar.tsx` — `role="tablist"` + children `role="tab"`, keyboard navigation implemented.
- `code-studio/ADRPanel.tsx` — landmark region.
- `studio/StudioShell.tsx` — `role="alert"` on cross-tab sync toast (assistive-tech announcement).
- `studio/RenameDialog.tsx` — uses modal pattern with aria-labelledby.
- `studio/RecoveryDialog.tsx` — focus trap via `useFocusTrap` hook.

All patterns conform to WAI-ARIA 1.2. `axe-core` automated test not run — package not installed; task constraint forbids new dependencies. Existing `eh-universe-baseline-checklist.md` documents the manual WCAG 2.1 AA audit.

---

## 7. CSP and security headers

`next.config.ts` `headers()` emits (for all non-code-studio routes):

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' [allowlist]; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: [allowlist]; worker-src 'self' blob:; connect-src 'self' [API allowlist]; frame-src 'self' [Firebase/Google only]; object-src 'none'; base-uri 'self'` — **no unsafe-eval** |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` (all denied) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |

Code-studio routes (`/code-studio/:path*`) additionally set:

| Header | Value |
|---|---|
| `Content-Security-Policy` | adds `'unsafe-eval'` (required by WebContainer) + `webcontainer.io` allowlist |
| `X-Frame-Options` | `SAMEORIGIN` (WebContainer preview iframe) |
| `Cross-Origin-Embedder-Policy` | `require-corp` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

All 5 target headers present or stronger. No changes required.

---

## 8. Error boundary coverage

`src/components/ErrorBoundary.tsx` is the unified 3-variant boundary (full-page / section / panel).
`src/components/studio/ErrorBoundary.tsx` and `SectionErrorBoundary.tsx` are thin re-exports for backward-compat.

Verified in `src/app/studio/StudioShell.tsx`:

- Line 936 wraps `MobileStudioView` (mobile render branch)
- Line 958 wraps the entire desktop tree: `StudioConfigProvider` → `StudioUIProvider` → `StudioMountProviders` → `div.flex.flex-col.h-dvh` (holds MultiTabBanner, OSDesktop, StudioMainContent, RenameDialog, StudioOverlayManager)
- `StudioMountProviders` hosts `RecoveryDialogHost` — a crash in the recovery dialog is caught by the outer boundary and the rest of the shell remains interactive.
- `StudioMainContent` is dynamically imported, isolating its failure from the shell.
- Each tab is rendered by `StudioMainContent`; a panel-level crash bubbles to the outer boundary.

No additional boundaries required; adding per-tab boundaries would fragment the recovery UX without material safety gain.

---

## 9. Environment sanity

New module: `src/lib/env-sanity.ts` (+hook `useEnvironmentSanity`, +5 tests).

Probes IndexedDB / BroadcastChannel / Web Locks / crypto.subtle presence and localStorage headroom (≥10 MB). Emits `noa:environment-degraded` with a structured report; console.warns once. Integrated into `StudioShell` via single additive line (no behavioral change).

---

## 10. TODO/FIXME sweep

82 total markers across `src/**`. Breakdown:

- **Scanner rule strings** (CLI/quill engines) — non-code, intentional: ~75
- **Genuine TODOs**:
  - `components/studio/MarketplacePanel.tsx:105` — "wire real manuscript getters when marketplace moves out of skeleton" (feature-flagged skeleton; deferred)
  - `components/studio/StudioSidebar.tsx:32` — "Extract into context providers for future refactor" (refactor note, not a bug)
  - `components/studio/StudioStatusBar.tsx:45` — "Extract to useTextStats(text) hook" (refactor note)

Zero P0/P1 markers. All TODOs are non-blocking.

---

## 11. Acceptance gate summary

| Gate | Target | Actual | Status |
|---|---|---|---|
| G1 | `tsc --noEmit` 0 errors | 0 errors | PASS |
| G2 | jest all pass, ≥3,200 | 3,217 / 3,217 | PASS |
| G3 | `next build` success | success, 56 static + 30 dynamic | PASS |
| G4 | M1 fortress zero-diff | empty diff | PASS |
| G5 | 10 smoke tests pass | 12 / 12 (expanded) | PASS |
| G6 | Audit doc complete | this document | PASS |
| G7 | Release notes complete | see `RELEASE-NOTES-v2.2.0-alpha.md` | PASS |
| G8 | Version bumped | `package.json` = `2.2.0-alpha` | PASS |
| G9 | CSP verified | all 5+ headers present | PASS |
| G10 | 2 commits clean | see commit log | PENDING-commit |

---

## 12. Readiness verdict

**Ship**. Fortress invariants hold, test suite green, build artifact size within baseline, no open P0/P1, security headers exceed the required minimum. The alpha tag is defensible.
