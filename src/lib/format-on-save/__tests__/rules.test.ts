import { formatText, getAllFormatRules, countChangedLines } from '../rules';

describe('formatText', () => {
  test('빈 입력 → 빈 출력', () => {
    expect(formatText('')).toBe('');
  });

  test('빈 줄 3+ → 2개 압축', () => {
    const r = formatText('A\n\n\n\nB');
    expect(r).toBe('A\n\nB');
  });

  test('trailing whitespace 제거', () => {
    const r = formatText('hello   \nworld\t\t');
    expect(r).toBe('hello\nworld');
  });

  test('큰따옴표 정규화', () => {
    const r = formatText('“안녕” ”세상”');
    expect(r).toBe('"안녕" "세상"');
  });

  test('말줄임표 ... → …', () => {
    const r = formatText('아... 그래......');
    expect(r).toBe('아… 그래…');
  });

  test('화살표 정규화', () => {
    const r = formatText('A --> B <-- C');
    expect(r).toBe('A → B ← C');
  });

  test('idempotent — 두번 적용해도 같음', () => {
    const text = 'A\n\n\nB “quote”';
    const once = formatText(text);
    const twice = formatText(once);
    expect(once).toBe(twice);
  });

  test('quoteStyle curly', () => {
    const r = formatText('"안녕" "세상"', { quoteStyle: 'curly' });
    expect(r).toBe('“안녕” “세상”');
  });

  test('disabled rule — 적용 X', () => {
    const r = formatText('아......', { enabledRules: new Set([]) });
    expect(r).toBe('아......');
  });

  test('countChangedLines', () => {
    expect(countChangedLines('A\nB', 'A\nB')).toBe(0);
    expect(countChangedLines('A\nB', 'A\nC')).toBe(1);
    expect(countChangedLines('A\nB\nC', 'A\nX\nY')).toBe(2);
  });

  test('getAllFormatRules — 7 rules', () => {
    expect(getAllFormatRules()).toHaveLength(7);
  });
});
