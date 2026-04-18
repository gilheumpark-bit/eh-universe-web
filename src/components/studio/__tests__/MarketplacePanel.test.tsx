/**
 * MarketplacePanel.test — catalog UI behaviors for the Novel Studio plugin marketplace.
 */
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (run before component import)
// ============================================================

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(),
  },
}));

import MarketplacePanel from '../MarketplacePanel';
import { pluginRegistry } from '@/lib/novel-plugin-registry';

// ============================================================
// PART 2 — Shared reset
// ============================================================

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* noop */ }
  // Disable any plugins that leaked from prior tests. Registry is a singleton.
  for (const id of pluginRegistry.getEnabledIds()) {
    pluginRegistry.disable(id);
  }
});

// ============================================================
// PART 3 — Tests
// ============================================================

describe('MarketplacePanel', () => {
  it('renders all three bundled plugin cards', () => {
    render(<MarketplacePanel language="KO" />);
    expect(screen.getByTestId('plugin-card-word-count-badge')).toBeInTheDocument();
    expect(screen.getByTestId('plugin-card-reading-time-estimator')).toBeInTheDocument();
    expect(screen.getByTestId('plugin-card-emotion-color-hint')).toBeInTheDocument();
  });

  it('filters the catalog by search query', () => {
    render(<MarketplacePanel language="KO" />);
    const search = screen.getByTestId('marketplace-search') as HTMLInputElement;
    fireEvent.change(search, { target: { value: '글자수' } });
    expect(screen.getByTestId('plugin-card-word-count-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('plugin-card-reading-time-estimator')).toBeNull();
    expect(screen.queryByTestId('plugin-card-emotion-color-hint')).toBeNull();
  });

  it('filters the catalog by category', () => {
    render(<MarketplacePanel language="KO" />);
    const select = screen.getByTestId('marketplace-category') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'visualization' } });
    // emotion-color-hint is category=visualization; others are analysis.
    expect(screen.getByTestId('plugin-card-emotion-color-hint')).toBeInTheDocument();
    expect(screen.queryByTestId('plugin-card-word-count-badge')).toBeNull();
    expect(screen.queryByTestId('plugin-card-reading-time-estimator')).toBeNull();
  });

  it('clicking Enable flips the button state and surfaces the Enabled badge', async () => {
    render(<MarketplacePanel language="KO" />);
    const toggle = screen.getByTestId('plugin-toggle-word-count-badge');
    expect(toggle.textContent).toMatch(/활성화/);
    await act(async () => {
      fireEvent.click(toggle);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(pluginRegistry.isEnabled('word-count-badge')).toBe(true);
    expect(screen.getByTestId('plugin-enabled-badge-word-count-badge')).toBeInTheDocument();
    expect(screen.getByTestId('plugin-toggle-word-count-badge').textContent).toMatch(/비활성화/);
  });

  it('opens the detail dialog and shows permissions', () => {
    render(<MarketplacePanel language="KO" />);
    fireEvent.click(screen.getByTestId('plugin-detail-word-count-badge'));
    expect(screen.getByTestId('marketplace-detail')).toBeInTheDocument();
    expect(screen.getByTestId('marketplace-permission-read-manuscript')).toBeInTheDocument();
  });

  it('renders localized labels (KO fallback via mocked L4)', () => {
    render(<MarketplacePanel language="KO" />);
    // Title and coming-soon copy both come from L4(ko) via the mock.
    expect(screen.getByText(/플러그인 마켓/)).toBeInTheDocument();
    expect(screen.getByTestId('marketplace-coming-soon').textContent).toMatch(/외부 플러그인/);
  });

  it('onClose callback fires when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<MarketplacePanel language="KO" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('marketplace-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mobile responsive: grid starts at 1 column, detail dialog fills screen on <sm', () => {
    render(<MarketplacePanel language="KO" />);
    // Grid — mobile 1col, sm 2col, lg 3col
    const grid = screen.getByTestId('marketplace-grid');
    expect(grid.className).toMatch(/\bgrid-cols-1\b/);
    expect(grid.className).toMatch(/\bsm:grid-cols-2\b/);
    // Detail dialog — open and assert fullscreen on mobile
    fireEvent.click(screen.getByTestId('plugin-detail-word-count-badge'));
    const dialog = screen.getByTestId('marketplace-detail');
    expect(dialog.className).toMatch(/\bitems-stretch\b/);
    expect(dialog.className).toMatch(/\bsm:items-center\b/);
    // Inner container spans full-height on mobile, bounded on ≥sm
    const inner = dialog.querySelector(':scope > div') as HTMLElement;
    expect(inner).toBeTruthy();
    expect(inner.className).toMatch(/\bh-full\b/);
    expect(inner.className).toMatch(/\bsm:h-auto\b/);
  });
});
