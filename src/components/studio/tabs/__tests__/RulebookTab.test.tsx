/**
 * RulebookTab — dashboard/editor view switch + session guard tests
 */
import '@testing-library/jest-dom';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import RulebookTab from '../RulebookTab';
import { Genre, type StoryConfig } from '@/lib/studio-types';
import { PlatformType } from '@/engine/types';

// ── mocks ────────────────────────────────────────────────────
jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_l: string, t: { ko: string }) => t.ko,
}));

jest.mock('@/lib/studio-translations', () => ({
  TRANSLATIONS: { KO: { ui: {} }, EN: { ui: {} }, JP: { ui: {} }, CN: { ui: {} } },
}));

jest.mock('@/hooks/useProjectManager', () => ({
  INITIAL_CONFIG: {
    genre: 'FANTASY',
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: '',
    totalEpisodes: 1,
    guardrails: { min: 0, max: 100 },
    characters: [],
    platform: 'novel',
  },
}));

jest.mock('@/components/studio/TabAssistant', () => ({
  __esModule: true,
  default: () => <div data-testid="tab-assistant-mock" />,
}));

// next/dynamic — render placeholder for SceneSheet
jest.mock('next/dynamic', () => () => {
  const Dyn = () => <div data-testid="scene-sheet-mock" />;
  return Dyn;
});

// ── fixtures ─────────────────────────────────────────────────
const makeConfig = (): StoryConfig => ({
  genre: Genre.FANTASY,
  povCharacter: '',
  setting: '',
  primaryEmotion: '',
  episode: 1,
  title: 'Test',
  totalEpisodes: 1,
  guardrails: { min: 0, max: 100 },
  characters: [],
  platform: PlatformType.WEB,
});

const noop = () => {};

describe('RulebookTab', () => {
  it('renders dashboard by default with 4 card buttons', () => {
    const { container } = render(
      <RulebookTab
        language="KO"
        config={makeConfig()}
        updateCurrentSession={noop}
        triggerSave={noop}
        saveFlash={false}
        currentSessionId="sess-1"
      />,
    );
    const buttons = container.querySelectorAll('button');
    // 4 cards + "전체 설정 편집기 열기"
    expect(buttons.length).toBeGreaterThanOrEqual(5);
  });

  it('clicking a card switches to editor view (SceneSheet renders)', () => {
    const { container, getByTestId } = render(
      <RulebookTab
        language="KO"
        config={makeConfig()}
        updateCurrentSession={noop}
        triggerSave={noop}
        saveFlash={false}
        currentSessionId="sess-1"
      />,
    );
    // click first card
    const cards = container.querySelectorAll('button');
    fireEvent.click(cards[0]);
    expect(getByTestId('scene-sheet-mock')).toBeInTheDocument();
  });

  it('clicking "Open Full Editor" switches to editor-all view', () => {
    const { container, getByTestId } = render(
      <RulebookTab
        language="KO"
        config={makeConfig()}
        updateCurrentSession={noop}
        triggerSave={noop}
        saveFlash={false}
        currentSessionId="sess-1"
      />,
    );
    const fullEditBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('전체 설정 편집기'),
    );
    expect(fullEditBtn).toBeTruthy();
    fireEvent.click(fullEditBtn!);
    expect(getByTestId('scene-sheet-mock')).toBeInTheDocument();
  });
});
