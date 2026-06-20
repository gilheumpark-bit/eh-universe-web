/**
 * Marketplace-integration.test — cross-surface wiring for Studio extensions.
 *
 * Covers:
 *   1. Settings → PluginsSection CTA opens the Marketplace modal.
 *   2. Command-palette style 'open-marketplace' event opens the modal.
 *   3. Enabling a bundled extension surfaces an "active" badge.
 *   4. Active-count badge updates when extensions toggle.
 *   5. External URL installation controls stay absent from the product UI.
 *   6. WordCountBadge renders only when its extension is enabled.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (run before component imports)
// ============================================================

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// next/dynamic → load component synchronously so assertions see it right away.
jest.mock('next/dynamic', () => (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
  let Loaded: React.ComponentType<Record<string, unknown>> | null = null;
  const DynamicStub: React.FC<Record<string, unknown>> = (props) => {
    const [, force] = React.useState(0);
    React.useEffect(() => {
      let alive = true;
      loader().then((mod) => {
        Loaded = mod.default;
        if (alive) force((n) => n + 1);
      }).catch(() => { /* swallow test-time dynamic failures */ });
      return () => { alive = false; };
    }, []);
    if (!Loaded) return null;
    const Cmp = Loaded;
    return <Cmp {...props} />;
  };
  return DynamicStub;
});

import PluginsSection from '@/components/studio/settings/PluginsSection';
import WordCountBadge from '@/components/studio/WordCountBadge';
import { pluginRegistry, registerBundledPlugins } from '@/lib/novel-plugin-registry';

// ============================================================
// PART 2 — Shared reset (localStorage + registry singleton)
// ============================================================

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* noop */ }
  // Disable any plugins that leaked from prior tests. Registry is a singleton.
  for (const id of pluginRegistry.getEnabledIds()) {
    pluginRegistry.disable(id);
  }
  // Ensure bundled plugins are registered — needed for registry.isEnabled.
  try { registerBundledPlugins(); } catch { /* noop */ }
});

// ============================================================
// PART 3 — Tests
// ============================================================

describe('Marketplace integration', () => {
  it('Settings → Plugins CTA opens the Marketplace modal', async () => {
    render(<PluginsSection language="KO" />);
    const cta = await screen.findByTestId('open-marketplace-btn');
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    await waitFor(() => {
      expect(screen.getByTestId('marketplace-modal')).toBeInTheDocument();
    });
    // The panel itself renders inside the modal.
    expect(screen.getByTestId('marketplace-panel')).toBeInTheDocument();
  });

  it('dispatches noa:open-marketplace event → modal opens', async () => {
    render(<PluginsSection language="KO" />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent('noa:open-marketplace', { detail: { actionId: 'open-marketplace' } }),
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('marketplace-modal')).toBeInTheDocument();
    });
  });

  it('enabling a plugin via the registry surfaces an "active" badge', async () => {
    render(<PluginsSection language="KO" />);
    expect(screen.queryByTestId('plugins-active-badge')).toBeNull();

    await act(async () => {
      await pluginRegistry.enable('word-count-badge', {
        language: 'KO',
        currentSession: null,
        emit: () => { /* noop */ },
        readManuscript: () => '',
      });
      // Trigger the same refresh signal the real modal/button uses.
      window.dispatchEvent(new CustomEvent('noa:plugin-toggled'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('plugins-active-badge')).toBeInTheDocument();
    });
    expect(pluginRegistry.isEnabled('word-count-badge')).toBe(true);
  });

  it('active-count badge reflects the number of enabled plugins', async () => {
    render(<PluginsSection language="KO" />);

    await act(async () => {
      await pluginRegistry.enable('word-count-badge', {
        language: 'KO', currentSession: null, emit: () => { /* noop */ },
        readManuscript: () => '',
      });
      await pluginRegistry.enable('reading-time-estimator', {
        language: 'KO', currentSession: null, emit: () => { /* noop */ },
        readManuscript: () => '',
      });
      window.dispatchEvent(new CustomEvent('noa:plugin-toggled'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('plugins-active-badge').textContent).toMatch(/2/);
    });
  });

  it('does not expose external URL installation controls from the modal panel', async () => {
    const { default: MarketplacePanel } = require('@/components/studio/MarketplacePanel') as typeof import('@/components/studio/MarketplacePanel');
    render(<MarketplacePanel language="KO" />);
    expect(screen.queryByTestId('marketplace-install-url')).toBeNull();
    expect(screen.queryByTestId('marketplace-install-hash')).toBeNull();
    expect(screen.queryByTestId('marketplace-install-confirm')).toBeNull();
  });

  it('WordCountBadge renders only when its plugin is enabled', async () => {
    const { rerender } = render(<WordCountBadge text="hello world" isKO={false} />);
    // Disabled by default — nothing in the DOM.
    expect(screen.queryByTestId('word-count-badge')).toBeNull();

    await act(async () => {
      await pluginRegistry.enable('word-count-badge', {
        language: 'EN', currentSession: null, emit: () => { /* noop */ },
        readManuscript: () => '',
      });
      window.dispatchEvent(new CustomEvent('noa:plugin-toggled'));
    });

    rerender(<WordCountBadge text="hello world" isKO={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('word-count-badge')).toBeInTheDocument();
    });
    // "helloworld" (whitespace stripped) = 10 characters.
    expect(screen.getByTestId('word-count-badge').textContent).toMatch(/10/);
  });
});
