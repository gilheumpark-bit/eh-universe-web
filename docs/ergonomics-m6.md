# M6 — Long-Session Ergonomics

Loreguard is built for 2–10 hour writing sessions. M6 adds cross-cutting
comfort features for the human body — wrist, eye, posture, focus.

All features are **opt-out** or **opt-in** toggles in
**Settings → Session → Ergonomics (장기 사용 편의)**.

## Features

### 1. Typography Preset

- CSS variables: `--editor-font-size`, `--editor-line-height`, `--editor-letter-spacing`
- Applied to `document.documentElement`, consumed by `NovelEditor` ProseMirror styles.
- Persistence: `localStorage['noa_typography_preset_v1']`

| Preset  | Font size | Line height | Letter spacing | Use case              |
| ------- | --------- | ----------- | -------------- | --------------------- |
| comfort | 17px      | 1.75        | 0.01em         | Long sessions (default) |
| compact | 14px      | 1.5         | 0              | Overview / skim        |
| large   | 20px      | 1.8         | 0.015em        | Accessibility          |

### 2. Posture Nudge

- Every 30 minutes of continuous keystrokes → toast via `noa:alert`.
- Idle gap of 5+ minutes resets the 30-minute timer.
- Default: **on**. Disable in Settings.
- Implementation: `src/hooks/useWritingPosture.ts`.

### 3. Keystroke Heat Map

- Rolling 60-minute window of keystrokes, bucketed per minute.
- Ephemeral — never persisted, cleared on page reload.
- Public: `recordKeystroke()`, `getSnapshot()`, `resetHeatmap()`.
- Only counts keystrokes while editor is focused
  (`[data-role="editor"]` or `contenteditable`).
- Status-bar pill is **opt-in** (default: off) in Settings.

### 4. Eye-Strain Auto-Dimmer

- Level 1 at 90 min (warm filter), Level 2 at 180 min (extra dim).
- Applied via `html[data-eye-strain-level="1"/"2"]` in `globals.css`.
- Stacks correctly with existing `blueLightFilter` toggle.
- Default: **on**. Manual override or disable in Settings.

### 5. Keyboard Cheat Sheet

- `?` key (outside inputs) opens overlay listing 20 shortcuts grouped by
  Navigation / Editing / AI / Writing.
- Source of truth for bindings: `src/hooks/useStudioKeyboard.ts`.
- Accessibility: `role="dialog"` + `aria-modal="true"`,
  focus trap via `useFocusTrap`, ESC to close.
- 4-language labels (ko/en/ja/zh).

### 6. Wrist-Rest Hint

- When AI generation runs >10s (common for DGX cold start):
  non-blocking toast with a pure CSS wrist-circle animation.
- Auto-hides on completion or after 20 seconds.
- Respects `prefers-reduced-motion`.
- Default: **on**.

### 7. Focus-Drift Nudge

- Tab hidden → visible gap of 15+ minutes → toast prompts return.
- `onResume` callback allows host to scroll to last cursor.
- Default: **off** (opt-in — can be intrusive).

## Toggle Matrix

| Feature                | Default | Settings key                   |
| ---------------------- | ------- | ------------------------------ |
| Typography preset      | comfort | `typographyPreset`             |
| Posture nudge          | on      | `postureNudgeEnabled`          |
| Eye-strain dimmer      | on      | `eyeStrainDimmerEnabled`       |
| Keystroke heatmap UI   | off     | `keystrokeHeatmapVisible`      |
| Wrist-rest hint        | on      | `wristRestHintEnabled`         |
| Focus-drift nudge      | off     | `focusDriftEnabled`            |

All stored in a single key: `localStorage['noa_ergonomics_settings_v1']`.

## Integration Points

- `NovelEditor` reads `--editor-line-height` / `--editor-letter-spacing`.
- `SessionSection.tsx` exposes toggles (additive — no breaking changes).
- Hooks are used by Studio shells and are idempotent (safe to mount multiple
  instances; only one source of truth exists per `noa:alert` listener since
  the hooks dispatch rather than own any UI).
