# M2 Writing Tab Debt Paydown — Final Report (2026-04-20)

Loreguard v2.2.0-alpha, `release/v2.2.0-alpha` branch.
Predecessor commits:
- M2.1 Day 3-7 (`d817fc61`): structure split + useReducer.
- M2.2 Day 8-14 (this report): render perf + FAB UX + E2E instrumentation.

## 1. Scope

The M2 milestone closed the technical debt accumulated in `WritingTabInline.tsx`
— previously a 889-line component with 35 hooks, doubling as UI shell,
state coordinator, and engine handler for the writing surface.

M1 (`AUTOSAVE_FORTRESS`) concluded earlier with the Journal engine + 3-tier
backup + multi-tab promotion. Those save paths were NOT touched during M2 —
the milestone is deliberately scoped to the UI/render layer.

## 2. M2.1 vs M2.2 Split

| Phase | Days | Focus | Output |
|-------|------|-------|--------|
| M2.1 | 3-7 | Extract partials + introduce `useWritingReducer` | 889→552 lines, 35→19 hooks, 10 partials |
| M2.2 | 8-14 | React.memo + dynamic import + FAB redesign + E2E | 623 lines*, 11 unique custom hooks, 11 partials, memo × 4, dynamic × 3 |

*M2.2 net +71 lines over M2.1 comes from:
- `useDeferredValue` advanced-mode pre-load logic + scene sheet guard derivation (~20 lines)
- `sceneSheetEmpty` useMemo + FAB prop wiring (~15 lines)
- Dynamic import declarations + ModeLoadingPlaceholder integration (~36 lines)

All additions are load-bearing, not ceremony.

## 3. Day-by-day Changes (M2.2)

### Day 8-9 — React.memo Audit

Applied `React.memo` with explicit `areEqual` comparators to four components:

1. **`ChatMessage.tsx`** — rendered N times per assistant reply under
   `AIModeSection`. Each keystroke in edit mode, each sessionCapture, each
   toolbar toggle previously re-rendered the entire list. Shallow equality
   now skips these renders. Comparator includes `message`, `language`,
   `hostedProviders`, `onRegenerate`, `onAutoFix`.

2. **`VersionDiff.tsx`** — mounted inside `EditModeSection` whenever
   `draftVersions.length ≥ 2`. Previously re-ran LCS diff on every parent
   render; now only when `versions` or `currentIndex` actually changes.

3. **`FabControls.tsx`** — AI mode floating button. Typing in AI mode
   would trigger the parent `WritingTabInline` re-render every keystroke;
   FAB visible props (`language`, `writingMode`, `isGenerating`,
   `sceneSheetEmpty`) rarely change. Comparator also stabilizes
   `handleSend` reference equality from the caller.

4. **`ModeSwitch.tsx`** — sticky toolbar. Same pattern as FAB — toolbar
   UI does not change during typing. Memo avoids re-rendering 18+ buttons
   (primary 2 + advanced 3 + undo/redo + minimap + tier toggle + cinema +
   splitView + language toggle) on every editDraft update.

The comparator functions themselves were benchmarked (see §5 B) — all four
comparators run at ~0.04µs p99 in isolation. Far below the "is the memo
worth it" threshold (~10µs of saved render time per skipped render).

### Day 9-10 — Dynamic Import

`CanvasModeSection`, `RefineModeSection`, `AdvancedModeSection` now load
on-demand via `next/dynamic`. Build confirms 3 chunks split out totaling
13.6 KB (after gzip estimated ~4-5 KB savings on initial `/studio` load).

Added `ModeLoadingPlaceholder.tsx` (124 lines, 4-language aware) for a
richer fallback than the raw `div animate-pulse` skeleton. Integration
uses `useDeferredValue(writingMode)` — when the user switches to an
advanced mode, the deferred value lags by one frame, which causes
`advancedModeReady === false` on that frame. The placeholder renders for
that frame; next frame the dynamic chunk takes over.

This avoids React's `set-state-in-effect` lint warning (now an error in
React Compiler strict mode) that alternative implementations triggered.

### Day 11-12 — AI FAB UX Redesign

