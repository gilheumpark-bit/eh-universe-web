// ============================================================
// Quality Rules Builder — good-pattern-catalog → AI prompt rules
// ============================================================
// Dynamically builds quality instruction text for AI system prompts
// from the good-pattern-catalog (boost + high confidence patterns).
// Replaces hardcoded quality rules with a single source of truth.
//
// Features:
//   - Severity-based ordering (critical→info)
//   - Contextual filtering (test files boost TST rules, security files boost SEC)
//   - Token budget awareness (stays under configurable limit)
//   - Memoization (same rule set → cached prompt)
//   - Example code snippets for top rules
//   - Dynamic FP suppression based on detected file type
import { GOOD_PATTERN_CATALOG, } from './good-pattern-catalog';
// ============================================================
// PART 1 — Severity & Ordering
// ============================================================
/** Quality dimensions ordered by severity (critical first). */
const QUALITY_SEVERITY_ORDER = [
    'Security',
    'Reliability',
    'Performance',
    'Maintainability',
];
/** Confidence weight for ordering within a quality dimension. */
const CONFIDENCE_WEIGHT = {
    high: 3,
    medium: 2,
    low: 1,
};
/** Sort patterns: Security > Reliability > Performance > Maintainability,
 *  then high > medium > low confidence within each group. */
function sortBySeverity(patterns) {
    return [...patterns].sort((a, b) => {
        const qa = QUALITY_SEVERITY_ORDER.indexOf(a.quality);
        const qb = QUALITY_SEVERITY_ORDER.indexOf(b.quality);
        if (qa !== qb)
            return qa - qb;
        return (CONFIDENCE_WEIGHT[b.confidence] ?? 0) - (CONFIDENCE_WEIGHT[a.confidence] ?? 0);
    });
}
/** Detect context from a file path (or empty string for general). */
function detectFileContext(filePath) {
    const lower = filePath.toLowerCase();
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(lower) || lower.includes('__tests__')) {
        return 'test';
    }
    if (/\b(auth|security|crypto|token|session|permission|rbac)\b/.test(lower)) {
        return 'security';
    }
    if (/\b(perf|bench|optim|cache)\b/.test(lower)) {
        return 'performance';
    }
    return 'general';
}
/** Boost patterns matching the file context (move to front). */
function applyContextualBoost(patterns, context) {
    if (context === 'general')
        return patterns;
    const contextQuality = context === 'test' ? 'Reliability'
        : context === 'security' ? 'Security'
            : context === 'performance' ? 'Performance'
                : null;
    if (!contextQuality)
        return patterns;
    // Partition: boosted rules first, rest after
    const boosted = [];
    const rest = [];
    for (const p of patterns) {
        if (p.quality === contextQuality) {
            boosted.push(p);
        }
        else {
            rest.push(p);
        }
    }
    return [...boosted, ...rest];
}
// IDENTITY_SEAL: PART-2 | role=contextual-filtering | inputs=filePath,patterns | outputs=boostedPatterns
// ============================================================
// PART 3 — Token Budget & Example Snippets
// ============================================================
/** Rough token estimate: ~4 chars per token (conservative). */
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
/** Example code snippets for well-known rule ID prefixes. */
const EXAMPLE_SNIPPETS = {
    'G1': '// Good: const getUserById = (id: string) => ...\n// Bad:  const fn1 = (x: any) => ...',
    'G2': '// Good: function calculateTotal(items: Item[]): number { ... }\n// Bad:  function calc(x: any) { ... }',
    'G3': '// Good: try { await fetch(url); } catch (e) { handleError(e); }\n// Bad:  await fetch(url); // no error handling',
    'G4': '// Good: const results = items.filter(Boolean).map(transform);\n// Bad:  const r = []; for (let i=0; i<items.length; i++) { if (items[i]) r.push(transform(items[i])); }',
    'G5': '// Good: import { specific } from "module";\n// Bad:  import * as everything from "module";',
};
/** Get an example snippet for a rule if available (by ID prefix). */
function getExampleForRule(ruleId) {
    // Match by first two characters (e.g., G1, G2, ...)
    const prefix = ruleId.slice(0, 2);
    return EXAMPLE_SNIPPETS[prefix] ?? null;
}
// IDENTITY_SEAL: PART-3 | role=token-budget-and-examples | inputs=text,ruleId | outputs=tokenCount,exampleSnippet
// ============================================================
// PART 4 — Memoization Cache
// ============================================================
/** Cache key = serialized rule IDs + maxRules + context. */
const promptCache = new Map();
function getCacheKey(ruleIds, maxRules, context) {
    return `${context}:${maxRules}:${ruleIds.join(',')}`;
}
/** Clear the prompt cache (useful for testing). */
export function clearPromptCache() {
    promptCache.clear();
}
// IDENTITY_SEAL: PART-4 | role=memoization | inputs=ruleIds,maxRules,context | outputs=cacheKey
// ============================================================
// PART 5 — Build Prompt Text (main exports)
// ============================================================
/** Select patterns suitable for AI code-generation guidance. */
function selectPromptPatterns() {
    return GOOD_PATTERN_CATALOG.filter((p) => p.signal === 'boost' && (p.confidence === 'high' || p.confidence === 'medium'));
}
/** Group patterns by ISO quality dimension (preserving insertion order). */
function groupByQuality(patterns) {
    const map = new Map();
    // Use severity order for consistent grouping
    for (const q of QUALITY_SEVERITY_ORDER) {
        const items = patterns.filter((p) => p.quality === q);
        if (items.length > 0)
            map.set(q, items);
    }
    return map;
}
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
export function buildQualityRulesPrompt(maxRules = 30, filePath = '', tokenBudget = 2000) {
    const context = detectFileContext(filePath);
    let patterns = selectPromptPatterns();
    patterns = sortBySeverity(patterns);
    patterns = applyContextualBoost(patterns, context);
    // Check cache
    const ruleIds = patterns.map((p) => p.id);
    const cacheKey = getCacheKey(ruleIds, maxRules, context);
    const cached = promptCache.get(cacheKey);
    if (cached)
        return cached;
    const lines = [
        'Code Quality Rules (auto-generated from good-pattern-catalog):',
    ];
    if (context !== 'general') {
        lines.push(`Context: ${context} file detected — ${context === 'test' ? 'Reliability' : context === 'security' ? 'Security' : 'Performance'} rules prioritized.`);
    }
    const grouped = groupByQuality(patterns);
    let count = 0;
    let examplesAdded = 0;
    const MAX_EXAMPLES = 5;
    for (const [quality, items] of grouped) {
        if (count >= maxRules)
            break;
        const qualityLine = `\n[${quality}]`;
        lines.push(qualityLine);
        for (const item of items) {
            if (count >= maxRules)
                break;
            // Token budget check before adding
            const candidateLine = `- ${item.id}: ${item.title}`;
            const currentText = lines.join('\n') + '\n' + candidateLine;
            if (estimateTokens(currentText) > tokenBudget)
                break;
            count++;
            lines.push(candidateLine);
            // Add example snippet for top rules (up to MAX_EXAMPLES)
            if (examplesAdded < MAX_EXAMPLES) {
                const example = getExampleForRule(item.id);
                if (example) {
                    const withExample = currentText + '\n  ' + example.split('\n').join('\n  ');
                    if (estimateTokens(withExample) <= tokenBudget) {
                        lines.push('  ' + example.split('\n').join('\n  '));
                        examplesAdded++;
                    }
                }
            }
        }
    }
    lines.push(`\nTotal: ${count} rules from ${GOOD_PATTERN_CATALOG.length}-pattern catalog.`, 'Follow these patterns when generating code.');
    const result = lines.join('\n');
    // Cache the result
    promptCache.set(cacheKey, result);
    return result;
}
/**
 * Build a compact FP suppression block for bug-detection / lint prompts.
 * Dynamic: adjusts suppression rules based on detected file type.
 *
 * @param filePath Optional file path for context-aware suppression.
 */
