// ============================================================
// Quality Rules Builder — good-pattern-catalog → AI prompt rules
// ============================================================
// Dynamically builds quality instruction text for AI system prompts
// from the good-pattern-catalog (boost + high confidence patterns).
// Replaces hardcoded quality rules with a single source of truth.

import {
  GOOD_PATTERN_CATALOG,
  type GoodPatternMeta,
} from '@/cli/core/good-pattern-catalog';

// ============================================================
// PART 1 — Filter & Group
// ============================================================

/** Select patterns suitable for AI code-generation guidance. */
function selectPromptPatterns(): GoodPatternMeta[] {
  return GOOD_PATTERN_CATALOG.filter(
    (p) => p.signal === 'boost' && p.confidence === 'high',
  );
}

/** Group patterns by ISO quality dimension. */
function groupByQuality(
  patterns: GoodPatternMeta[],
): Map<string, GoodPatternMeta[]> {
  const map = new Map<string, GoodPatternMeta[]>();
  for (const p of patterns) {
    const list = map.get(p.quality) ?? [];
    list.push(p);
    map.set(p.quality, list);
  }
  return map;
}

// IDENTITY_SEAL: PART-1 | role=filter-and-group | inputs=GOOD_PATTERN_CATALOG | outputs=selectedPatterns,grouped

// ============================================================
// PART 2 — Build Prompt Text
// ============================================================

/**
 * Build a compact quality-rules block for AI system prompts.
 * Output is a numbered list grouped by quality dimension.
 *
 * @param maxRules Cap the total number of rules to keep prompt concise.
 *                 Defaults to 30 (good balance between guidance and token cost).
 */
export function buildQualityRulesPrompt(maxRules = 30): string {
  const patterns = selectPromptPatterns();
  const grouped = groupByQuality(patterns);

  const lines: string[] = [
    'Code Quality Rules (auto-generated from good-pattern-catalog):',
  ];

  let count = 0;
  for (const [quality, items] of grouped) {
    if (count >= maxRules) break;
    lines.push(`\n[${quality}]`);
    for (const item of items) {
      if (count >= maxRules) break;
      count++;
      lines.push(`- ${item.id}: ${item.title}`);
    }
  }

  lines.push(
    `\nTotal: ${count} rules from ${GOOD_PATTERN_CATALOG.length}-pattern catalog.`,
    'Follow these patterns when generating code.',
  );

  return lines.join('\n');
}

/**
 * Build a compact quality-rules block for bug-detection / lint prompts.
 * Focuses on patterns that suppress false positives — tells the AI
 * "do NOT flag these as bugs when the good pattern is present".
 */
export function buildFPSuppressionPrompt(): string {
  const suppressors = GOOD_PATTERN_CATALOG.filter(
    (p) => p.signal === 'suppress-fp' || (p.suppresses && p.suppresses.length > 0),
  );

  if (suppressors.length === 0) {
    return '';
  }

  const lines: string[] = [
    '\nFalse-Positive Suppression Rules (do NOT flag these as bugs when the good pattern is present):',
  ];

  for (const s of suppressors.slice(0, 25)) {
    const suppresses = s.suppresses?.join(', ') ?? '';
    lines.push(
      `- When "${s.title}" (${s.id}) is detected → suppress ${suppresses}`,
    );
  }

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-2 | role=prompt-text-builder | inputs=patterns | outputs=qualityRulesString,fpSuppressionString
