# Loreguard Day 0 Gate Report

Generated: 2026-06-12T19:52:28+09:00

## Verdict

- Day 0 static baseline: **PASS**
- Release verdict: **HOLD**
- Reason: T0~T15 local baseline is clean, but release evidence intake verdict is HOLD.
- Release evidence status: **HOLD** (docs/gates/release-evidence-status-2026-06-12.json)

## Scope

- Source files scanned: 1289
- Production code files scanned: 883
- App routes: 20
- API routes: 41
- API high-risk rows: 21
- Static blocker findings: 0

## P0 Inventory

### App Routes

| Route | File |
| --- | --- |
| `/` | `src/app/page.tsx` |
| `/about` | `src/app/about/page.tsx` |
| `/ai-disclosure` | `src/app/ai-disclosure/page.tsx` |
| `/changelog` | `src/app/changelog/page.tsx` |
| `/cookies` | `src/app/cookies/page.tsx` |
| `/copyright` | `src/app/copyright/page.tsx` |
| `/docs` | `src/app/docs/page.tsx` |
| `/offline` | `src/app/offline/page.tsx` |
| `/payment/cancel` | `src/app/payment/cancel/page.tsx` |
| `/payment/success` | `src/app/payment/success/page.tsx` |
| `/preview/[token]` | `src/app/preview/[token]/page.tsx` |
| `/pricing` | `src/app/pricing/page.tsx` |
| `/privacy` | `src/app/privacy/page.tsx` |
| `/refund` | `src/app/refund/page.tsx` |
| `/status` | `src/app/status/page.tsx` |
| `/studio` | `src/app/studio/page.tsx` |
| `/terms` | `src/app/terms/page.tsx` |
| `/translation-studio` | `src/app/translation-studio/page.tsx` |
| `/verify` | `src/app/verify/page.tsx` |
| `/welcome` | `src/app/welcome/page.tsx` |

### API Routes And Tool/Permission Inventory

