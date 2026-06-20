/**
 * useEditorScroll — 에디터 스크롤 추적 훅 테스트.
 *   1. 초기 상태 progress=0, viewportRatio=1 (빈 엘리먼트)
 *   2. scroll 이벤트 → progress 업데이트
 *   3. seek(0.5) → scrollTo 호출 + scrollTop = 0.5 * maxScroll
 *   4. cleanup 시 리스너 제거 (removeEventListener 호출)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';

// ============================================================
// PART 1 — Mocks (run before hook import)
// ============================================================

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// RAF → 즉시 동기 실행 (테스트 결정적 동작 보장)
const rafCallbacks: FrameRequestCallback[] = [];
(global as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame =
  ((cb: FrameRequestCallback) => {
    // 즉시 실행 — 큐에 쌓지 않음
    cb(0);
    return rafCallbacks.push(cb);
  }) as unknown as typeof requestAnimationFrame;
(global as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = (() => {
  /* no-op */
}) as unknown as typeof cancelAnimationFrame;

import { useEditorScroll } from '@/hooks/useEditorScroll';

// ============================================================
// PART 2 — Test Harness
// ============================================================

type HookReturn = ReturnType<typeof useEditorScroll>;

/**
 * 실제 스크롤 엘리먼트를 생성하고 ref 에 바인딩하여 훅을 마운트한다.
 * scrollHeight/clientHeight 는 Object.defineProperty 로 강제 주입한다
 * (jsdom 은 레이아웃 계산을 하지 않음).
 */
function mountHook(opts: {
  scrollHeight?: number;
  clientHeight?: number;
  scrollTop?: number;
}) {
  const scrollHeight = opts.scrollHeight ?? 1000;
  const clientHeight = opts.clientHeight ?? 200;
  const initialTop = opts.scrollTop ?? 0;

  const el = document.createElement('div');
  document.body.appendChild(el);
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
  // scrollTop 은 일반 속성으로 덮어쓰기 가능하도록 value 로 설정
  let topValue = initialTop;
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => topValue,
    set: (v: number) => {
      topValue = v;
    },
  });
  // scrollTo mock — 호출을 기록 + scrollTop 반영
  const scrollToMock = jest.fn((opt: ScrollToOptions) => {
    if (typeof opt?.top === 'number') topValue = opt.top;
  });
  (el as unknown as { scrollTo: typeof scrollToMock }).scrollTo = scrollToMock;

  // removeEventListener 호출 추적 — 프로토타입 메서드를 wrap 하여 'this === el' 호출만 카운트
  const removedEvents: string[] = [];
  const originalRemove = el.removeEventListener.bind(el);
  el.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
    removedEvents.push(type);
    return originalRemove(type, listener, options);
  }) as typeof el.removeEventListener;

  const ref: { current: HTMLElement | null } = { current: el };
  const hookRef: { current: HookReturn | null } = { current: null };

  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    const v = useEditorScroll(ref);
    React.useEffect(() => {
      hookRef.current = v;
    });
    return null;
  }

  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(TestComponent));
  });

  return {
    el,
    scrollToMock,
    removedEvents,
    get: () => hookRef.current!,
    setScrollTop: (v: number) => {
      topValue = v;
    },
    fireScroll: () => {
      el.dispatchEvent(new Event('scroll'));
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
      document.body.removeChild(el);
    },
  };
}

// ============================================================
// PART 3 — Tests
// ============================================================

describe('useEditorScroll', () => {
  it('초기 상태: 스크롤 없는 엘리먼트는 progress=0, viewportRatio=1', () => {
    // scrollHeight == clientHeight → maxScroll 0 → 진행도 0
    const h = mountHook({ scrollHeight: 200, clientHeight: 200, scrollTop: 0 });
    const [state] = h.get();
    expect(state.scrollProgress).toBe(0);
    expect(state.viewportRatio).toBe(1);
    h.cleanup();
  });

  it('scroll 이벤트 → progress 업데이트', () => {
    const h = mountHook({ scrollHeight: 1000, clientHeight: 200, scrollTop: 0 });
    const [initial] = h.get();
    expect(initial.scrollProgress).toBe(0);

    // scrollTop 을 400 으로 변경 (maxScroll = 800 → progress 0.5)
    act(() => {
      h.setScrollTop(400);
      h.fireScroll();
    });
    const [updated] = h.get();
    expect(updated.scrollProgress).toBeCloseTo(0.5, 2);
    // viewportRatio = 200/1000 = 0.2
    expect(updated.viewportRatio).toBeCloseTo(0.2, 2);
    h.cleanup();
  });

  it('seek(progress) → scrollTo 호출 + scrollTop 반영', () => {
    const h = mountHook({ scrollHeight: 1000, clientHeight: 200, scrollTop: 0 });
    const [, seek] = h.get();

    act(() => {
      seek(0.5);
    });
    expect(h.scrollToMock).toHaveBeenCalledTimes(1);
    const callArg = h.scrollToMock.mock.calls[0][0];
    expect(callArg.top).toBeCloseTo(400, 0); // 0.5 * (1000 - 200)

    // 경계값 — 0 (최상단)
    act(() => {
      seek(0);
    });
    expect(h.scrollToMock.mock.calls[1][0].top).toBe(0);

    // 경계값 — 1 (최하단)
    act(() => {
      seek(1);
    });
    expect(h.scrollToMock.mock.calls[2][0].top).toBeCloseTo(800, 0);

    // 범위 외 값은 clamp 되어야 한다
    act(() => {
      seek(2);
    });
    expect(h.scrollToMock.mock.calls[3][0].top).toBeCloseTo(800, 0);

    act(() => {
      seek(-0.5);
    });
    expect(h.scrollToMock.mock.calls[4][0].top).toBe(0);

    h.cleanup();
  });

  it('cleanup 시 scroll 리스너 제거', () => {
    const h = mountHook({ scrollHeight: 1000, clientHeight: 200, scrollTop: 0 });
    expect(h.removedEvents).not.toContain('scroll');
    h.cleanup();
    // 언마운트 후 'scroll' 리스너가 제거되어야 한다
    expect(h.removedEvents).toContain('scroll');
  });

  it('NaN / 비수치 seek 값 → 무시 (scrollTo 미호출)', () => {
    const h = mountHook({ scrollHeight: 1000, clientHeight: 200, scrollTop: 0 });
    const [, seek] = h.get();
    act(() => {
      seek(Number.NaN);
    });
    expect(h.scrollToMock).not.toHaveBeenCalled();
    h.cleanup();
  });
});
