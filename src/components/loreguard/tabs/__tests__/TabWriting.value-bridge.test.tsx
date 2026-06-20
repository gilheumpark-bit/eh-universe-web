// ============================================================
// TabWriting — 집필 가치 연결 카드 회귀 테스트
// ============================================================

import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ChatSession, StoryConfig } from "@/lib/studio-types";

jest.mock("next/dynamic", () => () => () => null);

jest.mock("@/components/studio/LoadingSkeleton", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/studio/InlineActionPopup", () => ({
  InlineActionPopup: () => null,
}));

jest.mock("@/components/loreguard/CpJournalPanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/loreguard/RevisionPanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/loreguard/IpAssetPanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/loreguard/FindReplaceBar", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/loreguard/ComposerExtras", () => ({
  ModelPickerInline: () => null,
  FontModeToggle: () => null,
  MentionDropdown: () => null,
  useWritingFontMode: () => ["system", jest.fn()],
  buildMentionItems: () => [],
  detectMentionQuery: () => null,
  filterMentionItems: () => [],
  applyMention: (value: string) => ({ value, caret: value.length }),
  buildMentionContextBlock: () => "",
}));

jest.mock("@/hooks/useStudioExport", () => ({
  useStudioExport: () => ({}),
}));

jest.mock("@/lib/browser/web-share", () => ({
  canShare: () => false,
  canShareFiles: () => false,
  shareManuscript: jest.fn(),
  shareText: jest.fn(),
}));

const mockSetInput = jest.fn();
const mockHandleSend = jest.fn();
const mockSetShowApiKeyModal = jest.fn();
const mockSetConfig = jest.fn();
let mockHasAiAccess = true;
let mockInput = "";

const baseConfig = {
  title: "테스트 원고",
  genre: "FANTASY",
  povCharacter: "윤",
  setting: "왕도 외곽",
  corePremise: "탑이 도시 한복판에 솟아오른 세계",
  currentConflict: "탑을 둘러싼 길드와 왕실의 통제권 다툼",
  primaryEmotion: "긴장",
  episode: 1,
  manuscripts: [{ episode: 1, title: "1화", content: "저장 원고", charCount: 4, lastUpdate: 1 }],
  rightsNote: "권리 메모",
  rightsStatus: "draft",
  characters: [],
  episodeSceneSheets: [],
} as unknown as StoryConfig;

const mockSession = {
  id: "session-1",
  title: "테스트 세션",
  config: baseConfig,
  messages: [],
  lastUpdate: 1,
} as unknown as ChatSession;

jest.mock("@/app/studio/StudioContext", () => ({
  useStudio: () => ({
    currentSession: mockSession,
    currentSessionId: "session-1",
    currentProjectId: "project-1",
    currentProject: { id: "project-1", name: "테스트 프로젝트" },
    projects: [],
    sessions: [mockSession],
    setCurrentSessionId: jest.fn(),
    setCurrentProjectId: jest.fn(),
    editDraft: "현재 원고 본문",
    setEditDraft: jest.fn(),
    editDraftRef: { current: null },
    suggestions: [],
    setSuggestions: jest.fn(),
    directorReport: null,
    lastReport: null,
    pipelineResult: null,
    versionedBackups: [],
    doRestoreVersionedBackup: jest.fn(),
    refreshBackupList: jest.fn(),
    saveFlash: false,
    lastSaveTime: null,
    triggerSave: jest.fn().mockResolvedValue(true),
    createNewSession: jest.fn(),
    input: mockInput,
    setInput: mockSetInput,
    handleSend: mockHandleSend,
    isGenerating: false,
    handleCancel: jest.fn(),
    hasAiAccess: mockHasAiAccess,
    setShowApiKeyModal: mockSetShowApiKeyModal,
    setConfig: mockSetConfig,
    handleNextEpisode: jest.fn(),
    handleRegenerate: jest.fn(),
    tokenUsage: null,
    generationTime: null,
    filteredMessages: [],
    language: "KO",
    isKO: true,
    writingMode: "edit",
    hostedProviders: {},
  }),
}));

jest.mock("@/components/loreguard/LoreguardTabContext", () => ({
  useLoreguardTab: () => ({
    activeTab: "writing",
    setActiveTab: jest.fn(),
  }),
}));

import TabWriting from "@/components/loreguard/tabs/TabWriting";

function renderTabWriting() {
  return render(<TabWriting />);
}

function openWritingBasisPanel() {
  fireEvent.click(screen.getByRole("button", { name: "집필 기준·출고 준비 열기" }));
}

