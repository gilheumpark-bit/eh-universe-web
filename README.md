<div align="center">

<img src="public/images/logo-badge.svg" alt="EH Universe" width="320" />

### Where are you headed?

A worldbuilding portal for 200,000 star systems — with an AI writing studio and a verified code IDE.

[![한국어](https://img.shields.io/badge/lang-한국어-blue?style=flat-square)](README.ko.md)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-1600+-22c55e?style=flat-square)
![Audit](https://img.shields.io/badge/audit-94%2F100-22c55e?style=flat-square)
![License](https://img.shields.io/badge/CC--BY--NC--4.0-blue?style=flat-square)

[Live Demo](https://ehuniverse.com) · [Docs](#documentation) · [Contributing](CONTRIBUTING.md)

</div>

---

## Overview

EH Universe is a full-stack creative platform built on a single Next.js application. It combines a worldbuilding archive, an AI-powered novel writing studio, a verified code IDE, a translation workspace, and a writer community — all sharing a unified design system and authentication layer.

**82% of features work without an API key.** The platform functions as a standalone writing tool, code editor, and lore archive even with AI completely disabled.

---

## Apps

<table>
<tr>
<td width="50%">

**Universe Portal** `/`
Lore archive with 109 documents, 80 classified reports, codex, rulebook, and 7 interactive tools including galaxy map, vessel specs, and warp gate calculator.

</td>
<td width="50%">

**NOA Studio** `/studio`
AI novel writing engine with worldbuilding, character design, scene direction, style profiling, manuscript management, and EPUB/DOCX/TXT export.

</td>
</tr>
<tr>
<td>

**Code Studio** `/code-studio`
Browser-based IDE with Monaco editor, multi-terminal, WebContainer preview, TypeScript IntelliSense, Git engine, natural language commands, and AI verification pipeline.

</td>
<td>

**Translation Studio** `/translation-studio`
Long-form translation workspace with bilateral editor, chapter management, glossary, and 5-stage AI translation pipeline.

</td>
</tr>
<tr>
<td>

**EH Network** `/network`
Writer community with planet systems, posts, comments, logs, settlements, and moderation tools.

</td>
<td>

**Tools** `/tools/*`
Galaxy map, vessel specs, warp gate, soundtrack player, Neka sound generator, NOA tower, and style studio.

</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2, React 19, TypeScript 5 |
| UI | Tailwind CSS 4, Design System v8.0, Lucide Icons |
| AI | Gemini 3.1, OpenAI GPT-5.4, Claude 4.6, Groq, Mistral (BYOK) |
| Editor | Monaco Editor, xterm.js, WebContainer API |
| Database | Firebase Firestore + Auth |
| Engine | ANS 10.0 (Narrative), Verification Loop (Code) |
| Export | EPUB / DOCX / TXT — pure JS, zero dependencies |
| Testing | Jest (~1,600 tests), Integration (50 cases) |
| Deploy | Vercel |

---

## Quick Start

```bash
git clone https://github.com/gilheumpark-bit/eh-universe-web.git
cd eh-universe-web
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). No API key required for basic features.

```bash
npm run build        # Production build
npm run lint         # ESLint (0 errors)
npm test             # Unit tests
```

---

## Architecture

```
src/
├── app/                    # Next.js App Router (28 routes)
│   ├── studio/             # NOA Writing Studio
│   ├── code-studio/        # Verified Code IDE
│   ├── translation-studio/ # Translation Workspace
│   ├── network/            # Writer Community
│   └── tools/              # Interactive Tools (7)
├── components/             # React Components (~200)
├── engine/                 # ANS 10.0 Narrative Engine
├── lib/                    # Shared Libraries
│   └── code-studio/        # IDE Core (6 directories)
│       ├── core/           # Panel Registry, Design System v8.0
│       ├── ai/             # Agent Teams, Ghost Text
│       ├── pipeline/       # Verification Loop, Design Linter
│       ├── editor/         # Monaco Setup, IntelliSense
│       ├── features/       # Terminal, Git, Debugger, Sandbox
│       └── audit/          # Quality Engine
├── hooks/                  # Custom React Hooks
└── services/               # AI Provider Services
```

---

## Design System v8.0

Three-tier token efficiency for AI-generated UI:

| Tier | Tokens | Usage |
|------|--------|-------|
| FULL | ~3,000 | CSS layout agents, ChatPanel |
| COMPACT | ~800 | App generator, Autopilot |
| MINIMAL | ~100 | Chat fallback |

- Semantic color tokens (`bg-bg-primary`, not raw Tailwind)
- Z-index variables (`--z-dropdown` through `--z-tooltip`)
- 4px spacing grid, 44px touch targets
- 16-rule runtime design linter
- 5 design presets with auto-detection

---

## Testing

```
Layer 1  Static       TypeScript + ESLint + Build
Layer 2  Unit         161 suites, ~1,600 tests
Layer 3  Integration  3 suites, 50 cases
Layer 4  Audit        16 areas, 94/100 (S grade)
Layer 5  Runtime      ErrorBoundary, AbortController
```

---

## i18n

Korean, English, Japanese, Chinese — real-time switching.

Central dictionary with identical leaf counts across all languages. Fallback: JP/CN → EN → KO.

---

## Security

- CSP + HSTS + X-Frame-Options via `next.config.ts headers()`
- API key encryption (AES-GCM v4)
- Firebase Auth with admin role gates
- SHA-256 password hashing for shared content
- Input validation (45 maxLength + 50K engine limit)

---

## Documentation

| Document | Description |
|----------|------------|
| [README.ko.md](README.ko.md) | Korean documentation |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guide |
| [SECURITY.md](SECURITY.md) | Security policy |
| [RUNBOOK.md](RUNBOOK.md) | Operations runbook |
| [docs/feature-inventory.md](docs/feature-inventory.md) | 168 features inventory |

---

---

## CS Quill 🦔 — Integrated Code Quality CLI

EH Universe Web includes **CS Quill**, a 56-engine autonomous AI coding agent, built into `src/cli/`.

```
    /\_/\
   ( o.o )  CS Quill — Code Quality Guardian
    > ^ <   77 files | 18,238 lines | 56 engines
  /||||||\\
```

### Quick Start

```bash
# Use via npm script
npm run cs -- init
npm run cs -- generate "REST API with auth"
npm run cs -- verify ./src
npm run cs -- daemon --port 8443
```

### 3-Tier Architecture

```
eh-universe-web  ←── REST ───→  CS Quill CLI (Daemon)
                                ↕ WebSocket
eh-universe-vscode ←── WS ──→  CS Quill CLI (Daemon)
```

| Component | Repository | Purpose |
|-----------|-----------|---------|
| **Web App** | [eh-universe-web](https://github.com/gilheumpark-bit/eh-universe-web) | Next.js app with Code Studio (this repo) |
| **CLI** | [cs-quill-cli](https://github.com/gilheumpark-bit/cs-quill-cli) | Standalone 56-engine CLI + WebSocket daemon |
| **VS Code** | [eh-universe-vscode](https://github.com/gilheumpark-bit/eh-universe-vscode) | Extension with diagnostics + quick-fix |

### Commands (28)

| Command | Description |
|---------|-------------|
| `cs init` | Project initialization & onboarding |
| `cs generate <prompt>` | SEAL contract parallel code generation |
| `cs verify [path]` | 8-team parallel verification |
| `cs audit` | 16-area project health audit |
| `cs daemon --port 8443` | WebSocket daemon server |
| `cs stress --url <endpoint>` | HTTP load testing (autocannon) |
| `cs bench [path]` | Function benchmarking (tinybench) |
| `cs compliance --sbom cyclonedx` | SBOM generation |
| `cs doctor` | Environment diagnostics |
| `cs vibe <prompt>` | Natural language mode |
| ...and 18 more | `cs --help` for full list |

### Verification Pipeline

```
8 Teams: Regex → AST → Hollow → Dead-Code → Design → Cognitive → Bug → Security
Receipt: HMAC-SHA256 hash chain (tamper-proof audit trail)
Offline: 10 self-healing rules (no AI required)
```

### 56 Engines

AST(6) + Lint(6) + Security(6) + Performance(5) + Testing(3) + TUI(10) + IP(3) + Formal(1) + Data(3) + Extended(13) = **56 open-source packages**

Full engine list: [cs-quill-cli README](https://github.com/gilheumpark-bit/cs-quill-cli#56-integrated-engines)

---

## License

[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) — Free to use for non-commercial purposes.

<div align="center">

---

*"Where are you headed?"*

Built with Next.js, TypeScript, seven AI providers, and CS Quill 🦔.

</div>
