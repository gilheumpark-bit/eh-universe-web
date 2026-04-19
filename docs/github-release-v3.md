# v2.1.3 — NOA Persona + UX Grade S (951/1000)

**Released**: 2026-04-19 (afternoon increment)
**Status**: Alpha — production-ready quality
**Previous**: v2.1.2 (2026-04-17) / v0.2.0-alpha.5 (morning)
**Tag**: `v2.1.3`

## Highlights

- **NOA Persona Unification** — 51+ UI replacements of abstract "AI" to "NOA" (the companion persona). External providers (BYOK), Stability AI brand name, and backend AI model context keep "AI".
- **Age Rating Localization** — "PRISM-MODE" jargon removed from UI. Each country gets its standard label:
  - KO: 연령 등급 (KCSC — 전체이용가·15세이용가·청소년이용불가)
  - EN: Content Rating (ESRB + MPAA)
  - JP: 年齢区分 (CERO)
  - CN: 内容分级
- **prismMode ↔ ContentRating Single Source** — `derivRatingFromPrism()` auto-derives the content rating from the writer's prism choice. EPUB `<dc:audience>` and filename `[19+]` prefix sync automatically.
- **Accountability Badges** — "Recorded · NOA · Export · EPUB" visible in the planning panel so writers can see their rating choice is persisted as evidence for platform submissions (Munpia / KDP / カクヨム / 晋江).
- **UX Audit: Grade S (951/1000, +169 from 782/B)** — 6 industry frameworks (Nielsen 10 / WCAG 2.1 AA / Web Vitals / Readability / IA / Mobile).
- **Progressive Disclosure Complete** — WritingTab shows 2 modes (AI / Edit) by default; 3 advanced modes (Canvas / Refine / Advanced) reveal on demand or via `advancedWritingMode` setting.
- **Design System v8.0 Compliance** — 704 raw Tailwind `red-*` / `blue-*` replaced with `accent-red` / `accent-blue` tokens across 118 files.
- **Philosophy Manifesto** — `docs/manifesto.md` added (247 lines: 2 pillars + 15 declarations + 4-language copy library).

## Fixed

- Footer was leaking into `/studio`, `/translation-studio`, `/code-studio`, `/welcome`, `/network` — now suppressed on app routes so writers aren't distracted by legal links.
- "연출" tab title mismatch ("규칙집" → "연출") across 4 languages.
- Reference panel aria-label simplified.
- Status bar font sizes below WCAG body threshold (9-11px → 11-12px, height 24px → 28px).
- NovelEditor serif fallback order now CJK-first (`var(--font-document), Georgia, ...`).
- Editor `line-height` tightened from 2.0 to 1.75 (optimal readability band).
- `F9` keyboard shortcut added for editor minimap toggle (VSCode parity).

## Commits (6)

```
64b9eb31 polish(ux): S등급 진입 — progressPct 12px + line-height 1.75
e905ef75 refactor(design-system): UX 감사 Top 5 수정 — 782→A+
dcaba070 Merge branch 'docs/manifesto' — 철학 정리 단일 원본
2d6e8d37 feat(rating): prismMode ↔ ContentRating 단일 소스 통합
4cdec7e3 fix(ux): 스튜디오 UI 정돈 + 연령 등급 각국화 + NOA 인격 통일
d2e56d0b docs(manifesto): 2 기둥 + 15 선언 + 4언어 카피
```

## Branch Cleanup

- `origin/123` (2026-04-14 vLLM experiment) — deleted
- 10 Dependabot auto-generated branches — deleted (will regenerate when security updates ship)

---

# v0.2.0-alpha.5 — Production-Ready Alpha (morning)

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
