/**
 * CharacterTab — 서브탭 토글 + 생성 버튼 가드 렌더 테스트
 */
import '@testing-library/jest-dom';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import CharacterTab from '../CharacterTab';
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

jest.mock('@/lib/ai-providers', () => ({
  activeSupportsStructured: () => false,
}));

jest.mock('@/services/geminiService', () => ({
  generateCharacters: jest.fn(async () => []),
}));

jest.mock('@/components/studio/ResourceView', () => ({
  __esModule: true,
  default: () => <div data-testid="resource-view-mock" />,
}));

jest.mock('@/components/studio/ItemStudioView', () => ({
  __esModule: true,
  default: () => <div data-testid="item-studio-mock" />,
}));

jest.mock('@/components/studio/TabAssistant', () => ({
  __esModule: true,
  default: () => <div data-testid="tab-assistant-mock" />,
}));

// ── fixtures ─────────────────────────────────────────────────
const makeConfig = (): StoryConfig => ({
  genre: Genre.FANTASY,
  povCharacter: '',
  setting: '',
  primaryEmotion: '',
  episode: 1,
  title: 'Test',
  totalEpisodes: 1,
  synopsis: '',
  guardrails: { min: 0, max: 100 },
  characters: [],
  platform: PlatformType.WEB,
});

const noop = () => {};

describe('CharacterTab', () => {
  it('renders without crashing (characters sub-tab)', () => {
    const setUxError = jest.fn();
    const { getByTestId } = render(
      <CharacterTab
        language="KO"
        config={makeConfig()}
        setConfig={noop as React.Dispatch<React.SetStateAction<StoryConfig>>}
        charSubTab="characters"
        setCharSubTab={noop}
        triggerSave={noop}
        saveFlash={false}
        setUxError={setUxError}
      />,
    );
    expect(getByTestId('resource-view-mock')).toBeInTheDocument();
  });

  it('clicking items sub-tab button calls setCharSubTab', () => {
    const setCharSubTab = jest.fn();
    const { getAllByRole } = render(
      <CharacterTab
        language="KO"
        config={makeConfig()}
        setConfig={noop as React.Dispatch<React.SetStateAction<StoryConfig>>}
        charSubTab="characters"
        setCharSubTab={setCharSubTab}
        triggerSave={noop}
        saveFlash={false}
        setUxError={noop}
      />,
    );
    // [items] 버튼이 두 번째 서브탭
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
    fireEvent.click(buttons[1]);
    expect(setCharSubTab).toHaveBeenCalledWith('items');
  });

  it('auto-generate guard — unsupported engine emits uxError', () => {
    const setUxError = jest.fn();
    const { container } = render(
      <CharacterTab
        language="KO"
        config={makeConfig()}
        setConfig={noop as React.Dispatch<React.SetStateAction<StoryConfig>>}
        charSubTab="characters"
        setCharSubTab={noop}
        triggerSave={noop}
        saveFlash={false}
        setUxError={setUxError}
      />,
    );
    // "초안 생성" 버튼 탐색 (현재 언어 KO → '초안 생성')
    const genBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('초안 생성'),
    );
    expect(genBtn).toBeTruthy();
    fireEvent.click(genBtn!);
    expect(setUxError).toHaveBeenCalledTimes(1);
    const payload = setUxError.mock.calls[0][0];
    expect(payload.error).toBeInstanceOf(Error);
  });
});
