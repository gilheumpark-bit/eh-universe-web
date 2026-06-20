import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import TabPlot from "@/components/loreguard/tabs/TabPlot";
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
    title: "기록국의 밤",
    totalEpisodes: 60,
    synopsis: "",
    guardrails: { min: 5500, max: 7000 },
    characters: [],
    platform: "WEB",
    episodeSceneSheets: [],
    acceptedImportCandidates: [
      {
        id: "import-main-1",
        sourceFileName: "main-scenario.md",
        bucket: "mainScenario",
        targetType: "scene",
        title: "메인 시나리오: 1부 개요",
        text: [
          "1화: 기록국 침입 - 서윤이 금지 기록을 훔치고 추격을 시작한다.",
          "2화: 새벽 열쇠 - 주인공이 열쇠의 대가를 확인하고 거래를 제안한다.",
        ].join("\n"),
        excerpt: "기록국 침입과 새벽 열쇠로 이어지는 1부 시나리오.",
        confidence: 0.9,
        reason: "회차 단서가 명확함",
        detectedFormat: "md",
        sectionIndex: 1,
        charCount: 92,
        importedAt: "2026-06-13T00:00:00.000Z",
        acceptedAt: "2026-06-13T00:01:00.000Z",
        alignmentWarnings: [
          {
            code: "platform-check",
            severity: "info",
            label: "플랫폼 분량 확인",
            detail: "회차별 분량 기준과 함께 검토해야 합니다.",
          },
        ],
      },
    ],
  } as StoryConfig;
}

function renderTabPlot() {
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
    currentProject: { id: "project-1", name: "기록국의 밤", sessions: [] },
    setConfig,
    handleTabChange: jest.fn(),
    createNewSession: jest.fn(),
    openQuickStart: jest.fn(),
    hasAiAccess: false,
    setShowApiKeyModal: jest.fn(),
  });

  render(<TabPlot />);
  return { getConfig: () => config, setConfig };
}

describe("TabPlot import candidates", () => {
  beforeEach(() => {
    mockedUseStudio.mockReset();
    window.localStorage.clear();
  });

  it("프로젝트 생성에서 채택한 메인 시나리오 후보를 비트 보드에 반영한다", async () => {
    const { getConfig } = renderTabPlot();

    expect(screen.getByText("구조화 설계")).toBeInTheDocument();
    expect(screen.getByText("7문장 시놉시스")).toBeInTheDocument();
    expect(screen.getByText("읽은 자료 검토 (1)")).toBeInTheDocument();
    expect(screen.getByText("1부 개요")).toBeInTheDocument();
    expect(screen.getByText("플랫폼 분량 확인")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /비트로 반영/ }));

    await waitFor(() => {
      expect(getConfig().episodeSceneSheets).toHaveLength(2);
    });
    expect(getConfig().episodeSceneSheets?.[0]).toMatchObject({
      episode: 1,
      title: "기록국 침입",
      arc: "서윤이 금지 기록을 훔치고 추격을 시작한다.",
    });
    expect(getConfig().episodeSceneSheets?.[1]).toMatchObject({
      episode: 2,
      title: "새벽 열쇠",
      arc: "주인공이 열쇠의 대가를 확인하고 거래를 제안한다.",
    });
    expect(getConfig().mainScenarioStructure?.sevenSentenceSynopsis).toHaveLength(7);
    expect(getConfig().mainScenarioStructure?.sevenSentenceSynopsis?.[0]).toMatchObject({
      label: "1. 시작 상태",
      text: "기록국 침입: 서윤이 금지 기록을 훔치고 추격을 시작한다.",
    });
    expect(getConfig().mainScenarioStructure?.acts).toHaveLength(3);
    expect(getConfig().mainScenarioStructure?.endingLock).toMatchObject({ locked: false });
    expect(getConfig().mainScenarioStructure?.eventChain).toHaveLength(2);
    expect(getConfig().mainScenarioStructure?.eventChain?.[1]).toMatchObject({
      title: "새벽 열쇠",
      cause: "기록국 침입",
      linkedEpisode: 2,
    });
    const routed = getConfig().acceptedImportCandidates?.find((entry) => entry.id === "import-main-1");
    expect(routed).toMatchObject({
      routedToStage: "plot",
    });
    expect(routed?.routedTargetKey).toContain("episodeSceneSheets:");
    expect(routed?.routedAt).toEqual(expect.any(String));
  });
});
