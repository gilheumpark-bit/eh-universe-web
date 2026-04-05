/**
 * Unit tests for src/lib/tier.ts
 * Covers: tier config lookups, feature gating, generation count tracking,
 *         provider allowlist, edge cases
 */

import type {
  _UserTier,
  _TierLimits,
} from '@/lib/tier';

// ============================================================
// PART 1 — localStorage mock
// ============================================================

const store: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: jest.fn((key: string) => store[key] ?? null),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
  }),
  clear: jest.fn(() => {
    for (const k of Object.keys(store)) delete store[k];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ============================================================
// PART 2 — Module import & helpers
// ============================================================

import {
  getUserTier,
  setUserTier,
  getTierLimits,
  getGenerationCount,
  incrementGenerationCount,
  canGenerate,
  isProviderAllowed,
} from '@/lib/tier';

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ============================================================
// PART 3 — Tests
// ============================================================

describe('tier', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 3-A  Tier config lookups
  // ----------------------------------------------------------

  describe('getTierLimits', () => {
    it('returns free tier config by default', () => {
      const limits = getTierLimits('free');
      expect(limits.aiGenerationsPerMonth).toBe(20);
      expect(limits.providers).toEqual(['gemini']);
      expect(limits.driveSync).toBe(false);
      expect(limits.exportWatermark).toBe(true);
      expect(limits.maxProjects).toBe(1);
      expect(limits.worldSimFull).toBe(false);
      expect(limits.engineReportDetail).toBe(false);
    });

    it('returns pro tier config', () => {
      const limits = getTierLimits('pro');
      expect(limits.aiGenerationsPerMonth).toBe(-1);
      expect(limits.providers).toContain('openai');
      expect(limits.providers).toContain('claude');
      expect(limits.driveSync).toBe(true);
      expect(limits.exportWatermark).toBe(false);
      expect(limits.maxProjects).toBe(-1);
      expect(limits.worldSimFull).toBe(true);
      expect(limits.engineReportDetail).toBe(true);
    });

    it('falls back to getUserTier when no argument given', () => {
      setUserTier('pro');
      const limits = getTierLimits();
      expect(limits.aiGenerationsPerMonth).toBe(-1);
    });
  });

  // ----------------------------------------------------------
  // 3-B  Tier state management
  // ----------------------------------------------------------

  describe('getUserTier / setUserTier', () => {
    it('defaults to free when localStorage is empty', () => {
      expect(getUserTier()).toBe('free');
    });

    it('returns stored tier', () => {
      setUserTier('pro');
      expect(getUserTier()).toBe('pro');
    });

    it('round-trips free explicitly', () => {
      setUserTier('free');
      expect(getUserTier()).toBe('free');
    });
  });

  // ----------------------------------------------------------
  // 3-C  Generation count tracking
  // ----------------------------------------------------------

  describe('getGenerationCount', () => {
    it('returns 0 when no data exists', () => {
      expect(getGenerationCount()).toBe(0);
    });

    it('returns stored count for current month', () => {
      store['noa_gen_month'] = currentMonthStr();
      store['noa_gen_count'] = '7';
      expect(getGenerationCount()).toBe(7);
    });

    it('resets to 0 when month has changed', () => {
      store['noa_gen_month'] = '1999-01';
      store['noa_gen_count'] = '15';
      expect(getGenerationCount()).toBe(0);
      // Also verifies month was updated
      expect(store['noa_gen_month']).toBe(currentMonthStr());
    });
  });

  describe('incrementGenerationCount', () => {
    it('increments from 0', () => {
      expect(incrementGenerationCount()).toBe(1);
      expect(getGenerationCount()).toBe(1);
    });

    it('increments consecutively', () => {
      incrementGenerationCount();
      incrementGenerationCount();
      expect(incrementGenerationCount()).toBe(3);
    });

    it('resets and increments when month rolls over', () => {
      store['noa_gen_month'] = '2000-06';
      store['noa_gen_count'] = '99';
      const result = incrementGenerationCount();
      expect(result).toBe(1);
    });
  });

  // ----------------------------------------------------------
  // 3-D  Feature gating
  // ----------------------------------------------------------

  describe('canGenerate', () => {
    it('returns true when count is below free limit', () => {
      // free tier: 20 per month
      expect(canGenerate()).toBe(true);
    });

    it('returns false when free tier limit is reached', () => {
      store['noa_gen_month'] = currentMonthStr();
      store['noa_gen_count'] = '20';
      expect(canGenerate()).toBe(false);
    });

    it('returns true at count 19 (one below limit)', () => {
      store['noa_gen_month'] = currentMonthStr();
      store['noa_gen_count'] = '19';
      expect(canGenerate()).toBe(true);
    });

    it('always returns true for pro tier (unlimited)', () => {
      setUserTier('pro');
      store['noa_gen_month'] = currentMonthStr();
      store['noa_gen_count'] = '999999';
      expect(canGenerate()).toBe(true);
    });
  });

  describe('isProviderAllowed', () => {
    it('allows gemini for free tier', () => {
      expect(isProviderAllowed('gemini')).toBe(true);
    });

    it('blocks openai for free tier', () => {
      expect(isProviderAllowed('openai')).toBe(false);
    });

    it('allows all listed providers for pro tier', () => {
      setUserTier('pro');
      for (const p of ['gemini', 'openai', 'claude', 'groq', 'mistral']) {
        expect(isProviderAllowed(p)).toBe(true);
      }
    });

    it('blocks unknown provider for any tier', () => {
      expect(isProviderAllowed('nonexistent')).toBe(false);
      setUserTier('pro');
      expect(isProviderAllowed('nonexistent')).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 3-E  Edge cases
  // ----------------------------------------------------------

  describe('edge cases', () => {
    it('handles corrupted gen count gracefully (NaN)', () => {
      store['noa_gen_month'] = currentMonthStr();
      store['noa_gen_count'] = 'abc';
      // parseInt('abc', 10) => NaN — verify behavior
      const count = getGenerationCount();
      expect(Number.isNaN(count)).toBe(true);
    });

    it('handles empty string gen count', () => {
      store['noa_gen_month'] = currentMonthStr();
      store['noa_gen_count'] = '';
      // parseInt('', 10) => NaN, but the code uses || '0' fallback
      // localStorage.getItem returns '' which is falsy in || '0'
      // Actually '' || '0' = '0' since empty string is falsy
      expect(getGenerationCount()).toBe(0);
    });

    it('pro tier has strictly more providers than free', () => {
      const freeLimits = getTierLimits('free');
      const proLimits = getTierLimits('pro');
      expect(proLimits.providers.length).toBeGreaterThan(freeLimits.providers.length);
      // Every free provider should be available in pro
      for (const p of freeLimits.providers) {
        expect(proLimits.providers).toContain(p);
      }
    });
  });
});
