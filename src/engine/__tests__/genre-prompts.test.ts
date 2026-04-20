/**
 * M5 Genre Translation Layer — genre-prompts.ts unit tests.
 *   1. 4 모드 모두 함수 호출 성공.
 *   2. novel은 빈 문자열(기존 프롬프트 그대로).
 *   3. webtoon/drama/game은 각각 distinct한 non-empty 문자열.
 *   4. 잘못된 mode/lang이 들어와도 빈 문자열 이상 반환 (폴백).
 *   5. 각 장르 블록에 고유 키워드 포함 (포맷 지시 실효성 검증).
 */

import { getGenreSystemPrompt, type GenreMode, type PromptLang } from '@/engine/genre-prompts';

const MODES: GenreMode[] = ['novel', 'webtoon', 'drama', 'game'];
const LANGS: PromptLang[] = ['ko', 'en', 'ja', 'zh'];

describe('getGenreSystemPrompt()', () => {
  it('returns empty string for novel mode in all langs', () => {
    for (const lang of LANGS) {
      expect(getGenreSystemPrompt('novel', lang)).toBe('');
    }
  });

  it('returns non-empty, distinct strings for webtoon/drama/game in Korean', () => {
    const webtoon = getGenreSystemPrompt('webtoon', 'ko');
    const drama = getGenreSystemPrompt('drama', 'ko');
    const game = getGenreSystemPrompt('game', 'ko');
    expect(webtoon.length).toBeGreaterThan(0);
    expect(drama.length).toBeGreaterThan(0);
    expect(game.length).toBeGreaterThan(0);
    expect(new Set([webtoon, drama, game]).size).toBe(3);
  });

  it('webtoon prompt mentions Panel format in every language', () => {
    for (const lang of LANGS) {
      const out = getGenreSystemPrompt('webtoon', lang);
      expect(out).toContain('Panel');
    }
  });

  it('drama prompt mentions INT./EXT. screenplay heading convention', () => {
    for (const lang of LANGS) {
      const out = getGenreSystemPrompt('drama', lang);
      expect(out).toContain('INT.');
      expect(out).toContain('EXT.');
    }
  });

  it('game prompt mentions branch-choice [A] / [B] markers', () => {
    for (const lang of LANGS) {
      const out = getGenreSystemPrompt('game', lang);
      expect(out).toContain('[A]');
      expect(out).toContain('[B]');
    }
  });

  it('falls back to ko for unknown lang', () => {
    const out = getGenreSystemPrompt('webtoon', 'xx' as unknown as PromptLang);
    // webtoon/ko 응답과 동일
    expect(out).toBe(getGenreSystemPrompt('webtoon', 'ko'));
  });

  it('returns empty string for unknown mode', () => {
    const out = getGenreSystemPrompt('xx' as unknown as GenreMode, 'ko');
    expect(out).toBe('');
  });

  it('all 4 modes × 4 langs = 16 calls complete without throwing', () => {
    for (const mode of MODES) {
      for (const lang of LANGS) {
        expect(() => getGenreSystemPrompt(mode, lang)).not.toThrow();
      }
    }
  });
});
