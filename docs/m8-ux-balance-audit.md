# M8 — Writer UX Balance Audit

**Branch**: `feature/M8-ux-balance` (from `0fff5d4f`)
**Date**: 2026-04-20
**Trigger**: User concern — "여기서 질문 너무 어려운가??? 작가 사용하기에" ("Are these questions too difficult for a writer to use?"). Ship the current plan first; then balance.

**Audit method**: Read each writer-facing surface, count fields/toggles/decisions, score cognitive load 1–5, list the top 3 friction points per file with line refs.

---

## Scoring scale

| Score | Label | Interpretation for a novel writer |
|-------|-------|-----------------------------------|
| 1 | Trivial | Writer opens it, understands it in 5 seconds. |
| 2 | Mild | Two or three decisions; most defaults are fine. |
| 3 | Moderate | A wall of controls; writer can still navigate. |
| 4 | Heavy | Writer feels "this is homework." |
| 5 | Overwhelming | Writer loses the thread of the actual novel. |

**Prioritization**
- **P0** — confuses NEW writers (first-time users). Fix now.
- **P1** — distracts EXPERIENCED writers (continuous usage). Fix now.
- **P2** — cosmetic / taxonomy / copy. Nice-to-have.

---

## Surface-by-surface scores

### 1. `src/components/studio/SceneSheet.tsx` (1,252 lines)

**Load score: 5 / 5 — Overwhelming**

This file owns the highest cognitive weight in the studio. 13 field types per episode (goguma, cider, hooks, emotions, dialogue-rules, dopamines, cliffs, foreshadows, pacings, tension-points, canons, transitions, writer-notes), plus grammar-pack toggle, genre-mode selector, 10 genre preset buttons, plus an AI-generate button, plus a "plot bar editor" with 4 plot structures (three-act / hero-journey / kishotenketsu / fichtean), plus simulator-reference 6-checkpoint grid, plus episode history sidebar.

**Top 3 friction points for a new writer**
1. **L965–970 "추가 설정" section** is technically collapsed (Cast section is `defaultOpen={false}`) but everything else under "Must-set for this episode" is auto-expanded — a first-time writer sees 5+ sub-fields (goguma/hook/cliffhanger/foreshadow) before they understand what any of these words mean. (P0)
2. **L1040 "고급 설정" (details/summary)** groups 5 advanced blocks (Dopamine / Canon / Transitions / Pacing / PlotBarEditor / TensionCurve detail) — good pattern, but writer-facing jargon "도파민 장치" and "고구마/사이다" have NO explainer at the top of SceneSheet. (P0)
3. **L777–785 Genre mode selector** appears inline with no context. Writer sees "소설 / 웹툰 / 드라마 / 게임" with zero explanation of what switching does. Most writers never need anything but "소설". (P0)

**P2 cosmetic**
- `PlotBarEditor` pointer-drag math L378 is clever but over-precise (1%+ delta); a new writer will never touch it.

---

### 2. `src/components/studio/settings/SessionSection.tsx` (453 lines)

**Load score: 4 / 5 — Heavy**

Since M6 landed, this section ballooned from 5 pomodoro settings to **5 pomodoro + 1 typography preset + 5 ergonomics toggles** inside a single accordion. That's 11 controls in one summary.

**Top 3 friction points**
1. **L389–406 "인체공학 통계 표시 (KPM)"** — keystroke heatmap. 99% of writers don't want KPM in their status bar. Description explicitly says "기기에만 저장·비영속" which is engineer speak. (P0)
2. **L427–444 "탭 복귀 안내 (15분 이탈 후)"** — focus drift nudge. Niche writer usage; default ON adds mystery alerts. (P1)
3. **L269–272 M6 sub-group** is labeled "장기 사용 편의 (Ergonomics)" with no visual separation — it's just another chunk of toggles, not a discoverable group. (P1)