| Risk | Route | Capabilities | File |
| --- | --- | --- | --- |
| L | `/api/agent-search` | - | `src/app/api/agent-search/route.ts` |
| L | `/api/agent-search/status` | - | `src/app/api/agent-search/status/route.ts` |
| M | `/api/ai-capabilities` | auth-or-claims, ai-provider-call | `src/app/api/ai-capabilities/route.ts` |
| M | `/api/analyze-chapter` | auth-or-claims, ai-provider-call | `src/app/api/analyze-chapter/route.ts` |
| H | `/api/chat` | auth-or-claims, ai-provider-call, proxy-or-egress | `src/app/api/chat/route.ts` |
| H | `/api/checkout` | payment-or-stripe, auth-or-claims | `src/app/api/checkout/route.ts` |
| M | `/api/complete` | external-fetch, auth-or-claims, ai-provider-call | `src/app/api/complete/route.ts` |
| H | `/api/cp/register` | payment-or-stripe, auth-or-claims, destructive-action | `src/app/api/cp/register/route.ts` |
| H | `/api/cp/verify/[id]` | auth-or-claims, proxy-or-egress | `src/app/api/cp/verify/[id]/route.ts` |
| M | `/api/cron/universe-daily` | auth-or-claims, ai-provider-call | `src/app/api/cron/universe-daily/route.ts` |
| H | `/api/csrf` | auth-or-claims, persistent-write, destructive-action | `src/app/api/csrf/route.ts` |
| H | `/api/error-report` | auth-or-claims, proxy-or-egress | `src/app/api/error-report/route.ts` |
| H | `/api/fetch-url` | external-fetch, proxy-or-egress | `src/app/api/fetch-url/route.ts` |
| M | `/api/gemini-structured` | auth-or-claims, ai-provider-call | `src/app/api/gemini-structured/route.ts` |
| H | `/api/github/callback` | external-fetch, auth-or-claims, proxy-or-egress, destructive-action | `src/app/api/github/callback/route.ts` |
| H | `/api/github/token` | auth-or-claims, proxy-or-egress | `src/app/api/github/token/route.ts` |
| M | `/api/health` | auth-or-claims, ai-provider-call | `src/app/api/health/route.ts` |
| H | `/api/image-gen` | external-fetch, auth-or-claims, ai-provider-call, proxy-or-egress | `src/app/api/image-gen/route.ts` |
| H | `/api/integration/publisher-mock` | auth-or-claims, proxy-or-egress | `src/app/api/integration/publisher-mock/route.ts` |
| H | `/api/local-proxy` | external-fetch, ai-provider-call, proxy-or-egress | `src/app/api/local-proxy/route.ts` |
| M | `/api/lsp/auth` | auth-or-claims, persistent-write | `src/app/api/lsp/auth/route.ts` |
| M | `/api/lsp/completion-gap` | auth-or-claims | `src/app/api/lsp/completion-gap/route.ts` |
| H | `/api/lsp/diagnostics` | auth-or-claims, proxy-or-egress | `src/app/api/lsp/diagnostics/route.ts` |
| M | `/api/lsp/full-context` | auth-or-claims, ai-provider-call | `src/app/api/lsp/full-context/route.ts` |
| M | `/api/lsp/glossary-validate` | auth-or-claims | `src/app/api/lsp/glossary-validate/route.ts` |
| M | `/api/lsp/honorific-check` | auth-or-claims | `src/app/api/lsp/honorific-check/route.ts` |
| M | `/api/lsp/lint` | auth-or-claims | `src/app/api/lsp/lint/route.ts` |
| M | `/api/lsp/meta-context` | auth-or-claims | `src/app/api/lsp/meta-context/route.ts` |
| M | `/api/lsp/symbols` | auth-or-claims | `src/app/api/lsp/symbols/route.ts` |
| M | `/api/lsp/translate-quality` | auth-or-claims | `src/app/api/lsp/translate-quality/route.ts` |
| L | `/api/metrics` | - | `src/app/api/metrics/route.ts` |
| L | `/api/og` | - | `src/app/api/og/route.tsx` |
| H | `/api/readiness` | external-fetch, payment-or-stripe, auth-or-claims, ai-provider-call | `src/app/api/readiness/route.ts` |
| H | `/api/share` | persistent-write, destructive-action | `src/app/api/share/route.ts` |
| H | `/api/stripe/webhook` | payment-or-stripe, auth-or-claims, destructive-action | `src/app/api/stripe/webhook/route.ts` |
| M | `/api/structured-generate` | auth-or-claims, ai-provider-call | `src/app/api/structured-generate/route.ts` |
| H | `/api/translate` | auth-or-claims, ai-provider-call, proxy-or-egress | `src/app/api/translate/route.ts` |
| H | `/api/upload` | auth-or-claims, proxy-or-egress | `src/app/api/upload/route.ts` |
| H | `/api/user/delete` | auth-or-claims, proxy-or-egress, destructive-action | `src/app/api/user/delete/route.ts` |
| H | `/api/user/export` | external-fetch, auth-or-claims, proxy-or-egress | `src/app/api/user/export/route.ts` |
| H | `/api/vitals` | proxy-or-egress | `src/app/api/vitals/route.ts` |

### Component Top-Level Counts

| Area | Files |
| --- | --- |
| __tests__ | 17 |
| A11yCheckInit.tsx | 1 |
| ApiKeyHydrator.tsx | 1 |
| CookieConsent.tsx | 1 |
| DeferredClientMetrics.tsx | 1 |
| ErrorBoundary.tsx | 1 |
| ErrorReporterInit.tsx | 1 |
| Footer.tsx | 1 |
| GlobalShortcuts.tsx | 1 |
| Header.tsx | 1 |
| home | 3 |
| legal | 2 |
| loreguard | 34 |
| MainContentRegion.tsx | 1 |
| MaintenanceBanner.tsx | 1 |
| RootErrorBoundary.tsx | 1 |
| SkeletonLoader.tsx | 1 |
| StarField.tsx | 1 |
| studio | 182 |
| translator | 30 |
| ui | 10 |
| WebFeaturesInit.tsx | 1 |
| WebVitalsReporter.tsx | 1 |
| world-simulator | 5 |
| WorldSimulator.tsx | 1 |

### Library Top-Level Counts

