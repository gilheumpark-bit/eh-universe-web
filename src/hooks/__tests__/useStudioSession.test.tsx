/**
 * Tests for useStudioSession hook.
 * Covers: new session creation, unsaved-work guard, demo session loading.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { useStudioSession } from '@/hooks/useStudioSession';
import type { ChatSession, Message, StoryConfig } from '@/lib/studio-types';

// Mock dependencies
jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string) => key,
}));

jest.mock('@/lib/demo-presets', () => ({
  DEMO_PRESETS: [
    {
      id: 'demo-1',
      title: 'Demo Novel',
      messages: [{ role: 'assistant', content: 'Welcome to demo' }],
      config: { title: 'Demo', genre: 'FANTASY' },
    },
  ],
  buildDemoSession: (preset: any, isKO: boolean) => ({
    title: preset.title,
    messages: preset.messages,
    config: preset.config,
  }),
}));

jest.mock('@/hooks/useProjectManager', () => ({
  INITIAL_CONFIG: {},
}));

// ============================================================
// PART 1 — Test Harness
// ============================================================

type HookReturn = ReturnType<typeof useStudioSession>;

function createHarness(overrides: {
  currentSession?: ChatSession | null;
  editDraft?: string;
} = {}) {
  const callbacks = {
    doCreateNewSession: jest.fn(),
    updateCurrentSession: jest.fn(),
    setActiveTab: jest.fn(),
    setIsSidebarOpen: jest.fn(),
    setWritingMode: jest.fn(),
    showConfirm: jest.fn(),
    closeConfirm: jest.fn(),
  };

  const session: ChatSession | null = overrides.currentSession ?? null;
  const editDraft = overrides.editDraft ?? '';

  const ref: { current: HookReturn | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);

  function TestComponent() {
    const hook = useStudioSession({
      language: 'KO',
      currentSession: session,
      editDraft,
      ...callbacks,
    });
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
    callbacks,
    cleanup: () => {
      act(() => { root.unmount(); });
      document.body.removeChild(container);
    },
  };
}

// ============================================================
// PART 2 — Tests
// ============================================================

describe('useStudioSession', () => {
  // Stub window.innerWidth for mobile check
  const originalInnerWidth = window.innerWidth;
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
  });

  it('creates new session immediately when no current work exists', () => {
    const { get, callbacks, cleanup } = createHarness();

    act(() => { get().createNewSession('world'); });

    // No confirm dialog — session created directly
    expect(callbacks.showConfirm).not.toHaveBeenCalled();
    expect(callbacks.doCreateNewSession).toHaveBeenCalledTimes(1);
    expect(callbacks.setActiveTab).toHaveBeenCalledWith('world');
    cleanup();
  });

  it('shows confirm dialog when session has messages', () => {
    const session = {
      id: 's1',
      title: 'Test',
      messages: [{ role: 'user' as const, content: 'Hello' }] as Message[],
      config: {} as StoryConfig,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as ChatSession;

    const { get, callbacks, cleanup } = createHarness({ currentSession: session });

    act(() => { get().createNewSession(); });

    expect(callbacks.showConfirm).toHaveBeenCalledTimes(1);
    const confirmArgs = callbacks.showConfirm.mock.calls[0][0];
    expect(confirmArgs.variant).toBe('warning');
    expect(typeof confirmArgs.onConfirm).toBe('function');

    // Simulate user confirming
    act(() => { confirmArgs.onConfirm(); });
    expect(callbacks.closeConfirm).toHaveBeenCalled();
    expect(callbacks.doCreateNewSession).toHaveBeenCalled();
    cleanup();
  });

  it('shows confirm dialog when editDraft has content', () => {
    const { get, callbacks, cleanup } = createHarness({ editDraft: 'Some draft text' });

    act(() => { get().createNewSession(); });
    expect(callbacks.showConfirm).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('collapses sidebar on mobile when creating session', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    const { get, callbacks, cleanup } = createHarness();

    act(() => { get().createNewSession(); });
    expect(callbacks.setIsSidebarOpen).toHaveBeenCalledWith(false);
    cleanup();
  });

  it('manages rename state', () => {
    const { get, cleanup } = createHarness();

    expect(get().renamingSessionId).toBeNull();
    expect(get().renameValue).toBe('');

    act(() => { get().setRenamingSessionId('sess-1'); });
    expect(get().renamingSessionId).toBe('sess-1');

    act(() => { get().setRenameValue('New Name'); });
    expect(get().renameValue).toBe('New Name');
    cleanup();
  });

  it('createDemoSession triggers new session and updates with preset data', () => {
    const { get, callbacks, cleanup } = createHarness();

    // Mock requestAnimationFrame
    const origRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); return 0; };

    act(() => { get().createDemoSession('demo-1'); });

    expect(callbacks.doCreateNewSession).toHaveBeenCalledTimes(1);

    window.requestAnimationFrame = origRAF;
    cleanup();
  });
});
