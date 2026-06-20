/**
 * Accessibility (ARIA) regression tests for legacy Studio components.
 *
 * Covers:
 *   1. ParallelUniversePanel — branch switch button aria-pressed + aria-current
 *   2. ParallelUniversePanel — "+ create branch" button aria-label
 *   3. EpisodeScenePanel — episode accordion aria-expanded toggle
 *
 * These guard WCAG 2.1 AA attributes added in the legacy-audit pass.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (must run before component imports)
// ============================================================

jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

// next/dynamic → identity passthrough (avoid lazy loading overhead in jsdom).
jest.mock('next/dynamic', () => () => {
  const Dummy: React.FC = () => null;
  return Dummy;
});

// Minimal StudioUIProvider stub: supply no-op confirm/save helpers.
jest.mock('@/contexts/StudioContext', () => ({
  useStudioUI: () => ({
    activeTab: 'manuscript',
    handleTabChange: jest.fn(),
    showConfirm: jest.fn(),
    closeConfirm: jest.fn(),
    setUxError: jest.fn(),
    triggerSave: jest.fn(),
    saveFlash: false,
  }),
}));

import ParallelUniversePanel from '../ParallelUniversePanel';
import EpisodeScenePanel from '../EpisodeScenePanel';
import type { EpisodeSceneSheet } from '@/lib/studio-types';

// ============================================================
// PART 2 — ParallelUniversePanel
// ============================================================

describe('ParallelUniversePanel aria', () => {
  const baseProps = {
    branches: ['main', 'universe/alt'],
    currentBranch: 'main',
    episodes: [
      { episode: 1, title: 'EP 1' },
      { episode: 2, title: 'EP 2' },
    ],
    onSwitchBranch: jest.fn(),
    onCreateBranch: jest.fn(),
    language: 'KO' as const,
  };

  it('branch switch buttons expose aria-pressed for active branch', () => {
    render(<ParallelUniversePanel {...baseProps} />);
    const mainBtn = screen.getByRole('button', { name: /main 브랜치로 전환/ });
    const altBtn = screen.getByRole('button', { name: /universe\/alt 브랜치로 전환/ });
    expect(mainBtn).toHaveAttribute('aria-pressed', 'true');
    expect(altBtn).toHaveAttribute('aria-pressed', 'false');
    expect(mainBtn).toHaveAttribute('aria-current', 'true');
  });

  it('create branch buttons have localized aria-labels per episode', () => {
    render(<ParallelUniversePanel {...baseProps} />);
    expect(
      screen.getByRole('button', { name: /1화에서 분기 생성/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /2화에서 분기 생성/ }),
    ).toBeInTheDocument();
  });
});

// ============================================================
// PART 3 — EpisodeScenePanel
// ============================================================

describe('EpisodeScenePanel aria', () => {
  const sheets: EpisodeSceneSheet[] = [
    {
      episode: 5,
      title: 'Test Episode',
      arc: 'Chapter 1',
      characters: 'Hero',
      scenes: [],
      lastUpdate: Date.now(),
    },
  ];

  it('episode accordion button toggles aria-expanded on click', () => {
    render(
      <EpisodeScenePanel
        lang="KO"
        currentEpisode={5}
        episodeSceneSheets={sheets}
        onSave={jest.fn()}
        onDelete={jest.fn()}
        onUpdate={jest.fn()}
      />,
    );
    const headerBtn = screen.getByRole('button', { name: /Episode 5/ });
    expect(headerBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(headerBtn);
    expect(headerBtn).toHaveAttribute('aria-expanded', 'true');
  });
});
