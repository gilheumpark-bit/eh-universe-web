/**
 * Unit tests for src/lib/typo-detector.ts
 * Covers: detectTypos (double-char, batchim-swap, jamo-slip) + applyTypoFixes
 */

import { detectTypos, applyTypoFixes } from '@/lib/typo-detector';

// ============================================================
// PART 1 — detectDoubleChars (via detectTypos)
// ============================================================

describe('detectTypos — double-char detection', () => {
  it('detects repeated Korean syllable ("그그녀" → "그")', () => {
    const result = detectTypos('그그녀는 달렸다');
    const doubles = result.filter(m => m.type === 'double-char');
    expect(doubles).toHaveLength(1);
    expect(doubles[0].original).toBe('그그');
    expect(doubles[0].suggestion).toBe('그');
  });

  it('detects repeated Latin character ("hhelllo")', () => {
    const result = detectTypos('hhelllo world');
    const doubles = result.filter(m => m.type === 'double-char');
    expect(doubles.length).toBeGreaterThanOrEqual(1);
    expect(doubles.some(d => d.original === 'hh')).toBe(true);
    expect(doubles.some(d => d.original === 'lll')).toBe(true);
  });

  it('skips intentional ㅋㅋㅋ repetition', () => {
    const result = detectTypos('ㅋㅋㅋ 웃기다');
    const doubles = result.filter(m => m.type === 'double-char');
    expect(doubles).toHaveLength(0);
  });

  it('skips intentional ㅎㅎ repetition', () => {
    const result = detectTypos('ㅎㅎ 귀엽다');
    const doubles = result.filter(m => m.type === 'double-char');
    expect(doubles).toHaveLength(0);
  });

  it('skips intentional ㅠㅠ, ㅜㅜ repetition', () => {
    const result = detectTypos('ㅠㅠ 슬프다 ㅜㅜ');
    const doubles = result.filter(m => m.type === 'double-char');
    expect(doubles).toHaveLength(0);
  });

  it('skips intentional punctuation repetition (!! ... ~~)', () => {
    const result = detectTypos('대박!! 진짜... 와~~');
    const doubles = result.filter(m => m.type === 'double-char');
    expect(doubles).toHaveLength(0);
  });

  it('skips digit repetition ("1111")', () => {
    const result = detectTypos('코드 1111');
    const doubles = result.filter(m => m.type === 'double-char');
    expect(doubles).toHaveLength(0);
  });

  it('skips whitespace repetition', () => {
    const result = detectTypos('여기   저기');
    const doubles = result.filter(m => m.type === 'double-char');
    expect(doubles).toHaveLength(0);
  });

  it('skips intentional ㅇㅇ repetition', () => {
    const result = detectTypos('ㅇㅇ 알겠어');
    const doubles = result.filter(m => m.type === 'double-char');
    expect(doubles).toHaveLength(0);
  });
});

// ============================================================
// PART 2 — detectLooseJamo / jamo-slip (via detectTypos)
// ============================================================

describe('detectTypos — jamo-slip detection', () => {
  it('detects loose jamo sequence ("ㅎㅏㄴ")', () => {
    const result = detectTypos('ㅎㅏㄴ글 테스트');
    const jamo = result.filter(m => m.type === 'jamo-slip');
    expect(jamo).toHaveLength(1);
    expect(jamo[0].original).toBe('ㅎㅏㄴ');
    expect(jamo[0].suggestion).toContain('자모 분리');
  });

  it('detects longer loose jamo sequence', () => {
    const result = detectTypos('ㄱㅏㄴㅏㄷㅏ');
    const jamo = result.filter(m => m.type === 'jamo-slip');
    expect(jamo).toHaveLength(1);
    expect(jamo[0].original).toBe('ㄱㅏㄴㅏㄷㅏ');
  });

  it('skips emoticon-style jamo (ㅋㅋㅋ, ㅎㅎㅎ)', () => {
    const result = detectTypos('ㅋㅋㅋㅋ');
    const jamo = result.filter(m => m.type === 'jamo-slip');
    expect(jamo).toHaveLength(0);
  });

  it('skips emoticon-style ㅠㅠㅠ', () => {
    const result = detectTypos('ㅠㅠㅠ');
    const jamo = result.filter(m => m.type === 'jamo-slip');
    expect(jamo).toHaveLength(0);
  });

  it('does not flag 2-char jamo sequences (below threshold)', () => {
    const result = detectTypos('ㅎㅏ 맞아');
    const jamo = result.filter(m => m.type === 'jamo-slip');
    expect(jamo).toHaveLength(0);
  });
});

