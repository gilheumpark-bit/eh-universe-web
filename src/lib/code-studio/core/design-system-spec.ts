// ============================================================
// PART 1 — WCAG Lookup Table & CR Calculation
// ============================================================
// Design Team Lead AI v8.0 — WCAG luminance lookup and contrast ratio helpers.
// Appended to UI-generating agent prompts (A3 css-layout, A4 interaction-motion).

/**
 * WCAG relative-luminance lookup (L values, ±0.03 tolerance).
 * For colors not listed, use the nearest entry ±0.05.
 */
export const WCAG_LUMINANCE_LOOKUP = `
### WCAG L-value Lookup Table (±0.03)

**Greyscale**
  #000000→L=0.000  #111111→L=0.005  #1E1E1E→L=0.013
  #252526→L=0.019  #333333→L=0.032  #3C3C3C→L=0.050
  #555555→L=0.091  #616161→L=0.120  #777777→L=0.184
  #858585→L=0.235  #9E9E9E→L=0.349  #AAAAAA→L=0.402
  #BBBBBB→L=0.483  #C8C8C8→L=0.565  #D4D4D4→L=0.658
  #E0E0E0→L=0.753  #F3F3F3→L=0.896  #FFFFFF→L=1.000

**Key colors**
  #0000FF→L=0.072  #1D4ED8→L=0.103  #2563EB→L=0.129
  #3B82F6→L=0.200  #007ACC→L=0.183  #569CD6→L=0.306
  #38BDF8→L=0.435  #FF0000→L=0.213  #CD3131→L=0.107
  #EF4444→L=0.215  #F44747→L=0.224  #DC2626→L=0.136
  #00FF00→L=0.715  #008000→L=0.153  #22C55E→L=0.317
  #16A34A→L=0.197  #4EC94E→L=0.472  #098658→L=0.080
  #FFFF00→L=0.928  #FFD700→L=0.928  #F59E0B→L=0.361
  #D97706→L=0.227  #B45309→L=0.136  #DCDCAA→L=0.693
  #CE9178→L=0.347  #B5CEA8→L=0.568  #4EC9B0→L=0.467
  #8B5CF6→L=0.180  #7C3AED→L=0.117

**CR formula**: CR = (max(L1,L2)+0.05) / (min(L1,L2)+0.05)
**Pass thresholds**: text ≥4.5:1 | large text(18px+ or 14px bold+) ≥3.0:1 | UI/border/icon ≥3.0:1
`.trim();

// ============================================================
// PART 2 — Brand Color Auto-Correction
// ============================================================

export const BRAND_COLOR_CORRECTION = `
### Brand Color Auto-Correction (3-step)

**STEP A**: Find input color L-value from lookup table.
**STEP B**: Calculate CR with white text (L=1.0). If ≥4.5:1, use as-is.
**STEP C**: If CR insufficient → pick nearest corrected color below.
           If not in table: keep original hue, lower lightness to L≤0.18.

**White-text correction table (CR ≥4.5:1 guaranteed)**
  #00FF00(L=0.715) → #008A00(L=0.182) CR 4.5:1
  #FFFF00(L=0.928) → #787800(L=0.174) CR 4.7:1
  #FF6600(L=0.305) → #B34700(L=0.106) CR 4.7:1
  #FF0080(L=0.200) → #AA0055(L=0.081) CR 4.8:1
  #00BFFF(L=0.520) → #0070A0(L=0.148) CR 4.6:1
  #FF4444(L=0.215) → #BB1111(L=0.052) CR 5.1:1
  #44FF44(L=0.527) → #1A7A1A(L=0.161) CR 4.6:1
  #AAAAFF(L=0.440) → #4444CC(L=0.072) CR 5.2:1

**Bright brand colors (L≥0.4) → use black text instead**
  #FFD700+#000000 → CR 14.9:1 AAA
  #FFA500+#000000 → CR 10.6:1 AAA
  #90EE90+#000000 → CR  9.2:1 AAA
  #ADD8E6+#000000 → CR  9.8:1 AAA
`.trim();

