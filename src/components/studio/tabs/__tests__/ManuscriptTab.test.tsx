/**
 * ManuscriptTab — toolbar + dashboard toggle smoke tests
 */
import '@testing-library/jest-dom';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import ManuscriptTab from '../ManuscriptTab';
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

jest.mock('@/engine/scene-parser', () => ({
  parseManuscript: () => ({ scenes: [] }),
  generateVoiceMappings: () => ({}),
  exportScenesAsHTML: () => '',
}));

jest.mock('@/components/studio/ManuscriptView', () => ({
  __esModule: true,
  default: () => <div data-testid="manuscript-view-mock" />,
}));

jest.mock('@/components/studio/AuthorDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="author-dashboard-mock" />,
}));

jest.mock('@/components/studio/EmotionArcChart', () => ({
  __esModule: true,
  default: () => <div data-testid="emotion-arc-mock" />,
}));

jest.mock('@/components/studio/FatigueDetector', () => ({
  __esModule: true,
  default: () => <div data-testid="fatigue-mock" />,
}));

jest.mock('@/components/studio/ShareToNetwork', () => ({
  __esModule: true,
  default: () => <div data-testid="share-mock" />,
}));

jest.mock('@/components/studio/TranslationPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="translation-panel-mock" />,
}));

// next/dynamic returns a component that renders nothing in jest (no ssr)
jest.mock('next/dynamic', () => () => {
  const Dyn = () => <div data-testid="dynamic-mock" />;
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
  manuscripts: [],
});

const noop = () => {};

describe('ManuscriptTab', () => {
  it('renders toolbar + default ManuscriptView', () => {
    const { getByTestId } = render(
      <ManuscriptTab
        language="KO"
        config={makeConfig()}
        setConfig={noop}
        messages={[]}
        onEditInStudio={noop as (c: string) => void}
      />,
    );
    expect(getByTestId('manuscript-view-mock')).toBeInTheDocument();
  });

  it('toggles author dashboard panel on click', () => {
    const { container, queryByTestId, getByTestId } = render(
      <ManuscriptTab
        language="KO"
        config={makeConfig()}
        setConfig={noop}
        messages={[]}
        onEditInStudio={noop as (c: string) => void}
      />,
    );
    expect(queryByTestId('author-dashboard-mock')).toBeNull();
    const btn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('작가 대시보드'),
    );
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(getByTestId('author-dashboard-mock')).toBeInTheDocument();
  });

  it('add episode button extends manuscripts array', () => {
    const setConfig = jest.fn();
    const { container } = render(
      <ManuscriptTab
        language="KO"
        config={makeConfig()}
        setConfig={setConfig}
        messages={[]}
        onEditInStudio={noop as (c: string) => void}
      />,
    );
    const btn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('에피소드 추가'),
    );
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(setConfig).toHaveBeenCalledTimes(1);
    // setConfig called with updater fn — invoke it with a fresh base to inspect
    const updater = setConfig.mock.calls[0][0] as (p: StoryConfig) => StoryConfig;
    const next = updater(makeConfig());
    expect(next.manuscripts?.length).toBe(1);
    expect(next.manuscripts?.[0].episode).toBe(1);
  });
});
