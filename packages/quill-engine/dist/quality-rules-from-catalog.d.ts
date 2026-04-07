/** Clear the prompt cache (useful for testing). */
export declare function clearPromptCache(): void;
/**
 * Build a compact quality-rules block for AI system prompts.
 * - Severity-ordered: Security → Reliability → Performance → Maintainability
 * - Context-aware: boosts rules matching detected file type
 * - Token-budgeted: stays under `tokenBudget` (default 2000)
 * - Includes example snippets for top 5 rules
 * - Memoized: same rule set + context → cached result
 *
 * @param maxRules   Cap the total number of rules (default 30).
 * @param filePath   Optional file path for contextual boosting.
 * @param tokenBudget Max tokens for the prompt block (default 2000).
 */
export declare function buildQualityRulesPrompt(maxRules?: number, filePath?: string, tokenBudget?: number): string;
/**
 * Build a compact FP suppression block for bug-detection / lint prompts.
 * Dynamic: adjusts suppression rules based on detected file type.
 *
 * @param filePath Optional file path for context-aware suppression.
 */
export declare function buildFPSuppressionPrompt(filePath?: string): string;
