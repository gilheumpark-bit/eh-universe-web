import {
  loadRecents,
  saveRecents,
  pushRecent,
  clearRecents,
  MAX_RECENTS,
  RECENTS_KEY,
  type RecentEntry,
} from '../recents';

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* jsdom */
  }
});

const mk = (id: string, at: number, kind: RecentEntry['kind'] = 'tab'): RecentEntry => ({
  id,
  kind,
  label: `label-${id}`,
  at,
});

describe('pushRecent', () => {
  it('빈 리스트에 항목 추가', () => {
    const next = pushRecent([], mk('a', 1));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('a');
  });

  it('동일 id 재push → 최상단으로 끌어올림 (중복 제거)', () => {
    const list = [mk('a', 1), mk('b', 2), mk('c', 3)];
    const next = pushRecent(list, mk('b', 4));
    expect(next).toHaveLength(3);
    expect(next.map((e) => e.id)).toEqual(['b', 'a', 'c']);
    expect(next[0].at).toBe(4); // at 갱신됨
  });

  it('MAX_RECENTS 초과 시 꼬리 절단', () => {
    const big: RecentEntry[] = [];
    for (let i = 0; i < MAX_RECENTS; i++) big.push(mk(`x${i}`, i));
    const next = pushRecent(big, mk('new', 999));
    expect(next).toHaveLength(MAX_RECENTS);
    expect(next[0].id).toBe('new');
    expect(next[next.length - 1].id).toBe(`x${MAX_RECENTS - 2}`);
  });

  it('빈/null/이상 입력 가드 — 비정상 엔트리는 거부, 비정상 리스트는 []로 처리', () => {
    expect(pushRecent(null, mk('a', 1))).toEqual([mk('a', 1)]);
    expect(pushRecent(undefined, mk('a', 1))).toEqual([mk('a', 1)]);
    expect(pushRecent([mk('a', 1)], null)).toEqual([mk('a', 1)]);
    expect(pushRecent([mk('a', 1)], undefined)).toEqual([mk('a', 1)]);
    // id 누락
    expect(pushRecent([mk('a', 1)], { id: '', kind: 'tab', label: 'l', at: 1 })).toEqual([
      mk('a', 1),
    ]);
    // 잘못된 kind
    expect(
      pushRecent([], { id: 'x', kind: 'bogus' as never, label: 'l', at: 1 }),
    ).toEqual([]);
    // NaN at
    expect(pushRecent([], { id: 'x', kind: 'tab', label: 'l', at: NaN })).toEqual([]);
    // 비배열 리스트 + 정상 엔트리
    expect(pushRecent('garbage' as never, mk('a', 1))).toEqual([mk('a', 1)]);
  });

  it('at 외부 주입 — 호출자 결정성 보장', () => {
    const a = pushRecent([], mk('a', 1000));
    const b = pushRecent(a, mk('b', 2000));
    expect(b[0].at).toBe(2000);
    expect(b[1].at).toBe(1000);
  });

  it('세 가지 kind 모두 수용', () => {
    let l: RecentEntry[] = [];
    l = pushRecent(l, mk('t', 1, 'tab'));
    l = pushRecent(l, mk('c', 2, 'context'));
    l = pushRecent(l, mk('m', 3, 'manuscript-edit'));
    expect(l.map((e) => e.kind)).toEqual(['manuscript-edit', 'context', 'tab']);
  });
});

describe('load/save round-trip', () => {
  it('저장 후 로드 동일', () => {
    const list = [mk('a', 1), mk('b', 2, 'context')];
    saveRecents(list);
    expect(loadRecents()).toEqual(list);
  });

  it('미저장 시 빈 배열', () => {
    expect(loadRecents()).toEqual([]);
  });

  it('손상 JSON → 빈 배열', () => {
    window.localStorage.setItem(RECENTS_KEY, '{broken');
    expect(loadRecents()).toEqual([]);
  });

  it('저장 시 비정상 항목 필터링 후 직렬화', () => {
    const dirty = [
      mk('ok', 1),
      { id: '', kind: 'tab', label: 'x', at: 2 } as RecentEntry,
      null as unknown as RecentEntry,
    ];
    saveRecents(dirty);
    expect(loadRecents()).toEqual([mk('ok', 1)]);
  });

  it('null/undefined 입력 저장 시 빈 배열 직렬화', () => {
    saveRecents(null);
    expect(loadRecents()).toEqual([]);
    saveRecents(undefined);
    expect(loadRecents()).toEqual([]);
  });
});

describe('clearRecents', () => {
  it('저장 항목 제거', () => {
    saveRecents([mk('a', 1)]);
    expect(loadRecents()).toHaveLength(1);
    clearRecents();
    expect(loadRecents()).toEqual([]);
  });

  it('미저장 상태에서도 noop (예외 없음)', () => {
    expect(() => clearRecents()).not.toThrow();
    expect(loadRecents()).toEqual([]);
  });
});

describe('loadRecents normalization', () => {
  it('저장된 배열에 비정상 항목 섞여 있을 때 필터링', () => {
    const mixed = [
      mk('a', 1),
      { id: 'b', kind: 'unknown', label: 'l', at: 2 },
      mk('c', 3),
    ];
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(mixed));
    const loaded = loadRecents();
    expect(loaded.map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('비배열 저장값 → 빈 배열', () => {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify({ not: 'array' }));
    expect(loadRecents()).toEqual([]);
  });
});
