import { runPlotDriftAxis, computePlotDriftScore } from '../plot-drift';
import type { EpisodeManuscript } from '@/lib/studio-types';

function ep(num: number, content: string): EpisodeManuscript {
  return { episode: num, title: `EP${num}`, content, charCount: content.length, lastUpdate: 0 };
}

describe('runPlotDriftAxis', () => {
  test('빈 시놉시스 → score 100', () => {
    const r = runPlotDriftAxis(undefined, [ep(1, '아무 본문')]);
    expect(r.score).toBe(100);
    expect(r.violations).toEqual([]);
  });

  test('빈 episodes → score 100', () => {
    const r = runPlotDriftAxis('주인공이 마법을 배운다', []);
    expect(r.score).toBe(100);
  });

  test('완전 일치 텍스트 → score 높음', () => {
    const syn = '주인공 김준이 마법을 배우는 이야기';
    const eps = [ep(1, '주인공 김준이 마법을 배운다')];
    const r = runPlotDriftAxis(syn, eps);
    expect(r.score).toBeGreaterThan(40);
  });

  test('무관 텍스트 → 위반 발생', () => {
    const syn = '주인공 김준이 마법 학교에서 모험';
    const eps = [ep(1, '치킨이 맛있다 햄버거 피자 콜라')];
    const r = runPlotDriftAxis(syn, eps);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  test('computePlotDriftScore — Jaccard', () => {
    const s = computePlotDriftScore('가나다 라마바', '가나다 사아자');
    expect(s.similarity).toBeGreaterThan(0);
    expect(s.similarity).toBeLessThan(1);
  });
});
