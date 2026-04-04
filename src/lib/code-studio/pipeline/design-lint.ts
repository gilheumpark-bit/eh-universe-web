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
const SEMANTIC_BORDER = /\bborder-border\b/;

/** Raw Tailwind colors that should NOT appear in production code */
const RAW_TAILWIND_COLORS = /\b(?:bg|text|border|ring|from|to|via)-(?:red|blue|green|yellow|purple|pink|indigo|teal|cyan|orange|lime|emerald|violet|fuchsia|rose|sky|slate|gray|zinc|neutral|stone)-\d{2,3}\b/;

/** Arbitrary z-index (not using var(--z-*)) */
const ARBITRARY_ZINDEX = /z-(?:index\s*:\s*|(?:\[))\d{2,}/;
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
const HEX_IN_JSX = /#[0-9a-fA-F]{6}\b/;
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
  // Detect someone building a full button from scratch when .premium-button exists
  const lines = code.split('\n').length;
  const hasButton = /<button\b/.test(code);
  const hasManyStyles = (code.match(/hover:|active:|focus:|transition|rounded|border|bg-|text-/g) ?? []).length;
  if (hasButton && hasManyStyles > 8 && !/premium-button|ds-btn/.test(code) && lines > 5) {
    issues.push({
      rule: 'COMPONENT_REBUILD',
      severity: 'info',
      message: 'Complex button built from scratch — consider using .premium-button or .ds-btn-*',
      fix: 'Use existing component classes: premium-button, premium-button-ghost, ds-btn-primary, etc.',
    });
  }
  return issues;
}

// IDENTITY_SEAL: PART-2 | role=lint-rules | inputs=code-string | outputs=DesignLintIssue[]

// ============================================================
// PART 3 — Main Linter Entry Point
// ============================================================

/**
 * Run the 10-step design linter on generated code.
 * Returns a scored result with actionable issues.
 *
 * Usage:
 *   import { runDesignLint } from '@/lib/code-studio/pipeline/design-lint';
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

// IDENTITY_SEAL: PART-3 | role=design-linter-runtime | inputs=code | outputs=DesignLintResult
