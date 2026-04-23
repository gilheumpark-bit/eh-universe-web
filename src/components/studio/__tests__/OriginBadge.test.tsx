/**
 * OriginBadge — M4 출처 뱃지 컴포넌트 테스트
 * Covers: 4 origin × 4언어 표시 / 호버 / 토글 visibility / a11y / fallback
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import OriginBadge, { isOriginBadgeVisible, setOriginBadgeVisible } from '../OriginBadge';

// ============================================================
// PART 1 — Setup
// ============================================================

beforeEach(() => {
  localStorage.clear();
});

// ============================================================
// PART 2 — Visibility toggle (default hidden)
// ============================================================

describe('OriginBadge visibility toggle', () => {
  it('is hidden by default (no localStorage flag)', () => {
    const { container } = render(<OriginBadge origin="USER" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows when toggle is on', () => {
    setOriginBadgeVisible(true);
    const { container } = render(<OriginBadge origin="USER" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('forceVisible bypasses toggle', () => {
    expect(isOriginBadgeVisible()).toBe(false);
    render(<OriginBadge origin="USER" forceVisible />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

// ============================================================
// PART 3 — 4 origin × 4 language rendering
// ============================================================

describe('OriginBadge label localization', () => {
  beforeEach(() => setOriginBadgeVisible(true));

  it('renders KO label for USER', () => {
    render(<OriginBadge origin="USER" language="KO" />);
    expect(screen.getByText('작가')).toBeInTheDocument();
  });

  it('renders EN label for TEMPLATE', () => {
    render(<OriginBadge origin="TEMPLATE" language="EN" />);
    expect(screen.getByText('Preset')).toBeInTheDocument();
  });

  it('renders JP label for ENGINE_SUGGEST', () => {
    render(<OriginBadge origin="ENGINE_SUGGEST" language="JP" />);
    expect(screen.getByText('提案')).toBeInTheDocument();
  });

  it('renders CN label for ENGINE_DRAFT', () => {
    render(<OriginBadge origin="ENGINE_DRAFT" language="CN" />);
    expect(screen.getByText('草稿')).toBeInTheDocument();
  });

  it('falls back to KO for unknown language', () => {
    // @ts-expect-error - intentional bad input
    render(<OriginBadge origin="USER" language="XX" />);
    expect(screen.getByText('작가')).toBeInTheDocument();
  });
});

// ============================================================
// PART 4 — A11y (aria-label, role, focusable)
// ============================================================

describe('OriginBadge a11y', () => {
  beforeEach(() => setOriginBadgeVisible(true));

  it('exposes aria-label with full origin name and tooltip', () => {
    render(<OriginBadge origin="USER" language="KO" />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-label')).toContain('작가 입력');
    expect(el.getAttribute('aria-label')).toContain('우선 존중');
  });

  it('is focusable (tabIndex=0)', () => {
    render(<OriginBadge origin="TEMPLATE" />);
    expect(screen.getByRole('status').getAttribute('tabIndex')).toBe('0');
  });

  it('has title for native tooltip fallback', () => {
    render(<OriginBadge origin="ENGINE_DRAFT" language="EN" />);
    expect(screen.getByRole('status').getAttribute('title')).toContain('unconfirmed');
  });
});

// ============================================================
// PART 5 — Hover & hideUnlessHover mode
// ============================================================

describe('OriginBadge hover behavior', () => {
  beforeEach(() => setOriginBadgeVisible(true));

  it('expands short → full label on hover', () => {
    render(<OriginBadge origin="TEMPLATE" language="KO" />);
    const el = screen.getByRole('status');
    expect(screen.getByText('기본')).toBeInTheDocument();
    fireEvent.mouseEnter(el);
    expect(screen.getByText('기본 템플릿')).toBeInTheDocument();
  });

  it('hideUnlessHover starts as a small dot (role=img)', () => {
    render(<OriginBadge origin="USER" hideUnlessHover />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hideUnlessHover expands to full badge on focus', () => {
    render(<OriginBadge origin="USER" language="KO" hideUnlessHover />);
    const dot = screen.getByRole('img');
    fireEvent.focus(dot);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

// ============================================================
// PART 6 — Toggle persistence + storage event
// ============================================================

describe('OriginBadge toggle persistence', () => {
  it('persists to localStorage', () => {
    setOriginBadgeVisible(true);
    expect(localStorage.getItem('noa_origin_badge_visible')).toBe('1');
    setOriginBadgeVisible(false);
    expect(localStorage.getItem('noa_origin_badge_visible')).toBe('0');
  });

  it('reacts to storage event from another tab', () => {
    const { container } = render(<OriginBadge origin="USER" />);
    expect(container.firstChild).toBeNull();
    act(() => {
      setOriginBadgeVisible(true);
    });
    expect(container.firstChild).not.toBeNull();
  });
});

// ============================================================
// PART 7 — Robustness (bad input)
// ============================================================

describe('OriginBadge bad input', () => {
  beforeEach(() => setOriginBadgeVisible(true));

  it('falls back to USER for invalid origin', () => {
    // @ts-expect-error - Fix later
    render(<OriginBadge origin="BOGUS" language="KO" />);
    expect(screen.getByText('작가')).toBeInTheDocument();
  });
});
