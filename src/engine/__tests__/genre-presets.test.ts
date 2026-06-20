/**
 * Unit tests for genre-presets — GENRE_PRESETS
 */
import { GENRE_PRESETS } from '../genre-presets';

describe('GENRE_PRESETS', () => {
  it('defines ROMANCE preset', () => {
    expect(GENRE_PRESETS.ROMANCE).toBeDefined();
    expect(GENRE_PRESETS.ROMANCE.tensionBase).toBeGreaterThan(0);
  });

  it('defines THRILLER preset', () => {
    expect(GENRE_PRESETS.THRILLER).toBeDefined();
    expect(GENRE_PRESETS.THRILLER.pacing).toBeDefined();
  });

  it('defines SYSTEM_HUNTER preset', () => {
    expect(GENRE_PRESETS.SYSTEM_HUNTER).toBeDefined();
  });

  it('all presets have required fields', () => {
    for (const [_key, preset] of Object.entries(GENRE_PRESETS)) {
      expect(preset.rules).toBeTruthy();
      expect(preset.pacing).toBeTruthy();
      expect(typeof preset.tensionBase).toBe('number');
      expect(preset.cliffTypes).toBeTruthy();
      expect(preset.emotionFocus).toBeTruthy();
    }
  });

  it('has at least 5 genre presets', () => {
    expect(Object.keys(GENRE_PRESETS).length).toBeGreaterThanOrEqual(5);
  });
});
