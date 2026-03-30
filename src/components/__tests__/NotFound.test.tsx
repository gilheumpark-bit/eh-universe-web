/**
 * NotFound page — renders 404 state
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotFound from '../../app/not-found';

// Mock Header
jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="mock-header">Header</header>,
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// Mock LangContext
jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'en', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

describe('NotFound', () => {
  it('renders the 404 text', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders the signal lost message in English', () => {
    render(<NotFound />);
    expect(screen.getByText('SIGNAL LOST')).toBeInTheDocument();
  });

  it('renders navigation links back to home and studio', () => {
    render(<NotFound />);
    expect(screen.getByText('RETURN TO BASE')).toBeInTheDocument();
    expect(screen.getByText('STUDIO')).toBeInTheDocument();
  });
});
