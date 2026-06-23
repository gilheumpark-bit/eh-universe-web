import { getFallbackPreference, setFallbackPreference } from '../useSparkHealth';

describe('connection key auto-switch preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps provider auto-switch disabled by default for manuscript protection', () => {
    expect(getFallbackPreference()).toBe(false);
  });

  it('persists explicit opt-in and opt-out', () => {
    setFallbackPreference(true);
    expect(window.localStorage.getItem('noa_byok_fallback_enabled')).toBe('1');
    expect(getFallbackPreference()).toBe(true);

    setFallbackPreference(false);
    expect(window.localStorage.getItem('noa_byok_fallback_enabled')).toBe('0');
    expect(getFallbackPreference()).toBe(false);
  });
});
