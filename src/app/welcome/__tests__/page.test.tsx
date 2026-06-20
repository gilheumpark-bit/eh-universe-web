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

describe('/welcome onboarding (5장 + 역할 선택)', () => {
  // [Track-D Phase 1.1 Round 1-5 2026-05-07] 슬라이드 4 -> 5
  // 4번째 슬라이드 신규: 작업 정리 노트 (창작 과정 확인서) 안내
  // 5번째 슬라이드 (이전 4번째): 역할 선택 카드
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSetRole.mockClear();
  });

  it('첫 방문 시 Slide 1 렌더링', () => {
    const { container } = render(<WelcomePage />);
    expect(container.textContent).toContain('노아가 대신 쓰나요');
  });

  it('이미 온보딩 완료한 사용자는 /studio로 리다이렉트', () => {
    localStorage.setItem('eh-onboarded', '1');
    render(<WelcomePage />);
    expect(mockReplace).toHaveBeenCalledWith('/studio');
  });

  it('다음 버튼 클릭 시 Slide 2로 이동', () => {
    const { container, getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음'));
    expect(container.textContent).toContain('작가의 판단을 키웁니다');
  });

  it('3장까지 진행 시 Slide 3 + 다음 버튼 존재', () => {
    const { container, getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음')); // → 2
    fireEvent.click(getByText('다음')); // → 3
    expect(container.textContent).toContain('같이 하세요');
    expect(getByText('다음')).toBeInTheDocument();
  });

  it('4장 도달 시 작업 정리 노트 안내 슬라이드 노출 + 다음 버튼 존재', () => {
    const { container, getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음')); // → 2
    fireEvent.click(getByText('다음')); // → 3
    fireEvent.click(getByText('다음')); // → 4 (작업 정리 노트 안내)
    expect(container.textContent).toContain('작업 과정은 자동으로 정리됩니다');
    // Next 버튼 아직 존재 (5번째 = 역할 선택)
    expect(getByText('다음')).toBeInTheDocument();
  });

  it('5장 도달 시 역할 선택 카드 4종 노출 + 다음 버튼 사라짐', () => {
    const { container, getByText, queryByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음')); // → 2
    fireEvent.click(getByText('다음')); // → 3
    fireEvent.click(getByText('다음')); // → 4 (작업 정리 노트)
    fireEvent.click(getByText('다음')); // → 5 (role slide)
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
    fireEvent.click(getByText('다음')); // → 5번째 슬라이드 (역할 선택)
    fireEvent.click(getByText('만 14세 이상입니다 (한국 청소년보호법 기준)'));
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
    fireEvent.click(getByText('다음')); // → 5번째 슬라이드 (역할 선택)
    fireEvent.click(getByText('만 14세 이상입니다 (한국 청소년보호법 기준)'));
    fireEvent.click(getByText('번역가'));
    expect(mockSetRole).toHaveBeenCalledWith('translator');
    expect(mockPush).toHaveBeenCalledWith('/translation-studio');
  });

  it('만 14세 체크 전에는 역할 카드가 이동하지 않음', () => {
    const { getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('다음'));
    fireEvent.click(getByText('다음')); // → 5번째 슬라이드

    fireEvent.click(getByText('소설가'));
    expect(localStorage.getItem('eh-onboarded')).toBeNull();
    expect(mockSetRole).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('건너뛰기 버튼 → explorer role + localStorage 저장 + / 이동', () => {
    const { getByText } = render(<WelcomePage />);
    fireEvent.click(getByText('건너뛰기'));
    expect(localStorage.getItem('eh-onboarded')).toBe('1');
    expect(mockSetRole).toHaveBeenCalledWith('explorer');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('Slide 인디케이터 5개 렌더링 + 클릭으로 특정 Slide 이동 가능', () => {
    const { container } = render(<WelcomePage />);
    const indicators = container.querySelectorAll('[aria-label^="Slide"]');
    expect(indicators).toHaveLength(5);
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
