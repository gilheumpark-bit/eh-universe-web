# EH Universe Web -- Architecture

## Overview

EH Universe Web is a Next.js 15 monorepo (App Router, Turbopack) deployed on Vercel ICN.
It hosts five applications under a single domain with shared auth, i18n, and design system infrastructure.

## Applications

| App | Route | Purpose |
|-----|-------|---------|
| Universe Portal | `/`, `/archive`, `/codex`, `/reference`, `/rulebook`, `/tools/*` | Lore archive, codex, reference tools |
| NOA Studio | `/studio` | AI-assisted narrative workbench (9 tabs: World, Characters, Rulebook, Writing, Style, Manuscript, History, Docs, Settings) |
| Code Studio | `/code-studio` | Verified code generation studio with 8-team pipeline |
| EH Network | `/network` | Community platform -- planets, posts, reports, settlements |
| Translation Studio | `/translation-studio` | Multi-provider translation workbench |

## Directory Structure

```
src/
  app/                  # Next.js App Router pages + API routes
    api/                # 22 API routes (chat, translate, agent-search, etc.)
    (universe)/         # Universe Portal pages
    studio/             # NOA Studio
    code-studio/        # Code Studio
    network/            # EH Network
    translation-studio/ # Translation Studio
  components/           # Shared React components
  lib/                  # Core libraries
    code-studio/        # Code Studio engine (6 dirs: core, ai, pipeline, editor, features, audit)
    server-ai/          # Server-side AI provider abstraction
  services/             # AI provider integrations
```

## Code Studio Pipeline (8 Teams)

The Code Studio uses a simulated 8-team development pipeline:

1. **PM** -- Requirements analysis and task decomposition
2. **Architect** -- System design and component structure
3. **Frontend** -- UI implementation with Design System v8.0
4. **Backend** -- API and data layer generation
5. **QA** -- Automated test generation
6. **Security** -- Vulnerability scanning (436-rule dual catalog)
7. **DevOps** -- Build verification and deployment prep
8. **Tech Lead** -- Final review, scoring, and approval gate

Each team runs in sequence within a Gen-Verify-Fix loop (adaptive 5-round, convergence detection).
Pipeline scoring: goodBoost 20, filterBonus 15, teamHealthBonus 5.

## Panel Registry (51 Panels)

Code Studio panels are managed through a centralized registry (`core/panel-registry.ts` + `PanelImports.ts`).
All panels use dynamic imports -- hardcoded panel references are prohibited.

Key panels include: EditorPanel, TerminalPanel, ChatPanel, DatabasePanel (sql.js WebAssembly),
GitPanel (isomorphic-git), DeployPanel (build verify + ZIP export), SecurityPanel, TestPanel,
CollabPanel (CRDT engine with BroadcastChannel), and 42 more. 7 panels are simulated (JSDoc-documented).

LUCIDE_MAP provides icon mappings for all 51 panels.

## AI Integration

- **Multi-provider**: Gemini, OpenAI, Claude, Groq, Mistral, DeepSeek, Ollama, LM Studio
- **Server proxy**: All AI calls route through `/api/chat` (SSE streaming) to prevent key exposure
- **BYOK + hosted**: Server env keys or user-provided keys
- **Structured generation**: `/api/structured-generate` (provider-agnostic JSON schema output)
- **Agent Builder**: Vertex AI Discovery Engine for semantic search across 3 studios
- **ANS v10.0**: Adaptive Narrative System with tension curves, HFCP state tracking, genre presets
- **NOA-PRISM v1.1**: Content rating and preservation/expansion control

## CLI Integration

- **Harness 3-Core**: Spy (6 API intercepts), Mutation (11 operators), Feedback loop
- **Gate protocol**: GATE-SPY, GATE-FUZZ, GATE-MUT, GATE-AST, GATE-BUILD, GATE-TEST
- **Fail-Fast pipeline**: Gate1 (static 0.1s) -> Gate2 (linter 0.2s) -> Gate3 (dynamic 3s)
- **Autopilot**: `/api/code/autopilot` for headless Gemini-powered code generation

## Design System v8.0

Three-tier token system (FULL ~3K / COMPACT ~800 / MINIMAL ~100 tokens).
16-rule runtime linter (`runDesignLint`), 5 presets, 4 UI primitives (Tooltip, Dropdown, Accordion, ProgressBar).
Semantic tokens required (`bg-bg-primary`, `text-text-primary`); raw Tailwind values prohibited.

## Infrastructure

- **Auth**: Firebase Google Sign-In + Firestore security rules + Stripe subscription tiers
- **Storage**: IndexedDB primary, localStorage fallback, Google Drive sync
- **i18n**: 4 languages (KO, EN, JP, CN) via LangContext with type-safe switching
- **Security**: CSP headers via `next.config.ts headers()`, CSRF origin checks, rate limiting (sliding window per IP)
- **CI/CD**: GitHub Actions + Playwright E2E, Vercel deployment with Turbopack
- **Cron**: `/api/cron/universe-daily` for automated content generation

## Quality Catalog

436-rule dual catalog: 224 bad patterns (anti-patterns, vulnerabilities) + 212 good patterns.
Good pattern detector runs 40 regex rules. Context-aware, memoized for pipeline performance.
Wired to both generation (prompt injection) and verification (scoring) stages.
