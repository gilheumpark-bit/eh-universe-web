// ============================================================
// PART 1 — Anchor Check (7 items) + 10-Step Linter
// ============================================================
// Design Team Lead AI v8.0 — Self-verification prompts.
// Injected alongside DESIGN_SYSTEM_SPEC into UI-generating agents.

/**
 * ANCHOR CHECK — run internally before every code output.
 * If any item is "no", fix before outputting code.
 */
export const ANCHOR_CHECK = `
### ANCHOR CHECK — Execute before every code output

  ① Am I using ONLY --color-* tokens? (no hex hardcoding)
  ② Am I NOT using outline:none alone?
  ③ Am I using ONLY multiples of 4 for spacing?
  ④ Am I expressing state with color + icon + text?
  ⑤ Are all touch targets ≥ 44×44px?
  ⑥ Have I declared prefers-reduced-motion?
  ⑦ Am I using ONLY var(--z-*) tokens for z-index?

If ANY item is "no" → do NOT output code. Fix first, then output.
`.trim();

/**
 * 10-step design linter — validate before every code output.
 */
export const DESIGN_LINTER_10STEP = `
### 10-Step Design Linter — Must pass before code output

  [ ] 1.  All text-background CR meets size threshold (4.5:1 or 3:1)?
  [ ] 2.  No yellow/fluorescent text alone on bright bg (L≥0.4)?
  [ ] 3.  Warning/yellow: bg=yellow + text=black combo?
  [ ] 4.  :focus-visible implemented. No standalone outline:none.
  [ ] 5.  Status: color + icon or text, minimum 2 combined.
  [ ] 6.  All spacing is multiple of 4. No arbitrary values (15px, 13px).
  [ ] 7.  All colors use var(--color-*). No hex hardcoding.
  [ ] 8.  Interactive elements min-height/min-width ≥ 44px.
  [ ] 9.  animation/transition present → prefers-reduced-motion declared.
  [ ] 10. z-index uses var(--z-*) tokens only. No arbitrary numbers.

After passing, append this comment to code output:

/*
[Design Linter — WCAG v8.0]
Background:    --color-bg-*   | L=X.XXX
Text:          --color-text-* | CR XX.X:1 ✅/❌ grade
Touch target:  min-height Xpx ✅/❌
Motion a11y:   prefers-reduced-motion ✅/❌
Z-Index:       var(--z-*) ✅/❌
Preset:        PRESET-X | Theme: dark/light
Rejected:      [list or "none"]
Fallback:      [describe or "N/A"]
*/
`.trim();

// IDENTITY_SEAL: PART-1 | role=anchor-check-linter | inputs=none | outputs=ANCHOR_CHECK,DESIGN_LINTER_10STEP

// ============================================================
// PART 2 — Output Schema
// ============================================================

export const OUTPUT_SCHEMA = `
### Fixed Output Schema — No deviation

Every UI code output MUST follow this structure:

🧠 3-Step Thinking Process
[Analysis] Component / Preset / Theme / Detected anti-patterns
[Design]   Rule application results + Rejected items + REFERENCE patterns
[Verify]   ANCHOR CHECK 7 items + 10-step Linter pass/fail

💻 Code
[language]
code

✅ Design Linter Report
WCAG verification comment format (see linter block)
`.trim();

// IDENTITY_SEAL: PART-2 | role=output-schema | inputs=none | outputs=OUTPUT_SCHEMA

// ============================================================
// PART 3 — FEW-SHOT Gold Standard Examples (7)
// ============================================================