// IDENTITY_SEAL: PART-2 | role=brand-color-correction | inputs=none | outputs=BRAND_COLOR_CORRECTION

// ============================================================
// PART 3 — Design Tokens (Colors, Z-Index, Motion, Spacing)
// ============================================================

export const DESIGN_TOKENS = `
### Design Tokens — Dark Theme

**Backgrounds**
  --color-bg-base: #1E1E1E (L=0.013)
  --color-bg-surface: #252526 (L=0.019)
  --color-bg-overlay: #333333 (L=0.032)
  --color-bg-active: #3C3C3C (L=0.050)

**Text**
  --color-text-primary: #D4D4D4 (L=0.658 | CR 11.2:1 AAA)
  --color-text-secondary: #858585 (L=0.235 | CR 4.5:1 AA)
  --color-text-disabled: #555555 (WCAG exception: disabled)

**Syntax highlighting**
  --color-syntax-keyword: #569CD6 (CR 5.7:1 AA)
  --color-syntax-string: #CE9178 (CR 6.3:1 AA)
  --color-syntax-function: #DCDCAA (CR 11.8:1 AAA)
  --color-syntax-number: #B5CEA8 (CR 9.8:1 AAA)
  --color-syntax-comment: #6A9955 (CR 3.0:1 — 14px Bold required)

**Status**
  --color-status-error: #F44747 (CR 4.6:1 AA)
  --color-status-success: #4EC94E (CR 8.3:1 AAA)
  --color-status-warn-bg: #FFD700 (background only — text MUST be #000000)
  --color-status-warn-text: #000000 (CR 14.9:1 AAA)

**Focus / Border**
  --color-focus-ring: #007ACC (CR 3.7:1 non-text OK)
  --color-border: #474747

**Spacing (4px grid)**
  --space-xs:4px  --space-sm:8px  --space-md:16px
  --space-lg:24px --space-xl:32px --space-2xl:48px --space-3xl:64px

**Z-Index layers**
  --z-base:0  --z-dropdown:100  --z-sticky:200
  --z-overlay:300  --z-modal:400  --z-toast:500  --z-tooltip:600
  Rule: NEVER use arbitrary z-index numbers. Always use --z-* tokens.

**Motion tokens**
  --duration-fast:100ms (icon state)  --duration-normal:150ms (hover/active)
  --duration-slow:250ms (panel slide)  --duration-page:350ms (page transition)
  --ease-standard: cubic-bezier(0.4,0,0.2,1)
  --ease-enter: cubic-bezier(0,0,0.2,1)
  --ease-exit: cubic-bezier(0.4,0,1,1)

### Design Tokens — Light Theme

**Backgrounds**
  --color-bg-base: #FFFFFF (L=1.000)
  --color-bg-surface: #F3F3F3 (L=0.896)
  --color-bg-overlay: #E8E8E8 (L=0.807)
  --color-bg-active: #DCDCDC (L=0.693)

**Text**
  --color-text-primary: #1F1F1F (L=0.013 | CR 16.5:1 AAA)
  --color-text-secondary: #616161 (L=0.120 | CR 6.2:1 AA)
  --color-text-disabled: #AAAAAA (WCAG exception: disabled)

**Syntax**
  --color-syntax-keyword: #0000FF (CR 8.6:1 AAA)
  --color-syntax-string: #A31515 (CR 7.9:1 AAA)
  --color-syntax-function: #795E26 (CR 6.1:1 AA)
  --color-syntax-number: #098658 (CR 4.6:1 AA)
  --color-syntax-comment: #008000 (CR 5.1:1 AA)

**Status**: same as dark theme. **Focus/Border**: --color-focus-ring:#007ACC (CR 4.5:1 AA), --color-border:#C8C8C8
**Spacing/Z-Index/Motion**: inherited from dark theme (identical values).
`.trim();

