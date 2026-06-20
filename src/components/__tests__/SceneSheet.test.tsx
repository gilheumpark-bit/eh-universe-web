/**
 * SceneSheet — renders without crash (smoke test)
 * useStudioUI 훅 사용 → StudioUIProvider 래핑 필요
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import SceneSheet from '../studio/SceneSheet';
import { StudioUIProvider } from '@/contexts/StudioContext';

const mockUIValue = {
  activeTab: 'writing' as const,
  handleTabChange: jest.fn(),
  showConfirm: jest.fn(),
  closeConfirm: jest.fn(),
  setUxError: jest.fn(),
  triggerSave: jest.fn(),
  saveFlash: false,
};

function withProvider(children: React.ReactElement) {
  return <StudioUIProvider value={mockUIValue}>{children}</StudioUIProvider>;
}

jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, t: { ko: string }) => t.ko,
}));

jest.mock('@/lib/show-alert', () => ({
  showAlert: jest.fn(),
}));

jest.mock('@/lib/grammar-packs', () => ({
  GRAMMAR_PACKS: {
    KR: { flag: '\uD83C\uDDF0\uD83C\uDDF7', label: 'Korean', beats: [], rewards: [], rhythms: [], techniques: [], benchmarks: { pacing: {}, hooks: {} } },
    US: { flag: '\uD83C\uDDFA\uD83C\uDDF8', label: 'English', beats: [], rewards: [], rhythms: [], techniques: [], benchmarks: { pacing: {}, hooks: {} } },
    JP: { flag: '\uD83C\uDDEF\uD83C\uDDF5', label: 'Japanese', beats: [], rewards: [], rhythms: [], techniques: [], benchmarks: { pacing: {}, hooks: {} } },
    CN: { flag: '\uD83C\uDDE8\uD83C\uDDF3', label: 'Chinese', beats: [], rewards: [], rhythms: [], techniques: [], benchmarks: { pacing: {}, hooks: {} } },
  },
  GRAMMAR_REGIONS: ['KR', 'US', 'JP', 'CN'],
}));

describe('SceneSheet', () => {
  it('renders without crashing with minimal props', () => {
    const { container } = render(
      withProvider(<SceneSheet lang="ko" synopsis="" characterNames={[]} />),
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders tab navigation UI', () => {
    const { container } = render(
      withProvider(<SceneSheet lang="ko" synopsis="" characterNames={[]} />),
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
