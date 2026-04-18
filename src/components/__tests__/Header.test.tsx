/**
 * Header — renders with navigation links
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../Header';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock LangContext
jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'en', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

// Mock i18n
jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, t: { en: string }) => t.en,
  createT: () => (key: string, fallback?: string) => fallback ?? key,
}));

// Mock firebase
jest.mock('@/lib/firebase', () => ({
  isTestEnvironment: false,
  auth: null,
  db: null,
}));

// Mock UserRoleContext — developer role 가정(CODE 탭 노출 검증).
// 별도 역할 숨김 테스트는 UserRoleContext 자체 테스트에서 커버.
jest.mock('@/contexts/UserRoleContext', () => ({
  useCanAccessCodeStudio: () => true,
  useUserRoleSafe: () => ({
    role: 'developer',
    setRole: jest.fn(),
    tier: 'tier1',
    setTier: jest.fn(),
    developerMode: true,
    setDeveloperMode: jest.fn(),
    advancedWritingMode: false,
    setAdvancedWritingMode: jest.fn(),
  }),
}));

describe('Header', () => {
  it('renders the header element with testid', () => {
    render(<Header />);
    expect(screen.getByTestId('home-header')).toBeInTheDocument();
  });

  it('renders 로어가드 brand text', () => {
    render(<Header />);
    expect(screen.getByText('로어가드')).toBeInTheDocument();
  });

  it('renders main navigation links (desktop + mobile)', () => {
    render(<Header />);
    // getAllByText because links appear in both desktop and mobile nav
    expect(screen.getAllByText('HOME').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('NETWORK').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('STUDIO').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CODE').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the language toggle button', () => {
    render(<Header />);
    // In English mode, button shows "EN" (desktop + mobile = 2)
    const langButtons = screen.getAllByText('EN');
    expect(langButtons.length).toBeGreaterThan(0);
  });
});
