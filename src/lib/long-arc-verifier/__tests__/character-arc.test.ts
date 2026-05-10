import { runCharacterArcAxis } from '../character-arc-tracker';
import type { Character, EpisodeManuscript } from '@/lib/studio-types';

function ch(id: string, name: string): Character {
  return { id, name, role: 'r', traits: 't', appearance: '', dna: 0 };
}

function ep(num: number, content: string): EpisodeManuscript {
  return { episode: num, title: `EP${num}`, content, charCount: content.length, lastUpdate: 0 };
}

describe('runCharacterArcAxis', () => {
  test('빈 입력 → score 100', () => {
    expect(runCharacterArcAxis([], []).score).toBe(100);
    expect(runCharacterArcAxis(undefined, undefined).score).toBe(100);
  });

  test('정상 등장 패턴 → 위반 없음', () => {
    const chars = [ch('c1', '김준')];
    const eps = [ep(1, '김준'), ep(2, '김준'), ep(3, '김준')];
    const r = runCharacterArcAxis(chars, eps);
    expect(r.violations).toEqual([]);
  });

  test('장기 미등장 후 갑작스러운 다회 등장 → 위반', () => {
    const chars = [ch('c1', '박서연')];
    const eps = [
      ep(1, '박서연'),
      ...Array.from({ length: 12 }, (_, i) => ep(i + 2, '아무도 없음')),
      ep(15, '박서연 박서연 박서연 박서연 박서연 박서연'),
    ];
    const r = runCharacterArcAxis(chars, eps);
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.violations[0].kind).toBe('character-arc-inconsistency');
  });

  test('1글자 이름 무시', () => {
    const chars = [ch('c1', '김')];
    const eps = [ep(1, '김')];
    const r = runCharacterArcAxis(chars, eps);
    expect(r.violations).toEqual([]);
  });
});
