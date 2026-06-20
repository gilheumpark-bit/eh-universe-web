"use client";

import { useReducer, useCallback, useRef } from 'react';

// ============================================================
// PART 1 — 타입
// ============================================================

interface UndoEntry {
  text: string;
  timestamp: number;
  label?: string;
}

interface UndoState {
  stack: UndoEntry[];
  pointer: number;
}

type UndoAction =
  | { type: 'PUSH'; text: string; label?: string; timestamp: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' };

export interface UndoStack {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  undo: () => string | null;
  redo: () => string | null;
  push: (text: string, label?: string) => void;
  clear: () => void;
  lastLabel: string | null;
  /** Call on every content change; auto-snapshots when delta >= 300 chars */
  checkAutoSnapshot: (currentContent: string) => void;
}

// ============================================================
// PART 2 — Reducer (단일 원자 상태 업데이트)
// ============================================================

const MAX_STACK = 50;

function undoReducer(state: UndoState, action: UndoAction): UndoState {
  switch (action.type) {
    case 'PUSH': {
      // pointer 이후 redo 항목 제거 → 새 항목 추가
      const trimmed = state.stack.slice(0, state.pointer + 1);
      const entry: UndoEntry = { text: action.text, timestamp: action.timestamp, label: action.label };
      const newStack = [...trimmed, entry];
      // 최대 크기 초과 시 오래된 것 제거
      if (newStack.length > MAX_STACK) {
        newStack.shift();
        return { stack: newStack, pointer: newStack.length - 1 };
      }
      return { stack: newStack, pointer: trimmed.length };
    }
    case 'UNDO': {
      if (state.pointer <= 0) return state;
      return { ...state, pointer: state.pointer - 1 };
    }
    case 'REDO': {
      if (state.pointer >= state.stack.length - 1) return state;
      return { ...state, pointer: state.pointer + 1 };
    }
    case 'CLEAR':
      return { stack: [], pointer: -1 };
    default:
      return state;
  }
}

// ============================================================
// PART 3 — 메인 훅
// ============================================================

export function useUndoStack(initialText?: string): UndoStack {
  const [state, dispatch] = useReducer(undoReducer, initialText, (init): UndoState => ({
    stack: init ? [{ text: init, timestamp: Date.now() }] : [],
    pointer: init ? 0 : -1,
  }));

  const lastPush = useRef(0);
  /** Content at the time of the last auto-snapshot */
  const lastSnapshotContent = useRef(initialText ?? '');

  const canUndo = state.pointer > 0;
  const canRedo = state.pointer < state.stack.length - 1;
  const undoCount = state.stack.length;
  const lastLabel = state.pointer >= 0 ? state.stack[state.pointer]?.label ?? null : null;

  const push = useCallback((text: string, label?: string) => {
    const now = Date.now();
    if (now - lastPush.current < 300) return;
    lastPush.current = now;
    dispatch({ type: 'PUSH', text, label, timestamp: now });
  }, []);

  const undo = useCallback((): string | null => {
    if (state.pointer <= 0) return null;
    // [C] dispatch 이전에 타겟 텍스트를 확정 — stale closure 읽기여도 명시적 계산으로 의도 고정
    const target = state.stack[state.pointer - 1]?.text ?? null;
    dispatch({ type: 'UNDO' });
    return target;
  }, [state.pointer, state.stack]);

  const redo = useCallback((): string | null => {
    if (state.pointer >= state.stack.length - 1) return null;
    // [C] dispatch 이전에 타겟 텍스트를 확정
    const target = state.stack[state.pointer + 1]?.text ?? null;
    dispatch({ type: 'REDO' });
    return target;
  }, [state.pointer, state.stack]);

  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  /** Auto-snapshot when content changes by 300+ characters since last snapshot */
  const checkAutoSnapshot = useCallback((currentContent: string) => {
    const delta = Math.abs(currentContent.length - lastSnapshotContent.current.length);
    if (delta >= 300) {
      push(currentContent, 'auto-snapshot');
      lastSnapshotContent.current = currentContent;
    }
  }, [push]);

  return { canUndo, canRedo, undoCount, undo, redo, push, clear, lastLabel, checkAutoSnapshot };
}
