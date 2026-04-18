/**
 * /welcome 온보딩 4장 — 렌더링 + 네비게이션 + 역할 선택 로직
 * 4장째는 역할 카드(4종)로 구성되어 선택 시 해당 진입 화면으로 라우팅.
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

// UserRoleContext mock — 역할 저장 훅을 관찰.
const mockSetRole = jest.fn();
jest.mock('@/contexts/UserRoleContext', () => ({
  useUserRoleSafe: () => ({
    role: 'explorer',
    setRole: mockSetRole,
    tier: 'tier1',
    setTier: jest.fn(),
    developerMode: false,
    setDeveloperMode: jest.fn(),
    advancedWritingMode: false,
    setAdvancedWritingMode: jest.fn(),
  }),
}));

import WelcomePage from '../page';

describe('/welcome onboarding (4장 + 역할 선택)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSetRole.mockClear();
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
    fireEvent.click(getByText('다음'));
    expect(container.textContent).toContain('훈련시킵니다');
  });

  it('3장까지 진행 시 Slide 3 + 다음 버튼 존재', () => {
    const { container, getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음')); // → 2
    fireEvent.click(getByText('다음')); // → 3
    expect(container.textContent).toContain('같이 하세요');
    expect(getByText('다음')).toBeInTheDocument();
  });

  it('4장 도달 시 역할 선택 카드 4종 노출 + 다음 버튼 사라짐', () => {
    const { container, getByText, queryByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음')); // → 2
    fireEvent.click(getByText('다음')); // → 3
    fireEvent.click(getByText('다음')); // → 4 (role slide)
    expect(container.textContent).toContain('어떻게 사용하시나요');
    expect(getByText('소설가')).toBeInTheDocument();
    expect(getByText('번역가')).toBeInTheDocument();
    expect(getByText('출판사')).toBeInTheDocument();
    expect(getByText('둘러보기')).toBeInTheDocument();
    // Next 버튼은 더 이상 없음
    expect(queryByText('다음')).toBeNull();
  });

  it('소설가 역할 선택 → setRole(writer) + /studio 이동 + 온보딩 저장', () => {
    const { getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('소설가'));
    expect(localStorage.getItem('eh-onboarded')).toBe('1');
    expect(mockSetRole).toHaveBeenCalledWith('writer');
    expect(mockPush).toHaveBeenCalledWith('/studio');
  });

  it('번역가 역할 선택 → /translation-studio 이동', () => {
    const { getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('번역가'));
    expect(mockSetRole).toHaveBeenCalledWith('translator');
    expect(mockPush).toHaveBeenCalledWith('/translation-studio');
  });

  it('건너뛰기 버튼 → explorer role + localStorage 저장 + / 이동', () => {
    const { getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('건너뛰기'));
    expect(localStorage.getItem('eh-onboarded')).toBe('1');
    expect(mockSetRole).toHaveBeenCalledWith('explorer');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('Slide 인디케이터 4개 렌더링 + 클릭으로 특정 Slide 이동 가능', () => {
    const { container } = render(<WelcomePage />);
    const indicators = container.querySelectorAll('[aria-label^="Slide"]');
    expect(indicators).toHaveLength(4);
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
