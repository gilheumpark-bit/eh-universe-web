import { findAllOccurrences, replaceAllOccurrences } from '../find-occurrences';

describe('findAllOccurrences', () => {
  test('빈 입력 → 빈 array', () => {
    expect(findAllOccurrences('', 'abc')).toEqual([]);
    expect(findAllOccurrences('text', '')).toEqual([]);
  });

  test('단일 매치', () => {
    const r = findAllOccurrences('김준이 검을 들었다', '김준');
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe(0);
    expect(r[0].text).toBe('김준');
  });

  test('다회 매치', () => {
    const r = findAllOccurrences('김준은 김준이다 김준', '김준');
    expect(r).toHaveLength(3);
  });

  test('대소문자 — case-insensitive default', () => {
    const r = findAllOccurrences('Hello hello HELLO', 'hello');
    expect(r).toHaveLength(3);
  });

  test('대소문자 — case-sensitive', () => {
    const r = findAllOccurrences('Hello hello HELLO', 'hello', { caseSensitive: true });
    expect(r).toHaveLength(1);
  });

  test('regex 모드', () => {
    const r = findAllOccurrences('a1 b2 c3', '[a-z]\\d', { regex: true });
    expect(r).toHaveLength(3);
  });

  test('invalid regex → 빈 array (throw X)', () => {
    const r = findAllOccurrences('text', '(', { regex: true });
    expect(r).toEqual([]);
  });
});

describe('replaceAllOccurrences', () => {
  test('빈 occurrences → 원본 반환', () => {
    expect(replaceAllOccurrences('text', [], 'X')).toBe('text');
  });

  test('일괄 치환 — 뒤에서 앞으로', () => {
    const text = '김준은 김준이다';
    const occs = findAllOccurrences(text, '김준');
    const result = replaceAllOccurrences(text, occs, '서연');
    expect(result).toBe('서연은 서연이다');
  });

  test('치환 길이 변경 시에도 정확', () => {
    const text = 'AB AB AB';
    const occs = findAllOccurrences(text, 'AB');
    const result = replaceAllOccurrences(text, occs, 'XYZW');
    expect(result).toBe('XYZW XYZW XYZW');
  });
});
