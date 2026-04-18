# v0.2.0-alpha.5 — Production-Ready Alpha

**Released**: 2026-04-19
**Status**: Alpha (closed beta ready)
**Previous**: v0.2.0-alpha.1 (2026-04-19 morning)

## Security
- 6 P0 vulnerabilities fixed (XSS, iframe escape, CLI shell injection x 3, SSE throw)
- 13 P1 issues fixed (HMAC fallback, API auth gaps, timing attacks, AI prompt injection)
- 7 shell injection points eliminated via execFileSync
- 2 unauthenticated API routes locked down (/api/agent-search, /api/upload)

## New Features
- **Writer Session Management** — Pomodoro 25/5/15, daily goals, break reminders
- **Full Backup Export** — JSON/ZIP with atomic rollback
- **Role-Based UI** — Writer / Translator / Publisher / Developer / Explorer flows
- **Translation Sample Demo** — 30-second try without signup (4 genres x 6-axis scoring)
- **Legal Pages** — Terms / Privacy / Copyright / AI Disclosure (alpha drafts)
- **AI Usage Labels** — Auto-inserted in EPUB / DOCX (Amazon KDP compliance)
- **Content Rating** — 19+ self-declaration with `<dc:audience>Adult</dc:audience>` metadata
- **Settings 4-Tab Split** — Easy / Writing / Advanced / Developer

## Infrastructure
- DGX Spark to BYOK automatic fallback chain
- IndexedDB quota monitoring (70 / 90% thresholds)
- Firebase usage tracker (daily counters)
- SEO: Dynamic OG (Edge runtime) + sitemap (17 URLs) + 9 AI crawlers blocked (GPTBot, Google-Extended, CCBot, ClaudeBot, etc.)
- JSON-LD SoftwareApplication structured data

## UX
- Progressive Disclosure (default simple, advanced opt-in)
- TabHeader on 8 tabs + TermTooltip (12 terms x 4 languages = 48 entries)
- EmptyState component applied to 6 tabs (World / Scene / Item / History / Characters / Manuscript)
- 5 modals accessibility boost (QuickStart / Rename / WorkspaceTrust / MergeConflict / Marketplace)
- Blue-light filter (sepia 12% + brightness 0.96)
- AI generation FAB (Ctrl+Enter global)
- Keyboard nav: Ctrl+\ split view, Arrow keys for episode navigation

## Refactoring
- 3-loop full-file audit (850+ files)
- useCodeStudioPanels split: 530 -> 103 lines (8 sub-hooks)
- saga-transaction AI double-call fixed (token 2x waste)
- suggest.ts ReferenceError silently swallowed by try-catch -> fixed

## Tests
- 2,232 -> 2,331 tests (+99)
- 221 test suites (+12)
- 0 tsc errors
- 0 regressions

## Stats
- 164+ files changed
- 200+ issues fixed
- 100+ new i18n keys (KO / EN / JP / CN)
- 5 new pages
- 15+ new components
- 5 new hooks

## Coming Next
- Domain acquisition (loreguard.com / .co.kr / .app)
- Trademark registration (로어가드 / Loreguard)
- Legal review of alpha docs (10 review items flagged)
- BritG writer recruitment (50 co-creators)
- Modunoui Changup competition application

---

Made by 박길흠 (Park Gilheum) - Single developer - Day 31
Co-authored with Anthropic Claude (Sonnet 4.6 + Opus 4.7 1M context)
