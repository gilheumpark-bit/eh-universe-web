export interface BugReport {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    line: number;
    description: string;
    suggestion: string;
    category: 'logic' | 'security' | 'performance' | 'style' | 'error-handling' | 'type-safety';
    source?: 'ai' | 'static' | 'ast';
}
/**
 * AI-powered bug detection. Sends code to the active LLM provider and
 * returns structured bug reports. Falls back to an empty array on any
 * parse or network failure.
 */
export declare function findBugs(code: string, language: string, fileName: string, signal?: AbortSignal): Promise<BugReport[]>;
/**
 * Local (no AI) heuristic-based bug detection. Runs synchronously.
 * Covers common patterns: unused variables, null dereference potential,
 * unreachable code, empty catch, missing switch default, division by zero.
 */
export declare function findBugsStatic(code: string, language: string): BugReport[];
/**
 * AST-level bug detection. Uses the TypeScript compiler API to parse source
 * and walk the tree, detecting structural issues that regex cannot reliably catch.
 *
 * Detectors:
 *  - Declared-but-never-read variables (scope-aware)
 *  - Null/undefined assignment followed by unguarded property access
 *  - Switch without default case
 *  - Async function without try/catch around await
 *  - Unhandled Promise (async call without await)
 */
export declare function findBugsAst(code: string, language: string): Promise<BugReport[]>;
/**
 * Deduplicate between AI and static/AST results.
 * If two reports share the same line and a similar message, keep the one
 * with the higher-priority source (ast > static > ai).
 */
export declare function deduplicateBugReports(reports: BugReport[]): BugReport[];
/**
 * Combined analysis: run AI + static + AST detectors,
 * then merge and deduplicate results.
 */
export declare function findBugsCombined(code: string, language: string, fileName: string, signal?: AbortSignal): Promise<BugReport[]>;