| Area | Files |
| --- | --- |
| __tests__ | 67 |
| a11y-check.ts | 1 |
| actions | 8 |
| ai | 21 |
| ai-disclosure-generator.ts | 1 |
| ai-providers.ts | 1 |
| ai-usage-tracker.ts | 1 |
| analytics.ts | 1 |
| api-logger.ts | 1 |
| api-origin-guard.ts | 1 |
| AuthContext.tsx | 1 |
| browser | 13 |
| build-prompt.ts | 1 |
| changelog-data.ts | 1 |
| completion-gap | 5 |
| compliance | 10 |
| conflict-parser.ts | 1 |
| consent.ts | 1 |
| content-rating.ts | 1 |
| creative | 56 |
| creative-process | 51 |
| csrf.ts | 1 |
| demo-presets.ts | 1 |
| dgx-models.ts | 1 |
| env-sanity.ts | 1 |
| env.ts | 1 |
| episode-lifecycle.ts | 1 |
| ergonomics | 7 |
| error-reporter.ts | 1 |
| errors | 4 |
| export-utils.ts | 1 |
| feature-flags.ts | 1 |
| fetch-url-guard.ts | 1 |
| firebase-auth-admin-rest.ts | 1 |
| firebase-env.ts | 1 |
| firebase-id-token.ts | 1 |
| firebase-quota-tracker.ts | 1 |
| firebase.ts | 1 |
| firestore-project-sync.ts | 1 |
| firestore-service-rest.ts | 1 |
| force-graph.ts | 1 |
| format-on-save | 2 |
| forms | 3 |
| full-backup.ts | 1 |
| genre-labels.ts | 1 |
| github-cache.ts | 1 |
| github-sync.ts | 1 |
| github-token-vault.ts | 1 |
| google-genai-server.ts | 1 |
| grammar-packs.ts | 1 |
| hooks | 1 |
| i18n | 1 |
| i18n.ts | 1 |
| ime-guard.ts | 1 |
| indexeddb-backup.ts | 1 |
| ip-guard | 5 |
| keyboard | 4 |
| LangContext.tsx | 1 |
| local-ai | 4 |
| logger.ts | 1 |
| long-arc-verifier | 13 |
| loreguard | 2 |
| lsp | 1 |
| markdown-serializer.ts | 1 |
| meta-context | 6 |
| modals | 2 |
| multi-cursor | 2 |
| multi-key-bridge.ts | 1 |
| multi-key-manager.ts | 1 |
| noa | 42 |
| noi-auto-tags.ts | 1 |
| novel-ide-settings | 1 |
| novel-plugin-registry.ts | 1 |
| novel-plugins | 3 |
| observability | 2 |
| origin-migration.ts | 1 |
| planning-presets.ts | 1 |
| crypto-sha256.ts | 1 |
| project-migration.ts | 1 |
| project-normalize.ts | 1 |
| project-sanitize.ts | 1 |
| project-serializer.ts | 1 |
| rate-limit-upstash.ts | 1 |
| rate-limit.ts | 1 |
| reader-sim | 8 |
| rename-engine.ts | 1 |
| request-context.ts | 1 |
| retry-classify.ts | 1 |
| rewrite-range.ts | 1 |
| save-engine | 63 |
| scene-preset-registry.ts | 1 |
| scene-share.ts | 1 |
| scene-sheet | 2 |
| security-gate.ts | 1 |
| semantic-diff | 3 |
| series-direction-dna.ts | 1 |
| server-ai-init.ts | 1 |
| server-ai.ts | 1 |
| show-alert.ts | 1 |
| snippets | 3 |
| story-debugger | 10 |
| stripe.ts | 1 |
| studio-ai-backend-label.ts | 1 |
| studio-config-updaters.ts | 1 |
| studio-constants.ts | 1 |
| studio-entry-links.ts | 1 |
| studio-share-serialize.ts | 1 |
| studio-translations.ts | 1 |
| studio-types.ts | 1 |
| style-benchmarks.ts | 1 |
| supabase.ts | 1 |
| symbol-index | 8 |
| temperature-settings.ts | 1 |
| tier-gate.ts | 1 |
| tier.ts | 1 |
| token-utils.ts | 1 |
| tone-guard | 2 |
| translation | 62 |
| translations-en.ts | 1 |
| translations-ja.ts | 1 |
| translations-ko.ts | 1 |
| translations-zh.ts | 1 |
| translator-constants.ts | 1 |
| translator-env-status.ts | 1 |
| twentyone-modules | 16 |
| typo-detector.ts | 1 |
| ui-preferences.ts | 1 |
| UnifiedSettingsContext.tsx | 1 |
| visual-defaults.ts | 1 |
| visual-prompt.ts | 1 |
| web-features | 13 |
| work-profiler-engine.ts | 1 |
| worldgraph | 7 |
| writing-workspace | 42 |
| zip-bomb-guard.ts | 1 |

