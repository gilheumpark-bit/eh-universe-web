<div align="center">

# EH Code Studio

### Agentic Coding Engine

Desktop AI IDE with verification pipeline, local Ollama models, MCP tool protocol, and multi-file agent.

Your keys. Your files. Your machine.

![License](https://img.shields.io/badge/CC--BY--NC--4.0-blue?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-41-47848F?style=flat-square&logo=electron&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Status](https://img.shields.io/badge/status-beta-green?style=flat-square)

</div>

---

## Quick Start

```bash
git clone https://github.com/gilheumpark-bit/local-code-studio.git
cd local-code-studio
pnpm install

# Dev mode (hot reload)
pnpm --filter eh-code-studio-desktop run dev:electron

# Production build
pnpm --filter eh-code-studio-desktop run build:electron
# Output: dist/desktop/*.exe, *.zip
```

## Why Desktop

| Need | Browser | Desktop |
|------|---------|---------|
| Local files | File System Access API (partial) | **Native fs** |
| Git | isomorphic-git (memory simulation) | **Real `git` CLI** |
| Terminal | No PTY | **node-pty** |
| npm/tsc/eslint | WebContainer sandbox | **Real shell** |
| API key security | localStorage (plaintext) | **OS keychain (DPAPI/Keychain)** |
| Local AI | CORS blocked | **Direct Ollama HTTP** |

## Features

### AI Providers (BYOK)

| Provider | Type | Models |
|----------|------|--------|
| Gemini | Cloud | 2.5-pro, 2.5-flash, 3.x |
| OpenAI | Cloud | gpt-5.4, 4.1 |
| Claude | Cloud | opus-4-6, sonnet-4-6 |
| Groq | Cloud | llama-3.3-70b |
| **Ollama** | **Local** | Any (codellama, deepseek-coder, qwen2.5, ...) |
| LM Studio | Local | Any |

### Tab Autocomplete (FIM)

- Local FIM via Ollama (sub-200ms, no cloud needed)
- Native FIM tokens: CodeLlama, DeepSeek Coder, StarCoder, Qwen2.5-Coder
- Adaptive debounce: 300ms local / 1000ms cloud
- Style learning from accepted completions
- Cloud fallback when local unavailable

### MCP Protocol (Model Context Protocol)

- **stdio**: Spawn MCP servers as child processes
- **HTTP**: Connect to remote servers
- Tool calling in chat (AI requests tools, results flow back)
- Auto-restart with exponential backoff
- Config persistence

### Multi-File Agent

- Dependency graph analysis (import tracing + topological sort)
- AI-driven planning (team-leader agent)
- Cross-file context injection
- Snapshot manager for atomic rollback
- Per-file accept/reject with diff preview

### Quill Verification Pipeline

8-team static analysis with auto-fix loop:

| Team | Type | Role |
|------|------|------|
| Simulation | Non-blocking | Static analysis |
| Generation | Non-blocking | Code gen |
| Validation | **Blocking** | Must pass |
| Size-density | Non-blocking | Metrics |
| Asset-trace | Non-blocking | Asset tracking |
| Stability | Non-blocking | Stress test |
| Release-IP | **Blocking** | Patent/license scan |
| Governance | Non-blocking | Final checks |

### Desktop-Native

- Native terminal (node-pty)
- Git CLI (real commands, not simulation)
- OS keychain (API keys encrypted at rest)
- OS notifications (background tasks)
- Global shortcut: `Ctrl+Shift+E`
- Recent documents in OS task bar
- Native clipboard (text, HTML, image)
- File watcher (chokidar)
- Auto-updater (GitHub Releases)

## Architecture

```
apps/desktop/
  main/                     # Electron main process
    ipc/                    # ai, fs, git, shell, quill, ollama, mcp, system
    services/               # ai-service, providers, updater, mcp-stdio
  renderer/                 # Next.js 16 (React 19)
    components/code-studio/ # 51-panel UI
    hooks/                  # Chat, Composer, Agent, FileSystem, Panels
    lib/code-studio/
      ai/                   # ghost, ollama-fim, mcp-tool-bridge, composer-planner
      core/                 # panel-registry, store, dependency-analyzer, snapshot-manager
      pipeline/             # verification loop, master-autopilot
      features/             # infinite-context, mcp-client, patent-scanner
packages/
  quill-engine/             # Verification engine (300+ detectors)
  quill-cli/                # CLI: cs verify, cs suggest, cs audit
  shared-types/             # Cross-package types
```

## Configuration

### Ollama

```bash
# 1. Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Pull a model
ollama pull codellama:7b-code

# 3. In app: Settings > Ollama > http://localhost:11434
```

### MCP Server

```
Settings > MCP Servers > Add
  Transport: stdio
  Command: npx
  Args: -y @modelcontextprotocol/server-filesystem /home/user
```

### CI/CD

Push `v*` tag to build for all platforms:

```bash
git tag v0.1.0-beta && git push --tags
```

See [`.github/workflows/release.yml`](.github/workflows/release.yml).

| Secret | Purpose |
|--------|---------|
| `GH_TOKEN` | GitHub Releases |
| `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` | macOS notarization |
| `CSC_LINK` + `CSC_KEY_PASSWORD` | Windows code signing |

## Development

```bash
pnpm --filter eh-code-studio-desktop run dev:electron  # Dev + hot reload
pnpm --filter eh-code-studio-desktop run lint           # ESLint
pnpm --filter eh-code-studio-desktop run test           # Jest
pnpm --filter eh-code-studio-desktop run verify:static  # Lint + TypeScript
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 41 + Node.js 20+ |
| Framework | Next.js 16 (static export) + Nextron |
| UI | React 19 + Tailwind 4 + Framer Motion |
| Editor | Monaco Editor |
| Terminal | xterm.js + node-pty |
| State | Zustand + IndexedDB |
| AI | Vercel AI SDK + direct provider APIs |
| Build | Turbo + pnpm workspaces + electron-builder |

## License

[CC BY-NC 4.0](LICENSE) - Attribution-NonCommercial.
