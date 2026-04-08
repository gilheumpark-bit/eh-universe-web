# Panel performance audit — Phase 0 inventory

**Single source of truth for panel IDs:** `core/panel-registry.ts` → `PANEL_REGISTRY` (51 entries). `ESSENTIAL_PANEL_COUNT` is derived from `isEssential: true` (10 panels).

**Tracking sheet (machine-readable):** [`panel-performance-inventory.csv`](./panel-performance-inventory.csv)

**Regenerate CSV** (from repository root):

```bash
node apps/desktop/scripts/gen-panel-inventory-csv.cjs
```

## Registry vs right-panel render map

`RightPanelContent` delegates to `renderRightPanelBranch` in `components/code-studio/right-panel-branch.tsx` (`switch` on `panel` — one branch per open panel, no per-render 51-closure map). Cross-check: all 51 registry IDs have a `case`; **no stub / missing ID**.

**Dynamic import surface:** `components/code-studio/PanelImports.tsx` exports each lazy-loaded panel component; the branch file references those exports (e.g. `PI.ChatPanelComponent`). The CSV column `panel_import_hint` still points reviewers to `PanelImports` + branch file.

**SLO / “프로덕션 95” 정의:** [`panel-performance-slo.md`](./panel-performance-slo.md)

**전수 QA:** [`docs/qa/README.md`](../../docs/qa/README.md) — `qa_status` / `last_functional_pass`는 기능 검증용.

## Column reference (CSV)

| Column | Meaning |
|--------|---------|
| `id` | Registry panel id |
| `group` / `status` | From `PANEL_REGISTRY` |
| `essential` | `yes` if `isEssential: true` |
| `map_connected` | `yes` if present in `right-panel-branch.tsx` `switch` |
| `panel_import_hint` | Where to find the `dynamic()` import + component |
| `verified_date` | Fill when manually profiled (performance) |
| `bottleneck_summary` | Short note from Profiler / Performance tab |
| `improve_status` | Performance follow-up: e.g. `pending` → `done` |
| `qa_status` | Functional QA: e.g. `pending` / `pass` / `fail` |
| `last_functional_pass` | Date (YYYY-MM-DD) of last functional pass |
| `notes` | Free text |

## Essential 10 (Phase 1 profiling targets)

`chat`, `quick-verify`, `project-spec`, `search`, `outline`, `preview`, `composer`, `pipeline`, `bugs`, `git`

See [`essential-panels-profiling.md`](./essential-panels-profiling.md) for the fixed scenario and measurement table template.
