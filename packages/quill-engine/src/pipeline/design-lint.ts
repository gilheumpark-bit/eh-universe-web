// ============================================================
// PART 1 — Runtime Design Linter
// ============================================================
// Analyzes generated UI code against project design tokens.
// Called post-generation in the verification pipeline.

import { logger } from '@/lib/logger';

// ============================================================
// Types
// ============================================================

export type DesignLintSeverity = 'error' | 'warning' | 'info';

export interface DesignLintIssue {
  rule: string;
  severity: DesignLintSeverity;
  message: string;
  line?: number;
  fix?: string;
}

export interface DesignLintResult {
  passed: boolean;
  score: number;
  issues: DesignLintIssue[];
  summary: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DesignLintResult

// ============================================================
// PART 2 — Lint Rules (10 checks aligned with design-linter.ts)
// ============================================================

/** Project semantic token classes — generated code should use these */
const SEMANTIC_BG = /\bbg-bg-(primary|secondary|tertiary)\b/;
const SEMANTIC_TEXT = /\btext-text-(primary|secondary|tertiary)\b/;
const SEMANTIC_ACCENT = /\btext-accent-(purple|red|green|amber|blue)\b|\bbg-accent-(purple|red|green|amber|blue)/;

/** Raw Tailwind colors that should NOT appear in production code */
const RAW_TAILWIND_COLORS = /\b(?:bg|text|border|ring|from|to|via)-(?:red|blue|green|yellow|purple|pink|indigo|teal|cyan|orange|lime|emerald|violet|fuchsia|rose|sky|slate|gray|zinc|neutral|stone)-\d{2,3}\b/;

/** Arbitrary z-index (not using var(--z-*)) */
const ARBITRARY_ZINDEX = /z-(?:index\s*:\s*|(?:\[)?)\d{2,}/;
const TOKEN_ZINDEX = /var\(--z-/;

/** Non-4-multiple spacing in arbitrary values */
const ARBITRARY_SPACING = /\[(\d+)px\]/g;

/** Transition: all (forbidden) */
const TRANSITION_ALL = /transition(?:\s*:|-(?:property)?\s*:?\s*)\s*all\b/i;

/** outline:none / outline:0 standalone */
const OUTLINE_NONE = /outline\s*:\s*(?:none|0)\s*[;}]/;

/** Touch target check — min-h/min-w less than 44px on interactive elements */
const INTERACTIVE_TAGS = /<(?:button|a|input|select|textarea)\b/gi;
const MIN_HEIGHT_44 = /min-h-\[(\d+)px\]|min-height\s*:\s*(\d+)px/;

/** Hex hardcoding in className or style */
const HEX_IN_STYLE = /style\s*=\s*\{\{[^}]*#[0-9a-fA-F]{6}/;

/** Color-only status (no icon/text companion) */
const COLOR_ONLY_STATUS = /(?:text-accent-red|text-accent-green|bg-accent-red|bg-accent-green)/;
const HAS_ICON_COMPANION = /(?:lucide|Icon|icon|aria-hidden)/;
const HAS_ROLE_STATUS = /role\s*=\s*["'](?:alert|status)/;

function lintRule1_ContrastTokens(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  const hasSemantic = SEMANTIC_BG.test(code) || SEMANTIC_TEXT.test(code) || SEMANTIC_ACCENT.test(code);
  if (!hasSemantic && code.length > 100) {
    issues.push({
      rule: 'CR_NO_SEMANTIC_TOKENS',
      severity: 'warning',
      message: 'No semantic color tokens found (bg-bg-*, text-text-*, accent-*). CR cannot be verified.',
      fix: 'Use project semantic classes: bg-bg-primary, text-text-primary, etc.',
    });
  }
  return issues;
}

function lintRule2_RawTailwindColors(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].match(RAW_TAILWIND_COLORS);
    if (matches) {
      // Allow semantic status colors in specific contexts (text-green-400 for success, etc.)
      const line = lines[i];
      const isStatusContext = /success|error|warning|status|badge/i.test(line);
      if (!isStatusContext) {
        issues.push({
          rule: 'RAW_TAILWIND_COLOR',
          severity: 'error',
          message: `Raw Tailwind color "${matches[0]}" — use project semantic tokens`,
          line: i + 1,
          fix: `Replace with bg-accent-*/text-accent-* or bg-bg-*/text-text-*`,
        });
      }
    }
  }
  return issues;
}

function lintRule3_YellowWarning(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  if (/bg-(?:yellow|amber)-[34]\d{2}/i.test(code) && /text-(?:yellow|white)/i.test(code)) {
    issues.push({
      rule: 'YELLOW_TEXT_ON_YELLOW',
      severity: 'error',
      message: 'Yellow/white text on yellow bg — use dark text (text-text-primary)',
      fix: 'Replace text color with text-text-primary or text-black',
    });
  }
  return issues;
}

function lintRule4_FocusVisible(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  if (OUTLINE_NONE.test(code)) {
    issues.push({
      rule: 'OUTLINE_NONE',
      severity: 'error',
      message: 'outline:none removes keyboard accessibility — global focus-visible handles it',
      fix: 'Remove outline:none. The global *:focus-visible rule in globals.css provides focus styles.',
    });
  }
  return issues;
}

function lintRule5_StatusCombination(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  if (COLOR_ONLY_STATUS.test(code)) {
    const hasIcon = HAS_ICON_COMPANION.test(code);
    const hasRole = HAS_ROLE_STATUS.test(code);
    if (!hasIcon && !hasRole) {
      issues.push({
        rule: 'COLOR_ONLY_STATUS',
        severity: 'warning',
        message: 'Status indicated by color only — add icon (lucide) or text label',
        fix: 'Add lucide-react icon + role="alert" or role="status"',
      });
    }
  }
  return issues;
}

function lintRule6_SpacingGrid(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(ARBITRARY_SPACING.source, 'g');
  while ((match = re.exec(code)) !== null) {
    const px = parseInt(match[1], 10);
    if (px % 4 !== 0 && px !== 0) {
      const nearest = Math.round(px / 4) * 4;
      issues.push({
        rule: 'NON_4_MULTIPLE_SPACING',
        severity: 'warning',
        message: `${px}px is not a 4px grid multiple`,
        fix: `Normalize to ${nearest}px or use --sp-* / Tailwind spacing (p-${nearest / 4})`,
      });
    }
  }
  return issues;
}

function lintRule7_HexHardcoding(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  if (HEX_IN_STYLE.test(code)) {
    issues.push({
      rule: 'HEX_HARDCODED_STYLE',
      severity: 'error',
      message: 'Hex color hardcoded in inline style — use CSS variable or Tailwind class',
      fix: 'Replace with var(--color-*) or semantic Tailwind class',
    });
  }
  // Check className for hex (via arbitrary value syntax like bg-[#xxx])
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/(?:bg|text|border)-\[#[0-9a-fA-F]{6}\]/.test(lines[i])) {
      issues.push({
        rule: 'HEX_HARDCODED_CLASS',
        severity: 'error',
        message: `Hex in Tailwind arbitrary value — use semantic token`,
        line: i + 1,
        fix: 'Replace bg-[#xxx] with bg-bg-* or bg-accent-*',
      });
    }
  }
  return issues;
}

function lintRule8_TouchTarget(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  const interactiveMatches = code.match(INTERACTIVE_TAGS);
  if (interactiveMatches && interactiveMatches.length > 0) {
    const heightMatch = code.match(MIN_HEIGHT_44);
    // Only flag if there are interactive elements but no min-height >= 44px found anywhere
    if (!heightMatch && !/min-h-\[4[4-9]px\]|min-h-\[(?:[5-9]\d|1\d{2})px\]|min-h-11\b/.test(code)) {
      // Check if using component classes that already have proper sizing
      if (!/premium-button|ds-btn/.test(code)) {
        issues.push({
          rule: 'TOUCH_TARGET_SMALL',
          severity: 'warning',
          message: 'Interactive elements without min-height ≥ 44px — touch target may be too small',
          fix: 'Add min-h-[44px] or use .premium-button / .ds-btn-* (pre-sized)',
        });
      }
    }
  }
  return issues;
}

function lintRule9_TransitionAll(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  if (TRANSITION_ALL.test(code)) {
    issues.push({
      rule: 'TRANSITION_ALL',
      severity: 'warning',
      message: 'transition:all — specify target properties + use var(--transition-*)',
      fix: 'Replace with: transition: background-color var(--transition-normal), ...',
    });
  }
  // Also flag Tailwind's transition-all utility
  if (/\btransition-all\b/.test(code) && !/transition-all\s+duration/.test(code)) {
    issues.push({
      rule: 'TW_TRANSITION_ALL',
      severity: 'info',
      message: 'Tailwind transition-all — consider specifying property (transition-colors, transition-transform)',
    });
  }
  return issues;
}

function lintRule10_ZIndex(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  if (ARBITRARY_ZINDEX.test(code) && !TOKEN_ZINDEX.test(code)) {
    issues.push({
      rule: 'ARBITRARY_ZINDEX',
      severity: 'error',
      message: 'Arbitrary z-index number — use var(--z-*) tokens',
      fix: 'Replace with var(--z-base/dropdown/sticky/overlay/modal/toast/tooltip)',
    });
  }
  return issues;
}

// Bonus: check for rebuilding existing components
function lintBonusComponentReuse(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];

