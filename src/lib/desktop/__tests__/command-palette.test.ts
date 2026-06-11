// ============================================================
// command-palette 테스트 — 등록/검색/정규화/매칭 가드 포함 ≥6 케이스
// ============================================================

import {
  registerCommand,
  unregisterCommand,
  listCommands,
  clearCommands,
  searchCommands,
  normalizeShortcut,
  matchKeyEvent,
  type CommandEntry,
} from '../command-palette';

const mkAction = () => jest.fn();

describe('registerCommand / unregisterCommand / listCommands', () => {
  beforeEach(() => clearCommands());

  it('정상 — 등록 후 목록 조회', () => {
    registerCommand({ id: 'a', label: 'Open File', action: mkAction() });
    registerCommand({ id: 'b', label: 'Save', action: mkAction() });
    const list = listCommands();
    expect(list).toHaveLength(2);
    expect(list.map((e) => e.id).sort()).toEqual(['a', 'b']);
  });

  it('id 중복 — 덮어쓰기', () => {
    const a1 = mkAction();
    const a2 = mkAction();
    registerCommand({ id: 'x', label: 'First', action: a1 });
    registerCommand({ id: 'x', label: 'Second', action: a2 });
    const list = listCommands();
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe('Second');
  });

  it('해제 — 미존재 id 안전', () => {
    registerCommand({ id: 'a', label: 'A', action: mkAction() });
    unregisterCommand('zzz'); // 없음 — 무시
    unregisterCommand('a');
    expect(listCommands()).toHaveLength(0);
  });

  it('잘못된 입력 — 무시 (빈 id/label, action 없음)', () => {
    registerCommand({ id: '', label: 'X', action: mkAction() });
    registerCommand({ id: 'y', label: '', action: mkAction() });
    // @ts-expect-error 의도적 잘못된 입력
    registerCommand({ id: 'z', label: 'Z' });
    // @ts-expect-error 의도적 null
    registerCommand(null);
    expect(listCommands()).toHaveLength(0);
  });
});

