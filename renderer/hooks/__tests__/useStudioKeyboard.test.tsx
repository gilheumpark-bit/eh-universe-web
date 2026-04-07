/**
 * Tests for useStudioKeyboard hook.
 * Covers: F-key tab switching, Ctrl combos, Escape handling, disabled state.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { useStudioKeyboard } from '@/hooks/useStudioKeyboard';

// ============================================================
// PART 1 — Test Harness
// ============================================================

type Opts = Parameters<typeof useStudioKeyboard>[0];

function createHarness(overrides: Partial<Opts> = {}) {
  const callbacks = {
    onTabChange: jest.fn(),
    onToggleSearch: jest.fn(),
    onExportTXT: jest.fn(),
    onPrint: jest.fn(),
    onNewSession: jest.fn(),
    onToggleFocus: jest.fn(),
    onToggleShortcuts: jest.fn(),
    onSave: jest.fn(),
    onNewEpisode: jest.fn(),
    onToggleAssistant: jest.fn(),
    onEscape: jest.fn(),
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onGlobalSearch: jest.fn(),
    disabled: false,
    ...overrides,
  };

  const ref: { current: typeof callbacks } = { current: callbacks };
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    useStudioKeyboard(ref.current);
    return null;
  }

  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(TestComponent));
  });

  function fire(key: string, mods: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean } = {}) {
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key,
        ctrlKey: mods.ctrlKey ?? false,
        shiftKey: mods.shiftKey ?? false,
        metaKey: mods.metaKey ?? false,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    });
  }

  return {
    callbacks,
    fire,
    cleanup: () => {
      act(() => { root.unmount(); });
      document.body.removeChild(container);
    },
  };
}

// ============================================================
// PART 2 — Tests
// ============================================================

describe('useStudioKeyboard', () => {
  it('F1-F8 triggers onTabChange with correct tab', () => {
    const { callbacks, fire, cleanup } = createHarness();

    const fKeyMap: Record<string, string> = {
      F1: 'world', F2: 'characters', F3: 'rulebook', F4: 'writing',
      F5: 'style', F6: 'manuscript', F7: 'history', F8: 'settings',
    };

    for (const [key, tab] of Object.entries(fKeyMap)) {
      fire(key);
      expect(callbacks.onTabChange).toHaveBeenLastCalledWith(tab);
    }
    cleanup();
  });

  it('Ctrl+S triggers onSave', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('s', { ctrlKey: true });
    expect(callbacks.onSave).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('Ctrl+F triggers onToggleSearch', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('f', { ctrlKey: true });
    expect(callbacks.onToggleSearch).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('Ctrl+E triggers onExportTXT', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('e', { ctrlKey: true });
    expect(callbacks.onExportTXT).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('Ctrl+P triggers onPrint', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('p', { ctrlKey: true });
    expect(callbacks.onPrint).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('Ctrl+N triggers onNewSession', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('n', { ctrlKey: true });
    expect(callbacks.onNewSession).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('Ctrl+Shift+N triggers onNewEpisode', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('N', { ctrlKey: true, shiftKey: true });
    expect(callbacks.onNewEpisode).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('Ctrl+K triggers onGlobalSearch', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('k', { ctrlKey: true });
    expect(callbacks.onGlobalSearch).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('F11 triggers onToggleFocus', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('F11');
    expect(callbacks.onToggleFocus).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('F12 triggers onToggleShortcuts', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('F12');
    expect(callbacks.onToggleShortcuts).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('Ctrl+/ triggers onToggleAssistant when provided', () => {
    const { callbacks, fire, cleanup } = createHarness();
    fire('/', { ctrlKey: true });
    expect(callbacks.onToggleAssistant).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('Ctrl+/ falls back to onToggleShortcuts when assistant handler is absent', () => {
    const { callbacks, fire, cleanup } = createHarness({ onToggleAssistant: undefined });
    fire('/', { ctrlKey: true });
    expect(callbacks.onToggleShortcuts).toHaveBeenCalled();
    cleanup();
  });

  it('Escape always triggers onEscape even when disabled', () => {
    const { callbacks, fire, cleanup } = createHarness({ disabled: true });
    fire('Escape');
    expect(callbacks.onEscape).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('suppresses non-Escape shortcuts when disabled', () => {
    const { callbacks, fire, cleanup } = createHarness({ disabled: true });
    fire('F1');
    fire('s', { ctrlKey: true });
    expect(callbacks.onTabChange).not.toHaveBeenCalled();
    expect(callbacks.onSave).not.toHaveBeenCalled();
    cleanup();
  });
});
