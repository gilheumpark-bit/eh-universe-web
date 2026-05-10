// ============================================================
// story-context.test.ts — 5 fixture
// ============================================================

import { buildStoryContextModifier, collectStoryContext, type StoryContextSnapshot } from '../story-context';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import type { VerifierReport } from '@/lib/long-arc-verifier/types';

function makeReport(overrides: Partial<VerifierReport> = {}): VerifierReport {
  return {
    projectId: 'test',
    generatedAt: new Date().toISOString(),
    axes: {
      plotDrift: { axis: 'plot-drift', score: 100, violations: [], durationMs: 0 },
      characterArc: { axis: 'character-arc', score: 100, violations: [], durationMs: 0 },
      worldViolation: { axis: 'world', score: 100, violations: [], durationMs: 0 },
      foreshadow: { axis: 'foreshadow', score: 100, violations: [], durationMs: 0 },
      tension: { axis: 'tension', score: 100, violations: [], durationMs: 0 },
    },
    overallScore: 100,
    prioritized: [],
    totalViolations: 0,
    manuscriptHash: 'h1',
    ...overrides,
  };
}

describe('buildStoryContextModifier', () => {
  test('null snapshot → 빈 string', () => {
    expect(buildStoryContextModifier(null, { language: 'KO' })).toBe('');
    expect(buildStoryContextModifier(undefined, { language: 'KO' })).toBe('');
  });

  test('빈 snapshot (episodeId 만) → header 만 포함', () => {
    const r = buildStoryContextModifier({ episodeId: 5 }, { language: 'KO' });
    expect(r).toContain('EP5');
    expect(r).toContain('작품 맥락');
  });

  test('error 위반 → 우선순위 P0', () => {
    const report = makeReport({
      prioritized: [
        {
          kind: 'foreshadow-unresolved',
          severity: 'error',
          episodeId: 12,
          messages: { ko: '떡밥 [검은검] 미회수', en: 'Unresolved [black-sword]' },
        },
      ],
      totalViolations: 1,
    });
    const snapshot: StoryContextSnapshot = { episodeId: 30, longArcReport: report };
    const r = buildStoryContextModifier(snapshot, { language: 'KO' });
    expect(r).toContain('심각 위반');
    expect(r).toContain('검은검');
  });

  test('미회수 떡밥 + 캐릭터 상태 — 통합 출력', () => {
    const snapshot: StoryContextSnapshot = {
      episodeId: 20,
      foreshadowMarkers: [
        {
          id: '검은검',
          setupEpisode: 5,
          setupCharOffset: 0,
          setupContext: '...',
          type: 'foreshadow',
        },
      ],
      characterStates: [
        {
          characterId: 'c1',
          characterName: '김준',
          emotion: '분노',
          inventory: ['검'],
          knowledge: [],
        },
      ],
    };
    const r = buildStoryContextModifier(snapshot, { language: 'KO' });
    expect(r).toContain('미회수 떡밥');
    expect(r).toContain('검은검');
    expect(r).toContain('김준');
    expect(r).toContain('분노');
  });

  test('토큰 cap 초과 시 우선순위 낮은 섹션 drop', () => {
    const report = makeReport({
      prioritized: Array.from({ length: 20 }, (_, i) => ({
        kind: 'plot-drift' as const,
        severity: 'error' as const,
        episodeId: i + 1,
        messages: { ko: `매우긴메시지${'A'.repeat(50)}EP${i + 1}`, en: 'long' },
      })),
      totalViolations: 20,
    });
    const snapshot: StoryContextSnapshot = {
      episodeId: 30,
      longArcReport: report,
      recentTension: 75,
    };
    const r = buildStoryContextModifier(snapshot, { language: 'KO', charCap: 200 });
    expect(r.length).toBeLessThanOrEqual(250); // header + error + 일부만
    expect(r).toContain('EP30');               // header 항상 포함
  });

  test('영어 모드', () => {
    const snapshot: StoryContextSnapshot = {
      episodeId: 10,
      recentTension: 80,
    };
    const r = buildStoryContextModifier(snapshot, { language: 'EN' });
    expect(r).toContain('Story Context');
    expect(r).toContain('Active episode');
    expect(r).toContain('Recent tension');
  });
});

describe('collectStoryContext', () => {
  test('config null → null', () => {
    expect(collectStoryContext({ config: null, episodes: [] })).toBeNull();
  });

  test('정상 입력 → snapshot 빌드', () => {
    const config: StoryConfig = {
      genre: 'fantasy',
      povCharacter: '',
      setting: '',
      primaryEmotion: '',
      episode: 5,
      title: 'Test',
      totalEpisodes: 100,
      guardrails: { language: 'KO' } as unknown as StoryConfig['guardrails'],
      characters: [{ id: 'c1', name: '김준', role: 'r', traits: 't', appearance: '', dna: 0 }],
      platform: 'web',
    } as unknown as StoryConfig;

    const eps: EpisodeManuscript[] = [
      { episode: 1, title: 'A', content: '[떡밥-X] 시작', charCount: 5, lastUpdate: 0 },
      { episode: 5, title: 'B', content: '김준은 검을 들었다', charCount: 8, lastUpdate: 0 },
    ];

    const snap = collectStoryContext({ config, episodes: eps });
    expect(snap).not.toBeNull();
    expect(snap!.episodeId).toBe(5);
    expect(snap!.foreshadowMarkers?.length).toBeGreaterThan(0);
    expect(snap!.characterStates?.length).toBeGreaterThan(0);
  });
});
