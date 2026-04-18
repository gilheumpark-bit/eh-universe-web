/**
 * GlobalSearchPalette — command-palette search + actions.
 * Covers 3 existing search types (character/episode/world), new body-text
 * search with snippet, action category with shortcut badges, tab filter,
 * keyboard navigation, and focus-on-mount.
 */
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ChatSession, StoryConfig } from '@/lib/studio-types';

// ============================================================
// PART 1 — Mocks (run before component import)
// ============================================================

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
  createT: () => (k: string, fb?: string) => fb ?? k,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import GlobalSearchPalette, { type StudioAction } from '../GlobalSearchPalette';

// ============================================================
// PART 2 — Fixtures
// ============================================================

function makeConfig(over: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: 'fantasy' as StoryConfig['genre'],
    povCharacter: '',
    setting: '마탑이 우뚝 솟은 대륙',
    primaryEmotion: '',
    episode: 1,
    title: '시작의 에피소드',
    totalEpisodes: 10,
    guardrails: {} as StoryConfig['guardrails'],
    characters: [
      { name: '아리엘', role: '주인공', traits: '검사, 냉정' } as StoryConfig['characters'][0],
      { name: '루카스', role: '조연', traits: '마법사' } as StoryConfig['characters'][0],
    ],
    platform: 'kakaopage' as StoryConfig['platform'],
    corePremise: '마나의 고갈',
    synopsis: '세계가 멸망하기 직전',
    ...over,
  } as StoryConfig;
}

function makeSession(over: Partial<ChatSession> = {}): ChatSession {
  return {
    id: 's1',
    title: '프롤로그',
    messages: [],
    config: makeConfig(),
    lastUpdate: 0,
    ...over,
  } as ChatSession;
}

function makeActions(): StudioAction[] {
  return [
    { id: 'new-session', label: '새 에피소드', description: '빈 에피소드 세션 생성', shortcut: 'Ctrl+Shift+N', handler: jest.fn() },
    { id: 'export-txt', label: 'TXT 내보내기', description: 'TXT로 저장', shortcut: 'Ctrl+E', handler: jest.fn() },
    { id: 'save-now', label: '지금 저장', description: '즉시 수동 저장', shortcut: 'Ctrl+S', handler: jest.fn() },
  ];
}

/** Helper to flush the 300ms debounce inside the palette. */
function flushDebounce() {
  act(() => {
    jest.advanceTimersByTime(350);
  });
}

// ============================================================
// PART 3 — Test suite
// ============================================================

