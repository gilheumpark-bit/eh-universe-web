// ============================================================
// chapter-splitter — 한국 웹소설 회차 분할 검증.
// ============================================================

import { splitIntoChapters, summarizeSplit } from '../chapter-splitter';

describe('splitIntoChapters', () => {
  it('짧은 텍스트 → 1 회차', () => {
    const text = 'short text only';
    const splits = splitIntoChapters(text);
    expect(splits).toHaveLength(1);
    expect(splits[0].content).toBe('short text only');
    expect(splits[0].naturalBreak).toBe(true);
  });

  it('긴 텍스트 → 5,500자 단위 분할', () => {
    const para = 'Paragraph content. '.repeat(50); // ~950 chars per
    const text = Array.from({ length: 20 }, () => para).join('\n\n***\n\n');
    const splits = splitIntoChapters(text);
    expect(splits.length).toBeGreaterThan(1);
    splits.forEach((s) => expect(s.charCount).toBeLessThan(7000));
  });

  it('자연 break (***) 우선 사용', () => {
    const para = 'Para content. '.repeat(200); // ~2,800 chars
    const text = `${para}\n\n***\n\n${para}\n\n***\n\n${para}`;
    const splits = splitIntoChapters(text);
    const naturalCount = splits.filter((s) => s.naturalBreak).length;
    expect(naturalCount).toBeGreaterThan(0);
  });

  it('targetCharCount 옵션 적용', () => {
    const text = 'Para. '.repeat(2000);
    const splits = splitIntoChapters(text, { targetCharCount: 1000, tolerance: 100 });
    splits.slice(0, -1).forEach((s) => expect(s.charCount).toBeLessThan(1500));
  });

  it('titlePrefix 옵션 적용', () => {
    const text = 'Para. '.repeat(2000);
    const splits = splitIntoChapters(text, { titlePrefix: '제', targetCharCount: 1000 });
    expect(splits[0].title).toMatch(/^제 \d+$/);
  });

  it('빈 텍스트 → 1 entry (빈)', () => {
    const splits = splitIntoChapters('');
    expect(splits).toHaveLength(1);
    expect(splits[0].content).toBe('');
  });
});

describe('summarizeSplit', () => {
  it('빈 list → 0 통계', () => {
    const stats = summarizeSplit([]);
    expect(stats.total).toBe(0);
    expect(stats.avgCharCount).toBe(0);
    expect(stats.naturalBreakRate).toBe(1);
  });

  it('자연 break 100% → rate 1.0', () => {
    const stats = summarizeSplit([
      { index: 1, title: 'A', content: 'a', charCount: 100, naturalBreak: true },
      { index: 2, title: 'B', content: 'b', charCount: 200, naturalBreak: true },
    ]);
    expect(stats.naturalBreakRate).toBe(1);
    expect(stats.total).toBe(2);
    expect(stats.avgCharCount).toBe(150);
  });

  it('절반 자연 break → rate 0.5', () => {
    const stats = summarizeSplit([
      { index: 1, title: 'A', content: 'a', charCount: 100, naturalBreak: true },
      { index: 2, title: 'B', content: 'b', charCount: 200, naturalBreak: false },
    ]);
    expect(stats.naturalBreakRate).toBe(0.5);
  });
});
