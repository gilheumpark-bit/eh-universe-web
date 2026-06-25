// ============================================================
// global-search-index.test.ts
// 전역 검색 모듈 단위 테스트.
// 외부 desktop 모듈 import 금지 — 본 테스트는 global-search-index 만 임포트.
// ============================================================

import {
  searchAll,
  highlightExcerpt,
  type SearchableItem,
} from '../global-search-index';

// ------------------------------------------------------------
// 픽스처 — 탭 너머 통합 검색을 흉내내는 활성 표면 표본
// ------------------------------------------------------------
const ITEMS: SearchableItem[] = [
  {
    id: 'u-1',
    label: 'Loreguard Docs',
    body: '공개 Docs에는 제품 기준과 작업 흐름이 정리되어 있다. loreguard 도메인의 핵심.',
    group: 'docs',
  },
  {
    id: 's-1',
    label: '소설 집필 스튜디오',
    body: 'Studio 는 NOA Writing Engine 위에서 동작한다. 집필 OS.',
    group: 'studio',
  },
  {
    id: 'c-1',
    label: '출고 패키지',
    body: '과정기록과 권리/IP 점검 결과를 묶는다.',
    group: 'release',
  },
  {
    id: 'n-1',
    label: '히스토리',
    body: '작업 기록과 이전 세션을 loreguard 흐름 안에서 찾는다.',
    group: 'history',
  },
  {
    id: 't-1',
    label: 'Translation Studio',
    body: '6축 채점 기반 번역 전용 스튜디오. studio 계열.',
    group: 'translation',
  },
];

