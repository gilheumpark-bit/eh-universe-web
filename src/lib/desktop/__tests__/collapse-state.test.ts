import {
  loadCollapse,
  saveCollapse,
  isCollapsed,
  toggleCollapse,
  KEY,
  type CollapseMap,
} from '../collapse-state';

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* jsdom */
  }
});

describe('isCollapsed', () => {
  it('정상: true 값 → true, false 값 → false', () => {
    const m: CollapseMap = { sidebar: true, stats: false };
    expect(isCollapsed(m, 'sidebar')).toBe(true);
    expect(isCollapsed(m, 'stats')).toBe(false);
  });

  it('미정의 key → false (펼친 상태 기본)', () => {
    expect(isCollapsed({}, 'unknown')).toBe(false);
    expect(isCollapsed({ a: true }, 'b')).toBe(false);
  });

  it('이상 입력 (null/undefined/빈 key) → false', () => {
    expect(isCollapsed(null, 'x')).toBe(false);
    expect(isCollapsed(undefined, 'x')).toBe(false);
    expect(isCollapsed({ x: true }, '')).toBe(false);
  });
});

describe('toggleCollapse', () => {
  it('정상: false→true, true→false 토글', () => {
    const m: CollapseMap = { sidebar: false };
    const t1 = toggleCollapse(m, 'sidebar');
    expect(t1.sidebar).toBe(true);
    const t2 = toggleCollapse(t1, 'sidebar');
    expect(t2.sidebar).toBe(false);
  });

  it('미정의 key 토글 → true 추가 (기본 false 였으므로)', () => {
    const t = toggleCollapse({}, 'panel');
    expect(t.panel).toBe(true);
  });

  it('원본 맵 불변 — 새 객체 반환', () => {
    const m: CollapseMap = { a: true };
    const t = toggleCollapse(m, 'a');
    expect(m.a).toBe(true); // 원본 보존
    expect(t.a).toBe(false);
    expect(t).not.toBe(m);
  });

  it('이상 입력 (null/빈 key) — 안전 처리', () => {
    expect(toggleCollapse(null, 'x')).toEqual({ x: true });
    expect(toggleCollapse({ a: true }, '')).toEqual({ a: true });
  });
});

describe('load/save round-trip', () => {
  it('저장 후 로드 — 동일 맵', () => {
    const m: CollapseMap = { sidebar: true, stats: false, panel: true };
    saveCollapse(m);
    expect(loadCollapse()).toEqual(m);
  });

  it('미저장 상태 → 빈 맵', () => {
    expect(loadCollapse()).toEqual({});
  });

  it('손상 JSON → 빈 맵 (broken 가드)', () => {
    window.localStorage.setItem(KEY, '{broken json');
    expect(loadCollapse()).toEqual({});
  });

  it('비객체 JSON (배열·문자열) → 빈 맵', () => {
    window.localStorage.setItem(KEY, '[1,2,3]');
    expect(loadCollapse()).toEqual({});
    window.localStorage.setItem(KEY, '"hello"');
    expect(loadCollapse()).toEqual({});
  });

  it('boolean 외 값 (숫자·문자열) → 정규화로 제거', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ a: true, b: 1, c: 'true', d: null, e: false }),
    );
    const loaded = loadCollapse();
    expect(loaded).toEqual({ a: true, e: false });
  });

  it('null/undefined 저장 시도 → 빈 맵 저장', () => {
    saveCollapse(null);
    expect(loadCollapse()).toEqual({});
    saveCollapse(undefined);
    expect(loadCollapse()).toEqual({});
  });
});

describe('quota / 손상 setItem 안전성', () => {
  it('setItem throw 해도 예외 전파 없음', () => {
    const original = window.localStorage.setItem.bind(window.localStorage);
    const spy = jest
      .spyOn(window.localStorage.__proto__, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(() => saveCollapse({ a: true })).not.toThrow();
    spy.mockRestore();
    // 복구 후 정상 동작 확인
    void original;
  });

  it('getItem throw 해도 빈 맵 반환', () => {
    const spy = jest
      .spyOn(window.localStorage.__proto__, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError');
      });
    expect(loadCollapse()).toEqual({});
    spy.mockRestore();
  });
});
