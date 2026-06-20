/**
 * work-profiler-engine — pure aggregation tests
 * Covers empty input, dialogue detection, character matching,
 * sorting, sampling, and QualityGateAttemptRecord fallback.
 */

import type { ChatSession, Character, StoryConfig, Message } from '@/lib/studio-types';
import { Genre, PlatformType } from '@/lib/studio-types';
import {
  buildProfile,
  countCharacterAppearances,
  profileToCsv,
} from '../work-profiler-engine';

// ============================================================
// PART 1 — factories (minimal StoryConfig scaffold)
// ============================================================

function mkConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: 'Untitled',
    totalEpisodes: 10,
    guardrails: { min: 3000, max: 6000 },
    characters: [],
    platform: PlatformType.WEB,
    ...overrides,
  };
}

function mkSession(
  id: string,
  episode: number,
  content: string,
  opts: {
    tension?: number;
    pacing?: number;
    eos?: number;
    title?: string;
    lastUpdate?: number;
    characters?: Character[];
    scenes?: number;
  } = {},
): ChatSession {
  const messages: Message[] = [
    {
      id: `${id}-m1`,
      role: 'assistant',
      content,
      timestamp: 0,
      meta:
        opts.tension != null || opts.pacing != null || opts.eos != null
          ? {
              metrics:
                opts.tension != null || opts.pacing != null
                  ? { tension: opts.tension ?? 0, pacing: opts.pacing ?? 0, immersion: 0 }
                  : undefined,
              eosScore: opts.eos,
            }
          : undefined,
    },
  ];

  return {
    id,
    title: opts.title ?? `EP ${episode}`,
    messages,
    config: mkConfig({
      episode,
      characters: opts.characters ?? [],
      episodeSceneSheets: opts.scenes
        ? [
            {
              episode,
              title: `EP ${episode}`,
              scenes: Array.from({ length: opts.scenes }, (_, i) => ({
                sceneId: `${episode}-${i + 1}`,
                sceneName: `Scene ${i + 1}`,
                characters: '',
                tone: '',
                summary: '',
                keyDialogue: '',
                emotionPoint: '',
                nextScene: '',
              })),
              lastUpdate: 0,
            },
          ]
        : undefined,
    }),
    lastUpdate: opts.lastUpdate ?? episode * 1000,
  };
}

// ============================================================
// PART 2 — buildProfile: structural
// ============================================================

describe('buildProfile — structural', () => {
  test('empty sessions → empty profile', () => {
    const p = buildProfile([]);
    expect(p.totalEpisodes).toBe(0);
    expect(p.totalCharCount).toBe(0);
    expect(p.avgQualityAcrossWork).toBe(0);
    expect(p.tensionCurve).toEqual([]);
    expect(p.qualityCurve).toEqual([]);
    expect(p.characterHeatmap).toEqual([]);
    expect(p.metrics).toEqual([]);
  });

  test('single session → single metric', () => {
    const p = buildProfile([mkSession('s1', 1, 'hello world')]);
    expect(p.totalEpisodes).toBe(1);
    expect(p.metrics).toHaveLength(1);
    expect(p.metrics[0].episodeNumber).toBe(1);
    expect(p.metrics[0].charCount).toBeGreaterThan(0);
  });

  test('multi-episode → curve lengths match metrics', () => {
    const sessions = [
      mkSession('s1', 1, 'a'),
      mkSession('s2', 2, 'b'),
      mkSession('s3', 3, 'c'),
    ];
    const p = buildProfile(sessions);
    expect(p.metrics).toHaveLength(3);
    expect(p.tensionCurve).toHaveLength(3);
    expect(p.qualityCurve).toHaveLength(3);
    expect(p.pacingCurve).toHaveLength(3);
    expect(p.sceneDensity).toHaveLength(3);
  });

  test('avgQualityAcrossWork averages non-zero eos scores', () => {
    const sessions = [
      mkSession('s1', 1, 'a', { eos: 0.8 }), // 80
      mkSession('s2', 2, 'b', { eos: 0.6 }), // 60
      mkSession('s3', 3, 'c'),                // 0, excluded from avg
    ];
    const p = buildProfile(sessions);
    // avg of 80, 60 → 70
    expect(p.avgQualityAcrossWork).toBe(70);
  });
});

// ============================================================
// PART 3 — content heuristics
// ============================================================

