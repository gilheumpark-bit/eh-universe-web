/**
 * WorkspaceTrustDialog.test — Core UI behaviors for the trust prompt.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (run before component import)
// ============================================================

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import WorkspaceTrustDialog from '../WorkspaceTrustDialog';

// ============================================================
// PART 2 — Fixtures
// ============================================================

function baseProps() {
  return {
    open: true,
    url: 'https://plugins.example.com/word-counter',
    purpose: 'Install plugin Word Counter v1.2',
    permissions: ['read-manuscript', 'show-ui'],
    language: 'KO' as const,
    onDecide: jest.fn(),
    onClose: jest.fn(),
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

// ============================================================
// PART 3 — Tests
// ============================================================

describe('WorkspaceTrustDialog', () => {
  it('renders nothing when open=false', () => {
    const props = baseProps();
    const { container } = render(<WorkspaceTrustDialog {...props} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays normalized origin (not full URL)', () => {
    const props = baseProps();
    render(<WorkspaceTrustDialog {...props} />);
    expect(screen.getByTestId('wtd-origin')).toHaveTextContent('https://plugins.example.com');
    // Should not display the path
    expect(screen.getByTestId('wtd-origin')).not.toHaveTextContent('/word-counter');
  });

  it('displays purpose text', () => {
    const props = baseProps();
    render(<WorkspaceTrustDialog {...props} />);
    expect(screen.getByTestId('wtd-purpose')).toHaveTextContent('Install plugin Word Counter v1.2');
  });

  it('renders each requested permission', () => {
    const props = baseProps();
    render(<WorkspaceTrustDialog {...props} />);
    const permsEl = screen.getByTestId('wtd-permissions');
    expect(permsEl).toHaveTextContent('read-manuscript');
    expect(permsEl).toHaveTextContent('show-ui');
  });

  it('omits permissions section when list empty', () => {
    const props = { ...baseProps(), permissions: [] };
    render(<WorkspaceTrustDialog {...props} />);
    expect(screen.queryByTestId('wtd-permissions')).toBeNull();
  });

  it('Deny fires onDecide("deny")', () => {
    const props = baseProps();
    render(<WorkspaceTrustDialog {...props} />);
    fireEvent.click(screen.getByTestId('wtd-deny-btn'));
    expect(props.onDecide).toHaveBeenCalledWith('deny');
  });

  it('Trust Session fires onDecide("session") and does NOT persist', () => {
    const props = baseProps();
    render(<WorkspaceTrustDialog {...props} />);
    fireEvent.click(screen.getByTestId('wtd-session-btn'));
    expect(props.onDecide).toHaveBeenCalledWith('session');
    // localStorage should still be clean
    expect(window.localStorage.getItem('noa_workspace_trust')).toBeNull();
  });

  it('Trust Always fires onDecide("always") AND persists trust', () => {
    const props = baseProps();
    render(<WorkspaceTrustDialog {...props} />);
    fireEvent.click(screen.getByTestId('wtd-always-btn'));
    expect(props.onDecide).toHaveBeenCalledWith('always');
    const raw = window.localStorage.getItem('noa_workspace_trust');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].url).toBe('https://plugins.example.com');
    expect(parsed[0].level).toBe('trusted');
  });

  it('Close button fires onClose', () => {
    const props = baseProps();
    render(<WorkspaceTrustDialog {...props} />);
    fireEvent.click(screen.getByTestId('wtd-close-btn'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('Session and Always buttons disabled on invalid URL', () => {
    const props = { ...baseProps(), url: 'javascript:alert(1)' };
    render(<WorkspaceTrustDialog {...props} />);
    const sessionBtn = screen.getByTestId('wtd-session-btn') as HTMLButtonElement;
    const alwaysBtn = screen.getByTestId('wtd-always-btn') as HTMLButtonElement;
    expect(sessionBtn.disabled).toBe(true);
    expect(alwaysBtn.disabled).toBe(true);
  });

  it('Shows "already trusted" hint when origin was previously trusted', () => {
    // Pre-seed storage
    window.localStorage.setItem(
      'noa_workspace_trust',
      JSON.stringify([
        {
          url: 'https://plugins.example.com',
          level: 'trusted',
          addedAt: Date.now(),
          addedBy: 'user',
        },
      ]),
    );
    const props = baseProps();
    render(<WorkspaceTrustDialog {...props} />);
    expect(screen.getByTestId('wtd-already-trusted')).toBeInTheDocument();
  });
});