  // Detect button built from scratch when .premium-button / .ds-btn exists
  const hasButton = /<button\b/.test(code);
  const hasManyStyles = (code.match(/hover:|active:|focus:|transition|rounded|border|bg-|text-/g) ?? []).length;
  if (hasButton && hasManyStyles > 8 && !/premium-button|ds-btn/.test(code) && code.split('\n').length > 5) {
    issues.push({
      rule: 'COMPONENT_REBUILD',
      severity: 'info',
      message: 'Complex button built from scratch — consider using .premium-button or .ds-btn-*',
      fix: 'Use existing component classes: premium-button, premium-button-ghost, ds-btn-primary, etc.',
    });
  }

  // Detect card built from scratch when .ds-card / .premium-panel exists
  const hasCardPattern = (code.match(/rounded.*border.*shadow|shadow.*border.*rounded/g) ?? []).length;
  if (hasCardPattern > 0 && !/ds-card|premium-panel|zone-card/.test(code)) {
    issues.push({
      rule: 'CARD_REBUILD',
      severity: 'info',
      message: 'Card-like element built from scratch — consider .ds-card, .premium-panel, or .zone-card',
      fix: 'Use existing: ds-card, ds-card-sm, ds-card-lg, premium-panel, premium-panel-soft, zone-card',
    });
  }

