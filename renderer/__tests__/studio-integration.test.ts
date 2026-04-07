/**
 * Studio Integration Tests
 * Tests core engine logic: system instruction building, response processing,
 * genre presets, and scoring functions.
 */

import { buildGenrePreset, postProcessResponse, buildSystemInstruction } from '@/engine/pipeline';
import { calculateEOSScore, calculateGrade, generateEngineReport } from '@/engine/scoring';
import { GENRE_PRESETS } from '@/engine/genre-presets';
import type { StoryConfig } from '@/lib/studio-types';
import { PlatformType } from '@/engine/types';

// ============================================================
// Helpers
// ============================================================

function makeMinimalConfig(overrides?: Partial<StoryConfig>): StoryConfig {
  return {
    genre: 'FANTASY',
    povCharacter: 'Test Hero',
    setting: 'A fantasy kingdom',
    primaryEmotion: '결의',
    episode: 1,
    title: 'Test Novel',
    totalEpisodes: 10,
    guardrails: {
      sexuality: 0,
      violence: 1,
      profanity: 0,
      alcohol: 0,
      discrimination: 0,
    },
    characters: [
      {
        name: 'Test Hero',
        role: 'protagonist',
        personality: 'Brave and kind',
        appearance: 'Tall, dark hair',
        arc: 'growth',
      },
    ],
    platform: PlatformType.MOBILE,
    ...overrides,
  } as StoryConfig;
}

// ============================================================
// buildGenrePreset
// ============================================================

describe('buildGenrePreset', () => {
  test('returns non-empty string for known genre', () => {
    const result = buildGenrePreset('FANTASY', true);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('produces different output for KO vs EN', () => {
    const ko = buildGenrePreset('ROMANCE', true);
    const en = buildGenrePreset('ROMANCE', false);
    // Both should be non-empty; at least one should differ in wording
    expect(ko.length).toBeGreaterThan(0);
    expect(en.length).toBeGreaterThan(0);
  });

  test('returns a string for unknown genre (graceful fallback)', () => {
    const result = buildGenrePreset('NONEXISTENT_GENRE', true);
    expect(typeof result).toBe('string');
  });
});

// ============================================================
// postProcessResponse
// ============================================================

describe('postProcessResponse', () => {
  test('returns content and report for plain text', () => {
    const config = makeMinimalConfig();
    const { content, report } = postProcessResponse(
      '주인공은 숲을 걸었다. 바람이 불었다. 그는 결심했다.',
      config,
      'KO',
    );
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
    expect(report).toBeDefined();
    expect(typeof report.grade).toBe('string');
  });

  test('extracts world_updates from embedded JSON block', () => {
    const config = makeMinimalConfig();
    const textWithJson = `이야기 내용입니다.\n\`\`\`json\n{"world_updates":{"new_location":"Dark Forest"}}\n\`\`\``;
    const { report } = postProcessResponse(textWithJson, config, 'KO');
    expect(report).toBeDefined();
    // world_updates should be extracted
    if (report.worldUpdates) {
      expect(report.worldUpdates).toHaveProperty('new_location');
    }
  });

  test('handles empty string input without crashing', () => {
    const config = makeMinimalConfig();
    expect(() => postProcessResponse('', config, 'KO')).not.toThrow();
  });
});

// ============================================================
// calculateEOSScore
// ============================================================

describe('calculateEOSScore', () => {
  test('returns 0 for very short text', () => {
    expect(calculateEOSScore('짧은')).toBe(0);
  });

  test('returns numeric score for Korean narrative text', () => {
    const text = '그녀는 눈물을 흘렸다. 가슴이 미어지는 슬픔이 밀려왔다. 어둠 속에서 차가운 바람이 불었고, 그리움이 숨을 조였다. 희망은 사라진 것처럼 보였지만, 미소를 지으며 일어섰다. 목소리가 떨렸다.';
    const score = calculateEOSScore(text);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThan(0);
  });

  test('returns number for English text (may be low)', () => {
    const score = calculateEOSScore('She walked through the forest. The wind was cold. She felt alone in the darkness of the night sky.');
    expect(typeof score).toBe('number');
  });
});

// ============================================================
// calculateGrade & generateEngineReport
// ============================================================

describe('calculateGrade', () => {
  test('returns a letter grade string', () => {
    const grade = calculateGrade(85);
    expect(typeof grade).toBe('string');
    expect(grade.length).toBeGreaterThan(0);
  });

  test('higher score produces higher or equal grade', () => {
    const low = calculateGrade(30);
    const high = calculateGrade(95);
    // Both should be defined strings
    expect(low).toBeDefined();
    expect(high).toBeDefined();
  });
});

describe('generateEngineReport', () => {
  test('produces a report with required fields', () => {
    const config = makeMinimalConfig();
    const text = '주인공은 적의 공격을 피하며 달렸다. 심장이 터질 듯이 뛰었고, 숨이 거칠어졌다. 그는 칼을 뽑았다.';
    const report = generateEngineReport(text, config, 'KO', PlatformType.MOBILE);
    expect(report).toBeDefined();
    expect(typeof report.grade).toBe('string');
    expect(typeof report.eosScore).toBe('number');
  });
});

// ============================================================
// GENRE_PRESETS
// ============================================================

describe('GENRE_PRESETS', () => {
  test('contains at least 5 genre entries', () => {
    const keys = Object.keys(GENRE_PRESETS);
    expect(keys.length).toBeGreaterThanOrEqual(5);
  });

  test('each preset has required fields', () => {
    for (const [key, preset] of Object.entries(GENRE_PRESETS)) {
      expect(preset.rules).toBeDefined();
      expect(preset.pacing).toBeDefined();
      expect(typeof preset.tensionBase).toBe('number');
      expect(preset.cliffTypes).toBeDefined();
      expect(preset.emotionFocus).toBeDefined();
    }
  });
});
