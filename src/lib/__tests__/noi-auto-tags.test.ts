import { extractConsistencyTags, extractAllConsistencyTags, buildConsistencyFragment } from '../noi-auto-tags';
import { Character } from '../studio-types';

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    name: 'TestChar',
    role: 'protagonist',
    traits: '',
    appearance: '',
    dna: 0,
    ...overrides,
  };
}

describe('noi-auto-tags', () => {
  describe('extractConsistencyTags', () => {
    it('returns empty array when no appearance info', () => {
      const tags = extractConsistencyTags(makeChar());
      expect(tags).toEqual([]);
    });

    it('extracts hair keywords (Korean)', () => {
      const tags = extractConsistencyTags(makeChar({ appearance: '흑발에 장발' }));
      expect(tags).toContain('black_hair');
      expect(tags).toContain('long_hair');
    });

    it('extracts eye keywords (Korean)', () => {
      const tags = extractConsistencyTags(makeChar({ appearance: '적안의 소유자' }));
      expect(tags).toContain('red_eyes');
    });

    it('extracts body keywords', () => {
      const tags = extractConsistencyTags(makeChar({ appearance: '근육질의 장신, 흉터가 있는' }));
      expect(tags).toContain('muscular');
      expect(tags).toContain('tall');
      expect(tags).toContain('scar');
    });

    it('extracts attire keywords', () => {
      const tags = extractConsistencyTags(makeChar({ appearance: '갑옷을 입고 망토를 두른' }));
      expect(tags).toContain('armor');
      expect(tags).toContain('cape');
    });

    it('reads from symbol and externalPerception fields', () => {
      const tags = extractConsistencyTags(makeChar({
        symbol: 'glasses',
        externalPerception: 'tall and slim',
      }));
      expect(tags).toContain('glasses');
      expect(tags).toContain('tall');
      expect(tags).toContain('slim');
    });

    it('does not produce duplicates', () => {
      const tags = extractConsistencyTags(makeChar({
        appearance: 'black hair, 흑발',
      }));
      const blackHairCount = tags.filter(t => t === 'black_hair').length;
      expect(blackHairCount).toBe(1);
    });

    it('extracts English keywords', () => {
      const tags = extractConsistencyTags(makeChar({ appearance: 'blonde ponytail, blue eyes, hoodie' }));
      expect(tags).toContain('blonde_hair');
      expect(tags).toContain('ponytail');
      expect(tags).toContain('blue_eyes');
      expect(tags).toContain('hoodie');
    });
  });

  describe('extractAllConsistencyTags', () => {
    it('returns empty object for empty array', () => {
      expect(extractAllConsistencyTags([])).toEqual({});
    });

    it('maps character ids to tags', () => {
      const chars = [
        makeChar({ id: 'a', appearance: '금발' }),
        makeChar({ id: 'b', appearance: '' }),
        makeChar({ id: 'c', appearance: '갑옷' }),
      ];
      const result = extractAllConsistencyTags(chars);
      expect(result['a']).toContain('blonde_hair');
      expect(result['b']).toBeUndefined(); // no tags -> not included
      expect(result['c']).toContain('armor');
    });
  });

  describe('buildConsistencyFragment', () => {
    it('returns empty string when no tags', () => {
      expect(buildConsistencyFragment(makeChar())).toBe('');
    });

    it('returns formatted fragment', () => {
      const result = buildConsistencyFragment(makeChar({ name: 'Alice', appearance: '은발' }));
      expect(result).toBe('[Alice: silver_hair]');
    });

    it('joins multiple tags with comma', () => {
      const result = buildConsistencyFragment(makeChar({ name: 'Bob', appearance: '흑발 적안 갑옷' }));
      expect(result).toContain('Bob');
      expect(result).toContain(', ');
    });
  });
});