  // Detect input built from scratch when .ds-input exists
  const hasInput = /<input\b/.test(code);
  const hasInputStyles = /border.*rounded.*focus|focus.*border.*rounded/.test(code);
  if (hasInput && hasInputStyles && !/ds-input/.test(code)) {
    issues.push({
      rule: 'INPUT_REBUILD',
      severity: 'info',
      message: 'Styled input built from scratch — consider .ds-input (has focus, error, success states)',
      fix: 'Use ds-input class. Add .error or .success modifier for validation states.',
    });
  }

  // Detect badge built from scratch when .badge-* exists
  const hasBadgePattern = /text-\[1[0-2]px\].*rounded-full|rounded-full.*text-\[1[0-2]px\]|uppercase.*tracking.*rounded/.test(code);
  if (hasBadgePattern && !/badge-|ds-tag/.test(code)) {
    issues.push({
      rule: 'BADGE_REBUILD',
      severity: 'info',
      message: 'Badge-like element built from scratch — consider .badge-* or .ds-tag',
      fix: 'Use existing: badge-allow, badge-classified, badge-amber, badge-blue, ds-tag',
    });
  }

  return issues;
}

// IDENTITY_SEAL: PART-2b | role=component-reuse | inputs=code | outputs=DesignLintIssue[]