export function buildFPSuppressionPrompt(filePath = '') {
    const context = detectFileContext(filePath);
    let suppressors = GOOD_PATTERN_CATALOG.filter((p) => p.signal === 'suppress-fp' || (p.suppresses && p.suppresses.length > 0));
    // Context-aware: for test files, prioritize Reliability suppressors
    // For security files, prioritize Security suppressors
    if (context === 'test') {
        suppressors = sortBySeverity(suppressors);
        suppressors = applyContextualBoost(suppressors, 'test');
    }
    else if (context === 'security') {
        suppressors = sortBySeverity(suppressors);
        suppressors = applyContextualBoost(suppressors, 'security');
    }
    if (suppressors.length === 0) {
        return '';
    }
    const lines = [
        '\nFalse-Positive Suppression Rules (do NOT flag these as bugs when the good pattern is present):',
    ];
    if (context !== 'general') {
        lines.push(`File context: ${context} — suppression order adjusted.`);
    }
    for (const s of suppressors.slice(0, 25)) {
        const suppresses = s.suppresses?.join(', ') ?? '';
        lines.push(`- When "${s.title}" (${s.id}) is detected → suppress ${suppresses}`);
    }
    return lines.join('\n');
}
// IDENTITY_SEAL: PART-5 | role=prompt-text-builder | inputs=patterns,filePath,tokenBudget | outputs=qualityRulesString,fpSuppressionString
