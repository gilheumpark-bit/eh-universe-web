// ============================================================
// Canvas Engine — Sketch/Figma 스타일 무한 캔버스 엔진
// ============================================================
// 전 스튜디오 공유. dynamic import로 필요할 때만 로드.
//
// 소설: 씬 스토리보드, 캐릭터 관계도
// 코드: UI 와이어프레임, 컴포넌트 구조도
// 아카이브: 세계관 지도

// Core (뷰포트, 줌, 팬)
export { createViewport, screenToCanvas, canvasToScreen, zoomAtPoint, pan, zoomTo, fitToRect, getBoundingBox, rectsOverlap, pointInRect, MIN_ZOOM, MAX_ZOOM, type Point, type Size, type Rect, type Viewport } from './core';

// Elements (캔버스 요소)
export { createRect, createText, createImage, createConnection, createSticky, createFrame, createGroup, moveElement, resizeElement, getElementRect, getAnchorPoint, duplicateElement, type CanvasElement, type ElementType, type RectElement, type TextElement, type ImageElement, type ConnectionElement, type StickyElement, type FrameElement, type GroupElement } from './elements';

// Interactions (드래그, 선택, 스냅, 정렬)
export { createSelectionState, hitTest, selectByMarquee, calculateSnapGuides, createDragState, hitTestResizeHandle, alignElements, distributeElements, type SelectionState, type SnapGuide, type DragState, type ResizeHandle, type AlignDirection } from './interactions';

// History (Undo/Redo)
export { createHistory, pushHistory, undo, redo, canUndo, canRedo, type HistoryState, type CanvasSnapshot } from './history';

// Serialization (저장, 로드, 내보내기)
export { createDocument, serializeDocument, deserializeDocument, saveToLocalStorage, loadFromLocalStorage, exportToSvg, type CanvasDocument } from './serialization';

// Presets (스튜디오별 템플릿)
export { createStoryboardPreset, createCharacterMapPreset, createWireframePreset, createComponentTreePreset, createWorldMapPreset, createBrainstormPreset } from './presets';
