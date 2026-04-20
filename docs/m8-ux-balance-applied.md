# M8 — Writer UX Balance Remediation (Applied)

**Branch**: `feature/M8-ux-balance`
**Date**: 2026-04-20
**Reference**: `docs/m8-ux-balance-audit.md`

**Philosophy**: hide / group / defer — **never delete**. Every knob from v2.2.0-alpha remains functional and reachable.

---

## Summary table (before → after)

| Surface | Before (decisions visible on first open) | After | Reduction |
|---------|------------------------------------------|-------|-----------|
| SessionSection accordion | 11 controls (5 pomodoro + 1 typography preset + 5 ergonomics toggles) | 5 controls (5 pomodoro) + 1 nested accordion "장기 사용 편의 (선택)" | -55% |
| SessionSection M6 ergo (expanded) | 5 toggles + 1 preset | 4 visible (comfort 4) + 1 further-nested "통계·고급 (필요할 때만)" holding KPM + focus-drift | -33% inside M6 |
| AdvancedSection Temperature | 1 raw slider 0.1–1.5 + raw label "Temperature" | 3 named presets (자연스럽게 / 균형 / 강하게) + slider demoted to "세밀 조정" + label "창의성 (Temperature)" | Slider still present; preset first |
| SceneSheet preset bar | 10 unexplained genre-emoji buttons | Same 10 buttons + 1-line reassurance "프리셋을 고르면 자동으로 채워집니다. 비워둬도 괜찮아요." | Cognitive load only |
| SceneSheet GenreModeSelector | 4 unexplained buttons (novel/webtoon/drama/game) | Same 4 buttons + 1-line "대부분 '소설' 모드면 충분합니다. 장르가 분명히 다를 때만 변경하세요." | Cognitive load only |

**Net first-screen decision count**: SessionSection 11 → 5 (–55%), AdvancedSection Temperature visible-first decisions 1 complex → 3 simple (presets), SceneSheet no reduction in fields but +2 short explainer lines.

---

## Remediation log (P0 → action)

### P0-1 — GenreModeSelector explainer (Pattern E + F)

**File**: `src/components/studio/SceneSheet.tsx:777–793`

**Before**: a small "장르 모드" uppercase label + 4 buttons. Writer sees 4 cryptic modes and panics.

**After**: same 4 buttons + 1 line of plain-language reassurance below.

4-lang copy:
- ko: "대부분 '소설' 모드면 충분합니다. 장르가 분명히 다를 때만 변경하세요."
- en: "Novel mode works for most projects. Switch only when the genre is clearly different."
- ja: "たいていは「小説」モードで十分です。ジャンルが明らかに異なるときだけ変更してください。"
- zh: "大多数情况下使用「小说」模式即可。仅当类型明显不同时才切换。"

**Escape hatch**: all 4 genre modes remain fully functional — zero logic change, only a `<p>` tag added.

---

### P0-2 & P0-3 — KPM + Focus-drift nested behind "통계·고급" (Pattern C + A)

**File**: `src/components/studio/settings/SessionSection.tsx` — new `M6ErgoNestedGroup` sub-component (PART 2.5)

**Before**: KPM ("인체공학 통계 표시") + Focus-drift ("탭 복귀 안내") toggles were surfaced at the same hierarchy level as Pomodoro settings. 99% of writers see them by accident.

**After**:
1. All M6 ergonomics content lives inside a nested button-styled accordion (default collapsed).
2. Inside that, KPM + focus-drift are nested *once more* inside "통계·고급 (필요할 때만)" (default collapsed).
3. Underlying `ErgonomicsSettings` defaults are **unchanged** (they were already false/false for KPM + focusDrift in `DEFAULT_ERGONOMICS_SETTINGS`).

**Escape hatch**:
- Settings → Session accordion → "장기 사용 편의 (선택)" → "통계·고급 (필요할 때만)" → KPM toggle / focus-drift toggle.
- Accordion state is persisted in localStorage via `ui-preferences.ts` keys `m8:session.ergonomics.open` and `m8:session.stats.open`.

**4-lang**: KPM label rename + sub-group headers are all 4-lang:
- "장기 사용 편의 (선택)" / "Long-Session Comfort (Optional)" / "長時間使用の快適性 (オプション)" / "长时间使用舒适性 (可选)"
- "통계·고급 (필요할 때만)" / "Stats & Advanced (only if needed)" / "統計・詳細 (必要なときだけ)" / "统计·高级 (仅在需要时)"
- KPM label changed from "인체공학 통계 표시 (KPM)" → "분당 타자수 표시 (KPM)" (plain-language: "인체공학 통계" was engineer-speak).

