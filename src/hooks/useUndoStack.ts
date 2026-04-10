"use client";

import { useState, useCallback, useRef } from 'react';

// ============================================================
// PART 1 — 타입
// ============================================================

interface UndoEntry {
  text: string;
  timestamp: number;
  label?: string; // 예: "리라이트", "확장", "축소"
}

interface UndoStack {
  /** 현재 Undo 가능 여부 */
  canUndo: boolean;
  /** 현재 Redo 가능 여부 */
  canRedo: boolean;
  /** Undo 스택 크기 */
  undoCount: number;
  /** Undo 실행 → 이전 텍스트 반환 */
  undo: () => string | null;
  /** Redo 실행 → 다음 텍스트 반환 */
  redo: () => string | null;
  /** 새 상태 Push (리라이트 적용 시) */
  push: (text: string, label?: string) => void;
  /** 스택 초기화 */
  clear: () => void;
  /** 최근 엔트리 레이블 */
  lastLabel: string | null;
}

// ============================================================
// PART 2 — 메인 훅
// ============================================================

const MAX_STACK = 50;

export function useUndoStack(initialText?: string): UndoStack {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>(
    initialText ? [{ text: initialText, timestamp: Date.now() }] : []
  );
  const [pointer, setPointer] = useState(initialText ? 0 : -1);
  const lastPush = useRef(0);

  const canUndo = pointer > 0;
  const canRedo = pointer < undoStack.length - 1;
  const undoCount = undoStack.length;
  const lastLabel = pointer >= 0 ? undoStack[pointer]?.label ?? null : null;

  const push = useCallback((text: string, label?: string) => {
    // 디바운스: 500ms 이내 중복 push 방지
    const now = Date.now();
    if (now - lastPush.current < 500) return;
    lastPush.current = now;

    setUndoStack(prev => {
      // 현재 pointer 이후의 redo 항목 제거
      const trimmed = prev.slice(0, pointer + 1);
      const newStack = [...trimmed, { text, timestamp: now, label }];
      // 최대 크기 초과 시 오래된 것 제거
      if (newStack.length > MAX_STACK) newStack.shift();
      return newStack;
    });
    setPointer(prev => Math.min(prev + 1, MAX_STACK - 1));
  }, [pointer]);

  const undo = useCallback((): string | null => {
    if (!canUndo) return null;
    const newPointer = pointer - 1;
    setPointer(newPointer);
    return undoStack[newPointer]?.text ?? null;
  }, [canUndo, pointer, undoStack]);

  const redo = useCallback((): string | null => {
    if (!canRedo) return null;
    const newPointer = pointer + 1;
    setPointer(newPointer);
    return undoStack[newPointer]?.text ?? null;
  }, [canRedo, pointer, undoStack]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setPointer(-1);
  }, []);

  return { canUndo, canRedo, undoCount, undo, redo, push, clear, lastLabel };
}
