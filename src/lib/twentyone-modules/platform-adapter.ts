// ============================================================
// twentyone-modules/platform-adapter.ts
// — M18 Platform Adapter business logic (interface only).
//
// Proprietary software repository ships:
//   - Schema validation (validatePlatformProfile)
//   - Fitness scoring algorithm (computePlatformFitness)
//   - Compliance hook (runPlatformRatingCheck)
//
// Separate rule-pack data ships externally:
//   - The actual 18-platform rule pack data (KR 5 + JP 4 + EN 5 + ZH 4)
//   - Per-platform forbidden content codes
//
// Without a registered rule pack, this module returns:
//   - validatePlatformProfile: rejection (no rule_pack_version)
//   - computePlatformFitness: empty matrix
//   - runPlatformRatingCheck: trace-severity informational finding
//
// Isolation §1: zero imports from save-engine / ManuscriptView / origin-*.
// ============================================================

import type {
  PlatformProfile,
  PlatformFitnessScore,
  ViolationSeverity,
  AgeRating,
} from './types';
import type { ComplianceFinding, Severity } from './severity-router';

// ============================================================
// PART 1 — Schema validation
// ============================================================

export interface ValidationError {
  field: string;
  reason: string;
}

/**
 * Verify a PlatformProfile object has all required fields with valid values.
 * Used at rule pack ingestion time (commercial license loader).
 */
export function validatePlatformProfile(
  profile: Partial<PlatformProfile>,
): { ok: true; profile: PlatformProfile } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!profile.platform_id || typeof profile.platform_id !== 'string') {
    errors.push({ field: 'platform_id', reason: 'required string' });
  }
  if (!profile.platform_name || typeof profile.platform_name !== 'string') {
    errors.push({ field: 'platform_name', reason: 'required string' });
  }
  if (!profile.market || !['KR', 'JP', 'EN', 'ZH'].includes(profile.market)) {
    errors.push({ field: 'market', reason: 'must be KR | JP | EN | ZH' });
  }
  if (!profile.word_count_per_chapter
    || typeof profile.word_count_per_chapter.min !== 'number'
    || typeof profile.word_count_per_chapter.max !== 'number'
    || typeof profile.word_count_per_chapter.recommended !== 'number') {
    errors.push({ field: 'word_count_per_chapter', reason: 'required { min, max, recommended }' });
  } else {
    const { min, max, recommended } = profile.word_count_per_chapter;
    if (min < 0 || max < min || recommended < min || recommended > max) {
      errors.push({ field: 'word_count_per_chapter', reason: 'min ≤ recommended ≤ max required' });
    }
  }
  if (!profile.age_rating || !['all_ages', 'teen_15', 'mature_18', 'r18'].includes(profile.age_rating)) {
    errors.push({ field: 'age_rating', reason: 'invalid value' });
  }
  if (!profile.rule_pack_version || typeof profile.rule_pack_version !== 'string') {
    errors.push({ field: 'rule_pack_version', reason: 'required (commercial license metadata)' });
  }
  if (!profile.rule_pack_source
    || !['commercial_license', 'community', 'official_api'].includes(profile.rule_pack_source)) {
    errors.push({ field: 'rule_pack_source', reason: 'invalid value' });
  }

  if (errors.length > 0) return { ok: false, errors };
  // At this point all required fields validated.
  return { ok: true, profile: profile as PlatformProfile };
}

// ============================================================
// PART 2 — Word count fit (0..1 normalized)
// ============================================================

/**
 * 1.0 when within [min, max], decaying linearly toward 0 outside.
 * Decay window = 50% of recommended length on each side.
 */
function wordCountFit(actual: number, profile: PlatformProfile): number {
  const { min, max, recommended } = profile.word_count_per_chapter;
  if (actual >= min && actual <= max) {
    // Within window — closer to recommended is slightly better, but all values OK.
    const distance = Math.abs(actual - recommended);
    const halfRange = (max - min) / 2 || 1;
    return Math.max(0.9, 1 - 0.1 * (distance / halfRange));
  }
  // Outside window — decay linearly over 50% of recommended.
  const decay = recommended * 0.5;
  if (actual < min) {
    return Math.max(0, 1 - (min - actual) / decay);
  }
  return Math.max(0, 1 - (actual - max) / decay);
}

// ============================================================
// PART 3 — Age rating compatibility
// ============================================================

const AGE_RATING_ORDER: Record<AgeRating, number> = {
  all_ages: 0,
  teen_15: 1,
  mature_18: 2,
  r18: 3,
};

/**
 * Returns 1.0 if content rating ≤ platform max; 0.0 otherwise.
 * Binary — platforms enforce hard caps.
 */
function ageRatingFit(contentRating: AgeRating, profile: PlatformProfile): number {
  return AGE_RATING_ORDER[contentRating] <= AGE_RATING_ORDER[profile.age_rating] ? 1 : 0;
}

