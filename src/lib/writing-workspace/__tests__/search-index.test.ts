import { findMatches, nextMatchIndex } from '../search-index';

// ============================================================
// findMatches — 정상·빈·경계·이상 케이스
// ============================================================

describe('findMatches — 정상', () => {
  it('기본 부분 일치 (대소문자 무시)', () => {
    const ranges = findMatches('Hello world hello WORLD', 'hello');
    expect(ranges).toEqual([
      { start: 0, end: 5 },
      { start: 12, end: 17 },
    ]);
  });

  it('caseSensitive=true 시 정확히 일치만', () => {
    const ranges = findMatches('Hello hello HELLO', 'hello', { caseSensitive: true });
    expect(ranges).toEqual([{ start: 6, end: 11 }]);
  });

  it('한글 매치 (UTF-16 인덱스)', () => {
    // '소설'은 BMP 코드 → 길이 2.
    const text = '나는 소설을 쓴다 소설가';
    const ranges = findMatches(text, '소설');
    expect(ranges).toEqual([
      { start: 3, end: 5 },
      { start: 10, end: 12 },
    ]);
  });

  it('wholeWord=true → 단어 경계만', () => {
    const ranges = findMatches('cat catalog cat-walk', 'cat', { wholeWord: true });
    // 'cat' (0-3), 'catalog' 내부 cat 제외, 'cat-walk' 내 cat (12-15)
    expect(ranges).toEqual([
      { start: 0, end: 3 },
      { start: 12, end: 15 },
    ]);
  });

  it('정규식 메타 문자 escape — 점·괄호·별표 평문 검색', () => {
    const text = 'a.b a*b a(b) a.b';
    const dot = findMatches(text, '.');
    // '.' 은 평문 점만 매치 (정규식 any 아님)
    expect(dot.length).toBe(2);
    expect(dot[0]).toEqual({ start: 1, end: 2 });

    const paren = findMatches(text, '(b)');
    expect(paren).toEqual([{ start: 9, end: 12 }]);
  });
});

describe('findMatches — 빈·경계·이상', () => {
  it('빈 query → []', () => {
    expect(findMatches('hello', '')).toEqual([]);
  });

  it('빈 text → []', () => {
    expect(findMatches('', 'hello')).toEqual([]);
  });

  it('null/undefined → []', () => {
    expect(findMatches(null as unknown as string, 'x')).toEqual([]);
    expect(findMatches('x', undefined as unknown as string)).toEqual([]);
    expect(findMatches(undefined as unknown as string, undefined as unknown as string)).toEqual([]);
  });

  it('비문자열 입력 (숫자/객체) → []', () => {
    expect(findMatches(123 as unknown as string, 'x')).toEqual([]);
    expect(findMatches('x', {} as unknown as string)).toEqual([]);
  });

  it('매치 없음 → []', () => {
    expect(findMatches('abc def', 'xyz')).toEqual([]);
  });

  it('연속 매치 — 인접/겹침 없이 다음으로 진행', () => {
    // 'aa' 검색은 'aaaa' 에서 0-2, 2-4 (겹침 없음)
    const ranges = findMatches('aaaa', 'aa');
    expect(ranges).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });

  it('전체가 매치인 경우', () => {
    const ranges = findMatches('abc', 'abc');
    expect(ranges).toEqual([{ start: 0, end: 3 }]);
  });

  it('highlightRanges 충돌 없음 — 각 범위는 서로 겹치지 않음', () => {
    const text = 'foo foo foo';
    const ranges = findMatches(text, 'foo');
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].start).toBeGreaterThanOrEqual(ranges[i - 1].end);
    }
  });
});

// ============================================================
// nextMatchIndex — 정상·빈·경계·이상 케이스
// ============================================================

describe('nextMatchIndex — 정상', () => {
  const m = [
    { start: 0, end: 3 },
    { start: 10, end: 13 },
    { start: 20, end: 23 },
  ];

  it('next 이동 (순환)', () => {
    expect(nextMatchIndex(m, 0, 'next')).toBe(1);
    expect(nextMatchIndex(m, 1, 'next')).toBe(2);
    expect(nextMatchIndex(m, 2, 'next')).toBe(0); // wrap
  });

  it('prev 이동 (역순환)', () => {
    expect(nextMatchIndex(m, 0, 'prev')).toBe(2); // wrap
    expect(nextMatchIndex(m, 1, 'prev')).toBe(0);
    expect(nextMatchIndex(m, 2, 'prev')).toBe(1);
  });

  it('current 범위 밖 / 음수 → next는 0, prev는 마지막', () => {
    expect(nextMatchIndex(m, -1, 'next')).toBe(0);
    expect(nextMatchIndex(m, 99, 'next')).toBe(0);
    expect(nextMatchIndex(m, -1, 'prev')).toBe(2);
    expect(nextMatchIndex(m, 99, 'prev')).toBe(2);
  });
});

describe('nextMatchIndex — 빈·이상', () => {
  it('빈 배열 → -1', () => {
    expect(nextMatchIndex([], 0, 'next')).toBe(-1);
    expect(nextMatchIndex([], 0, 'prev')).toBe(-1);
  });

  it('null/undefined/비배열 → -1', () => {
    expect(nextMatchIndex(null, 0, 'next')).toBe(-1);
    expect(nextMatchIndex(undefined, 0, 'next')).toBe(-1);
    expect(nextMatchIndex({} as unknown as never, 0, 'next')).toBe(-1);
  });

  it('잘못된 direction → -1', () => {
    const m1 = [{ start: 0, end: 1 }];
    expect(nextMatchIndex(m1, 0, 'forward' as never)).toBe(-1);
  });

  it('NaN current → next는 0, prev는 마지막', () => {
    const m2 = [
      { start: 0, end: 1 },
      { start: 2, end: 3 },
    ];
    expect(nextMatchIndex(m2, NaN, 'next')).toBe(0);
    expect(nextMatchIndex(m2, NaN, 'prev')).toBe(1);
  });

  it('단일 매치 — next/prev 모두 0', () => {
    const one = [{ start: 5, end: 8 }];
    expect(nextMatchIndex(one, 0, 'next')).toBe(0);
    expect(nextMatchIndex(one, 0, 'prev')).toBe(0);
  });
});

// ============================================================
// 통합 — findMatches → nextMatchIndex 파이프라인
// ============================================================

describe('통합 시나리오', () => {
  it('Ctrl+F 흐름: 검색 → 다음 → 다음 → 처음으로 wrap', () => {
    const text = 'apple banana apple cherry apple';
    const matches = findMatches(text, 'apple');
    expect(matches.length).toBe(3);

    let idx = 0;
    idx = nextMatchIndex(matches, idx, 'next'); // 1
    expect(idx).toBe(1);
    idx = nextMatchIndex(matches, idx, 'next'); // 2
    expect(idx).toBe(2);
    idx = nextMatchIndex(matches, idx, 'next'); // 0 (wrap)
    expect(idx).toBe(0);
  });
});
