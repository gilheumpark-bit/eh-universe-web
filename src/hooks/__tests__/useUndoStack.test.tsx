/**
 * useUndoStack.test.tsx
 *
 * P0 버그 회귀 방지 테스트 — `undo()` / `redo()` 반환값이 dispatch 이후의
 * 실제 타겟 텍스트와 일치하는지 검증한다. stale closure 로 인한 빗나간
 * 포인터 참조를 잡아낸다.
 *
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useUndoStack } from '@/hooks/useUndoStack';

// ============================================================
// PART 1 — 반환값 정합성 (stale state 회귀 방지)
// ============================================================

describe('useUndoStack — return-value correctness', () => {
  it('undo() returns the previous text (not stale state)', () => {
    const { result } = renderHook(() => useUndoStack('init'));

    act(() => {
      result.current.push('step1');
    });
    // push 는 300ms 디바운스 — lastPush ref 를 우회하려면 2번째 push 는
    // 다른 테스트에서 검증. 여기서는 init → step1 한 번 전이만으로 충분.

    let undoResult: string | null = null;
    act(() => {
      undoResult = result.current.undo();
    });

    expect(undoResult).toBe('init');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo() returns the next text (not stale state)', () => {
    const { result } = renderHook(() => useUndoStack('init'));

    act(() => {
      result.current.push('step1');
    });

    act(() => {
      result.current.undo();
    });

    let redoResult: string | null = null;
    act(() => {
      redoResult = result.current.redo();
    });

    expect(redoResult).toBe('step1');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo() returns null when at start of stack', () => {
    const { result } = renderHook(() => useUndoStack('only'));

    let undoResult: string | null = 'sentinel';
    act(() => {
      undoResult = result.current.undo();
    });

    expect(undoResult).toBeNull();
  });

  it('redo() returns null when at end of stack', () => {
    const { result } = renderHook(() => useUndoStack('only'));

    let redoResult: string | null = 'sentinel';
    act(() => {
      redoResult = result.current.redo();
    });

    expect(redoResult).toBeNull();
  });
});

// ============================================================
// PART 2 — 플래그·카운트·라벨 일관성
// ============================================================

describe('useUndoStack — flags and counters', () => {
  it('canUndo / canRedo / undoCount track stack position', () => {
    const { result } = renderHook(() => useUndoStack('a'));

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoCount).toBe(1);

    act(() => {
      result.current.push('b', 'edit');
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoCount).toBe(2);
    expect(result.current.lastLabel).toBe('edit');
  });

  it('clear() resets everything', () => {
    const { result } = renderHook(() => useUndoStack('a'));

    act(() => {
      result.current.push('b');
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoCount).toBe(0);
    expect(result.current.lastLabel).toBeNull();
  });
});
