import { runLongArcVerification } from '../orchestrator';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';

function makeConfig(): StoryConfig {
  return {
    genre: 'fantasy',
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: 'Test',
    totalEpisodes: 100,
    synopsis: '주인공 김준이 검을 휘두르며 모험한다',
    guardrails: { language: 'KO' } as unknown as StoryConfig['guardrails'],
    characters: [{ id: 'c1', name: '김준', role: '주인공', traits: '용감', appearance: '', dna: 0 }],
    platform: 'web',
  } as unknown as StoryConfig;
}

function ep(num: number, content: string): EpisodeManuscript {
  return { episode: num, title: `EP${num}`, content, charCount: content.length, lastUpdate: 0 };
}

describe('runLongArcVerification (orchestrator)', () => {
  test('config null → 빈 report', async () => {
    const r = await runLongArcVerification(null, [], { projectId: 'p1' });
    expect(r.overallScore).toBe(100);
    expect(r.totalViolations).toBe(0);
    expect(r.projectId).toBe('p1');
  });

  test('정상 입력 → 5축 모두 결과', async () => {
    const r = await runLongArcVerification(
      makeConfig(),
      [ep(1, '김준이 검을 휘둘렀다.'), ep(2, '김준의 모험은 계속된다.')],
      { projectId: 'p1' },
    );
    expect(r.axes.plotDrift).toBeDefined();
    expect(r.axes.characterArc).toBeDefined();
    expect(r.axes.worldViolation).toBeDefined();
    expect(r.axes.foreshadow).toBeDefined();
    expect(r.axes.tension).toBeDefined();
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(100);
  });

  test('enabledAxes 옵션 — 일부만 실행', async () => {
    const r = await runLongArcVerification(
      makeConfig(),
      [ep(1, 'test')],
      { projectId: 'p1', enabledAxes: ['plotDrift'] },
    );
    // 비활성 축은 score 100
    expect(r.axes.characterArc.score).toBe(100);
    expect(r.axes.tension.score).toBe(100);
  });

  test('우선순위 정렬 — error 가 warning 위', async () => {
    const eps = [
      ep(1, '[떡밥-A]'),
      ep(50, '아무'), // [떡밥-A] 미회수 30화+ → error
    ];
    const r = await runLongArcVerification(makeConfig(), eps, { projectId: 'p1' });
    if (r.prioritized.length >= 2) {
      const ranks = { error: 3, warning: 2, info: 1 };
      for (let i = 1; i < r.prioritized.length; i++) {
        expect(ranks[r.prioritized[i].severity]).toBeLessThanOrEqual(ranks[r.prioritized[i - 1].severity]);
      }
    }
  });

  test('manuscriptHash 산출', async () => {
    const r1 = await runLongArcVerification(makeConfig(), [ep(1, 'A')], { projectId: 'p1' });
    const r2 = await runLongArcVerification(makeConfig(), [ep(1, 'AB')], { projectId: 'p1' });
    expect(r1.manuscriptHash).not.toBe(r2.manuscriptHash);
  });
});