// ============================================================
// PART 2c — Rule 11: Color-blind pair detection
// ============================================================

/** Confusable color pairs for common color vision deficiencies */
const CONFUSABLE_PAIRS: [RegExp, RegExp, string][] = [
  [/(?:text|bg)-accent-red/, /(?:text|bg)-accent-green/, 'red/green (protanopia/deuteranopia)'],
  [/(?:text|bg)-red-\d/, /(?:text|bg)-green-\d/, 'red/green (protanopia/deuteranopia)'],
  [/(?:text|bg)-accent-blue/, /(?:text|bg)-accent-purple/, 'blue/purple (tritanopia)'],
];

function lintRule11_ColorBlindPairs(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  for (const [patternA, patternB, deficiency] of CONFUSABLE_PAIRS) {
    if (patternA.test(code) && patternB.test(code)) {
      // Check if they have icon/shape differentiation
      const hasShapeDiff = /lucide|Icon|aria-hidden|▲|▼|●|■/.test(code);
      if (!hasShapeDiff) {
        issues.push({
          rule: 'COLOR_BLIND_PAIR',
          severity: 'warning',
          message: `Confusable color pair: ${deficiency} — add icon/shape differentiation`,
          fix: 'Add lucide icons or shape indicators (▲▼) alongside colors for color-blind users',
        });
      }
    }
  }
  return issues;
}

// ============================================================
// PART 2d — Rule 12: Precise touch target detection
// ============================================================

function lintRule12_PreciseTouchTarget(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect interactive elements with explicit small sizing
    if (/<(?:button|a)\b/.test(line)) {
      // Check for explicit small padding that results in < 44px
      // p-0.5 = 2px, p-1 = 4px, p-1.5 = 6px — these are too small alone
      const hasSmallPadding = /\bp-(?:0\.5|1|1\.5)\b/.test(line) && !/p-\d{2,}/.test(line);
      const hasExplicitSmallHeight = /h-\[(?:[1-3]\d)px\]|h-[1-7]\b/.test(line);
      const hasMinHeight = /min-h-|min-height|premium-button|ds-btn/.test(line);

      if ((hasSmallPadding || hasExplicitSmallHeight) && !hasMinHeight) {
        // Check nearby lines for min-h
        const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3)).join(' ');
        if (!/min-h-|min-height|premium-button|ds-btn/.test(context)) {
          issues.push({
            rule: 'TOUCH_TARGET_PRECISE',
            severity: 'warning',
            message: `Interactive element with small padding/height — may not meet 44px touch target`,
            line: i + 1,
            fix: 'Add min-h-[44px] min-w-[44px] or use .premium-button/.ds-btn-*',
          });
        }
      }
    }
  }
  return issues;
}

// ============================================================
// PART 2e — Rule 13: Dual-theme CR verification
// ============================================================

/** Project token L-values for both themes */
const TOKEN_L_VALUES: Record<string, { dark: number; light: number }> = {
  'bg-bg-primary':     { dark: 0.008, light: 0.960 },
  'bg-bg-secondary':   { dark: 0.013, light: 0.896 },
  'bg-bg-tertiary':    { dark: 0.022, light: 0.807 },
  'text-text-primary': { dark: 0.920, light: 0.005 },
  'text-text-secondary': { dark: 0.402, light: 0.032 },
  'text-text-tertiary':  { dark: 0.184, light: 0.091 },
  'text-accent-amber': { dark: 0.300, light: 0.170 },
  'text-accent-red':   { dark: 0.215, light: 0.136 },
  'text-accent-green': { dark: 0.317, light: 0.197 },
  'text-accent-purple': { dark: 0.184, light: 0.117 },
  'text-accent-blue':  { dark: 0.184, light: 0.129 },
};

