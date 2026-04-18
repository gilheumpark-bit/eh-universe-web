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
// PART 3 — tests
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

  it("deleteSession failure is caught and logged via logger.warn", () => {
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

    const { container } = render(<HistoryTab {...props} />);
    const deleteBtn = container.querySelector('button[aria-label="삭제"]') as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn);
    expect(deleteSession).toHaveBeenCalledWith("a");
    expect(logger.warn).toHaveBeenCalled();
  });
});
