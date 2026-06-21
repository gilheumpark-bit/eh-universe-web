import {
  ACTION_CATALOG,
  resolveLabel,
  filterByArea,
  groupByCategory,
  getActionDef,
  bindAction,
  bindActions,
} from '../action-registry';

describe('ACTION_CATALOG 무결성', () => {
  it('모든 entry 가 id 일치', () => {
    for (const [key, def] of Object.entries(ACTION_CATALOG)) {
      expect(def.id).toBe(key);
    }
  });
  it('id 가 area prefix 패턴 따름', () => {
    for (const def of Object.values(ACTION_CATALOG)) {
      // 신버전 공개 표면: studio, translate, global 만 허용
      expect(def.id).toMatch(/^(studio|translate|global):/);
    }
  });
  it('모든 entry 가 정의된 category 사용', () => {
    const valid = new Set(['navigation','ai','edit','view','data','help','system']);
    for (const def of Object.values(ACTION_CATALOG)) {
      expect(valid.has(def.category)).toBe(true);
    }
  });
});

describe('resolveLabel', () => {
  it('i18n.ko 우선 (lang=ko)', () => {
    const def = ACTION_CATALOG['studio:tab-world'];
    expect(resolveLabel(def, 'ko')).toBe('세계관 탭');
  });
  it('i18n.ja 우선 (lang=ja)', () => {
    const def = ACTION_CATALOG['studio:tab-world'];
    expect(resolveLabel(def, 'ja')).toBe('世界観タブ');
  });
  it('i18n 없으면 label 폴백', () => {
    const def = { id: 'x', label: 'Fallback', area: 'studio' as const, category: 'edit' as const };
    expect(resolveLabel(def, 'ko')).toBe('Fallback');
  });
  it('i18n.zh 빈 문자열은 label 폴백', () => {
    const def = { id: 'x', label: 'Fallback', i18n: { zh: '' }, area: 'studio' as const, category: 'edit' as const };
    expect(resolveLabel(def, 'zh')).toBe('Fallback');
  });
});

describe('filterByArea', () => {
  it('studio 영역 + global 포함', () => {
    const out = filterByArea('studio', true);
    expect(out.some((d) => d.area === 'studio')).toBe(true);
    expect(out.some((d) => d.area === 'global')).toBe(true);
    expect(out.every((d) => d.area === 'studio' || d.area === 'global')).toBe(true);
  });
  it('global 제외 옵션', () => {
    const out = filterByArea('translation-studio', false);
    expect(out.every((d) => d.area === 'translation-studio')).toBe(true);
  });
});

describe('groupByCategory', () => {
  it('카테고리별 분리', () => {
    const grouped = groupByCategory(filterByArea('studio'));
    expect(grouped.navigation.length).toBeGreaterThan(0);
    expect(Object.keys(grouped)).toEqual(['navigation','ai','edit','view','data','help','system']);
  });
});

describe('getActionDef', () => {
  it('존재하는 ID 반환', () => {
    const d = getActionDef('studio:tab-world');
    expect(d?.id).toBe('studio:tab-world');
  });
  it('미정의 ID 는 null', () => {
    expect(getActionDef('xxx:nope')).toBeNull();
  });
});

describe('bindAction', () => {
  it('정상 바인딩', () => {
    const fn = jest.fn();
    const bound = bindAction('studio:tab-world', fn);
    expect(bound.id).toBe('studio:tab-world');
    expect(typeof bound.action).toBe('function');
    bound.action();
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('미정의 ID throw', () => {
    expect(() => bindAction('nonexistent:id', () => {})).toThrow(/Unknown action id/);
  });
});

describe('bindActions', () => {
  it('다중 바인딩', () => {
    const list = bindActions({
      'studio:tab-world': () => {},
      'studio:ai-generate': () => {},
    });
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('studio:tab-world');
  });
  it('하나라도 미정의 시 throw — 부분 등록 방지', () => {
    expect(() => bindActions({
      'studio:tab-world': () => {},
      'fake:unknown': () => {},
    })).toThrow();
  });
});
