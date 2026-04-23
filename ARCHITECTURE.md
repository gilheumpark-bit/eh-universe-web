# EH Universe Web -- Architecture

## Overview

EH Universe Web is a Next.js 16.2 single-app (App Router, Turbopack) deployed on Vercel ICN (ehsu.app).
It hosts five applications under a single domain with shared auth, i18n, and design system infrastructure.

**Version**: 2.3.0-alpha (2026-04-24)

## Applications

| App | Route | Purpose |
|-----|-------|---------|
| Universe Portal | `/`, `/archive`, `/codex`, `/reference`, `/rulebook`, `/tools/*` | Lore archive (140+ docs, 8 categories), codex, reference tools |
| NOA Studio | `/studio` | Novel IDE — 7-Phase architecture, Tiptap editor, GitHub persistence, 5 writing modes, quality analysis |
| Code Studio | `/code-studio` | Verified code generation — 9-team pipeline + Quill Engine, diff-guard, 4-Tier orchestration |
| EH Network | `/network` | Writer community — posts, planets, settlements, reports |
| Translation Studio | `/translation-studio` | Novel-specific AI translation — 6-axis scoring, MODE1/MODE2, auto-recreation loop |

## Directory Structure

```
src/
  app/                  # Next.js App Router pages + API routes
    api/                # 22 API routes (chat, translate, agent-search, etc.)
    (universe)/         # Universe Portal pages
    studio/             # NOA Studio (StudioShell, StudioMainContent, RightPanel)
    code-studio/        # Code Studio
    network/            # EH Network
    translation-studio/ # Translation Studio
  components/
    studio/             # Novel IDE components (~60 files)
      extensions/       # Tiptap extensions (inline-completion, novel-keymap)
      tabs/             # Studio tab views (WritingTabInline, RulebookTab, etc.)
      planning/         # Planning sub-components
    code-studio/        # IDE panels (~87 files)
    translator/         # Translation editor + panels
  engine/               # ANS 10.0 — pipeline, quality-gate, director, genre-presets
  hooks/                # 30+ custom hooks
  lib/
    code-studio/        # Code Studio engine (6 dirs: core, ai, pipeline, editor, features, audit)
    server-ai/          # Server-side AI provider abstraction
    github-sync.ts      # GitHub Octokit CRUD integration
    project-serializer.ts  # MD+YAML project serialization
    firestore-project-sync.ts  # Cloud sync (feature-flagged)
  services/             # AI provider integrations (sparkService, etc.)
  store/                # Zustand stores (studio-ui-store, etc.)
```

## NOA Studio Architecture (2026-04-14)

### 7-Phase Novel IDE

The Novel Studio follows a 7-Phase architecture for full IDE-grade writing:

| Phase | Feature | Key Files |
|-------|---------|-----------|
| 1 | GitHub OAuth + Octokit file CRUD | `github-sync.ts`, `useGitHubSync` |
| 2 | Markdown + YAML serialization layer | `project-serializer.ts` |
| 3 | Tiptap block editor (textarea replacement) | `NovelEditor.tsx` |
| 4 | Episode file tree UI (Volume structure) | `EpisodeExplorer.tsx` |
| 5 | Hybrid 3-Tier context builder | context builder integration |
| 6 | Git branch parallel universe (IF divergence) | `BranchSelector`, `ParallelUniversePanel`, `BranchDiffView` |
| 7 | Tab inline autocomplete (Copilot-style) | `extensions/inline-completion.ts`, `useInlineCompletion` |

### UI Structure
- **OSDesktop**: macOS dock (studio tabs + app links) + top menu bar
- **WindowTitleBar**: traffic lights + tab name + focus mode toggle
- **StudioStatusBar**: character/word count, mode, episode, save state (z-40)
- **Zen Mode**: `body:has(textarea[data-zen-editor]:focus)` CSS auto-hide

### Writing Engine
- **5 Modes**: AI Draft / Manual Edit / 3-Step Canvas / Auto 30% Refine / Advanced
- **useQualityAnalysis**: show/tell, repetition, sentence variety, density, dialogue ratio (5 metrics)
- **useContinuityCheck**: character name typos, trait conflicts, time/genre contradictions
- **InlineActionPopup**: context-aware rewrite (genre + character + surrounding +/-200 chars)
- **useUndoStack**: 50-level Undo/Redo with label-based tracking
- **QualityGateAttemptRecord**: per-attempt grade/director-score/tag/fail-reason history

