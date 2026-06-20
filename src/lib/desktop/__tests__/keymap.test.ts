import {
  DEFAULT_BINDS,
  normalizeShortcut,
  shortcutFromEvent,
  resolveAction,
  sanitizeBinds,
  loadBinds,
  saveBinds,
  resetBinds,
  type Bind,
} from '../keymap';

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* jsdom */ }
});

describe('normalizeShortcut', () => {
  it('대소문자·공백·meta→ctrl·정렬', () => {
    expect(normalizeShortcut('Ctrl+K')).toBe('ctrl+k');
    expect(normalizeShortcut('Meta + Shift + Z')).toBe('ctrl+shift+z');
    expect(normalizeShortcut('shift+ctrl+Z')).toBe('ctrl+shift+z');
    expect(normalizeShortcut('CONTROL+/')).toBe('ctrl+/');
    expect(normalizeShortcut('Cmd+S')).toBe('ctrl+s');
  });

  it('특수키 별칭 정규화', () => {
    expect(normalizeShortcut('Escape')).toBe('esc');
    expect(normalizeShortcut('ESC')).toBe('esc');
    expect(normalizeShortcut('F11')).toBe('f11');
  });

  it('빈/null/비문자열 → 빈 문자열', () => {
    expect(normalizeShortcut('')).toBe('');
    expect(normalizeShortcut('   ')).toBe('');
    expect(normalizeShortcut(null)).toBe('');
    expect(normalizeShortcut(undefined)).toBe('');
    expect(normalizeShortcut(123 as unknown as string)).toBe('');
  });

  it('수식자만(키 없음) → 빈 문자열', () => {
    expect(normalizeShortcut('Ctrl+Shift')).toBe('');
    expect(normalizeShortcut('Alt')).toBe('');
  });
});

describe('shortcutFromEvent', () => {
  it('정상 KeyboardEvent', () => {
    expect(shortcutFromEvent({ key: 'k', ctrlKey: true })).toBe('ctrl+k');
    expect(shortcutFromEvent({ key: 'Z', ctrlKey: true, shiftKey: true })).toBe('ctrl+shift+z');
    expect(shortcutFromEvent({ key: 'F11' })).toBe('f11');
    expect(shortcutFromEvent({ key: 'Escape' })).toBe('esc');
  });

  it('metaKey 도 ctrl 로 매핑 (mac 호환)', () => {
    expect(shortcutFromEvent({ key: 's', metaKey: true })).toBe('ctrl+s');
  });

  it('null/빈 key 방어', () => {
    expect(shortcutFromEvent(null)).toBe('');
    expect(shortcutFromEvent(undefined)).toBe('');
    expect(shortcutFromEvent({ key: '' })).toBe('');
  });
});

describe('resolveAction', () => {
  it('기본 바인딩과 매칭', () => {
    expect(resolveAction({ key: 'k', ctrlKey: true })).toBe('palette');
    expect(resolveAction({ key: 's', ctrlKey: true })).toBe('save');
    expect(resolveAction({ key: 'F11' })).toBe('zen');
    expect(resolveAction({ key: 'Escape' })).toBe('cancel');
    expect(resolveAction({ key: '/', ctrlKey: true })).toBe('help');
    expect(resolveAction({ key: 'Z', ctrlKey: true, shiftKey: true })).toBe('redo');
  });

  it('미매칭 → null', () => {
    expect(resolveAction({ key: 'q', ctrlKey: true })).toBeNull();
    expect(resolveAction({ key: 'F5' })).toBeNull();
    expect(resolveAction(null)).toBeNull();
  });

  it('명시 바인딩 인자 우선', () => {
    const custom: Bind[] = [{ shortcut: 'Ctrl+J', action: 'jump' }];
    expect(resolveAction({ key: 'j', ctrlKey: true }, custom)).toBe('jump');
    expect(resolveAction({ key: 'k', ctrlKey: true }, custom)).toBeNull();
  });
});

describe('sanitizeBinds', () => {
  it('정상 정제 + 정규화', () => {
    const r = sanitizeBinds([
      { shortcut: 'Ctrl+J', action: 'jump' },
      { shortcut: 'Meta+P', action: 'print' },
    ]);
    expect(r).toEqual([
      { shortcut: 'ctrl+j', action: 'jump' },
      { shortcut: 'ctrl+p', action: 'print' },
    ]);
  });

  it('비정상 입력 제거', () => {
    const r = sanitizeBinds([
      null,
      { shortcut: '', action: 'x' },
      { shortcut: 'Ctrl+A', action: '' },
      { shortcut: 'Ctrl+Shift', action: 'badmod' }, // 키 없음
      { shortcut: 'Ctrl+B', action: 'bold' },
      'string' as unknown as Bind,
    ]);
    expect(r).toEqual([{ shortcut: 'ctrl+b', action: 'bold' }]);
  });

  it('배열 아님 → 빈 배열', () => {
    expect(sanitizeBinds(null)).toEqual([]);
    expect(sanitizeBinds({})).toEqual([]);
    expect(sanitizeBinds('x')).toEqual([]);
  });

  it('동일 단축키 충돌 → 마지막 액션이 승, 이전 액션 제거', () => {
    const r = sanitizeBinds([
      { shortcut: 'Ctrl+K', action: 'palette' },
      { shortcut: 'Ctrl+K', action: 'kanban' },
    ]);
    expect(r).toEqual([{ shortcut: 'ctrl+k', action: 'kanban' }]);
  });
});

describe('load/save round-trip', () => {
  it('미저장 시 DEFAULT_BINDS 반환', () => {
    const binds = loadBinds();
    expect(binds.length).toBe(DEFAULT_BINDS.length);
    const palette = binds.find(b => b.action === 'palette');
    expect(palette?.shortcut).toBe('ctrl+k');
  });

  it('사용자 커스텀 저장 후 병합 로드', () => {
    saveBinds([{ shortcut: 'Ctrl+K', action: 'palette' }]); // 동일 action 유지
    saveBinds([
      { shortcut: 'Ctrl+K', action: 'palette' },
      { shortcut: 'Ctrl+J', action: 'jump' },
    ]);
    const binds = loadBinds();
    expect(binds.find(b => b.action === 'jump')?.shortcut).toBe('ctrl+j');
    // 기본 보존
    expect(binds.find(b => b.action === 'save')?.shortcut).toBe('ctrl+s');
  });

  it('사용자 override 가 기본을 덮어씀', () => {
    saveBinds([{ shortcut: 'Ctrl+Alt+K', action: 'palette' }]);
    expect(loadBinds().find(b => b.action === 'palette')?.shortcut).toBe('ctrl+alt+k');
  });

  it('손상 JSON → DEFAULT_BINDS', () => {
    window.localStorage.setItem('noa_desktop_keymap_v1', '{broken');
    const binds = loadBinds();
    expect(binds.find(b => b.action === 'palette')?.shortcut).toBe('ctrl+k');
  });

  it('resetBinds 후 기본 복귀', () => {
    saveBinds([{ shortcut: 'Ctrl+Alt+K', action: 'palette' }]);
    resetBinds();
    expect(loadBinds().find(b => b.action === 'palette')?.shortcut).toBe('ctrl+k');
  });
});

describe('resolveAction with persisted overrides', () => {
  it('사용자 override 후 새 단축키로 매칭', () => {
    saveBinds([{ shortcut: 'Ctrl+Alt+K', action: 'palette' }]);
    expect(resolveAction({ key: 'k', ctrlKey: true, altKey: true })).toBe('palette');
    expect(resolveAction({ key: 'k', ctrlKey: true })).toBeNull();
  });
});
