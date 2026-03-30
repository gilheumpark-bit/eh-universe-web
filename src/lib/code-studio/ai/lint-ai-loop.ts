// ============================================================
// PART 1 — Types & Pattern Definitions
// ============================================================
// AI-assisted lint fix loop: detect errors via patterns,
// ask AI for fixes, apply, re-lint, repeat up to 3 iterations.

import { streamChat } from '@/lib/ai-providers';

export interface LintError {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule?: string;
}

export interface LintFixSuggestion {
  file: string;
  line: number;
  original: string;
  fixed: string;
  explanation: string;
  confidence: number;
}

export interface LintResult {
  errors: LintError[];
  fixSuggestions: LintFixSuggestion[];
  weightedScore: number;
  batchFixable: LintFixSuggestion[];
}

export interface LintLoopResult {
  iterations: number;
  initialErrors: number;
  finalErrors: number;
  fixesApplied: number;
  finalCode: string;
  clean: boolean;
}

const LINT_PATTERNS: Array<{
  pattern: RegExp;
  severity: LintError['severity'];
  message: string;
  rule: string;
}> = [
  { pattern: /\bany\b(?=\s*[;,)\]}])/, severity: 'warning', message: "Avoid using 'any' type", rule: 'no-explicit-any' },
  { pattern: /console\.(log|debug|info)\b/, severity: 'warning', message: 'Unexpected console statement', rule: 'no-console' },
  { pattern: /\beval\s*\(/, severity: 'error', message: 'eval() is dangerous', rule: 'no-eval' },
  { pattern: /\bvar\s+/, severity: 'warning', message: "Use 'let' or 'const' instead of 'var'", rule: 'no-var' },
  { pattern: /==(?!=)/, severity: 'warning', message: 'Use === instead of ==', rule: 'eqeqeq' },
  { pattern: /!=(?!=)/, severity: 'warning', message: 'Use !== instead of !=', rule: 'eqeqeq' },
  { pattern: /\balert\s*\(/, severity: 'warning', message: 'Unexpected alert statement', rule: 'no-alert' },
  { pattern: /innerHTML\s*=/, severity: 'warning', message: 'innerHTML can cause XSS', rule: 'no-inner-html' },
  { pattern: /dangerouslySetInnerHTML/, severity: 'warning', message: 'dangerouslySetInnerHTML can cause XSS', rule: 'no-danger' },
];

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=LintError,LintResult

// ============================================================
// PART 2 — Pattern-based Linting
// ============================================================

export function lintCode(code: string, fileName: string): LintError[] {
  const errors: LintError[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    for (const rule of LINT_PATTERNS) {
      if (rule.pattern.test(line)) {
        errors.push({
          file: fileName,
          line: i + 1,
          column: (line.search(rule.pattern) ?? 0) + 1,
          severity: rule.severity,
          message: rule.message,
          rule: rule.rule,
        });
      }
    }
  }

  return errors;
}

// IDENTITY_SEAL: PART-2 | role=Linter | inputs=code,fileName | outputs=LintError[]

// ============================================================
// PART 3 — AI Fix Suggestions
// ============================================================

const LINT_FIX_SYSTEM = `You are a code linter auto-fixer. Given code and lint errors, output a JSON array of fixes.
Each fix: { "line": number, "original": "original line text", "fixed": "fixed line text", "explanation": "brief explanation", "confidence": 0.0-1.0 }
Fix ONLY the reported errors. Keep fixes minimal. Output ONLY the JSON array.`;

export async function suggestLintFixes(
  code: string,
  fileName: string,
  errors: LintError[],
  signal?: AbortSignal,
): Promise<LintFixSuggestion[]> {
  if (errors.length === 0) return [];

  const errorList = errors.slice(0, 10)
    .map((e) => `Line ${e.line}: [${e.severity}] ${e.message} (${e.rule ?? 'unknown'})`)
    .join('\n');

  let accumulated = '';
  try {
    await streamChat({
      systemInstruction: LINT_FIX_SYSTEM,
      messages: [{ role: 'user', content: `File: ${fileName}\n\nLint errors:\n${errorList}\n\nCode:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\`` }],
      temperature: 0.2,
      maxTokens: 1000,
      signal,
      onChunk: (chunk: string) => { accumulated += chunk; },
    });

    const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const fixes = JSON.parse(jsonMatch[0]) as Array<{
      line: number; original: string; fixed: string;
      explanation: string; confidence?: number;
    }>;

    return fixes.map((f) => ({
      file: fileName,
      line: f.line,
      original: f.original,
      fixed: f.fixed,
      explanation: f.explanation,
      confidence: typeof f.confidence === 'number' ? Math.min(1, Math.max(0, f.confidence)) : 0.5,
    }));
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-3 | role=AIFixer | inputs=code,errors | outputs=LintFixSuggestion[]

// ============================================================
// PART 4 — Apply Fixes & Loop
// ============================================================

export function applyBatchFixes(code: string, fixes: LintFixSuggestion[]): string {
  const sorted = [...fixes].sort((a, b) => b.line - a.line);
  const lines = code.split('\n');
  for (const fix of sorted) {
    const idx = fix.line - 1;
    if (idx >= 0 && idx < lines.length && lines[idx].trim() === fix.original.trim()) {
      lines[idx] = fix.fixed;
    }
  }
  return lines.join('\n');
}

export async function lintAndFix(
  code: string,
  fileName: string,
  signal?: AbortSignal,
): Promise<LintResult> {
  const errors = lintCode(code, fileName);
  const fixSuggestions = errors.length > 0
    ? await suggestLintFixes(code, fileName, errors, signal)
    : [];

  const sevWeights: Record<string, number> = { error: 3, warning: 1, info: 0.5 };
  const weightedScore = errors.reduce((s, e) => s + (sevWeights[e.severity] ?? 1), 0);
  const batchFixable = fixSuggestions.filter((f) => f.confidence > 0.8);

  return { errors, fixSuggestions, weightedScore, batchFixable };
}

/**
 * Full lint-fix loop: lint -> AI fix -> apply -> re-lint -> repeat.
 * Stops when clean or after maxIterations (default 3).
 */
export async function runLintFixLoop(
  code: string,
  fileName: string,
  maxIterations = 3,
  signal?: AbortSignal,
  onIteration?: (iteration: number, errCount: number) => void,
): Promise<LintLoopResult> {
  let currentCode = code;
  const initialErrors = lintCode(code, fileName).length;
  let totalFixes = 0;

  for (let i = 0; i < maxIterations; i++) {
    const result = await lintAndFix(currentCode, fileName, signal);
    onIteration?.(i + 1, result.errors.length);

    if (result.errors.length === 0) {
      return {
        iterations: i + 1, initialErrors, finalErrors: 0,
        fixesApplied: totalFixes, finalCode: currentCode, clean: true,
      };
    }

    if (result.batchFixable.length === 0) {
      return {
        iterations: i + 1, initialErrors, finalErrors: result.errors.length,
        fixesApplied: totalFixes, finalCode: currentCode, clean: false,
      };
    }

    currentCode = applyBatchFixes(currentCode, result.batchFixable);
    totalFixes += result.batchFixable.length;
  }

  const finalErrors = lintCode(currentCode, fileName).length;
  return {
    iterations: maxIterations, initialErrors, finalErrors,
    fixesApplied: totalFixes, finalCode: currentCode, clean: finalErrors === 0,
  };
}

// IDENTITY_SEAL: PART-4 | role=LintLoop | inputs=code,fileName | outputs=LintLoopResult
