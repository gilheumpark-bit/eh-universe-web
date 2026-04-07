// ============================================================
// PART 1 — Safe / unsafe auto-fix policy (verification loop)
// ============================================================
// Single source for which automated fix descriptions may apply.
// Agents and docs must align with this list — do not duplicate ad-hoc.
/** Regexes on fix *descriptions* — never auto-apply if any match */
export const UNSAFE_AUTOFIX_DESCRIPTION_PATTERNS = [
    /function\s+signature/i,
    /business\s+logic/i,
    /api\s+(call|endpoint|route)/i,
    /network|fetch|axios|http/i,
    /auth(entication|orization)?/i,
    /state\s+machine|transition/i,
    /return\s+type\s+change/i,
    /eval\s*\(|new\s+Function\s*\(/i,
    /prototype\.__proto__|__proto__/i,
];
/** Map description patterns → safe category */
export const SAFE_FIX_PATTERN_DEFINITIONS = [
    { pattern: /unused\s+import|remove\s+import|unreferenced\s+import/i, category: 'unused-import' },
    { pattern: /console\.\w+|remove\s+console/i, category: 'console-remove' },
    { pattern: /missing\s+semicolon|add\s+semicolon/i, category: 'missing-semicolon' },
    { pattern: /whitespace|indentation|formatting|trailing\s+space/i, category: 'formatting' },
    { pattern: /null\s+(check|guard)|undefined\s+(check|guard)|optional\s+chain|nullish/i, category: 'null-guard' },
    { pattern: /type\s+import|import\s+type|missing\s+type/i, category: 'type-import' },
];
/**
 * Classify a fix description. Returns null if unsafe or unknown.
 */
export function classifyFixDescription(description) {
    for (const unsafe of UNSAFE_AUTOFIX_DESCRIPTION_PATTERNS) {
        if (unsafe.test(description))
            return null;
    }
    for (const { pattern, category } of SAFE_FIX_PATTERN_DEFINITIONS) {
        if (pattern.test(description))
            return category;
    }
    return null;
}
// IDENTITY_SEAL: PART-1 | role=autofix-policy | inputs=description | outputs=SafeFixCategory|null