## Removed Surface Guard

없음

## Dangerous Pattern Scan

없음

## HTML Insertion Audit

| Status | File | Line | Evidence |
| --- | --- | --- | --- |
| REVIEWED | `src/app/layout.tsx` | 346 | JSON-LD is built from locale constants and JSON.stringify output escapes <, >, and & before insertion. |
| REVIEWED | `src/components/studio/CreativeContributionInspector.tsx` | 204 | Origin donut SVG is generated by buildOriginDonutSVG from numeric percentages and fixed colors only. |
| REVIEWED | `src/components/studio/SubmissionPackageBuilder.tsx` | 326 | Witness seal SVG is generated by buildWitnessSealSVG as a fixed inline SVG with no user-provided text. |
| REVIEWED | `src/components/translator/editor/BilateralEditor.tsx` | 301 | Glossary overlay is assembled by highlightGlossaryTerms, which escapes source text and matched terms. |

## Stub / TODO / Placeholder Scan

| Severity | Pattern | File | Line | Snippet |
| --- | --- | --- | --- | --- |
| M | stub-word | src/app/ai-disclosure/page.tsx | 13 | `// PART 2 — AI Disclosure Page (KO/EN + JA/ZH placeholder)` |
| M | stub-word | src/app/api/lsp/diagnostics/route.ts | 5 | `// Phase 1: stub (heartbeat + sample diagnostic). Phase 2: 실제 변경 이벤트.` |
| M | stub-word | src/app/api/metrics/route.ts | 2 | `// [루프 4 P3 — 2026-06-08] /api/metrics — Prometheus 호환 endpoint stub` |
| M | stub-word | src/app/api/metrics/route.ts | 42 | `// Prometheus exposition format — Phase 1 stub.` |
| M | stub-word | src/app/copyright/page.tsx | 13 | `// PART 2 — Copyright Policy Page (KO/EN + JA/ZH placeholder)` |
| M | stub-word | src/app/preview/[token]/page.tsx | 122 | `placeholder="이름 (선택)"` |
| M | stub-word | src/app/preview/[token]/page.tsx | 123 | `className="w-full bg-bg-tertiary/50 rounded-lg px-3 py-1.5 text-[11px] text-text-primary placeholder-text-tertiary border border-border/20 outline-none focus-visible:ring-2 focus-v` |
| M | stub-word | src/app/preview/[token]/page.tsx | 130 | `placeholder="이 장면에 대한 의견..."` |
| M | stub-word | src/app/preview/[token]/page.tsx | 131 | `className="flex-1 bg-bg-tertiary/50 rounded-lg px-3 py-1.5 text-[11px] text-text-primary placeholder-text-tertiary border border-border/20 outline-none focus-visible:ring-2 focus-v` |
| M | stub-word | src/app/preview/[token]/page.tsx | 241 | `placeholder="비밀번호 입력"` |
| M | stub-word | src/app/pricing/page.tsx | 12 | `// [H1 stripe-ready] 실가격 env (빌드 시 인라인) — 주입 시 placeholder("추후 공지") 대신` |
| M | stub-word | src/app/pricing/page.tsx | 21 | `// PART 2 — Pricing tiers (placeholder — 정식 출시 시 Stripe 통합)` |
| M | stub-word | src/app/pricing/page.tsx | 323 | `{/* [H1 stripe-ready] env 실가격 있으면 실가격, 없으면 placeholder("추후 공지") */}` |
| M | stub-word | src/app/privacy/page.tsx | 13 | `// PART 2 — Privacy Policy Page (KO/EN + JA/ZH placeholder)` |
| M | stub-word | src/app/terms/page.tsx | 13 | `// PART 2 — Terms of Service Page (KO/EN + JA/ZH placeholder)` |
| M | stub-word | src/app/verify/page.tsx | 254 | `placeholder="LG-2605-0042-A8F5"` |
| M | stub-word | src/app/verify/page.tsx | 258 | `className="flex-1 rounded-lg border border-border-subtle bg-transparent px-3 py-2 font-[--font-mono] text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none foc` |
| M | stub-word | src/components/home/APIKeySlotManager.tsx | 19 | `{ id: "gemini", name: "Gemini", color: "#4285f4", placeholder: "AIza...", models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-pro-preview", "gemini-` |
| M | stub-word | src/components/home/APIKeySlotManager.tsx | 20 | `{ id: "openai", name: "OpenAI", color: "#10a37f", placeholder: "sk-...", models: ["gpt-5.4", "gpt-5.4-mini", "gpt-4.1"] },` |
| M | stub-word | src/components/home/APIKeySlotManager.tsx | 21 | `{ id: "claude", name: "Claude", color: "#d4a373", placeholder: "sk-ant-...", models: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"] },` |
| M | stub-word | src/components/home/APIKeySlotManager.tsx | 22 | `{ id: "groq", name: "Groq", color: "#f55036", placeholder: "gsk_...", models: ["llama-3.3-70b-versatile", "qwen-qwq-32b"] },` |
| M | stub-word | src/components/home/APIKeySlotManager.tsx | 23 | `{ id: "mistral", name: "Mistral", color: "#ff7000", placeholder: "...", models: ["mistral-large-latest"] },` |
| M | stub-word | src/components/home/APIKeySlotManager.tsx | 24 | `{ id: "lmstudio", name: "LM Studio", color: "#2d5d8d", placeholder: "http://192.168...:1234", models: ["local-model"] },` |
| M | stub-word | src/components/home/APIKeySlotManager.tsx | 215 | `placeholder={activeProvider.placeholder}` |
| M | stub-word | src/components/loreguard/ChatCanvasDock.tsx | 141 | `/** 입력창 placeholder */` |

