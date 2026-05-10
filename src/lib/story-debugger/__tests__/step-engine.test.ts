import { nextLocation, buildFrameAt } from '../step-engine';
import type { EpisodeManuscript } from '@/lib/studio-types';

function ep(num: number, content: string): EpisodeManuscript {
  return { episode: num, title: `EP${num}`, content, charCount: content.length, lastUpdate: 0 };
}

describe('nextLocation', () => {
  const eps = [
    ep(1, 'A1\n\nA2\n\nA3'),
    ep(2, 'B1\n\nB2'),
    ep(3, 'C1'),
  ];

  test('step into — 같은 화 다음 paragraph', () => {
    const next = nextLocation({ episodeId: 1, paragraphIdx: 0 }, 'into', eps);
    expect(next).toEqual({ episodeId: 1, paragraphIdx: 1 });
  });

  test('step into — paragraph 끝 → 다음 화', () => {
    const next = nextLocation({ episodeId: 1, paragraphIdx: 2 }, 'into', eps);
    expect(next).toEqual({ episodeId: 2, paragraphIdx: 0 });
  });

  test('step over — 다음 화', () => {
    const next = nextLocation({ episodeId: 1, paragraphIdx: 0 }, 'over', eps);
    expect(next).toEqual({ episodeId: 2, paragraphIdx: 0 });
  });

  test('step out — 현재 화 끝', () => {
    const next = nextLocation({ episodeId: 1, paragraphIdx: 0 }, 'out', eps);
    expect(next?.paragraphIdx).toBe(2);
  });

  test('마지막 화 끝 → null', () => {
    const next = nextLocation({ episodeId: 3, paragraphIdx: 0 }, 'over', eps);
    expect(next).toBeNull();
  });

  test('미존재 episode → null', () => {
    const next = nextLocation({ episodeId: 99, paragraphIdx: 0 }, 'over', eps);
    expect(next).toBeNull();
  });
});

describe('buildFrameAt', () => {
  test('frame 빌드 — paragraphText 포함', () => {
    const eps = [ep(1, '문단1\n\n문단2 떡밥-A')];
    const frame = buildFrameAt({ episodeId: 1, paragraphIdx: 0 }, undefined, eps, []);
    expect(frame.episodeId).toBe(1);
    expect(frame.paragraphText).toBe('문단1');
  });

  test('foreshadowSeen 누적', () => {
    const eps = [ep(1, '[떡밥-A]'), ep(2, '[떡밥-B]')];
    const frame = buildFrameAt({ episodeId: 2, paragraphIdx: 0 }, undefined, eps, []);
    expect(frame.foreshadowSeen).toEqual(expect.arrayContaining(['A', 'B']));
  });
});
