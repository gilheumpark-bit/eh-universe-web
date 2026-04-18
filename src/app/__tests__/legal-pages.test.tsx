/**
 * Privacy + Terms + About — 법적 페이지 smoke 렌더링
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko' }),
}));

jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, v: { ko: string; en: string }) => v.ko,
}));

jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header-mock" />,
}));

describe('Privacy Page', () => {
  it('렌더링 — 핵심 섹션 표시', () => {
    const PrivacyPage = require('../privacy/page').default;
    const { container } = render(<PrivacyPage />);
    expect(container.textContent).toContain('개인정보처리방침');
    expect(container.textContent).toContain('수집 항목');
    expect(container.textContent).toContain('이용 목적');
    expect(container.textContent).toContain('제3자');
  });

  it('Firebase, GitHub, Sentry 제3자 명시', () => {
    const PrivacyPage = require('../privacy/page').default;
    const { container } = render(<PrivacyPage />);
    expect(container.textContent).toContain('Firebase');
    expect(container.textContent).toContain('GitHub');
    expect(container.textContent).toContain('Sentry');
  });

  it('이메일 연락처 링크 존재', () => {
    const PrivacyPage = require('../privacy/page').default;
    const { container } = render(<PrivacyPage />);
    const email = container.querySelector('a[href="mailto:gilheumpark@gmail.com"]');
    expect(email).not.toBeNull();
  });
});

describe('Terms Page', () => {
  it('렌더링 — 이용약관 핵심 섹션', () => {
    const TermsPage = require('../terms/page').default;
    const { container } = render(<TermsPage />);
    expect(container.textContent).toContain('이용약관');
    expect(container.textContent).toContain('서비스 소개');
    expect(container.textContent).toContain('이용자 의무');
    expect(container.textContent).toContain('저작권');
  });

  it('CC-BY-NC-4.0 라이선스 명시', () => {
    const TermsPage = require('../terms/page').default;
    const { container } = render(<TermsPage />);
    expect(container.textContent).toContain('CC-BY-NC-4.0');
  });

  it('대한민국 법률 준거 명시', () => {
    const TermsPage = require('../terms/page').default;
    const { container } = render(<TermsPage />);
    expect(container.textContent).toContain('대한민국');
  });
});

describe('Global Error Page', () => {
  it('크래시 fallback UI 렌더링', () => {
    const GlobalError = require('../global-error').default;
    const { container } = render(
      <GlobalError error={new Error('test')} reset={jest.fn()} />,
    );
    expect(container.textContent).toContain('치명적 오류');
    expect(container.textContent).toContain('Fatal Error');
  });

  it('reset 버튼 존재', () => {
    const GlobalError = require('../global-error').default;
    const mockReset = jest.fn();
    const { getByText } = render(
      <GlobalError error={new Error('test')} reset={mockReset} />,
    );
    expect(getByText(/다시 시도/)).toBeInTheDocument();
  });
});
