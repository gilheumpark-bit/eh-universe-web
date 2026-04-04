# EH Universe Web

[![한국어](https://img.shields.io/badge/lang-한국어-blue)](README.ko.md)

![Tests](https://img.shields.io/badge/tests-1600+-green)
![Suites](https://img.shields.io/badge/suites-161-green)
![Audit](https://img.shields.io/badge/audit-94%2F100%20(S)-brightgreen)
![Languages](https://img.shields.io/badge/i18n-KO%20EN%20JP%20CN-purple)
![License](https://img.shields.io/badge/license-CC--BY--NC--4.0-blue)

A **worldbuilding portal** for exploring the history, factions, technology, and geography of 200,000 star systems governed by the Galactic Central Council — plus an AI-powered writing studio and a verified code IDE, all in one platform.

## Core Apps

| App | Description | Status |
|-----|-------------|--------|
| **EH Universe Portal** | Lore archive (109 docs) + Classified reports (80) + Codex + Rulebook + Reference | Production |
| **NOA Studio** | AI novel writing engine — worldbuilding / characters / direction / style / manuscript | Production |
| **Code Studio** | Verified code IDE — Verification Loop + Composer State Machine | Beta |
| **Translation Studio** | Long-form translation workspace — Translate / Chapters / Context / Network | Production |
| **EH Network** | Writer community — planet systems, logs, settlements | Beta |
| **Tools** | Galaxy map, vessel specs, warp gate calculator, soundtrack, and more (7 tools) | Production |

## Tech Stack

| Area | Technology |
|------|------------|
| Framework | Next.js 16.2 (App Router, 28 routes) |
| Language | TypeScript 5, React 19 |
| UI | Tailwind CSS 4, Lucide Icons, Design System v8.0 |
| AI | Gemini, OpenAI, Claude, Groq, Mistral, LM Studio (BYOK) |
| Editor | Monaco Editor, xterm.js, WebContainer API |
| DB/Auth | Firebase Firestore + Auth (EH Network) |
| Engine | ANS 10.0 (Narrative Engine), Verification Loop (Code Verification) |
| Export | EPUB / DOCX / TXT (pure JS, zero external dependencies) |
| Test | Jest 30 (~1,600 tests, 161 suites) + Integration tests (50 cases) |
| Audit | 16-area Project Audit Engine — 94/100 (S) |
| Deploy | Vercel |

## Quick Start

```bash
npm install
npm run dev          # localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm test             # Jest unit tests
npm run test:integration  # Integration tests
```

## EH Universe Portal

A worldbuilding exploration portal — enter via splash screen into the hub.

- **Lore Archive**: 6 categories (Core / Timeline / Factions / Military / Geography / Technology), 109 documents
- **Classified Reports**: 80 reports, 7 subcategories, clearance filter (CLASSIFIED / RESTRICTED / PUBLIC)
- **Codex**: Core laws, terminology, and structural reference of the universe
- **Rulebook v1.0**: Structure and principles of the narrative engine
- **Reference**: 4-page project summary
- **Tools**: Galaxy map, vessel specs, warp gate, soundtrack, Neka sound, NOA tower, etc. (`/tools/*`)

## NOA Studio (Writing Studio)

| Tab | Features |
|-----|----------|
| World (`world`) | 3-tier design, civilization simulator, analysis, timeline, map (5 sub-tabs) |
| Characters (`characters`) | Character / item studio (2 sub-tabs), relationship / resource management |
| Direction (`rulebook`) | **SceneSheet (direction features)**, foreshadowing / tension / transition design |
| Writing (`writing`) | AI generation / editing / canvas / refine / advanced (5 modes) |
| Style (`style`) | DNA / slider-based style profiling (`/studio?tab=style`) |
| Manuscript (`manuscript`) | Manuscript / episode management |
| Visual (`visual`) | NOI prompt cards, consistency tags |
| Archive (`history`) | Session / project archive |
| Docs (`docs`) | User guide |

**Works without AI**: Project management, manual writing, character/world setup, scene sheets, export (EPUB/DOCX/TXT), save slots, demo mode — 82% of features require no API key.

## Code Studio (Verified IDE)

- **Panel Registry**: 40 panels (essential defaults + Advanced toggle, `audit` included)
- **Design Linter**: Step 1.6 in verification-loop, 16 runtime rules
- **Shell Architecture**: CodeStudioShell + CodeStudioEditor + CodeStudioPanelManager (3-file split)
- **lib/code-studio/**: 6-directory structure — `core/`, `ai/`, `pipeline/`, `editor/`, `features/`, `audit/`
- **Verification Loop**: Pipeline(50%) + Bug Scan(20%) + Stress Test(30%) — 3-round verification
- **Composer State Machine**: idle → generating → verifying → review → staged → applied
- **Staging/Rollback**: Human approval before applying, rollback supported
- **Multi-Terminal**: Up to 5 tabs + split terminal (horizontal/vertical)
- **Session Restore**: IndexedDB-based last session auto-restore

## Translation Studio

- **Bilateral Editor**: Source/translation side-by-side editing
- **Chapter Management**: Add/delete/reorder chapters
- **Glossary**: Manual term registration + AI extraction
- **Document Upload**: TXT / EPUB / PDF import
- **5-Stage AI Pipeline**: Context → Translate → Verify → Polish → Finalize

## i18n

Korean (KO), English (EN), Japanese (JP), Chinese (CN) — real-time switching.
Central dictionary: `studio-translations.ts` (identical leaf count).
Fallback chain: JP/CN → EN → KO.

## Resilience

- **ErrorBoundary**: Unified component, variant prop (`full-page` | `section` | `panel`)
- **SkeletonLoader**: 5 variants (`text` | `card` | `panel` | `editor` | `sidebar`) — shimmer-based
- **CSP / Security Headers**: `next.config.ts headers()` — centralized CSP + security headers
- **Design System v8.0**: 3-Tier token efficiency, 16-rule runtime linter, 5 design presets
- **Logger**: `@/lib/logger` — structured logging instead of `console.*`
- **Streaming**: fetch 120s + AI 180s + structured 60s + concurrent execution lock
- **Storage**: localStorage try/catch + IndexedDB backup + capacity detection
- **Input Validation**: maxLength 45 instances + engine 50K hard limit

## Test Architecture

```
Layer 1: Static     — TypeScript + ESLint + Next.js Build (28 routes)
Layer 2: Unit       — Jest 161 suites (~1,600 tests)
Layer 3: Integration — 3 suites, 50 test cases (navigation, studio, code-studio)
Layer 4: Audit      — 16-area Project Audit Engine, 4,400+ checks, 94/100 (S)
Layer 5: Runtime    — ErrorBoundary (3 variants), AbortController, generationLockRef
```

Coverage thresholds: branches 50%, functions/lines/statements 60%.

## Project Audit (94/100 S)

16 areas, 4 categories — automated audit:

| Category | Grade | Areas |
|----------|-------|-------|
| Code Health | A | operations, complexity, architecture, dependencies |
| Quality | S | testing, error-handling, feature-completeness, documentation |
| User Experience | S | design-system, accessibility, ux-quality, i18n |
| Infra & Security | S | security, performance, api-health, env-config |

## License

[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/)
