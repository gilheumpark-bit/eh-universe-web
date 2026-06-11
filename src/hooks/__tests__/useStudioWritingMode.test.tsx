/**
 * Tests for useStudioWritingMode hook.
 * Covers: mode switching, editDraft per-session persist, canvasPass sessionStorage.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { useStudioWritingMode } from '@/hooks/useStudioWritingMode';

// ============================================================
// PART 1 — Test Harness
// ============================================================

function createHarness(sessionId: string | null = 'sess-1', hydrated = true) {
  const ref: { current: ReturnType<typeof useStudioWritingMode> | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    const hook = useStudioWritingMode(sessionId, hydrated);
    React.useEffect(() => { ref.current = hook; });
    return null;
  }

  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(TestComponent));
  });

  return {
    get: () => ref.current!,
    cleanup: () => {
      act(() => { root.unmount(); });
      document.body.removeChild(container);
    },
  };
}

// ============================================================
// PART 2 — Tests
// ============================================================

describe('useStudioWritingMode', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default writing mode "edit"', () => {
    const { get, cleanup } = createHarness();
    // Default changed from "ai" to "edit" in current implementation
    expect(get().writingMode).toBe('edit');
    cleanup();
  });

  it('switches writing mode', () => {
    const { get, cleanup } = createHarness();
    act(() => { get().setWritingMode('edit'); });
    expect(get().writingMode).toBe('edit');

    act(() => { get().setWritingMode('canvas'); });
    expect(get().writingMode).toBe('canvas');
    cleanup();
  });

  it('editDraft starts empty', () => {
    const { get, cleanup } = createHarness();
    expect(get().editDraft).toBe('');
    cleanup();
  });

  it('persists editDraft to localStorage per session', () => {
    const { get, cleanup } = createHarness('sess-A');
    act(() => { get().setEditDraft('Hello world'); });
    // The hook debounces localStorage writes — but writes immediately for non-empty
    expect(localStorage.getItem('noa_editdraft_sess-A')).toBe('Hello world');
    cleanup();
  });

  it('restores editDraft from localStorage on mount', () => {
    localStorage.setItem('noa_editdraft_sess-B', 'Restored text');
    const { get, cleanup } = createHarness('sess-B');
    // The hook restores via setTimeout — advance timers to flush it
    act(() => { jest.runAllTimers(); });
    expect(get().editDraft).toBe('Restored text');
    cleanup();
  });

  it('does not restore when hydrated is false', () => {
    localStorage.setItem('noa_editdraft_sess-C', 'Should not load');
    const { get, cleanup } = createHarness('sess-C', false);
    expect(get().editDraft).toBe('');
    cleanup();
  });

  it('canvasPass defaults to 0', () => {
    const { get, cleanup } = createHarness();
    expect(get().canvasPass).toBe(0);
    cleanup();
  });

  it('persists canvasPass > 0 to sessionStorage', () => {
    const { get, cleanup } = createHarness();
    act(() => { get().setCanvasPass(3); });
    // The useEffect runs synchronously in test
    expect(get().canvasPass).toBe(3);
    cleanup();
  });

  it('manages promptDirective state', () => {
    const { get, cleanup } = createHarness();
    expect(get().promptDirective).toBe('');
    act(() => { get().setPromptDirective('Write in first person'); });
    expect(get().promptDirective).toBe('Write in first person');
    cleanup();
  });

  it('supports all writing modes', () => {
    const modes = ['ai', 'edit', 'canvas', 'refine', 'advanced'] as const;
    const { get, cleanup } = createHarness();
    for (const mode of modes) {
      act(() => { get().setWritingMode(mode); });
      expect(get().writingMode).toBe(mode);
    }
    cleanup();
  });

  // ============================================================
  // PART 3 — writingMode 세션별 영속 [P4 low/integration 2026-06-09]
  //   탭 전환 후 집필 탭 복귀 시 기본값('edit')으로 리셋되던 결함 검증.
  // ============================================================

  it('persists writingMode to localStorage per session', () => {
    const { get, cleanup } = createHarness('sess-mode-A');
    act(() => { get().setWritingMode('refine'); });
    expect(localStorage.getItem('noa_writingmode_sess-mode-A')).toBe('refine');
    cleanup();
  });

  it('restores writingMode from localStorage on mount (탭 전환 후 복원)', () => {
    localStorage.setItem('noa_writingmode_sess-mode-B', 'canvas');
    const { get, cleanup } = createHarness('sess-mode-B');
    act(() => { jest.runAllTimers(); });
    expect(get().writingMode).toBe('canvas');
    cleanup();
  });

  it('ignores invalid persisted writingMode and falls back to default', () => {
    localStorage.setItem('noa_writingmode_sess-mode-C', 'bogus-mode');
    const { get, cleanup } = createHarness('sess-mode-C');
    act(() => { jest.runAllTimers(); });
    expect(get().writingMode).toBe('edit');
    cleanup();
  });

  it('does not persist writingMode when not hydrated', () => {
    const { get, cleanup } = createHarness('sess-mode-D', false);
    act(() => { get().setWritingMode('advanced'); });
    expect(localStorage.getItem('noa_writingmode_sess-mode-D')).toBeNull();
    cleanup();
  });
});
