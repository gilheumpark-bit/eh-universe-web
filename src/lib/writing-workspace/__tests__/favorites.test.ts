import {
  loadFavorites,
  saveFavorites,
  addFavorite,
  removeFavorite,
  filterByKind,
  KEY,
  type Favorite,
} from '../favorites';

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* jsdom */
  }
});

// 테스트 헬퍼 — at 외부 주입 원칙 유지
const mk = (
  id: string,
  kind: Favorite['kind'],
  ref: string,
  label = 'L',
  at = 1000,
): Favorite => ({ id, kind, label, ref, at });

describe('addFavorite', () => {
  it('정상: 빈 목록에 추가 → 1건', () => {
    const f = mk('a', 'tab', 'tab:home');
    const next = addFavorite([], f);
    expect(next).toEqual([f]);
  });

  it('중복 ref 차단 — 동일 ref 재추가 시 변화 없음 (멱등)', () => {
    const f1 = mk('a', 'tab', 'tab:home', 'first');
    const f2 = mk('b', 'tab', 'tab:home', 'duplicate');
    const list1 = addFavorite([], f1);
    const list2 = addFavorite(list1, f2);
    expect(list2).toEqual([f1]);
    expect(list2).toHaveLength(1);
  });

  it('서로 다른 ref 는 모두 추가', () => {
    const f1 = mk('a', 'tab', 'tab:home');
    const f2 = mk('b', 'context', 'ctx:character');
    const f3 = mk('c', 'memo', 'memo:42');
    const list = addFavorite(addFavorite(addFavorite([], f1), f2), f3);
    expect(list).toHaveLength(3);
  });

  it('원본 배열 불변 — 새 배열 반환', () => {
    const f = mk('a', 'tab', 'tab:home');
    const list: Favorite[] = [];
    const next = addFavorite(list, f);
    expect(list).toHaveLength(0);
    expect(next).not.toBe(list);
  });

  it('잘못된 입력 (null·필드 누락·invalid kind) → 무시', () => {
    expect(addFavorite([], null)).toEqual([]);
    expect(addFavorite([], undefined)).toEqual([]);
    // invalid kind
    expect(
      addFavorite([], { id: 'x', kind: 'bogus', label: 'L', ref: 'r', at: 1 } as unknown as Favorite),
    ).toEqual([]);
    // 빈 ref
    expect(addFavorite([], mk('x', 'tab', ''))).toEqual([]);
    // 빈 id
    expect(addFavorite([], mk('', 'tab', 'r'))).toEqual([]);
    // 잘못된 at (NaN)
    expect(addFavorite([], mk('x', 'tab', 'r', 'L', Number.NaN))).toEqual([]);
  });

  it('null/undefined 기존 목록 — 빈 배열로 처리 후 추가', () => {
    const f = mk('a', 'tab', 'tab:home');
    expect(addFavorite(null, f)).toEqual([f]);
    expect(addFavorite(undefined, f)).toEqual([f]);
  });
});

describe('removeFavorite', () => {
  it('정상: id 매칭 항목 제거', () => {
    const f1 = mk('a', 'tab', 'tab:1');
    const f2 = mk('b', 'tab', 'tab:2');
    const next = removeFavorite([f1, f2], 'a');
    expect(next).toEqual([f2]);
  });

  it('미존재 id — 기존 목록 그대로', () => {
    const f1 = mk('a', 'tab', 'tab:1');
    const next = removeFavorite([f1], 'zzz');
    expect(next).toEqual([f1]);
  });

  it('빈 id / null 목록 — 안전 처리', () => {
    expect(removeFavorite([mk('a', 'tab', 'r')], '')).toEqual([
      mk('a', 'tab', 'r'),
    ]);
    expect(removeFavorite(null, 'a')).toEqual([]);
    expect(removeFavorite(undefined, 'a')).toEqual([]);
  });

  it('원본 배열 불변', () => {
    const list = [mk('a', 'tab', 'r1'), mk('b', 'tab', 'r2')];
    const next = removeFavorite(list, 'a');
    expect(list).toHaveLength(2);
    expect(next).toHaveLength(1);
    expect(next).not.toBe(list);
  });
});

describe('filterByKind', () => {
  const list: Favorite[] = [
    mk('1', 'tab', 'r1'),
    mk('2', 'context', 'r2'),
    mk('3', 'memo', 'r3'),
    mk('4', 'manuscript-pos', 'r4'),
    mk('5', 'tab', 'r5'),
  ];

  it('정상: kind 일치 항목만', () => {
    expect(filterByKind(list, 'tab')).toHaveLength(2);
    expect(filterByKind(list, 'context')).toHaveLength(1);
    expect(filterByKind(list, 'manuscript-pos')).toHaveLength(1);
  });

  it('잘못된 kind → 빈 배열', () => {
    expect(filterByKind(list, 'bogus' as unknown as Favorite['kind'])).toEqual(
      [],
    );
    expect(filterByKind(list, '' as unknown as Favorite['kind'])).toEqual([]);
  });

  it('null/undefined 목록 — 빈 배열', () => {
    expect(filterByKind(null, 'tab')).toEqual([]);
    expect(filterByKind(undefined, 'tab')).toEqual([]);
  });
});

describe('load/save round-trip', () => {
  it('저장 후 로드 — 동일 목록', () => {
    const list = [mk('a', 'tab', 'r1', 'Home', 1111), mk('b', 'memo', 'r2', 'Note', 2222)];
    saveFavorites(list);
    expect(loadFavorites()).toEqual(list);
  });

  it('미저장 → 빈 배열', () => {
    expect(loadFavorites()).toEqual([]);
  });

  it('손상 JSON → 빈 배열', () => {
    window.localStorage.setItem(KEY, '{broken json');
    expect(loadFavorites()).toEqual([]);
  });

  it('비배열 JSON (객체·문자열) → 빈 배열', () => {
    window.localStorage.setItem(KEY, '{"a":1}');
    expect(loadFavorites()).toEqual([]);
    window.localStorage.setItem(KEY, '"hello"');
    expect(loadFavorites()).toEqual([]);
  });

  it('일부 항목 손상 (invalid kind / 누락 필드) → 정규화로 제거', () => {
    const mixed = [
      mk('a', 'tab', 'r1'),
      { id: 'b', kind: 'bogus', label: 'X', ref: 'r2', at: 1 },
      { id: 'c', label: 'no-kind', ref: 'r3', at: 1 }, // kind 누락
      mk('d', 'memo', 'r4'),
    ];
    window.localStorage.setItem(KEY, JSON.stringify(mixed));
    const loaded = loadFavorites();
    expect(loaded).toHaveLength(2);
    expect(loaded.map((x) => x.id)).toEqual(['a', 'd']);
  });

  it('null/undefined 저장 → 빈 배열 저장', () => {
    saveFavorites(null);
    expect(loadFavorites()).toEqual([]);
    saveFavorites(undefined);
    expect(loadFavorites()).toEqual([]);
  });
});

describe('quota / 손상 setItem·getItem 안전성', () => {
  it('setItem throw 해도 예외 전파 없음', () => {
    const spy = jest
      .spyOn(window.localStorage.__proto__, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(() => saveFavorites([mk('a', 'tab', 'r1')])).not.toThrow();
    spy.mockRestore();
  });

  it('getItem throw 해도 빈 배열 반환', () => {
    const spy = jest
      .spyOn(window.localStorage.__proto__, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError');
      });
    expect(loadFavorites()).toEqual([]);
    spy.mockRestore();
  });
});
