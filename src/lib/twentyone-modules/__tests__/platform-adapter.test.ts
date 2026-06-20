import {
  validatePlatformProfile,
  computePlatformFitness,
  runPlatformRatingCheck,
  type FitnessInput,
} from '../platform-adapter';
import type { PlatformProfile, AgeRating } from '../types';

const naverRomance: PlatformProfile = {
  platform_id: 'naver_romance',
  platform_name: 'Naver Romance',
  market: 'KR',
  word_count_per_chapter: { min: 4000, max: 6000, recommended: 5000 },
  genre_constraints: ['romance', 'romantasy'],
  age_rating: 'teen_15',
  upload_format: 'web_serial',
  monetization: 'paid_chapters',
  forbidden_content_codes: ['KO-T01', 'KO-T02'],
  rule_pack_version: '1.0.0',
  rule_pack_source: 'commercial_license',
  last_updated: '2026-05-11T00:00:00Z',
};

describe('twentyone-modules/platform-adapter', () => {
  describe('validatePlatformProfile', () => {
    it('passes a fully-formed profile', () => {
      const result = validatePlatformProfile(naverRomance);
      expect(result.ok).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = validatePlatformProfile({ platform_id: 'x' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(3);
        expect(result.errors.find((e) => e.field === 'platform_name')).toBeDefined();
      }
    });

    it('rejects invalid word_count range (min > max)', () => {
      const bad: Partial<PlatformProfile> = {
        ...naverRomance,
        word_count_per_chapter: { min: 6000, max: 4000, recommended: 5000 },
      };
      const result = validatePlatformProfile(bad);
      expect(result.ok).toBe(false);
    });

    it('rejects invalid age_rating value', () => {
      const bad: Partial<PlatformProfile> = {
        ...naverRomance,
        age_rating: 'invalid_rating' as AgeRating,
      };
      const result = validatePlatformProfile(bad);
      expect(result.ok).toBe(false);
    });
  });

  describe('computePlatformFitness', () => {
    const baseInput: FitnessInput = {
      episode_index: 1,
      word_count: 5000,
      genre_tags: ['romance'],
      content_rating: 'teen_15',
      triggered_forbidden_codes: [],
    };

    it('returns 100 word_count_fit at recommended length', () => {
      const score = computePlatformFitness(baseInput, naverRomance);
      expect(score.word_count_fit).toBeGreaterThanOrEqual(90);
    });

    it('returns lower word_count_fit and warning at edge', () => {
      const score = computePlatformFitness(
        { ...baseInput, word_count: 3000 },
        naverRomance,
      );
      expect(score.word_count_fit).toBeLessThan(100);
      const violation = score.violations.find((v) => v.code === 'platform.word_count.out_of_range');
      expect(violation).toBeDefined();
    });

    it('emits blocker when content rating exceeds platform max', () => {
      const score = computePlatformFitness(
        { ...baseInput, content_rating: 'r18' },
        naverRomance,
      );
      expect(score.age_rating_fit).toBe(0);
      const blocker = score.violations.find((v) => v.code === 'platform.age_rating.exceeded');
      expect(blocker?.severity).toBe('blocker');
    });

    it('flags forbidden content codes per platform list', () => {
      const score = computePlatformFitness(
        { ...baseInput, triggered_forbidden_codes: ['KO-T01'] },
        naverRomance,
      );
      const v = score.violations.find((x) => x.code === 'KO-T01');
      expect(v?.severity).toBe('blocker');
      expect(score.forbidden_content_fit).toBeLessThan(100);
    });

    it('genre_fit reflects allowed-genre overlap', () => {
      const score = computePlatformFitness(
        { ...baseInput, genre_tags: ['scifi'] },  // not in romance/romantasy
        naverRomance,
      );
      expect(score.genre_fit).toBe(0);
    });

    it('overall is weighted (~ wc 0.3 + genre 0.3 + age 0.2 + forbidden 0.2)', () => {
      const score = computePlatformFitness(baseInput, naverRomance);
      expect(score.overall).toBeGreaterThan(80);
      expect(score.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('runPlatformRatingCheck', () => {
    it('returns trace finding when no scores provided', () => {
      const findings = runPlatformRatingCheck([]);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('trace');
    });

    it('maps violations to Compliance findings', () => {
      const score = computePlatformFitness(
        {
          episode_index: 1,
          word_count: 2000,
          genre_tags: ['romance'],
          content_rating: 'teen_15',
          triggered_forbidden_codes: ['KO-T01'],
        },
        naverRomance,
      );
      const findings = runPlatformRatingCheck([score]);
      expect(findings.length).toBeGreaterThan(0);
      const blocker = findings.find((f) => f.severity === 'blocker');
      expect(blocker).toBeDefined();
      expect(blocker?.module_id).toBe('M18');
    });
  });
});