// ============================================================
// PART 3 — detectBatchimSwap (via detectTypos)
// ============================================================

describe('detectTypos — batchim-swap detection', () => {
  it('detects "닫" → "다"', () => {
    const result = detectTypos('했닫');
    const swaps = result.filter(m => m.type === 'batchim-swap');
    expect(swaps.some(s => s.original === '닫' && s.suggestion === '다')).toBe(true);
  });

  it('detects "늘" → "는"', () => {
    const result = detectTypos('있늘');
    const swaps = result.filter(m => m.type === 'batchim-swap');
    expect(swaps.some(s => s.original === '늘' && s.suggestion === '는')).toBe(true);
  });

  it('detects "겄" → "것"', () => {
    const result = detectTypos('그겄은');
    const swaps = result.filter(m => m.type === 'batchim-swap');
    expect(swaps.some(s => s.original === '겄' && s.suggestion === '것')).toBe(true);
  });

  it('detects multiple batchim typos in one text', () => {
    const result = detectTypos('했닫 있늘');
    const swaps = result.filter(m => m.type === 'batchim-swap');
    expect(swaps.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// PART 4 — detectTypos combined + edge cases
// ============================================================

describe('detectTypos — combined & edge cases', () => {
  it('returns empty array for empty string', () => {
    expect(detectTypos('')).toEqual([]);
  });

  it('returns empty array for null-ish input', () => {
    expect(detectTypos(null as unknown as string)).toEqual([]);
    expect(detectTypos(undefined as unknown as string)).toEqual([]);
  });

  it('returns empty array for clean text', () => {
    expect(detectTypos('정상적인 한국어 문장입니다')).toEqual([]);
  });

  it('results are sorted by index', () => {
    const result = detectTypos('그그 했닫 ㅎㅏㄴ');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].index).toBeGreaterThanOrEqual(result[i - 1].index);
    }
  });

  it('deduplicates by index', () => {
    const result = detectTypos('닫닫닫');
    const indices = result.map(m => m.index);
    const unique = new Set(indices);
    expect(indices.length).toBe(unique.size);
  });

  it('handles very short text (single char)', () => {
    expect(detectTypos('가')).toEqual([]);
  });

  it('handles all-spaces text', () => {
    expect(detectTypos('     ')).toEqual([]);
  });

  it('handles special characters only', () => {
    expect(detectTypos('!@#$%^&*()')).toEqual([]);
  });

  it('handles mixed Korean + English with no typos', () => {
    expect(detectTypos('Hey 세계')).toEqual([]);
  });
});

// ============================================================
// PART 5 — applyTypoFixes
// ============================================================

describe('applyTypoFixes', () => {
  it('fixes double-char typo', () => {
    const text = '그그녀는 달렸다';
    const typos = detectTypos(text);
    const fixed = applyTypoFixes(text, typos);
    expect(fixed).toBe('그녀는 달렸다');
  });

  it('fixes batchim-swap typo', () => {
    const text = '했닫';
    const typos = detectTypos(text);
    const fixed = applyTypoFixes(text, typos);
    expect(fixed).toContain('다');
  });

  it('skips jamo-slip (auto-fix not possible)', () => {
    const text = 'ㅎㅏㄴ글';
    const typos = detectTypos(text);
    const fixed = applyTypoFixes(text, typos);
    // jamo-slip should remain unchanged
    expect(fixed).toContain('ㅎㅏㄴ');
  });

  it('returns original when no typos', () => {
    const text = '정상 문장';
    const fixed = applyTypoFixes(text, []);
    expect(fixed).toBe(text);
  });

  it('handles multiple fixes without index collision', () => {
    const text = '그그 했닫';
    const typos = detectTypos(text);
    const fixed = applyTypoFixes(text, typos);
    expect(fixed).not.toContain('그그');
    expect(fixed).toContain('다');
  });
});
