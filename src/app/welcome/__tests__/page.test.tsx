/**
 * /welcome 온보딩 3장 — 렌더링 + 네비게이션 로직
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// next/navigation mock
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// LangContext mock — KO default
jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko' }),
}));

jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, v: { ko: string; en: string }) => v.ko,
}));

import WelcomePage from '../page';

describe('/welcome onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it('첫 방문 시 Slide 1 렌더링', () => {
    const { container } = render(<WelcomePage />);
    expect(container.textContent).toContain('AI가 쓰나요');
  });

  it('이미 온보딩 완료한 사용자는 /studio로 리다이렉트', () => {
    localStorage.setItem('eh-onboarded', '1');
    render(<WelcomePage />);
    expect(mockReplace).toHaveBeenCalledWith('/studio');
  });

  it('다음 버튼 클릭 시 Slide 2로 이동', () => {
    const { container, getByText } = render(<WelcomePage />);
    const nextBtn = getByText('다음');
    fireEvent.click(nextBtn);
    expect(container.textContent).toContain('훈련시킵니다');
  });

  it('3장까지 진행 후 시작하기 버튼', () => {
    const { container, getByText } = render(<WelcomePage />);
    // Slide 1 → 2
    fireEvent.click(getByText('다음'));
    // Slide 2 → 3
    fireEvent.click(getByText('다음'));
    expect(container.textContent).toContain('같이 하세요');
    // 시작하기 버튼 존재
    expect(getByText('시작하기')).toBeInTheDocument();
  });

  it('시작하기 클릭 → localStorage 저장 + /studio 이동', () => {
    const { getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('시작하기'));
    expect(localStorage.getItem('eh-onboarded')).toBe('1');
    expect(mockPush).toHaveBeenCalledWith('/studio');
  });

  it('건너뛰기 버튼 → localStorage 저장 + /studio 이동', () => {
    const { getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('건너뛰기'));
    expect(localStorage.getItem('eh-onboarded')).toBe('1');
    expect(mockPush).toHaveBeenCalledWith('/studio');
  });

  it('Slide 인디케이터 클릭으로 특정 Slide 이동 가능', () => {
    const { container } = render(<WelcomePage />);
    const indicators = container.querySelectorAll('[aria-label^="Slide"]');
    expect(indicators).toHaveLength(3);
    // 3번째 인디케이터 클릭
    fireEvent.click(indicators[2]);
    expect(container.textContent).toContain('같이 하세요');
  });

  it('Footer legal 링크 3종 존재', () => {
    const { container } = render(<WelcomePage />);
    const privacyLink = container.querySelector('a[href="/privacy"]');
    const termsLink = container.querySelector('a[href="/terms"]');
    const aboutLink = container.querySelector('a[href="/about"]');
    expect(privacyLink).not.toBeNull();
    expect(termsLink).not.toBeNull();
    expect(aboutLink).not.toBeNull();
  });
});
