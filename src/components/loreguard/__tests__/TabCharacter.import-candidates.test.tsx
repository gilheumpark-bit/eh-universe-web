import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import TabCharacter from "@/components/loreguard/tabs/TabCharacter";
import { useStudio } from "@/app/studio/StudioContext";
import type { StoryConfig } from "@/lib/studio-types";

jest.mock("next/dynamic", () => () => function DynamicMock() {
  return null;
});

jest.mock("@/components/loreguard/ChatCanvasDock", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  extractJsonBlocks: jest.fn(() => []),
}));

jest.mock("@/components/studio/ItemStudioView", () => ({
  __esModule: true,
  default: ({ config }: { config: StoryConfig }) => (
    <div data-testid="item-studio-view">아이템 스튜디오 {(config.items ?? []).length}</div>
  ),
}));

jest.mock("@/app/studio/StudioContext", () => ({
  useStudio: jest.fn(),
}));

const mockedUseStudio = useStudio as jest.Mock;

function makeConfig(): StoryConfig {
  return {
    genre: "FANTASY",
    povCharacter: "",
    setting: "",
    primaryEmotion: "",
    episode: 1,
    title: "",
    totalEpisodes: 60,
    synopsis: "",
    guardrails: { min: 5500, max: 7000 },
    characters: [],
    platform: "WEB",
    acceptedImportCandidates: [
      {
        id: "import-char-1",
        sourceFileName: "characters.md",
        bucket: "characters",
        targetType: "character",
        title: "캐릭터: 서윤",
        text: [
          "역할: 정보 브로커",
          "성격: 냉정함, 관찰력",
          "말투: 짧고 단정한 문장",
          "외형: 은색 단발과 검은 코트",
          "설계 단계: T3",
          "정보 상태: 소문",
          "공개 정보: 지하 도시의 연락책으로 알려짐",
          "숨은 진실: 왕실 기록실의 마지막 생존자",
          "관계 호칭: 상대를 성씨로만 부름",
          "존대 규칙: 의뢰인에게만 존대",
          "IP 가능성: 높음",
          "자산화 메모: 웹툰 조연 스핀오프 가능",
          "도시의 금지 기록을 거래한다.",
        ].join("\n"),
        excerpt: "서윤은 도시의 금지 기록을 거래하는 정보 브로커다.",
        confidence: 0.88,
        reason: "인물 단서가 많음",
        detectedFormat: "md",
        sectionIndex: 1,
        charCount: 96,
        importedAt: "2026-06-13T00:00:00.000Z",
        acceptedAt: "2026-06-13T00:01:00.000Z",
        alignmentWarnings: [
          {
            code: "rights-note",
            severity: "info",
            label: "권리/IP 메모 확인",
            detail: "외부 설정집에서 불러온 인물 후보입니다.",
          },
        ],
      },
      {
        id: "import-item-1",
        sourceFileName: "items.md",
        bucket: "items",
        targetType: "item",
        title: "아이템: 새벽 열쇠",
        text: [
          "분류: 퀘스트",
          "등급: 전설",
          "설명: 봉인된 기록 보관소를 여는 유일한 열쇠",
          "효과: 금지 구역 문을 해제한다",
          "획득처: 7화 지하 경매",
          "소유자: 서윤",
          "상태: 활성",
          "용도: 주인공이 첫 진실에 접근하는 장치",
          "발동 조건: 보관소 앞에서 소유자가 직접 선언",
          "대가: 사용 후 한 번 금이 간다",
          "외형: 푸른 균열이 흐르는 은색 열쇠",
          "현재 위치: 서윤의 금고",
          "소유권 조건: 보관소 앞 선언자에게 귀속",
          "IP 가능성: 프리미엄",
          "권리/IP 메모: 굿즈 소품화 가능",
        ].join("\n"),
        excerpt: "새벽 열쇠는 봉인된 기록 보관소를 여는 유일한 열쇠다.",
        confidence: 0.91,
        reason: "아이템 필드가 명확함",
        detectedFormat: "md",
        sectionIndex: 2,
        charCount: 180,
        importedAt: "2026-06-13T00:00:00.000Z",
        acceptedAt: "2026-06-13T00:01:00.000Z",
      },
    ],
  } as StoryConfig;
}

