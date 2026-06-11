/**
 * GlobalShortcuts.test.tsx (2026-06-08 / 풀점검 priority 5)
 *
 * Global Ctrl+Shift+K → /codex 라우팅 검증.
 * 4-way 키 표준 (ADR-0003): area='global', keyboard-manager SSOT.
 */

import '@testing-library/jest-dom';
import { render, act } from '@testing-library/react';
import GlobalShortcuts from '../GlobalShortcuts';
import { _resetKeyboardRegistry, getAllBindings } from '@/lib/keyboard/keyboard-manager';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn(), back: jest.fn() }),
}));

beforeEach(() => {
  _resetKeyboardRegistry();
  pushMock.mockReset();
});

afterEach(() => {
  _resetKeyboardRegistry();
});

describe('GlobalShortcuts', () => {
  it('마운트 — null 렌더 (효과만 등록)', () => {
    const { container } = render(<GlobalShortcuts />);
    expect(container.firstChild).toBeNull();
  });

  it('Ctrl+Shift+K 바인딩 등록 — global area, ID="global-codex-entry"', () => {
    render(<GlobalShortcuts />);
    const bindings = getAllBindings();
    const codexBind = bindings.find((b) => b.id === 'global-codex-entry');
    expect(codexBind).toBeDefined();
    expect(codexBind?.keys).toBe('ctrl+shift+k');
    expect(codexBind?.area).toBe('global');
  });

  it('Ctrl+Shift+K dispatch → router.push("/codex")', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true }),
      );
    });
    expect(pushMock).toHaveBeenCalledWith('/codex');
  });

  it('Cmd+Shift+K (Mac) dispatch — ctrl/meta 동등 처리', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, shiftKey: true }),
      );
    });
    expect(pushMock).toHaveBeenCalledWith('/codex');
  });

  it('Ctrl+K (shift 없음) → dispatch 안 함', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('Shift+K (ctrl 없음) → dispatch 안 함', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', shiftKey: true }));
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('Ctrl+Shift+L (k 아닌 키) → dispatch 안 함', () => {
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, shiftKey: true }),
      );
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('unmount → 바인딩 해제', () => {
    const { unmount } = render(<GlobalShortcuts />);
    expect(getAllBindings().find((b) => b.id === 'global-codex-entry')).toBeDefined();
    unmount();
    expect(getAllBindings().find((b) => b.id === 'global-codex-entry')).toBeUndefined();
  });

  it('global area — pathname 무관 dispatch (예: /studio)', () => {
    const origPath = window.location.pathname;
    window.history.pushState({}, '', '/studio');
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true }),
      );
    });
    expect(pushMock).toHaveBeenCalledWith('/codex');
    window.history.pushState({}, '', origPath);
  });

  it('global area — pathname /code-studio 에서도 작동', () => {
    const origPath = window.location.pathname;
    window.history.pushState({}, '', '/code-studio');
    render(<GlobalShortcuts />);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true }),
      );
    });
    expect(pushMock).toHaveBeenCalledWith('/codex');
    window.history.pushState({}, '', origPath);
  });

  it('중복 마운트 — 같은 id 재등록 시 바인딩 1개만 유지 (keyboard-manager Map)', () => {
    const { unmount: unmount1 } = render(<GlobalShortcuts />);
    render(<GlobalShortcuts />);
    const count = getAllBindings().filter((b) => b.id === 'global-codex-entry').length;
    expect(count).toBe(1);
    unmount1();
  });
});
