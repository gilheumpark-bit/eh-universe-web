import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import TabDirection from "@/components/loreguard/tabs/TabDirection";
import { useStudio } from "@/app/studio/StudioContext";
import { useLoreguardTab } from "@/components/loreguard/LoreguardTabContext";
import type { StoryConfig } from "@/lib/studio-types";

jest.mock("next/dynamic", () => () => function DynamicMock() {
  return null;
});

jest.mock("@/components/loreguard/ChatCanvasDock", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  extractJsonBlocks: jest.fn(() => []),
}));

jest.mock("@/hooks/useLongArcVerifier", () => ({
  useLongArcVerifier: jest.fn(() => ({
    state: "idle",
    report: null,
    refresh: jest.fn(),
  })),
}));

jest.mock("@/app/studio/StudioContext", () => ({
  useStudio: jest.fn(),
}));

jest.mock("@/components/loreguard/LoreguardTabContext", () => ({
  useLoreguardTab: jest.fn(),
}));

const mockedUseStudio = useStudio as jest.Mock;
const mockedUseLoreguardTab = useLoreguardTab as jest.Mock;

function makeConfig(): StoryConfig {
  return {
    genre: "FANTASY",
    povCharacter: "",
    setting: "",
    primaryEmotion: "",
    episode: 3,
    title: "기록국의 밤",
    totalEpisodes: 60,
    synopsis: "",
    guardrails: { min: 5500, max: 7000 },
    characters: [],
    platform: "WEB",
    episodeSceneSheets: [
      {
        id: "sheet-3",
        episode: 3,
        title: "기록국 입구",
        lastUpdate: 1,
        scenes: [],
      },
    ],
    acceptedImportCandidates: [
      {
        id: "import-scenes-1",
        sourceFileName: "scene-sheet.md",
        bucket: "scenes",
        targetType: "scene",
        title: "씬시트: 3화",
        text: [
          "씬 1: 경비 교대 - 서윤이 경비 교대의 틈을 확인한다.",
          "씬 2: 문장 해독 - 주인공이 새벽 열쇠의 문장을 읽는다.",
        ].join("\n"),
        excerpt: "경비 교대와 문장 해독으로 구성된 3화 씬시트.",
        confidence: 0.87,
        reason: "씬 단서가 명확함",
        detectedFormat: "md",
        sectionIndex: 1,
        charCount: 94,
        importedAt: "2026-06-13T00:00:00.000Z",
        acceptedAt: "2026-06-13T00:01:00.000Z",
        alignmentWarnings: [
          {
            code: "scene-link",
            severity: "info",
            label: "다음 씬 연결 확인",
            detail: "씬 사이 연결을 점검해야 합니다.",
          },
        ],
      },
    ],
  } as StoryConfig;
}

function makeDirectionConfig(): StoryConfig {
  return {
    ...makeConfig(),
    sceneDirection: {
      writerNotes: "기존 연출 노트",
    },
    acceptedImportCandidates: [
      {
        id: "import-direction-1",
        sourceFileName: "direction-note.md",
        bucket: "direction",
        targetType: "scene",
        title: "연출: 기록국 진입",
        text: [
          "컷 1: 로우 앵글로 기록국 문을 압박감 있게 보여준다.",
          "카메라: 서윤의 손끝에서 새벽 열쇠로 천천히 이동한다.",
          "조명: 차갑고 낮은 청색광.",
        ].join("\n"),
        excerpt: "기록국 진입부의 컷, 카메라, 조명 노트.",
        confidence: 0.9,
        reason: "연출 단서가 명확함",
        detectedFormat: "md",
        sectionIndex: 1,
        charCount: 88,
        importedAt: "2026-06-13T00:00:00.000Z",
        acceptedAt: "2026-06-13T00:01:00.000Z",
      },
    ],
  } as StoryConfig;
}

function renderTabDirection(options: { activeTab?: "scenesheet" | "direction"; initialConfig?: StoryConfig } = {}) {
  const activeTab = options.activeTab ?? "scenesheet";
  let config = options.initialConfig ?? makeConfig();
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
    currentProjectId: "project-1",
    setConfig,
    createNewSession: jest.fn(),
    isKO: true,
    language: "KO",
    hasAiAccess: false,
    setShowApiKeyModal: jest.fn(),
  });
  mockedUseLoreguardTab.mockReturnValue({
    activeTab,
    setActiveTab: jest.fn(),
  });

  render(<TabDirection />);
  return { getConfig: () => config, setConfig };
}

function getEpisodeBadge(episode: number) {
  return screen.getByText((_content, element) =>
    Boolean(element?.classList.contains("btn") && element.textContent?.includes(`에피소드 : ${episode}화`)),
  );
}

