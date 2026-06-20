import { buildEngagementProfile } from '../engagement-profiler';
import { runRegressionCheck } from '../regression-runner';
import type { EpisodeManuscript } from '@/lib/studio-types';

function ep(num: number, content: string): EpisodeManuscript {
  return { episode: num, title: `EP${num}`, content, charCount: content.length, lastUpdate: 0 };
}

describe('buildEngagementProfile', () => {
  test('빈 → 0 점수', () => {
    const p = buildEngagementProfile([]);
    expect(p.averageEngagement).toBe(0);
    expect(p.finalDropoutRate).toBe(0);
  });

  test('일반 입력 → averageEngagement / dropoutByPersona', () => {
    const eps = [
      ep(1, '김준이 외쳤다! 검을 휘둘렀다 마법'.repeat(30)),
      ep(2, '전투가 시작되었다. 폭발과 비명'.repeat(30)),
    ];
    const p = buildEngagementProfile(eps);
    expect(p.points).toHaveLength(2);
    expect(p.averageEngagement).toBeGreaterThan(0);
    expect(p.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('runRegressionCheck', () => {
  test('passed: 모든 페르소나 유지 (좋은 본문)', () => {
    const eps = Array.from({ length: 10 }, (_, i) =>
      ep(i + 1, '김준이 외쳤다! 검을 휘둘렀다 마법 전투'.repeat(50)),
    );
    const r = runRegressionCheck(eps);
    expect(r.failedPersonas.length).toBeLessThan(5);
  });

  test('blockPush: 3+ 페르소나 이탈', () => {
    const eps = Array.from({ length: 10 }, (_, i) => ep(i + 1, '짧'));
    const r = runRegressionCheck(eps);
    expect(r.failedPersonas.length).toBeGreaterThanOrEqual(3);
    expect(r.blockPush).toBe(true);
  });
});
