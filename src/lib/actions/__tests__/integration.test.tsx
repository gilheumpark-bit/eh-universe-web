/**
 * @jest-environment jsdom
 */
// ============================================================
// [P11 루프2/중급, 2026-06-08] integration test —
//   action-registry + keyboard-manager + modal-manager 3-way 플로우 통합.
//
// 단위 테스트 (~240 lines) 는 각 모듈만 검증.
// 실제 운영: Ctrl+P → useKeyboardManager 매칭 → handler 실행 → modal 열림
// → modal 열린 상태에선 다른 단축키 suppress.
//
// 본 통합 테스트 시나리오:
//   1) modal 미열림 → registerKeyBinding(ctrl+p) → keydown 시 핸들러 호출
//   2) 핸들러가 modal 열기 (setKeyboardModalState(true))
//   3) modal 열린 상태 → 다른 단축키 (ctrl+k) suppress 확인
//   4) modal 닫기 → 단축키 다시 동작
//   5) bindActions + ACTION_CATALOG 미정의 ID throw
// ============================================================

import {
  registerKeyBinding,
  setKeyboardModalState,
  _resetKeyboardRegistry,
} from '@/lib/keyboard/keyboard-manager';
import { bindActions } from '@/lib/actions/action-binder';

function dispatchKey(opts: { key: string; ctrl?: boolean; shift?: boolean }): void {
  const ev = new KeyboardEvent('keydown', {
    key: opts.key,
    ctrlKey: !!opts.ctrl,
    shiftKey: !!opts.shift,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(ev);
}

function setPath(p: string): void {
  // jsdom 의 window.location 은 redefinable 가 아니므로 history API 로 변경.
  window.history.replaceState({}, '', p);
}

describe('action-registry + keyboard-manager + modal-manager 통합', () => {
  beforeEach(() => {
    _resetKeyboardRegistry();
    setKeyboardModalState(false);
    setPath('/studio');
  });

  it('1) modal 미열림 — Ctrl+P 단축키가 등록된 핸들러를 호출한다', () => {
    const handler = jest.fn();
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler });
    dispatchKey({ key: 'p', ctrl: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('2) modal 열린 상태 — 동일 단축키 suppress (disableInModal 기본 true)', () => {
    const handler = jest.fn();
    registerKeyBinding({ keys: 'ctrl+k', area: 'studio', handler });
    setKeyboardModalState(true);
    dispatchKey({ key: 'k', ctrl: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('3) modal 닫힘 후 — 단축키 다시 동작', () => {
    const handler = jest.fn();
    registerKeyBinding({ keys: 'ctrl+k', area: 'studio', handler });
    setKeyboardModalState(true);
    dispatchKey({ key: 'k', ctrl: true });
    expect(handler).not.toHaveBeenCalled();
    setKeyboardModalState(false);
    dispatchKey({ key: 'k', ctrl: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('4) bindActions — ACTION_CATALOG 정의된 ID 만 정상 바인딩', () => {
    const onTabWorld = jest.fn();
    const bound = bindActions({ 'studio:tab-world': onTabWorld });
    expect(bound).toHaveLength(1);
    expect(bound[0].id).toBe('studio:tab-world');
    bound[0].action();
    expect(onTabWorld).toHaveBeenCalledTimes(1);
  });

  it('5) bindActions — 미정의 ID 는 throw (오타 방어)', () => {
    expect(() => {
      bindActions({ 'studio:does-not-exist': () => {} });
    }).toThrow(/Unknown action id/);
  });

  it('6) handler 가 throw 해도 listener 계속 동작 (다른 binding 영향 X)', () => {
    const bad = jest.fn(() => { throw new Error('boom'); });
    const good = jest.fn();
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler: bad, priority: 10 });
    registerKeyBinding({ keys: 'ctrl+k', area: 'studio', handler: good });
    // bad 가 매칭 + throw — 핸들러 안에서 잡힘.
    dispatchKey({ key: 'p', ctrl: true });
    expect(bad).toHaveBeenCalledTimes(1);
    // 이후 다른 키도 정상 dispatch.
    dispatchKey({ key: 'k', ctrl: true });
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('7) area 가드 — 다른 영역 pathname 이면 매칭 안 됨', () => {
    setPath('/docs');
    const handler = jest.fn();
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler });
    dispatchKey({ key: 'p', ctrl: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('8) global area — 어느 pathname 에서도 매칭', () => {
    setPath('/some-random-path');
    const handler = jest.fn();
    registerKeyBinding({ keys: 'ctrl+shift+k', area: 'global', handler });
    dispatchKey({ key: 'k', ctrl: true, shift: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