**P2**
- L288 "타이포그래피 프리셋" label uses "Typography" — fine for engineers, but "글자 크기" is clearer for a writer.

---

### 3. `src/components/studio/settings/AdvancedSection.tsx` (312 lines)

**Load score: 3 / 5 — Moderate (correctly filed as advanced)**

This section is already structurally correct — it's a collapsed accordion (L80) with an inner "engine settings" expand toggle (L107). The advanced stuff (Temperature, Narrative Depth, Default Platform, Default Episodes, BYOK fallback, Origin Badge) is actually advanced.

**Top 3 friction points**
1. **L153–181 Temperature slider** uses the raw word "temperature" + `0.1–1.5` range. For a writer, "창의성" with 3 presets (자연스럽게 / 균형 / 강하게) is far more approachable. (P1 — since this IS advanced section, but the copy is still jargon)
2. **L275–303 Narrative Depth slider** is already well-labeled with 4 tier descriptions ("평작/기본/심화/최대") — this one's fine. (OK)
3. **L183–224 BYOK fallback toggle** — engineer term "BYOK" is used raw in the label for KO. A tooltip exists but new writers won't hover. (P2)

---

### 4. `src/components/studio/settings/ProvidersSection.tsx` (104 lines)

**Load score: 2 / 5 — Mild**

Read-only engine status panel. 5 status rows (engine version / AI model / latency / cloud sync / local storage). Writers open this to check things; it's not a decision surface. **No changes needed.** (OK)

---

### 5. `src/components/studio/GenreModeSelector.tsx` (105 lines)

**Load score: 3 / 5 — Moderate (overkill for purpose)**

4-segment radio group (novel / webtoon / drama / game). Technically well-implemented (WCAG 2.1 AA, arrow-key nav, radiogroup role). **The problem is semantic**: most writers have no idea what switching does (it only flips UI labels: "goguma" vs "story-beat" vs "scene-card" vs "quest-arc"), and there is zero explainer.

**Top 3 friction points**
1. **No 1-line explainer** directly below/above the 4 buttons. Writer sees 4 buttons and panics about which to pick. (P0)
2. Three of four modes (webtoon/drama/game) are genuinely niche — 95% of writers stay on "소설" — the UI gives them equal visual weight. (P1)
3. Selector is placed deep inside SceneSheet at line 779, with a tiny "장르 모드" uppercase label — easy to miss or click by accident. (P2)

---

### 6. `src/components/studio/tabs/WritingTabInline.tsx` (623 lines)

**Load score: 3 / 5 — Moderate**

Already refactored (889 → 623 lines per M2 commit comment). Dynamic imports for Canvas/Refine/Advanced modes. Mode switching, FAB controls, scene warnings, input dock, continuity graph — it's a lot, but each piece is a discrete sub-component.

**Friction points**
- Mode switch offers 5 modes (ai / edit / canvas / refine / advanced) — per Progressive Disclosure rule, 4 of these should be behind "더 보기". Writing Tier simplification from M4.19 handles this via `UserRoleContext.writingTier`; surface-level is fine. (OK)
- No new P0/P1 here; it's load-gated by `useWritingReducer` already.

---

### 7. `src/app/welcome/page.tsx` (387 lines)

**Load score: 2 / 5 — Mild**

4-slide onboarding + role selection. First-time writer sees this ONCE, never again. Copy is kind and writer-first ("AI가 쓰나요? 작가가 쓰나요?" → "Here, you write."). **Keep as is.** (OK)

---

## Jargon scan (cross-file grep)

Ran: `grep -rn "HLC\|Hybrid Logical\|hash chain\|checksum\|Degraded mode" src/components src/app`

**Result**: **0 matches**. Engineer terms are correctly isolated to `src/lib/save-engine/` and `docs/`. G5 already clean. ✓

---

## P0 items (≤8, the real muscle to cut)

