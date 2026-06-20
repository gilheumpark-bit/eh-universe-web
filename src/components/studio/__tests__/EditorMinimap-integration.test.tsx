/**
 * EditorMinimap-integration — useEditorScroll + EditorMinimap 연동 검증.
 *
 *   1. 스크롤 가능한 컨테이너를 생성하고 두 파트를 결합한다.
 *   2. 컨테이너를 스크롤 → Minimap 의 viewport 박스 top 이 이동한다.
 *   3. Minimap 키보드 End → seek(1) → 컨테이너 scrollTop 반영.
 *   4. seek(0.5) 호출 시 scrollTo 가 호출된다.
 */

import React, { useRef } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks
// ============================================================

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ---- Canvas context ----
const fillRectMock = jest.fn();
const clearRectMock = jest.fn();
const setTransformMock = jest.fn();
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  fillRect: fillRectMock,
  clearRect: clearRectMock,
  setTransform: setTransformMock,
  fillStyle: '',
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// ---- RAF 즉시 실행 ----
(global as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame =
  ((cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  }) as unknown as typeof requestAnimationFrame;
(global as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = (() => {
  /* no-op */
}) as unknown as typeof cancelAnimationFrame;

// ---- getBoundingClientRect — 미니맵 내부 클릭 좌표 계산용 ----
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  top: 0,
  left: 0,
  right: 80,
  bottom: 300,
  width: 80,
  height: 300,
  x: 0,
  y: 0,
  toJSON: () => ({}),
})) as unknown as typeof Element.prototype.getBoundingClientRect;

import { EditorMinimap } from '../EditorMinimap';
import { useEditorScroll } from '@/hooks/useEditorScroll';

// ============================================================
// PART 2 — 결합 테스트 컴포넌트
// ============================================================

const LONG_TEXT = [
  '첫 번째 단락. 주인공이 폐가의 문을 열었다.',
  '두 번째 단락. 먼지가 날렸다. 희미한 발자국.',
  '세 번째 단락. 그는 숨을 참고 복도로 들어섰다.',
  '네 번째 단락. 어둠 속에서 무언가 움직였다.',
].join('\n\n');

/**
 * 테스트 대상: 외부 스크롤 컨테이너의 scroll 상태를 EditorMinimap 과 양방향 동기화.
 */
function IntegrationHarness() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, seek] = useEditorScroll(containerRef);
  return (
    <div>
      <div
        ref={containerRef}
        data-testid="scroll-container"
        style={{ width: 400, height: 200, overflow: 'auto' }}
      >
        {/* 긴 콘텐츠 */}
        <div style={{ height: 1000 }}>body</div>
      </div>
      <EditorMinimap
        language="KO"
        text={LONG_TEXT}
        scrollProgress={state.scrollProgress}
        viewportRatio={state.viewportRatio}
        onSeek={seek}
      />
    </div>
  );
}

/** jsdom 은 scrollHeight/clientHeight 를 계산하지 않으므로 강제 주입. */
function stubScrollDimensions(el: HTMLElement, opts: {
  scrollHeight: number;
  clientHeight: number;
  scrollTop?: number;
}) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: opts.scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: opts.clientHeight });
  let topValue = opts.scrollTop ?? 0;
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => topValue,
    set: (v: number) => {
      topValue = v;
    },
  });
  // scrollTo 반영
  const originalScrollTo = (el as unknown as { scrollTo?: (o: ScrollToOptions) => void }).scrollTo;
  const scrollToMock = jest.fn((o: ScrollToOptions) => {
    if (typeof o?.top === 'number') {
      topValue = o.top;
    }
    if (originalScrollTo && typeof originalScrollTo === 'function') {
      // 실제 원본이 있으면 호출 (jsdom 엔 없음)
    }
  });
  (el as unknown as { scrollTo: typeof scrollToMock }).scrollTo = scrollToMock;
  return scrollToMock;
}

// ============================================================
// PART 3 — Tests
// ============================================================

describe('EditorMinimap + useEditorScroll 통합', () => {
  beforeEach(() => {
    fillRectMock.mockClear();
    clearRectMock.mockClear();
    setTransformMock.mockClear();
  });

  it('외부 컨테이너 scroll → Minimap viewport top 이 이동한다', () => {
    const { getByTestId } = render(<IntegrationHarness />);
    const container = getByTestId('scroll-container') as HTMLDivElement;
    stubScrollDimensions(container, { scrollHeight: 1000, clientHeight: 200, scrollTop: 0 });

    // 초기 — viewport top 0px
    const viewport = getByTestId('editor-minimap-viewport');
    const initialTop = parseFloat(viewport.style.top);
    expect(initialTop).toBeCloseTo(0, 0);

    // scrollTop 400 → progress 0.5 → viewport top 이동
    act(() => {
      (container as unknown as { scrollTop: number }).scrollTop = 400;
      container.dispatchEvent(new Event('scroll'));
    });

    const movedTop = parseFloat(viewport.style.top);
    expect(movedTop).toBeGreaterThan(initialTop);
  });

  it('Minimap 키보드 End → 컨테이너 scrollTo 호출 (scrollTop = maxScroll)', () => {
    const { getByTestId } = render(<IntegrationHarness />);
    const container = getByTestId('scroll-container') as HTMLDivElement;
    const scrollToMock = stubScrollDimensions(container, {
      scrollHeight: 1000,
      clientHeight: 200,
      scrollTop: 0,
    });
    // 초기 계산 트리거
    act(() => {
      container.dispatchEvent(new Event('scroll'));
    });

    const minimap = getByTestId('editor-minimap');
    act(() => {
      fireEvent.keyDown(minimap, { key: 'End' });
    });

    expect(scrollToMock).toHaveBeenCalled();
    const lastCall = scrollToMock.mock.calls[scrollToMock.mock.calls.length - 1][0];
    // maxScroll = 1000 - 200 = 800
    expect(lastCall.top).toBeCloseTo(800, 0);
  });

  it('Minimap pointer seek(중간) → 컨테이너 scrollTop 중간값 반영', () => {
    const { getByTestId } = render(<IntegrationHarness />);
    const container = getByTestId('scroll-container') as HTMLDivElement;
    const scrollToMock = stubScrollDimensions(container, {
      scrollHeight: 1000,
      clientHeight: 200,
      scrollTop: 0,
    });
    act(() => {
      container.dispatchEvent(new Event('scroll'));
    });

    const minimap = getByTestId('editor-minimap');
    // pointerdown at y=150 of 300 height → progress 0.5
    const evt = new Event('pointerdown', { bubbles: true }) as Event & {
      clientY?: number;
      pointerId?: number;
    };
    Object.defineProperty(evt, 'clientY', { value: 150 });
    Object.defineProperty(evt, 'pointerId', { value: 1 });

    act(() => {
      fireEvent(minimap, evt);
    });

    expect(scrollToMock).toHaveBeenCalled();
    const lastTop = scrollToMock.mock.calls[scrollToMock.mock.calls.length - 1][0].top;
    // 0.5 * 800 = 400
    expect(lastTop).toBeCloseTo(400, 0);
  });
});
