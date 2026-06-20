/**
 * M5 Genre Translation Layer — genre-labels.ts unit tests.
 *   1. 224-entry 커버리지: 4 × 14 × 4 모두 정의되어 있고 label 비어있지 않음.
 *   2. getGenreLabel: 정확한 엔트리 반환.
 *   3. getGenreLabel: 누락 mode/key/lang 폴백.
 *   4. formatLabel: novel/non-ko는 순수 label, webtoon+ko는 괄호 병기.
 *   5. 라운드트립 시뮬: 장르 전환은 데이터 구조를 건드리지 않는다
 *      (이 파일은 순수 상수/헬퍼라 데이터를 보유하지 않지만, 모든 모드가
 *      같은 LabelKey 집합을 노출한다는 불변식을 검증).
 */

import {
  GENRE_LABELS,
  getGenreLabel,
  formatLabel,
  type GenreMode,
  type LabelKey,
  type Lang,
} from '@/lib/genre-labels';

// ============================================================
// PART 1 — Coverage
// ============================================================

const ALL_MODES: GenreMode[] = ['novel', 'webtoon', 'drama', 'game'];
const ALL_LANGS: Lang[] = ['ko', 'en', 'ja', 'zh'];
const ALL_KEYS: LabelKey[] = [
  'goguma', 'sahida', 'cliffhanger', 'pacing', 'povDepth', 'tension',
  'sceneGoal', 'hookType', 'foreshadow', 'payoff',
  'beatStructure', 'characterArc', 'motif', 'stakes',
];

describe('GENRE_LABELS — 224-entry coverage', () => {
  it('defines 4 modes × 14 keys × 4 langs = 224 leaf entries', () => {
    let leafCount = 0;
    for (const mode of ALL_MODES) {
      for (const key of ALL_KEYS) {
        for (const lang of ALL_LANGS) {
          const entry = GENRE_LABELS[mode]?.[key]?.[lang];
          expect(entry).toBeDefined();
          expect(typeof entry!.label).toBe('string');
          expect(entry!.label.length).toBeGreaterThan(0);
          leafCount += 1;
        }
      }
    }
    expect(leafCount).toBe(224);
  });

  it('all 14 label keys are defined across every mode', () => {
    for (const mode of ALL_MODES) {
      for (const key of ALL_KEYS) {
        expect(GENRE_LABELS[mode][key]).toBeDefined();
      }
    }
  });

  it('non-novel modes annotate originalTerm on core webnovel keys', () => {
    const preserveKeys: LabelKey[] = ['goguma', 'sahida', 'cliffhanger'];
    for (const mode of ALL_MODES) {
      if (mode === 'novel') continue;
      for (const key of preserveKeys) {
        const entry = GENRE_LABELS[mode][key].ko;
        expect(entry.originalTerm).toBeTruthy();
      }
    }
  });
});

// ============================================================
// PART 2 — getGenreLabel lookup + fallback
// ============================================================

describe('getGenreLabel()', () => {
  it('returns the exact entry for a valid (mode, key, lang)', () => {
    const entry = getGenreLabel('novel', 'goguma', 'ko');
    expect(entry.label).toBe('고구마');
  });

  it('returns distinct labels across modes for the same key', () => {
    const novelKo = getGenreLabel('novel', 'pacing', 'ko').label;
    const webtoonKo = getGenreLabel('webtoon', 'pacing', 'ko').label;
    const dramaKo = getGenreLabel('drama', 'pacing', 'ko').label;
    const gameKo = getGenreLabel('game', 'pacing', 'ko').label;
    expect(new Set([novelKo, webtoonKo, dramaKo, gameKo]).size).toBe(4);
  });

  it('falls back to novel/ko if mode is invalid', () => {
    // Cast through unknown because TS enforces GenreMode at the type level.
    const entry = getGenreLabel('unknown' as unknown as GenreMode, 'goguma', 'ko');
    expect(entry.label).toBe('고구마');
  });

  it('falls back to ko if lang is invalid', () => {
    const entry = getGenreLabel('webtoon', 'goguma', 'invalid' as unknown as Lang);
    // webtoon/goguma/ko
    expect(entry.label).toBe('갈등 밀도');
  });
});

// ============================================================
// PART 3 — formatLabel — Korean originalTerm 병기 규칙
// ============================================================

describe('formatLabel()', () => {
  it('wraps originalTerm in parentheses for webtoon + ko', () => {
    const entry = getGenreLabel('webtoon', 'goguma', 'ko');
    expect(formatLabel(entry, 'ko')).toBe('갈등 밀도 (고구마)');
  });

  it('returns pure label for non-ko languages', () => {
    const entry = getGenreLabel('webtoon', 'goguma', 'en');
    expect(formatLabel(entry, 'en')).toBe('Conflict density');
  });

  it('returns pure label for novel mode (no originalTerm)', () => {
    const entry = getGenreLabel('novel', 'goguma', 'ko');
    expect(formatLabel(entry, 'ko')).toBe('고구마');
  });

  it('handles missing originalTerm gracefully', () => {
    const entry = { label: 'Only Label' };
    expect(formatLabel(entry, 'ko')).toBe('Only Label');
  });

  it('does not duplicate if label equals originalTerm', () => {
    const entry = { label: 'A', originalTerm: 'A' };
    expect(formatLabel(entry, 'ko')).toBe('A');
  });
});