describe('searchCommands', () => {
  const pool: CommandEntry[] = [
    { id: '1', label: 'Open File', action: () => {} },
    { id: '2', label: 'Open Folder', action: () => {} },
    { id: '3', label: 'Save File', action: () => {} },
    { id: '4', label: 'Format Document', action: () => {} },
    { id: '5', label: 'New Project', action: () => {} },
  ];

  it('정상 — prefix > contains > fuzzy 정렬', () => {
    const res = searchCommands('open', pool);
    expect(res.length).toBe(2);
    expect(res[0].label.toLowerCase().startsWith('open')).toBe(true);
    expect(res[1].label.toLowerCase().startsWith('open')).toBe(true);
  });

  it('contains 매칭 — 중간 위치', () => {
    const res = searchCommands('file', pool);
    // 'File'을 포함하는 것: Open File, Save File
    const labels = res.map((r) => r.label);
    expect(labels).toContain('Open File');
    expect(labels).toContain('Save File');
  });

  it('fuzzy 매칭 — 순서대로 글자 등장', () => {
    const res = searchCommands('fmt', pool);
    // Format Document → F..m..t (fuzzy)
    const labels = res.map((r) => r.label);
    expect(labels).toContain('Format Document');
  });

  it('빈 쿼리 — 전체 반환 (라벨 정렬)', () => {
    const res = searchCommands('', pool);
    expect(res.length).toBe(pool.length);
  });

  it('미매칭 — 빈 배열', () => {
    expect(searchCommands('zzzz_nope', pool)).toEqual([]);
  });

  it('잘못된 입력 — null/undefined pool, 빈 pool 안전', () => {
    expect(searchCommands('x', [])).toEqual([]);
    // @ts-expect-error 잘못된 입력
    expect(searchCommands('x', null)).toEqual([]);
  });

  it('내부 레지스트리 사용 — entries 미지정', () => {
    clearCommands();
    registerCommand({ id: 'a', label: 'Alpha', action: () => {} });
    registerCommand({ id: 'b', label: 'Beta', action: () => {} });
    const res = searchCommands('al');
    expect(res[0].label).toBe('Alpha');
  });

  it('action 미호출 — 검색은 액션을 트리거하지 않음', () => {
    const spy = jest.fn();
    const list: CommandEntry[] = [{ id: 'x', label: 'Exec', action: spy }];
    searchCommands('exec', list);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('normalizeShortcut', () => {
  it('정상 — Ctrl+K 그대로', () => {
    expect(normalizeShortcut('Ctrl+K')).toBe('Ctrl+K');
  });

  it('대소문자/공백/하이픈 정규화', () => {
    expect(normalizeShortcut('ctrl + k')).toBe('Ctrl+K');
    expect(normalizeShortcut('CTRL-K')).toBe('Ctrl+K');
    expect(normalizeShortcut('  ctrl  k ')).toBe('Ctrl+K');
  });

  it('모디파이어 별칭 통일', () => {
    expect(normalizeShortcut('cmd+p')).toBe('Meta+P');
    expect(normalizeShortcut('control+shift+p')).toBe('Ctrl+Shift+P');
    expect(normalizeShortcut('alt+option+f')).toBe('Alt+F'); // alt=option 동일
    expect(normalizeShortcut('super+space')).toBe('Meta+Space');
  });

  it('Mac 변환 옵션 — Ctrl→Cmd', () => {
    expect(normalizeShortcut('Ctrl+K', { toMac: true })).toBe('Cmd+K');
    expect(normalizeShortcut('Ctrl+Alt+F', { toMac: true })).toBe('Cmd+Option+F');
  });

  it('잘못된 입력 — 빈 문자열 반환', () => {
    expect(normalizeShortcut('')).toBe('');
    expect(normalizeShortcut('   ')).toBe('');
    expect(normalizeShortcut('Ctrl+')).toBe(''); // 메인 키 없음
    // @ts-expect-error null
    expect(normalizeShortcut(null)).toBe('');
    // @ts-expect-error undefined
    expect(normalizeShortcut(undefined)).toBe('');
  });

  it('출력 순서 — Ctrl→Meta→Alt→Shift→Key 고정', () => {
    expect(normalizeShortcut('shift+alt+meta+ctrl+a')).toBe('Ctrl+Meta+Alt+Shift+A');
  });
});

describe('matchKeyEvent', () => {
  it('정상 — Ctrl+K 매칭', () => {
    const ev = { ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: 'k' };
    expect(matchKeyEvent(ev, 'Ctrl+K')).toBe(true);
  });

  it('대문자 키도 매칭', () => {
    const ev = { ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: 'K' };
    expect(matchKeyEvent(ev, 'Ctrl+K')).toBe(true);
  });

  it('모디파이어 불일치 — false', () => {
    const ev1 = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, key: 'k' };
    expect(matchKeyEvent(ev1, 'Ctrl+K')).toBe(false);
    // 단축키에 Shift 없는데 Shift 추가로 누름 → false
    const ev2 = { ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, key: 'k' };
    expect(matchKeyEvent(ev2, 'Ctrl+K')).toBe(false);
  });

  it('다중 모디파이어 — 정확 매칭', () => {
    const ev = { ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, key: 'p' };
    expect(matchKeyEvent(ev, 'Ctrl+Shift+P')).toBe(true);
    expect(matchKeyEvent(ev, 'Ctrl+P')).toBe(false);
  });

  it('특수 키 — Escape/Enter/Arrow', () => {
    const esc = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, key: 'Escape' };
    expect(matchKeyEvent(esc, 'Escape')).toBe(true);
    const arr = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, key: 'ArrowUp' };
    expect(matchKeyEvent(arr, 'ArrowUp')).toBe(true);
    expect(matchKeyEvent(arr, 'Up')).toBe(true); // 별칭
  });

  it('잘못된 입력 — null event, 빈 shortcut → false', () => {
    expect(matchKeyEvent(null, 'Ctrl+K')).toBe(false);
    expect(matchKeyEvent(undefined, 'Ctrl+K')).toBe(false);
    const ev = { ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: 'k' };
    expect(matchKeyEvent(ev, '')).toBe(false);
    expect(matchKeyEvent(ev, '   ')).toBe(false);
    // @ts-expect-error null shortcut
    expect(matchKeyEvent(ev, null)).toBe(false);
  });

  it('action 미호출 — 매칭만 함', () => {
    clearCommands();
    const spy = jest.fn();
    registerCommand({ id: 'k', label: 'Open', shortcut: 'Ctrl+K', action: spy });
    const ev = { ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: 'k' };
    const list = listCommands();
    const hit = list.find((c) => matchKeyEvent(ev, c.shortcut ?? ''));
    expect(hit?.id).toBe('k');
    // 본 모듈은 호출하지 않음
    expect(spy).not.toHaveBeenCalled();
  });
});
