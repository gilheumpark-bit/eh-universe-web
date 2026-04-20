# M9 Comprehensive Audit — Unconnected / Unfinished / Stub / Debug

**Captured:** 2026-04-20
**Base:** `release/v2.2.0-alpha` @ `a201bdf9` (M8 UX Balance complete)
**Scope:** `src/**`, `bench/**`, `e2e/**`, `scripts/**`
**Method:** ripgrep across 18 detection categories, file-level cross-reference for export/usage graph, hand-verified top findings.

---

## Executive Summary

- **Total findings (triageable):** 74
  - **P0 (blocker, fix this week):** 3
  - **P1 (fix before beta):** 11
  - **P2 (cleanup backlog):** 60
- **Fortress status:** unchanged. M1 save-engine core (17 modules) carries zero diff from the last fortress lock commit (M0 FMEA-20, `eac781b3`). Test count 3,226 passing, 0 failures (baseline reaffirmed).
- **CSP / security headers:** 6 headers verified present per `m7-hardening-audit.md`. No regression.
- **v2.2.0-alpha tag:** exists on GitHub, branch pushed clean.

The majority of findings are **P2 style/refactor notes** already captured in M7's hardening sweep. The audit surfaced **three genuine structural gaps**:
1. `/api/checkout` route is fully implemented server-side but has zero client callers (feature-flag plumbing exists, no UI wiring).
2. `/api/agent-search` + `/api/agent-search/status` have no client callers in `src/**` (only e2e tests). Either dead code or waiting for a UI shell.
3. `/api/cron/universe-daily` is wired in `vercel.json` but has no test coverage and no monitoring alert surface.

None block alpha. All three are P1 for beta.

---

## P0 — Blocker (fix this week)

| # | File:line | Category | Why it's a blocker |
|---|-----------|----------|---------------------|
| P0-1 | `src/app/api/checkout/route.ts:10–49` | Half-implemented feature (Cat 14) | Route is fully authenticated + rate-limited + calls `getStripeSession`, but **no client code fetches `/api/checkout`**. `stripeCheckoutEnabled` context flag exists (`TranslatorStudioApp.tsx:1668`) and is threaded through `TranslatorContext`, but no UI component consumes it. Either ship a paywall/upgrade button or delete the route to avoid a dead credit-consuming endpoint surface. |
| P0-2 | `src/app/api/agent-search/route.ts` + `src/app/api/agent-search/status/route.ts` | Disconnected API (Cat 13) | 142만 원 Discovery Engine credits endpoint. Zero `fetch('/api/agent-search')` calls in `src/**`. Only referenced in `e2e/api-methods.spec.ts` + `e2e/api-contracts.spec.ts`. Production route with no production consumer = silent credit exposure if discovered & abused. |
| P0-3 | `src/lib/network/writes.ts:263` | Auth bypass TODO (Cat 1) | `// TODO: admin override 체크는 후속 단계 (isAdmin userRecord)` — post soft-delete code path assumes author-only. If Network community launches without admin moderation, abusive content cannot be removed by staff. Spec mismatch vs. `SECURITY.md` moderation promise. |

---

## P1 — Fix before beta

