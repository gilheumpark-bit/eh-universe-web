# NOA Novel Studio Docs

## API Documentation
- Generate: `npm run docs:api`
- Output: `docs/api/index.html` (gitignored — regenerate locally)
- Live rebuild during authoring: `npm run docs:api:watch`

Scope: all exports under `src/lib` that ship with Novel Studio. Internal
helpers are marked with `@internal` and excluded automatically.

## User Docs
Studio in-app: `/studio` → **Docs** tab (F8 shortcut).

## Static Documentation
Source Markdown files in this directory:

| File | Purpose |
|------|---------|
| `API.md` | Hand-written API overview (stable surface) |
| `FEATURE_FLAGS.md` | Feature flag reference |
| `QA-bug-report-checklist.md` | QA checklist for bug reports |
| `brand-philosophy.md` | Brand voice and tone |
| `competitive-analysis.md` | Competitive landscape |
| `eh-translator-nte-5-enhancements.md` | Translation Studio notes |
| `eh-universe-baseline-checklist.md` | Baseline readiness checklist |
| `feature-inventory.md` | Feature inventory |
| `pitch-deck-draft.md` | Pitch deck draft |

## Writing JSDoc for TypeDoc
Preferred tags for public exports:

- `@module <name>` at file top
- `@param`, `@returns` for functions
- `@example` for non-trivial usage
- `@internal` to hide from generated docs (still compiled)
- `@deprecated <reason>` with replacement guidance

TypeDoc reads JSDoc from `.ts` files under `src/lib/`; `.tsx` React
components are not currently targeted by the default entry points.
