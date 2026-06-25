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
    expect(container.textContent).toContain('수집 목적');
    expect(container.textContent).toContain('제3자');
  });

  it('Firebase, GitHub, Sentry 제3자 명시', () => {
    const PrivacyPage = require('../privacy/page').default;
    const { container } = render(<PrivacyPage />);
    expect(container.textContent).toContain('Firebase');
    expect(container.textContent).toContain('GitHub');
    expect(container.textContent).toContain('Sentry');
  });

  it('문의(Contact) 섹션 존재', () => {
    const PrivacyPage = require('../privacy/page').default;
    const { container } = render(<PrivacyPage />);
    // [2026-06-25] 공개 연락 이메일 미확정(공백) — mailto 링크 대신 문의 섹션 존재만 검증.
    expect(container.textContent).toMatch(/문의|Contact/);
  });

  it('문서 상태 안내 표시', () => {
    const PrivacyPage = require('../privacy/page').default;
    const { container } = render(<PrivacyPage />);
    expect(container.textContent).toContain('문서 상태');
  });

  it('AI 학습 미사용 명시', () => {
    const PrivacyPage = require('../privacy/page').default;
    const { container } = render(<PrivacyPage />);
    expect(container.textContent).toContain('AI 학습');
    expect(container.textContent).toContain('재학습');
  });
});

describe('Terms Page', () => {
  it('렌더링 — 이용약관 핵심 섹션', () => {
    const TermsPage = require('../terms/page').default;
    const { container } = render(<TermsPage />);
    expect(container.textContent).toContain('이용약관');
    expect(container.textContent).toContain('서비스 개요');
    expect(container.textContent).toContain('사용 기준');
    expect(container.textContent).toContain('저작권');
  });

  it('CC-BY-NC-4.0 세계관 라이선스 명시', () => {
    const TermsPage = require('../terms/page').default;
    const { container } = render(<TermsPage />);
    expect(container.textContent).toContain('CC-BY-NC-4.0');
  });

  it('비공개 상용 소프트웨어 라이선스 명시', () => {
    const TermsPage = require('../terms/page').default;
    const { container } = render(<TermsPage />);
    expect(container.textContent).toContain('비공개 상용 제품');
  });

  it('대한민국 법률 준거 명시', () => {
    const TermsPage = require('../terms/page').default;
    const { container } = render(<TermsPage />);
    expect(container.textContent).toContain('대한민국');
  });

  it('문서 상태 안내 표시', () => {
    const TermsPage = require('../terms/page').default;
    const { container } = render(<TermsPage />);
    expect(container.textContent).toContain('문서 상태');
  });
});

describe('Copyright Page', () => {
  it('저작권 귀속·AI 학습·플랫폼 업로드 섹션 존재', () => {
    const CopyrightPage = require('../copyright/page').default;
    const { container } = render(<CopyrightPage />);
    expect(container.textContent).toContain('저작권 귀속');
    expect(container.textContent).toContain('AI 학습에 사용하지 않음');
    expect(container.textContent).toContain('외부 플랫폼');
  });

  it('문서 상태 안내 표시', () => {
    const CopyrightPage = require('../copyright/page').default;
    const { container } = render(<CopyrightPage />);
    expect(container.textContent).toContain('문서 상태');
  });
});

describe('AI Disclosure Page', () => {
  it('Qwen/Gemini/Claude/OpenAI 모델 명시', () => {
    const AiDisclosurePage = require('../ai-disclosure/page').default;
    const { container } = render(<AiDisclosurePage />);
    expect(container.textContent).toContain('Qwen');
    expect(container.textContent).toContain('Gemini');
    expect(container.textContent).toContain('Claude');
    expect(container.textContent).toContain('OpenAI');
  });

  it('DGX 재학습 미사용 명시', () => {
    const AiDisclosurePage = require('../ai-disclosure/page').default;
    const { container } = render(<AiDisclosurePage />);
    expect(container.textContent).toContain('DGX');
    expect(container.textContent).toContain('재학습');
  });

  it('사용 전 확인할 점 섹션 존재', () => {
    const AiDisclosurePage = require('../ai-disclosure/page').default;
    const { container } = render(<AiDisclosurePage />);
    expect(container.textContent).toContain('사용 전 확인할 점');
    expect(container.textContent).toContain('편향');
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