// IDENTITY_SEAL: PART-3 | role=design-tokens | inputs=none | outputs=DESIGN_TOKENS

// ============================================================
// PART 4 — Typography Scale
// ============================================================

export const TYPOGRAPHY_SCALE = `
### Typography Complete Scale

**Font families**
  --font-sans: 'Inter', 'Pretendard', system-ui, sans-serif
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace

**Type scale (4px grid)**
  --text-xs:12px (badges, labels)
  --text-sm:13px (code editor body)
  --text-base:14px (UI default)
  --text-md:16px (body, input fields)
  --text-lg:20px (card titles, subtitles)
  --text-xl:24px (section headings)
  --text-2xl:32px (page titles)
  --text-3xl:48px (hero headings)

**Font weight**: normal=400, medium=500, semibold=600, bold=700
**Line height**: tight=1.2(hero), snug=1.3(subtitle), normal=1.5(body), relaxed=1.6(code)
**Letter spacing**: tight=-0.025em(hero), normal=0em, wide=0.05em(ALL CAPS labels)

**WCAG font-size → CR mapping**
  12-13px: CR ≥4.5:1 required
  14px: CR ≥4.5:1 (bold: 3.0:1 OK)
  20px+: CR ≥3.0:1 (large text)
`.trim();

// IDENTITY_SEAL: PART-4 | role=typography-scale | inputs=none | outputs=TYPOGRAPHY_SCALE

// ============================================================
// PART 5 — Responsive Rules
// ============================================================

export const RESPONSIVE_RULES = `
### Responsive / Mobile Rules

**Breakpoints**
  --bp-sm:640px (phone landscape)  --bp-md:768px (tablet)
  --bp-lg:1024px (small desktop)  --bp-xl:1280px (desktop)  --bp-2xl:1536px (wide)

**Touch targets (mandatory)**
  All interactive elements: min-width:44px, min-height:44px (WCAG 2.5.5 AAA)
  Adjacent touch targets: gap ≥ 8px (--space-sm)
  E-commerce CTA buttons: min-height:48px

**Responsive typography**
  Hero (48px) → mobile: 32px
  Section heading (24px) → mobile: 20px
  Body/Code: unchanged (16px / 13px)

**Responsive spacing**
  Component padding: mobile 16px → tablet+ 24px
  Section spacing: mobile 48px → desktop 64px

**Grid breakdowns**
  Features 3-col: desktop 3→tablet 2→mobile 1
  KPI cards 4-col: desktop 4→tablet 2→mobile 2
  Product grid 4-col: desktop 4→tablet 2→mobile 2
`.trim();

// IDENTITY_SEAL: PART-5 | role=responsive-rules | inputs=none | outputs=RESPONSIVE_RULES

// ============================================================
// PART 6 — Motion Accessibility
// ============================================================

export const MOTION_RULES = `
### Motion Accessibility Rules

**Transition writing rules**
  FORBIDDEN: transition: all 0.3s
  REQUIRED: specify property + token duration + token easing
  Example: transition: background-color var(--duration-normal) var(--ease-standard),
                       color var(--duration-normal) var(--ease-standard);

**Duration guide**
  fast(100ms): icon color, focus ring appear
  normal(150ms): button hover/active, input border
  slow(250ms): dropdown open, sidebar collapse
  page(350ms): modal entrance, page transition

**prefers-reduced-motion — MANDATORY when animation/transition exists**
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`.trim();

// IDENTITY_SEAL: PART-6 | role=motion-rules | inputs=none | outputs=MOTION_RULES

// ============================================================
// PART 7 — Component 5-State Matrix
// ============================================================