function renderTabCharacter(charSubTab: "characters" | "items" = "characters") {
  let config = makeConfig();
  const setConfig = jest.fn((next: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
    config = typeof next === "function" ? next(config) : next;
  });

  mockedUseStudio.mockReturnValue({
    currentSession: {
      id: "session-1",
      title: "기존 프로젝트",
      messages: [],
      config,
      lastUpdate: 1,
    },
    setConfig,
    createNewSession: jest.fn(),
    isKO: true,
    language: "KO",
    charSubTab,
    setCharSubTab: jest.fn(),
    hasAiAccess: false,
    setShowApiKeyModal: jest.fn(),
  });

  render(<TabCharacter />);
  return { getConfig: () => config, setConfig };
}

describe("TabCharacter import candidates", () => {
  beforeEach(() => {
    mockedUseStudio.mockReset();
    window.localStorage.clear();
  });

  it("프로젝트 생성에서 읽은 캐릭터 자료를 인물 목록에 반영한다", async () => {
    const { getConfig } = renderTabCharacter();

    expect(screen.getByText("읽은 자료 검토 (1)")).toBeInTheDocument();
    expect(screen.getByText("서윤")).toBeInTheDocument();
    expect(screen.getByText("권리/IP 메모 확인")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /인물 반영/ }));

    await waitFor(() => {
      expect(getConfig().characters).toHaveLength(1);
    });
    expect(getConfig().characters[0]).toMatchObject({
      name: "서윤",
      role: "정보 브로커",
      traits: "냉정함, 관찰력",
      appearance: "은색 단발과 검은 코트",
      speechStyle: "짧고 단정한 문장",
      developmentTier: "T3",
      informationState: "rumor",
      publicKnowledge: "지하 도시의 연락책으로 알려짐",
      privateTruth: "왕실 기록실의 마지막 생존자",
      relationAddress: "상대를 성씨로만 부름",
      honorificRule: "의뢰인에게만 존대",
      assetPotential: "high",
      assetMemo: "웹툰 조연 스핀오프 가능",
    });
    expect(getConfig().characters[0].backstory).toContain("금지 기록");
    expect(getConfig().acceptedImportCandidates?.[0]).toMatchObject({
      id: "import-char-1",
      routedToStage: "character",
      routedTargetKey: getConfig().characters[0].id,
    });
    expect(getConfig().acceptedImportCandidates?.[0].routedAt).toEqual(expect.any(String));
  });

  it("프로젝트 생성에서 읽은 아이템 자료를 아이템 목록에 반영한다", async () => {
    const { getConfig } = renderTabCharacter("items");

    expect(screen.getByText("아이템 스튜디오 0")).toBeInTheDocument();
    expect(screen.getByText("읽은 자료 검토 (1)")).toBeInTheDocument();
    expect(screen.getByText("새벽 열쇠")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /아이템 반영/ }));

    await waitFor(() => {
      expect(getConfig().items).toHaveLength(1);
    });
    expect(getConfig().items?.[0]).toMatchObject({
      name: "새벽 열쇠",
      category: "quest",
      rarity: "legendary",
      description: "봉인된 기록 보관소를 여는 유일한 열쇠",
      effect: "금지 구역 문을 해제한다",
      obtainedFrom: "7화 지하 경매",
      owner: "서윤",
      status: "active",
      purpose: "주인공이 첫 진실에 접근하는 장치",
      activationCond: "보관소 앞에서 소유자가 직접 선언",
      costWeakness: "사용 후 한 번 금이 간다",
      itemAppearance: "푸른 균열이 흐르는 은색 열쇠",
      currentLocation: "서윤의 금고",
      ownershipCond: "보관소 앞 선언자에게 귀속",
      ipPotential: "premium",
      rightsMemo: "굿즈 소품화 가능",
    });
    const routed = getConfig().acceptedImportCandidates?.find((entry) => entry.id === "import-item-1");
    expect(routed).toMatchObject({
      routedToStage: "item",
      routedTargetKey: getConfig().items?.[0].id,
    });
    expect(routed?.routedAt).toEqual(expect.any(String));
  });
});
