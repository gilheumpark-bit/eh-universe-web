// ============================================================
// Canvas Engine — Interactions (드래그, 선택, 스냅, 정렬)
// ============================================================

import type { Point, Rect } from './core';
import { pointInRect, rectsOverlap } from './core';
import type { CanvasElement } from './elements';
import { getElementRect, moveElement } from './elements';

// ── Selection ──

export interface SelectionState {
  selectedIds: Set<string>;
  /** 드래그 선택 박스 (마키) */
  marquee: Rect | null;
}

export function createSelectionState(): SelectionState {
  return { selectedIds: new Set(), marquee: null };
}

/** 포인트 위치의 요소 찾기 (최상위 zIndex 우선) */
export function hitTest(elements: CanvasElement[], point: Point): CanvasElement | null {
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  for (const el of sorted) {
    if (!el.visible || el.locked) continue;
    if (el.type === 'connection') continue; // 연결선은 별도 hitTest
    if (pointInRect(point, getElementRect(el))) return el;
  }
  return null;
}

/** 마키(드래그 선택 박스)로 선택 */
export function selectByMarquee(elements: CanvasElement[], marquee: Rect): string[] {
  return elements
    .filter(el => el.visible && !el.locked && el.type !== 'connection')
    .filter(el => rectsOverlap(getElementRect(el), marquee))
    .map(el => el.id);
}

// ── Snap & Align ──

export interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number; // 캔버스 좌표
}

const SNAP_THRESHOLD = 8; // px (화면 좌표 기준)

/** 스냅 가이드 계산 */
export function calculateSnapGuides(
  movingRect: Rect,
  otherElements: CanvasElement[],
  zoom: number,
): { snappedRect: Rect; guides: SnapGuide[] } {
  const guides: SnapGuide[] = [];
  let { x, y } = movingRect;
  const threshold = SNAP_THRESHOLD / zoom;

  const movingCenterX = x + movingRect.width / 2;
  const movingCenterY = y + movingRect.height / 2;
  const movingRight = x + movingRect.width;
  const movingBottom = y + movingRect.height;

  for (const el of otherElements) {
    if (!el.visible || el.type === 'connection') continue;
    const r = getElementRect(el);
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;

    // 좌측 정렬
    if (Math.abs(x - r.x) < threshold) { x = r.x; guides.push({ type: 'vertical', position: r.x }); }
    // 우측 정렬
    if (Math.abs(movingRight - (r.x + r.width)) < threshold) { x = r.x + r.width - movingRect.width; guides.push({ type: 'vertical', position: r.x + r.width }); }
    // 중앙 수직 정렬
    if (Math.abs(movingCenterX - cx) < threshold) { x = cx - movingRect.width / 2; guides.push({ type: 'vertical', position: cx }); }
    // 상단 정렬
    if (Math.abs(y - r.y) < threshold) { y = r.y; guides.push({ type: 'horizontal', position: r.y }); }
    // 하단 정렬
    if (Math.abs(movingBottom - (r.y + r.height)) < threshold) { y = r.y + r.height - movingRect.height; guides.push({ type: 'horizontal', position: r.y + r.height }); }
    // 중앙 수평 정렬
    if (Math.abs(movingCenterY - cy) < threshold) { y = cy - movingRect.height / 2; guides.push({ type: 'horizontal', position: cy }); }
  }

  return { snappedRect: { ...movingRect, x, y }, guides };
}

// ── Drag ──

export interface DragState {
  isDragging: boolean;
  startPoint: Point;
  currentPoint: Point;
  elementId: string | null;
  /** 리사이즈 핸들 */
  resizeHandle: ResizeHandle | null;
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export function createDragState(): DragState {
  return { isDragging: false, startPoint: { x: 0, y: 0 }, currentPoint: { x: 0, y: 0 }, elementId: null, resizeHandle: null };
}

/** 리사이즈 핸들 hitTest (요소 모서리 8px 영역) */
export function hitTestResizeHandle(el: CanvasElement, point: Point, zoom: number): ResizeHandle | null {
  const handleSize = 8 / zoom;
  const r = getElementRect(el);
  const corners: [ResizeHandle, Rect][] = [
    ['nw', { x: r.x - handleSize, y: r.y - handleSize, width: handleSize * 2, height: handleSize * 2 }],
    ['ne', { x: r.x + r.width - handleSize, y: r.y - handleSize, width: handleSize * 2, height: handleSize * 2 }],
    ['sw', { x: r.x - handleSize, y: r.y + r.height - handleSize, width: handleSize * 2, height: handleSize * 2 }],
    ['se', { x: r.x + r.width - handleSize, y: r.y + r.height - handleSize, width: handleSize * 2, height: handleSize * 2 }],
  ];
  for (const [handle, rect] of corners) {
    if (pointInRect(point, rect)) return handle;
  }
  return null;
}

// ── Align Commands ──

export type AlignDirection = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

/** 선택된 요소들을 정렬 */
export function alignElements(elements: CanvasElement[], selectedIds: Set<string>, direction: AlignDirection): CanvasElement[] {
  const selected = elements.filter(el => selectedIds.has(el.id));
  if (selected.length < 2) return elements;

  let target: number;
  switch (direction) {
    case 'left': target = Math.min(...selected.map(el => el.x)); break;
    case 'right': target = Math.max(...selected.map(el => el.x + el.width)); break;
    case 'center-h': target = selected.reduce((a, el) => a + el.x + el.width / 2, 0) / selected.length; break;
    case 'top': target = Math.min(...selected.map(el => el.y)); break;
    case 'bottom': target = Math.max(...selected.map(el => el.y + el.height)); break;
    case 'center-v': target = selected.reduce((a, el) => a + el.y + el.height / 2, 0) / selected.length; break;
  }

  return elements.map(el => {
    if (!selectedIds.has(el.id)) return el;
    switch (direction) {
      case 'left': return { ...el, x: target };
      case 'right': return { ...el, x: target - el.width };
      case 'center-h': return { ...el, x: target - el.width / 2 };
      case 'top': return { ...el, y: target };
      case 'bottom': return { ...el, y: target - el.height };
      case 'center-v': return { ...el, y: target - el.height / 2 };
    }
  });
}

/** 균등 분배 */
export function distributeElements(elements: CanvasElement[], selectedIds: Set<string>, axis: 'horizontal' | 'vertical'): CanvasElement[] {
  const selected = elements.filter(el => selectedIds.has(el.id));
  if (selected.length < 3) return elements;

  const sorted = [...selected].sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const totalSpace = axis === 'horizontal'
    ? (last.x + last.width) - first.x - sorted.reduce((a, el) => a + el.width, 0)
    : (last.y + last.height) - first.y - sorted.reduce((a, el) => a + el.height, 0);
  const gap = totalSpace / (sorted.length - 1);

  let pos = axis === 'horizontal' ? first.x + first.width + gap : first.y + first.height + gap;
  const updates = new Map<string, number>();
  for (let i = 1; i < sorted.length - 1; i++) {
    updates.set(sorted[i].id, pos);
    pos += (axis === 'horizontal' ? sorted[i].width : sorted[i].height) + gap;
  }

  return elements.map(el => {
    const val = updates.get(el.id);
    if (val === undefined) return el;
    return axis === 'horizontal' ? { ...el, x: val } : { ...el, y: val };
  });
}
