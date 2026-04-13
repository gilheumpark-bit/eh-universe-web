import { ENGINE_VERSION, SYSTEM_INSTRUCTION, GENRE_LABELS } from '../engine-config';
import { Genre } from '../../lib/studio-types';

describe('engine-config', () => {
  test('ENGINE_VERSION is a non-empty string', () => {
    expect(typeof ENGINE_VERSION).toBe('string');
    expect(ENGINE_VERSION.length).toBeGreaterThan(0);
  });

  test('SYSTEM_INSTRUCTION contains expected keywords', () => {
    expect(SYSTEM_INSTRUCTION).toContain('NOA');
    expect(SYSTEM_INSTRUCTION).toContain('ANS');
    expect(SYSTEM_INSTRUCTION).toContain('EH');
  });

  test('GENRE_LABELS covers all four languages', () => {
    expect(Object.keys(GENRE_LABELS)).toEqual(
      expect.arrayContaining(['KO', 'EN', 'JP', 'CN']),
    );
  });

  test('each language has labels for all Genre enum values', () => {
    const allGenres = Object.values(Genre);
    for (const lang of ['KO', 'EN', 'JP', 'CN'] as const) {
      for (const g of allGenres) {
        expect(GENRE_LABELS[lang][g]).toBeDefined();
        expect(typeof GENRE_LABELS[lang][g]).toBe('string');
      }
    }
  });
});