describe('buildProfile — content heuristics', () => {
  test('dialogueRatio counts both ASCII "..." and CJK 「...」', () => {
    const ko = mkSession('ko', 1, '그는 말했다. "안녕." 그리고 침묵. 「다녀오겠습니다.」');
    const p = buildProfile([ko]);
    expect(p.metrics[0].dialogueRatio).toBeGreaterThan(0);
    expect(p.metrics[0].dialogueRatio).toBeLessThanOrEqual(1);
  });

  test('character whole-word match excludes partial hits', () => {
    // "Anna" should not match inside "Annabelle"
    const r = countCharacterAppearances('Anna met Annabelle.', ['Anna']);
    expect(r.Anna).toBe(1);
  });

  test('character match is case-insensitive for Latin names', () => {
    const r = countCharacterAppearances('ARIA arrived. aria smiled. Aria laughed.', ['Aria']);
    expect(r.Aria).toBe(3);
  });

  test('QualityGateAttemptRecord absent → avgQuality defaults to 0', () => {
    const p = buildProfile([mkSession('s1', 1, 'no meta')]);
    expect(p.metrics[0].avgQuality).toBe(0);
  });

  test('EngineReport meta.metrics.tension → scaled 0..100', () => {
    const p = buildProfile([mkSession('s1', 1, 'x', { tension: 0.42, pacing: 0.8 })]);
    expect(p.metrics[0].tension).toBe(42);
    expect(p.metrics[0].pacing).toBe(80);
  });
});

// ============================================================
// PART 4 — options: sampling + sort
// ============================================================

describe('buildProfile — options', () => {
  test('maxEpisodes option down-samples long works', () => {
    const sessions = Array.from({ length: 50 }, (_, i) => mkSession(`s${i}`, i + 1, `ep ${i + 1}`));
    const p = buildProfile(sessions, { maxEpisodes: 10 });
    expect(p.metrics).toHaveLength(10);
    // endpoints preserved
    expect(p.metrics[0].episodeNumber).toBe(1);
    expect(p.metrics[p.metrics.length - 1].episodeNumber).toBe(50);
  });

  test('sortBy=episode sorts by config.episode ascending', () => {
    const sessions = [
      mkSession('s3', 3, 'c', { lastUpdate: 1 }),
      mkSession('s1', 1, 'a', { lastUpdate: 9 }),
      mkSession('s2', 2, 'b', { lastUpdate: 5 }),
    ];
    const p = buildProfile(sessions, { sortBy: 'episode' });
    expect(p.metrics.map((m) => m.episodeNumber)).toEqual([1, 2, 3]);
  });

  test('sortBy=date sorts by lastUpdate ascending', () => {
    const sessions = [
      mkSession('s3', 3, 'c', { lastUpdate: 1 }),
      mkSession('s1', 1, 'a', { lastUpdate: 9 }),
      mkSession('s2', 2, 'b', { lastUpdate: 5 }),
    ];
    const p = buildProfile(sessions, { sortBy: 'date' });
    // order: lastUpdate 1 (ep3), 5 (ep2), 9 (ep1)
    expect(p.metrics.map((m) => m.episodeNumber)).toEqual([3, 2, 1]);
  });

  test('character heatmap rows track mentions per episode', () => {
    const hero: Character = {
      id: 'c1',
      name: 'Hero',
      role: 'protagonist',
      traits: '',
      appearance: '',
      dna: 0,
    };
    const sessions = [
      mkSession('s1', 1, 'Hero rises.', { characters: [hero] }),
      mkSession('s2', 2, 'Hero and Hero.', { characters: [hero] }),
      mkSession('s3', 3, 'Silence.', { characters: [hero] }),
    ];
    const p = buildProfile(sessions);
    expect(p.characterHeatmap).toHaveLength(1);
    expect(p.characterHeatmap[0].name).toBe('Hero');
    expect(p.characterHeatmap[0].series).toEqual([1, 2, 0]);
  });
});

// ============================================================
// PART 5 — CSV export smoke
// ============================================================

describe('profileToCsv', () => {
  test('emits header row + per-episode rows', () => {
    const sessions = [mkSession('s1', 1, 'x', { tension: 0.5 })];
    const csv = profileToCsv(buildProfile(sessions));
    const lines = csv.split('\n');
    expect(lines[0]).toBe('episode,title,charCount,avgQuality,tension,pacing,dialogueRatio,sceneCount');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('1,');
    expect(lines[1]).toContain(',50,'); // tension 50
  });

  test('escapes titles containing commas', () => {
    const s = mkSession('s1', 1, 'x', { title: 'Hello, world' });
    const csv = profileToCsv(buildProfile([s]));
    expect(csv).toMatch(/"Hello, world"/);
  });
});
