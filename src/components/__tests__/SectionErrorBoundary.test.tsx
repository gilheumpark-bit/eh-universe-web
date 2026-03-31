/**
 * SectionErrorBoundary — catches section-level errors
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SectionErrorBoundary } from '../studio/SectionErrorBoundary';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, t: { ko: string }) => t.ko,
  createT: () => (key: string, fallback?: string) => fallback ?? key,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function BrokenChild(): React.JSX.Element {
  throw new Error('Section boom');
}

describe('SectionErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => { console.error = jest.fn(); });
  afterAll(() => { console.error = originalError; });

  it('renders children when no error', () => {
    render(
      <SectionErrorBoundary sectionName="Test">
        <div>OK</div>
      </SectionErrorBoundary>,
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows section error fallback when child throws', () => {
    render(
      <SectionErrorBoundary sectionName="MySection">
        <BrokenChild />
      </SectionErrorBoundary>,
    );
    expect(screen.getByText('MySection Error')).toBeInTheDocument();
  });

  it('calls onError callback when error is caught', () => {
    const onError = jest.fn();
    render(
      <SectionErrorBoundary sectionName="CB" onError={onError}>
        <BrokenChild />
      </SectionErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
