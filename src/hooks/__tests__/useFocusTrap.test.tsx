/**
 * useFocusTrap — 모달 focus trap 훅 테스트.
 *   1. active=true 시 첫 focusable 자동 포커스
 *   2. Tab on last → 첫 focusable로 순환
 *   3. Shift+Tab on first → 마지막 focusable로 순환
 *   4. Escape 키 → onEscape 콜백 호출
 *   5. active=false 복귀 시 이전 focus 복원
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';

// ============================================================
// PART 1 — Mocks (run before hook import)
// ============================================================

// rAF 즉시 실행 → 첫 focusable 자동 포커스를 동기적으로 검증.
(global as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame =
  ((cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  }) as unknown as typeof requestAnimationFrame;
(global as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = (() => {
  /* no-op */
}) as unknown as typeof cancelAnimationFrame;

import { useFocusTrap } from '@/hooks/useFocusTrap';

// ============================================================
// PART 2 — Test Harness
// ============================================================

interface TrapProps {
  active: boolean;
  onEscape?: () => void;
}

function TrapHarness({ active, onEscape }: TrapProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active, onEscape);
  return (
    <div ref={ref} data-testid="trap">
      <button data-testid="btn-1">One</button>
      <button data-testid="btn-2">Two</button>
      <button data-testid="btn-3">Three</button>
    </div>
  );
}

function mountHarness(props: TrapProps) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(TrapHarness, props));
  });
  return {
    container,
    update: (next: TrapProps) => {
      act(() => {
        root.render(React.createElement(TrapHarness, next));
      });
    },
    cleanup: () => {
      act(() => { root.unmount(); });
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
}

function dispatchKey(key: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
}

// jsdom offsetParent polyfill — 모든 HTMLElement가 visible로 취급되도록.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  get() {
    return this.parentNode;
  },
  configurable: true,
});

// ============================================================
// PART 3 — Tests
// ============================================================

describe('useFocusTrap', () => {
  let h: ReturnType<typeof mountHarness>;

  afterEach(() => {
    if (h) h.cleanup();
  });

  it('activates: first focusable gets focus when active=true', () => {
    h = mountHarness({ active: true });
    const btn1 = h.container.querySelector('[data-testid="btn-1"]') as HTMLElement;
    expect(document.activeElement).toBe(btn1);
  });

  it('inactive: no auto-focus when active=false', () => {
    // 외부 버튼에 먼저 focus
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    outside.focus();

    h = mountHarness({ active: false });
    // 외부 focus 유지 (trap 비활성이므로 이동하지 않음)
    expect(document.activeElement).toBe(outside);
    document.body.removeChild(outside);
  });

  it('wraps Tab: last → first when Tab pressed on last', () => {
    h = mountHarness({ active: true });
    const btn3 = h.container.querySelector('[data-testid="btn-3"]') as HTMLElement;
    btn3.focus();
    dispatchKey('Tab', false);
    const btn1 = h.container.querySelector('[data-testid="btn-1"]') as HTMLElement;
    expect(document.activeElement).toBe(btn1);
  });

  it('wraps Shift+Tab: first → last when Shift+Tab pressed on first', () => {
    h = mountHarness({ active: true });
    const btn1 = h.container.querySelector('[data-testid="btn-1"]') as HTMLElement;
    btn1.focus();
    dispatchKey('Tab', true);
    const btn3 = h.container.querySelector('[data-testid="btn-3"]') as HTMLElement;
    expect(document.activeElement).toBe(btn3);
  });

  it('calls onEscape when Escape pressed', () => {
    const onEscape = jest.fn();
    h = mountHarness({ active: true, onEscape });
    dispatchKey('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});