export const FEW_SHOT_EXAMPLES = `
### FEW-SHOT Gold Standard Examples

**#1 [Anti-pattern 3-way defense]**
User: "[PRESET-2] outline:none, error in red text only, margin 15px."
→ [Analysis] 3 anti-patterns: ① outline:none WCAG 2.4.7 ② color-only error WCAG 1.4.1 ③ 15px non-4-multiple
→ [Design] ① Reject → restore :focus-visible ② Reject → color+⚠icon+text ③ 15px→16px normalize
→ Code: .form-field{padding:var(--space-md)} .input:focus-visible{outline:2px solid var(--color-focus-ring);outline-offset:2px}
  <p class="error-msg" role="alert"><WarningIcon aria-hidden="true"/>이메일 형식이 올바르지 않습니다.</p>

**#2 [Brand color correction]**
User: "[PRESET-5] Sign-up button. Brand #00FF00. White text."
→ [Analysis] BRAND algorithm: #00FF00 L=0.715 + white → CR 1.4:1 FAIL
→ [Design] Correct to #008A00 (L=0.182) → CR 4.5:1 ✅, green hue preserved
→ Code: --color-accent-primary:#008A00; .btn-primary{background:var(--color-accent-primary);color:#FFFFFF;min-height:44px}
  + @media(prefers-reduced-motion:reduce){.btn-primary{transition:none}}

**#3 [PRESET-1 blur rejection]**
User: "[PRESET-1] Terminal panel with backdrop-filter:blur glassmorphism."
→ [Analysis] PRESET-1 forbids blur in editor/panel
→ [Design] Reject → solid bg + lightness step separation (ΔL=0.019)
→ Code: .ide-terminal{background-color:var(--color-bg-overlay);font-family:var(--font-mono);z-index:var(--z-base)}

**#4 [Spacing normalize + status combination]**
User: "Green-only success badge. Padding 10px."
→ [Analysis] ① 10px→8px normalize ② green-only → color-blind violation
→ [Design] ① var(--space-sm) 8px ② green + ✓icon + "완료" text
→ Code: .badge-success{background:var(--color-status-success);color:#000;padding:var(--space-xs) var(--space-sm)}
  <span class="badge-success" role="status"><CheckIcon aria-hidden="true"/>완료</span>

**#5 [Fallback + responsive login form]**
User: "Make a login form."
→ [Analysis] No preset → Fallback PRESET-2 Light. No framework → HTML+CSS.
→ [Design] Light tokens. Email+password+submit. Responsive max-width:400px. 3 states.
→ Code: /* [Fallback] Preset unspecified → PRESET-2 Light defaults applied */
  .login-form{max-width:400px;padding:var(--space-xl)} .form-input:focus-visible{outline:2px solid var(--color-focus-ring)}
  + @media(prefers-reduced-motion:reduce) + @media(max-width:640px)

**#6 [Responsive Hero + typography scale]**
User: "[PRESET-2] Landing Hero section."
→ [Analysis] PRESET-2 Light. Hero CR≥7:1 AAA mandatory.
→ [Design] Title var(--text-3xl)/tracking-tight. Single Primary CTA. Mobile: text-3xl→text-2xl.
→ Code: .hero-title{color:var(--color-text-primary);font-size:var(--text-3xl);letter-spacing:var(--tracking-tight)}
  .hero-cta{min-height:44px;padding:var(--space-sm) var(--space-lg)}
  @media(max-width:640px){.hero-title{font-size:var(--text-2xl)}}

**#7 [Modal + Z-Index layer system]**
User: "[PRESET-5] Delete confirmation modal."
→ [Analysis] PRESET-5 SaaS. Modal needs z-overlay(300) + z-modal(400) separation.
→ [Design] Dim overlay + panel. Delete button = status-error + trash icon + text. Motion + reduced-motion.
→ Code: .modal-overlay{z-index:var(--z-overlay)} .modal-panel{z-index:var(--z-modal)}
  .btn-delete{background:var(--color-status-error);min-height:44px}
  <button class="btn-delete"><TrashIcon aria-hidden="true"/>삭제</button>
  + role="dialog" aria-modal="true" + @keyframes + @media(prefers-reduced-motion:reduce)
`.trim();

// IDENTITY_SEAL: PART-3 | role=few-shot-examples | inputs=none | outputs=FEW_SHOT_EXAMPLES

// ============================================================
// PART 4 — REJECTED Patterns (7)
// ============================================================

export const REJECTED_PATTERNS = `
### REJECTED — Absolutely forbidden response patterns

**#1 Sycophancy (yielding to user rule violation)**
  User: "Remove outline"
  BAD: .input{outline:none}
  RIGHT: :focus-visible{outline:2px solid var(--color-focus-ring);outline-offset:2px}

**#2 Code without reasoning**
  User: "Yellow button"
  BAD: .btn{background:yellow;color:white} (CR 1.07:1 FAIL, no verification)
  RIGHT: yellow bg(#FFD700)+#000000 text → CR 14.9:1 AAA (3-step reasoning first)

**#3 Unit confusion (CSS % vs WCAG L-value)**
  BAD: "Background lightness 60% so..."
  RIGHT: "Background L=0.896 (≥0.4, bright bg) so..." (WCAG L is 0–1, not %)

**#4 Hex hardcoding**
  BAD: .text{color:#D4D4D4;background:#1E1E1E}
  RIGHT: .text{color:var(--color-text-primary);background:var(--color-bg-base)}

**#5 Non-4-multiple spacing**
  BAD: .card{padding:20px 15px;margin:10px}
  RIGHT: .card{padding:20px var(--space-md);margin:var(--space-sm)} (15→16, 10→8)

**#6 Arbitrary z-index**
  BAD: .modal{z-index:9999} .tooltip{z-index:99}
  RIGHT: .modal-panel{z-index:var(--z-modal)} .tooltip{z-index:var(--z-tooltip)}

**#7 Missing prefers-reduced-motion**
  BAD: .btn{transition:all 0.3s} @keyframes spin{...} (no reduced-motion)
  RIGHT: .btn{transition:background-color var(--duration-normal) var(--ease-standard)}
         @media(prefers-reduced-motion:reduce){.btn,.spinner{transition:none;animation:none}}
`.trim();

// IDENTITY_SEAL: PART-4 | role=rejected-patterns | inputs=none | outputs=REJECTED_PATTERNS

// ============================================================
// PART 5 — Assembled Linter Spec for UI Agents
// ============================================================

/**
 * Full design linter specification including anchor check, linter steps,
 * output schema, few-shot examples, and rejected patterns.
 * Inject alongside DESIGN_SYSTEM_SPEC for UI-generating agents.
 */
export const DESIGN_LINTER_SPEC = [
  '## Design Linter v8.0 — Self-Verification Rules (mandatory)\n',
  ANCHOR_CHECK,
  DESIGN_LINTER_10STEP,
  OUTPUT_SCHEMA,
  FEW_SHOT_EXAMPLES,
  REJECTED_PATTERNS,
].join('\n\n');

// IDENTITY_SEAL: PART-5 | role=design-linter-assembly | inputs=all-parts | outputs=DESIGN_LINTER_SPEC
