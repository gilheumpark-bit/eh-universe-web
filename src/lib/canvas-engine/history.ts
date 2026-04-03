// ============================================================
// Canvas Engine — History (Undo/Redo)
// ============================================================

import type { CanvasElement } from './elements';

export interface CanvasSnapshot {
  elements: CanvasElement[];
  timestamp: number;
}

export interface HistoryState {
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];
  maxSize: number;
}

export function createHistory(maxSize: number = 50): HistoryState {
  return { undoStack: [], redoStack: [], maxSize };
}

/** 현재 상태를 히스토리에 기록 */
export function pushHistory(history: HistoryState, elements: CanvasElement[]): HistoryState {
  const snapshot: CanvasSnapshot = { elements: elements.map(el => ({ ...el })), timestamp: Date.now() };
  const undoStack = [...history.undoStack, snapshot].slice(-history.maxSize);
  return { ...history, undoStack, redoStack: [] }; // redo 초기화
}

/** Undo */
export function undo(history: HistoryState, currentElements: CanvasElement[]): { history: HistoryState; elements: CanvasElement[] } | null {
  if (history.undoStack.length === 0) return null;
  const prev = history.undoStack[history.undoStack.length - 1];
  const currentSnapshot: CanvasSnapshot = { elements: currentElements.map(el => ({ ...el })), timestamp: Date.now() };
  return {
    history: {
      ...history,
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [...history.redoStack, currentSnapshot],
    },
    elements: prev.elements,
  };
}

/** Redo */
export function redo(history: HistoryState, currentElements: CanvasElement[]): { history: HistoryState; elements: CanvasElement[] } | null {
  if (history.redoStack.length === 0) return null;
  const next = history.redoStack[history.redoStack.length - 1];
  const currentSnapshot: CanvasSnapshot = { elements: currentElements.map(el => ({ ...el })), timestamp: Date.now() };
  return {
    history: {
      ...history,
      undoStack: [...history.undoStack, currentSnapshot],
      redoStack: history.redoStack.slice(0, -1),
    },
    elements: next.elements,
  };
}

export function canUndo(history: HistoryState): boolean { return history.undoStack.length > 0; }
export function canRedo(history: HistoryState): boolean { return history.redoStack.length > 0; }
