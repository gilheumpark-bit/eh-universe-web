import { replaceRange, safeReplaceRange } from '@/lib/rewrite-range';

// ============================================================
// replaceRange — 범위 기반 치환
// ============================================================
describe('replaceRange', () => {
  it('replaces the exact [start, end) range', () => {
    const text = '그는 웃었다. 그녀는 그는 웃었다 라고 말했다. 그는 웃었다.';
    // 두 번째 "그는 웃었다" 의 범위를 손으로 계산
    const start = text.indexOf('그는 웃었다', 5); // 두 번째 등장부터 검색
    const end = start + '그는 웃었다'.length;
    const result = replaceRange(text, start, end, '화를 냈다');
    expect(result).toBe(
      '그는 웃었다. 그녀는 화를 냈다 라고 말했다. 그는 웃었다.',
    );
  });

  it('returns original text when range is out of bounds', () => {
    expect(replaceRange('abc', -1, 2, 'x')).toBe('abc');
    expect(replaceRange('abc', 0, 10, 'x')).toBe('abc');
    expect(replaceRange('abc', 2, 1, 'x')).toBe('abc');
  });

  it('handles empty replacement (deletion)', () => {
    expect(replaceRange('abcdef', 2, 4, '')).toBe('abef');
  });

  it('allows zero-length range (pure insertion)', () => {
    expect(replaceRange('abcdef', 3, 3, 'X')).toBe('abcXdef');
  });

  it('handles NaN / infinite offsets defensively', () => {
    expect(replaceRange('abc', Number.NaN, 2, 'x')).toBe('abc');
    expect(replaceRange('abc', 0, Number.POSITIVE_INFINITY, 'x')).toBe('abc');
  });
});

// ============================================================
// safeReplaceRange — 범위 우선 + 첫 매치 폴백
// ============================================================
describe('safeReplaceRange', () => {
  it('uses range strategy when slice matches oldText', () => {
    const text = '그는 웃었다. 그녀는 그는 웃었다 라고 말했다. 그는 웃었다.';
    const oldText = '그는 웃었다';
    const start = text.indexOf(oldText, 5); // 두 번째 등장
    const end = start + oldText.length;

    const result = safeReplaceRange(text, oldText, '화를 냈다', start, end);

    expect(result.strategy).toBe('range');
    expect(result.appliedAt).toBe(start);
    expect(result.content).toBe(
      '그는 웃었다. 그녀는 화를 냈다 라고 말했다. 그는 웃었다.',
    );
  });

  it('falls back to first match when slice does NOT match oldText', () => {
    // 텍스트가 편집되어 범위가 어긋난 상황 시뮬레이션
    const text = 'AAA BBB CCC BBB';
    const result = safeReplaceRange(text, 'BBB', 'XXX', 0, 3); // 잘못된 범위 (slice='AAA')

    expect(result.strategy).toBe('fallback-first-match');
    // 첫 번째 "BBB" 만 치환
    expect(result.content).toBe('AAA XXX CCC BBB');
  });

  it('returns no-op when oldText is empty', () => {
    const result = safeReplaceRange('abc', '', 'X', 0, 0);
    expect(result.strategy).toBe('no-op');
    expect(result.content).toBe('abc');
    expect(result.appliedAt).toBe(-1);
  });

  it('returns no-op when oldText is not found at all', () => {
    const result = safeReplaceRange('hello world', 'xyz', 'X', null, null);
    expect(result.strategy).toBe('no-op');
    expect(result.content).toBe('hello world');
  });

  it('uses first-match fallback when offsets are null/undefined', () => {
    const result = safeReplaceRange('foo bar foo', 'foo', 'BAZ', null, null);
    expect(result.strategy).toBe('fallback-first-match');
    expect(result.content).toBe('BAZ bar foo');
    expect(result.appliedAt).toBe(0);
  });

  it('respects range when same substring appears multiple times', () => {
    const text = 'x x x x x';
    // 네 번째 'x' (index 6)
    const result = safeReplaceRange(text, 'x', 'Y', 6, 7);
    expect(result.strategy).toBe('range');
    expect(result.content).toBe('x x x Y x');
  });

  it('treats out-of-bound offsets as missing and falls back', () => {
    const text = 'hello world hello';
    const result = safeReplaceRange(text, 'hello', 'HI', -5, 999);
    expect(result.strategy).toBe('fallback-first-match');
    expect(result.content).toBe('HI world hello');
  });
});
