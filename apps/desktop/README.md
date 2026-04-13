# @eh/desktop

Electron desktop wrapper for EH Code Studio.

## Status

Phase B-1 — workspace skeleton. The actual move of `renderer/`, `main/`, `app/`
into this directory is **deferred** because Electron and Next dev processes
are holding file locks.

## To complete the move

1. Close all running EH Code Studio Electron windows.
2. Stop any `pnpm dev` or `nextron dev` processes.
3. Run from repo root:
   ```bash
   git mv renderer apps/desktop/renderer
   git mv main apps/desktop/main
   git mv app apps/desktop/app
   git commit -m "chore(monorepo): move desktop sources under apps/desktop/"
   ```

## Layout (target)

```
apps/desktop/
├── main/              # Electron main process
├── preload/           # Preload bridge (created in C-2)
├── renderer/          # Next.js (Code Studio UI)
├── app/               # Electron build output (gitignored)
├── electron-builder.yml  # (created in E-1)
└── package.json
```
