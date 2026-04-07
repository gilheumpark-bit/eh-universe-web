/**
 * HistoryTab — renders history list (smoke test)
 */
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import React from "react";
import HistoryTab from "../studio/tabs/HistoryTab";

jest.mock("@/lib/i18n", () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, t: { ko: string }) => t.ko,
}));

jest.mock("@/lib/studio-translations", () => ({
  TRANSLATIONS: {
    KO: { history: {}, engine: {} },
    EN: { history: {}, engine: {} },
  },
}));

// Mock GenreReviewChat (dynamic-ish dep)
jest.mock("@/components/studio/GenreReviewChat", () => ({
  __esModule: true,
  default: () => <div data-testid="genre-review-mock">GenreReview</div>,
}));

const noop = () => {};

const baseProps = {
  language: "KO" as const,
  archiveScope: "project" as const,
  setArchiveScope: noop as (scope: "project" | "all") => void,
  archiveFilter: "",
  setArchiveFilter: noop as (filter: string) => void,
  projects: [],
  sessions: [],
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
  handlePrint: noop as (session?: unknown) => void,
  deleteSession: noop as (id: string) => void,
  currentSession: null,
};

describe("HistoryTab", () => {
  it("renders without crashing", () => {
    const props = baseProps as React.ComponentProps<typeof HistoryTab>;
    const { container } = render(<HistoryTab {...props} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders scope toggle buttons", () => {
    const props = baseProps as React.ComponentProps<typeof HistoryTab>;
    const { container } = render(<HistoryTab {...props} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
