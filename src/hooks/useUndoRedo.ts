// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { useState, useCallback, useRef } from 'react';

interface UseUndoRedoOptions<T> {
  initialState: T;
  maxHistory?: number;
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Reset history, keeping current state */
  clearHistory: () => void;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=UseUndoRedoReturn

// ============================================================
// PART 2 — Hook implementation
// ============================================================

export function useUndoRedo<T>({ initialState, maxHistory = 20 }: UseUndoRedoOptions<T>): UseUndoRedoReturn<T> {
  const [state, setStateRaw] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const skipRecordRef = useRef(false);

  const setState = useCallback((newState: T) => {
    setStateRaw(prev => {
      if (!skipRecordRef.current) {
        pastRef.current = [...pastRef.current, prev].slice(-maxHistory);
        futureRef.current = [];
      }
      skipRecordRef.current = false;
      return newState;
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    setStateRaw(current => {
      futureRef.current = [current, ...futureRef.current].slice(0, maxHistory);
      return previous;
    });
  }, [maxHistory]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    setStateRaw(current => {
      pastRef.current = [...pastRef.current, current].slice(-maxHistory);
      return next;
    });
  }, [maxHistory]);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
  }, []);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    clearHistory,
  };
}

// IDENTITY_SEAL: PART-2 | role=undo/redo hook | inputs=initialState,maxHistory | outputs=state,undo,redo
