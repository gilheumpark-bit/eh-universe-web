import {
  getDefaultSuggestionConfig,
  generateSuggestions,
  dismissSuggestion,
} from '../proactive-suggestions';
import type {
  StoryConfig,
  SuggestionConfig,
  ProactiveSuggestion,
  AppLanguage,
} from '@/lib/studio-types';

// ============================================================
// Helpers
// ============================================================

function makeStoryConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: 'fantasy',
    povCharacter: '민수',
    setting: '이세계',
    primaryEmotion: 'tension',
    episode: 1,
    title: '테스트 소설',
    totalEpisodes: 25,
    guardrails: { maxViolence: 3, maxSexual: 1, bannedThemes: [] },
    characters: [],
    platform: 'jooara',
    ...overrides,
  } as StoryConfig;
}

function makeConfig(overrides: Partial<SuggestionConfig> = {}): SuggestionConfig {
  return {
    enabled: true,
    maxPerGeneration: 5,
    cooldownTurns: 3,
    suppressAfterDismiss: 3,
    categories: {
      character_drift: true,
      world_inconsistency: true,
      tension_mismatch: true,
      thread_overdue: true,
      pacing_anomaly: true,
      emotion_flat: true,
      ai_tone_creep: true,
      hallucination_risk: true,
      foreshadow_urgent: true,
    },
    ...overrides,
  };
}

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    config: makeStoryConfig(),
    currentEpisode: 10,
    recentMetrics: [] as Array<{ tension: number; pacing: number; immersion: number; eos: number; grade: string }>,
    characterNames: [] as string[],
    characterLastAppearance: {} as Record<string, number>,
    language: 'KO' as AppLanguage,
    ...overrides,
  };
}

// ============================================================
// getDefaultSuggestionConfig
// ============================================================

describe('getDefaultSuggestionConfig', () => {
  it('beginner: maxPerGeneration=1, cooldownTurns=10, limited categories', () => {
    const cfg = getDefaultSuggestionConfig('beginner');
    expect(cfg.enabled).toBe(true);
    expect(cfg.maxPerGeneration).toBe(1);
    expect(cfg.cooldownTurns).toBe(10);
    expect(cfg.suppressAfterDismiss).toBe(3);
    // beginner only has 3 categories
    expect(Object.keys(cfg.categories)).toHaveLength(3);
    expect(cfg.categories.tension_mismatch).toBe(true);
    expect(cfg.categories.emotion_flat).toBe(true);
    expect(cfg.categories.ai_tone_creep).toBe(true);
    expect(cfg.categories.character_drift).toBeUndefined();
  });

  it('intermediate: maxPerGeneration=3, cooldownTurns=5, all categories', () => {
    const cfg = getDefaultSuggestionConfig('intermediate');
    expect(cfg.maxPerGeneration).toBe(3);
    expect(cfg.cooldownTurns).toBe(5);
    expect(Object.keys(cfg.categories).length).toBe(9);
  });

  it('advanced: maxPerGeneration=3, cooldownTurns=3, all categories', () => {
    const cfg = getDefaultSuggestionConfig('advanced');
    expect(cfg.maxPerGeneration).toBe(3);
    expect(cfg.cooldownTurns).toBe(3);
    expect(cfg.categories.character_drift).toBe(true);
    expect(cfg.categories.foreshadow_urgent).toBe(true);
  });
});

// ============================================================
// generateSuggestions — basic behavior
// ============================================================

