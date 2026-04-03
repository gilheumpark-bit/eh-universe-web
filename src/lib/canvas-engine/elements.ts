// ============================================================
// Canvas Engine — Elements (사각형, 텍스트, 이미지, 연결선, 그룹)
// ============================================================

import type { Point, Rect, Size } from './core';

export type ElementType = 'rect' | 'text' | 'image' | 'connection' | 'group' | 'sticky' | 'frame';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  visible: boolean;
  opacity: number;
  /** 부모 그룹/프레임 ID */
  parentId: string | null;
  /** 레이어 순서 (높을수록 위) */
  zIndex: number;
  /** 커스텀 데이터 (스튜디오별 확장) */
  data: Record<string, unknown>;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
  cornerRadius: number;
}

export interface ConnectionElement extends BaseElement {
  type: 'connection';
  /** 시작 요소 ID */
  fromId: string;
  /** 끝 요소 ID */
  toId: string;
  /** 시작 연결 지점 */
  fromAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  /** 끝 연결 지점 */
  toAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  /** 선 스타일 */
  lineStyle: 'solid' | 'dashed' | 'dotted';
  /** 화살표 */
  arrowEnd: boolean;
  arrowStart: boolean;
  color: string;
  strokeWidth: number;
  /** 라벨 */
  label: string;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  text: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';
}

export interface FrameElement extends BaseElement {
  type: 'frame';
  title: string;
  fill: string;
  /** 프레임 안의 자식 요소 IDs */
  childIds: string[];
}

export interface GroupElement extends BaseElement {
  type: 'group';
  childIds: string[];
}

export type CanvasElement = RectElement | TextElement | ImageElement | ConnectionElement | StickyElement | FrameElement | GroupElement;

// ── Factory Functions ──

let _idCounter = 0;
function genId(): string {
  return `el-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;
}

function baseDefaults(type: ElementType, x: number, y: number, w: number, h: number): BaseElement {
  return { id: genId(), type, x, y, width: w, height: h, rotation: 0, locked: false, visible: true, opacity: 1, parentId: null, zIndex: _idCounter, data: {} };
}

export function createRect(x: number, y: number, w: number = 200, h: number = 120, opts?: Partial<RectElement>): RectElement {
  return { ...baseDefaults('rect', x, y, w, h), fill: '#2a2825', stroke: '#3d3830', strokeWidth: 1, cornerRadius: 12, ...opts } as RectElement;
}

export function createText(x: number, y: number, text: string, opts?: Partial<TextElement>): TextElement {
  return { ...baseDefaults('text', x, y, 200, 40), text, fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 400, color: '#f4f0ea', align: 'left', verticalAlign: 'top', ...opts } as TextElement;
}

export function createImage(x: number, y: number, src: string, w: number = 200, h: number = 150, opts?: Partial<ImageElement>): ImageElement {
  return { ...baseDefaults('image', x, y, w, h), src, objectFit: 'cover', cornerRadius: 8, ...opts } as ImageElement;
}

export function createConnection(fromId: string, toId: string, opts?: Partial<ConnectionElement>): ConnectionElement {
  return { ...baseDefaults('connection', 0, 0, 0, 0), fromId, toId, fromAnchor: 'right', toAnchor: 'left', lineStyle: 'solid', arrowEnd: true, arrowStart: false, color: '#b8955c', strokeWidth: 2, label: '', ...opts } as ConnectionElement;
}

export function createSticky(x: number, y: number, text: string = '', color: StickyElement['color'] = 'yellow'): StickyElement {
  return { ...baseDefaults('sticky', x, y, 200, 200), text, color } as StickyElement;
}

export function createFrame(x: number, y: number, w: number = 400, h: number = 300, title: string = 'Frame'): FrameElement {
  return { ...baseDefaults('frame', x, y, w, h), title, fill: 'transparent', childIds: [] } as FrameElement;
}

export function createGroup(childIds: string[]): GroupElement {
  return { ...baseDefaults('group', 0, 0, 0, 0), childIds } as GroupElement;
}

// ── Element Operations ──

export function moveElement(el: CanvasElement, dx: number, dy: number): CanvasElement {
  return { ...el, x: el.x + dx, y: el.y + dy };
}

export function resizeElement(el: CanvasElement, newWidth: number, newHeight: number): CanvasElement {
  return { ...el, width: Math.max(10, newWidth), height: Math.max(10, newHeight) };
}

export function getElementRect(el: CanvasElement): Rect {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

export function getAnchorPoint(el: CanvasElement, anchor: string): Point {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  switch (anchor) {
    case 'top': return { x: cx, y: el.y };
    case 'bottom': return { x: cx, y: el.y + el.height };
    case 'left': return { x: el.x, y: cy };
    case 'right': return { x: el.x + el.width, y: cy };
    default: return { x: cx, y: cy };
  }
}

/** 요소 복제 (새 ID) */
export function duplicateElement(el: CanvasElement, offsetX: number = 20, offsetY: number = 20): CanvasElement {
  return { ...el, id: genId(), x: el.x + offsetX, y: el.y + offsetY, zIndex: el.zIndex + 1 };
}
