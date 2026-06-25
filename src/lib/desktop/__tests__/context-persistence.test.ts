import { loadContextItems, saveContextItems, loadTabMessages, saveTabMessages, trimTabMessages } from '../context-persistence';

beforeEach(() => { try { window.localStorage.clear(); } catch {} });

describe('contextItems round-trip', () => {
  it('빈 → 빈', () => { expect(loadContextItems()).toEqual([]); });
  it('저장 후 로드 동일', () => {
    const items = [{ tab: 'world', label: '세계관', fact: 'F', details: 'D' }];
    expect(saveContextItems(items)).toBe(true);
    expect(loadContextItems()).toEqual(items);
  });
  it('손상 JSON → 빈', () => {
    window.localStorage.setItem('noa_desktop_contextitems_v1', '{broken');
    expect(loadContextItems()).toEqual([]);
  });
  it('타입 오염 항목 필터링', () => {
    window.localStorage.setItem('noa_desktop_contextitems_v1', JSON.stringify([
      { tab: 'world', label: '세계관', fact: 'F', details: 'D' },
      { tab: 'world' }, // 불완전
      'not-an-object',
      null,
    ]));
    expect(loadContextItems()).toHaveLength(1);
  });
  it('비배열 → 빈', () => { expect(saveContextItems('x' as unknown as never)).toBe(false); });
});

describe('tabMessages', () => {
  it('빈 → 빈 객체', () => { expect(loadTabMessages()).toEqual({}); });
  it('저장 후 로드 동일', () => {
    const map = { world: [{ role: 'user' as const, text: '안녕' }] };
    expect(saveTabMessages(map)).toBe(true);
    expect(loadTabMessages()).toEqual(map);
  });
  it('잘못된 role 제거', () => {
    window.localStorage.setItem('noa_desktop_tab_messages_v1', JSON.stringify({
      world: [{ role: 'user', text: 'OK' }, { role: 'admin', text: 'bad' }, { text: 'no role' }],
    }));
    expect(loadTabMessages().world).toEqual([{ role: 'user', text: 'OK' }]);
  });
  it('비객체 → 빈', () => {
    window.localStorage.setItem('noa_desktop_tab_messages_v1', JSON.stringify([1, 2]));
    expect(loadTabMessages()).toEqual({});
  });
});

describe('trimTabMessages', () => {
  it('한도 이하 → 그대로', () => {
    const m = { a: [{ role: 'user' as const, text: '1' }, { role: 'ai' as const, text: '2' }] };
    expect(trimTabMessages(m, 5)).toEqual(m);
  });
  it('한도 초과 → 최근 N개만', () => {
    const arr = Array.from({ length: 70 }, (_, i) => ({ role: 'user' as const, text: String(i) }));
    const trimmed = trimTabMessages({ a: arr }, 60);
    expect(trimmed.a).toHaveLength(60);
    expect(trimmed.a[0].text).toBe('10');
    expect(trimmed.a[59].text).toBe('69');
  });
});