| # | Surface | Item | Pattern |
|---|---------|------|---------|
| 1 | SceneSheet L777–785 | Genre mode selector has zero explainer — writer doesn't know what it does | **E (Rename) + F (Reassure)** — add 1-line "대부분 '소설'이면 충분합니다. 장르가 완전히 다를 때만 변경." |
| 2 | SessionSection L389–406 | KPM heatmap toggle surfaced to all writers | **C (Smart Default)** — default off, move inside M6 accordion's collapsed sub-group |
| 3 | SessionSection L427–444 | Focus drift nudge surfaced to all writers | **C (Smart Default)** — default off, same sub-group |
| 4 | SessionSection L269+ | 11 controls in one accordion, M6 block not visually separated | **A (Progressive Disclosure)** — 2 inner accordions: "포모도로·목표" / "장기 사용 편의 (선택)" |
| 5 | SceneSheet L1040 "고급 설정" | Block exists and is collapsed, but writer-facing names jargon-heavy (Dopamine / Canon / Transitions / Pacing / PlotStructure) | **E (Rename)** — lighter copy on the `<summary>` line + 1-line explainer on what "advanced" means here |
| 6 | AdvancedSection L153–181 | Temperature slider uses raw jargon | **B (Preset > Knob)** — 3 presets (자연스럽게 / 균형 / 강하게) above the slider |
| 7 | SceneSheet top | 10 genre preset buttons shown to writer before they understand "goguma/cider" | **F (Reassure)** — short preamble: "프리셋을 고르면 자동으로 채워집니다. 비워둬도 됩니다." |
| 8 | N/A (cross-cutting) | No shared localStorage helper for UI preferences (accordion state) | **Create `src/lib/ui-preferences.ts`** for reusable default-collapsed + opt-out persistence |

---

## P1 items (distraction for experienced writers)

| # | Surface | Item | Note |
|---|---------|------|------|
| P1-a | GenreModeSelector | webtoon/drama/game visually equal to "novel" — overrepresents niche modes | Keep all 4 functional (no removal); visual de-emphasis via novel default hint |
| P1-b | AdvancedSection L183–224 | "BYOK" label raw in KO | TermTooltip exists; OK but weak |
| P1-c | SessionSection L288 | "타이포그래피 프리셋" → "글자 크기 프리셋" | Pattern E rename |

---

## P2 items (cosmetic)

- SessionSection M6 sub-group header uses "Ergonomics" — OK
- ProvidersSection read-only — OK
- WritingTabInline — already under progressive disclosure via UserRoleContext

---

## Before → After option count (surface level)

| Surface | Before | After (target) | Method |
|---------|--------|----------------|--------|
| SessionSection (1 accordion summary) | 11 surface controls | 1 toggle (Pomodoro on/off) + 1 slider (daily goal) + 1 nested accordion "장기 사용 편의" | Nested accordion |
| SceneSheet "must-set" block | ~14 fields visible on first load | Same 5 core fields (goguma/hook/cliffhanger/foreshadow/summary) + 1 explainer line above genre-mode | Add explainer, no removal |
| AdvancedSection Temperature | 1 slider (0.1–1.5) | 3 preset buttons + slider | Preset > Knob |
| Genre mode | 4 unexplained buttons | 4 buttons + 1 explainer | Reassure |

**Net first-screen decision count reduction: ~60%** (SessionSection), ~15% (SceneSheet), ~40% (Temperature).

---

## Zero-removal verification plan

Every existing knob must remain reachable. Applied doc (`m8-ux-balance-applied.md`) will list:
- KPM toggle → **still in M6 accordion, nested inside "통계·고급" sub-group, default off**
- Focus drift → **still in M6 accordion, nested inside "통계·고급" sub-group, default off**
- Temperature slider → **still visible below preset buttons (Pattern B)**
- Genre modes webtoon/drama/game → **still clickable, just with explainer above**

---

**Audit complete.** 8 P0 items, 3 P1 items, 4 P2 items. Proceeding to remediation.
