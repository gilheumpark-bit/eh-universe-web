/** @jest-environment jsdom */
import {
  parseCombo,
  matchesCombo,
  isAreaMatch,
  registerKeyBinding,
  setKeyboardModalState,
  getAllBindings,
  _resetKeyboardRegistry,
} from '../keyboard-manager';

function makeEvent(opts: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: opts.key,
    ctrlKey: !!opts.ctrl,
    shiftKey: !!opts.shift,
    altKey: !!opts.alt,
    metaKey: !!opts.meta,
    cancelable: true,
    bubbles: true,
  });
}

beforeEach(() => { _resetKeyboardRegistry(); });

describe('parseCombo', () => {
  it('ctrl+p', () => {
    const c = parseCombo('ctrl+p');
    expect(c).toEqual({ ctrl: true, shift: false, alt: false, meta: false, key: 'p' });
  });
  it('ctrl+shift+k', () => {
    const c = parseCombo('ctrl+shift+k');
    expect(c).toEqual({ ctrl: true, shift: true, alt: false, meta: false, key: 'k' });
  });
  it('cmd 도 meta 로 인식', () => {
    expect(parseCombo('cmd+k').meta).toBe(true);
  });
  it('f1', () => {
    expect(parseCombo('f1')).toMatchObject({ key: 'f1' });
  });
});

describe('matchesCombo', () => {
  it('ctrl+p ↔ ctrlKey=true,key=p', () => {
    const c = parseCombo('ctrl+p');
    expect(matchesCombo(makeEvent({ key: 'p', ctrl: true }), c)).toBe(true);
  });
  it('cmd 키도 ctrl 매칭 (mac 호환)', () => {
    const c = parseCombo('ctrl+p');
    expect(matchesCombo(makeEvent({ key: 'p', meta: true }), c)).toBe(true);
  });
  it('shift 다르면 미매칭', () => {
    const c = parseCombo('ctrl+p');
    expect(matchesCombo(makeEvent({ key: 'p', ctrl: true, shift: true }), c)).toBe(false);
  });
  it('f1 매칭', () => {
    const c = parseCombo('f1');
    expect(matchesCombo(makeEvent({ key: 'f1' }), c)).toBe(true);
  });
});

describe('isAreaMatch', () => {
  it('global 항상 true', () => {
    expect(isAreaMatch('global', '/foo')).toBe(true);
    expect(isAreaMatch('global', '/')).toBe(true);
  });
  it('studio /studio 시작', () => {
    expect(isAreaMatch('studio', '/studio')).toBe(true);
    expect(isAreaMatch('studio', '/studio/abc')).toBe(true);
    expect(isAreaMatch('studio', '/code-studio')).toBe(false);
  });
  it('code-studio /code-studio 시작', () => {
    expect(isAreaMatch('code-studio', '/code-studio')).toBe(true);
    expect(isAreaMatch('code-studio', '/studio')).toBe(false);
  });
  it('translation-studio', () => {
    expect(isAreaMatch('translation-studio', '/translation-studio')).toBe(true);
  });
  it('desktop', () => {
    expect(isAreaMatch('desktop', '/desktop')).toBe(true);
  });
});