describe("TabWriting value bridge", () => {
  beforeEach(() => {
    mockHasAiAccess = true;
    mockInput = "";
    mockSetInput.mockClear();
    mockHandleSend.mockClear();
    mockSetShowApiKeyModal.mockClear();
    mockSetConfig.mockClear();
    Reflect.deleteProperty(window, "__creativeLogger");
  });

  it("기본 집필로 시작하고 고급 모드는 기준·출고 패널을 연다", () => {
    renderTabWriting();

    const focusMode = screen.getByRole("radio", { name: "기본 집필" });
    const advancedMode = screen.getByRole("radio", { name: "고급" });
    expect(focusMode).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "집필 기준·출고 준비 열기" })).toBeInTheDocument();

    fireEvent.click(advancedMode);

    expect(advancedMode).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "집필 기준·출고 준비 접기" })).toBeInTheDocument();

    fireEvent.click(focusMode);

    expect(focusMode).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "집필 기준·출고 준비 열기" })).toBeInTheDocument();
  });

  it("집필 화면에서 노아 제안, 과정기록, 권리/IP, 출고 패키지 흐름을 한 카드로 노출한다", () => {
    renderTabWriting();
    openWritingBasisPanel();

    const bridge = screen.getByLabelText("집필 출고 흐름");
    expect(within(bridge).getByText("집필에서 출고까지")).toBeInTheDocument();
    expect(within(bridge).getByRole("button", { name: /노아 제안/ })).toBeInTheDocument();
    expect(within(bridge).getByRole("button", { name: /과정기록/ })).toBeInTheDocument();
    expect(within(bridge).getByRole("button", { name: /권리\/IP 점검/ })).toBeInTheDocument();
    expect(within(bridge).getByRole("button", { name: /출고 패키지/ })).toBeInTheDocument();
    expect(within(bridge).getByRole("link", { name: "이용 범위 보기" })).toHaveAttribute("href", "/docs#redeem");
  });

  it("브리지 버튼은 기존 과정기록, 권리/IP, 출고 패널 이벤트로 이어진다", () => {
    const cpListener = jest.fn();
    const ipListener = jest.fn();
    const exportListener = jest.fn();
    window.addEventListener("loreguard:open-cp", cpListener);
    window.addEventListener("loreguard:open-ipasset", ipListener);
    window.addEventListener("loreguard:open-export", exportListener);

    renderTabWriting();
    openWritingBasisPanel();
    const bridge = screen.getByLabelText("집필 출고 흐름");
    fireEvent.click(within(bridge).getByRole("button", { name: /과정기록/ }));
    fireEvent.click(within(bridge).getByRole("button", { name: /권리\/IP 점검/ }));
    fireEvent.click(within(bridge).getByRole("button", { name: /출고 패키지/ }));

    expect(cpListener).toHaveBeenCalledTimes(1);
    expect(ipListener).toHaveBeenCalledTimes(1);
    expect(exportListener).toHaveBeenCalledTimes(1);

    window.removeEventListener("loreguard:open-cp", cpListener);
    window.removeEventListener("loreguard:open-ipasset", ipListener);
    window.removeEventListener("loreguard:open-export", exportListener);
  });

  it("연결 키가 없을 때 노아 제안은 설정 모달로 이어진다", () => {
    mockHasAiAccess = false;
    renderTabWriting();
    openWritingBasisPanel();

    const bridge = screen.getByLabelText("집필 출고 흐름");
    fireEvent.click(within(bridge).getByRole("button", { name: /노아 제안/ }));

    expect(mockSetShowApiKeyModal).toHaveBeenCalledWith(true);
    expect(mockSetInput).not.toHaveBeenCalled();
  });

  it("연결 키가 있으면 노아 제안 요청 문장을 입력칸에 준비한다", () => {
    mockHasAiAccess = true;
    mockInput = "";
    renderTabWriting();
    openWritingBasisPanel();

    const bridge = screen.getByLabelText("집필 출고 흐름");
    fireEvent.click(within(bridge).getByRole("button", { name: /노아 제안/ }));

    expect(mockSetInput).toHaveBeenCalledWith("현재 원고의 다음 장면 후보를 3개로 정리해 주세요.");
    expect(mockSetShowApiKeyModal).not.toHaveBeenCalled();
  });

  it("노아 요청은 세계관 기준선과 현재 원고를 묶어 전송한다", () => {
    mockHasAiAccess = true;
    mockInput = "다음 장면을 이어 주세요.";
    renderTabWriting();

    fireEvent.click(screen.getByRole("button", { name: "노아 요청" }));

    expect(mockHandleSend).toHaveBeenCalledTimes(1);
    const sentPrompt = mockHandleSend.mock.calls[0][0] as string;
    expect(sentPrompt).toContain("세계관");
    expect(sentPrompt).toContain("탑이 도시 한복판에 솟아오른 세계");
    expect(sentPrompt).toContain("현재 원고 본문");
    expect(sentPrompt).toContain("다음 장면을 이어 주세요.");
  });

  it("작업·출고 메뉴에서 노아 작업 묶음을 열고 작가 승인 기록을 남긴다", () => {
    const logHumanEdit = jest.fn();
    const toastListener = jest.fn();
    Object.defineProperty(window, "__creativeLogger", {
      configurable: true,
      value: { logHumanEdit },
    });
    window.addEventListener("noa:toast", toastListener);

    renderTabWriting();

    fireEvent.click(screen.getByRole("button", { name: /작업·출고/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /작업 묶음/ }));

    const bundle = screen.getByLabelText("노아 작업 묶음");
    expect(within(bundle).getByText("집필 후반 점검")).toBeInTheDocument();
    expect(within(bundle).getByText("문체·리듬 점검")).toBeInTheDocument();
    expect(within(bundle).getByText("퇴고 후보 점검")).toBeInTheDocument();
    expect(within(bundle).getByText("권리/IP·출고 점검")).toBeInTheDocument();
    expect(within(bundle).getByText("항상 물어보기")).toBeInTheDocument();

    fireEvent.click(within(bundle).getByRole("button", { name: /작가 승인 기록/ }));

    expect(logHumanEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "metadata",
        targetId: expect.stringMatching(/^noa-compose:/),
        note: "노아 작업 묶음 작가 승인",
        stage: "writing",
      }),
    );
    expect(toastListener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          message: "작업 묶음 승인 기록 완료",
          variant: "success",
        }),
      }),
    );

    window.removeEventListener("noa:toast", toastListener);
  });
});
