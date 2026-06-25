import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import ProjectStart from "@/components/loreguard/ProjectStart";
import { useStudio } from "@/app/studio/StudioContext";
import { lazyFirebaseAuth } from "@/lib/firebase";
import { PublishPlatform } from "@/lib/studio-types";
import type { StoryConfig } from "@/lib/studio-types";

jest.mock("@/app/studio/StudioContext", () => ({
  useStudio: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  lazyFirebaseAuth: jest.fn(),
}));

const mockedUseStudio = useStudio as jest.Mock;
const mockedLazyFirebaseAuth = lazyFirebaseAuth as jest.Mock;
const originalFetch = global.fetch;

function renderProjectStart(
  overrides: Record<string, unknown> = {},
  props: { onContinue?: jest.Mock } = {},
) {
  const onContinue = props.onContinue ?? jest.fn();
  mockedUseStudio.mockReturnValue({
    currentSession: null,
    currentProjectId: null,
    createNewProjectWithSession: jest.fn(() => ({ projectId: "project-new", sessionId: "session-new" })),
    createNewSession: jest.fn(),
    updateCurrentSession: jest.fn(),
    renameProject: jest.fn(),
    setCurrentProjectId: jest.fn(),
    setCurrentSessionId: jest.fn(),
    deleteProject: jest.fn(),
    setConfig: jest.fn(),
    setInput: jest.fn(),
    handleSend: jest.fn(),
    hasAiAccess: false,
    setShowApiKeyModal: jest.fn(),
    ...overrides,
  });

  return {
    ...render(<ProjectStart onContinue={onContinue} />),
    onContinue,
  };
}

function makeTextFile(name: string, content: string): File {
  const file = new File([content], name, { type: "text/markdown" });
  Object.defineProperty(file, "text", {
    value: () => Promise.resolve(content),
  });
  return file;
}

function openImportFileInput(container: HTMLElement): HTMLInputElement {
  fireEvent.click(screen.getByRole("tab", { name: "파일 가져오기" }));
  const input = container.querySelector('#project-import input[type="file"]') as HTMLInputElement | null;
  expect(input).toBeInTheDocument();
  return input as HTMLInputElement;
}

function makeStoryConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
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
    ...overrides,
  } as StoryConfig;
}