## Trust Label Inventory

| Severity | Pattern | Count |
| --- | --- | --- |
| I | approved | 75 |
| I | certificate | 87 |
| I | korean-trust-label | 225 |
| I | sealed | 32 |
| I | signed | 95 |
| I | verified | 138 |

Examples:

| Severity | Pattern | File | Line | Snippet |
| --- | --- | --- | --- | --- |
| I | korean-trust-label | src/app/about/page.tsx | 31 | `ko: "EH Universe는 Loreguard를 중심으로 창작자가 AI를 지휘하고, 지시·수정·검토·승인 과정을 기록해 제출 가능한 창작 패키지로 정리하는 제품군입니다.",` |
| I | approved | src/app/about/page.tsx | 32 | `en: "EH Universe is the product family behind Loreguard: a workspace where creators direct AI work and keep instruction, revision, review, and approval records for submission-ready` |
| I | verified | src/app/ai-disclosure/page.tsx | 93 | `en: "[Verify] The URLs above may change at each provider's discretion. If a link breaks, look for 'Privacy' or 'Data Usage' on the provider's official site.",` |
| I | verified | src/app/ai-disclosure/page.tsx | 145 | `en: "follow each provider's policy. Paid API accounts are typically excluded from retraining, but free tiers or consumer products may differ — always verify the provider's terms.",` |
| I | verified | src/app/ai-disclosure/page.tsx | 168 | `<li>{T({ ko: "환각(Hallucination): AI는 사실과 다른 정보를 생성할 수 있습니다. 역사·인물·법률 등 사실 기반 내용은 반드시 교차 검증하세요.", en: "Hallucination: AI may produce factually incorrect output. Always cross-verify ` |
| I | korean-trust-label | src/app/ai-disclosure/page.tsx | 168 | `<li>{T({ ko: "환각(Hallucination): AI는 사실과 다른 정보를 생성할 수 있습니다. 역사·인물·법률 등 사실 기반 내용은 반드시 교차 검증하세요.", en: "Hallucination: AI may produce factually incorrect output. Always cross-verify ` |
| I | verified | src/app/ai-disclosure/page.tsx | 170 | `<li>{T({ ko: "저작권 유사성: AI 출력이 기존 저작물과 우연히 유사할 수 있으며, 최종 확인 책임은 사용자에게 있습니다.", en: "Copyright similarity: AI output may coincidentally resemble existing works; final verification is ` |
| I | verified | src/app/api/analyze-chapter/route.ts | 376 | `let verified = false;` |
| I | verified | src/app/api/analyze-chapter/route.ts | 381 | `verified = Boolean(await verifyFirebaseIdToken(token));` |
| I | verified | src/app/api/analyze-chapter/route.ts | 382 | `} catch { /* verification failed */ }` |
| I | verified | src/app/api/analyze-chapter/route.ts | 384 | `if (!verified) {` |
| I | verified | src/app/api/chat/route.ts | 425 | `const verified = await verifyFirebaseIdToken(token);` |
| I | verified | src/app/api/chat/route.ts | 426 | `if (verified) {` |
| I | verified | src/app/api/chat/route.ts | 427 | `userTier = verified.tier === 'pro' ? 'pro' : 'free';` |
| I | verified | src/app/api/complete/route.ts | 98 | `const verified = await verifyFirebaseIdToken(token);` |
| I | verified | src/app/api/complete/route.ts | 99 | `firebaseVerified = Boolean(verified);` |
| I | verified | src/app/api/complete/route.ts | 100 | `} catch { /* verification module load failed — deny */ }` |
| I | korean-trust-label | src/app/api/cp/register/route.ts | 220 | `authorUid: { stringValue: auth.uid }, // 검증된 토큰의 uid — body 값 불수용` |
| I | verified | src/app/api/cp/verify/[id]/route.ts | 123 | `const rl = checkRateLimit(ip, '/api/cp/verify', RATE_LIMITS.default);` |
| I | korean-trust-label | src/app/api/cp/verify/[id]/route.ts | 136 | `message_ko: '확인서 ID 형식이 올바르지 않습니다.',` |
| I | certificate | src/app/api/cp/verify/[id]/route.ts | 137 | `message_en: 'Invalid certificate ID format.',` |
| I | korean-trust-label | src/app/api/cp/verify/[id]/route.ts | 163 | `message_ko: '해당 ID/봉인번호로 등록된 확인서가 없습니다.',` |
| I | sealed | src/app/api/cp/verify/[id]/route.ts | 164 | `message_en: 'No certificate registered under this ID / seal number.',` |
| I | certificate | src/app/api/cp/verify/[id]/route.ts | 164 | `message_en: 'No certificate registered under this ID / seal number.',` |
| I | korean-trust-label | src/app/api/cp/verify/[id]/route.ts | 182 | `'확인서 무결성 검증: POST 요청 본문에 cert JSON 을 첨부하세요. 본 서버는 schema·hash 형식만 점검하며 cert 데이터를 저장하지 않습니다.',` |

