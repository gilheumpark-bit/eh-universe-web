// ============================================================
// Canvas Engine — Serialization (저장, 로드, 내보내기)
// ============================================================

import type { CanvasElement } from './elements';
import type { Viewport } from './core';

export interface CanvasDocument {
  version: 1;
  name: string;
  viewport: Viewport;
  elements: CanvasElement[];
  createdAt: number;
  updatedAt: number;
}

/** 캔버스 문서 생성 */
export function createDocument(name: string = 'Untitled'): CanvasDocument {
  return {
    version: 1,
    name,
    viewport: { offset: { x: 0, y: 0 }, zoom: 1 },
    elements: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** JSON 직렬화 */
export function serializeDocument(doc: CanvasDocument): string {
  return JSON.stringify({ ...doc, updatedAt: Date.now() });
}

/** JSON 역직렬화 */
export function deserializeDocument(json: string): CanvasDocument | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** localStorage에 저장 */
export function saveToLocalStorage(key: string, doc: CanvasDocument): void {
  localStorage.setItem(key, serializeDocument(doc));
}

/** localStorage에서 로드 */
export function loadFromLocalStorage(key: string): CanvasDocument | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return deserializeDocument(raw);
}

/** SVG로 내보내기 */
export function exportToSvg(elements: CanvasElement[], width: number = 1920, height: number = 1080): string {
  const svgElements = elements
    .filter(el => el.visible && el.type !== 'connection')
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(el => {
      switch (el.type) {
        case 'rect':
          return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.cornerRadius}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}"/>`;
        case 'text':
          return `<text x="${el.x}" y="${el.y + el.fontSize}" font-size="${el.fontSize}" font-family="${el.fontFamily}" fill="${el.color}" opacity="${el.opacity}">${escapeXml(el.text)}</text>`;
        case 'image':
          return `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${el.src}" opacity="${el.opacity}"/>`;
        case 'sticky':
          const colors: Record<string, string> = { yellow: '#fef3c7', pink: '#fce7f3', blue: '#dbeafe', green: '#d1fae5', purple: '#ede9fe', orange: '#ffedd5' };
          return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="4" fill="${colors[el.color] || '#fef3c7'}"/><text x="${el.x + 12}" y="${el.y + 24}" font-size="12" fill="#1f2937">${escapeXml(el.text)}</text>`;
        case 'frame':
          return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="none" stroke="#666" stroke-width="1" stroke-dasharray="4"/><text x="${el.x + 8}" y="${el.y - 8}" font-size="11" fill="#999">${escapeXml(el.title)}</text>`;
        default:
          return '';
      }
    })
    .join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${svgElements}
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