describe("ProjectStart import candidates", () => {
  beforeEach(() => {
    mockedUseStudio.mockReset();
    mockedLazyFirebaseAuth.mockReset();
    global.fetch = originalFetch;
    localStorage.clear();
    localStorage.setItem("noa_desktop_collapse_v1", JSON.stringify({ "loreguard:project-canvas": false }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("빈 프로젝트 생성은 기존 프로젝트를 덮어쓰지 않고 새 프로젝트 생성 경로를 탄다", () => {
    const createNewProjectWithSession = jest.fn(() => ({ projectId: "project-b", sessionId: "session-b" }));
    const setConfig = jest.fn();
    const updateCurrentSession = jest.fn();
    const renameProject = jest.fn();

    renderProjectStart({
      currentSession: {
        id: "session-a",
        title: "기존 프로젝트",
        messages: [],
        config: {
          genre: "FANTASY",
          povCharacter: "",
          setting: "",
          primaryEmotion: "",
          episode: 1,
          title: "기존 프로젝트",
          totalEpisodes: 60,
          synopsis: "",
          guardrails: { min: 5500, max: 7000 },
          characters: [],
          platform: "WEB",
          rightsNote: "원작자, 공동기획, 외부자료, 상업 이용 예정 여부 확인 필요",
        },
        lastUpdate: 1,
      },
      currentProjectId: "project-a",
      createNewProjectWithSession,
      setConfig,
      updateCurrentSession,
      renameProject,
    });

    fireEvent.click(screen.getByTestId("lg-project-library-new"));

    expect(createNewProjectWithSession).toHaveBeenCalledTimes(1);
    expect(setConfig).not.toHaveBeenCalled();
    expect(updateCurrentSession).not.toHaveBeenCalled();
    expect(renameProject).not.toHaveBeenCalled();
  });

  it("파일 선택 버튼은 숨겨진 파일 입력을 직접 연다", () => {
    const inputClickSpy = jest
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);

    try {
      renderProjectStart();
      fireEvent.click(screen.getByRole("tab", { name: "파일 가져오기" }));
      fireEvent.click(screen.getByRole("button", { name: "파일 선택" }));

      expect(inputClickSpy).toHaveBeenCalledTimes(1);
    } finally {
      inputClickSpy.mockRestore();
    }
  });

  it("기존 작품에서 저장하고 세계관으로 이동하면 저장 요청과 단계 이동을 함께 실행한다", async () => {
    const setConfig = jest.fn();
    const updateCurrentSession = jest.fn();
    const renameProject = jest.fn();
    const triggerSave = jest.fn(() => Promise.resolve(true));
    const onContinue = jest.fn();

    renderProjectStart({
      language: "KO",
      currentSession: {
        id: "session-current",
        title: "기존 작품",
        messages: [],
        config: {
          genre: "FANTASY",
          povCharacter: "",
          setting: "",
          primaryEmotion: "",
          episode: 1,
          title: "기존 작품",
          totalEpisodes: 60,
          synopsis: "",
          guardrails: { min: 5500, max: 7000 },
          characters: [],
          platform: "WEB",
        },
        lastUpdate: 1,
      },
      currentProjectId: "project-current",
      currentProject: {
        id: "project-current",
        name: "기존 작품",
        description: "",
        genre: "FANTASY",
        createdAt: 1,
        lastUpdate: 1,
        sessions: [],
      },
      setConfig,
      updateCurrentSession,
      renameProject,
      triggerSave,
    }, { onContinue });

    fireEvent.click(screen.getByTestId("lg-project-create-from-ops"));

    expect(setConfig).toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledWith("world");
    await waitFor(() => {
      expect(triggerSave).toHaveBeenCalledTimes(1);
    });
  });

  it("작품 보관함에서 선택은 작품 기준만 바꾸고 작업 열기는 이어서 작업할 단계로 이동한다", () => {
    const setCurrentProjectId = jest.fn();
    const setCurrentSessionId = jest.fn();
    const onContinue = jest.fn();
    const projectA = {
      id: "project-a",
      name: "작품 A",
      description: "",
      genre: "FANTASY",
      createdAt: 1,
      lastUpdate: 1,
      sessions: [
        {
          id: "session-a",
          title: "작품 A",
          messages: [],
          config: {
            genre: "FANTASY",
            povCharacter: "",
            setting: "",
            primaryEmotion: "",
            episode: 1,
            title: "작품 A",
            totalEpisodes: 60,
            synopsis: "",
            guardrails: { min: 5500, max: 7000 },
            characters: [],
            platform: "WEB",
          },
          lastUpdate: 1,
        },
      ],
    };
    const projectB = {
      id: "project-b",
      name: "작품 B",
      description: "",
      genre: "FANTASY",
      createdAt: 2,
      lastUpdate: 2,
      sessions: [
        {
          id: "session-b",
          title: "작품 B",
          messages: [],
          config: {
            genre: "FANTASY",
            povCharacter: "",
            setting: "세계관 기준",
            primaryEmotion: "",
            episode: 1,
            title: "작품 B",
            totalEpisodes: 60,
            synopsis: "",
            guardrails: { min: 5500, max: 7000 },
            characters: [],
            platform: "WEB",
          },
          lastUpdate: 2,
        },
      ],
    };

    renderProjectStart({
      language: "KO",
      currentSession: projectA.sessions[0],
      currentProjectId: "project-a",
      currentProject: projectA,
      projects: [projectA, projectB],
      setCurrentProjectId,
      setCurrentSessionId,
    }, { onContinue });

    fireEvent.click(screen.getByTestId("lg-project-select-project-b"));

    expect(setCurrentProjectId).toHaveBeenCalledWith("project-b");
    expect(setCurrentSessionId).toHaveBeenCalledWith("session-b");
    expect(onContinue).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("lg-project-open-project-b"));

    expect(setCurrentProjectId).toHaveBeenCalledWith("project-b");
    expect(setCurrentSessionId).toHaveBeenCalledWith("session-b");
    expect(onContinue).toHaveBeenCalledWith("world");
  });

  it("저장된 작품으로 재진입하면 프로젝트 기준 입력값을 폼에 복원한다", async () => {
    renderProjectStart({
      language: "KO",
      currentSession: {
        id: "session-rehydrate",
        title: "세션 제목은 보조값",
        messages: [],
        config: {
          genre: "FANTASY",
          genreMode: "drama",
          povCharacter: "",
          setting: "[권리/IP 메모]\n세팅 메모의 권리 문장",
          primaryEmotion: "",
          episode: 1,
          title: "설정 안의 작품명",
          totalEpisodes: 88,
          synopsis: "시놉시스 보조값",
          corePremise: "재진입 후에도 유지되어야 하는 핵심 전제",
          guardrails: { min: 5500, max: 7000 },
          characters: [],
          platform: "WEB",
          publishPlatform: "WEBNOVEL",
          projectTargetLanguage: "EN",
          targetMarket: "US",
          releasePurpose: "ip_pitch",
          rightsStatus: "co_created",
          targetEpisodeLength: "6,000자 내외",
          releaseCadence: "주 5회",
          rightsNote: "공동기획자 검토 후 출고",
        },
        lastUpdate: 1,
      },
      currentProjectId: "project-rehydrate",
      currentProject: {
        id: "project-rehydrate",
        name: "재진입 프로젝트명",
        description: "",
        genre: "FANTASY",
        createdAt: 1,
        lastUpdate: 1,
        sessions: [],
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("작품명")).toHaveValue("재진입 프로젝트명");
    });

    expect(screen.getByLabelText("출고 형태")).toHaveValue("drama");
    expect(screen.getByLabelText("대상 언어권")).toHaveValue("EN");
    expect(screen.getByLabelText("국가·언어권 기준")).toHaveValue("US");
    expect(screen.getByLabelText("출고 목적")).toHaveValue("ip_pitch");
    expect(screen.getByLabelText("출고 플랫폼")).toHaveValue("WEBNOVEL");
    expect(screen.getByLabelText("권리 상태")).toHaveValue("co_created");
    expect(screen.getByLabelText("목표 회차")).toHaveValue("88");
    expect(screen.getByLabelText("회차당 분량")).toHaveValue("6,000자 내외");
    expect(screen.getByLabelText("연재·출고 주기")).toHaveValue("주 5회");
    expect(screen.getByLabelText("핵심 전제")).toHaveValue("재진입 후에도 유지되어야 하는 핵심 전제");
    expect(screen.getByLabelText("권리/IP 메모")).toHaveValue("공동기획자 검토 후 출고");
  });

  it("예전 안내 문구는 권리/IP 메모 입력값으로 복원하지 않는다", async () => {
    renderProjectStart({
      language: "KO",
      currentSession: {
        id: "session-legacy-rights-note",
        title: "권리 안내 잔재",
        messages: [],
        config: {
          genre: "FANTASY",
          povCharacter: "",
          setting: "[프로젝트 기준점]\n권리 상태: 작가 단독 창작\n\n[권리/IP 메모]\n원작자, 공동기획, 외부자료, 상업 이용 예정 여부 확인 필요",
          primaryEmotion: "",
          episode: 1,
          title: "권리 안내 잔재",
          totalEpisodes: 60,
          synopsis: "",
          guardrails: { min: 5500, max: 7000 },
          characters: [],
          platform: "WEB",
        },
        lastUpdate: 1,
      },
      currentProjectId: "project-legacy-rights-note",
      currentProject: {
        id: "project-legacy-rights-note",
        name: "권리 안내 잔재",
        description: "",
        genre: "FANTASY",
        createdAt: 1,
        lastUpdate: 1,
        sessions: [],
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("작품명")).toHaveValue("권리 안내 잔재");
    });

    expect(screen.getByLabelText("권리/IP 메모")).toHaveValue("");
    expect(within(screen.getByLabelText("세계관 기준선 미리보기")).getByText("필요할 때 보강")).toBeInTheDocument();
  });

  it("프로젝트 첫 화면에서 세계관 기준선과 권리/IP 메모를 먼저 보여준다", () => {
    renderProjectStart({ language: "KO" });

    expect(screen.getByLabelText("노아 인터뷰")).toBeInTheDocument();
    const priority = screen.getByLabelText("세계관 기준선 미리보기");
    expect(within(priority).getByText("세계관 기준선")).toBeInTheDocument();
    expect(within(priority).getByText("소설 · 한국")).toBeInTheDocument();
    expect(within(priority).getByText("세계관에서 이어서 작성")).toBeInTheDocument();
    expect(within(priority).getByText("분량은 나중에 정해도 됩니다")).toBeInTheDocument();
    expect(within(priority).getByText("필요할 때 보강")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("핵심 전제"), {
      target: { value: "도시의 기억이 매일 리셋된다" },
    });
    expect(screen.getByLabelText("핵심 전제")).toHaveValue("도시의 기억이 매일 리셋된다");
    fireEvent.change(screen.getByLabelText("출고 형태"), {
      target: { value: "game" },
    });
    fireEvent.change(screen.getByLabelText("대상 언어권"), {
      target: { value: "EN" },
    });
    fireEvent.change(screen.getByLabelText("출고 플랫폼"), {
      target: { value: "ROYAL_ROAD" },
    });
    fireEvent.change(screen.getByLabelText("권리/IP 메모"), {
      target: { value: "MODEL-TEST-INPUT 작가 단독 창작, 외부자료 없음" },
    });

    expect(within(priority).getByText("도시의 기억이 매일 리셋된다")).toBeInTheDocument();
    expect(within(priority).getByText("게임 · 미국·영어권")).toBeInTheDocument();
    expect(within(priority).getByText("MODEL-TEST-INPUT 작가 단독 창작, 외부자료 없음")).toBeInTheDocument();
  });

  it("프로젝트 삭제 확인 토큰은 현재 언어의 안내 문구와 같은 값을 사용한다", () => {
    const deleteProject = jest.fn();
    renderProjectStart({
      language: "EN",
      currentProjectId: "project-en",
      currentProject: {
        id: "project-en",
        name: "English Project",
        description: "",
        genre: "SF",
        createdAt: 1,
        lastUpdate: 1,
        sessions: [],
      },
      projects: [
        {
          id: "project-en",
          name: "English Project",
          description: "",
          genre: "SF",
          createdAt: 1,
          lastUpdate: 1,
          sessions: [],
        },
      ],
      deleteProject,
    });

    const confirmInput = screen.getByTestId("lg-project-delete-confirm");
    const deleteButton = screen.getByTestId("lg-project-delete");

    expect(screen.getByText(/Type only/)).toBeInTheDocument();
    expect(confirmInput).toHaveAttribute("placeholder", "DELETE");
    expect(deleteButton).toBeDisabled();

    fireEvent.change(confirmInput, { target: { value: "DELETE" } });
    expect(deleteButton).toBeEnabled();

    fireEvent.click(deleteButton);
    expect(deleteProject).toHaveBeenCalledWith("project-en");
  });

  it("작품 선택 시 해당 작품의 최신 회차를 함께 선택한다", () => {
    const setCurrentProjectId = jest.fn();
    const setCurrentSessionId = jest.fn();

    renderProjectStart({
      currentProjectId: "project-a",
      setCurrentProjectId,
      setCurrentSessionId,
      projects: [
        {
          id: "project-a",
          name: "A",
          description: "",
          genre: "SF",
          createdAt: 1,
          lastUpdate: 1,
          sessions: [
            {
              id: "session-a",
              title: "A 회차",
              messages: [],
              lastUpdate: 1,
              config: {
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
              },
            },
          ],
        },
        {
          id: "project-b",
          name: "B",
          description: "",
          genre: "SF",
          createdAt: 2,
          lastUpdate: 20,
          sessions: [
            {
              id: "session-b-old",
              title: "B 이전",
              messages: [],
              lastUpdate: 10,
              config: {
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
              },
            },
            {
              id: "session-b-new",
              title: "B 최신",
              messages: [],
              lastUpdate: 30,
              config: {
                genre: "FANTASY",
                povCharacter: "",
                setting: "",
                primaryEmotion: "",
                episode: 2,
                title: "",
                totalEpisodes: 60,
                synopsis: "",
                guardrails: { min: 5500, max: 7000 },
                characters: [],
                platform: "WEB",
              },
            },
          ],
        },
      ],
    });

    fireEvent.change(screen.getByTestId("lg-project-list"), {
      target: { value: "project-b" },
    });

    expect(setCurrentProjectId).toHaveBeenCalledWith("project-b");
    expect(setCurrentSessionId).toHaveBeenCalledWith("session-b-new");
  });

  it("파일 선택 후 프로젝트 기준과 충돌하는 후보를 검토 필요로 표시한다", async () => {
    const { container } = renderProjectStart();
    const input = openImportFileInput(container);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("accept", ".txt,.md,.json,.docx,.hwpx,.pdf,.epub");
    expect(screen.getByText(/TXT, MD, JSON, DOCX, HWPX, PDF, EPUB을 지원합니다/)).toBeInTheDocument();

    const file = makeTextFile(
      "royal-road-outline.md",
      [
        "# Royal Road 제출 메모",
        "Royal Road submission chapter outline.",
        "출판 피칭과 영어권 독자 반응을 기준으로 정리한 세계관 메모입니다.",
      ].join("\n"),
    );

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("검토 필요")).toBeInTheDocument();
    });

    expect(screen.getByText("기준 확인")).toBeInTheDocument();
    expect(screen.getByText("대상 언어권 확인")).toBeInTheDocument();
    expect(screen.getByText("국가·언어권 기준 확인")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /검토 후 반영/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /큰 보기/ }));

    const dialog = await screen.findByRole("dialog", { name: "Royal Road 제출 메모" });
    expect(within(dialog).getByText("기준 확인")).toBeInTheDocument();
    expect(within(dialog).getByText("대상 언어권 확인")).toBeInTheDocument();
    expect(within(dialog).getByText(/Royal Road submission chapter outline/)).toBeInTheDocument();
  });

  it("검토 필요 자료 반영 전 기준 반영 제안을 적용할 수 있다", async () => {
    const { container } = renderProjectStart();
    const input = openImportFileInput(container);
    const file = makeTextFile(
      "royal-road-outline.md",
      [
        "# Royal Road 제출 메모",
        "Royal Road submission chapter outline.",
        "출판 피칭과 영어권 독자 반응을 기준으로 정리한 세계관 메모입니다.",
      ].join("\n"),
    );

    fireEvent.change(input, { target: { files: [file] } });

    const reviewButton = await screen.findByRole("button", { name: /검토 후 반영/ });
    fireEvent.click(reviewButton);

    const dialog = await screen.findByRole("dialog", { name: "기준 확인 후 반영" });
    expect(within(dialog).getByText("기준 반영 제안")).toBeInTheDocument();
    expect(within(dialog).getByText("대상 언어권")).toBeInTheDocument();
    expect(within(dialog).getByText("한국어 → 영어권")).toBeInTheDocument();
    expect(within(dialog).getByText("국가·언어권 기준")).toBeInTheDocument();
    expect(within(dialog).getByText("한국 → 미국·영어권")).toBeInTheDocument();
    expect(within(dialog).getByText("출고 플랫폼")).toBeInTheDocument();
    expect(within(dialog).getByText("미정 → Royal Road")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /기준 반영 후 적용/ }));

    await waitFor(() => {
      expect(screen.getByText("반영됨")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("대상 언어권")).toHaveValue("EN");
    expect(screen.getByLabelText("국가·언어권 기준")).toHaveValue("US");
    expect(screen.getByLabelText("출고 플랫폼")).toHaveValue("ROYAL_ROAD");
  });

  it("열린 세션에서는 반영 자료를 구조화된 프로젝트 가져오기 목록에 저장한다", async () => {
    let config: StoryConfig = makeStoryConfig({
      publishPlatform: PublishPlatform.MUNPIA,
      projectTargetLanguage: "KO",
      targetMarket: "KR",
      releasePurpose: "serial",
    });
    const setConfig = jest.fn((next: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
      config = typeof next === "function" ? next(config) : next;
    });
    const { container } = renderProjectStart({
      currentSession: {
        id: "session-1",
        title: "기존 프로젝트",
        messages: [],
        config,
        lastUpdate: 1,
      },
      currentProjectId: "project-1",
      setConfig,
    });
    const input = openImportFileInput(container);
    const file = makeTextFile(
      "royal-road-outline.md",
      [
        "# Royal Road 제출 메모",
        "Royal Road submission chapter outline.",
        "출판 피칭과 영어권 독자 반응을 기준으로 정리한 세계관 메모입니다.",
      ].join("\n"),
    );

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(config.importFileReports?.[0]).toBeDefined();
    });
    expect(config.importFileReports?.[0]).toMatchObject({
      fileName: "royal-road-outline.md",
      status: "success",
      candidateCount: 1,
    });

    fireEvent.click(await screen.findByRole("button", { name: /검토 후 반영/ }));
    const dialog = await screen.findByRole("dialog", { name: "기준 확인 후 반영" });
    fireEvent.click(within(dialog).getByRole("button", { name: /기준 반영 후 적용/ }));

    await waitFor(() => {
      expect(config.acceptedImportCandidates?.[0]).toBeDefined();
    });
    expect(config.projectTargetLanguage).toBe("EN");
    expect(config.targetMarket).toBe("US");
    expect(config.publishPlatform).toBe("ROYAL_ROAD");
    expect(config.acceptedImportCandidates?.[0]).toMatchObject({
      sourceFileName: "royal-road-outline.md",
      bucket: "world",
      targetType: "world",
      appliedBasisSuggestions: true,
    });
    expect(config.acceptedImportCandidates?.[0]?.alignmentWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "language-mismatch" }),
      ]),
    );
    expect(config.acceptedImportCandidates?.[0]?.basisSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "targetLanguage", value: "EN" }),
      ]),
    );
  });

  it("복원된 세션의 파일별 불러오기 결과를 다시 표시한다", async () => {
    const { container } = renderProjectStart({
      currentSession: {
        id: "session-restored",
        title: "복원 프로젝트",
        messages: [],
        lastUpdate: 1,
        config: {
          genre: "FANTASY",
          povCharacter: "",
          setting: "",
          primaryEmotion: "",
          episode: 1,
          title: "복원 프로젝트",
          totalEpisodes: 60,
          synopsis: "",
          guardrails: { min: 5500, max: 7000 },
          characters: [],
          platform: "WEB",
          importFileReports: [
            {
              id: "restored-report-1",
              fileName: "locked.pdf",
              status: "failed",
              detail: "암호가 걸린 PDF입니다.",
              candidateCount: 0,
              importedAt: "2026-06-13T03:00:00.000Z",
            },
            {
              id: "restored-report-2",
              fileName: "world.md",
              status: "success",
              detail: "1건 후보 생성",
              candidateCount: 1,
              importedAt: "2026-06-13T03:01:00.000Z",
            },
          ],
        },
      },
      currentProjectId: "project-restored",
    });

    openImportFileInput(container);
    const fileReports = await screen.findByLabelText("파일별 읽기 결과");
    expect(within(fileReports).getByText("locked.pdf")).toBeInTheDocument();
    expect(within(fileReports).getByText("읽기 실패")).toBeInTheDocument();
    expect(within(fileReports).getByText("암호가 걸린 PDF입니다.")).toBeInTheDocument();
    expect(within(fileReports).getByText("world.md")).toBeInTheDocument();
    expect(within(fileReports).getByText("자료 분류")).toBeInTheDocument();
  });

  it("DOCX 파일은 업로드 파이프라인으로 텍스트를 추출한 뒤 후보를 만든다", async () => {
    const getIdToken = jest.fn().mockResolvedValue("token-1");
    mockedLazyFirebaseAuth.mockResolvedValue({ currentUser: { getIdToken } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chapters: [
          {
            title: "세계관 메모",
            content: "세계관 배경과 역사, 세력, 국가, 마법 기술을 정리한 문서입니다.",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const { container } = renderProjectStart();
    const input = openImportFileInput(container);
    const file = new File([new Uint8Array([1, 2, 3])], "world-notes.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("세계관 메모")).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/upload",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer token-1" },
      }),
    );
    expect(screen.getByText(/world-notes\.docx · DOCX/)).toBeInTheDocument();
  });

  it("EPUB 파일도 업로드 파이프라인으로 텍스트를 추출한 뒤 후보를 만든다", async () => {
    const getIdToken = jest.fn().mockResolvedValue("token-epub");
    mockedLazyFirebaseAuth.mockResolvedValue({ currentUser: { getIdToken } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chapters: [
          {
            title: "프롤로그",
            content: "프롤로그. 회차 본문처럼 이어지는 긴 서술입니다. 주인공은 새벽의 문 앞에서 첫 선택을 한다.",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const { container } = renderProjectStart();
    const input = openImportFileInput(container);
    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "novel.epub", {
      type: "application/epub+zip",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("프롤로그")).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/upload",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer token-epub" },
      }),
    );
    expect(screen.getByText(/novel\.epub · EPUB/)).toBeInTheDocument();
  });

  it("HWPX 파일도 업로드 파이프라인으로 텍스트를 추출한 뒤 후보를 만든다", async () => {
    const getIdToken = jest.fn().mockResolvedValue("token-hwpx");
    mockedLazyFirebaseAuth.mockResolvedValue({ currentUser: { getIdToken } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chapters: [
          {
            title: "제 1화",
            content: "첫 HWPX 회차는 세계관 배경과 주인공의 목표를 정리한다. 권리 IP 메모도 함께 남긴다.",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const { container } = renderProjectStart();
    const input = openImportFileInput(container);
    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "manuscript.hwpx", {
      type: "application/hwp+zip",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("제 1화")).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/upload",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer token-hwpx" },
      }),
    );
    expect(screen.getByText(/manuscript\.hwpx · HWPX/)).toBeInTheDocument();
  });

  it("목차 없는 EPUB은 성공 후보를 유지하고 파일별 경고 이유를 남긴다", async () => {
    const getIdToken = jest.fn().mockResolvedValue("token-epub-nav");
    mockedLazyFirebaseAuth.mockResolvedValue({ currentUser: { getIdToken } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        warnings: ["missing-epub-navigation"],
        chapters: [
          {
            title: "Chapter 1",
            content: "목차 파일은 없지만 본문은 추출 가능한 EPUB 샘플입니다. 세계관 배경과 세력 정보를 포함합니다.",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    let config: StoryConfig = makeStoryConfig();
    const setConfig = jest.fn((next: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
      config = typeof next === "function" ? next(config) : next;
    });

    const { container } = renderProjectStart({
      currentSession: {
        id: "session-epub-nav",
        title: "EPUB 목차 경고",
        messages: [],
        config,
        lastUpdate: 1,
      },
      currentProjectId: "project-epub-nav",
      setConfig,
    });
    const input = openImportFileInput(container);
    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "novel-without-nav.epub", {
      type: "application/epub+zip",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(config.importFileReports?.[0]).toMatchObject({
        fileName: "novel-without-nav.epub",
        status: "success",
        candidateCount: 1,
        reasonCode: "missing-epub-navigation",
      });
    });
    const fileReports = screen.getByLabelText("파일별 읽기 결과");
    expect(within(fileReports).getByText(/EPUB 목차 정보 없음/)).toBeInTheDocument();
    expect(screen.getByText("Chapter 1")).toBeInTheDocument();
  });

  it("여러 파일 중 일부가 실패하거나 미지원이어도 성공 후보는 유지한다", async () => {
    mockedLazyFirebaseAuth.mockResolvedValue({ currentUser: null });

    const { container } = renderProjectStart();
    const input = openImportFileInput(container);
    const worldFile = makeTextFile(
      "world.md",
      [
        "# 세계관 메모",
        "세계관 배경과 역사, 세력, 국가, 마법 기술을 정리한 문서입니다.",
      ].join("\n"),
    );
    const lockedPdf = new File([new Uint8Array([1, 2, 3])], "locked.pdf", {
      type: "application/pdf",
    });
    const imageFile = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });

    fireEvent.change(input, { target: { files: [worldFile, lockedPdf, imageFile] } });

    await waitFor(() => {
      expect(screen.getByText("세계관 메모")).toBeInTheDocument();
    });
    expect(screen.getByText(/1\/2개 파일에서 반영할 자료 1건을 분류했습니다/)).toBeInTheDocument();
    expect(screen.getByText(/지원하지 않는 파일 1개는 건너뛰었습니다/)).toBeInTheDocument();
    expect(screen.getByText(/읽기 실패 1개: locked\.pdf/)).toBeInTheDocument();

    const fileReports = screen.getByLabelText("파일별 읽기 결과");
    expect(within(fileReports).getByText("world.md")).toBeInTheDocument();
    expect(within(fileReports).getByText("자료 분류")).toBeInTheDocument();
    expect(within(fileReports).getByText("1건 분류됨")).toBeInTheDocument();
    expect(within(fileReports).getByText("locked.pdf")).toBeInTheDocument();
    expect(within(fileReports).getByText("읽기 실패")).toBeInTheDocument();
    expect(within(fileReports).getByText("cover.png")).toBeInTheDocument();
    expect(within(fileReports).getByText("미지원")).toBeInTheDocument();
  });

  it("서버 추출 실패 이유를 파일별 기록 코드로 남긴다", async () => {
    const getIdToken = jest.fn().mockResolvedValue("token-1");
    mockedLazyFirebaseAuth.mockResolvedValue({ currentUser: { getIdToken } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "File content does not match declared type" }),
    }) as unknown as typeof fetch;

    let config: StoryConfig = makeStoryConfig();
    const setConfig = jest.fn((next: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
      config = typeof next === "function" ? next(config) : next;
    });

    const { container } = renderProjectStart({
      currentSession: {
        id: "session-import-failure",
        title: "불러오기 실패 기록",
        messages: [],
        config,
        lastUpdate: 1,
      },
      currentProjectId: "project-import-failure",
      setConfig,
    });
    const input = openImportFileInput(container);
    const file = new File([new Uint8Array([1, 2, 3])], "spoofed.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(config.importFileReports?.[0]).toMatchObject({
        fileName: "spoofed.pdf",
        status: "failed",
        candidateCount: 0,
        reasonCode: "magic-byte-mismatch",
      });
    });
    expect(screen.getAllByText("File content does not match declared type").length).toBeGreaterThan(0);
  });

  it("PDF 추출 결과가 비어 있으면 이미지 PDF 추정 이유를 남긴다", async () => {
    const getIdToken = jest.fn().mockResolvedValue("token-1");
    mockedLazyFirebaseAuth.mockResolvedValue({ currentUser: { getIdToken } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chapters: [] }),
    }) as unknown as typeof fetch;

    let config: StoryConfig = makeStoryConfig();
    const setConfig = jest.fn((next: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
      config = typeof next === "function" ? next(config) : next;
    });

    const { container } = renderProjectStart({
      currentSession: {
        id: "session-image-pdf",
        title: "이미지 PDF 기록",
        messages: [],
        config,
        lastUpdate: 1,
      },
      currentProjectId: "project-image-pdf",
      setConfig,
    });
    const input = openImportFileInput(container);
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "scan.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(config.importFileReports?.[0]).toMatchObject({
        fileName: "scan.pdf",
        status: "failed",
        candidateCount: 0,
        reasonCode: "image-only-source",
      });
    });
    expect(screen.getAllByText(/현재 OCR은 지원하지 않습니다/).length).toBeGreaterThan(0);
  });

  it("EPUB 추출 실패가 DRM 또는 손상 추정 이유로 남는다", async () => {
    const getIdToken = jest.fn().mockResolvedValue("token-epub");
    mockedLazyFirebaseAuth.mockResolvedValue({ currentUser: { getIdToken } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "DRM 또는 손상된 EPUB일 수 있습니다. DRM 없는 원본 파일을 확인해 주세요." }),
    }) as unknown as typeof fetch;

    let config: StoryConfig = makeStoryConfig();
    const setConfig = jest.fn((next: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
      config = typeof next === "function" ? next(config) : next;
    });

    const { container } = renderProjectStart({
      currentSession: {
        id: "session-drm-epub",
        title: "EPUB 실패 기록",
        messages: [],
        config,
        lastUpdate: 1,
      },
      currentProjectId: "project-drm-epub",
      setConfig,
    });
    const input = openImportFileInput(container);
    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "locked.epub", {
      type: "application/epub+zip",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(config.importFileReports?.[0]).toMatchObject({
        fileName: "locked.epub",
        status: "failed",
        candidateCount: 0,
        reasonCode: "drm-or-corrupt-epub",
      });
    });
    expect(screen.getAllByText(/DRM 또는 손상된 EPUB/).length).toBeGreaterThan(0);
  });

  it("지원하지 않는 파일만 고르면 파일별 미지원 결과를 보여준다", async () => {
    const { container } = renderProjectStart();
    const input = openImportFileInput(container);
    const imageFile = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });

    fireEvent.change(input, { target: { files: [imageFile] } });

    await waitFor(() => {
      expect(screen.getByText(/지원 형식은 .*\.hwpx, .*\.pdf, .*\.epub 입니다/)).toBeInTheDocument();
    });

    const fileReports = screen.getByLabelText("파일별 읽기 결과");
    expect(within(fileReports).getByText("cover.png")).toBeInTheDocument();
    expect(within(fileReports).getByText("미지원")).toBeInTheDocument();
    expect(within(fileReports).getByText("지원 형식 아님")).toBeInTheDocument();
  });

  it("DOCX/HWPX/PDF/EPUB 파일을 로그인 없이 고르면 이유를 안내한다", async () => {
    mockedLazyFirebaseAuth.mockResolvedValue({ currentUser: null });

    const { container } = renderProjectStart();
    const input = openImportFileInput(container);
    const file = new File([new Uint8Array([1, 2, 3])], "world-notes.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getAllByText("DOCX/HWPX/PDF/EPUB 파일 가져오기는 로그인 후 사용할 수 있습니다.").length).toBeGreaterThan(0);
    });
  });
});
