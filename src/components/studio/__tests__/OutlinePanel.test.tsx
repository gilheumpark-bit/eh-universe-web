/**
 * OutlinePanel — VSCode-style outline tree tests.
 *   1. Empty state when no scenes
 *   2. Renders N scenes
 *   3. Click → onSceneClick callback
 *   4. Filter toggle (scenes-only / messages-only)
 *   5. Search filters tree
 *   6. 4-language labels (KO/EN/JP/CN)
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (must run before component import)
// ============================================================

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => {
    const raw = (lang || 'ko').toLowerCase();
    if (raw === 'en') return v.en;
    if (raw === 'jp' || raw === 'ja') return v.ja ?? v.ko;
    if (raw === 'cn' || raw === 'zh') return v.zh ?? v.ko;
    return v.ko;
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import OutlinePanel from '../OutlinePanel';
import type { ChatSession, EpisodeSceneSheet, AppLanguage } from '@/lib/studio-types';
import { Genre, PlatformType } from '@/lib/studio-types';

// ============================================================
// PART 2 — Fixtures
// ============================================================

function makeSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: 's1',
    title: 'Test Episode',
    messages: [
      { id: 'm1', role: 'user', content: 'hello', timestamp: 1 },
      { id: 'm2', role: 'assistant', content: 'Scene opens with tension.\n\nSecond paragraph here.', timestamp: 2 },
      { id: 'm3', role: 'assistant', content: 'Final beat reveals the twist.', timestamp: 3 },
    ],
    config: {
      genre: Genre.THRILLER,
      povCharacter: 'X',
      setting: '',
      primaryEmotion: '',
      episode: 1,
      title: 'Test Episode',
      totalEpisodes: 10,
      guardrails: { min: 5000, max: 7000 },
      characters: [],
      platform: 'kakao' as PlatformType,
    },
    lastUpdate: 0,
    ...overrides,
  };
}

function makeSheet(sceneCount: number): EpisodeSceneSheet {
  return {
    episode: 1,
    title: 'Episode One',
    arc: 'Prologue',
    characters: 'Alice, Bob',
    scenes: Array.from({ length: sceneCount }, (_, i) => ({
      sceneId: `1-${i + 1}`,
      sceneName: `Scene ${i + 1} Name`,
      characters: i === 0 ? 'Alice' : 'Bob',
      tone: i % 2 === 0 ? '긴장' : '감동',
      summary: `Summary for scene ${i + 1}. Some plot development occurs.`,
      keyDialogue: `"line ${i + 1}"`,
      emotionPoint: 'midpoint',
      nextScene: '',
    })),
    lastUpdate: Date.now(),
  };
}

const noop = () => {};

// ============================================================
// PART 3 — Test suite
// ============================================================

describe('OutlinePanel', () => {
  it('1. renders empty-state message when no scene sheet', () => {
    const session = makeSession({ messages: [] });
    const { container } = render(
      <OutlinePanel
        currentSession={session}
        currentSceneSheet={null}
        language={'KO' as AppLanguage}
        onSceneClick={noop}
        onMessageClick={noop}
      />,
    );
    expect(container.textContent).toMatch(/씬이 없습니다/);
  });

  it('2. renders all N scenes when sheet has scenes', () => {
    const session = makeSession();
    const sheet = makeSheet(5);
    const { container } = render(
      <OutlinePanel
        currentSession={session}
        currentSceneSheet={sheet}
        language={'KO' as AppLanguage}
        onSceneClick={noop}
        onMessageClick={noop}
      />,
    );
    for (let i = 1; i <= 5; i++) {
      expect(container.textContent).toContain(`Scene ${i} Name`);
    }
    // Scene count badge
    expect(container.textContent).toMatch(/\(5\)/);
  });

  it('3. click on scene row invokes onSceneClick with index', () => {
    const session = makeSession();
    const sheet = makeSheet(3);
    const onScene = jest.fn();
    const { container } = render(
      <OutlinePanel
        currentSession={session}
        currentSceneSheet={sheet}
        language={'EN' as AppLanguage}
        onSceneClick={onScene}
        onMessageClick={noop}
      />,
    );
    const rows = container.querySelectorAll('li[role="treeitem"]');
    expect(rows.length).toBeGreaterThan(0);
    // Click second scene (index 1) — target its main clickable row
    const firstSceneRow = rows[0].querySelector('[title]') as HTMLElement | null;
    expect(firstSceneRow).not.toBeNull();
    if (firstSceneRow) fireEvent.click(firstSceneRow);
    expect(onScene).toHaveBeenCalledWith(0);
  });

  it('4. filter toggle switches between scenes-only / messages-only', () => {
    const session = makeSession();
    const sheet = makeSheet(2);
    const { container, getByRole } = render(
      <OutlinePanel
        currentSession={session}
        currentSceneSheet={sheet}
        language={'EN' as AppLanguage}
        onSceneClick={noop}
        onMessageClick={noop}
      />,
    );
    // Initially both visible — click "Messages" tab
    const msgTab = getByRole('tab', { name: /Messages/i });
    fireEvent.click(msgTab);
    // Now should show NOA Messages header (persona unification v2.1.3)
    expect(container.textContent).toMatch(/NOA Messages/i);
    // Click "Scenes" — scenes-only
    const sceneTab = getByRole('tab', { name: /^Scenes$/i });
    fireEvent.click(sceneTab);
    expect(container.textContent).toContain('Scene 1 Name');
  });

  it('5. inline search filters the tree by title match', async () => {
    jest.useFakeTimers();
    const session = makeSession();
    const sheet = makeSheet(4);
    const { container } = render(
      <OutlinePanel
        currentSession={session}
        currentSceneSheet={sheet}
        language={'EN' as AppLanguage}
        onSceneClick={noop}
        onMessageClick={noop}
      />,
    );
    const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(searchInput).not.toBeNull();
    fireEvent.change(searchInput, { target: { value: 'Scene 3' } });
    // Advance past debounce
    act(() => { jest.advanceTimersByTime(350); });
    // Only scene 3 should remain
    expect(container.textContent).toContain('Scene 3 Name');
    expect(container.textContent).not.toContain('Scene 1 Name');
    jest.useRealTimers();
  });

  it('6. mobile bottom-sheet: root has fixed/bottom-0 + drag handle visible on <md', () => {
    const session = makeSession();
    const sheet = makeSheet(1);
    const { container } = render(
      <OutlinePanel
        currentSession={session}
        currentSceneSheet={sheet}
        language={'KO' as AppLanguage}
        onSceneClick={noop}
        onMessageClick={noop}
      />,
    );
    const root = container.querySelector('[data-testid="outline-panel-root"]') as HTMLElement;
    expect(root).toBeTruthy();
    // Responsive classes (mobile-first fixed bottom + md:static override)
    const cls = root.className;
    expect(cls).toMatch(/\bfixed\b/);
    expect(cls).toMatch(/\bbottom-0\b/);
    expect(cls).toMatch(/\bmd:static\b/);
    expect(cls).toMatch(/\bmax-h-\[60vh\]/);
    // Drag handle rendered (hidden on md+ via md:hidden)
    const handle = root.querySelector('.md\\:hidden.rounded-full');
    expect(handle).toBeTruthy();
  });

  it('7. renders 4 language labels (KO/EN/JP/CN)', () => {
    const session = makeSession();
    const sheet = makeSheet(1);
    const cases: Array<{ lang: AppLanguage; expect: RegExp }> = [
      { lang: 'KO', expect: /아웃라인/ },
      { lang: 'EN', expect: /Outline/ },
      { lang: 'JP', expect: /アウトライン/ },
      { lang: 'CN', expect: /大纲/ },
    ];
    for (const c of cases) {
      const { container, unmount } = render(
        <OutlinePanel
          currentSession={session}
          currentSceneSheet={sheet}
          language={c.lang}
          onSceneClick={noop}
          onMessageClick={noop}
        />,
      );
      expect(container.textContent).toMatch(c.expect);
      unmount();
    }
  });
});