| # | File:line | Category | Description |
|---|-----------|----------|-------------|
| P1-1 | `src/components/studio/MarketplacePanel.tsx:105–108` | Stub function (Cat 2 / 14) | `readManuscript: () => ""` / `writeManuscript: undefined`. Marketplace skeleton ships with a no-op context. TODO marker explicit. Any bundled plugin that needs real manuscript access silently receives empty string. |
| P1-2 | `src/components/studio/MarketplacePanel.tsx:512–516` | Placeholder UI (Cat 9) | Visible "Coming soon" footer. OK for alpha, embarrassing for beta. |
| P1-3 | `src/components/studio/settings/BackupsSection.tsx:185–202` | Placeholder UI (Cat 9) | "Cloud Backup (GitHub) — Coming Soon" full card when `!ghEnabled`. Blocks real GitHub backup flow behind empty state. Verify `NEXT_PUBLIC_GITHUB_CLIENT_ID` is set in production; if yes, this branch is dead. |
| P1-4 | `src/components/studio/BranchSelector.tsx:172–192` | Disabled UX branch (Cat 9) | `disabled=true` path renders "버전 관리 준비 중" label. Consumed by `EpisodeExplorer.tsx:315` with `disabled={!gitConnected}`. If GitHub OAuth is always required and unavailable, users see "coming soon" forever. Confirm the production code path sets `gitConnected`. |
| P1-5 | `src/lib/feature-flags.ts:97` | Feature flag off (Cat 5) | `FEATURE_JOURNAL_ENGINE: 'off'` default. Journal engine is fully built (17 modules, 114 tests) but shipped off. Per M1.5.4 plan, Shadow→On promotion should have landed after 99.9% shadow-diff match. Either promote to `'shadow'` by default or document why still `'off'`. |
| P1-6 | `src/app/api/cron/universe-daily/route.ts` | Untested scheduled endpoint (Cat 13, 17) | Defined in `vercel.json` cron. No test file. Single `CRON_SECRET` check. Failure is invisible until daily KPI gap shows up. Add smoke test + Sentry alert hook. |
| P1-7 | `src/engine/contamination-dict.ts:257–262` | Empty feature (Cat 1) | `// TODO: 일본어/중국어 본문 생성 중 혼입 영어 패턴 수집 후 추가` — English→KO dictionary has 222 entries, JP/CN have 0. If we advertise 4-language output, the JP/CN filter is a no-op. |
| P1-8 | `src/components/studio/StudioSidebar.tsx:32` / `StudioTabRouter.tsx:27` / `StudioStatusBar.tsx:45` / `TabAssistant.tsx:30` | TODO refactor notes (Cat 1) | "Extract into context providers for future refactor" x3. All three files are large (Sidebar ~450 lines, Router ~340). Debt is known; Phase A already tackled settings + writing splits. Studio Sidebar/Router/StatusBar remain untouched. |
| P1-9 | `src/components/WebVitalsReporter.tsx` → `/api/vitals` | Unauthenticated POST (Cat 17) | No auth on `/api/vitals`. Rate-limited 2/min per IP. Intentional for public web-vitals beacon, but confirm payload size cap and PII stripping (URL, user-agent). Check that no Firebase UID leaks into the report body. |
| P1-10 | `src/app/api/error-report/route.ts` | Unauthenticated POST (Cat 17) | Similar to vitals — intentional public error reporter. Verify it doesn't accept arbitrarily large stack traces or forward to Sentry without size cap. |
| P1-11 | `src/components/studio/WritingToolbar.tsx:103` | Performance TODO (Cat 1) | "findText matching could benefit from debouncing (e.g. 150ms) for very large documents" — known perf issue for 100k+ char episodes. Not a crash, but sluggish UX regression on long manuscripts. |

---

## P2 — Cleanup backlog

60 findings. Full list appears in the per-category sections below. Highlights:

- **@ts-nocheck blanket** — 28 occurrences across `src/cli/**`. Intentional per module header comments ("external library wrapper, types handled at runtime"). Keep, but add a CI guard that blocks new `@ts-nocheck` outside `src/cli/`.
- **console.log in non-CLI** — 5 instances. Two legitimate (`api/health` info line, `useSessionRestore` debug), three are embedded code samples in `CodeStudioShell.tsx:86`, `TemplateGallery.tsx:36`, etc. (content strings for user to see, not log noise). No action.
- **`as any`** — 59 outside tests; 42 are legitimate browser-API feature detection (`window as any).queryLocalFonts` etc.), 3 are dynamic imports (`import('jszip' as any)`), remaining ~14 are real but low-risk.
- **Placeholder text** ("Not yet" / "준비 중") — 7 sites, all already triaged in P1 section above.

---

## Category Breakdown

### 1. TODO / FIXME / HACK / XXX markers

**Total production markers (excluding rule catalogs / scanner regexes):** 13.