describe('generateSuggestions', () => {
  it('returns empty array when config.enabled is false', () => {
    const ctx = makeCtx();
    const cfg = makeConfig({ enabled: false });
    expect(generateSuggestions(ctx, cfg)).toEqual([]);
  });

  it('returns empty array when no triggers fire', () => {
    const ctx = makeCtx({ recentMetrics: [], characterNames: [] });
    const cfg = makeConfig();
    expect(generateSuggestions(ctx, cfg)).toEqual([]);
  });

  // --------------------------------------------------------
  // Character Drift
  // --------------------------------------------------------
  describe('character_drift', () => {
    it('fires when a character has not appeared for 3+ episodes', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 5 },
      });
      const results = generateSuggestions(ctx, makeConfig());
      const drift = results.find(s => s.category === 'character_drift');
      expect(drift).toBeDefined();
      expect(drift!.priority).toBe('warning');
      expect(drift!.message).toContain('민수');
    });

    it('does not fire when character appeared recently', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 9 },
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'character_drift')).toBeUndefined();
    });

    it('only reports the first missing character (break after one)', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['A', 'B'],
        characterLastAppearance: { A: 1, B: 2 },
      });
      const results = generateSuggestions(ctx, makeConfig());
      const drifts = results.filter(s => s.category === 'character_drift');
      expect(drifts).toHaveLength(1);
    });

    it('treats missing lastAppearance as episode 0', () => {
      const ctx = makeCtx({
        currentEpisode: 5,
        characterNames: ['X'],
        characterLastAppearance: {},
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'character_drift')).toBeDefined();
    });
  });

  // --------------------------------------------------------
  // Tension Mismatch
  // --------------------------------------------------------
  describe('tension_mismatch', () => {
    it('fires when tension delta exceeds 30', () => {
      // ep=10, total=25 → targetRatio=0.4 → expected=30+0.4*50=50
      // tension=10 → delta=40 > 30
      const ctx = makeCtx({
        currentEpisode: 10,
        recentMetrics: [{ tension: 10, pacing: 50, immersion: 50, eos: 50, grade: 'A' }],
        config: makeStoryConfig({ totalEpisodes: 25 }),
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'tension_mismatch')).toBeDefined();
    });

    it('does not fire when tension is close to target', () => {
      // ep=10, total=25 → expected=50, tension=50 → delta=0
      const ctx = makeCtx({
        currentEpisode: 10,
        recentMetrics: [{ tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'A' }],
        config: makeStoryConfig({ totalEpisodes: 25 }),
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'tension_mismatch')).toBeUndefined();
    });
  });

  // --------------------------------------------------------
  // Emotion Flat
  // --------------------------------------------------------
  describe('emotion_flat', () => {
    it('fires when 3 consecutive metrics have EOS < 30', () => {
      const ctx = makeCtx({
        recentMetrics: [
          { tension: 50, pacing: 50, immersion: 50, eos: 20, grade: 'A' },
          { tension: 50, pacing: 50, immersion: 50, eos: 25, grade: 'A' },
          { tension: 50, pacing: 50, immersion: 50, eos: 10, grade: 'A' },
        ],
      });
      const results = generateSuggestions(ctx, makeConfig());
      const flat = results.find(s => s.category === 'emotion_flat');
      expect(flat).toBeDefined();
      expect(flat!.priority).toBe('critical');
    });

    it('does not fire when any of the last 3 has EOS >= 30', () => {
      const ctx = makeCtx({
        recentMetrics: [
          { tension: 50, pacing: 50, immersion: 50, eos: 20, grade: 'A' },
          { tension: 50, pacing: 50, immersion: 50, eos: 35, grade: 'A' },
          { tension: 50, pacing: 50, immersion: 50, eos: 10, grade: 'A' },
        ],
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'emotion_flat')).toBeUndefined();
    });

    it('does not fire with fewer than 3 metrics', () => {
      const ctx = makeCtx({
        recentMetrics: [
          { tension: 50, pacing: 50, immersion: 50, eos: 10, grade: 'A' },
          { tension: 50, pacing: 50, immersion: 50, eos: 10, grade: 'A' },
        ],
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'emotion_flat')).toBeUndefined();
    });
  });

  // --------------------------------------------------------
  // Pacing Anomaly
  // --------------------------------------------------------
  describe('pacing_anomaly', () => {
    it('fires warning when pacing < 30', () => {
      const ctx = makeCtx({
        recentMetrics: [{ tension: 50, pacing: 20, immersion: 50, eos: 50, grade: 'A' }],
      });
      const results = generateSuggestions(ctx, makeConfig());
      const pacing = results.find(s => s.category === 'pacing_anomaly');
      expect(pacing).toBeDefined();
      expect(pacing!.priority).toBe('warning');
    });

    it('fires info when pacing > 90', () => {
      const ctx = makeCtx({
        recentMetrics: [{ tension: 50, pacing: 95, immersion: 50, eos: 50, grade: 'A' }],
      });
      const results = generateSuggestions(ctx, makeConfig());
      const pacing = results.find(s => s.category === 'pacing_anomaly');
      expect(pacing).toBeDefined();
      expect(pacing!.priority).toBe('info');
    });

    it('does not fire for normal pacing (30-90)', () => {
      const ctx = makeCtx({
        recentMetrics: [{ tension: 50, pacing: 60, immersion: 50, eos: 50, grade: 'A' }],
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'pacing_anomaly')).toBeUndefined();
    });
  });

  // --------------------------------------------------------
  // AI Tone Creep
  // --------------------------------------------------------
  describe('ai_tone_creep', () => {
    it('fires when average grade of last 3 is below C+ (65)', () => {
      const ctx = makeCtx({
        recentMetrics: [
          { tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'C' },
          { tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'C' },
          { tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'C' },
        ],
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'ai_tone_creep')).toBeDefined();
    });

    it('does not fire when grades are decent', () => {
      const ctx = makeCtx({
        recentMetrics: [
          { tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'A' },
          { tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'B+' },
          { tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'A+' },
        ],
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'ai_tone_creep')).toBeUndefined();
    });

    it('maps unknown grade to 60', () => {
      const ctx = makeCtx({
        recentMetrics: [
          { tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'Z' },
          { tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'Z' },
          { tension: 50, pacing: 50, immersion: 50, eos: 50, grade: 'Z' },
        ],
      });
      // avg = 60, which is < 65 → fires
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.find(s => s.category === 'ai_tone_creep')).toBeDefined();
    });
  });

  // --------------------------------------------------------
  // Language support
  // --------------------------------------------------------
  describe('language', () => {
    it('outputs Korean messages when language is KO', () => {
      const ctx = makeCtx({
        language: 'KO',
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 1 },
        currentEpisode: 10,
      });
      const results = generateSuggestions(ctx, makeConfig());
      const drift = results.find(s => s.category === 'character_drift');
      expect(drift!.message).toMatch(/등장하지 않았습니다/);
    });

    it('outputs English messages when language is EN', () => {
      const ctx = makeCtx({
        language: 'EN',
        characterNames: ['John'],
        characterLastAppearance: { John: 1 },
        currentEpisode: 10,
      });
      const results = generateSuggestions(ctx, makeConfig());
      const drift = results.find(s => s.category === 'character_drift');
      expect(drift!.message).toMatch(/hasn't appeared/);
    });
  });

  // --------------------------------------------------------
  // Priority sorting & maxPerGeneration
  // --------------------------------------------------------
  describe('priority sorting and max limit', () => {
    it('sorts critical before warning before info', () => {
      // Trigger emotion_flat (critical) + character_drift (warning) + pacing fast (info)
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 1 },
        recentMetrics: [
          { tension: 50, pacing: 95, immersion: 50, eos: 10, grade: 'A' },
          { tension: 50, pacing: 95, immersion: 50, eos: 10, grade: 'A' },
          { tension: 50, pacing: 95, immersion: 50, eos: 10, grade: 'A' },
        ],
      });
      const results = generateSuggestions(ctx, makeConfig());
      expect(results.length).toBeGreaterThanOrEqual(2);
      // First should be critical (emotion_flat)
      const critIdx = results.findIndex(s => s.priority === 'critical');
      const warnIdx = results.findIndex(s => s.priority === 'warning');
      const infoIdx = results.findIndex(s => s.priority === 'info');
      if (critIdx !== -1 && warnIdx !== -1) expect(critIdx).toBeLessThan(warnIdx);
      if (warnIdx !== -1 && infoIdx !== -1) expect(warnIdx).toBeLessThan(infoIdx);
    });

    it('respects maxPerGeneration limit', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 1 },
        recentMetrics: [
          { tension: 10, pacing: 20, immersion: 50, eos: 10, grade: 'C' },
          { tension: 10, pacing: 20, immersion: 50, eos: 10, grade: 'C' },
          { tension: 10, pacing: 20, immersion: 50, eos: 10, grade: 'C' },
        ],
      });
      const cfg = makeConfig({ maxPerGeneration: 2 });
      const results = generateSuggestions(ctx, cfg);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  // --------------------------------------------------------
  // Category filtering
  // --------------------------------------------------------
  describe('category filtering', () => {
    it('suppresses suggestions for disabled categories', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 1 },
      });
      const cfg = makeConfig({ categories: { character_drift: false } });
      const results = generateSuggestions(ctx, cfg);
      expect(results.find(s => s.category === 'character_drift')).toBeUndefined();
    });

    it('allows suggestions only for enabled categories', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 1 },
        recentMetrics: [{ tension: 50, pacing: 20, immersion: 50, eos: 50, grade: 'A' }],
      });
      const cfg = makeConfig({
        categories: { character_drift: true, pacing_anomaly: false },
      });
      const results = generateSuggestions(ctx, cfg);
      expect(results.find(s => s.category === 'character_drift')).toBeDefined();
      expect(results.find(s => s.category === 'pacing_anomaly')).toBeUndefined();
    });
  });

  // --------------------------------------------------------
  // Cooldown / dedup logic
  // --------------------------------------------------------
  describe('cooldown and dedup', () => {
    it('suppresses category that appeared recently within cooldownTurns', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 1 },
      });
      const cfg = makeConfig({ cooldownTurns: 5 });
      const previous: ProactiveSuggestion[] = [{
        id: 'sg-character_drift-old',
        category: 'character_drift',
        priority: 'warning',
        message: 'old',
        actionHint: 'old',
        episode: 8, // within cooldown (10 - 5 = 5, 8 >= 5)
        dismissed: false,
        dismissCount: 0,
      }];
      const results = generateSuggestions(ctx, cfg, previous);
      expect(results.find(s => s.category === 'character_drift')).toBeUndefined();
    });

    it('allows category if previous suggestion is outside cooldown window', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 1 },
      });
      const cfg = makeConfig({ cooldownTurns: 3 });
      const previous: ProactiveSuggestion[] = [{
        id: 'sg-character_drift-old',
        category: 'character_drift',
        priority: 'warning',
        message: 'old',
        actionHint: 'old',
        episode: 5, // outside cooldown (10 - 3 = 7, 5 < 7)
        dismissed: false,
        dismissCount: 0,
      }];
      const results = generateSuggestions(ctx, cfg, previous);
      expect(results.find(s => s.category === 'character_drift')).toBeDefined();
    });

    it('suppresses category after reaching dismissal threshold', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 1 },
      });
      const cfg = makeConfig({ suppressAfterDismiss: 2 });
      const previous: ProactiveSuggestion[] = [
        { id: 'a', category: 'character_drift', priority: 'warning', message: '', actionHint: '', episode: 1, dismissed: true, dismissCount: 1 },
        { id: 'b', category: 'character_drift', priority: 'warning', message: '', actionHint: '', episode: 2, dismissed: true, dismissCount: 2 },
      ];
      const results = generateSuggestions(ctx, cfg, previous);
      expect(results.find(s => s.category === 'character_drift')).toBeUndefined();
    });

    it('does not count dismissed suggestions in cooldown', () => {
      const ctx = makeCtx({
        currentEpisode: 10,
        characterNames: ['민수'],
        characterLastAppearance: { '민수': 1 },
      });
      const cfg = makeConfig({ cooldownTurns: 5, suppressAfterDismiss: 10 });
      const previous: ProactiveSuggestion[] = [{
        id: 'sg-character_drift-old',
        category: 'character_drift',
        priority: 'warning',
        message: 'old',
        actionHint: 'old',
        episode: 8,
        dismissed: true, // dismissed → filtered out of cooldown check
        dismissCount: 1,
      }];
      const results = generateSuggestions(ctx, cfg, previous);
      // dismissed suggestions are excluded from cooldown set, so it should appear
      expect(results.find(s => s.category === 'character_drift')).toBeDefined();
    });
  });

  // --------------------------------------------------------
  // Suggestion ID format
  // --------------------------------------------------------
  it('generates IDs with correct prefix format', () => {
    const ctx = makeCtx({
      currentEpisode: 10,
      characterNames: ['민수'],
      characterLastAppearance: { '민수': 1 },
    });
    const results = generateSuggestions(ctx, makeConfig());
    for (const s of results) {
      expect(s.id).toMatch(/^sg-\w+-\d+$/);
    }
  });
});

