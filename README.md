<div align="center">

<img src="public/images/logo-badge.svg" alt="NOA Code Studio" width="320" />

# NOA Code Studio

### Validation-First Code Generation IDE

A standalone AI IDE built around the **CS-Quill** verification engine.
Local files, real terminals, real git, BYOK AI — all in your workspace with 
a transparent, glassmorphism-inspired UI.

![License](https://img.shields.io/badge/CC--BY--NC--4.0-blue?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Status](https://img.shields.io/badge/status-alpha-orange?style=flat-square)

[Architecture](docs/ARCHITECTURE.md) · [IPC Reference](docs/IPC.md) · [Theming](docs/THEMING.md)

</div>

---

## What this is

NOA Code Studio is a standalone IDE with a single mission: **verified code generation** backed by an autonomous Gen-Verify-Fix pipeline. 
It differs from simple LLM wrappers by natively supporting code verification, executing design linters, and autonomously escalating fixes within the browser environment.

## Why desktop

Web Code Studio could only fake what an IDE actually needs:
- Real local files (Chrome's File System Access API is partial and gated)
- Real `git` (lightning-fs is a memory simulation)
- Real `npm install` / `tsc` / `eslint` (webcontainer is a sandbox)
- Real terminal (no PTY in the browser)
- OS keychain for API keys (browsers store in plaintext localStorage)

Desktop fixes all of those. Same UI, real plumbing.

## Features

- **CS-Quill engine** — 300+ detectors across security, runtime, API,
  performance, complexity, type safety, logging, error handling
- **ARI Circuit Breaker** — per-provider EMA-based failover for AI calls
- **BYOK with OS keychain** — API keys never leave the main process,
  XSS-immune by design (`window.cs.keystore` has no `get` method)
- **Real local file system** with chokidar watcher → automatic
  Quill verify on save
- **Real git** via spawned `git` (no isomorphic-git emulation)
- **Real terminal** via node-pty (with child_process fallback)
- **Bundled CLI** — install `cs` to your PATH from the Tools menu
- **Light + dark themes** — both AA-compliant (32/32 pairs verified)
  with Monaco editor in lockstep
- **Auto-update** via electron-updater (consent-required, no silent
  installs)

## Quick start

```bash
# Clone + install
git clone https://github.com/eh-universe/code-studio.git
cd code-studio
pnpm install

# Run in dev (Next + Electron with hot reload)
pnpm --filter @eh/desktop dev:electron

# Or build a packaged app for your OS
pnpm --filter @eh/desktop run build
pnpm --filter @eh/desktop exec electron-builder
```

After installing, use **Tools → Install Command Line Tools (cs)**
to put `cs` on your PATH:

```bash
cs --help
cs verify ./src/foo.ts
cs audit
```

## Repository layout

```
.
├── packages/
│   ├── shared-types/      # @eh/shared-types — pure type defs
│   ├── quill-engine/      # @eh/quill-engine — Pure TS verification
│   └── quill-cli/         # @eh/quill-cli — `cs` binary
├── apps/
│   └── desktop/           # @eh/desktop — Electron + Next.js
│       ├── main/          #   Electron main + IPC modules
│       ├── renderer/      #   Next.js (Code Studio UI)
│       ├── e2e/           #   Playwright Electron smoke tests
│       └── electron-builder.yml
├── tools/
│   └── scripts/
│       ├── codemod-quill-imports.mjs
│       └── contrast-check.mjs   # WCAG AA verifier
├── docs/
│   ├── ARCHITECTURE.md
│   ├── IPC.md
│   └── THEMING.md
├── pnpm-workspace.yaml
└── turbo.json
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Process model + monorepo layout
- [docs/IPC.md](docs/IPC.md) — Complete `window.cs` reference
- [docs/THEMING.md](docs/THEMING.md) — Token system + light/dark guide
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [CHANGELOG.md](CHANGELOG.md)

## Status

**Alpha.** The desktop migration is structurally complete (Phases 0
through F-2). Functional integration of the Quill engine into the
auto-watch loop and the GitPanel rewrite to use `window.cs.git`
are still in progress.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#phase-history) for
the full phase log.

## License

CC-BY-NC-4.0
