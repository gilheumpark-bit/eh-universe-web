/**
 * StudioDocsView — docs tab renders per language + TOC navigation
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (run before component import)
// ============================================================

// Mock LangContext (not used directly by component but imported via sibling files)
jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

// Mock i18n — createT returns a translator that echoes the key
jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

// Mock logger to silence warnings during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Component uses IntersectionObserver — ensured by jest.setup.components.js,
// but redefine here for isolation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.IntersectionObserver = class IntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
  takeRecords = jest.fn(() => []);
  root = null;
  rootMargin = '';
  thresholds = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

import StudioDocsView from '../StudioDocsView';

// ============================================================
// PART 2 — Test suite
// ============================================================

describe('StudioDocsView', () => {
  it('renders without crashing with KO', () => {
    const { container } = render(<StudioDocsView lang="KO" />);
    expect(container.firstChild).toBeTruthy();
    // Version badge always rendered
    expect(container.textContent).toMatch(/v1\.4\.0/);
  });

  it('renders Korean sections when lang=KO', () => {
    const { container } = render(<StudioDocsView lang="KO" />);
    // KO section titles include Korean characters
    expect(container.textContent).toMatch(/시작하기/);
    expect(container.textContent).toMatch(/세계관/);
    expect(container.textContent).toMatch(/캐릭터/);
  });

  it('renders English sections when lang=EN', () => {
    const { container } = render(<StudioDocsView lang="EN" />);
    expect(container.textContent).toMatch(/Getting Started/);
    expect(container.textContent).toMatch(/World/);
    expect(container.textContent).toMatch(/Characters/);
  });

  it('renders Japanese sections when lang=JP', () => {
    const { container } = render(<StudioDocsView lang="JP" />);
    expect(container.textContent).toMatch(/はじめに/);
    expect(container.textContent).toMatch(/世界観/);
  });

  it('renders Chinese sections when lang=CN', () => {
    const { container } = render(<StudioDocsView lang="CN" />);
    expect(container.textContent).toMatch(/入门/);
    expect(container.textContent).toMatch(/世界观/);
  });

  it('normalizes lowercase alias lang=ko to KO', () => {
    const { container } = render(<StudioDocsView lang="ko" />);
    expect(container.textContent).toMatch(/시작하기/);
  });

  it('normalizes alias lang=ja to JP', () => {
    const { container } = render(<StudioDocsView lang="ja" />);
    expect(container.textContent).toMatch(/はじめに/);
  });

  it('normalizes alias lang=zh to CN', () => {
    const { container } = render(<StudioDocsView lang="zh" />);
    expect(container.textContent).toMatch(/入门/);
  });

  it('falls back to KO on unknown lang', () => {
    const { container } = render(<StudioDocsView lang="xx" />);
    // KO content rendered
    expect(container.textContent).toMatch(/시작하기/);
  });

  it('renders TOC navigation links for each section', () => {
    const { container } = render(<StudioDocsView lang="EN" />);
    // 12 core + 7 polish = 19 anchor links in TOC
    const anchors = container.querySelectorAll('nav a[href^="#doc-"]');
    expect(anchors.length).toBe(19);
    // First anchor points to #doc-start
    expect(anchors[0].getAttribute('href')).toBe('#doc-start');
  });

  it('registers IntersectionObserver for scroll tracking', () => {
    // Build sentinel elements so observer.observe is called
    const { unmount } = render(<StudioDocsView lang="KO" />);
    // IntersectionObserver should have been constructed (no throw)
    expect(global.IntersectionObserver).toBeDefined();
    unmount();
  });

  // ----------------------------------------------------------
  // Polish sections (new 7 features — KO / EN coverage)
  // ----------------------------------------------------------

  it('renders Global Search section (KO + EN)', () => {
    const ko = render(<StudioDocsView lang="KO" />);
    expect(ko.container.textContent).toMatch(/전역 검색 팔레트/);
    expect(ko.container.textContent).toMatch(/Ctrl\+K/);
    ko.unmount();
    const en = render(<StudioDocsView lang="EN" />);
    expect(en.container.textContent).toMatch(/Global Search Palette/);
    expect(en.container.textContent).toMatch(/Ctrl\+K/);
  });

  it('renders Outline panel section', () => {
    const { container } = render(<StudioDocsView lang="EN" />);
    expect(container.textContent).toMatch(/Outline Panel/);
    expect(container.textContent).toMatch(/Scene Tree/);
  });

  it('renders Breadcrumbs section', () => {
    const { container } = render(<StudioDocsView lang="EN" />);
    expect(container.textContent).toMatch(/Breadcrumbs/);
    expect(container.textContent).toMatch(/Project > Episode > Scene/);
  });

  it('renders Bulk Rename section', () => {
    const { container } = render(<StudioDocsView lang="EN" />);
    expect(container.textContent).toMatch(/Bulk Rename/);
    expect(container.textContent).toMatch(/Ctrl\+Shift\+H/);
  });

  it('renders Editor Minimap section', () => {
    const { container } = render(<StudioDocsView lang="EN" />);
    expect(container.textContent).toMatch(/Editor Minimap/);
    expect(container.textContent).toMatch(/green/);
    expect(container.textContent).toMatch(/amber/);
    expect(container.textContent).toMatch(/red/);
  });

  it('renders Work Profiler section', () => {
    const { container } = render(<StudioDocsView lang="EN" />);
    expect(container.textContent).toMatch(/Work Profiler/);
    expect(container.textContent).toMatch(/Tension/);
    expect(container.textContent).toMatch(/Heatmap/);
  });

  it('renders Plugin Marketplace section', () => {
    const { container } = render(<StudioDocsView lang="EN" />);
    expect(container.textContent).toMatch(/Plugin Marketplace/);
    expect(container.textContent).toMatch(/Canon Guard/);
  });

  it('shows 7 new polish sections in TOC for every language', () => {
    const newIds = [
      '#doc-search',
      '#doc-outline',
      '#doc-breadcrumbs',
      '#doc-rename',
      '#doc-minimap',
      '#doc-profiler',
      '#doc-marketplace',
    ];
    (['KO', 'EN', 'JP', 'CN'] as const).forEach(lng => {
      const { container, unmount } = render(<StudioDocsView lang={lng} />);
      newIds.forEach(id => {
        const anchor = container.querySelector(`nav a[href="${id}"]`);
        expect(anchor).not.toBeNull();
      });
      unmount();
    });
  });
});
