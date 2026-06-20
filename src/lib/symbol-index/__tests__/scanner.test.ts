// ============================================================
// scanner.test.ts — Symbol Scanner 단위 테스트
// ============================================================

import { scanTextForSymbols, scanAllEpisodes } from '../scanner';
import { buildSymbolIndex } from '../builder';
import type { StoryConfig, Character } from '@/lib/studio-types';

function ch(id: string, name: string): Character {
  return { id, name, role: 'r', traits: 't', appearance: '', dna: 0 };
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

describe('scanTextForSymbols', () => {
  test('빈 텍스트 → 빈 array', () => {
    const idx = buildSymbolIndex(makeConfig([ch('c1', '김준')]), []);
    expect(scanTextForSymbols('', idx, 1)).toEqual([]);
    expect(scanTextForSymbols(null, idx, 1)).toEqual([]);
  });

  test('빈 surfaceMap → 빈 array', () => {
    const idx = buildSymbolIndex(makeConfig([]), []);
    expect(scanTextForSymbols('어떤 텍스트', idx, 1)).toEqual([]);
  });

  test('단일 캐릭터 매칭', () => {
    const idx = buildSymbolIndex(makeConfig([ch('c1', '김준')]), []);
    const refs = scanTextForSymbols('김준은 검을 들었다.', idx, 1);
    expect(refs).toHaveLength(1);
    expect(refs[0].symbolId).toBe('character:c1');
    expect(refs[0].surfaceForm).toBe('김준');
    expect(refs[0].charOffset).toBe(0);
    expect(refs[0].context).toContain('김준은 검을');
  });

  test('다회 등장 — 모두 추출', () => {
    const idx = buildSymbolIndex(makeConfig([ch('c1', '김준')]), []);
    const refs = scanTextForSymbols('김준이 말했다. "김준이라고 합니다."', idx, 5);
    expect(refs).toHaveLength(2);
    expect(refs[0].episodeId).toBe(5);
    expect(refs[1].charOffset).toBeGreaterThan(refs[0].charOffset);
  });

  test('가장 긴 매치 우선 — 김준호 vs 김준', () => {
    const idx = buildSymbolIndex(
      makeConfig([ch('c1', '김준'), ch('c2', '김준호')]),
      [],
    );
    const refs = scanTextForSymbols('김준호가 왔다.', idx, 1);
    expect(refs).toHaveLength(1);
    expect(refs[0].symbolId).toBe('character:c2'); // 김준호 우선
  });

  test('scanAllEpisodes — 전체 합계', () => {
    const idx = buildSymbolIndex(makeConfig([ch('c1', '김준')]), []);
    const eps = [
      { episode: 1, title: 'A', content: '김준이', charCount: 3, lastUpdate: 0 },
      { episode: 2, title: 'B', content: '김준은 김준이다', charCount: 8, lastUpdate: 0 },
      { episode: 3, title: 'C', content: '아무도 없음', charCount: 5, lastUpdate: 0 },
    ];
    const refs = scanAllEpisodes(eps, idx);
    expect(refs).toHaveLength(3); // ep1: 1, ep2: 2, ep3: 0
    expect(refs.filter((r) => r.episodeId === 2)).toHaveLength(2);
  });
});
