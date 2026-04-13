# Contributing to EH Code Studio

Thank you for your interest. This document explains how to set up, develop, and submit changes.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Git
- (Optional) Ollama for local model testing

## Setup

```bash
git clone https://github.com/gilheumpark-bit/local-code-studio.git
cd local-code-studio
pnpm install
```

## Development

```bash
# Electron dev mode (Next.js hot reload + Electron)
pnpm --filter eh-code-studio-desktop run dev:electron

# Run tests
pnpm --filter eh-code-studio-desktop run test

# Lint
pnpm --filter eh-code-studio-desktop run lint

# Type check (strict)
pnpm --filter eh-code-studio-desktop run verify:static
```

## Build

```bash
# Full production build (renderer export + Electron packaging)
pnpm --filter eh-code-studio-desktop run build:electron
```

## Project Structure

```
apps/desktop/
  main/          # Electron main process (Node.js)
    ipc/         # IPC handlers (one file per domain)
    services/    # Business logic (ai-service, mcp-stdio, updater)
  renderer/      # Next.js frontend (React)
    components/  # UI components (51-panel system)
    hooks/       # React hooks
    lib/         # Core logic, AI providers, features
packages/
  quill-engine/  # Verification engine
  quill-cli/     # CLI tool
  shared-types/  # Shared TypeScript types
```

## Coding Standards

### Architecture Rules

- **Panel registry**: All panels must be registered in `panel-registry.ts` and imported via `PanelImports.tsx`. No hardcoded panels.
- **IPC security**: API keys never leave the main process. Renderer calls `keystore.set()` / `keystore.has()` but never `get()`.
- **Semantic tokens**: Use Design System v8.0 tokens (`bg-bg-primary`, `text-text-primary`). No raw Tailwind colors.
- **z-index variables**: Use `var(--z-dropdown)` etc. No hardcoded z-index numbers.

### Code Quality

- Verification-first: All code changes should pass `pnpm run verify:static`
- No `eval()`, `exec()`, `os.system()`, `__import__()`
- `typeof window` guard on all browser APIs used at module scope
- Empty catch blocks must have a comment explaining why

## Pull Request Process

1. Fork and create a branch from `feat/desktop-only-migration`
2. Make changes, ensure `verify:static` passes
3. Write a clear PR description with what changed and why
4. If adding a new IPC channel, update `preload.ts` + `cs-bridge.d.ts`
5. If adding a new panel, register in `panel-registry.ts` + `PanelImports.tsx`

## Commit Convention

```
type(scope): description

# Examples:
feat(desktop): add Ollama local model integration
fix(code-studio): resolve hydration mismatch
chore: update dependencies
```

## License

By contributing, you agree that your contributions will be licensed under [CC BY-NC 4.0](LICENSE).
