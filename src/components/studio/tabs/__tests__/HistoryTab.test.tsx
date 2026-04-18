// ============================================================
// PART 1 — mocks & imports
// ============================================================
import "@testing-library/jest-dom";
import React from "react";
import { render, fireEvent } from "@testing-library/react";

jest.mock("@/lib/LangContext", () => ({ useLang: () => ({ lang: "ko" }) }));
jest.mock("@/lib/i18n", () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, v: { ko: string }) => v.ko,
}));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("@/components/studio/GenreReviewChat", () => ({
  __esModule: true,
  default: () => <div data-testid="genre-review-mock">GenreReview</div>,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { logger } = require("@/lib/logger");

import HistoryTab from "../HistoryTab";
import type { ChatSession, Project } from "@/lib/studio-types";

// ============================================================
// PART 2 — fixtures
// ============================================================
function makeSession(id: string, title: string, genre = "SF", lastUpdate = Date.now()): ChatSession {
  return {
    id,
    title,
    lastUpdate,
    messages: [],
    config: {
      genre,
      episode: 1,
      worldSimData: {},
      // 다른 필수 필드는 test-only narrowing으로 건드리지 않음
    } as unknown as ChatSession["config"],
  } as ChatSession;
}

const noop = () => {};

const baseProps = {
  language: "KO" as const,
  archiveScope: "project" as const,
  setArchiveScope: noop as (scope: "project" | "all") => void,
  archiveFilter: "ALL",
  setArchiveFilter: noop as (filter: string) => void,
  projects: [] as Project[],
  sessions: [] as ChatSession[],
  currentProject: null,
  currentProjectId: null,
  setCurrentProjectId: noop as (id: string) => void,
  currentSessionId: null,
  setCurrentSessionId: noop as (id: string | null) => void,
  setActiveTab: noop as (tab: "writing") => void,
  startRename: noop as (id: string, title: string) => void,
  renamingSessionId: null,
  setRenamingSessionId: noop as (id: string | null) => void,
  renameValue: "",
  setRenameValue: noop as (val: string) => void,
  confirmRename: noop,
  moveSessionToProject: noop as (sid: string, pid: string) => void,
  handlePrint: noop as (session?: ChatSession) => void,
  deleteSession: noop as (id: string) => void,
  currentSession: null,
};

// ============================================================
// PART 3 — tests (렌더 / 검색 / 삭제 확인 / 이동 실패)
// ============================================================
describe("HistoryTab", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders without crashing (empty archive shows noArchive text)", () => {
    const props = baseProps as React.ComponentProps<typeof HistoryTab>;
    const { container } = render(<HistoryTab {...props} />);
    expect(container.firstChild).toBeTruthy();
    // ALL 카테고리 버튼이 최소 1개 존재
    expect(container.querySelectorAll("button").length).toBeGreaterThan(0);
  });

  it("filters sessions by search query (title match)", () => {
    const sessions = [makeSession("a", "Alpha Quest"), makeSession("b", "Beta World")];
    const props = {
      ...baseProps,
      sessions,
      currentProject: { id: "p1", name: "Proj", sessions } as unknown as Project,
      currentProjectId: "p1",
    } as React.ComponentProps<typeof HistoryTab>;

    const { container, getByPlaceholderText } = render(<HistoryTab {...props} />);
    // 검색 전: 2 세션 카드
    expect(container.querySelectorAll("h4").length).toBe(2);

    const searchInput = getByPlaceholderText("제목 검색...") as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "alpha" } });

    const titles = Array.from(container.querySelectorAll("h4")).map((h) => h.textContent);
    expect(titles).toEqual(["Alpha Quest"]);
  });

  it("삭제 버튼 클릭 시 확인 다이얼로그 표시 + deleteSession 미호출", () => {
    const deleteSession = jest.fn();
    const sessions = [makeSession("a", "Alpha")];
    const props = {
      ...baseProps,
      sessions,
      currentProject: { id: "p1", name: "Proj", sessions } as unknown as Project,
      currentProjectId: "p1",
      deleteSession,
    } as React.ComponentProps<typeof HistoryTab>;

    const { container, getByRole } = render(<HistoryTab {...props} />);
    const deleteBtn = container.querySelector('button[aria-label="삭제"]') as HTMLButtonElement;
    fireEvent.click(deleteBtn);

    // 다이얼로그 나타남
    const dialog = getByRole("dialog");
    expect(dialog).toBeTruthy();
    // 삭제 함수 아직 호출되지 않음
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it("확인 다이얼로그에서 취소 클릭 시 deleteSession 미호출 + 다이얼로그 닫힘", () => {
    const deleteSession = jest.fn();
    const sessions = [makeSession("a", "Alpha")];
    const props = {
      ...baseProps,
      sessions,
      currentProject: { id: "p1", name: "Proj", sessions } as unknown as Project,
      currentProjectId: "p1",
      deleteSession,
    } as React.ComponentProps<typeof HistoryTab>;

    const { container, queryByRole } = render(<HistoryTab {...props} />);
    const trashBtn = container.querySelector('button[aria-label="삭제"]') as HTMLButtonElement;
    fireEvent.click(trashBtn);
    expect(queryByRole("dialog")).toBeTruthy();

    // 다이얼로그 내 취소 버튼 (다이얼로그 내부 첫 번째 취소)
    const dialog = queryByRole("dialog") as HTMLElement;
    const cancelBtn = Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "취소");
    expect(cancelBtn).toBeTruthy();
    fireEvent.click(cancelBtn!);

    expect(deleteSession).not.toHaveBeenCalled();
    expect(queryByRole("dialog")).toBeFalsy();
  });

  it("확인 다이얼로그에서 삭제 클릭 시 deleteSession 호출", () => {
    const deleteSession = jest.fn();
    const sessions = [makeSession("a", "Alpha")];
    const props = {
      ...baseProps,
      sessions,
      currentProject: { id: "p1", name: "Proj", sessions } as unknown as Project,
      currentProjectId: "p1",
      deleteSession,
    } as React.ComponentProps<typeof HistoryTab>;

    const { container, queryByRole } = render(<HistoryTab {...props} />);
    fireEvent.click(container.querySelector('button[aria-label="삭제"]') as HTMLButtonElement);

    const dialog = queryByRole("dialog") as HTMLElement;
    const confirmBtn = Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "삭제");
    expect(confirmBtn).toBeTruthy();
    fireEvent.click(confirmBtn!);

    expect(deleteSession).toHaveBeenCalledWith("a");
  });

  it("deleteSession 실패 시 다이얼로그 유지 + logger.warn 호출", () => {
    const err = new Error("boom");
    const deleteSession = jest.fn(() => {
      throw err;
    });
    const sessions = [makeSession("a", "Alpha")];
    const props = {
      ...baseProps,
      sessions,
      currentProject: { id: "p1", name: "Proj", sessions } as unknown as Project,
      currentProjectId: "p1",
      deleteSession,
    } as React.ComponentProps<typeof HistoryTab>;

    const { container, queryByRole } = render(<HistoryTab {...props} />);
    fireEvent.click(container.querySelector('button[aria-label="삭제"]') as HTMLButtonElement);
    const dialog = queryByRole("dialog") as HTMLElement;
    const confirmBtn = Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "삭제");
    fireEvent.click(confirmBtn!);

    expect(deleteSession).toHaveBeenCalledWith("a");
    expect(logger.warn).toHaveBeenCalled();
    // 다이얼로그 유지 (실패했으므로)
    expect(queryByRole("dialog")).toBeTruthy();
  });

  it("moveSessionToProject 실패 시 모달 유지 + 에러 메시지 표시", () => {
    const err = new Error("move boom");
    const moveSessionToProject = jest.fn(() => {
      throw err;
    });
    const sessions = [makeSession("a", "Alpha")];
    const projects = [
      { id: "p1", name: "Proj1", sessions } as unknown as Project,
      { id: "p2", name: "Proj2", sessions: [] } as unknown as Project,
      { id: "p3", name: "Proj3", sessions: [] } as unknown as Project,
    ];
    const props = {
      ...baseProps,
      projects,
      sessions,
      currentProject: projects[0],
      currentProjectId: "p1",
      moveSessionToProject,
    } as React.ComponentProps<typeof HistoryTab>;

    const { container, queryByRole } = render(<HistoryTab {...props} />);
    // 이동 버튼 클릭 → projects.length > 1 이므로 모달 오픈
    const moveBtn = container.querySelector('button[aria-label="이동"]') as HTMLButtonElement;
    expect(moveBtn).toBeTruthy();
    fireEvent.click(moveBtn);

    // 모달 내 select 변경 트리거
    const dialog = queryByRole("dialog") as HTMLElement;
    expect(dialog).toBeTruthy();
    const select = dialog.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "p2" } });

    expect(moveSessionToProject).toHaveBeenCalledWith("a", "p2");
    expect(logger.warn).toHaveBeenCalled();
    // 모달 유지
    expect(queryByRole("dialog")).toBeTruthy();
    // 에러 alert 렌더
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("이동 실패");
  });
});
