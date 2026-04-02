import { isFeatureEnabled, getAllFlags } from '../feature-flags';

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
    });

    test('reflects env overrides', () => {
      process.env['NEXT_PUBLIC_FF_CODE_STUDIO'] = 'true';
      const flags = getAllFlags();
      expect(flags.CODE_STUDIO).toBe(true);
    });
  });
});