// ============================================================
// PART A — searchAll 정상 케이스
// ============================================================
describe('searchAll — 정상', () => {
  it('label 매치가 body 매치보다 높은 점수', () => {
    const results = searchAll(ITEMS, 'Studio');
    // label 에 Studio 가 들어있는 항목들이 상위.
    const labels = results.map((r) => r.item.label);
    expect(labels[0]).toContain('Studio');
    // 모든 결과의 excerpt 는 비어있지 않다.
    for (const r of results) {
      expect(r.excerpt.length).toBeGreaterThan(0);
      expect(r.score).toBeGreaterThan(0);
    }
  });

  it('대소문자 무시 (기본값)', () => {
    const lower = searchAll(ITEMS, 'loreguard');
    const upper = searchAll(ITEMS, 'LOREGUARD');
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBeGreaterThan(0);
  });

  it('caseSensitive=true 시 일치 항목만', () => {
    const sensitive = searchAll(ITEMS, 'loreguard', { caseSensitive: true });
    // body 에 'loreguard' (소문자) 가 들어있는 항목만.
    const ids = sensitive.map((r) => r.item.id);
    expect(ids).toContain('u-1');
    expect(ids).toContain('n-1');
    // label 에는 'Loreguard' 라 일치하지 않음.
    const exactLabelHit = sensitive.find((r) => r.item.label === 'Loreguard Docs');
    // u-1 은 body 매치로 포함되지만, 'Loreguard' 라벨 자체로는 매치 안됨.
    expect(exactLabelHit).toBeDefined();
  });

  it('한글 매치', () => {
    const results = searchAll(ITEMS, '스튜디오');
    const ids = results.map((r) => r.item.id);
    expect(ids).toContain('s-1');
    expect(ids).toContain('t-1');
  });

  it('limit 옵션이 결과 개수를 자른다', () => {
    const all = searchAll(ITEMS, 'studio');
    expect(all.length).toBeGreaterThan(1);
    const limited = searchAll(ITEMS, 'studio', { limit: 1 });
    expect(limited.length).toBe(1);
    expect(limited[0].item.id).toBe(all[0].item.id);
  });

  it('점수 내림차순 정렬', () => {
    const results = searchAll(ITEMS, 'studio');
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});

// ============================================================
// PART B — searchAll 빈/경계/이상 케이스
// ============================================================
describe('searchAll — 경계', () => {
  it('빈 query → []', () => {
    expect(searchAll(ITEMS, '')).toEqual([]);
    expect(searchAll(ITEMS, '   ')).toEqual([]);
  });

  it('null/undefined 입력 → []', () => {
    expect(searchAll(null, 'studio')).toEqual([]);
    expect(searchAll(undefined, 'studio')).toEqual([]);
    expect(searchAll(ITEMS, null)).toEqual([]);
    expect(searchAll(ITEMS, undefined)).toEqual([]);
  });

  it('빈 items 배열 → []', () => {
    expect(searchAll([], 'studio')).toEqual([]);
  });

  it('매치 없음 → []', () => {
    expect(searchAll(ITEMS, 'zzzzz-no-such-token')).toEqual([]);
  });

  it('정규식 메타문자가 query 에 있어도 안전 (escape)', () => {
    const special: SearchableItem[] = [
      { id: 'x', label: 'C++ guide', body: 'C++ (1990)', group: 'g' },
      { id: 'y', label: 'plain', body: 'no special', group: 'g' },
    ];
    // 메타문자 '+' 그대로 검색 — escape 안되면 정규식 폭주.
    const results = searchAll(special, 'C++');
    expect(results.length).toBe(1);
    expect(results[0].item.id).toBe('x');

    // 괄호도 안전.
    const parens = searchAll(special, '(1990)');
    expect(parens.length).toBe(1);
    expect(parens[0].item.id).toBe('x');
  });

  it('id 가 비어있거나 잘못된 item 은 스킵', () => {
    const bad = [
      { id: '', label: 'bad', body: 'studio', group: 'g' },
      null,
      undefined,
      { id: 'good', label: 'ok studio', body: '', group: 'g' },
    ] as unknown as SearchableItem[];
    const results = searchAll(bad, 'studio');
    expect(results.length).toBe(1);
    expect(results[0].item.id).toBe('good');
  });

  it('limit 0/음수는 무시되어 전체 반환', () => {
    const all = searchAll(ITEMS, 'studio');
    expect(searchAll(ITEMS, 'studio', { limit: 0 })).toEqual(all);
    expect(searchAll(ITEMS, 'studio', { limit: -5 })).toEqual(all);
  });
});

// ============================================================
// PART C — excerpt 동작
// ============================================================
describe('searchAll — excerpt', () => {
  it('excerpt 는 매치 위치 ±40자 컨텍스트', () => {
    const long: SearchableItem = {
      id: 'long',
      label: 'irrelevant label here',
      body: 'a'.repeat(100) + 'NEEDLE' + 'b'.repeat(100),
      group: 'g',
    };
    const results = searchAll([long], 'NEEDLE');
    expect(results.length).toBe(1);
    const ex = results[0].excerpt;
    expect(ex).toContain('NEEDLE');
    // 양쪽이 길게 잘렸으므로 ellipsis 포함.
    expect(ex.startsWith('…')).toBe(true);
    expect(ex.endsWith('…')).toBe(true);
  });

  it('label 매치가 있으면 label 기반 excerpt', () => {
    const item: SearchableItem = {
      id: 'l',
      label: 'Studio NEEDLE here',
      body: 'irrelevant body content NEEDLE there',
      group: 'g',
    };
    const results = searchAll([item], 'NEEDLE');
    expect(results[0].excerpt).toContain('Studio');
    expect(results[0].excerpt).toContain('NEEDLE');
  });
});

// ============================================================
// PART D — highlightExcerpt
// ============================================================
describe('highlightExcerpt', () => {
  it('첫 매치 위치 기준 before/match/after 분해', () => {
    const r = highlightExcerpt('Hello World, hello again', 'world');
    expect(r.before).toBe('Hello ');
    expect(r.match).toBe('World');
    expect(r.after).toBe(', hello again');
  });

  it('한글 매치 분해', () => {
    const r = highlightExcerpt('나는 소설을 쓴다', '소설');
    expect(r.before).toBe('나는 ');
    expect(r.match).toBe('소설');
    expect(r.after).toBe('을 쓴다');
  });

  it('매치 없음 → match 빈 문자열, before 는 원문', () => {
    const r = highlightExcerpt('Hello world', 'zzz');
    expect(r.before).toBe('Hello world');
    expect(r.match).toBe('');
    expect(r.after).toBe('');
  });

  it('빈 query / 빈 body 안전 처리', () => {
    expect(highlightExcerpt('hello', '')).toEqual({ before: 'hello', match: '', after: '' });
    expect(highlightExcerpt('', 'x')).toEqual({ before: '', match: '', after: '' });
    expect(highlightExcerpt(null, 'x')).toEqual({ before: '', match: '', after: '' });
    expect(highlightExcerpt('hello', null)).toEqual({ before: 'hello', match: '', after: '' });
  });

  it('정규식 메타문자 safe', () => {
    const r = highlightExcerpt('use C++ today', 'C++');
    expect(r.before).toBe('use ');
    expect(r.match).toBe('C++');
    expect(r.after).toBe(' today');
  });
});
