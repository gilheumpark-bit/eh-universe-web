// ============================================================
// PART 1 — Legacy boolean flag tests (원본 유지)
// ============================================================

import {
  isFeatureEnabled,
  isFeatureEnabledServer,
  getAllFlags,
  getJournalEngineMode,
  isJournalEngineOn,
  isJournalEngineShadow,
  isJournalEngineActive,
} from '../feature-flags';

describe('feature-flags', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    localStorage.clear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isFeatureEnabled', () => {
    test('returns default value for IMAGE_GENERATION (true)', () => {
      expect(isFeatureEnabled('IMAGE_GENERATION')).toBe(true);
    });

    test('returns default value for OFFLINE_CACHE (true)', () => {
      expect(isFeatureEnabled('OFFLINE_CACHE')).toBe(true);
    });

    test('env override true takes precedence over default false', () => {
      process.env['NEXT_PUBLIC_FF_OFFLINE_CACHE'] = 'true';
      expect(isFeatureEnabled('OFFLINE_CACHE')).toBe(true);
    });

    test('env override false takes precedence over default true', () => {
      process.env['NEXT_PUBLIC_FF_IMAGE_GENERATION'] = 'false';
      expect(isFeatureEnabled('IMAGE_GENERATION')).toBe(false);
    });

    test('localStorage override true takes precedence over env and default', () => {
      process.env['NEXT_PUBLIC_FF_CODE_STUDIO'] = 'false';
      localStorage.setItem('ff_CODE_STUDIO', 'true');
      expect(isFeatureEnabled('CODE_STUDIO')).toBe(true);
    });

    test('localStorage override false takes precedence', () => {
      localStorage.setItem('ff_IMAGE_GENERATION', 'false');
      expect(isFeatureEnabled('IMAGE_GENERATION')).toBe(false);
    });

    test('ignores non-boolean localStorage values and falls through', () => {
      localStorage.setItem('ff_OFFLINE_CACHE', 'maybe');
      expect(isFeatureEnabled('OFFLINE_CACHE')).toBe(true);
    });
  });

  describe('getAllFlags', () => {
    test('returns an object with all flag keys', () => {
      const flags = getAllFlags();
      expect(flags).toHaveProperty('IMAGE_GENERATION');
      expect(flags).toHaveProperty('GOOGLE_DRIVE_BACKUP');
      expect(flags).toHaveProperty('NETWORK_COMMUNITY');
      expect(flags).toHaveProperty('OFFLINE_CACHE');
      expect(flags).toHaveProperty('CODE_STUDIO');
      expect(flags).toHaveProperty('EPISODE_COMPARE');
      expect(flags).toHaveProperty('FEATURE_JOURNAL_ENGINE');
    });

    test('reflects env overrides', () => {
      process.env['NEXT_PUBLIC_FF_CODE_STUDIO'] = 'true';
      const flags = getAllFlags();
      expect(flags.CODE_STUDIO).toBe(true);
    });

    test('FEATURE_JOURNAL_ENGINE returns JournalEngineMode, default off', () => {
      const flags = getAllFlags();
      expect(flags.FEATURE_JOURNAL_ENGINE).toBe('off');
    });
  });

  // ============================================================
  // PART 2 — Journal Engine 3-mode helpers
  // ============================================================

  describe('getJournalEngineMode (3-mode enum)', () => {
    test('default mode is off', () => {
      expect(getJournalEngineMode()).toBe('off');
    });

    test('localStorage "shadow" → shadow', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'shadow');
      expect(getJournalEngineMode()).toBe('shadow');
    });

    test('localStorage "on" → on', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'on');
      expect(getJournalEngineMode()).toBe('on');
    });

    test('localStorage "off" → off', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'off');
      expect(getJournalEngineMode()).toBe('off');
    });

    test('localStorage invalid value → default off (no throw)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'garbage');
      expect(getJournalEngineMode()).toBe('off');
    });

    test('legacy boolean localStorage "true" → on (backward compat)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'true');
      expect(getJournalEngineMode()).toBe('on');
    });

    test('legacy boolean localStorage "false" → off (backward compat)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'false');
      expect(getJournalEngineMode()).toBe('off');
    });

    test('env override "shadow" → shadow', () => {
      process.env['NEXT_PUBLIC_FF_FEATURE_JOURNAL_ENGINE'] = 'shadow';
      expect(getJournalEngineMode()).toBe('shadow');
    });

    test('env override legacy "true" → on', () => {
      process.env['NEXT_PUBLIC_FF_FEATURE_JOURNAL_ENGINE'] = 'true';
      expect(getJournalEngineMode()).toBe('on');
    });
  });

  describe('isJournalEngineOn', () => {
    test('off → false', () => {
      expect(isJournalEngineOn()).toBe(false);
    });

    test('shadow → false (쓰기는 하되 primary 아님)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'shadow');
      expect(isJournalEngineOn()).toBe(false);
    });

    test('on → true', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'on');
      expect(isJournalEngineOn()).toBe(true);
    });

    test('legacy boolean "true" → true (역호환)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'true');
      expect(isJournalEngineOn()).toBe(true);
    });

    test('legacy boolean "false" → false (역호환)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'false');
      expect(isJournalEngineOn()).toBe(false);
    });

    test('isFeatureEnabled("FEATURE_JOURNAL_ENGINE")도 동일 결과 (deprecated 경로)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'on');
      expect(isFeatureEnabled('FEATURE_JOURNAL_ENGINE')).toBe(true);
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'shadow');
      expect(isFeatureEnabled('FEATURE_JOURNAL_ENGINE')).toBe(false);
    });
  });

  describe('isJournalEngineShadow', () => {
    test('off → false', () => {
      expect(isJournalEngineShadow()).toBe(false);
    });

    test('shadow → true', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'shadow');
      expect(isJournalEngineShadow()).toBe(true);
    });

    test('on → false (shadow 아님)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'on');
      expect(isJournalEngineShadow()).toBe(false);
    });

    test('legacy "true" → false (shadow 아님)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'true');
      expect(isJournalEngineShadow()).toBe(false);
    });
  });

  describe('isJournalEngineActive (shadow OR on)', () => {
    test('off → false', () => {
      expect(isJournalEngineActive()).toBe(false);
    });

    test('shadow → true', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'shadow');
      expect(isJournalEngineActive()).toBe(true);
    });

    test('on → true', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'on');
      expect(isJournalEngineActive()).toBe(true);
    });

    test('legacy "true" → true', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'true');
      expect(isJournalEngineActive()).toBe(true);
    });

    test('invalid → false (default off)', () => {
      localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', '???');
      expect(isJournalEngineActive()).toBe(false);
    });
  });

  // ============================================================
  // PART 3 — Server helper (localStorage 무시)
  // ============================================================

  describe('isFeatureEnabledServer', () => {
    test('FEATURE_JOURNAL_ENGINE default → false', () => {
      expect(isFeatureEnabledServer('FEATURE_JOURNAL_ENGINE')).toBe(false);
    });

    test('env "on" → true', () => {
      process.env['NEXT_PUBLIC_FF_FEATURE_JOURNAL_ENGINE'] = 'on';
      expect(isFeatureEnabledServer('FEATURE_JOURNAL_ENGINE')).toBe(true);
    });

    test('env "shadow" → false (shadow ≠ on)', () => {
      process.env['NEXT_PUBLIC_FF_FEATURE_JOURNAL_ENGINE'] = 'shadow';
      expect(isFeatureEnabledServer('FEATURE_JOURNAL_ENGINE')).toBe(false);
    });

    test('boolean flag passthrough', () => {
      expect(isFeatureEnabledServer('IMAGE_GENERATION')).toBe(true);
      process.env['NEXT_PUBLIC_FF_IMAGE_GENERATION'] = 'false';
      expect(isFeatureEnabledServer('IMAGE_GENERATION')).toBe(false);
    });
  });
});