### Scene Direction (3-Section Rework)
- **SceneSheet**: 13 tabs reworked to 3 sections (plot/mood/character) + collapsible advanced settings
- **10 Genre Presets**: emoji+color grid for quick scene configuration
- **EpisodeScenePanel**: per-episode scene sheet storage with history sidebar
- **DirectionReferencePanel**: [direction] [character] [reference] 3-tab split view
- **Character Smart Injection**: activeCharacters -> Tier 1 (full DNA) / Tier 2 (name+role only)

### New Components (v2.1.0)
- `NovelEditor.tsx` — Tiptap-based block editor
- `EpisodeExplorer.tsx` — Volume/episode file tree UI
- `BranchSelector.tsx` — Git branch (parallel universe) selector
- `ParallelUniversePanel.tsx` — IF divergence panel
- `BranchDiffView.tsx` — Branch diff comparison view
- `WriterProfileCard.tsx` — Writer profile card
- `EpisodeScenePanel.tsx` — Per-episode scene sheet history

### New Hooks
- `useGitHubSync` — Octokit-based GitHub sync
- `useInlineCompletion` — Tab autocomplete for Tiptap

### New Libraries
- `lib/github-sync.ts` — GitHub Octokit CRUD abstraction
- `lib/project-serializer.ts` — MD+YAML project serialization

### AI Workflow
- **Retry**: 3 attempts + jittered backoff + Retry-After header (ai-providers.ts)
- **Token Budget**: buildSystemInstruction() warns at 30% context usage
- **Character Truncation**: noa:character-truncated event when >20 characters
- **Quality Gate**: evaluateQuality -> 6-dimension (grade/director/EOS/tension/AI-tone/red-tag)

### Export
- EPUB 3.0 + DOCX + TXT/MD/JSON/HTML/CSV (export-utils.ts + useStudioExport.ts)

### Storage
- **Local**: localStorage (500ms debounce) + IndexedDB (10min version backup)
- **GitHub**: Octokit CRUD via `useGitHubSync` (Phase 1)
- **Cloud**: Firestore (CLOUD_SYNC flag) + Google Drive sync
- **Emergency**: beforeunload sync save + sendBeacon fallback

## Code Studio Pipeline (9 Teams)

1. **PM** -- Requirements analysis and task decomposition
2. **Architect** -- System design and component structure
3. **Frontend** -- UI implementation with Design System v8.0
4. **Backend** -- API and data layer generation
5. **QA** -- Automated test generation
6. **Security** -- Vulnerability scanning (436-rule dual catalog)
7. **DevOps** -- Build verification and deployment prep
8. **Tech Lead** -- Final review, scoring, and approval gate
9. **Quill** -- 224-rule catalog verification (4-layer: pre-filter -> AST -> TypeChecker -> esquery)

Each team runs in sequence within a Gen-Verify-Fix loop (adaptive 5-round, convergence detection).
Pipeline scoring: goodBoost 20, filterBonus 15, teamHealthBonus 5.

### Pipeline Modules (2026-04-14 synced)
- `diff-guard.ts`: SCOPE/CONTRACT/@block boundary protection (450 lines)
- `apply-guard.ts`: diff-guard wrapper, auto-verification on code apply
- `design-transpiler.ts`: external AI code security filter + semantic token transform
- `intent-parser.ts`: deterministic intent->AST constraint transform (no LLM needed)
- `calc-protocol.ts`: SCAN->VALIDATE->ROUTE->PLAN 4-step prompt protocol
- `tier-registry.ts`: Ultra/ProPlus/Standard/Lite 4-Tier orchestration
- `AuditInvoice.tsx`: NOA-AGI execution invoice UI

## Panel Registry (51 Panels)

Code Studio panels are managed through a centralized registry (`core/panel-registry.ts` + `PanelImports.ts`).
All panels use dynamic imports -- hardcoded panel references are prohibited.

Key panels include: EditorPanel, TerminalPanel, ChatPanel, DatabasePanel (sql.js WebAssembly),
GitPanel (isomorphic-git), DeployPanel (build verify + ZIP export), SecurityPanel, TestPanel,
CollabPanel (CRDT engine with BroadcastChannel), and 42 more. 7 panels are simulated (JSDoc-documented).