## Gate Mapping

| Gate | Day 0 Evidence | Current Verdict |
|---|---|---|
| P0 baseline | route/API/component/library inventory generated | PASS |
| T0 data destruction | save-engine snapshot/restore, crash recovery, schema idempotency, payload hash tests, navigation-only localStorage/IndexedDB e2e data-diff, real Project[] destructive overwrite→verified snapshot restore hash-diff evidence, local multi-user TabSync drift replay, and browser two-tab destructive payload replay attached; deployed/staging destructive workflow replay still required | HOLD |
| T1 fake trust | registry register→verify round-trip, tamper-negative tests, browser/e2e verification surface metadata-only PASS/FAIL evidence, and route-level register→lookup→POST registry replay attached; live external registry replay still required | HOLD |
| T2 money/privilege | checkout auth/price boundary, webhook idempotency/refund/claim sync, stripeRole grace tests, and local billing/privilege browser E2E attached; live Stripe replay and paid-session e2e evidence still required | HOLD |
| T3 external attack surface | SSRF negative corpus attached for fetch-url/local-proxy, malformed Origin guard attached for LLM-facing routes, common server-gate prompt-injection corpus attached, and local HTTP-level prompt-injection replay attached for 6/6 LLM-facing routes (/api/chat, /api/complete, /api/structured-generate, /api/gemini-structured, /api/translate, /api/analyze-chapter); deployed/staging adversarial replay still required | HOLD |
| T4 races/non-determinism | lost-update setConfig regression, manuscript merge concurrency/immutability tests, hash-chain rapid append no-fork replay, and seal serial race replay attached; deployed multi-worker/load replay still required | HOLD |
| T5 irreversible operations | destructive action confirmation/license denials, real Project[] destructive hash-diff restore, manual backup guard, and backup-tier orchestration tests attached; live destructive workflow rehearsal still required | HOLD |
| T6 green-gate lie | gate:baseline keeps Day 0 static PASS separate from release evidence intake, gate:release/--fail-on-hold fails while computed Release verdict is HOLD, release workflow invokes gate:release, and release evidence intake/status gate is attached; live CI run evidence still required | HOLD |
| T7 recovery/fault paths | boot recovery crash/stale-beacon, hook failure, RecoveryDialog decision, multi-tab heartbeat fault tests, and local browser reload/storage-corruption replay attached; live staging browser kill/reload evidence still required | HOLD |
| T8 observability | API structured log coverage, request-context trace/correlation propagation tests, toast/alert a11y delivery, readiness probe, Prometheus-format metrics stub, and active-surface a11y/lighthouse workflow attached; live alert routing and SLO evidence still required | HOLD |
| T9 regulatory/legal | compliance.yml policy-as-test, regulatory profile evaluator, risky public-claim guard, and legal page render coverage attached; lawyer/regulator sign-off remains required | HOLD |
| T10 agentic tool containment | tool/API capability inventory, disabled agent-search gate tests, and action-containment policy denial traces attached; active agent runner integration traces are required if a runner is reintroduced | HOLD |
| T11 provenance chain | submission package hash-manifest verifier, non-empty manuscript issuance gate, final/final_clean contract, final_clean mechanical audit, IP Pack public/private manifest, and C2PA-ready round-trip evidence attached; signed C2PA Manifest Store and external chain evidence still required | HOLD |
| T12 supply chain | AI source/prompt/lockfile hashes, source-level runtime model BOM, lockfile SBOM, local build provenance, offline eval diff, and CI supply-chain workflow attached; live provider attestation, live model-output eval, actual CI run artifact, and CI-signed provenance still required | HOLD |
| T13 memory/vector poisoning | memory prompt-control sanitizer, hash-chained chat summaries, and tab/project-isolated memory stores attached; live vector DB tenant isolation and stale invalidation evidence still required | HOLD |
| T14 compliance drift | compliance.yml policy-as-test and browser export hash-manifest e2e attached; legal review remains required | HOLD |
| T15 human accountability | revision report decision-only UI, Work Receipt 2.0 structured role/range metadata, translation sign-off delegation/held/release-history governance, Work Receipt package artifact, package issuance receipt, IP Pack counts-only summary, human accountability audit replay, and browser author-session Work Receipt package replay attached; live/staging user-session run artifact still required | HOLD |

