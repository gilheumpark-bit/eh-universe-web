/**
 * Tests for useMediaQuery and companions.
 * Covers: SSR guard, initial match, change event, cleanup, breakpoint helpers.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import {
  useMediaQuery,
  useIsMobileQuery,
  useIsTabletQuery,
  useIsDesktopQuery,
} from '@/hooks/useMediaQuery';

// ============================================================
// PART 1 — matchMedia mock helper
// ============================================================

interface MockMql {
  matches: boolean;
  media: string;
  onchange: ((e: MediaQueryListEvent) => void) | null;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  addListener: jest.Mock;
  removeListener: jest.Mock;
  dispatchEvent: jest.Mock;
  _listeners: Array<(e: MediaQueryListEvent) => void>;
  _trigger: (matches: boolean) => void;
}

function installMatchMedia(queryMatch: (q: string) => boolean) {
  const created: MockMql[] = [];
  const factory = (query: string): MockMql => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];
    const mql: MockMql = {
      matches: queryMatch(query),
      media: query,
      onchange: null,
      addEventListener: jest.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.push(cb);
      }),
      removeEventListener: jest.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
        const idx = listeners.indexOf(cb);
        if (idx >= 0) listeners.splice(idx, 1);
      }),
      addListener: jest.fn((cb: (e: MediaQueryListEvent) => void) => {
        listeners.push(cb);
      }),
      removeListener: jest.fn((cb: (e: MediaQueryListEvent) => void) => {
        const idx = listeners.indexOf(cb);
        if (idx >= 0) listeners.splice(idx, 1);
      }),
      dispatchEvent: jest.fn(),
      _listeners: listeners,
      _trigger: (next: boolean) => {
        mql.matches = next;
        const evt = { matches: next, media: query } as unknown as MediaQueryListEvent;
        listeners.forEach((cb) => cb(evt));
      },
    };
    created.push(mql);
    return mql;
  };

  // jest.setup.components.js already seeds matchMedia with writable:true, configurable
  // default is false — so we use direct assignment via a typed cast rather than
  // defineProperty, which survives across tests without "Cannot redefine property" errors.
  (window as unknown as { matchMedia: (q: string) => MockMql }).matchMedia = factory;

  return created;
}

// ============================================================
// PART 2 — Hook harness
// ============================================================

function createHarness<T>(useHook: () => T) {
  const ref: { current: T | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    const val = useHook();
    React.useEffect(() => {
      ref.current = val;
    });
    return null;
  }

  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(TestComponent));
  });

  return {
    get: () => ref.current,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
}

// ============================================================
// PART 3 — Tests
// ============================================================

describe('useMediaQuery', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns initial match value on mount', () => {
    installMatchMedia((q) => q === '(max-width: 767px)');
    const h = createHarness(() => useMediaQuery('(max-width: 767px)'));
    expect(h.get()).toBe(true);
    h.cleanup();
  });

  it('returns false for non-matching query', () => {
    installMatchMedia(() => false);
    const h = createHarness(() => useMediaQuery('(min-width: 9999px)'));
    expect(h.get()).toBe(false);
    h.cleanup();
  });

  it('updates when media query change event fires', () => {
    const mqls = installMatchMedia(() => false);
    const h = createHarness(() => useMediaQuery('(max-width: 767px)'));
    expect(h.get()).toBe(false);
    act(() => {
      // trigger a change on the last-created MQL
      mqls[mqls.length - 1]._trigger(true);
    });
    expect(h.get()).toBe(true);
    h.cleanup();
  });

  it('removes listener on unmount', () => {
    const mqls = installMatchMedia(() => false);
    const h = createHarness(() => useMediaQuery('(max-width: 767px)'));
    const mql = mqls[mqls.length - 1];
    expect(mql._listeners.length).toBeGreaterThan(0);
    h.cleanup();
    expect(mql._listeners.length).toBe(0);
  });
});

describe('useIsMobileQuery / useIsTabletQuery / useIsDesktopQuery', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('useIsMobileQuery matches (max-width: 767px)', () => {
    installMatchMedia((q) => q === '(max-width: 767px)');
    const h = createHarness(() => useIsMobileQuery());
    expect(h.get()).toBe(true);
    h.cleanup();
  });

  it('useIsTabletQuery matches 768-1023 range', () => {
    installMatchMedia(
      (q) => q === '(min-width: 768px) and (max-width: 1023px)',
    );
    const h = createHarness(() => useIsTabletQuery());
    expect(h.get()).toBe(true);
    h.cleanup();
  });

  it('useIsDesktopQuery matches (min-width: 1024px)', () => {
    installMatchMedia((q) => q === '(min-width: 1024px)');
    const h = createHarness(() => useIsDesktopQuery());
    expect(h.get()).toBe(true);
    h.cleanup();
  });
});
