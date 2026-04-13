/** Categories safe for automatic application without human review */
export type SafeFixCategory = 'unused-import' | 'console-remove' | 'missing-semicolon' | 'formatting' | 'null-guard' | 'type-import';
/** Regexes on fix *descriptions* — never auto-apply if any match */
export declare const UNSAFE_AUTOFIX_DESCRIPTION_PATTERNS: readonly RegExp[];
/** Map description patterns → safe category */
export declare const SAFE_FIX_PATTERN_DEFINITIONS: ReadonlyArray<{
    pattern: RegExp;
    category: SafeFixCategory;
}>;
/**
 * Classify a fix description. Returns null if unsafe or unknown.
 */
export declare function classifyFixDescription(description: string): SafeFixCategory | null;