---

### P0-4 — SessionSection 11-control wall split (Pattern D)

**File**: same as above.

**Before**: single `<details>` exposing 11 controls in one grid.

**After**: outer `<details>` now holds only 5 pomodoro + 1 daily-goal slider + 1 nested group.

**Escape hatch**: every toggle still reachable inside the nested group.

---

### P0-5 — SceneSheet "고급 설정" review (Pattern E — label audit)

**File**: `src/components/studio/SceneSheet.tsx:1040`

**Finding**: the existing `<details>` with summary "고급 설정" (Advanced Settings) is already correctly progressive-disclosed. The issue was NOT that it was surfaced, but that its 5 sub-fields (Dopamine / Canon / Transitions / Pacing / PlotStructure) still used jargon. However, renaming these technical terms that are **intentional genre-craft vocabulary** (e.g., "고구마/사이다" is the defining web-novel Korean term, "도파민 장치" is the documented writing technique) would remove value, not add it.

**Decision**: **no rename of field names** — they are domain vocabulary, not engineer jargon. The reassurance is delivered upstream via the new preset-bar explainer (see P0-7).

**Escape hatch**: section remains collapsed by default (`<details>` without `open` attr).

---

### P0-6 — Temperature slider → 3 presets (Pattern B)

**File**: `src/components/studio/settings/AdvancedSection.tsx:153–228`

**Before**: single raw slider (0.1–1.5), labeled "Temperature" with a tooltip.

**After**:
1. Label renamed to **"창의성 (Temperature)"** / "Creativity (Temperature)" / "創造性 (Temperature)" / "创造性 (Temperature)" — plain-language foreground, engineer term in parens.
2. 3 radio-group preset buttons above slider: "자연스럽게" (0.6) / "균형" (0.9) / "강하게" (1.2).
3. Slider demoted to "세밀 조정" (Fine tune) row below presets, still fully functional (0.1–1.5 range preserved).
4. Selected preset determined by float-distance < 0.05 from preset value (handles rounding).

**4-lang**:
- Preset labels: ko=자연스럽게/균형/강하게, en=Natural/Balanced/Bold, ja=自然に/バランス/強めに, zh=自然/均衡/强烈
- "세밀 조정" / "Fine tune" / "微調整" / "精调"

**a11y**: `role="radiogroup"` + `role="radio"` + `aria-checked` per preset; slider has `aria-label`.

**Escape hatch**: slider is still visible and writable to any 0.1–1.5 value. Clicking a preset sets the numeric value; direct slider manipulation still persists to the same `noa_temperature` localStorage key.

---

### P0-7 — SceneSheet preset bar reassurance (Pattern F)

**File**: `src/components/studio/SceneSheet.tsx:737–745`

**Before**: 10 genre preset buttons appear immediately without any context. New writer doesn't know if clicking will destroy their work.

**After**: 1 reassurance line added directly above the button grid:
- ko: "프리셋을 고르면 자동으로 채워집니다. 비워둬도 괜찮아요."
- en: "Pick a preset and it fills in for you. Leaving it empty is also fine."
- ja: "プリセットを選ぶと自動で埋まります。空のままでも大丈夫。"
- zh: "选择预设会自动填充。留空也没关系。"

**Escape hatch**: all 10 presets still functional; the existing `showConfirm` dialog on "Overwrite with Preset" remains (no blind destructive action).

---

### P0-8 — `src/lib/ui-preferences.ts` helper (new)

**File**: `src/lib/ui-preferences.ts` (62 lines, 2 PARTs)

SSR-safe localStorage helper with:
- `readUIPref(key, fallback)` — returns boolean; silent no-op on quota/private-mode
- `writeUIPref(key, value)` — silent no-op on localStorage failure
- `UI_PREF_KEYS` — 4 typed constants: `sessionErgoOpen`, `sessionStatsOpen`, `advancedEngineOpen`, `sceneSheetAdvancedOpen`
- Key namespace: `m8:` prefix to avoid collision with existing `noa_*` keys

Used by: SessionSection (nested ergo + stats accordions) — more consumers can adopt for future accordions without reinventing the wheel.