LUCIDE_MAP provides icon mappings for all 51 panels.

## AI Integration

- **Multi-provider**: Gemini, OpenAI, Claude, Groq, Mistral, Ollama, LM Studio
- **Server proxy**: All AI calls route through `/api/chat` (SSE streaming) to prevent key exposure
- **BYOK + hosted**: Server env keys or user-provided keys
- **Structured generation**: `/api/structured-generate` (provider-agnostic JSON schema output)
- **ANS v10.0**: Adaptive Narrative System with tension curves, HFCP state tracking, genre presets
- **DGX Spark (GB10, 128GB VRAM)**: Qwen 3.6-35B-A3B-FP8 MoE **single engine** (vLLM 8001). FlashInfer + N-Gram Speculative Decoding. TTFT 0.05s, 40–50 tok/s. Previous dual-9B + Nginx LB + api.ehuniverse.com gateway deprecated (2026-04-20).
- **RAG layer**: ChromaDB 990k docs (Wikipedia CC BY-SA curated) + 25 genre rules auto-assembled via `/api/rag/prompt`. Client-side IP/brand sanitize on retrieval (see IP Guard below).
- **Image layer**: Flux-Schnell FP8 4-step via `/api/image/generate` (ComfyUI 8188)
- **NOA-PRISM v1.1**: Content rating and preservation/expansion control

## Design System v8.0

Three-tier token system (FULL ~3K / COMPACT ~800 / MINIMAL ~100 tokens).
16-rule runtime linter (`runDesignLint`), 5 presets, 4 UI primitives (Tooltip, Dropdown, Accordion, ProgressBar).
Semantic tokens required (`bg-bg-primary`, `text-text-primary`); raw Tailwind values prohibited.

## Translation Studio Architecture

Novel-specific AI translation — 1,408-line engine + 6,298-line UI.

- **2-mode x 41-band**: Fidelity (4-axis) / Experience (6-axis) orthogonal design
- **6-axis scoring**: translationese, fidelity, naturalness, consistency, groundedness, voiceInvisibility
- **Auto-recreation loop**: score < 0.70 -> temperature increase + regeneration (max 2 rounds)
- **Critical Axis auto-block**: translationese>0.60 / fidelity<0.40 threshold violation -> forced recreation
- **CAT standard**: XLIFF 1.2 + TMX 1.4 + TBX support
- **Glossary Manager**: reactive singleton, batch-pending-only term application
- **Character Register**: stranger/formal/colleague/friend/intimate/hostile 6 levels
- **EMA learning profile**: translation error pattern accumulation -> next prompt hint injection
- **Language-specific**: JP (narou-kei short sentences, ore/boku/watashi), CN (wangwen, idiom substitution)
- **Length validation**: KO->EN 1.10~1.60, KO->JP 0.85~1.20, KO->CN 0.80~1.15

## Infrastructure

- **Auth**: Firebase Google Sign-In + Firestore security rules + Stripe subscription tiers
- **Storage**: localStorage (500ms) + IndexedDB (10min backup) + GitHub (Octokit) + Firestore (CLOUD_SYNC flag) + Google Drive
- **i18n**: 4 languages (KO, EN, JA, ZH) via LangContext with type-safe switching
- **Security**: CSP headers via `next.config.ts headers()`, CSRF origin checks, rate limiting (sliding window per IP)
- **CI/CD**: GitHub Actions + Playwright E2E, Vercel deployment with Turbopack
- **Cron**: `/api/cron/universe-daily` for automated content generation
- **Feature Flags**: 7 flags (IMAGE_GENERATION, GOOGLE_DRIVE_BACKUP, NETWORK_COMMUNITY, OFFLINE_CACHE, CODE_STUDIO, EPISODE_COMPARE, CLOUD_SYNC)
- **PWA**: Service Worker (`public/sw.js`) + `manifest.webmanifest` (standalone installable)

## Quality Catalog

436-rule dual catalog: 224 bad patterns (anti-patterns, vulnerabilities) + 212 good patterns.
Good pattern detector runs 40 regex rules. Context-aware, memoized for pipeline performance.
Wired to both generation (prompt injection) and verification (scoring) stages.

---

## ARCS — AI Response Control System (2026-04-23 consolidation)