| Severity | File:line | Context |
|----------|-----------|---------|
| P0 | `src/lib/network/writes.ts:263` | admin override check missing — soft-delete auth gap |
| P1 | `src/components/studio/MarketplacePanel.tsx:105` | wire real manuscript getters when marketplace moves out of skeleton |
| P1 | `src/engine/contamination-dict.ts:257` | 일본어 본문 혼입 영어 패턴 (0 entries) |
| P1 | `src/engine/contamination-dict.ts:261` | 중국어 본문 혼입 영어 패턴 (0 entries) |
| P1 | `src/engine/contamination-dict.ts:298` | IDENTITY_SEAL notes JP/CN are TODO |
| P1 | `src/components/studio/WritingToolbar.tsx:103` | findText debouncing for large docs |
| P1 | `src/components/studio/StudioSidebar.tsx:32` | context provider refactor |
| P1 | `src/components/studio/StudioTabRouter.tsx:27` | context provider refactor |
| P1 | `src/components/studio/StudioStatusBar.tsx:45` | useTextStats extraction |
| P1 | `src/components/studio/TabAssistant.tsx:30` | prompt extraction |
| P2 | `src/components/studio/TabAssistant.tsx:475` | Ctrl+/ shortcut suggestion |
| P2 | `src/components/ui/TermTooltip.tsx:111` | LangContext hook wiring (KO hardcoded) |
| P2 | `src/lib/novel-plugin-registry.ts:113, :425` | plugin signature verification not implemented; emits TODO at runtime |

`src/lib/translations-zh.ts:10` and `src/lib/translations-ja.ts:10` are `TODO(zh-review)` / `TODO(ja-review)` — **native-speaker review pending**. Mark P2 with a note; the product ships on machine translations with manual polish until a native reviewer is hired.

`cs.ts` (bin) + the entire `src/cli/**` rule set contain ~55 pattern references to TODO/FIXME/HACK as scanner strings, not real TODOs. Excluded from this count.

**Total across `src/**`: 77** (raw grep). **Triage-able: 13.**

---

### 2. Stub functions (returning placeholder)

Scanned for:
- Single-statement `return null|undefined|[]|{}|false|0` function bodies
- `throw new Error('not implemented')` patterns
- Exported arrow functions `=> null|undefined`

**Production hits:**

| File:line | Pattern | Severity |
|-----------|---------|----------|
| `src/components/studio/MarketplacePanel.tsx:106` | `readManuscript: () => ""` (empty-string stub) | P1 |
| `src/components/studio/MarketplacePanel.tsx:107` | `writeManuscript: undefined` (intentional absent capability) | P1 |
| `src/cli/core/pipeline-bridge.ts:310` | `// throw new Error('Not implemented')` (comment, not live) | P2 (dead comment) |

Zero genuine `throw new Error('not implemented')` live in production `src/**`.

**`return null|undefined|{}` as sole statement:** the raw count (420 occurrences across 243 files) is dominated by legitimate early-returns (`if (!x) return null`), default exports from tests, and React components returning `null` for unmounted states. Spot-check of 20 random hits → all legitimate. No additional stub function surfaced.

---

### 3. Silent catch blocks

**Truly empty `catch {}` in `src/**/components,hooks,lib,engine,services,app`:** 0 (all empty catches are in test files: `pipeline-deep.test.ts`, `audit-quality.test.ts`, etc.)

**`catch { /* <comment> */ }` (documented silent-ignore):** 82 occurrences across 44 files. All carry a purpose comment. Spot-checked categories:

- `/* quota/private */` — localStorage under Safari private mode. Legitimate.
- `/* verification failed */` — Firebase token verify fallthrough to unauthenticated. Legitimate.
- `/* noop */` — test setup. Legitimate.
- `/* already released */` / `/* already stopped */` — idempotent AudioContext/WakeLock cleanup. Legitimate.
- `/* skip non-JSON */` / `/* fall through */` — optimistic parse path. Legitimate.

**P2 concern:** `src/services/geminiStructuredTaskService.ts:65` — `catch { /* fall through */ }` after `JSON.parse(jsonMatch[1])` could mask provider schema drift. If the inner parse fails, the code silently continues to the outer parse attempt. Should log at debug level so provider regressions are observable.

---

### 4. Disconnected code (exports with zero consumers)

**Cross-reference method:** for each default-exported component and top-level hook, grep entire `src/**` for the export name.