// ============================================================
// PART 4 — Fitness scoring
// ============================================================

export interface FitnessInput {
  episode_index: number;
  word_count: number;
  /** Loreguard internal genre tags. */
  genre_tags: string[];
  /** Content rating self-declaration. */
  content_rating: AgeRating;
  /** Forbidden codes triggered by manuscript scan (e.g. ['KO-T01', 'ZH-W02']). */
  triggered_forbidden_codes: string[];
}

/**
 * Compute fitness score for one episode against one platform.
 * Returns weighted overall (0..100) plus violation list.
 */
export function computePlatformFitness(
  input: FitnessInput,
  profile: PlatformProfile,
): PlatformFitnessScore {
  const wcRaw = wordCountFit(input.word_count, profile);

  // Genre fit — overlap of episode tags with platform allowed genres.
  // Empty constraint list = unrestricted (full pass).
  let genreRaw = 1;
  if (profile.genre_constraints.length > 0 && input.genre_tags.length > 0) {
    const allowed = new Set(profile.genre_constraints.map((g) => g.toLowerCase()));
    const matches = input.genre_tags.filter((g) => allowed.has(g.toLowerCase())).length;
    genreRaw = matches / input.genre_tags.length;
  }

  const ageRaw = ageRatingFit(input.content_rating, profile);

  // Forbidden content — each triggered code that matches platform's forbidden list = violation.
  const platformForbidden = new Set(profile.forbidden_content_codes);
  const violations: PlatformFitnessScore['violations'] = [];

  for (const code of input.triggered_forbidden_codes) {
    if (platformForbidden.has(code)) {
      const severity: ViolationSeverity = code.includes('T01') || code.includes('T02')
        ? 'blocker'
        : code.includes('T0') ? 'warning' : 'info';
      violations.push({
        code,
        severity,
        description: `Forbidden content code ${code} triggered for platform ${profile.platform_name}`,
        suggested_fix: 'Review the flagged content section and revise per platform guidelines.',
      });
    }
  }

  // Forbidden fit — 1.0 if no platform-level forbidden codes triggered; decay otherwise.
  const platformBlockers = violations.filter((v) => v.severity === 'blocker').length;
  const platformWarnings = violations.filter((v) => v.severity === 'warning').length;
  const forbiddenRaw = Math.max(0, 1 - platformBlockers * 0.5 - platformWarnings * 0.1);

  // Word-count edge violations
  if (wcRaw < 1.0) {
    violations.push({
      code: 'platform.word_count.out_of_range',
      severity: wcRaw < 0.3 ? 'blocker' : 'warning',
      description: `Episode word count ${input.word_count} outside platform range [${profile.word_count_per_chapter.min}, ${profile.word_count_per_chapter.max}]`,
      suggested_fix: `Adjust toward recommended ~${profile.word_count_per_chapter.recommended}`,
    });
  }

  if (ageRaw < 1.0) {
    violations.push({
      code: 'platform.age_rating.exceeded',
      severity: 'blocker',
      description: `Content rating ${input.content_rating} exceeds platform max ${profile.age_rating}`,
      suggested_fix: 'Tone down content, or switch to a higher-rating platform.',
    });
  }

  // Weighted overall (0..100)
  const overall =
    wcRaw * 0.3
    + genreRaw * 0.3
    + ageRaw * 0.2
    + forbiddenRaw * 0.2;

  return {
    platform_id: profile.platform_id,
    episode_index: input.episode_index,
    word_count_fit: Math.round(wcRaw * 100),
    genre_fit: Math.round(genreRaw * 100),
    age_rating_fit: Math.round(ageRaw * 100),
    forbidden_content_fit: Math.round(forbiddenRaw * 100),
    overall: Math.round(overall * 100),
    violations,
    computed_at: new Date().toISOString(),
  };
}

// ============================================================
// PART 5 — Compliance hook: platform-rating-check
// ============================================================

/**
 * Convert per-platform fitness violations into Compliance findings.
 * Maps platform severity → Compliance severity.
 */
export function runPlatformRatingCheck(
  scores: readonly PlatformFitnessScore[],
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];

  if (scores.length === 0) {
    // No rule pack loaded — emit trace-level info
    findings.push({
      hook_id: 'platform-rating-check',
      module_id: 'M18',
      severity: 'trace' as Severity,
      message: 'No platform rule pack loaded. M18 platform-rating-check skipped.',
    });
    return findings;
  }

  for (const score of scores) {
    for (const v of score.violations) {
      const sev: Severity =
        v.severity === 'blocker' ? 'blocker'
        : v.severity === 'warning' ? 'warning'
        : 'info';
      findings.push({
        hook_id: 'platform-rating-check',
        module_id: 'M18',
        severity: sev,
        message: `${score.platform_id}: ${v.description}`,
        evidence: { code: v.code, score_overall: score.overall },
        suggested_fix: v.suggested_fix,
        episode: score.episode_index,
      });
    }
  }

  return findings;
}
