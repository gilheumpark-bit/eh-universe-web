import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

const mockOpenApiKeyModal = jest.fn();
const mockSetActiveLeftPanel = jest.fn();

jest.mock("@/components/translator/core/TranslatorContext", () => ({
  useTranslator: () => ({
    cloudSyncEnabled: false,
    cloudSyncStatus: "idle",
    cloudSyncDetail: "",
    provider: "openai",
    langKo: true,
    autoSaveLabel: "저장됨",
    authUser: null,
    isAuthLoaded: true,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
    exportData: jest.fn(),
    importData: jest.fn(),
    openApiKeyModal: mockOpenApiKeyModal,
    apiKeys: {},
    setApiKeys: jest.fn(),
    aiCapabilitiesLoaded: true,
    hostedNoa: false,
  }),
}));

jest.mock("@/components/translator/core/TranslatorLayoutContext", () => ({
  useTranslatorLayout: () => ({
    setActiveLeftPanel: mockSetActiveLeftPanel,
  }),
}));

jest.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({
    isConfigured: false,
    error: null,
  }),
}));

import { SettingsPanel } from "../SettingsPanel";

describe("SettingsPanel tone", () => {
  beforeEach(() => {
    mockOpenApiKeyModal.mockClear();
    mockSetActiveLeftPanel.mockClear();
  });

  it("번역 스튜디오 설정은 작업자용 노아/연결 키 톤으로 보인다", () => {
    const { container } = render(<SettingsPanel />);

    expect(screen.getByText("노아 운영 모드")).toBeInTheDocument();
    expect(screen.getByText("DeepSeek 연결 키")).toBeInTheDocument();
    expect(screen.getByText(/로그인 연결이 아직 준비되지 않았습니다/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "연결 키 관리 열기" })).toBeInTheDocument();

    expect(container.textContent ?? "").not.toMatch(
      /Firebase|Supabase|NEXT_PUBLIC|BYOK|API 키|사용자 연결 키|모델 키/,
    );
  });
});
