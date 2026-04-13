/**
 * Tests for useStudioUX hook.
 * Covers: confirm modal, save flash, error state, custom event listeners.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { useStudioUX } from '@/hooks/useStudioUX';

// ============================================================
// PART 1 — Test Harness
// ============================================================

function createHarness() {
  const ref: { current: ReturnType<typeof useStudioUX> | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    const hook = useStudioUX();
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

describe('useStudioUX', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default null/false states', () => {
    const { get, cleanup } = createHarness();
    expect(get().uxError).toBeNull();
    expect(get().storageFull).toBe(false);
    expect(get().exportDoneFormat).toBeNull();
    expect(get().lastSaveTime).toBeNull();
    expect(get().saveFlash).toBe(false);
    expect(get().fallbackNotice).toBeNull();
    expect(get().confirmState.open).toBe(false);
    cleanup();
  });

  it('manages error state', () => {
    const { get, cleanup } = createHarness();
    const err = { error: new Error('test'), retry: jest.fn() };
    act(() => { get().setUxError(err); });
    expect(get().uxError).toBe(err);

    act(() => { get().setUxError(null); });
    expect(get().uxError).toBeNull();
    cleanup();
  });

  it('opens and closes confirm modal', () => {
    const { get, cleanup } = createHarness();
    const onConfirm = jest.fn();

    act(() => {
      get().showConfirm({
        title: 'Delete?',
        message: 'Are you sure?',
        variant: 'danger',
        onConfirm,
      });
    });

    expect(get().confirmState.open).toBe(true);
    expect(get().confirmState.title).toBe('Delete?');
    expect(get().confirmState.message).toBe('Are you sure?');
    expect(get().confirmState.variant).toBe('danger');

    act(() => { get().closeConfirm(); });
    expect(get().confirmState.open).toBe(false);
    cleanup();
  });

  it('triggerSave sets saveFlash and lastSaveTime, then clears flash after 1500ms', () => {
    const { get, cleanup } = createHarness();
    const before = Date.now();

    act(() => { get().triggerSave(); });
    expect(get().saveFlash).toBe(true);
    expect(get().lastSaveTime).toBeGreaterThanOrEqual(before);

    act(() => { jest.advanceTimersByTime(1500); });
    expect(get().saveFlash).toBe(false);
    cleanup();
  });

  it('responds to noa:storage-full custom event', () => {
    const { get, cleanup } = createHarness();
    expect(get().storageFull).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('noa:storage-full'));
    });
    expect(get().storageFull).toBe(true);
    cleanup();
  });

  it('responds to noa:export-done custom event and auto-clears', () => {
    const { get, cleanup } = createHarness();

    act(() => {
      window.dispatchEvent(new CustomEvent('noa:export-done', { detail: { format: 'PDF' } }));
    });
    expect(get().exportDoneFormat).toBe('PDF');

    act(() => { jest.advanceTimersByTime(3000); });
    expect(get().exportDoneFormat).toBeNull();
    cleanup();
  });

  it('responds to noa:auto-saved custom event', () => {
    const { get, cleanup } = createHarness();
    const before = Date.now();

    act(() => {
      window.dispatchEvent(new Event('noa:auto-saved'));
    });
    expect(get().lastSaveTime).toBeGreaterThanOrEqual(before);
    cleanup();
  });

  it('responds to noa:provider-fallback custom event and auto-clears', () => {
    const { get, cleanup } = createHarness();

    act(() => {
      window.dispatchEvent(new CustomEvent('noa:provider-fallback', {
        detail: { from: 'GPT-4', to: 'Gemini' },
      }));
    });
    expect(get().fallbackNotice).toBe('GPT-4 → Gemini');

    act(() => { jest.advanceTimersByTime(5000); });
    expect(get().fallbackNotice).toBeNull();
    cleanup();
  });

  it('confirm modal executes onConfirm callback', () => {
    const { get, cleanup } = createHarness();
    const onConfirm = jest.fn();

    act(() => {
      get().showConfirm({
        title: 'Test',
        message: 'Confirm?',
        onConfirm,
      });
    });

    // Call onConfirm stored in state
    act(() => { get().confirmState.onConfirm(); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
