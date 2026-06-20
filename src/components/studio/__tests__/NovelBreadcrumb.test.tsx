/**
 * NovelBreadcrumb — Project > Episode > Scene breadcrumb rendering
 * Covers: 3-level render, single-level fallback, click handlers,
 * mobile collapse, truncation, and 4-language labels.
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (hoisted before component import)
// ============================================================

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

// i18n mock — L4 resolves by the lang string passed in (matches real implementation)
jest.mock('@/lib/i18n', () => ({
  createT: () => (k: string, f?: string) => f ?? k,
  L4: (lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => {
    const raw = typeof lang === 'string' ? lang.toLowerCase() : 'ko';
    if (raw === 'en') return v.en;
    if (raw === 'ja' || raw === 'jp') return v.ja || v.ko;
    if (raw === 'zh' || raw === 'cn') return v.zh || v.ko;
    return v.ko;
  },
}));

import { NovelBreadcrumb } from '../NovelBreadcrumb';
import type { Project, ChatSession } from '@/lib/studio-types';
import { Genre, PlatformType } from '@/lib/studio-types';

// ============================================================
// PART 2 — Fixtures (Project + Session factories)
// ============================================================

function makeSession(overrides?: Partial<ChatSession>): ChatSession {
  return {
    id: 's1',
    title: overrides?.title ?? '1화 떠나는 자들',
    messages: [],
    lastUpdate: Date.now(),
    config: {
      genre: Genre.FANTASY,
      povCharacter: '',
      setting: '',
      primaryEmotion: '',
      episode: 1,
      title: '',
      totalEpisodes: 0,
      guardrails: { min: 0, max: 100 },
      characters: [],
      platform: PlatformType.WEB,
      ...(overrides?.config ?? {}),
    },
    ...overrides,
  } as ChatSession;
}

function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: 'p1',
    name: '드래곤 로드',
    description: '',
    genre: Genre.FANTASY,
    createdAt: Date.now(),
    lastUpdate: Date.now(),
    sessions: [],
    ...overrides,
  };
}

// Force wide viewport by default
function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

beforeEach(() => {
  setViewport(1200);
});

// ============================================================
// PART 3 — Test suite
// ============================================================

describe('NovelBreadcrumb', () => {
  it('renders 3 segments when Project + Episode + Scene all present', () => {
    const onNavigate = jest.fn();
    const { container, getByText } = render(
      <NovelBreadcrumb
        project={makeProject()}
        currentSession={makeSession()}
        currentSceneIndex={2}
        language="KO"
        onNavigate={onNavigate}
      />,
    );
    // Project name
    expect(getByText('드래곤 로드')).toBeInTheDocument();
    // Episode label contains EP.1 prefix + title
    expect(container.textContent).toMatch(/EP\.1/);
    expect(container.textContent).toMatch(/떠나는 자들/);
    // Scene label
    expect(getByText(/씬 2/)).toBeInTheDocument();
    // Separators = 2 ChevronRight svgs (between 3 segments)
    const chevrons = container.querySelectorAll('svg.lucide-chevron-right');
    expect(chevrons.length).toBe(2);
  });

  it('renders Project-only when Episode/Scene missing', () => {
    const onNavigate = jest.fn();
    const { container, getByText } = render(
      <NovelBreadcrumb
        project={makeProject({ name: '고독한 여정' })}
        currentSession={null}
        language="KO"
        onNavigate={onNavigate}
      />,
    );
    expect(getByText('고독한 여정')).toBeInTheDocument();
    // No chevrons when single segment
    const chevrons = container.querySelectorAll('svg.lucide-chevron-right');
    expect(chevrons.length).toBe(0);
  });

  it('invokes onNavigate with correct target for each clickable segment', () => {
    const onNavigate = jest.fn();
    const { getByText, container } = render(
      <NovelBreadcrumb
        project={makeProject()}
        currentSession={makeSession()}
        currentSceneIndex={3}
        language="KO"
        onNavigate={onNavigate}
      />,
    );

    // Project click
    fireEvent.click(getByText('드래곤 로드'));
    expect(onNavigate).toHaveBeenLastCalledWith('project');

    // Episode click — find the button whose text contains EP.1
    const epBtn = Array.from(
      container.querySelectorAll('button'),
    ).find((b) => /EP\.1/.test(b.textContent ?? ''));
    expect(epBtn).toBeTruthy();
    fireEvent.click(epBtn!);
    expect(onNavigate).toHaveBeenLastCalledWith('episode');

    // Scene is the last segment → rendered as <span aria-current>, NOT clickable
    const sceneSpan = container.querySelector('[aria-current="page"]');
    expect(sceneSpan?.textContent).toMatch(/씬 3/);
    expect(onNavigate).toHaveBeenCalledTimes(2);
  });

  it('collapses middle segment on narrow viewport (<640px)', () => {
    setViewport(500);
    const onNavigate = jest.fn();
    const { container } = render(
      <NovelBreadcrumb
        project={makeProject()}
        currentSession={makeSession()}
        currentSceneIndex={2}
        language="KO"
        onNavigate={onNavigate}
      />,
    );
    // Ellipsis character rendered
    expect(container.textContent).toMatch(/\u2026/);
    // Episode title (the middle one) NOT visible
    expect(container.textContent).not.toMatch(/떠나는 자들/);
    // First + last still rendered
    expect(container.textContent).toMatch(/드래곤 로드/);
    expect(container.textContent).toMatch(/씬 2/);
  });

  it('applies truncate class and title attribute for long names', () => {
    const longName = 'A'.repeat(200);
    const onNavigate = jest.fn();
    const { container } = render(
      <NovelBreadcrumb
        project={makeProject({ name: longName })}
        currentSession={makeSession()}
        language="KO"
        onNavigate={onNavigate}
      />,
    );
    // Project segment is now clickable (not last) → rendered as <button>
    const projectBtn = container.querySelector('button');
    expect(projectBtn).toBeTruthy();
    // title attribute carries full name for tooltip
    expect(projectBtn?.getAttribute('title')).toContain(longName);
    // A child span has truncate class
    const truncateSpan = projectBtn?.querySelector('.truncate');
    expect(truncateSpan).toBeTruthy();
  });

  it('renders ARIA navigation landmark with aria-current on last segment', () => {
    const onNavigate = jest.fn();
    const { container } = render(
      <NovelBreadcrumb
        project={makeProject()}
        currentSession={makeSession()}
        currentSceneIndex={1}
        language="KO"
        onNavigate={onNavigate}
      />,
    );
    // nav element with role
    const nav = container.querySelector('nav[role="navigation"]');
    expect(nav).toBeTruthy();
    expect(nav?.getAttribute('aria-label')).toBeTruthy();
    // aria-current on last segment
    const current = container.querySelector('[aria-current="page"]');
    expect(current).toBeTruthy();
    expect(current?.textContent).toMatch(/씬 1/);
  });

  it('returns null when hidden=true (Zen mode)', () => {
    const onNavigate = jest.fn();
    const { container } = render(
      <NovelBreadcrumb
        project={makeProject()}
        currentSession={makeSession()}
        currentSceneIndex={1}
        language="KO"
        onNavigate={onNavigate}
        hidden
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('updates collapse mode when window resizes', () => {
    const onNavigate = jest.fn();
    const { container } = render(
      <NovelBreadcrumb
        project={makeProject()}
        currentSession={makeSession()}
        currentSceneIndex={2}
        language="KO"
        onNavigate={onNavigate}
      />,
    );
    // Wide: no ellipsis
    expect(container.textContent).not.toMatch(/\u2026/);
    // Resize narrow
    act(() => setViewport(500));
    expect(container.textContent).toMatch(/\u2026/);
  });

  // ============================================================
  // 4-language label verification (mock resolves by language prop)
  // ============================================================
  it('renders English "Scene" label when language=EN', () => {
    const onNavigate = jest.fn();
    const { container } = render(
      <NovelBreadcrumb
        project={makeProject({ name: 'Dragon Lord' })}
        currentSession={makeSession({ title: 'The Departure' })}
        currentSceneIndex={1}
        language="EN"
        onNavigate={onNavigate}
      />,
    );
    expect(container.textContent).toMatch(/Dragon Lord/);
    expect(container.textContent).toMatch(/EP\.1/);
    expect(container.textContent).toMatch(/Scene 1/);
  });

  it('renders Japanese "シーン" label when language=JP', () => {
    const onNavigate = jest.fn();
    const { container } = render(
      <NovelBreadcrumb
        project={makeProject()}
        currentSession={makeSession()}
        currentSceneIndex={1}
        language="JP"
        onNavigate={onNavigate}
      />,
    );
    expect(container.textContent).toMatch(/シーン 1/);
  });

  it('renders Chinese "场景" label when language=CN', () => {
    const onNavigate = jest.fn();
    const { container } = render(
      <NovelBreadcrumb
        project={makeProject()}
        currentSession={makeSession()}
        currentSceneIndex={2}
        language="CN"
        onNavigate={onNavigate}
      />,
    );
    expect(container.textContent).toMatch(/场景 2/);
  });
});
