# Essential 10 panels — Profiler / Performance measurement (Phase 1)

Use this sheet for **manual** runs per the performance audit plan. Team should agree numeric pass/fail thresholds (e.g. first interaction &lt; 300 ms) before comparing runs.

## Fixed scenario (each panel)

1. Open the panel from the activity bar (or shortcut if available).
2. Perform **three representative interactions** (e.g. scroll, type, tab switch) — pick actions that match real usage.
3. Close the panel.
4. Record:
   - **React DevTools Profiler**: commit time / render count for the open → interact → close sequence (one capture per panel is enough for a first pass).
   - **Chrome Performance**: note **long tasks** (&gt; 50 ms) during open and first interaction.

## Measurement table (fill per session)

| Panel id | Date | Profiler: worst commit (ms) | Long tasks (Y/N) | Notes |
|----------|------|----------------------------|------------------|-------|
| chat | | | | |
| quick-verify | | | | |
| project-spec | | | | |
| search | | | | |
| outline | | | | |
| preview | | | | |
| composer | | | | |
| pipeline | | | | |
| bugs | | | | |
| git | | | | |

## After measurement

1. Copy top bottlenecks into `panel-performance-inventory.csv` (`bottleneck_summary`, `verified_date`).
2. Apply **minimal** code fixes only for confirmed hotspots (see plan: one small PR per panel or two).
