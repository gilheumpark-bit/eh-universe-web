/**
 * Tests for useStudioUX hook.
 * Covers: confirm modal, save flash, error state, custom event listeners.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { useStudioUX, type UseStudioUXOptions } from '@/hooks/useStudioUX';

// ============================================================
// PART 1 — Test Harness
// ============================================================

function createHarness(options: UseStudioUXOptions = {}) {
  const ref: { current: ReturnType<typeof useStudioUX> | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    const hook = useStudioUX(options);
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

  it('triggerSave (no flush) sets saveFlash and lastSaveTime, clears flash after 1500ms', async () => {
    const { get, cleanup } = createHarness();
    const before = Date.now();

    // triggerSave is now async; with fake timers, the run() microtask resolves on flush
    await act(async () => { await get().triggerSave(); });
    expect(get().saveFlash).toBe(true);
    expect(get().saveFailed).toBe(false);
    expect(get().lastSaveTime).toBeGreaterThanOrEqual(before);

    act(() => { jest.advanceTimersByTime(1500); });
    expect(get().saveFlash).toBe(false);
    cleanup();
  });

  it('triggerSave awaits onSaveFlush and only flashes on success', async () => {
    const flush = jest.fn().mockResolvedValue(true);
    const { get, cleanup } = createHarness({ onSaveFlush: flush });

    let returned: boolean | undefined;
    await act(async () => { returned = await get().triggerSave(); });

    expect(flush).toHaveBeenCalledTimes(1);
    expect(returned).toBe(true);
    expect(get().saveFlash).toBe(true);
    expect(get().saveFailed).toBe(false);
    cleanup();
  });

  it('triggerSave surfaces failure state when flush returns false', async () => {
    const flush = jest.fn().mockResolvedValue(false);
    const { get, cleanup } = createHarness({ onSaveFlush: flush });

    const failedListener = jest.fn();
    window.addEventListener('noa:save-failed', failedListener);

    let returned: boolean | undefined;
    await act(async () => { returned = await get().triggerSave(); });

    expect(returned).toBe(false);
    expect(get().saveFlash).toBe(false);
    expect(get().saveFailed).toBe(true);
    expect(failedListener).toHaveBeenCalledTimes(1);

    window.removeEventListener('noa:save-failed', failedListener);
    cleanup();
  });

  it('triggerSave surfaces failure when flush throws', async () => {
    const flush = jest.fn().mockRejectedValue(new Error('QuotaExceeded'));
    const { get, cleanup } = createHarness({ onSaveFlush: flush });

    const alertListener = jest.fn();
    window.addEventListener('noa:alert', alertListener);

    let returned: boolean | undefined;
    await act(async () => { returned = await get().triggerSave(); });

    expect(returned).toBe(false);
    expect(get().saveFailed).toBe(true);
    expect(alertListener).toHaveBeenCalled();
    const alertEvent = alertListener.mock.calls[0][0] as CustomEvent;
    expect(alertEvent.detail.variant).toBe('error');
    expect(alertEvent.detail.message).toContain('QuotaExceeded');

    window.removeEventListener('noa:alert', alertListener);
    cleanup();
  });

  it('concurrent triggerSave calls share the same in-flight promise', async () => {
    let resolveFlush!: (ok: boolean) => void;
    const flush = jest.fn(() => new Promise<boolean>((r) => { resolveFlush = r; }));
    const { get, cleanup } = createHarness({ onSaveFlush: flush });

    let p1: Promise<boolean>;
    let p2: Promise<boolean>;
    await act(async () => {
      p1 = get().triggerSave();
      p2 = get().triggerSave();
    });

    // Only one flush call even though triggerSave was invoked twice
    expect(flush).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFlush(true);
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe(true);
      expect(r2).toBe(true);
    });
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
