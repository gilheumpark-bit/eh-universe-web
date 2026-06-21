import {
  applyIndentToLineRange,
  applyInsertAt,
  applyWrapToRange,
} from '../WritingToolbar';

describe('WritingToolbar text operations', () => {
  it('wraps a selected range and preserves the inner selection', () => {
    const result = applyWrapToRange('alpha beta gamma', { start: 6, end: 10 }, '「', '」');

    expect(result.text).toBe('alpha 「beta」 gamma');
    expect(result.selection).toEqual({ start: 7, end: 11 });
  });

  it('inserts scene text at a clamped cursor offset', () => {
    const result = applyInsertAt('alpha', 99, '\n\n* * *\n\n');

    expect(result.text).toBe('alpha\n\n* * *\n\n');
    expect(result.selection).toEqual({ start: 14, end: 14 });
  });

  it('indents all touched lines in the selected range', () => {
    const result = applyIndentToLineRange('one\ntwo\nthree', { start: 1, end: 6 }, 'in');

    expect(result.text).toBe('  one\n  two\nthree');
    expect(result.selection.end).toBeGreaterThan(6);
  });

  it('outdents all touched lines without deleting content', () => {
    const result = applyIndentToLineRange('  one\n two\nthree', { start: 0, end: 10 }, 'out');

    expect(result.text).toBe('one\ntwo\nthree');
    expect(result.selection.start).toBe(0);
  });
});