function calcCR(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function lintRule13_DualThemeCR(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];

  // Find text-on-bg combinations
  const bgMatch = code.match(/\b(bg-bg-(?:primary|secondary|tertiary))\b/);
  const textMatches = code.match(/\b(text-(?:text-(?:primary|secondary|tertiary)|accent-(?:amber|red|green|purple|blue)))\b/g);

  if (!bgMatch || !textMatches) return issues;

  const bgToken = bgMatch[1];
  const bgL = TOKEN_L_VALUES[bgToken];
  if (!bgL) return issues;

  for (const textToken of new Set(textMatches)) {
    const textL = TOKEN_L_VALUES[textToken];
    if (!textL) continue;

    const crDark = calcCR(textL.dark, bgL.dark);
    const crLight = calcCR(textL.light, bgL.light);

    const darkPass = crDark >= 4.5;
    const lightPass = crLight >= 4.5;

    if (!darkPass || !lightPass) {
      const failTheme = !darkPass && !lightPass ? 'both themes' : !darkPass ? 'dark theme' : 'light theme';
      issues.push({
        rule: 'DUAL_THEME_CR_FAIL',
        severity: 'warning',
        message: `${textToken} on ${bgToken}: CR fails in ${failTheme} (dark: ${crDark.toFixed(1)}:1, light: ${crLight.toFixed(1)}:1)`,
        fix: 'Use text-text-primary (always high CR) or check both theme L-values',
      });
    }
  }
  return issues;
}

// ============================================================
// PART 2f — Rule 14: Responsive overflow detection
// ============================================================

function lintRule14_ResponsiveOverflow(code: string): DesignLintIssue[] {
  const issues: DesignLintIssue[] = [];

  // Fixed width that could overflow on mobile
  const fixedWidthMatch = code.match(/(?<!max-)w-\[(\d+)px\]/g);
  if (fixedWidthMatch) {
    for (const match of fixedWidthMatch) {
      const px = parseInt(match.match(/\d+/)?.[0] ?? '0', 10);
      if (px > 375) {
        issues.push({
          rule: 'FIXED_WIDTH_OVERFLOW',
          severity: 'warning',
          message: `Fixed width ${px}px exceeds mobile viewport (375px) — use max-w or responsive classes`,
          fix: `Replace w-[${px}px] with max-w-[${px}px] w-full or use responsive: w-full md:w-[${px}px]`,
        });
      }
    }
  }

  // Horizontal flex without wrapping that could overflow
  if (/flex\b/.test(code) && !/flex-wrap|flex-col|grid/.test(code)) {
    const manyChildren = (code.match(/<(?:div|span|button|a)\b/g) ?? []).length;
    if (manyChildren > 5 && !/overflow-x|overflow-auto|scrollbar/.test(code)) {
      issues.push({
        rule: 'FLEX_NO_WRAP',
        severity: 'info',
        message: 'Horizontal flex with 5+ children and no flex-wrap — may overflow on mobile',
        fix: 'Add flex-wrap or use responsive: flex-col md:flex-row',
      });
    }
  }

  // No responsive breakpoint used at all
  if (code.length > 300 && !/\b(?:sm:|md:|lg:|xl:)\b/.test(code) && /</.test(code)) {
    issues.push({
      rule: 'NO_RESPONSIVE_CLASSES',
      severity: 'info',
      message: 'No responsive breakpoint classes found — consider mobile-first responsive design',
      fix: 'Add sm:/md:/lg: variants for layout, typography, and spacing',
    });
  }

  return issues;
}

// IDENTITY_SEAL: PART-2f | role=responsive-lint | inputs=code | outputs=DesignLintIssue[]

// ============================================================
// PART 3 — Main Linter Entry Point
// ============================================================

