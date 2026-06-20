/** @jest-environment jsdom */
/**
 * [루프 4 P5/P8 — 2026-06-08] modal × keyboard race & integration coverage.
 *
 * 목표:
 *   - 빠른 modal open/close 반복 시 keyboard suppress 가 stale 하지 않음
 *   - pushKeyboardModal/popKeyboardModal nested stack 정상
 *   - 같은 키 다중 등록 시 priority 동률 → 늦게 등록된 핸들러 우선 (_registeredAt)
 *   - dispatch 시작 후 handler 안에서 새 binding 추가 시 다음 keydown 까지 noop
 *   - handler throw 시 noa:alert 발화 (silent suppression 방지 — P6)
 */
import {
  registerKeyBinding,
  setKeyboardModalState,
  pushKeyboardModal,
  popKeyboardModal,
  _resetKeyboardRegistry,
} from '../keyboard-manager';

function makeEvent(opts: { key: string; ctrl?: boolean }): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: opts.key,
    ctrlKey: !!opts.ctrl,
    cancelable: true,
    bubbles: true,
  });
}

// 페이지 설정 — area=global 만 사용해 path 의존 제거.
beforeEach(() => {
  _resetKeyboardRegistry();
  // jsdom default location.pathname '/' — global area 만 사용해 path 의존 회피.
});

describe('[P5] modal × keyboard race', () => {
  it('빠른 modal open/close 반복 후 suppress 가 올바르게 해제됨', () => {
    let fired = 0;
    registerKeyBinding({
      keys: 'ctrl+p',
      area: 'global',
      handler: () => { fired++; },
    });

    // 100회 빠른 open/close — modalStack 누수/leak 검사.
    for (let i = 0; i < 100; i++) {
      setKeyboardModalState(true);
      setKeyboardModalState(false);
    }

    // 닫힌 상태에서 키 발화 → handler 호출.
    window.dispatchEvent(makeEvent({ key: 'p', ctrl: true }));
    expect(fired).toBe(1);
  });

  it('pushKeyboardModal / popKeyboardModal nested stack 정상', () => {
    let fired = 0;
    registerKeyBinding({
      keys: 'ctrl+k',
      area: 'global',
      handler: () => { fired++; },
    });

    // push 2개 — modal stack 깊이 2.
    pushKeyboardModal('m1');
    pushKeyboardModal('m2');
    window.dispatchEvent(makeEvent({ key: 'k', ctrl: true }));
    expect(fired).toBe(0); // suppress 됨

    // pop m2 → 여전히 m1 열림 → suppress.
    popKeyboardModal('m2');
    window.dispatchEvent(makeEvent({ key: 'k', ctrl: true }));
    expect(fired).toBe(0);

    // pop m1 → 비어있음 → handler 호출.
    popKeyboardModal('m1');
    window.dispatchEvent(makeEvent({ key: 'k', ctrl: true }));
    expect(fired).toBe(1);
  });

  it('같은 키 다중 등록 시 늦게 등록된 핸들러 우선 (priority tie-breaker)', async () => {
    const calls: string[] = [];
    registerKeyBinding({
      keys: 'escape',
      area: 'global',
      handler: () => calls.push('first'),
    });
    // tie-breaker 는 timestamp 기반 — sleep 으로 분리.
    await new Promise((r) => setTimeout(r, 2));
    registerKeyBinding({
      keys: 'escape',
      area: 'global',
      handler: () => calls.push('second'),
    });

    window.dispatchEvent(makeEvent({ key: 'Escape' }));
    expect(calls).toEqual(['second']); // 늦게 등록된 것이 우선.
  });
});

describe('[P5] dispatch snapshot — handler 안에서 register 호출', () => {
  it('handler 내부 register 는 다음 keydown 까지 활성화되지 않음', () => {
    const calls: string[] = [];
    registerKeyBinding({
      keys: 'ctrl+a',
      area: 'global',
      handler: () => {
        calls.push('outer');
        // dispatch 진행 중 새 binding 추가 — 같은 이벤트엔 영향 X.
        registerKeyBinding({
          keys: 'ctrl+a',
          area: 'global',
          priority: 1000, // 높은 priority — 다음 이벤트엔 1번째.
          handler: () => calls.push('inner'),
        });
      },
    });

    // 1st dispatch — outer 만 호출.
    window.dispatchEvent(makeEvent({ key: 'a', ctrl: true }));
    expect(calls).toEqual(['outer']);

    // 2nd dispatch — inner 가 priority 1000 으로 outer 보다 우선.
    window.dispatchEvent(makeEvent({ key: 'a', ctrl: true }));
    expect(calls[1]).toBe('inner');
  });
});

describe('[P6] handler throw — noa:alert 발화', () => {
  it('handler 가 throw 하면 noa:alert event 발화 (silent suppression 방지)', () => {
    const alerts: unknown[] = [];
    const listener = (e: Event) => alerts.push((e as CustomEvent).detail);
    window.addEventListener('noa:alert', listener);

    registerKeyBinding({
      keys: 'ctrl+t',
      area: 'global',
      handler: () => { throw new Error('boom'); },
    });

    // console.error 노이즈 차단.
    const origErr = console.error;
    console.error = () => {};
    try {
      window.dispatchEvent(makeEvent({ key: 't', ctrl: true }));
    } finally {
      console.error = origErr;
    }

    expect(alerts.length).toBeGreaterThanOrEqual(1);
    window.removeEventListener('noa:alert', listener);
  });
});