## Next Execution Set

1. Attach deployed/staging destructive workflow replay evidence for real project payloads.
2. Attach live external registry replay evidence for creative process certificate lookup.
3. Attach live Stripe replay and billing e2e evidence for checkout/webhook/claim propagation.
4. Run deployed/staging adversarial HTTP replay against LLM-facing API routes.
5. Run deployed multi-worker/load replay for collaborative writing and process-record issuance paths.
6. Run live/staging destructive workflow rehearsal with backup export and verified restore evidence.
7. Attach live GitHub Actions release-gate run evidence and required release evidence artifacts.
8. Attach live/staging browser kill/reload evidence against the writing IDE surface.
9. Attach live alert routing and SLO evidence from staging/production.
10. Attach qualified legal review/sign-off and jurisdiction-specific release notes before public launch.
11. Keep agent-search disabled or attach full runner denial traces before reintroducing agent tool execution.
12. Attach signed C2PA Manifest Store and external provenance-chain evidence.
13. Attach live provider model attestation, live model-output eval, actual CI run artifact, and CI-signed provenance to docs/ai-supply-chain.yml.
14. Attach live vector DB tenant-isolation and stale-invalidation replay if external memory/RAG is introduced.
15. Add legal-review sign-off to docs/compliance.yml.
16. Attach live/staging author-session run artifact from a deployed writing session.