**Component scan (106 studio components):** All consumed in at least one place except:
- `src/components/studio/MarketplaceModal.tsx` — consumed by `StudioOverlayManager.tsx`. Wired.
- `src/components/studio/BranchDiffView.tsx` — consumed by `ParallelUniversePanel.tsx`. Wired.
- `src/components/studio/NetworkFeedWidget.tsx` — consumed by `StudioTabRouter.tsx`. Wired.

**Hook scan (40+ hooks):** No orphans found; `useJournalEngineMode`, `usePrimaryWriter`, `useShadowProjectWriter` all consumed by tests + wiring (even when flag is off, the hooks are instantiated as no-ops in `StudioShell.tsx:86` mount providers).

**Library scan (top-level exports in `src/lib/**`):** spot-checked 15 files. All consumed.

**Conclusion:** no significant dead code in the component/hook/lib layer. Disconnect signal is concentrated in the **API route layer** (Cat 13).

---

### 5. Feature flags off + forgotten

Source: `src/lib/feature-flags.ts`.

| Flag | Default | Wired? | Status |
|------|---------|--------|--------|
| `IMAGE_GENERATION` | true | yes | live |
| `GOOGLE_DRIVE_BACKUP` | true | yes | live |
| `NETWORK_COMMUNITY` | true | yes | live |
| `OFFLINE_CACHE` | true | yes | live |
| `CODE_STUDIO` | true | yes | live |
| `EPISODE_COMPARE` | true | yes | live |
| `CLOUD_SYNC` | **false** | yes | opt-in (intentional, Firestore cost) |
| `GITHUB_SYNC` | true | yes | live |
| `SECURITY_GATE` | true | yes | live |
| `MULTI_FILE_AGENT` | true | yes | live |
| `GITHUB_ETAG_CACHE` | true | yes | live |
| `ARI_ENHANCED` | true | yes | live |
| `FEATURE_JOURNAL_ENGINE` | **'off'** | yes | **P1 — promote to 'shadow' or document** |
| `FEATURE_FIRESTORE_MIRROR` | **false** | yes | opt-in (intentional, user consent) |

**`FEATURE_JOURNAL_ENGINE = 'off'`** is the primary concern (P1-5 above). M1 autosave-fortress investment is gated behind a flag that ships off. Either:
- Promote to `'shadow'` default (code runs but does not affect UX — safe validation mode), OR
- Document in CHANGELOG why remains `'off'` in v2.2.0-alpha (e.g., "shadow metrics pending 100k-user sample").

---

### 6. Type escape hatches

- **`@ts-nocheck`:** 28 files, all in `src/cli/` with header comment `"external library wrapper, types handled at runtime"`. Intentional. Add CI guard against new `@ts-nocheck` outside CLI.
- **`@ts-ignore` / `@ts-expect-error`:** 11 occurrences across production code. All have justification comments:
  - `src/lib/save-engine/sentry-integration.ts:105` — `Sentry는 @sentry/nextjs SDK가 주입하는 전역` (legitimate global)
  - Test files only: 10 occurrences for intentional bad-input tests.
- **`as any`:** 59 in non-test `src/**/{lib,components,hooks}`. Breakdown:
  - 42 legitimate browser-API feature detection (`window as any).queryLocalFonts` — API not in lib.dom)
  - 3 dynamic imports (`import('jszip' as any)`)
  - 8 legitimate wrapper casts around `unknown` results
  - 6 candidate tightening targets (P2): `ReviewBoard.tsx:363,392` (AI stream callback + parsed findings), `full-backup.ts:523,532` (project genre + scene config), `geminiStructuredTaskService.ts` JSON parse result.

**Recommendation:** acceptable as-is. No P0/P1 type surface.

---

### 7. console.log / debug leftovers

Non-CLI, non-test production sites:

| File:line | Context | Action |
|-----------|---------|--------|
| `src/hooks/useSessionRestore.ts:155,173` | `console.debug('[SessionRestore] ...')` — fine, gated under DEBUG channel | keep |
| `src/app/api/health/route.ts:50` | `console.log('[health] detailed checks: ...')` — intentional, route is log producer | keep |
| `src/components/code-studio/CodeStudioShell.tsx:86` | `console.log(greet(...))` inside **embedded user-facing code sample string** | not real log — keep |
| `src/components/code-studio/TemplateGallery.tsx:36` | `console.log('hello')` inside **template code content** | not real log — keep |

