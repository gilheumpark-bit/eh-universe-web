<div align="center">

<img src="public/images/logo-badge.svg" alt="EH Universe" width="320" />

### Where are you headed?

A worldbuilding portal for 200,000 star systems — with an AI writing OS and a verified code IDE.

[![한국어](https://img.shields.io/badge/lang-한국어-blue?style=flat-square)](README.ko.md)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-1600+-22c55e?style=flat-square)
![License](https://img.shields.io/badge/CC--BY--NC--4.0-blue?style=flat-square)

[Live](https://ehsu.app) · [Docs](#documentation) · [Contributing](CONTRIBUTING.md)

</div>

---

## Overview

EH Universe is a full-stack creative platform built on a single Next.js 16.2 application. Five apps share a unified design system and authentication layer:

1. **Universe Portal** — 140+ lore documents across 8 categories
2. **NOA Studio** — AI writing OS with real-time quality analysis
3. **Code Studio** — Verified code IDE with 9-team pipeline + Quill Engine
4. **Translation Studio** — Novel-specific AI translation with 6-axis scoring
5. **EH Network** — Writer community with planet systems

**BYOK (Bring Your Own Key)** — works with Gemini, OpenAI, Claude, Groq, Mistral, Ollama, LM Studio. Free to use.

---

## Apps

<table>
<tr>
<td width="50%">

**Universe Portal** `/archive`
140+ documents across 8 categories (Core, Timeline, Factions, Technology, Geography, Military, Classified, Reports). Color-coded security levels (PUBLIC / RESTRICTED / CLASSIFIED).

</td>
<td width="50%">

**NOA Studio** `/studio`
Writing OS with macOS-style dock, 5 writing modes (AI / Edit / Canvas / Refine / Advanced), real-time paragraph quality analysis (show/tell, repetition, variety, density, dialogue), continuity checking, inline rewrite (Ctrl+Shift+R), EPUB/DOCX/TXT export, version diff, DGX SSE streaming (TTFT 0.05s), Zen tunnel-vision mode, manuscript editor (65ch width, font scaling Ctrl+=/-), scene direction sheet (13-field inline panel), character smart injection, Story Bible anti-forgetting.

</td>
</tr>
<tr>
<td>

**Code Studio** `/code-studio`
Browser IDE with Monaco editor, 51-panel registry, 9-team verification pipeline, diff-guard (SCOPE/CONTRACT/@block protection), 4-Tier orchestration (Ultra/ProPlus/Standard/Lite), 224-rule Quill Engine + 436-rule dual catalog, design linter (16 rules), and WebContainer preview.

</td>
<td>

**Translation Studio** `/translation-studio`
Novel-specific AI translation with 2-mode x 41-band scoring (Fidelity 4-axis / Experience 6-axis), auto-recreation loop (score < 0.70), glossary manager, character register (6 relation levels), XLIFF/TMX/TBX export, and language-specific presets (JP narou-kei, CN wangwen).

</td>
</tr>
<tr>
<td>

**EH Network** `/network`
Writer community with planet systems, posts, comments, logs, settlements, and moderation.

</td>
<td>

**Tools** `/tools/*`
Galaxy map, vessel specs, warp gate calculator, soundtrack player, Neka sound generator, NOA tower, style studio.

</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2, React 19, TypeScript 5 |
| UI | Tailwind CSS 4, Design System v8.0 (3-Tier), Lucide Icons |
| AI | Gemini, OpenAI, Claude, Groq, Mistral, Ollama, LM Studio (BYOK) |
| Writing Engine | ANS 10.0 — quality gate, tension curves, genre presets, HFCP, 4-agent DGX routing, genre temperature optimization |
| Code Engine | 9-team pipeline + 224-rule Quill Engine, diff-guard, apply-guard, intent-parser, 4-Tier |
| DGX Spark | GB10 128GB, 4-model multi-agent (qwen/abliterated/r1/eva) |
| Translation Engine | 6-axis scoring, 41-band, auto-recreation, glossary, CAT standard |
| Editor | Monaco Editor, xterm.js, WebContainer API |
| Storage | localStorage + IndexedDB + Firestore (CLOUD_SYNC) + Google Drive |
| Auth | Firebase Auth + Stripe tiers |
| Export | EPUB 3.0 / DOCX / TXT / XLIFF / TMX — pure JS |
| Testing | Jest (~1,600 tests), Playwright E2E |
| Deploy | Vercel (ehsu.app) |

---

## Quick Start

```bash
git clone https://github.com/gilheumpark-bit/eh-universe-web.git
cd eh-universe-web
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). No API key required for archive, editing, and export.

```bash
npm run build        # Production build
npm run lint         # ESLint
npm test             # Unit tests
```

---

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── studio/             # NOA Writing OS
│   ├── code-studio/        # Verified Code IDE
│   ├── translation-studio/ # Translation Workspace
│   ├── network/            # Writer Community
│   ├── archive/            # Universe Archive (140+ docs)
│   └── api/                # 22 API routes
├── components/
│   ├── studio/             # Writing OS (OSDesktop, WindowTitleBar, StatusBar, Zen)
│   ├── code-studio/        # IDE panels (87 files)
│   └── translator/         # Translation editor + panels
├── engine/                 # ANS 10.0 — pipeline, quality-gate, director, genre-presets
├── hooks/                  # useQualityAnalysis, useContinuityCheck, useUndoStack, etc.
└── lib/
    ├── code-studio/        # IDE core (6 directories)
    │   ├── core/           # Panel registry, design system, scope policy
    │   ├── ai/             # Intent parser, calc protocol, tier registry
    │   ├── pipeline/       # Diff guard, apply guard, design transpiler, verification loop
    │   ├── editor/         # Monaco, IntelliSense
    │   ├── features/       # Terminal, Git, sandbox
    │   └── audit/          # Quality engine
    └── firestore-project-sync.ts  # Cloud sync (feature-flagged)
```

---

## NOA Studio — Writing OS

| Feature | Description |
|---------|-------------|
| **5 Writing Modes** | AI Draft / Manual Edit / 3-Step Canvas / Auto 30% Refine / Advanced |
| **Real-time Quality** | Paragraph scoring: show/tell, repetition, sentence variety, density, dialogue ratio |
| **Continuity Check** | Character name typos (edit distance 1), trait conflicts, time/genre contradictions |
| **Inline Rewrite** | Select text → Ctrl+Shift+R → context-aware AI rewrite with undo stack |
| **Quality Gate** | 6-dimension evaluation with per-attempt history tracking |
| **Version Diff** | Auto-snapshot at 300+ char changes, LCS-based diff view |
| **Export** | EPUB 3.0, DOCX (Office XML), TXT, MD, JSON, HTML, CSV |
| **Writing OS UI** | macOS dock, window title bar, status bar, zen mode |

---

## AI Workflow

| Feature | Detail |
|---------|--------|
| Retry | 3 attempts + jittered exponential backoff + Retry-After header |
| Token Budget | System prompt audit — warns at 30% context usage |
| Character Limit | Warns when >20 characters truncated from prompt |
| ARI Circuit Breaker | EMA scoring, auto-failover to healthy provider |
| Quality Gate History | Per-attempt grade/director-score/tag/fail-reasons tracking |
| Firestore Sync | Debounced 3s writes + onSnapshot real-time (CLOUD_SYNC flag) |

---

## Design System v8.0

| Tier | Tokens | Usage |
|------|--------|-------|
| FULL | ~3,000 | CSS layout agents, ChatPanel |
| COMPACT | ~800 | App generator, Autopilot |
| MINIMAL | ~100 | Chat fallback |

- Semantic tokens required (`bg-bg-primary`, not raw Tailwind)
- Z-index variables (`--z-dropdown` through `--z-tooltip`)
- 4px spacing grid, 44px touch targets
- 16-rule runtime design linter
- 5 design presets with auto-detection

---

## CS Quill — Code Quality CLI

```
    /\_/\
   ( o.o )  CS Quill — Code Quality Guardian
    > ^ <   56 engines | 274 tests | SBOM | Offline
  /||||||\\
```

```bash
npm run cs -- init
npm run cs -- generate "REST API with auth"
npm run cs -- verify ./src
npm run cs -- audit
```

28 commands, 56 engines, 3-tier architecture (Web + CLI + VS Code Extension).

---

## Documentation

| Document | Description |
|----------|------------|
| [README.ko.md](README.ko.md) | Korean documentation |
| [CHANGELOG.md](CHANGELOG.md) | Version history (v2.0.0) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guide |
| [SECURITY.md](SECURITY.md) | Security policy |
| [RUNBOOK.md](RUNBOOK.md) | Operations runbook |

---

## License

[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) — Free for non-commercial use.

<div align="center">

---

*"Where are you headed?"*

Built with Next.js 16.2, TypeScript, seven AI providers, and CS Quill.

</div>