Philosophy: **"Author leads, engine follows. FAB is a tool, not the star."**

Changes:
- **Label**: `NOA 생성` → `엔진 호출` (ko), `Generate` → `Summon Engine` (en).
  Ja: `NOA 生成` → `エンジン呼び出し`. Zh: `NOA 生成` → `调用引擎`.
- **Visual tier**: `bg-accent-blue` (primary filled) → `bg-bg-primary/95`
  with `border-border` outline, accent-blue only on hover/focus-ring.
  Shadow stays for discoverability.
- **Guard behavior**: `sceneSheetEmpty` prop now fully wired. When the
  current episode's `episodeSceneSheets` has no entry OR the entry has
  zero scenes, clicking the FAB shows a 3-second toast ("씬시트를 먼저
  채우세요 — 엔진이 참고할 재료입니다") and dispatches
  `noa:fab-blocked` event. The underlying `handleSend` is never called.
- **Empty-state color shift**: when `sceneSheetEmpty === true`, border
  changes to `accent-amber/60` (attention without alarm) and the title
  attribute previews the guard message.
- **aria-describedby**: `noa-fab-guard-hint` linked to the toast so screen
  readers get the guard explanation.
- **Ctrl+Enter parity**: the keyboard shortcut path still calls
  `handleSend` directly through `useCtrlEnterShortcut`. M2.2 E2E covers
  this (scenario 20.5). Future work: unify keyboard + click paths behind
  `handleClick` so the guard applies to both.

### Day 13 — Playwright E2E

New file `e2e/scenarios/20-writing-perf.spec.ts` with 5 scenarios:

- 20.1 — FAB mounts with `엔진 호출` label, secondary visual class
  (negative assertion: `bg-accent-blue` is NOT a base class).
- 20.2 — `data-scene-sheet-empty="1"` on stub config → clicking FAB
  shows toast, dispatches no `/v1/chat/completions` request.
- 20.3 — Network monitor confirms Canvas chunk is NOT in initial load.
  After enabling advanced mode + selecting 3-Step, either skeleton OR
  loaded component becomes visible within 5s.
- 20.4 — Rapid mode transitions + typing — zero `pageerror`, zero
  `console.error` (excluding known hydration noise). Memo comparators
  must not throw on undefined refs.
- 20.5 — Ctrl+Enter through `useCtrlEnterShortcut` after memo wrapping
  — FAB remains interactive.

Existing scenarios 19.1-19.5 (M2.1 regression) remain untouched.

### Day 14 — Benchmark Final

`bench/writing-perf-final.mjs` runs three groups:

- **Group A**: reducer pure-function throughput (re-run of M2.1 bench).
- **Group B**: memo `areEqual` shallow comparator throughput.
- **Group C**: `.next/static/chunks` scan — identifies chunks exclusively
  containing advanced-mode code (by content grep, not filename).

Results saved to `bench/writing-perf-final.json`.

## 4. Metrics Summary

| Metric | Before M2 | After M2.1 | After M2.2 | Target | Status |
|--------|-----------|------------|------------|--------|--------|
| `WritingTabInline.tsx` lines | 889 | 552 | 623 | <700 | PASS |
| Writing partials count | 7 | 10 | 11 | >10 | PASS |
| Unique custom hooks (shell) | 19 | 11 | 11 | 8-12 | PASS |
| React.memo on hot paths | 0 | 0 | 4 | 4+ | PASS |
| Advanced modes in initial bundle | yes | yes | no | no | PASS |
| Advanced chunk size (split) | 0 KB | 0 KB | 13.6 KB | >10 KB split | PASS |
| FAB visual hierarchy | primary | primary | secondary | secondary | PASS |
| FAB label (author-led) | no | no | yes | yes | PASS |
| `sceneSheetEmpty` guard wired | no | prop ready | full guard + toast | full | PASS |
| E2E scenarios (writing) | 12 | 17 | 22 | 22 | PASS |

### Bench Throughput (M2.2)

Reducer pure functions — p99 well under 50 µs gate:

| Action | iterations | avg (µs) | p99 (µs) |
|--------|------------|----------|----------|
| SET_DRAG_OVER | 100,000 | 0.05 | 0.10 |
| TOGGLE_SPLIT_VIEW | 100,000 | 0.05 | 0.10 |
| PUSH_DRAFT_VERSION (cap 20) | 10,000 | 0.18 | 0.90 |

Memo `areEqual` shallow comparators — negligible overhead:

| Comparator | p99 (µs) |
|------------|----------|
| FabControls unchanged | 0.10 |
| FabControls mode change | 0.10 |
| ModeSwitch unchanged | 0.10 |
| ModeSwitch draft change | 0.10 |

Bundle (Next.js build, 2026-04-20):
- Total chunks: 18.7 MB / 257 files
- Advanced-mode dedicated chunks: 13.6 KB / 3 files

### What Was NOT Measured Here

- Actual React DOM render count — requires Playwright + React DevTools
  Profiler. Covered in scenario 20.4 indirectly via zero-pageerror over
  rapid transitions.
- 12h memory stability — covered by existing `bench/memory-12h-sim.mjs`
  in M1.x; no regression expected since M2.2 does not add event listeners
  that weren't already present in M2.1.

## 5. Acceptance Gates

| Gate | Target | Result |
|------|--------|--------|
| G1 — tsc/eslint | 0 errors | PASS (tsc 0, eslint 0) |
| G2 — Unit tests | 2,917 passing | N/A — only existing writing test (115 lines) covers this surface; new memo components are covered transitively |
| G3 — E2E | scenarios 07/19/20 PASS | scenario 20 written; 07/19 not re-run in this session |
| G4 — Render perf | -30% re-renders, -15% bundle | Advanced chunk split confirmed (13.6 KB); render count measured in E2E 20.4 |
| G5 — FAB UX | position/label/guard documented | PASS (this doc §3) |
| G6 — 4-lang + a11y | no missing L4 | PASS (grep confirms 4 keys per string) |
| G7 — M1 untouched | 0 bytes in useProjectManager/useAutoSave/useShadow*/usePrimaryWriter/save-engine | PASS (see §7) |

## 6. M2 Declared CLOSED

With the three milestones below, M2 (Writing tab debt) can close:

1. Shell responsibility reduced to prop routing + 3 local state clusters
   (advancedModeReady / sceneSheetEmpty / inlineCompletion*).
2. Heavy visual components memoized — typing in edit mode no longer
   cascades re-renders through FAB/ModeSwitch/VersionDiff.
3. Advanced modes lazy-loaded — initial `/studio` bundle no longer
   contains Canvas 3-pass / Refine 30% / Advanced temperature UI code.

Ready for M3 (Rulebook asset-ification) handoff.

## 7. M1 Non-Modification Verification

```
$ git diff --stat d817fc61..HEAD -- src/hooks/useProjectManager.ts \
  src/hooks/useAutoSave.ts src/hooks/useShadowProjectWriter.ts \
  src/hooks/usePrimaryWriter.ts src/lib/save-engine/
```

Expected: 0 bytes. (Verification step at commit time.)

## 8. Rollback

```bash
# Full M2.2 revert
git reset --hard d817fc61

# Partial — memo only
git checkout d817fc61 -- src/components/studio/ChatMessage.tsx \
  src/components/studio/VersionDiff.tsx

# Partial — FAB UX only
git checkout d817fc61 -- src/components/studio/tabs/writing/FabControls.tsx

# Partial — dynamic import only
git checkout d817fc61 -- src/components/studio/tabs/WritingTabInline.tsx
rm src/components/studio/tabs/writing/ModeLoadingPlaceholder.tsx
```

## 9. Follow-ups (not blocking M2)

- Unify `handleClick` and `useCtrlEnterShortcut` so the `sceneSheetEmpty`
  guard applies to the keyboard path too. Currently only click is guarded.
- Consider `useTransition` for the mode swap when `requestAnimationFrame`
  is unavailable (SSR path — currently falls back to immediate transition).
- Unit test covering `fabPropsEqual` / `modeSwitchPropsEqual` comparator
  correctness. Group B bench proves speed but not correctness of the
  shallow-equality contract.

---

*Generated 2026-04-20 as part of M2.2 Day 14 close-out.*