describe('registerKeyBinding', () => {
  it('등록 + dispatch', () => {
    window.history.pushState({}, '', '/studio');
    const fn = jest.fn();
    const unreg = registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler: fn });
    window.dispatchEvent(makeEvent({ key: 'p', ctrl: true }));
    expect(fn).toHaveBeenCalledTimes(1);
    unreg();
    window.dispatchEvent(makeEvent({ key: 'p', ctrl: true }));
    expect(fn).toHaveBeenCalledTimes(1); // 추가 호출 없음
  });
  it('영역 불일치 시 미작동', () => {
    window.history.pushState({}, '', '/code-studio');
    const fn = jest.fn();
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler: fn });
    window.dispatchEvent(makeEvent({ key: 'p', ctrl: true }));
    expect(fn).not.toHaveBeenCalled();
  });
  it('global 은 어디서나 작동', () => {
    window.history.pushState({}, '', '/anything');
    const fn = jest.fn();
    registerKeyBinding({ keys: 'ctrl+shift+k', area: 'global', handler: fn });
    window.dispatchEvent(makeEvent({ key: 'k', ctrl: true, shift: true }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('modal 열림 시 비활성 (disableInModal 기본 true)', () => {
    window.history.pushState({}, '', '/studio');
    const fn = jest.fn();
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler: fn });
    setKeyboardModalState(true);
    window.dispatchEvent(makeEvent({ key: 'p', ctrl: true }));
    expect(fn).not.toHaveBeenCalled();
    setKeyboardModalState(false);
    window.dispatchEvent(makeEvent({ key: 'p', ctrl: true }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('priority 높은 것 우선', () => {
    window.history.pushState({}, '', '/studio');
    const low = jest.fn();
    const high = jest.fn();
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler: low, priority: 0 });
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler: high, priority: 10 });
    window.dispatchEvent(makeEvent({ key: 'p', ctrl: true }));
    expect(high).toHaveBeenCalledTimes(1);
    expect(low).not.toHaveBeenCalled();
  });
  it('input 안에서 모디파이어 없는 키 무시', () => {
    window.history.pushState({}, '', '/studio');
    const fn = jest.fn();
    registerKeyBinding({ keys: 'p', area: 'studio', handler: fn });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const evt = new KeyboardEvent('keydown', { key: 'p', cancelable: true, bubbles: true });
    Object.defineProperty(evt, 'target', { value: input });
    window.dispatchEvent(evt);
    expect(fn).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
  it('handler throw 해도 registry 안전', () => {
    window.history.pushState({}, '', '/studio');
    const fn = jest.fn(() => { throw new Error('boom'); });
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler: fn });
    // throw 가 propagate 안 함
    expect(() => window.dispatchEvent(makeEvent({ key: 'p', ctrl: true }))).not.toThrow();
    expect(fn).toHaveBeenCalled();
  });
});

describe('getAllBindings', () => {
  it('등록 목록 조회', () => {
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler: () => {} });
    registerKeyBinding({ keys: 'ctrl+k', area: 'code-studio', handler: () => {} });
    expect(getAllBindings()).toHaveLength(2);
  });
});

// [풀점검 priority 17 — 2026-06-08] isAreaMatch 의 pathname startsWith edge cases 검증.
describe('isAreaMatch — pathname startsWith edge cases', () => {
  it('global → 항상 true (pathname 무관)', () => {
    expect(isAreaMatch('global', '/anything')).toBe(true);
    expect(isAreaMatch('global', '')).toBe(true);
  });

  it('studio /studio — 매치 (정확)', () => {
    expect(isAreaMatch('studio', '/studio')).toBe(true);
  });

  it('studio /studio/ — 매치 (trailing slash)', () => {
    expect(isAreaMatch('studio', '/studio/')).toBe(true);
  });

  it('studio /studio/edit/123 — 매치 (deep path)', () => {
    expect(isAreaMatch('studio', '/studio/edit/123')).toBe(true);
  });

  it('studio /studio-advanced — startsWith 매치 (현 구현 알려진 동작)', () => {
    // 알려진 한계: 단순 startsWith 라 /studio-advanced 도 매치됨. 현재 pathname 에 그런 라우트 없음으로 미수정.
    // 향후 추가 시 isAreaMatch 를 regex 로 강화하고 본 expect 를 false 로 뒤집어야 함.
    expect(isAreaMatch('studio', '/studio-advanced')).toBe(true);
  });

  it('code-studio /code-studio — 매치', () => {
    expect(isAreaMatch('code-studio', '/code-studio')).toBe(true);
    expect(isAreaMatch('code-studio', '/code-studio/file')).toBe(true);
  });

  it('code-studio /studio — 매치 안 됨 (prefix 분리)', () => {
    expect(isAreaMatch('code-studio', '/studio')).toBe(false);
  });

  it('translation-studio /translation-studio — 매치', () => {
    expect(isAreaMatch('translation-studio', '/translation-studio')).toBe(true);
    expect(isAreaMatch('translation-studio', '/translation-studio/draft')).toBe(true);
  });

  it('network /network/planet/1 — 매치', () => {
    expect(isAreaMatch('network', '/network/planet/1')).toBe(true);
  });

  it('codex /codex — 매치', () => {
    expect(isAreaMatch('codex', '/codex')).toBe(true);
    expect(isAreaMatch('codex', '/codex/page/2')).toBe(true);
  });

  it('desktop /desktop — 매치', () => {
    expect(isAreaMatch('desktop', '/desktop')).toBe(true);
  });

  it('studio "" 빈 pathname — 매치 안 됨', () => {
    expect(isAreaMatch('studio', '')).toBe(false);
  });

  it('studio "/" 루트 — 매치 안 됨', () => {
    expect(isAreaMatch('studio', '/')).toBe(false);
  });
});
