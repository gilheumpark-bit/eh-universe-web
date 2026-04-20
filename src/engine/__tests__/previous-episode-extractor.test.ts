/**
 * previous-episode-extractor — 이전 화 자동 요약 추출 테스트
 */

import { extractPreviousEpisodeSummary } from '../previous-episode-extractor';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { PlatformType } from '../types';

function baseConfig(overrides?: Partial<StoryConfig>): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 2,
    title: 't',
    totalEpisodes: 10,
    guardrails: { min: 0, max: 100 },
    characters: [],
    platform: PlatformType.MOBILE,
    ...overrides,
  };
}

function manuscript(ep: number, content: string, summary?: string, detailedSummary?: string): EpisodeManuscript {
  return {
    episode: ep,
    title: `Ep ${ep}`,
    content,
    charCount: content.length,
    lastUpdate: Date.now(),
    summary,
    detailedSummary,
  };
}

// ============================================================
// PART 1 — Edge cases
// ============================================================

describe('extractPreviousEpisodeSummary — edge cases', () => {
  test('1화 → 빈 결과', () => {
    const r = extractPreviousEpisodeSummary(baseConfig({ episode: 1 }));
    expect(r.text).toBe('');
    expect(r.sourceType).toBe('none');
  });

  test('manuscripts 없음 → 빈 결과', () => {
    const r = extractPreviousEpisodeSummary(baseConfig({ episode: 5 }));
    expect(r.text).toBe('');
    expect(r.sourceType).toBe('none');
  });

  test('현재화 이상 manuscript만 있음 → 빈', () => {
    const r = extractPreviousEpisodeSummary(baseConfig({
      episode: 2,
      manuscripts: [manuscript(2, '현재화 본문')],
    }));
    expect(r.text).toBe('');
  });
});

// ============================================================
// PART 2 — summary mode
// ============================================================

describe('extractPreviousEpisodeSummary — summary mode', () => {
  test('detailedSummary 우선', () => {
    const r = extractPreviousEpisodeSummary(baseConfig({
      episode: 2,
      manuscripts: [manuscript(1, 'long content', 'short', 'detailed summary text')],
    }));
    expect(r.text).toBe('detailed summary text');
    expect(r.sourceType).toBe('detailedSummary');
    expect(r.sourceEpisode).toBe(1);
  });

  test('detailed 없으면 summary', () => {
    const r = extractPreviousEpisodeSummary(baseConfig({
      episode: 2,
      manuscripts: [manuscript(1, 'long content', 'short summary')],
    }));
    expect(r.text).toBe('short summary');
    expect(r.sourceType).toBe('summary');
  });

  test('summary 없으면 tail로 폴백', () => {
    const r = extractPreviousEpisodeSummary(baseConfig({
      episode: 2,
      manuscripts: [manuscript(1, 'a'.repeat(1000))],
    }));
    expect(r.text.length).toBe(400);
    expect(r.sourceType).toBe('tail');
  });

  test('writerNotes 폴백 — manuscripts 없을 때', () => {
    const r = extractPreviousEpisodeSummary(baseConfig({
      episode: 2,
      episodeSceneSheets: [{
        episode: 1,
        title: 'Ep 1',
        lastUpdate: Date.now(),
        directionSnapshot: { writerNotes: '작가 메모입니다' },
      }],
    }));
    expect(r.text).toBe('작가 메모입니다');
    expect(r.sourceType).toBe('writerNotes');
  });
});

// ============================================================
// PART 3 — tail mode
// ============================================================

describe('extractPreviousEpisodeSummary — tail mode', () => {
  test('content 마지막 N자', () => {
    const content = 'A'.repeat(500) + 'TAIL_TEXT';
    const r = extractPreviousEpisodeSummary(
      baseConfig({
        episode: 2,
        manuscripts: [manuscript(1, content)],
      }),
      { mode: 'tail', maxChars: 100 }
    );
    expect(r.text.length).toBe(100);
    expect(r.text.endsWith('TAIL_TEXT')).toBe(true);
    expect(r.sourceType).toBe('tail');
  });

  test('빈 content → 빈 결과', () => {
    const r = extractPreviousEpisodeSummary(
      baseConfig({
        episode: 2,
        manuscripts: [manuscript(1, '')],
      }),
      { mode: 'tail' }
    );
    expect(r.text).toBe('');
  });

  test('가장 가까운 이전 화 선택', () => {
    const r = extractPreviousEpisodeSummary(
      baseConfig({
        episode: 5,
        manuscripts: [
          manuscript(1, 'EP1 content'),
          manuscript(3, 'EP3 content'),
          manuscript(2, 'EP2 content'),
        ],
      }),
      { mode: 'tail', maxChars: 1000 }
    );
    expect(r.sourceEpisode).toBe(3);
    expect(r.text).toContain('EP3');
  });
});