ARCS is the foundational response-control layer shared across Loreguard, Code Studio, and Translation Studio.
Three modules below (`WRITING_AGENT_REGISTRY`, `IP Guard L1~L5`, `Compliance 7 Axes`) form the open-source surface of ARCS.
Patent 10-2026-0038027 (KIPO, filed 2026-03-03, fast-track review).

### WRITING_AGENT_REGISTRY

Central registry (`src/lib/ai/writing-agent-registry.ts`) for every AI entrypoint across Studio, Translation, and Archive modules — the counterpart of Code Studio's 19-role `AGENT_REGISTRY`.

- **11 agent entries**: `studio-draft`, `studio-inline-completion`, `studio-inline-rewrite`, `studio-detail-pass`, `translator-stage-1-draft` ... `translator-stage-5-chief-editor`, `translator-story-bible`, `codex-structured-json`, `network-agent-archive`
- **6 Guard IDs**: `no-english-thinking-korean-novel`, `no-think-translation`, `no-yap-json`, `ip-brand-guard`, `prism-all-ages` / `teen-15` / `mature-18`
- **7 Context Block IDs**: `character-dna`, `world-book`, `scene-sheet`, `genre-rules`, `story-summary`, `glossary`, `continuity-notes`
- **Builder**: `buildAgentSystemPrompt(id, ctx)` — role → duty → guards → context blocks → extra directives
- **Meta util**: `auditRegistry()` — guards/blocks coverage statistics + missing-notes detection

Migration strategy: existing `buildSystemInstruction()` (pipeline.ts), `buildPrompt()` (build-prompt.ts), and `complete/route.ts` builders are migrated to the registry incrementally.

### IP Guard (L1 ~ L5)

Five-layer defense against brand/copyright contamination in RAG and AI output (`src/lib/ip-guard/`).

| Layer | Role | Implementation |
|-------|------|----------------|
| **L1 Ingestion Guard** | Block critical IP/copyright before ChromaDB ingest | `src/app/api/network-agent/ingest/route.ts` — 403 on critical match |
| **L2 Retrieval Filter** | Annotate or strict-filter RAG results | `src/services/ragService.ts sanitizeRagResults` |
| **L3 Prompt-time Guard** | Inject brand-avoidance directive via agent registry | `ip-brand-guard` GuardId |
| **L4 Output Post-Check** | Score compliance axis-7 + auto regenerate | `src/lib/ip-guard/compliance-axis-7.ts` |
| **L5 Cross-Corpus N-gram** | Character-level Jaccard for plagiarism detection | `src/lib/ip-guard/ngram-similarity.ts` |

- **Static blocklist** (`brand-blocklist.ts`): 80+ entries across 9 categories (US/JP/KR entertainment, KR webtoon/webnovel, games, tech, luxury, food, sports/fashion, film/TV)
- **Codex dynamic blocklist** (`codex-blocklist.ts`): per-project `localStorage` with `loadCodexBrandBlocklist` / `upsertCodexBrandEntry` / `removeCodexBrandEntry`
- **Korean-aware patterns**: "무단 전재 금지", "© 2024", ™/® symbols, copyright notices

### Compliance Scoring — 7 Axes (2026-04-23)

Orchestrator (`src/lib/compliance/orchestrator.ts`) runs seven independent axes on AI-generated drafts and produces a regeneration directive for any failed axis.

| # | Axis | Module |
|---|------|--------|
| 1 | Worldbook consistency | `axis-1-worldbook.ts` |
| 2 | Character fidelity | `axis-2-character.ts` |
| 3 | Direction compliance (POV + tone) | `axis-3-direction.ts` |
| 4 | Genre rules | `axis-4-genre.ts` |
| 5 | Scene sheet coverage | `axis-5-scene-sheet.ts` |
| 6 | Continuity (prev-chapter delta) | `axis-6-continuity.ts` |
| 7 | IP/brand violation | `axis-7-ip.ts` (wraps `ip-guard/compliance-axis-7`) |

Each axis returns `{score, weight, passed, issues, recommendations}`. Default pass threshold **80 / 100**, strict-critical mode (any critical issue ⇒ fail). Orchestrator computes weighted total, generates `regenerationDirective`, and `applyDirectiveToPrompt()` folds it back into the next attempt.

MVP uses rule-based quantitative scoring. LLM Auditor extension (same vLLM 8001, low-temp self-critique) planned for semantic consistency on axes 1 & 2.