describe('GlobalSearchPalette', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders and auto-focuses the input', () => {
    render(
      <GlobalSearchPalette
        query=""
        setQuery={() => {}}
        sessions={[]}
        config={null}
        language="KO"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    const input = screen.getByRole('dialog').querySelector('input');
    expect(input).toBeTruthy();
    expect(document.activeElement).toBe(input);
  });

  it('matches characters by name', () => {
    const onSelect = jest.fn();
    const { rerender } = render(
      <GlobalSearchPalette
        query=""
        setQuery={() => {}}
        sessions={[]}
        config={makeConfig()}
        language="KO"
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    rerender(
      <GlobalSearchPalette
        query="아리엘"
        setQuery={() => {}}
        sessions={[]}
        config={makeConfig()}
        language="KO"
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    flushDebounce();
    const opts = screen.getAllByRole('option');
    const charHit = opts.find(o => o.getAttribute('data-result-type') === 'character');
    expect(charHit).toBeTruthy();
    expect(charHit!.textContent).toContain('아리엘');
  });

  it('matches episodes by title', () => {
    const sessions = [
      makeSession({ id: 's1', title: '프롤로그', config: makeConfig({ title: '프롤로그', episode: 1 }) }),
      makeSession({ id: 's2', title: '전투의 시작', config: makeConfig({ title: '전투의 시작', episode: 2 }) }),
    ];
    const onSelect = jest.fn();
    render(
      <GlobalSearchPalette
        query="전투"
        setQuery={() => {}}
        sessions={sessions}
        config={sessions[0].config}
        language="KO"
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    flushDebounce();
    const epHit = screen.getAllByRole('option').find(o => o.getAttribute('data-result-type') === 'episode');
    expect(epHit).toBeTruthy();
    expect(epHit!.textContent).toContain('전투의 시작');

    fireEvent.click(epHit!);
    expect(onSelect).toHaveBeenCalledWith('episode', 's2', 's2');
  });

  it('matches world fields (synopsis)', () => {
    render(
      <GlobalSearchPalette
        query="멸망"
        setQuery={() => {}}
        sessions={[]}
        config={makeConfig()}
        language="KO"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    flushDebounce();
    const worldHit = screen.getAllByRole('option').find(o => o.getAttribute('data-result-type') === 'world');
    expect(worldHit).toBeTruthy();
  });

  it('builds a body-text snippet with match highlight', () => {
    const longBody =
      '아주 긴 본문이다. 이 문장의 중간 어딘가에 특별한마법키워드가 나타나고 계속 이어진다. 끝부분에도 뭔가 있다.';
    const sessions = [
      makeSession({
        id: 's1',
        messages: [
          { id: 'm1', role: 'assistant', content: longBody, timestamp: 0 },
        ] as ChatSession['messages'],
      }),
    ];
    render(
      <GlobalSearchPalette
        query="특별한마법키워드"
        setQuery={() => {}}
        sessions={sessions}
        config={sessions[0].config}
        language="KO"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    flushDebounce();
    const textHit = screen.getAllByRole('option').find(o => o.getAttribute('data-result-type') === 'text');
    expect(textHit).toBeTruthy();
    const snippet = textHit!.querySelector('[data-testid="text-snippet"]');
    expect(snippet).toBeTruthy();
    // <mark> element wraps the match
    const mark = snippet!.querySelector('mark');
    expect(mark).toBeTruthy();
    expect(mark!.textContent).toBe('특별한마법키워드');
  });

  it('renders action entries with a shortcut badge', () => {
    const actions = makeActions();
    render(
      <GlobalSearchPalette
        query=""
        setQuery={() => {}}
        sessions={[]}
        config={null}
        language="KO"
        actions={actions}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    flushDebounce();
    const actionHits = screen.getAllByRole('option').filter(o => o.getAttribute('data-result-type') === 'action');
    expect(actionHits.length).toBe(3);
    expect(actionHits[0].textContent).toContain('새 에피소드');
    const shortcut = actionHits[0].querySelector('[data-testid="action-shortcut"]');
    expect(shortcut).toBeTruthy();
    expect(shortcut!.textContent).toBe('Ctrl+Shift+N');
  });

  it('filters results by selected tab', () => {
    const sessions = [
      makeSession({ id: 's1', title: '아리엘 전투', config: makeConfig({ title: '아리엘 전투', episode: 1 }) }),
    ];
    const actions = makeActions();
    render(
      <GlobalSearchPalette
        query="아리엘"
        setQuery={() => {}}
        sessions={sessions}
        config={sessions[0].config}
        language="KO"
        actions={actions}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    flushDebounce();

    // Before filter: both character and episode hits expected
    const beforeTypes = screen.getAllByRole('option').map(o => o.getAttribute('data-result-type'));
    expect(beforeTypes).toEqual(expect.arrayContaining(['character', 'episode']));

    // Click the "Character" tab
    const charTab = screen.getByRole('tab', { name: '캐릭터' });
    fireEvent.click(charTab);

    const afterTypes = screen.getAllByRole('option').map(o => o.getAttribute('data-result-type'));
    expect(afterTypes.every(t => t === 'character')).toBe(true);
    expect(charTab.getAttribute('aria-selected')).toBe('true');
  });

  it('supports ArrowDown/ArrowUp/Enter keyboard navigation', () => {
    const sessions = [
      makeSession({ id: 's1', title: '아리엘 프롤로그', config: makeConfig({ title: '아리엘 프롤로그', episode: 1 }) }),
      makeSession({ id: 's2', title: '아리엘 전투', config: makeConfig({ title: '아리엘 전투', episode: 2 }) }),
    ];
    const onSelect = jest.fn();
    render(
      <GlobalSearchPalette
        query="아리엘"
        setQuery={() => {}}
        sessions={sessions}
        config={sessions[0].config}
        language="KO"
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    flushDebounce();

    const dialog = screen.getByRole('dialog');
    // Move down twice — advance the highlighted option index
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    // Move up once
    fireEvent.keyDown(dialog, { key: 'ArrowUp' });

    // Press Enter to execute the currently highlighted option
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('Tab key cycles filter tabs', () => {
    render(
      <GlobalSearchPalette
        query=""
        setQuery={() => {}}
        sessions={[]}
        config={null}
        language="KO"
        actions={makeActions()}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    flushDebounce();
    const dialog = screen.getByRole('dialog');
    // 'all' tab is initially selected
    const allTab = screen.getByRole('tab', { name: '전체' });
    expect(allTab.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(dialog, { key: 'Tab' });
    // After one Tab, 'character' tab should be selected
    const charTab = screen.getByRole('tab', { name: '캐릭터' });
    expect(charTab.getAttribute('aria-selected')).toBe('true');
  });

  it('onExecuteAction fires when clicking an action row', () => {
    const actions = makeActions();
    const onExec = jest.fn();
    render(
      <GlobalSearchPalette
        query=""
        setQuery={() => {}}
        sessions={[]}
        config={null}
        language="KO"
        actions={actions}
        onSelect={() => {}}
        onExecuteAction={onExec}
        onClose={() => {}}
      />,
    );
    flushDebounce();
    const firstAction = screen.getAllByRole('option').find(o => o.getAttribute('data-result-type') === 'action');
    fireEvent.click(firstAction!);
    expect(onExec).toHaveBeenCalledWith('new-session');
  });
});
