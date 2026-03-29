import { Genre } from '@/lib/studio-types';
import {
  extractTextMetrics,
  runGenreLevelReview,
  READER_LEVELS,
  GENRE_BENCHMARKS,
} from '../genre-review';
import type { ReaderLevel } from '../genre-review';

// ============================================================
// PART 1 — extractTextMetrics
// ============================================================

describe('extractTextMetrics', () => {
  it('returns zeroed metrics for empty string', () => {
    const m = extractTextMetrics('');
    expect(m.totalChars).toBe(0);
    expect(m.totalLines).toBe(0);
    expect(m.dialogueRatio).toBe(0);
    expect(m.uniqueNames).toEqual([]);
  });

  it('returns zeroed metrics for whitespace-only string', () => {
    const m = extractTextMetrics('   \n  \n  ');
    // trim().length === 0 triggers early return with all zeros
    expect(m.totalChars).toBe(0);
    expect(m.totalLines).toBe(0);
  });

  it('counts dialogue lines starting with quotes', () => {
    const text = `"Hello," she said.\nHe nodded.\n「안녕하세요」`;
    const m = extractTextMetrics(text);
    expect(m.dialogueLines).toBeGreaterThanOrEqual(2);
    expect(m.totalLines).toBe(3);
  });

  it('detects Korean-style dialogue with left corner bracket', () => {
    const text = `「대화문입니다」\n서술문입니다.`;
    const m = extractTextMetrics(text);
    expect(m.dialogueLines).toBe(1);
  });

  it('computes avgSentenceLen for normal text', () => {
    const text = 'This is a sentence. And another one here. A third one too.';
    const m = extractTextMetrics(text);
    expect(m.avgSentenceLen).toBeGreaterThan(0);
  });

  it('counts exclamation and question marks', () => {
    const text = 'Wow! Amazing! Really? Yes!';
    const m = extractTextMetrics(text);
    expect(m.exclamationDensity).toBeGreaterThan(0);
    expect(m.questionDensity).toBeGreaterThan(0);
  });

  it('extracts Korean character names', () => {
    const text = '민수가 고개를 끄덕였다. 지연이 웃었다. 서준은 침묵했다.';
    const m = extractTextMetrics(text);
    expect(m.uniqueNames.length).toBeGreaterThanOrEqual(1);
  });

  it('counts paragraphs separated by blank lines', () => {
    const text = '첫 번째 문단입니다.\n\n두 번째 문단입니다.\n\n세 번째 문단입니다.';
    const m = extractTextMetrics(text);
    expect(m.paragraphCount).toBe(3);
  });

  it('computes ellipsisDensity', () => {
    const text = '그리고... 그는 말했다. 아마도… 그럴 것이다.';
    const m = extractTextMetrics(text);
    expect(m.ellipsisDensity).toBeGreaterThan(0);
  });

  it('computes lineBreakDensity', () => {
    const text = 'Line1\n\nLine2\n\nLine3';
    const m = extractTextMetrics(text);
    expect(m.lineBreakDensity).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// PART 2 — READER_LEVELS / GENRE_BENCHMARKS exports
// ============================================================

describe('exported constants', () => {
  it('READER_LEVELS has 4 levels', () => {
    expect(READER_LEVELS).toHaveLength(4);
    expect(READER_LEVELS.map(l => l.level)).toEqual([1, 2, 3, 4]);
  });

  it('GENRE_BENCHMARKS has entries for known genres', () => {
    expect(GENRE_BENCHMARKS[Genre.FANTASY]).toBeDefined();
    expect(GENRE_BENCHMARKS[Genre.ROMANCE]).toBeDefined();
    expect(GENRE_BENCHMARKS[Genre.SYSTEM_HUNTER]).toBeDefined();
  });
});

// ============================================================
// PART 3 — runGenreLevelReview
// ============================================================

const sampleText = `「오늘은 날씨가 좋군」이라고 민수가 말했다.
지연은 고개를 끄덕이며 미소 지었다.
하늘은 맑고, 바람은 부드러웠다. 두 사람은 천천히 공원을 걸었다.
「그런데 말이야... 어제 그 일 기억나?」
민수가 조심스럽게 물었다. 지연의 표정이 순간 굳었다.
그녀는 잠시 침묵한 뒤, 가볍게 한숨을 내쉬었다.
「...잊었으면 했는데」
바람이 두 사람 사이를 스쳐 지나갔다.`;

describe('runGenreLevelReview', () => {
  it('returns a valid review for level 1 casual reader', () => {
    const review = runGenreLevelReview(sampleText, Genre.FANTASY_ROMANCE, 1);
    expect(review.genre).toBe(Genre.FANTASY_ROMANCE);
    expect(review.level).toBe(1);
    expect(review.aspects.length).toBeGreaterThan(0);
    expect(['S', 'A', 'B', 'C', 'D']).toContain(review.overallGrade);
    expect(review.summary.ko).toBeTruthy();
    expect(review.summary.en).toBeTruthy();
  });

  it('returns a valid review for level 2 genre enthusiast', () => {
    const review = runGenreLevelReview(sampleText, Genre.SYSTEM_HUNTER, 2);
    expect(review.level).toBe(2);
    expect(review.levelMeta.level).toBe(2);
    // Level 2 focuses on clicheUsage, foreshadowing, emotionDensity, worldExposition
    const keys = review.aspects.map(a => a.key);
    expect(keys).toContain('clicheUsage');
  });

  it('returns a valid review for level 3 editor', () => {
    const review = runGenreLevelReview(sampleText, Genre.ROMANCE, 3);
    expect(review.level).toBe(3);
    const keys = review.aspects.map(a => a.key);
    expect(keys).toContain('structureIntegrity');
  });

  it('returns a valid review for level 4 critic', () => {
    const review = runGenreLevelReview(sampleText, Genre.SF, 4);
    expect(review.level).toBe(4);
    const keys = review.aspects.map(a => a.key);
    expect(keys).toContain('thematicDepth');
  });

  it('marks estimated keys (clicheUsage, foreshadowing)', () => {
    const review = runGenreLevelReview(sampleText, Genre.FANTASY_ROMANCE, 2);
    const cliche = review.aspects.find(a => a.key === 'clicheUsage');
    if (cliche) {
      expect(cliche.estimated).toBe(true);
    }
    const foreshadow = review.aspects.find(a => a.key === 'foreshadowing');
    if (foreshadow) {
      expect(foreshadow.estimated).toBe(true);
    }
  });

  it('falls back to FANTASY benchmark for unknown genre', () => {
    // Pass a string that is not a valid Genre enum value
    const review = runGenreLevelReview(sampleText, 'UNKNOWN_GENRE' as Genre, 1);
    expect(review.genre).toBe('UNKNOWN_GENRE');
    // Should still produce aspects (falling back to FANTASY)
    expect(review.aspects.length).toBeGreaterThan(0);
  });

  it('aspect positions are valid strings', () => {
    const review = runGenreLevelReview(sampleText, Genre.THRILLER, 1);
    for (const a of review.aspects) {
      expect(['below', 'within', 'above']).toContain(a.position);
      expect(['ok', 'warn', 'danger']).toContain(a.severity);
    }
  });

  it('handles empty text gracefully', () => {
    const review = runGenreLevelReview('', Genre.FANTASY, 1);
    expect(review.aspects.length).toBeGreaterThan(0);
    expect(review.overallGrade).toBeTruthy();
  });

  it('each aspect has label with ko and en', () => {
    const review = runGenreLevelReview(sampleText, Genre.HORROR, 3);
    for (const a of review.aspects) {
      expect(a.label.ko).toBeTruthy();
      expect(a.label.en).toBeTruthy();
      expect(a.comment.ko).toBeTruthy();
      expect(a.comment.en).toBeTruthy();
    }
  });
});
