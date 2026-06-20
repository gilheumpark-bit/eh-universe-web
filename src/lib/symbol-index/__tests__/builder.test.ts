// ============================================================
// builder.test.ts — Symbol Index Builder 단위 테스트
// ============================================================

import { buildSymbolIndex, createEmptyIndex } from '../builder';
import type { StoryConfig, Character, Item, Skill } from '@/lib/studio-types';

// ============================================================
// PART 1 — Helpers
// ============================================================

function makeChar(id: string, name: string, role = '주인공'): Character {
  return {
    id,
    name,
    role,
    traits: '용감함',
    appearance: '',
    dna: 0,
  };
}

function makeItem(id: string, name: string): Item {
  return {
    id,
    name,
    category: '무기',
    rarity: 'rare',
    description: '강력한 검',
    effect: '+10 공격',
    obtainedFrom: 'quest',
  } as unknown as Item;
}

function makeSkill(id: string, name: string): Skill {
  return {
    id,
    name,
    type: 'active',
    owner: 'char-1',
    description: '강타',
    cost: '10 MP',
    cooldown: '5s',
    rank: 'A',
  };
}

function makeConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: 'fantasy',
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: 'Test',
    totalEpisodes: 10,
    guardrails: { language: 'KO' } as unknown as StoryConfig['guardrails'],
    characters: [],
    platform: 'web',
    ...overrides,
  } as unknown as StoryConfig;
}

// ============================================================
// PART 2 — Tests
// ============================================================

describe('buildSymbolIndex', () => {
  test('null config → empty index', () => {
    const idx = buildSymbolIndex(null, []);
    expect(idx.definitions.size).toBe(0);
    expect(idx.surfaceMap.size).toBe(0);
    expect(idx.byKind.character).toEqual([]);
  });

  test('characters → character symbols', () => {
    const config = makeConfig({
      characters: [makeChar('c1', '김준'), makeChar('c2', '박서연', '조연')],
    });
    const idx = buildSymbolIndex(config, []);
    expect(idx.definitions.size).toBe(2);
    expect(idx.byKind.character).toHaveLength(2);
    expect(idx.surfaceMap.get('김준')).toBe('character:c1');
    expect(idx.surfaceMap.get('박서연')).toBe('character:c2');
  });

  test('items + skills 통합', () => {
    const config = makeConfig({
      characters: [makeChar('c1', '김준')],
      items: [makeItem('i1', '발할라의 검')],
      skills: [makeSkill('s1', '강타')],
    });
    const idx = buildSymbolIndex(config, []);
    expect(idx.byKind.character).toHaveLength(1);
    expect(idx.byKind.item).toHaveLength(1);
    expect(idx.byKind.concept).toHaveLength(1); // 스킬은 concept 분류
    expect(idx.surfaceMap.get('발할라의 검')).toBe('item:i1');
    expect(idx.surfaceMap.get('강타')).toBe('concept:s1');
  });

  test('1글자 이름은 surfaceMap 등록 X (노이즈 방어)', () => {
    const config = makeConfig({
      characters: [makeChar('c1', '준'), makeChar('c2', '김준')],
    });
    const idx = buildSymbolIndex(config, []);
    // 준 (1글자) 은 normalizeSurface 에서 거부 → definitions 자체 등록 안됨
    expect(idx.definitions.has('character:c1')).toBe(false);
    expect(idx.definitions.has('character:c2')).toBe(true);
  });

  test('manuscript hash 산출 — episodes 변경 시 hash 변경', () => {
    const config = makeConfig({ characters: [makeChar('c1', '김준')] });
    const idx1 = buildSymbolIndex(config, [
      { episode: 1, title: 'A', content: '안녕', charCount: 2, lastUpdate: 0 },
    ]);
    const idx2 = buildSymbolIndex(config, [
      { episode: 1, title: 'A', content: '안녕하세요', charCount: 5, lastUpdate: 0 },
    ]);
    expect(idx1.manuscriptHash).not.toBe(idx2.manuscriptHash);
  });

  test('createEmptyIndex 안전한 기본값', () => {
    const idx = createEmptyIndex();
    expect(idx.definitions.size).toBe(0);
    expect(idx.byKind.event).toEqual([]);
    expect(typeof idx.builtAt).toBe('string');
  });
});