// ============================================================
// dismissSuggestion
// ============================================================

describe('dismissSuggestion', () => {
  const suggestions: ProactiveSuggestion[] = [
    { id: 'sg-1', category: 'character_drift', priority: 'warning', message: 'a', actionHint: 'h', episode: 1, dismissed: false, dismissCount: 0 },
    { id: 'sg-2', category: 'emotion_flat', priority: 'critical', message: 'b', actionHint: 'h', episode: 1, dismissed: false, dismissCount: 0 },
  ];

  it('marks the target suggestion as dismissed and increments count', () => {
    const result = dismissSuggestion(suggestions, 'sg-1');
    const s1 = result.find(s => s.id === 'sg-1')!;
    expect(s1.dismissed).toBe(true);
    expect(s1.dismissCount).toBe(1);
  });

  it('does not modify other suggestions', () => {
    const result = dismissSuggestion(suggestions, 'sg-1');
    const s2 = result.find(s => s.id === 'sg-2')!;
    expect(s2.dismissed).toBe(false);
    expect(s2.dismissCount).toBe(0);
  });

  it('returns new array (immutable)', () => {
    const result = dismissSuggestion(suggestions, 'sg-1');
    expect(result).not.toBe(suggestions);
    expect(result[0]).not.toBe(suggestions[0]);
  });

  it('handles non-existent ID gracefully', () => {
    const result = dismissSuggestion(suggestions, 'sg-nonexistent');
    expect(result).toHaveLength(2);
    expect(result.every(s => !s.dismissed)).toBe(true);
  });

  it('handles empty array', () => {
    const result = dismissSuggestion([], 'sg-1');
    expect(result).toEqual([]);
  });
});
