# Theming Guide

EH Code Studio ships two themes — **dark** (default) and **light**.
The OS preference can also be honored via **auto** mode.

## Architecture

```
apps/desktop/renderer/styles/theme.css     ← all tokens
apps/desktop/renderer/lib/theme-controller.ts ← React state + applier
apps/desktop/renderer/components/code-studio/ThemeToggle.tsx ← UI
```

The Monaco editor themes (`eh-dark`, `eh-light`) are kept in lockstep
in `lib/code-studio/editor/monaco-setup.ts` — change a color in one
place, change it in both.

## Token surface

| Category | Tokens |
|---|---|
| Surfaces | `--bg-{primary,secondary,tertiary,elevated,overlay,input}` |
| Text | `--text-{primary,secondary,muted,inverse}` |
| Borders | `--border`, `--border-strong`, `--border-subtle` |
| Brand | `--accent-{blue,blue-hover,blue-bg,purple,purple-bg,cyan}` |
| Selection | `--selection-bg`, `--selection-fg` |
| Focus | `--focus-ring`, `--shadow-focus` |
| Status | `--status-{success,warning,error,info}` + `-bg` variants |
| Severity | `--severity-{p0,p1,p2,p3,p4}` |
| Syntax | `--syntax-{keyword,string,number,comment,function,variable,type,tag,attr,punct}` |
| Spacing | `--sp-{xs,sm,md,lg,xl,2xl,3xl}` (4px scale) |
| Radii | `--radius-{sm,md,lg,xl,full}` |
| Motion | `--motion-{fast,base,slow}` |
| Z-index | `--z-{base,dropdown,sticky,overlay,modal,popover,tooltip,toast}` |

## Rules

1. **Never use raw Tailwind colors** (`bg-gray-900`, `text-blue-400`).
   Use the semantic tokens (`var(--bg-primary)`, `var(--text-secondary)`).

2. **Never use pure white in light mode bg-primary.** Use `#fbfcfd`.
   Pure `#ffffff` is reserved for elevated surfaces (cards, modals).

3. **Never use pure black for text.** Light mode uses `#1f2328`,
   dark mode uses `#e6edf3`.

4. **All text must clear AA.** Run `node tools/scripts/contrast-check.mjs`
   to verify (32/32 pairs as of D-4).

5. **All focus states must use `--focus-ring`.** Don't write
   `outline: none` without an alternative indicator.

6. **Status colors must combine 2+ signals.** Color alone is not enough
   for accessibility — always add an icon or text label.

7. **Touch targets must be ≥ 44px.** `--touch-min` token.

8. **Spacing must be a multiple of 4px.** Use the `--sp-*` scale.

## Adding a new theme

If you ever need a third theme (e.g. high-contrast):

1. Add a new `:root[data-theme='hc'] { ... }` block in `theme.css`
   with all surface, text, border, and accent tokens.
2. Add the corresponding Monaco theme in `monaco-setup.ts`
   (`monaco.editor.defineTheme('eh-hc', { ... })`).
3. Add `'hc'` to `ThemeMode` in `theme-controller.ts`.
4. Add the option to `ThemeToggle.tsx` dropdown.
5. Run contrast lint and add hc to the runner loop in
   `tools/scripts/contrast-check.mjs`.

## Color philosophy

**Dark** (saturated cool):
- Used as a "cockpit" — high contrast, deep blues, subtle warm
  accents to break monotony.
- Inspired by GitHub Dark Default + JetBrains Darcula.

**Light** (warm neutral):
- Used as a "studio" — readable, calm, GitHub-inspired.
- Background is slightly warm (`#fbfcfd`) to avoid eye strain.
- Borders are visible but not noisy (`#d0d7de`).
- Accents shift to higher-contrast variants (blue `#0969da`).

The two themes are NOT inversions of each other — light theme uses
softer shadows and warmer borders, dark theme uses heavier shadows
with subtle white inner strokes for natural depth.