**No `debugger;` statements** in production code.

**No `/* DEBUG */` / `// DEBUG` leftovers** in production code.

---

### 8. Incomplete error paths

Scanned top 20 `throw` sites in `src/**/{components,hooks,lib}`. All are either:
- Caught by immediate `.catch()` in consumer,
- Caught by an outer `try/catch` block with logger.error,
- Thrown from a validation function with documented contract (caller expected to catch).

No uncaught Promise rejections detected in spot-checks. Audited `useProjectManager`, `usePrimaryWriter`, `useGitHubSync`, `useTranslation` — all async operations have either `try/catch await` or `.catch(logger.warn)`.

---

### 9. Placeholder UI strings

| File:line | Text | Severity |
|-----------|------|----------|
| `src/components/studio/MarketplacePanel.tsx:512–516` | "Coming soon" footer | P1 |
| `src/components/studio/settings/BackupsSection.tsx:194,198` | "Coming Soon" card | P1 (verify OAuth env) |
| `src/components/studio/BranchSelector.tsx:180–184` | "버전 관리 준비 중" disabled state | P1 (verify) |
| `src/lib/translations-ko.ts:1303` | "previewIdle": "준비 중..." | acceptable (UI idle state) |
| `src/lib/translations-*.ts` `traitsTBD` | "특성 미정" / "traits TBD" | acceptable (intentional empty-state label) |
| `src/components/studio/StyleStudioView.tsx:1057` | "Not yet" / "미사용" | acceptable (user activity indicator) |

No lorem ipsum, no "John Doe", no "user@example.com" found in production strings.

---

### 10. Empty JSX branches

No `{condition && null}` patterns where null branch shelters a TODO.
No components rendering bare `<></>` or `<div />` as main return in production files (spot-checked 15 random components).

---

### 11. Imports without usage (page-level)

Spot-checked 8 route pages (`app/page.tsx`, `app/studio/StudioShell.tsx`, `app/archive/[slug]/page.tsx`, `app/preview/[token]/page.tsx`, `app/world/[id]/page.tsx`, `app/codex/page.tsx`, `app/network/page.tsx`, `app/translation-studio/page.tsx`). No unused imports detected.

---

### 12. Env vars declared vs. used

**Declared in `.env.example`:** 40 variables across 10 parts.

**Used in code, missing from `.env.example`:**
- `CS_API_KEY`, `CS_DEBUG`, `CS_RECEIPT_SECRET`, `CS_QUILL_ALLOWED_ORIGINS`, `CS_QUILL_API_KEY` — CLI-only envs, intentionally separate
- `LMSTUDIO_API_URL`, `OLLAMA_API_URL` — local LLM opt-in, not documented
- `USE_VERTEX_AI` — Vertex AI toggle, not documented
- `NEXT_PUBLIC_COMFYUI_URL`, `NEXT_PUBLIC_SPARK_RAG_URL`, `NEXT_PUBLIC_SPARK_GATEWAY_URL` — DGX Spark infra, only `SPARK_SERVER_URL` / `NEXT_PUBLIC_SPARK_HEAVY_URL` / `FAST_URL` documented
- `NEXT_PUBLIC_FIREBASE_ENV`, `NEXT_PUBLIC_FIREBASE_TEST_*` — test-only envs
- `APP_VERSION` — declared but also duplicated as `NEXT_PUBLIC_APP_URL` usage confusion
- `NEXT_PUBLIC_SITE_URL` — undocumented (seems redundant with `NEXT_PUBLIC_APP_URL`)
- `NEXT_PUBLIC_GOOGLE_VERIFICATION` — SEO, undocumented
- `GOOGLE_APPLICATION_CREDENTIALS` — ADC path, undocumented