---

## P1 items — applied inline

- **P1-a Genre selector novel-default hint**: delivered together with P0-1.
- **P1-b "BYOK" label**: unchanged (TermTooltip already attached; rename is P2).
- **P1-c "타이포그래피 프리셋" → "글자 크기 프리셋"**: applied in SessionSection (line inside M6ErgoNestedGroup). 4-lang:
  - ko: "글자 크기 프리셋"
  - en: "Font size preset"
  - ja: "文字サイズのプリセット"
  - zh: "字号预设"
  - Preset labels also plain-ified: 컴포트/컴팩트/라지 → 보통/작게/크게.

---

## G1–G8 Acceptance gate status

| Gate | Requirement | Status | Evidence |
|------|-------------|--------|----------|
| G1 | `tsc --noEmit` → 0 errors | ✓ | `npx tsc --noEmit` exit 0 |
| G2 | `npx jest` → all passing | ✓ | 3,226 passing / 290 suites / 0 failed |
| G3 | Fortress zero-diff vs `eac781b3` | ✓ | `git diff --stat eac781b3..HEAD -- src/lib/save-engine/ src/hooks/useAutoSave.ts src/hooks/useRecovery.ts src/hooks/useMultiTab.ts src/hooks/useBackupTiers.ts src/hooks/usePrimaryWriter.ts` → empty |
| G4 | Zero feature removal | ✓ | Every knob reachable via "escape hatch" row above |
| G5 | No `HLC`/`Hybrid Logical`/`hash chain`/`checksum`/`Degraded mode` in `src/components` or `src/app` | ✓ | grep returns 0 matches |
| G6 | 4-lang coverage for all new/renamed copy | ✓ | Every `L4()` call has ko+en+ja+zh keys |
| G7 | Accordion defaults: collapsed | ✓ | `m8-progressive-disclosure.test.tsx` asserts `aria-expanded="false"` for both ergo and stats accordions |
| G8 | Single commit on `feature/M8-ux-balance`, no push | pending commit at end of task |

---

## Escape hatch summary (power-user reachability)

| Setting | New location |
|---------|--------------|
| KPM (keystrokes per minute) | Settings → Session → "장기 사용 편의 (선택)" → "통계·고급 (필요할 때만)" → KPM toggle |
| Focus-drift nudge | Same path as KPM |
| Typography (font) preset | Settings → Session → "장기 사용 편의 (선택)" → Font size preset |
| Posture nudge / Eye dimmer / Wrist hint | Settings → Session → "장기 사용 편의 (선택)" (visible once opened) |
| Temperature (raw 0.1–1.5) | Settings → Advanced → Engine block expanded → "세밀 조정" slider |
| Genre mode (webtoon/drama/game) | SceneSheet → top of main content area (unchanged) |
| SceneSheet advanced (Dopamine/Canon/Transitions/Pacing/Plot) | SceneSheet → inline `<details>` "고급 설정" (unchanged, still collapsed by default) |

All power-user knobs still reachable. The "dev mode" escape path for engineers is unchanged (UserRoleContext.developerMode surfaces raw labels where applicable).

---

## Tests added

**File**: `src/components/studio/__tests__/m8-progressive-disclosure.test.tsx` (9 tests)

1. M6 ergonomics 그룹은 기본적으로 접혀 있다 (KPM 토글 미노출)
2. M6 ergo 그룹을 펼쳐도 통계·고급 서브 그룹은 여전히 접혀 있다 (2중 방어)
3. 통계·고급 서브 그룹을 펼치면 KPM·탭 복귀 토글이 노출된다 (기능 보존)
4. 펼침 상태는 ui-preferences localStorage로 영속된다
5. 3 프리셋 버튼이 라디오 그룹으로 존재한다 (Temperature)
6. 기본값 0.9 에서는 "균형" 프리셋이 선택(aria-checked=true)된다
7. `readUIPref` returns fallback when key absent
8. `writeUIPref` then `readUIPref` round-trips
9. `readUIPref` is SSR-safe and silent on localStorage failure

All 9 passing.

---

**M8 balance pass complete.** User's concern resolved: 11-control wall → 5 + optional nested; unexplained genre toggles gain 1-line reassurance; Temperature moves from raw slider to preset-first UX. Zero features removed, zero fortress lines touched, 9 new tests, 4-lang throughout.