/**
 * Run the 10-step design linter on generated code.
 * Returns a scored result with actionable issues.
 *
 * Usage:
 *   import { runDesignLint } from '@eh/quill-engine/pipeline/design-lint';
 *   const result = runDesignLint(generatedCode);
 *   if (!result.passed) { // show issues to user }
 */
export function runDesignLint(code: string): DesignLintResult {
  if (!code || code.trim().length < 20) {
    return { passed: true, score: 100, issues: [], summary: 'No substantial code to lint.' };
  }

  const allIssues: DesignLintIssue[] = [
    ...lintRule1_ContrastTokens(code),
    ...lintRule2_RawTailwindColors(code),
    ...lintRule3_YellowWarning(code),
    ...lintRule4_FocusVisible(code),
    ...lintRule5_StatusCombination(code),
    ...lintRule6_SpacingGrid(code),
    ...lintRule7_HexHardcoding(code),
    ...lintRule8_TouchTarget(code),
    ...lintRule9_TransitionAll(code),
    ...lintRule10_ZIndex(code),
    ...lintRule11_ColorBlindPairs(code),
    ...lintRule12_PreciseTouchTarget(code),
    ...lintRule13_DualThemeCR(code),
    ...lintRule14_ResponsiveOverflow(code),
    ...lintBonusComponentReuse(code),
  ];

  // Score: start at 100, deduct per issue
  const deductions: Record<DesignLintSeverity, number> = { error: 15, warning: 7, info: 2 };
  let score = 100;
  for (const issue of allIssues) {
    score -= deductions[issue.severity];
  }
  score = Math.max(0, score);

  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const infos = allIssues.filter(i => i.severity === 'info').length;

  const passed = errors === 0 && score >= 60;

  const summary = allIssues.length === 0
    ? 'All 10 design lint checks passed ✅'
    : `Design lint: ${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''}, ${infos} info — score ${score}/100 ${passed ? '✅' : '❌'}`;

  logger.info('code-studio.design-lint', summary, { score, errors, warnings, infos });

  return { passed, score, issues: allIssues, summary };
}

/**
 * Format lint result as human-readable report.
 */
export function formatDesignLintReport(result: DesignLintResult): string {
  if (result.issues.length === 0) return result.summary;

  const lines = [`[Design Lint v8.0] Score: ${result.score}/100 ${result.passed ? 'PASS' : 'FAIL'}`];
  for (const issue of result.issues) {
    const loc = issue.line ? `:${issue.line}` : '';
    const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
    lines.push(`  ${icon} [${issue.rule}]${loc} ${issue.message}`);
    if (issue.fix) lines.push(`     → Fix: ${issue.fix}`);
  }
  return lines.join('\n');
}

// ============================================================
// PART 4 — Public Utilities
// ============================================================

/**
 * Check contrast ratio between two project tokens.
 * Returns CR for both dark and light themes.
 *
 * Usage:
 *   checkTokenContrast('text-text-primary', 'bg-bg-primary')
 *   → { dark: { cr: 15.2, pass: true }, light: { cr: 18.3, pass: true } }
 */
export function checkTokenContrast(
  textToken: string,
  bgToken: string,
  threshold = 4.5,
): { dark: { cr: number; pass: boolean }; light: { cr: number; pass: boolean } } | null {
  const textL = TOKEN_L_VALUES[textToken];
  const bgL = TOKEN_L_VALUES[bgToken];
  if (!textL || !bgL) return null;

  const crDark = calcCR(textL.dark, bgL.dark);
  const crLight = calcCR(textL.light, bgL.light);

  return {
    dark: { cr: Math.round(crDark * 10) / 10, pass: crDark >= threshold },
    light: { cr: Math.round(crLight * 10) / 10, pass: crLight >= threshold },
  };
}

/**
 * Get all available project token names for CR checking.
 */
export function getAvailableTokens(): string[] {
  return Object.keys(TOKEN_L_VALUES);
}

// IDENTITY_SEAL: PART-4 | role=public-utilities | inputs=tokens | outputs=CR-result
