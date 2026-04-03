// ============================================================
// Canvas Engine — Core (뷰포트, 줌, 팬)
// ============================================================
// Sketch/Figma 스타일 무한 캔버스 엔진.
// 전 스튜디오 공유: 소설(스토리보드), 코드(와이어프레임), 아카이브(지도)

export interface Point { x: number; y: number; }
export interface Size { width: number; height: number; }
export interface Rect { x: number; y: number; width: number; height: number; }

export interface Viewport {
  /** 캔버스 원점 오프셋 (팬) */
  offset: Point;
  /** 확대 배율 (1 = 100%) */
  zoom: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1;
export const ZOOM_STEP = 0.1;

/** 기본 뷰포트 */
export function createViewport(): Viewport {
  return { offset: { x: 0, y: 0 }, zoom: DEFAULT_ZOOM };
}

/** 화면 좌표 → 캔버스 좌표 변환 */
export function screenToCanvas(screenPoint: Point, viewport: Viewport): Point {
  return {
    x: (screenPoint.x - viewport.offset.x) / viewport.zoom,
    y: (screenPoint.y - viewport.offset.y) / viewport.zoom,
  };
}

/** 캔버스 좌표 → 화면 좌표 변환 */
export function canvasToScreen(canvasPoint: Point, viewport: Viewport): Point {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.offset.x,
    y: canvasPoint.y * viewport.zoom + viewport.offset.y,
  };
}

/** 마우스 포인터 중심으로 줌 (Ctrl+휠) */
export function zoomAtPoint(viewport: Viewport, screenPoint: Point, delta: number): Viewport {
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom + delta));
  const ratio = newZoom / viewport.zoom;
  return {
    zoom: newZoom,
    offset: {
      x: screenPoint.x - (screenPoint.x - viewport.offset.x) * ratio,
      y: screenPoint.y - (screenPoint.y - viewport.offset.y) * ratio,
    },
  };
}

/** 팬 (드래그 또는 스크롤) */
export function pan(viewport: Viewport, dx: number, dy: number): Viewport {
  return {
    ...viewport,
    offset: {
      x: viewport.offset.x + dx,
      y: viewport.offset.y + dy,
    },
  };
}

/** 줌을 특정 비율로 설정 (화면 중심 기준) */
export function zoomTo(viewport: Viewport, containerSize: Size, targetZoom: number): Viewport {
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
  const center: Point = { x: containerSize.width / 2, y: containerSize.height / 2 };
  return zoomAtPoint(viewport, center, clampedZoom - viewport.zoom);
}

/** 특정 영역이 화면에 꽉 차도록 줌+팬 (Fit to view) */
export function fitToRect(viewport: Viewport, containerSize: Size, rect: Rect, padding: number = 50): Viewport {
  const scaleX = (containerSize.width - padding * 2) / rect.width;
  const scaleY = (containerSize.height - padding * 2) / rect.height;
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(scaleX, scaleY)));
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return {
    zoom,
    offset: {
      x: containerSize.width / 2 - centerX * zoom,
      y: containerSize.height / 2 - centerY * zoom,
    },
  };
}

/** 모든 요소를 감싸는 바운딩 박스 */
export function getBoundingBox(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 두 Rect가 겹치는지 */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** 포인트가 Rect 안에 있는지 */
export function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}
