// ============================================================
// find-references.test.ts — Find All References + HoverInfo 테스트
// ============================================================

import { findReferences, buildHoverInfo } from '../find-references';
import { findDefinition, findDefinitionBySurface } from '../find-definition';
import { buildSymbolIndex } from '../builder';
import type { StoryConfig, Character, EpisodeManuscript } from '@/lib/studio-types';

function ch(id: string, name: string, speechStyle?: string): Character {
  return { id, name, role: 'r', traits: 't', appearance: '', dna: 0, ...(speechStyle ? { speechStyle } : {}) };
}

function makeConfig(chars: Character[]): StoryConfig {
  return {
    genre: 'fantasy',
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: '',
    totalEpisodes: 10,
    guardrails: { language: 'KO' } as unknown as StoryConfig['guardrails'],
    characters: chars,
    platform: 'web',
  } as unknown as StoryConfig;
}

function ep(num: number, content: string): EpisodeManuscript {
  return { episode: num, title: `EP${num}`, content, charCount: content.length, lastUpdate: 0 };
}

describe('findReferences', () => {
  test('미존재 symbolId → totalCount 0', () => {
    const idx = buildSymbolIndex(makeConfig([ch('c1', '김준')]), []);
    const result = findReferences('character:nonexistent', [], idx);
    expect(result.totalCount).toBe(0);
    expect(result.byEpisode.size).toBe(0);
  });

  test('episode 빈 list → totalCount 0', () => {
    const idx = buildSymbolIndex(makeConfig([ch('c1', '김준')]), []);
    const result = findReferences('character:c1', [], idx);
    expect(result.totalCount).toBe(0);
    expect(result.symbolName).toBe('김준');
  });

  test('여러 화 등장 → byEpisode 그룹', () => {
    const config = makeConfig([ch('c1', '김준')]);
    const eps = [
      ep(1, '김준이 등장한다'),
      ep(2, '김준은 검을 들었다. 김준은 강하다.'),
      ep(3, '다른 사람만'),
    ];
    const idx = buildSymbolIndex(config, eps);
    const result = findReferences('character:c1', eps, idx);

    expect(result.totalCount).toBe(3); // ep1: 1, ep2: 2
    expect(result.byEpisode.get(1)).toHaveLength(1);
    expect(result.byEpisode.get(2)).toHaveLength(2);
    expect(result.byEpisode.has(3)).toBe(false);
  });

  test('context ±50자 컷', () => {
    const config = makeConfig([ch('c1', '김준')]);
    const longText = 'A'.repeat(100) + '김준' + 'B'.repeat(100);
    const eps = [ep(1, longText)];
    const idx = buildSymbolIndex(config, eps);
    const result = findReferences('character:c1', eps, idx);
    expect(result.references[0].context.length).toBeLessThanOrEqual(102 + 50 + 50); // surface + ±50
  });
});

describe('buildHoverInfo', () => {
  test('캐릭터 hover — speechSignature 포함', () => {
    const chars = [ch('c1', '김준', '간결하고 단호한 어조')];
    const config = makeConfig(chars);
    const eps = [ep(1, '김준이 말했다'), ep(5, '김준은 답했다')];
    const idx = buildSymbolIndex(config, eps);
    const hi = buildHoverInfo('character:c1', eps, idx, chars);
    expect(hi).not.toBeNull();
    expect(hi!.speechSignature).toBe('간결하고 단호한 어조');
    expect(hi!.totalReferences).toBe(2);
    expect(hi!.recentEpisodes).toEqual([5, 1]); // 최신순
  });

  test('미존재 symbol → null', () => {
    const idx = buildSymbolIndex(makeConfig([]), []);
    expect(buildHoverInfo('character:nope', [], idx, undefined)).toBeNull();
  });
});

describe('findDefinition', () => {
  test('id → 정의', () => {
    const idx = buildSymbolIndex(makeConfig([ch('c1', '김준')]), []);
    const result = findDefinition('character:c1', idx);
    expect(result.found).toBe(true);
    expect(result.symbol?.name).toBe('김준');
    expect(result.symbol?.jumpTarget.tab).toBe('characters');
  });

  test('미존재 id → found false', () => {
    const idx = buildSymbolIndex(makeConfig([]), []);
    expect(findDefinition('character:nope', idx).found).toBe(false);
  });

  test('surface → 정의', () => {
    const idx = buildSymbolIndex(makeConfig([ch('c1', '김준')]), []);
    expect(findDefinitionBySurface('김준', idx).found).toBe(true);
    expect(findDefinitionBySurface('알수없음', idx).found).toBe(false);
  });
});
