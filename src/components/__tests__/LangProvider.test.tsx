/**
 * LangProvider — provides language context to children
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LangProvider, useLang } from '@/lib/LangContext';

// Consumer component to verify context works
function LangConsumer() {
  const { lang } = useLang();
  return <div data-testid="lang-value">{lang}</div>;
}

describe('LangProvider', () => {
  it('provides a default language value to children', () => {
    render(
      <LangProvider>
        <LangConsumer />
      </LangProvider>,
    );
    // Default detected from navigator.language in jsdom (en-US → "en") or SSR fallback "ko"
    const value = screen.getByTestId('lang-value').textContent;
    expect(['ko', 'en', 'ja', 'zh']).toContain(value);
  });

  it('renders children without crashing', () => {
    render(
      <LangProvider>
        <div data-testid="child">Hello</div>
      </LangProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
