/**
 * GlobalShortcuts.test.tsx (2026-06-08 / 풀점검 priority 5)
 *
 * Current global shortcuts stay inside the active Loreguard surface.
 * Removed public surfaces such as Codex must not be globally reachable.
 */

import '@testing-library/jest-dom';
import { render, act } from '@testing-library/react';
import GlobalShortcuts from '../GlobalShortcuts';
import { _resetKeyboardRegistry, getAllBindings } from '@/lib/keyboard/keyboard-manager';

beforeEach(() => {
  _resetKeyboardRegistry();
});

afterEach(() => {
  _resetKeyboardRegistry();
});

describe('GlobalShortcuts', () => {
  it('마운트 — null 렌더 (효과만 등록)', () => {
    const { container } = render(<GlobalShortcuts />);
    expect(container.firstChild).toBeNull();
  });

  it('legacy Codex global entry is not registered', () => {
    render(<GlobalShortcuts />);
    const bindings = getAllBindings();
    expect(bindings.find((b) => b.id === 'global-codex-entry')).toBeUndefined();
    expect(bindings.find((b) => b.keys === 'ctrl+shift+k')).toBeUndefined();
  });

  it('Ctrl+Shift+K dispatch does not navigate to removed public surfaces', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true }),
      );
    });
    expect(getAllBindings().find((b) => b.id === 'global-codex-entry')).toBeUndefined();
  });

  it('Cmd+Shift+K (Mac) does not register a removed route shortcut', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, shiftKey: true }),
      );
    });
    expect(getAllBindings().find((b) => b.keys === 'ctrl+shift+k')).toBeUndefined();
  });

  it('Ctrl+K (shift 없음) → dispatch 안 함', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
    expect(getAllBindings()).toHaveLength(1);
  });

  it('Shift+K (ctrl 없음) → dispatch 안 함', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', shiftKey: true }));
    });
    expect(getAllBindings()).toHaveLength(1);
  });

  it('Ctrl+Shift+L (k 아닌 키) → dispatch 안 함', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, shiftKey: true }),
      );
    });
    expect(getAllBindings()).toHaveLength(1);
  });

  it('unmount → 바인딩 해제', () => {
    const { unmount } = render(<GlobalShortcuts />);
    expect(getAllBindings().find((b) => b.id === 'global-shortcuts-help')).toBeDefined();
    unmount();
    expect(getAllBindings().find((b) => b.id === 'global-shortcuts-help')).toBeUndefined();
  });

  it('Ctrl+/ dispatches the shortcuts help event', () => {
    const listener = jest.fn();
    window.addEventListener('noa:open-shortcuts-help', listener);
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: true }));
    });
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('noa:open-shortcuts-help', listener);
  });

  it('중복 마운트 — 같은 id 재등록 시 바인딩 1개만 유지 (keyboard-manager Map)', () => {
    const { unmount: unmount1 } = render(<GlobalShortcuts />);
    render(<GlobalShortcuts />);
    const count = getAllBindings().filter((b) => b.id === 'global-shortcuts-help').length;
    expect(count).toBe(1);
    unmount1();
  });
});