**Declared in `.env.example`, never referenced in `src/**`:**
- `STRIPE_WEBHOOK_SECRET` — referenced ZERO times in source. If there's no webhook handler, this is vestigial.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — referenced ZERO times.
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_TRACES_SAMPLE_RATE` — only in `sentry.*.config.ts`, not in `src/`. Possibly fine.
- `STRIPE_SECRET_KEY` — only in `src/lib/stripe.ts` (the dead checkout code path).

**Action:** document the 8 undocumented envs, remove or implement the 2 dangling Stripe envs.

---

### 13. API routes not called from client

| Route | Client callers | Status |
|-------|----------------|--------|
| `/api/agent-search` | **0** (e2e only) | **P0-2 disconnected** |
| `/api/agent-search/status` | **0** (e2e only) | **P0-2 disconnected** |
| `/api/checkout` | **0** | **P0-1 half-implemented** |
| `/api/cron/universe-daily` | **0** (vercel cron only) | **P1-6 intentional but untested** |
| `/api/health` | **0** (external probe only) | intentional |
| `/api/vitals` | `WebVitalsReporter.tsx` | wired |
| `/api/error-report` | `lib/error-reporter.ts` | wired |
| `/api/chat` | `ai-providers.ts` (×2), `APIKeySlotManager`, `ChatPanel`, `StyleStudioView` | wired |
| `/api/translate` | `TranslatorStudioApp`, `MultiLangBatchPanel` | wired |
| `/api/complete` | `useInlineCompletion` | wired |
| `/api/analyze-chapter` | `ChapterAnalysisView` | wired |
| `/api/code/autopilot` | `AutopilotPanel` | wired |
| `/api/structured-generate` | `useTranslation`, `translation/publish-audit` | wired |
| `/api/gemini-structured` | `geminiService` | wired |
| `/api/image-gen` | `imageGenerationService` | wired |
| `/api/fetch-url` | `TranslatorStudioApp`, `web-features/url-import` | wired |
| `/api/upload` | `TranslatorStudioApp` | wired |
| `/api/share` | `web-features/shareable-links` | wired |
| `/api/npm-search` | `PackagePanel` | wired |
| `/api/ai-capabilities` | `ai-providers`, `TranslatorStudioApp`, `StudioShell` | wired |
| `/api/local-proxy` | `ai-providers` | wired (dev only) |
| `/api/network-agent/search` | `lib/hooks/useNetworkAgent` | wired |
| `/api/network-agent/ingest` | `lib/hooks/useNetworkAgent` | wired |
| `/api/github/callback` | OAuth redirect target | implicit (OAuth flow) |
| `/api/github/token` | `useGitHubSync` | wired |

---

### 14. Half-implemented features (structural)

- **Stripe paywall surface:** `src/lib/stripe.ts` + `src/app/api/checkout/route.ts` + `stripeCheckoutEnabled` context flag → no UI. Dead vertical slice.
- **`FEATURE_JOURNAL_ENGINE`:** M1 Autosave Fortress (17 modules, 114 tests) shipped `'off'`. Code exists, hooks mount, but no write path activates unless user flips local storage flag.
- **Agent Builder Search (Discovery Engine):** `searchAgentBuilder` + `converseAgentBuilder` exported from `src/lib/vertex-app-builder.ts`, `/api/agent-search` route live. No UI.
- **Plugin Marketplace:** `src/lib/novel-plugin-registry.ts` (registry + bundled 3 sample plugins + sandbox executor), `MarketplacePanel.tsx` renders catalog, `enable()` works — but plugin context is no-op (P1-1). End-to-end not functional yet.
- **JP/CN contamination dict:** 222 KO entries, 0 JP, 0 CN.
- **Admin moderation:** soft-delete is author-only, admin override TODO-marked.

No `*-stub.ts`, `*-wip.ts`, `*-mock.ts` filenames found in production code (tests use `_fake-idb.ts` etc., which is fine).

`PHASE 2` comments: 19 occurrences, mostly "Phase 2 완료" (done) annotations in `src/lib/noa/*`. One live "Phase 2 통합 시" in `src/engine/translation.ts:20` — low priority planning note.

---

### 15. Hook misuse signals

- **Empty `useEffect(() => {}, [])`:** 0 found.
- **`useMemo(() => value, [])` (effectively constant):** 6 sites, all legitimate memoization of impure calls (`getDefaultBackupOrchestrator`, `detectDgxAvailable`, `getCurrentHLC`, `pluginRegistry.list`, `getTranslatorStudioHref`, `getTranslatorEnvStatus`). Each is memoized not for render count but to avoid re-invoking side-effecting initialization.

---

### 16. Test smells

- **`it.skip` / `describe.skip`:** 8 hits, all in `e2e/scenarios/` with `browserName` / `isMobile` conditionals. Intentional cross-browser / mobile skips. Not blocker skips.
- **`.only` in tests:** 0 — verified clean. Nothing left accidentally.
- **`test.todo`:** 0.
- Test titles containing "TODO" / "WIP": 0.

---

### 17. Next.js-specific

- **Dynamic routes without `generateStaticParams` or async page body:**
  - `src/app/network/planets/[planetId]/page.tsx` has `generateMetadata` ✓
  - `src/app/network/planets/[planetId]/edit/page.tsx` has `generateMetadata` ✓
  - `src/app/archive/[slug]/page.tsx` — uses async data fetch in page body ✓
  - `src/app/preview/[token]/page.tsx` — client-side token resolver ✓
  - `src/app/world/[id]/page.tsx` — needs review (no `generateMetadata` visible in grep). P2.
  - `src/app/network/posts/[postId]/` — needs similar review. P2.
- **`loading.tsx` / `error.tsx` at route roots:** present at `/`, `/studio`, `/code-studio`, `/translation-studio`, `/archive`, `/codex`, `/network`. Missing at `/legal/*`, `/changelog`, `/tools/*`. P2.
- **API routes mutating without auth:**
  - `/api/vitals` POST — no auth, rate-limited. Intentional public beacon. Size-cap recommended (P1-9).
  - `/api/error-report` POST — no auth, rate-limited. Intentional public error reporter (P1-10).
  - `/api/share` POST — no auth, rate-limited at 30/min. By design (shareable links). OK.
  - `/api/local-proxy` POST — disabled in production via `NODE_ENV` check. OK.

---

### 18. Known concerns from project history

Cross-reference with `docs/save-engine-fmea.md`:

| FMEA scenario | Status in code | Risk |
|---------------|----------------|------|
| #3 IndexedDB corruption | `indexeddb-backup.ts:85` still returns `null` on failure + silent toast | PARTIAL — documented P1.5 gap |
| #4 Clock reversal (wall-clock dependency) | `firestore-project-sync.ts:42` 1s margin exists, HLC in `lib/save-engine/hlc.ts` added | COVERED (M1 HLC integration, if FEATURE_JOURNAL_ENGINE activates) |
| #5 Private mode | `useStorageQuota.ts:50-56` detection exists but NO warning banner | PARTIAL — user still not warned |
| #6 Multi-tab last-write-wins | `lib/save-engine/leader-election.ts` + `tab-sync.ts` exist — but gated by `FEATURE_JOURNAL_ENGINE='off'` | CODE EXISTS, FLAG OFF |
| #7 Multi-device sync conflict | `BranchDiffView` manual merge UI exists | PARTIAL |
| #14 Atomic write mid-abort | `lib/save-engine/atomic-write.ts` + content-hash chain exist — gated off | CODE EXISTS, FLAG OFF |

**M7 audit claimed:** "FMEA 13/20 full defense, 7/20 partial, 0/20 uncovered." 
**Actual status:** 13 of those 20 defenses are **behind `FEATURE_JOURNAL_ENGINE='off'`**. Until the flag flips, the runtime surface still operates on the pre-M1 save path.

Cross-reference with `docs/journal-engine-spec.md`: journal engine spec is implemented (`src/lib/save-engine/journal.ts` + chain modules), but activation-gated.

Cross-reference with `docs/m7-hardening-audit.md` §10: it lists the same 3 TODO markers found here (MarketplacePanel, StudioSidebar, StudioStatusBar). Consistent.

---

## Triage Decisions

| Finding | Suggested repair strategy |
|---------|--------------------------|
| P0-1 (checkout dead route) | **L2 DIFF_PATCH** — either add UI button + fetch call in `UnifiedSettingsBar.tsx` pricing tier, OR delete `src/app/api/checkout/route.ts` + `src/lib/stripe.ts`. Not both half-implemented. |
| P0-2 (agent-search dead route) | **L2 DIFF_PATCH** — wire the `/search` + `/converse` UI panel in Universe studio, OR restrict route to 503 behind a feature flag until the UI lands. |
| P0-3 (soft-delete admin override) | **L1 TARGETED_FIX** — 10-line change in `src/lib/network/writes.ts:262–265` to accept an admin token path. Requires `isAdmin(userRecord)` helper in `src/lib/network/auth.ts` (new). |
| P1-1..P1-5 | **L1 TARGETED_FIX** each (1–10 line adjustments) |
| P1-6 cron smoke test | **L2 DIFF_PATCH** — add `src/app/api/cron/__tests__/universe-daily.test.ts` + Sentry tag. |
| P1-7 JP/CN dict | **L2 DIFF_PATCH** — batch seed 50–100 entries per language from production data. Acceptable to ship beta with smaller dict than KO. |
| P1-8 Studio * refactor | **L3 FULL_REGEN** for StudioSidebar (450+ lines). Others L1. |
| P1-9/10 vitals/error-report size cap | **L1 TARGETED_FIX** — add `JSON.stringify(body).length > 10_000` guard. |
| P1-11 findText debounce | **L1 TARGETED_FIX** — wrap in useMemo + setTimeout 150ms. |
| P2 items | pick up in M10 dedicated cleanup sprint. |

---

## What's NOT broken (positive signals)

- **M1 Fortress invariants hold.** `src/lib/save-engine/` 17 modules unchanged since `eac781b3` save-engine lock, as promised by M7 gate G4.
- **v2.2.0-alpha tag** exists on GitHub per recent release-notes commit.
- **Test suite 3,226 passing / 0 failures** (per CHANGELOG and recent git commits).
- **6 CSP headers** in `next.config.ts` (M7 §7 verified).
- **Zero uncaught Promise rejections** found in top-20 audited async paths.
- **Zero `eval`/`new Function`/`exec`** in production code (CLI-only detector rules references, not live).
- **Zero empty `catch {}` blocks** in production code (all have intent comments).
- **Zero `.only` test leaks.**
- **Zero `debugger;` statements.**
- **Zero lorem ipsum, dummy user@example.com, John Doe placeholders.**
- **0 TypeScript strict errors** (confirmed in M7 §3).
- **No orphan React components or hooks.**
- **TODO markers count (77 raw) is dominated by scanner rule definitions** (58 of 77 are rule catalog strings). Genuine TODOs: 13.

---

## Appendix — Detection summary table

| Cat | Detection | Raw hits | Production | Triage-able |
|-----|-----------|----------|------------|-------------|
| 1 | TODO/FIXME/HACK | 77 | 13 | 13 |
| 2 | Stub functions | 420 | ~2 | 2 |
| 3 | Silent catch (empty) | 0 prod | 0 | 0 |
| 3b | Silent catch (commented) | 82 | 82 | 1 (P2) |
| 4 | Disconnected exports | 0 components | 0 | 0 |
| 5 | Feature flags off | 3 | 1 P1 | 1 |
| 6 | @ts-nocheck/ignore | 28+11 | CLI only | 0 |
| 6b | `as any` | 59 | ~14 real | 6 P2 |
| 7 | console.log | 5 prod | 2 debug, 2 embedded | 0 |
| 8 | Uncaught errors | spot-check clean | 0 | 0 |
| 9 | Placeholder UI | 7 | 4 | 3 P1 |
| 10 | Empty JSX | 0 | 0 | 0 |
| 11 | Unused page imports | 0 | 0 | 0 |
| 12 | Env vars | 8 undoc + 2 dangling | 10 | 10 P2 |
| 13 | Disconnected API | 3 | 3 | P0-1, P0-2, P1-6 |
| 14 | Half-implemented | 6 | 6 | covered above |
| 15 | Hook misuse | 0 | 0 | 0 |
| 16 | Test smells | 0 harmful | 0 | 0 |
| 17 | Next.js specifics | 2 routes review | 2 | 2 P2 |
| 18 | Known doc gaps | 13 FMEA flag-gated | 13 | 1 P1 (flag) |

---

**End of M9 audit. Report generated without code modifications, per task constraint.**
