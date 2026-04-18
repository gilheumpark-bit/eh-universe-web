/**
 * WorkProfilerView — render smoke + interaction tests.
 * All rendering uses pure SVG/HTML (no chart libraries).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — mocks
// ============================================================

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import WorkProfilerView from '../WorkProfilerView';
import type { ChatSession, Character, StoryConfig } from '@/lib/studio-types';
import { Genre, PlatformType } from '@/lib/studio-types';

// ============================================================
// PART 2 — fixture factories
// ============================================================

function mkConfig(ep: number, chars: Character[] = []): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: ep,
    title: `EP ${ep}`,
    totalEpisodes: 50,
    guardrails: { min: 3000, max: 6000 },
    characters: chars,
    platform: PlatformType.WEB,
  };
}

function mkSession(id: string, ep: number, opts: { tension?: number; eos?: number; content?: string; characters?: Character[] } = {}): ChatSession {
  return {
    id,
    title: `EP ${ep}`,
    messages: [
      {
        id: `${id}-m`,
        role: 'assistant',
        content: opts.content ?? 'A long paragraph with "hello world" inside.',
        timestamp: 0,
        meta:
          opts.tension != null || opts.eos != null
            ? {
                metrics: opts.tension != null ? { tension: opts.tension, pacing: 0.5, immersion: 0.5 } : undefined,
                eosScore: opts.eos,
              }
            : undefined,
      },
    ],
    config: mkConfig(ep, opts.characters),
    lastUpdate: ep * 1000,
  };
}

function buildMany(n: number): ChatSession[] {
  return Array.from({ length: n }, (_, i) => mkSession(`s${i}`, i + 1, { tension: 0.5, eos: 0.8 }));
}

// ============================================================
// PART 3 — tests
// ============================================================

describe('WorkProfilerView', () => {
  test('renders empty state when sessions is []', () => {
    const { container, getByText } = render(
      <WorkProfilerView sessions={[]} language="KO" />,
    );
    expect(container.firstChild).toBeTruthy();
    expect(getByText(/아직 에피소드가 없습니다/)).toBeInTheDocument();
  });

  test('renders summary numbers for 42 sessions', () => {
    const { container } = render(
      <WorkProfilerView sessions={buildMany(42)} language="KO" />,
    );
    // Summary line contains episode count "42"
    expect(container.textContent).toMatch(/42/);
    // Title rendered
    expect(container.textContent).toMatch(/작품 프로파일러/);
  });

  test('renders tension SVG polyline', () => {
    const { container } = render(
      <WorkProfilerView sessions={buildMany(10)} language="KO" />,
    );
    const polylines = container.querySelectorAll('polyline');
    expect(polylines.length).toBeGreaterThanOrEqual(2); // tension + quality
    // First polyline has points attr
    expect(polylines[0].getAttribute('points')).toBeTruthy();
  });

  test('character heatmap renders row per character that appears', () => {
    const hero: Character = { id: 'c1', name: '주인공', role: '', traits: '', appearance: '', dna: 0 };
    const ally: Character = { id: 'c2', name: '조력자', role: '', traits: '', appearance: '', dna: 0 };
    const sessions = [
      mkSession('s1', 1, { content: '주인공이 나타났다. 조력자도 함께였다.', characters: [hero, ally] }),
      mkSession('s2', 2, { content: '주인공은 홀로 떠났다.', characters: [hero, ally] }),
    ];
    const { container } = render(
      <WorkProfilerView sessions={sessions} characters={[hero, ally]} language="KO" />,
    );
    expect(container.textContent).toMatch(/주인공/);
    expect(container.textContent).toMatch(/조력자/);
  });

  test('range filter changes displayed summary', () => {
    const { container, getAllByText } = render(
      <WorkProfilerView sessions={buildMany(40)} language="KO" />,
    );
    // Initially "all" → 40 eps
    expect(container.textContent).toMatch(/40/);
    // "최근 10" now appears in both the mobile <option> and the desktop <button>.
    // Pick the BUTTON (desktop filter group) — clicking an <option> outside a native
    // open <select> does not fire change in jsdom.
    const matches = getAllByText('최근 10');
    const btn = matches.find((el) => el.tagName === 'BUTTON');
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    // After last10 filter → summary now shows 10
    expect(container.textContent).toMatch(/\b10\b/);
  });

  test('mobile responsive: range select renders + SVG uses viewBox + heatmap scroll wrapper', () => {
    const hero: Character = { id: 'c1', name: '주인공', role: '', traits: '', appearance: '', dna: 0 };
    const sessions = [
      mkSession('s1', 1, { content: '주인공이 나타났다.', characters: [hero], tension: 0.5 }),
      mkSession('s2', 2, { content: '주인공은 다시 떠났다.', characters: [hero], tension: 0.6 }),
    ];
    const { container } = render(
      <WorkProfilerView sessions={sessions} characters={[hero]} language="KO" />,
    );
    // Mobile range dropdown mounted (sm:hidden means visible on <sm)
    const rangeSelect = container.querySelector('[data-testid="profiler-range-select"]') as HTMLSelectElement;
    expect(rangeSelect).toBeTruthy();
    expect(rangeSelect.className).toMatch(/\bsm:hidden\b/);
    // SVG remains responsive (viewBox + auto height)
    const svg = container.querySelector('svg[role="img"]') as SVGElement | null;
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBeTruthy();
    expect(svg?.getAttribute('class') ?? svg?.className.baseVal ?? '').toMatch(/w-full/);
    // Heatmap scroll wrapper exists when characters appear
    const heatmapScroll = container.querySelector('[data-testid="profiler-heatmap-scroll"]');
    expect(heatmapScroll).toBeTruthy();
    expect((heatmapScroll as HTMLElement).className).toMatch(/\boverflow-x-auto\b/);
  });

  test('invokes onEpisodeClick when a scene bar is clicked', () => {
    const onClick = jest.fn();
    const sessions = [
      {
        ...mkSession('s1', 1, { tension: 0.5 }),
        config: {
          ...mkConfig(1),
          episodeSceneSheets: [
            {
              episode: 1,
              title: 'EP 1',
              scenes: [
                { sceneId: '1-1', sceneName: 's1', characters: '', tone: '', summary: '', keyDialogue: '', emotionPoint: '', nextScene: '' },
              ],
              lastUpdate: 0,
            },
          ],
        },
      },
    ];
    const { container } = render(
      <WorkProfilerView sessions={sessions} language="KO" onEpisodeClick={onClick} />,
    );
    const bar = container.querySelector('button[aria-label^="EP 1"]');
    expect(bar).toBeTruthy();
    if (bar) fireEvent.click(bar);
    expect(onClick).toHaveBeenCalledWith('s1');
  });
});