describe("TabDirection import candidates", () => {
  beforeEach(() => {
    mockedUseStudio.mockReset();
    mockedUseLoreguardTab.mockReset();
    window.localStorage.clear();
  });

  it("프로젝트 생성에서 채택한 씬 후보를 현재 화 씬시트에 반영한다", async () => {
    const { getConfig } = renderTabDirection();

    expect(screen.getByText(/씬시트 읽은 자료 검토 1건/)).toBeInTheDocument();
    expect(getEpisodeBadge(3)).toBeInTheDocument();
    expect(screen.getByText("다음 씬 연결 확인")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /씬으로 반영/ }));

    await waitFor(() => {
      expect(getConfig().episodeSceneSheets?.[0].scenes).toHaveLength(2);
    });
    expect(getConfig().episodeSceneSheets?.[0].scenes?.[0]).toMatchObject({
      sceneId: "3-1",
      sceneName: "경비 교대",
      tone: "긴장",
      summary: "서윤이 경비 교대의 틈을 확인한다.",
      purpose: "서윤이 경비 교대의 틈을 확인한다.",
      publicInfo: "경비 교대",
      emotionCurve: "긴장 → 확인",
      hookPoint: "서윤이 경비 교대의 틈을 확인한다.",
      nextScene: "3-2",
    });
    expect(getConfig().episodeSceneSheets?.[0].scenes?.[1]).toMatchObject({
      sceneId: "3-2",
      sceneName: "문장 해독",
      summary: "주인공이 새벽 열쇠의 문장을 읽는다.",
      purpose: "주인공이 새벽 열쇠의 문장을 읽는다.",
      publicInfo: "문장 해독",
      nextScene: "",
    });
    const routed = getConfig().acceptedImportCandidates?.find((entry) => entry.id === "import-scenes-1");
    expect(routed).toMatchObject({
      routedToStage: "scene-sheet",
      routedTargetKey: "episode:3:scenes:3-1,3-2",
    });
    expect(routed?.routedAt).toEqual(expect.any(String));
  });

  it("저장된 씬의 8영역을 인스펙터와 행 요약에 표시한다", () => {
    renderTabDirection({
      initialConfig: {
        ...makeConfig(),
        acceptedImportCandidates: [],
        episodeSceneSheets: [
          {
            id: "sheet-3",
            episode: 3,
            title: "기록국 입구",
            lastUpdate: 1,
            scenes: [
              {
                sceneId: "3-1",
                sceneName: "경비 교대",
                characters: "서윤",
                tone: "긴장",
                summary: "서윤이 경비 교대의 틈을 확인한다.",
                purpose: "침투 가능성을 확인한다.",
                conflict: "경비 교대 시간이 흔들린다.",
                publicInfo: "경비 동선",
                hiddenInfo: "내부 협력자",
                emotionCurve: "의심 → 확신",
                rewardBeat: "침투 루트 확보",
                hookPoint: "새벽 열쇠가 반응한다.",
                keyDialogue: "",
                emotionPoint: "숨죽인 긴장",
                nextScene: "3-2",
              },
            ],
          },
        ],
      } as StoryConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: "씬시트 보조 패널 펼치기" }));

    expect(screen.getByText("씬 8영역")).toBeInTheDocument();
    expect(screen.getByText(/목적: 침투 가능성을 확인한다/)).toBeInTheDocument();
    expect(screen.getByText("침투 루트 확보")).toBeInTheDocument();
  });

  it("프로젝트 생성에서 채택한 연출 후보를 연출 노트와 현재 화 스냅샷에 반영한다", async () => {
    const { getConfig } = renderTabDirection({
      activeTab: "direction",
      initialConfig: makeDirectionConfig(),
    });

    expect(screen.getByText(/연출 읽은 자료 검토 1건/)).toBeInTheDocument();
    expect(screen.getByText("기록국 진입")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /연출 노트로 반영/ }));

    await waitFor(() => {
      expect(getConfig().sceneDirection?.writerNotes).toContain("로우 앵글");
    });
    expect(getConfig().sceneDirection?.writerNotes).toContain("기존 연출 노트");
    expect(getConfig().sceneDirection?.productionDirection?.camera).toContain("로우 앵글");
    expect(getConfig().sceneDirection?.productionDirection?.camera).toContain("서윤의 손끝");
    expect(getConfig().sceneDirection?.productionDirection?.lighting).toContain("차갑고 낮은 청색광");
    expect(getConfig().episodeSceneSheets?.[0].directionSnapshot?.writerNotes).toContain("차갑고 낮은 청색광");
    expect(getConfig().episodeSceneSheets?.[0].directionSnapshot?.productionDirection?.camera).toContain("서윤의 손끝");
    const routed = getConfig().acceptedImportCandidates?.find((entry) => entry.id === "import-direction-1");
    expect(routed).toMatchObject({
      routedToStage: "direction",
      routedTargetKey: "episode:3:directionSnapshot:writerNotes",
    });
    expect(routed?.routedAt).toEqual(expect.any(String));
  });

  it("연출 방식을 씬시트와 분리해 현재 화 스냅샷에도 저장한다", () => {
    const { getConfig } = renderTabDirection({
      activeTab: "direction",
      initialConfig: {
        ...makeConfig(),
        sceneDirection: {
          productionDirection: {
            miseEnScene: "기록국 복도는 지나치게 깨끗하다.",
          },
        },
        acceptedImportCandidates: [],
      } as StoryConfig,
    });

    expect(screen.getByText("연출 방식")).toBeInTheDocument();
    expect(screen.getByLabelText("미장센")).toHaveValue("기록국 복도는 지나치게 깨끗하다.");

    fireEvent.change(screen.getByLabelText("카메라"), {
      target: { value: "문틈에서 인물 뒤통수로 천천히 당긴다." },
    });

    expect(getConfig().sceneDirection?.productionDirection?.camera).toBe("문틈에서 인물 뒤통수로 천천히 당긴다.");
    expect(getConfig().episodeSceneSheets?.[0].directionSnapshot?.productionDirection?.camera).toBe(
      "문틈에서 인물 뒤통수로 천천히 당긴다.",
    );
  });
});
