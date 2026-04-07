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
/**
 * Run the 10-step design linter on generated code.
 * Returns a scored result with actionable issues.
 *
 * Usage:
 *   import { runDesignLint } from './design-lint';
 *   const result = runDesignLint(generatedCode);
 *   if (!result.passed) { // show issues to user }
 */
export declare function runDesignLint(code: string): DesignLintResult;
/**
 * Format lint result as human-readable report.
 */
export declare function formatDesignLintReport(result: DesignLintResult): string;
/**
 * Check contrast ratio between two project tokens.
 * Returns CR for both dark and light themes.
 *
 * Usage:
 *   checkTokenContrast('text-text-primary', 'bg-bg-primary')
 *   → { dark: { cr: 15.2, pass: true }, light: { cr: 18.3, pass: true } }
 */
export declare function checkTokenContrast(textToken: string, bgToken: string, threshold?: number): {
    dark: {
        cr: number;
        pass: boolean;
    };
    light: {
        cr: number;
        pass: boolean;
    };
} | null;
/**
 * Get all available project token names for CR checking.
 */
export declare function getAvailableTokens(): string[];
