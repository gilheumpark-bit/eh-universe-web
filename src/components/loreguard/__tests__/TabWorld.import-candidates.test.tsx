import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import TabWorld from "@/components/loreguard/tabs/TabWorld";
import { useStudio } from "@/app/studio/StudioContext";
import type { StoryConfig } from "@/lib/studio-types";

jest.mock("next/dynamic", () => () => function DynamicMock() {
  return null;
});

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
    corePremise: "",
    acceptedImportCandidates: [
      {
        id: "import-1",
        sourceFileName: "royal-road-outline.md",
        bucket: "world",
        targetType: "world",
        title: "Royal Road 제출 메모",
        text: "왕국의 공개 마법은 의식용이고, 실제 권력은 지하 기록국이 통제한다.",
        excerpt: "왕국의 공개 마법은 의식용이고, 실제 권력은 지하 기록국이 통제한다.",
        confidence: 0.92,
        reason: "세계관 단서가 많음",
        detectedFormat: "md",
        sectionIndex: 0,
        charCount: 42,
        importedAt: "2026-06-13T00:00:00.000Z",
        acceptedAt: "2026-06-13T00:01:00.000Z",
        appliedBasisSuggestions: true,
        alignmentWarnings: [
          {
            code: "language-mismatch",
            severity: "warning",
            label: "대상 언어권 확인",
            detail: "영어권 제출 단서가 있습니다.",
          },
        ],
      },
    ],
  } as StoryConfig;
}

function renderTabWorld() {
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
    filteredMessages: [],
    isGenerating: false,
    handleSend: jest.fn(),
    handleCancel: jest.fn(),
    input: "",
    setInput: jest.fn(),
    createNewSession: jest.fn(),
    versionedBackups: [],
    doRestoreVersionedBackup: jest.fn(),
    refreshBackupList: jest.fn(),
    language: "KO",
  });

  render(<TabWorld />);
  return { getConfig: () => config, setConfig };
}

describe("TabWorld import candidates", () => {
  beforeEach(() => {
    mockedUseStudio.mockReset();
    window.localStorage.clear();
  });

  it("프로젝트 생성에서 읽은 세계관 자료를 선택 필드에 반영한다", async () => {
    const { getConfig } = renderTabWorld();

    fireEvent.click(screen.getByRole("button", { name: "세계관 보드 펼치기" }));

    expect(screen.getByText("읽은 자료 검토")).toBeInTheDocument();
    expect(screen.getByText("Royal Road 제출 메모")).toBeInTheDocument();
    expect(screen.getByText("출처 royal-road-outline.md")).toBeInTheDocument();
    expect(screen.getByText("충돌")).toBeInTheDocument();
    expect(screen.getByText("충돌 1")).toBeInTheDocument();
    expect(screen.getByText("대상 언어권 확인")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /핵심 전제에 반영/ }));

    await waitFor(() => {
      expect(getConfig().corePremise).toContain("지하 기록국");
    });
    expect(getConfig().acceptedImportCandidates?.[0]).toMatchObject({
      id: "import-1",
      routedToStage: "world",
      routedTargetKey: "corePremise",
    });
    expect(getConfig().acceptedImportCandidates?.[0].routedAt).toEqual(expect.any(String));
    expect(getConfig().worldFieldEvidence?.corePremise).toMatchObject({
      fieldKey: "corePremise",
      sourceLabel: "royal-road-outline.md",
      sourceFileName: "royal-road-outline.md",
      sourceCandidateId: "import-1",
      confidence: 0.92,
      conflictCount: 1,
      arcsStatus: "conflict",
      note: "세계관 단서가 많음",
    });
    expect(getConfig().worldFieldEvidence?.corePremise?.updatedAt).toEqual(expect.any(String));
  });
});