export const COMPONENT_STATE_MATRIX = `
### Component 5-State Visual Matrix

| State    | Background              | Text/Icon              | Border                    | Cursor      |
|----------|-------------------------|------------------------|---------------------------|-------------|
| Default  | --color-bg-surface      | --color-text-primary   | --color-border            | default     |
| Hover    | ΔL ±0.03 (lighter)     | unchanged              | --color-focus-ring        | pointer     |
| Focus    | unchanged               | unchanged              | 2px solid --color-focus-ring | -        |
| Active   | ΔL ±0.06 (darker)      | unchanged              | --color-focus-ring        | pointer     |
| Disabled | --color-text-disabled   | --color-text-disabled  | --color-border opacity 0.5 | not-allowed |

**CSS pattern**
  .btn { background: var(--color-bg-surface); color: var(--color-text-primary);
         border: 1px solid var(--color-border);
         transition: background-color var(--duration-normal) var(--ease-standard),
                     border-color var(--duration-normal) var(--ease-standard); }
  .btn:hover { background: var(--color-bg-active); }
  .btn:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
  .btn:active { background: var(--color-bg-overlay); }
  .btn:disabled { color: var(--color-text-disabled); cursor: not-allowed; opacity: 0.6; }

**Disabled accessibility exception**: WCAG CR not required for disabled elements (WCAG 1.4.3 exception).
  But: WHY it's disabled must be explained via text or aria-describedby.
`.trim();

// IDENTITY_SEAL: PART-7 | role=component-state-matrix | inputs=none | outputs=COMPONENT_STATE_MATRIX

// ============================================================
// PART 8 — Anti-Patterns (全 preset common)
// ============================================================

export const ANTIPATTERNS = `
### Anti-Patterns — Forbidden in ALL presets

**Color**
  FORBIDDEN: bright bg (L≥0.4) + yellow/fluorescent/light text alone
  FORCED: yellow bg (#FFD700) → text must be #000000

**Accessibility**
  FORBIDDEN: outline:none or outline:0 alone
  FORCED: :focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
  FORBIDDEN: color-only status indication (error/success/warning)
  FORCED: color + icon(⚠✓✗) + text label (minimum 2 of 3)

**Spacing**
  FORBIDDEN: non-multiple-of-4 spacing (15px, 13px, 7px, 23px, 10px)
  NORMALIZE: 7→8, 10→8or12, 13→12, 15→16, 23→24

**Hardcoding**
  FORBIDDEN: color: #1E1E1E (hex direct)  → FORCED: var(--color-text-primary)
  FORBIDDEN: z-index: 9999 (arbitrary)     → FORCED: var(--z-modal)

**Transition**
  FORBIDDEN: transition: all 0.3s (no target)
  FORCED: transition: background-color var(--duration-normal) var(--ease-standard)

**Mobile**
  FORBIDDEN: interactive element min-height < 44px
  FORCED: min-height: 44px; min-width: 44px;
  FORBIDDEN: animation/transition without prefers-reduced-motion
  FORCED: @media (prefers-reduced-motion: reduce) block
`.trim();

// IDENTITY_SEAL: PART-8 | role=antipatterns | inputs=none | outputs=ANTIPATTERNS

// ============================================================
// PART 9 — Assembled Spec for UI Agents
// ============================================================

/**
 * Full design system specification for UI-generating agents.
 * Inject this into A3 (css-layout) and A4 (interaction-motion) agent prompts.
 * Do NOT inject into all agents — only UI pipeline.
 */
export const DESIGN_SYSTEM_SPEC = [
  '## Design System Spec v8.0 — UI Generation Rules (mandatory)\n',
  WCAG_LUMINANCE_LOOKUP,
  BRAND_COLOR_CORRECTION,
  DESIGN_TOKENS,
  TYPOGRAPHY_SCALE,
  RESPONSIVE_RULES,
  MOTION_RULES,
  COMPONENT_STATE_MATRIX,
  ANTIPATTERNS,
].join('\n\n');

// IDENTITY_SEAL: PART-9 | role=design-system-assembly | inputs=all-parts | outputs=DESIGN_SYSTEM_SPEC
