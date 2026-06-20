/**
 * MergeConflictResolver.test — Core UI behaviors for the 3-way merge resolver.
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
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import MergeConflictResolver from '../MergeConflictResolver';

// ============================================================
// PART 2 — Fixtures
// ============================================================

const SIMPLE_CONFLICT = [
  'line-A',
  '<<<<<<< HEAD',
  'ours-text',
  '=======',
  'theirs-text',
  '>>>>>>> feature',
  'line-B',
].join('\n');

const THREE_WAY_CONFLICT = [
  '<<<<<<< HEAD',
  'ours-text',
  '||||||| ancestors',
  'base-text',
  '=======',
  'theirs-text',
  '>>>>>>> branch',
].join('\n');

const MULTI_CONFLICTS = [
  'A',
  '<<<<<<< HEAD',
  'one-ours',
  '=======',
  'one-theirs',
  '>>>>>>> x',
  'B',
  '<<<<<<< HEAD',
  'two-ours',
  '=======',
  'two-theirs',
  '>>>>>>> y',
  'C',
].join('\n');

function baseProps() {
  return {
    open: true,
    content: SIMPLE_CONFLICT,
    language: 'KO' as const,
    onSave: jest.fn(),
    onClose: jest.fn(),
  };
}

// ============================================================
// PART 3 — Tests
// ============================================================

describe('MergeConflictResolver', () => {
  it('renders nothing when open=false', () => {
    const props = baseProps();
    const { container } = render(<MergeConflictResolver {...props} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 2-way conflict: Ours + Theirs panels only', () => {
    const props = baseProps();
    render(<MergeConflictResolver {...props} />);
    expect(screen.getByTestId('mcr-ours-content')).toHaveTextContent('ours-text');
    expect(screen.getByTestId('mcr-theirs-content')).toHaveTextContent('theirs-text');
    expect(screen.queryByTestId('mcr-ancestor-content')).toBeNull();
  });

  it('renders 3-way conflict: Ancestor panel included', () => {
    const props = { ...baseProps(), content: THREE_WAY_CONFLICT };
    render(<MergeConflictResolver {...props} />);
    expect(screen.getByTestId('mcr-ancestor-content')).toHaveTextContent('base-text');
  });

  it('renders "no conflicts" empty state for clean content', () => {
    const props = { ...baseProps(), content: 'clean text only' };
    render(<MergeConflictResolver {...props} />);
    expect(screen.getByTestId('mcr-no-conflicts')).toBeInTheDocument();
  });

  it('Save button disabled while any conflict remains', () => {
    const props = baseProps();
    render(<MergeConflictResolver {...props} />);
    const saveBtn = screen.getByTestId('mcr-save-btn') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('Accept Ours resolves and emits the correct string on save', () => {
    const props = baseProps();
    render(<MergeConflictResolver {...props} />);
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-accept-ours'));
    });
    const saveBtn = screen.getByTestId('mcr-save-btn') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    act(() => {
      fireEvent.click(saveBtn);
    });
    expect(props.onSave).toHaveBeenCalledTimes(1);
    const payload = props.onSave.mock.calls[0][0] as string;
    expect(payload).toContain('ours-text');
    expect(payload).not.toContain('theirs-text');
    expect(payload).not.toContain('<<<<<<<');
  });

  it('Accept Theirs keeps the incoming side', () => {
    const props = baseProps();
    render(<MergeConflictResolver {...props} />);
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-accept-theirs'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-save-btn'));
    });
    const payload = props.onSave.mock.calls[0][0] as string;
    expect(payload).toContain('theirs-text');
    expect(payload).not.toContain('ours-text');
  });

  it('Accept Both concatenates ours then theirs', () => {
    const props = baseProps();
    render(<MergeConflictResolver {...props} />);
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-accept-both'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-save-btn'));
    });
    const payload = props.onSave.mock.calls[0][0] as string;
    expect(payload).toContain('ours-text');
    expect(payload).toContain('theirs-text');
    // "ours" must appear before "theirs"
    expect(payload.indexOf('ours-text')).toBeLessThan(payload.indexOf('theirs-text'));
  });

  it('Drop removes the conflict region entirely', () => {
    const props = baseProps();
    render(<MergeConflictResolver {...props} />);
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-drop-btn'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-save-btn'));
    });
    const payload = props.onSave.mock.calls[0][0] as string;
    expect(payload).not.toContain('ours-text');
    expect(payload).not.toContain('theirs-text');
    expect(payload).toContain('line-A');
    expect(payload).toContain('line-B');
  });

  it('shows status counter reflecting total conflicts', () => {
    const props = { ...baseProps(), content: MULTI_CONFLICTS };
    render(<MergeConflictResolver {...props} />);
    expect(screen.getByTestId('mcr-status')).toHaveTextContent('0 / 2');
  });

  it('status increments when a conflict is resolved', () => {
    const props = { ...baseProps(), content: MULTI_CONFLICTS };
    render(<MergeConflictResolver {...props} />);
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-accept-ours'));
    });
    expect(screen.getByTestId('mcr-status')).toHaveTextContent('1 / 2');
  });

  it('next button cycles to the second conflict', () => {
    const props = { ...baseProps(), content: MULTI_CONFLICTS };
    render(<MergeConflictResolver {...props} />);
    // First conflict is "one-ours / one-theirs"
    expect(screen.getByTestId('mcr-ours-content')).toHaveTextContent('one-ours');
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-next-btn'));
    });
    expect(screen.getByTestId('mcr-ours-content')).toHaveTextContent('two-ours');
  });

  it('close button fires onClose', () => {
    const props = baseProps();
    render(<MergeConflictResolver {...props} />);
    fireEvent.click(screen.getByTestId('mcr-close-btn'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('shows "all resolved" success panel after the last resolution', () => {
    const props = baseProps();
    render(<MergeConflictResolver {...props} />);
    act(() => {
      fireEvent.click(screen.getByTestId('mcr-accept-ours'));
    });
    expect(screen.getByTestId('mcr-all-resolved')).toBeInTheDocument();
  });
});
