# EH Code Studio — Desktop Architecture

## High level

```
┌─────────────────────────── monorepo ───────────────────────────┐
│                                                                  │
│  packages/                          apps/                        │
│  ├─ shared-types  ───┐               └─ desktop                  │
│  │                   ├──> @eh/quill-engine ──> @eh/quill-cli     │
│  │                   │            │                  │           │
│  │                   │            └──┐               │           │
│  │                   │               │               │           │
│  │                   └───────────────┴───────────────┘           │
│  │                                   │                           │
│  │                                   └──> apps/desktop           │
│  │                                          │                    │
│  └──────────────────────────────────────────┘                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- **`@eh/shared-types`** — pure type definitions, zero runtime
- **`@eh/quill-engine`** — verification engine, NO Node API imports
- **`@eh/quill-cli`** — `cs` binary, depends on quill-engine + Node
- **`apps/desktop`** — Electron app, depends on all of the above

## Desktop app structure

```
apps/desktop/
├── main/                    Electron main process (Node)
│   ├── main.ts              entry — window, menu, IPC registration
│   ├── preload.ts           contextBridge — window.cs surface
│   ├── ipc/
│   │   ├── fs.ts            file system + dialogs + chokidar watcher
│   │   ├── quill.ts         verification dispatch + auto-watcher
│   │   ├── ai.ts            BYOK chat streaming + ARI Circuit Breaker
│   │   ├── keystore.ts      safeStorage encrypted key store
│   │   ├── shell.ts         node-pty terminal
│   │   └── git.ts           real `git` invocations
│   ├── services/
│   │   ├── ai-service.ts    legacy compat (will be removed)
│   │   ├── updater.ts       electron-updater integration
│   │   └── cli-installer.ts install/uninstall the bundled cs CLI
│   └── workers/             child_process worker pool (planned)
│
├── renderer/                Next.js SPA (output: 'export')
│   ├── app/code-studio/     route entry (page/layout/loading/error)
│   ├── components/code-studio/  86 UI components
│   ├── hooks/
│   │   ├── useCodeStudio*   editor / chat / agent / panels
│   │   ├── useDesktopProject  bridge to window.cs.fs (NEW in C-5)
│   │   └── useSessionRestore
│   ├── lib/
│   │   ├── desktop-bridge.ts    typed facade over window.cs (NEW)
│   │   ├── theme-controller.ts  dark/light/auto state
│   │   ├── code-studio/         UI-side panels, store, types
│   │   ├── ai-providers.ts
│   │   ├── multi-key-manager.ts
│   │   └── i18n + LangContext
│   ├── styles/
│   │   └── theme.css        light + dark token system (D-1)
│   └── types/
│       ├── cs-bridge.d.ts   global types for window.cs
│       ├── i18n.ts          AppLanguage
│       └── code-studio-agent.ts
│
├── e2e/
│   ├── playwright.config.ts
│   └── specs/smoke.spec.ts  7-scenario smoke test
│
├── build/
│   └── entitlements.mac.plist
├── electron-builder.yml
├── package.json
└── README.md
```

## Process boundaries

```
┌─ Renderer (Chromium) ──────┐  contextBridge  ┌─ Main (Node) ─────────┐
│                            │ ◄─────────────► │                       │
│  Next.js / React           │                 │  ipc/fs               │
│  Monaco editor             │                 │  ipc/quill            │
│  CodeStudioShell           │                 │  ipc/ai (+ keystore)  │
│  hooks/components          │                 │  ipc/shell (node-pty) │
│                            │                 │  ipc/git (spawn)      │
│  window.cs.* (read-only)   │                 │  services/updater     │
│                            │                 │  services/cli-installer│
└────────────────────────────┘                 └───────────────────────┘
                                                        │
                                                        ▼
                                              ┌─ child_process ───────┐
                                              │  git, shell, node-pty │
                                              │  (workers TBD)        │
                                              └───────────────────────┘
```

**Security invariants:**
1. Renderer has `contextIsolation: true` and `nodeIntegration: false`.
2. Renderer cannot import `electron` or `fs` directly.
3. Renderer cannot get API keys (no `keystore.get`).
4. All file system access goes through `cs.fs.*` which only opens
   what the user picks via dialog.
5. All AI calls go through `cs.ai.*` which pulls keys from main.
6. ARI Circuit Breaker state lives in main, shared across windows.

## Quill engine isolation

`@eh/quill-engine` is **pure TypeScript** with no Node API imports.
This means:
- It runs unchanged in main (Node), CLI (Node), and renderer (browser).
- File reading, spawning, and other side effects must be injected
  by the caller.
- The engine is the same code wherever it runs — no drift between
  CLI behavior and IDE behavior.

## Build & dev

```bash
# Install
pnpm install

# Dev (Next + Electron with hot reload)
pnpm --filter @eh/desktop dev:electron

# Build all packages
pnpm turbo run build

# Build desktop only
pnpm --filter @eh/desktop run build

# Package for current OS
pnpm --filter @eh/desktop exec electron-builder

# Package for all 3 OS (CI only)
git tag v0.1.0 && git push --tags
# → triggers .github/workflows/release.yml matrix
```

## Phase history

| Phase | Description |
|---|---|
| 0 | Branch + Gemini WIP snapshot |
| A-1 | Inventory (boundaries) |
| A-2 | Web-only deletion (11 commits) |
| A-3 | package.json prune |
| B-1 | pnpm workspace + turborepo skeleton |
| B-2 | packages/quill-engine extraction (276 files) |
| B-3 | packages/quill-cli extraction (83 files) |
| B-4 | Import codemod to @eh/quill-engine |
| C-1 | fs IPC + window.cs bridge |
| C-2 | quill IPC + auto-watcher |
| C-3 | ai IPC + safeStorage keystore + ARI |
| C-4 | shell (PTY) + git IPC |
| C-5 | desktop-bridge facade + useDesktopProject hook |
| D-1 | Light + dark token system |
| D-2 | Monaco theme sync |
| D-3 | useTheme hook + ThemeToggle |
| D-4 | WCAG AA contrast verifier (32/32 pass) |
| E-1 | electron-builder.yml + 3 OS targets |
| E-2 | GitHub Actions release matrix + monorepo CI |
| E-3 | electron-updater integration |
| E-4 | CLI installer + Tools menu |
| F-1 | Playwright Electron 7-scenario smoke |
| F-2 | Documentation refresh (this file) |
