import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import SettingsView from '../SettingsView';

jest.mock('next/dynamic', () => () => {
  const DynamicStub = () => <div data-testid="settings-dynamic-section" />;
  DynamicStub.displayName = 'DynamicStub';
  return DynamicStub;
});

jest.mock('@/contexts/UserRoleContext', () => ({
  useUserRoleSafe: () => ({ developerMode: false }),
}));

jest.mock('@/contexts/StudioContext', () => ({
  useStudioConfig: () => ({ config: { episodeSceneSheets: [] } }),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  }),
}));

jest.mock('@/lib/show-alert', () => ({
  showAlert: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/ai-providers', () => ({
  PROVIDERS: {
    gemini: {
      name: 'Google Gemini',
      models: ['gemini-2.5-pro'],
    },
  },
  getActiveProvider: () => 'gemini',
  getActiveModel: () => 'gemini-2.5-pro',
  hasStoredApiKey: () => false,
}));

describe('SettingsView environment categories', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('환경 설정은 실서비스 카테고리로 노출되고 일반 사용자는 개발자 탭을 보지 않는다', () => {
    render(
      <SettingsView
        language="KO"
        hostedProviders={{ gemini: true }}
        onClearAll={jest.fn()}
        onManageApiKey={jest.fn()}
      />,
    );

    expect(screen.getByText('환경 설정')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /상태/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /노아 운영/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /저장·백업/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /창작 작업환경/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /과정기록·권리\/IP/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /출고·번역/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /진단/ })).toBeInTheDocument();

    expect(screen.queryByRole('tab', { name: /개발자/ })).not.toBeInTheDocument();
    expect(screen.queryByText('기본')).not.toBeInTheDocument();
    expect(screen.queryByText('고급')).not.toBeInTheDocument();
    expect(screen.queryByText(/개발자 모드/)).not.toBeInTheDocument();
  });

  it('상태판은 Hosted · 연결 키 · Local 운영 모드를 노출한다', () => {
    render(
      <SettingsView
        language="KO"
        hostedProviders={{ gemini: true }}
        onClearAll={jest.fn()}
        onManageApiKey={jest.fn()}
      />,
    );

    expect(screen.getByText('현재 노아 운영')).toBeInTheDocument();
    expect(screen.getAllByText('기본 운영').length).toBeGreaterThan(0);
    expect(screen.getByText('Hosted')).toBeInTheDocument();
    expect(screen.getAllByText('연결 키').length).toBeGreaterThan(0);
    expect(screen.getByText('Local')).toBeInTheDocument();
    expect(screen.queryByText(/API 키|BYOK|Gemini 호스팅/)).not.toBeInTheDocument();
  });

  it('검색어로 설정 카테고리를 좁힌다', () => {
    render(
      <SettingsView
        language="KO"
        hostedProviders={{ gemini: true }}
        onClearAll={jest.fn()}
        onManageApiKey={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('설정명·상태·키워드 검색'), {
      target: { value: '백업' },
    });

    expect(screen.getByRole('tab', { name: /저장·백업/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /노아 운영/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /출고·번역/ })).not.toBeInTheDocument();
  });
});
