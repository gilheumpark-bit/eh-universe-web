import { buildCharacterStateAt } from '../state-snapshot';
import type { Character, EpisodeManuscript } from '@/lib/studio-types';

function ch(id: string, name: string): Character {
  return { id, name, role: 'r', traits: 't', appearance: '', dna: 0 };
}

function ep(num: number, content: string): EpisodeManuscript {
  return { episode: num, title: `EP${num}`, content, charCount: content.length, lastUpdate: 0 };
}

describe('buildCharacterStateAt', () => {
  test('빈 입력 → 빈 array', () => {
    expect(buildCharacterStateAt([], [], 1)).toEqual([]);
    expect(buildCharacterStateAt(undefined, undefined, 1)).toEqual([]);
  });

  test('emotion 감지 — 슬픔', () => {
    const states = buildCharacterStateAt(
      [ch('c1', '김준')],
      [ep(1, '김준은 슬픔에 잠겼다.')],
      1,
    );
    expect(states[0].emotion).toBe('슬픔');
  });

  test('inventory 감지', () => {
    const states = buildCharacterStateAt(
      [ch('c1', '김준')],
      [ep(1, '김준은 검을 들었다.')],
      1,
    );
    expect(states[0].inventory).toContain('검');
  });

  test('upToEpisodeId 제한', () => {
    const eps = [ep(1, '김준은 기쁨'), ep(2, '김준은 분노'), ep(3, '김준은 공포')];
    const ep2 = buildCharacterStateAt([ch('c1', '김준')], eps, 2);
    // ep2까지 누적 → 최신 emotion = 분노
    expect(ep2[0].emotion).toBe('분노');
  });

  test('knowledge 누적', () => {
    const states = buildCharacterStateAt(
      [ch('c1', '박서연')],
      [ep(1, '박서연은 진실을 알게 되었다.')],
      1,
    );
    expect(states[0].knowledge?.length).toBeGreaterThan(0);
  });
});
