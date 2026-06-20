/**
 * EditorMinimap — canvas-based minimap tests.
 *   1. text prop 없음 → 빈 상태 메시지 + aria-disabled
 *   2. text 주어지면 canvas 렌더 + fillRect 단락별 호출
 *   3. pointerDown → onSeek(0~1) 호출 (y / height)
 *   4. 키보드 ↑↓ → onSeek 호출
 *   5. scrollProgress / viewportRatio → 뷰포트 박스 top/height 반영
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (run before component import)
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

// ---- Canvas 2D context mock ----
const fillRectMock = jest.fn();
const clearRectMock = jest.fn();
const setTransformMock = jest.fn();
const mockContext = {
  fillRect: fillRectMock,
  clearRect: clearRectMock,
  setTransform: setTransformMock,
  fillStyle: '',
  canvas: { width: 80, height: 300 },
};
HTMLCanvasElement.prototype.getContext = jest
  .fn()
  .mockReturnValue(mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// ---- RAF → 즉시 실행 ----
(global as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame =
  ((cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  }) as unknown as typeof requestAnimationFrame;
(global as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame =
  (() => {}) as unknown as typeof cancelAnimationFrame;

// ---- getBoundingClientRect: 기본 300px 높이, 80px 너비 ----
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

// ============================================================
// PART 2 — 공통 헬퍼
// ============================================================

const LONG_TEXT = [
  '첫 번째 단락입니다. 주인공은 도시 외곽의 낡은 아파트에 살고 있었다.',
  '"오늘도 비가 오네." 그가 창밖을 바라보며 중얼거렸다.',
  '두 번째 문단. 골목 어귀에서 낯선 그림자가 움직였다. 그는 천천히 커튼을 닫았다.',
  '세 번째 단락 — 더 짧다.',
].join('\n\n');

function resetMocks() {
  fillRectMock.mockClear();
  clearRectMock.mockClear();
  setTransformMock.mockClear();
}

// ============================================================
// PART 3 — Tests
// ============================================================

describe('EditorMinimap', () => {
  beforeEach(resetMocks);

  it('renders empty state message when no text and no editor', () => {
    const onSeek = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <EditorMinimap language="KO" onSeek={onSeek} />,
    );
    const wrapper = getByTestId('editor-minimap');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveAttribute('data-empty', 'true');
    expect(wrapper).toHaveAttribute('aria-disabled', 'true');
    // Canvas 는 렌더되지 않음
    expect(queryByTestId('editor-minimap-canvas')).toBeNull();
    // 안내 문구 존재
    expect(wrapper.textContent).toMatch(/미니맵을 표시할 원고가 없습니다/);
  });

  it('renders canvas and calls fillRect for each paragraph', () => {
    const onSeek = jest.fn();
    const { getByTestId } = render(
      <EditorMinimap language="KO" text={LONG_TEXT} onSeek={onSeek} />,
    );
    const canvas = getByTestId('editor-minimap-canvas');
    expect(canvas).toBeInTheDocument();
    // clearRect 최소 1회 + fillRect 단락 수 + 배경 1회
    expect(clearRectMock).toHaveBeenCalled();
    // 단락 4개 + 배경 1 = 5 이상
    expect(fillRectMock.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it('calls onSeek with progress between 0 and 1 on pointer down', () => {
    const onSeek = jest.fn();
    const { getByTestId } = render(
      <EditorMinimap language="KO" text={LONG_TEXT} onSeek={onSeek} />,
    );
    const wrapper = getByTestId('editor-minimap');
    // jsdom 의 PointerEvent 는 생성자에 전달된 옵션이 속성으로 완전히
    // 매핑되지 않는 케이스가 있다. 안전하게 초기화된 이벤트를 구성하고
    // clientY/pointerId 를 Object.defineProperty 로 주입한다.
    const evt = new Event('pointerdown', { bubbles: true }) as Event & {
      clientX?: number;
      clientY?: number;
      pointerId?: number;
    };
    Object.defineProperty(evt, 'clientX', { value: 40 });
    Object.defineProperty(evt, 'clientY', { value: 150 });
    Object.defineProperty(evt, 'pointerId', { value: 1 });
    fireEvent(wrapper, evt);
    expect(onSeek).toHaveBeenCalledTimes(1);
    const arg = onSeek.mock.calls[0][0];
    expect(arg).toBeGreaterThanOrEqual(0);
    expect(arg).toBeLessThanOrEqual(1);
    expect(arg).toBeCloseTo(0.5, 1);
  });

  it('responds to ArrowDown/ArrowUp/Home/End keyboard navigation', () => {
    const onSeek = jest.fn();
    const { getByTestId, rerender } = render(
      <EditorMinimap
        language="KO"
        text={LONG_TEXT}
        scrollProgress={0.5}
        onSeek={onSeek}
      />,
    );
    const wrapper = getByTestId('editor-minimap');

    fireEvent.keyDown(wrapper, { key: 'ArrowDown' });
    expect(onSeek).toHaveBeenLastCalledWith(expect.any(Number));
    expect(onSeek.mock.calls[onSeek.mock.calls.length - 1][0]).toBeCloseTo(0.55, 2);

    fireEvent.keyDown(wrapper, { key: 'ArrowUp' });
    expect(onSeek.mock.calls[onSeek.mock.calls.length - 1][0]).toBeCloseTo(0.45, 2);

    fireEvent.keyDown(wrapper, { key: 'Home' });
    expect(onSeek.mock.calls[onSeek.mock.calls.length - 1][0]).toBe(0);

    fireEvent.keyDown(wrapper, { key: 'End' });
    expect(onSeek.mock.calls[onSeek.mock.calls.length - 1][0]).toBe(1);

    // 무관한 키는 무시
    const before = onSeek.mock.calls.length;
    fireEvent.keyDown(wrapper, { key: 'a' });
    expect(onSeek.mock.calls.length).toBe(before);

    // scrollProgress prop 업데이트 → aria-valuenow 반영
    act(() => {
      rerender(
        <EditorMinimap
          language="KO"
          text={LONG_TEXT}
          scrollProgress={0.25}
          onSeek={onSeek}
        />,
      );
    });
    expect(wrapper).toHaveAttribute('aria-valuenow', '25');
  });

  it('reflects scrollProgress and viewportRatio in viewport box position', () => {
    const onSeek = jest.fn();
    const { getByTestId, rerender } = render(
      <EditorMinimap
        language="KO"
        text={LONG_TEXT}
        scrollProgress={0}
        viewportRatio={0.2}
        onSeek={onSeek}
      />,
    );
    const viewport = getByTestId('editor-minimap-viewport');
    // 초기: top 0 근처
    const initialTop = viewport.style.top;
    expect(initialTop).toBe('0px');

    // scrollProgress=1 → top = canvasHeight - box 만큼 내려감
    act(() => {
      rerender(
        <EditorMinimap
          language="KO"
          text={LONG_TEXT}
          scrollProgress={1}
          viewportRatio={0.2}
          onSeek={onSeek}
        />,
      );
    });
    const movedTop = parseFloat(viewport.style.top);
    expect(movedTop).toBeGreaterThan(0);

    // viewportRatio 증가 → 박스 height 증가
    const beforeHeight = parseFloat(viewport.style.height);
    act(() => {
      rerender(
        <EditorMinimap
          language="KO"
          text={LONG_TEXT}
          scrollProgress={1}
          viewportRatio={0.5}
          onSeek={onSeek}
        />,
      );
    });
    const afterHeight = parseFloat(viewport.style.height);
    expect(afterHeight).toBeGreaterThan(beforeHeight);
  });
});
