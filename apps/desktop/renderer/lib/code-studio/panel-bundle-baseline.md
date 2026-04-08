# Optional — Chunk / bundle baseline (Phase 3)

The audit plan treats this as **optional**: CI performance numbers are expensive; **relative growth** on a saved baseline is more practical than absolute KB limits.

## Monorepo root (Universe web app)

The repository root `next.config.ts` wires `@next/bundle-analyzer` when `ANALYZE=true`. After a production build, the analyzer opens a browser report — use it to note sizes of chunks that correspond to Code Studio panels (search by chunk name or module path).

Example (adjust package manager / script to your setup):

```bash
set ANALYZE=true
pnpm build
```

(On Windows PowerShell: `$env:ANALYZE="true"; pnpm build` — exact script name may differ; use the root app’s build command.)

## Desktop renderer (`apps/desktop`)

`apps/desktop/renderer/next.config.js` does **not** enable the bundle analyzer by default. To add a baseline: introduce the same `withBundleAnalyzer` wrapper and `ANALYZE` env gate, then run `npm run build` from `apps/desktop` and record chunk sizes for panel-related entry points.

## What to store

- **Date**, **git SHA**, **chunk name → size** for the dynamic imports used by `PanelImports.tsx` for the essential 10.
- Alert on **% increase** over baseline rather than fixed KB caps, unless the team agrees hard limits.
