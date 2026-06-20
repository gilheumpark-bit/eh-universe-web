import React from "react";
import { act, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import CpJournalPanel from "@/components/loreguard/CpJournalPanel";
import { useStudio } from "@/app/studio/StudioContext";

jest.mock("next/dynamic", () => {
  return () => function DynamicStub() {
    return <div data-testid="dynamic-view" />;
  };
});

jest.mock("@/app/studio/StudioContext", () => ({
  useStudio: jest.fn(),
}));

jest.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({ getIdToken: jest.fn() }),
}));

jest.mock("@/lib/creative-process/event-recorder", () => ({
  CREATIVE_EVENT_CAPTURED: "creative-event-captured",
  listCreativeEvents: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/creative/work-receipt-journal", () => ({
  loadJournal: jest.fn(() => []),
}));

jest.mock("@/lib/loreguard/candidate-decision-summary", () => ({
  summarizeCandidateDecisions: jest.fn(() => []),
}));

jest.mock("@/lib/browser/web-share", () => ({
  canShare: jest.fn(() => false),
  canShareFiles: jest.fn(() => false),
  shareFile: jest.fn(),
  shareText: jest.fn(),
}));

const mockedUseStudio = useStudio as jest.Mock;

describe("CpJournalPanel import file reports", () => {
  beforeEach(() => {
    mockedUseStudio.mockReturnValue({
      currentProjectId: "project-1",
      projects: [],
      language: "KO",
      currentSession: {
        id: "session-1",
        title: "불러오기 기록 프로젝트",
        messages: [],
        lastUpdate: 1,
        config: {
          title: "불러오기 기록 프로젝트",
          importFileReports: [
            {
              id: "report-1",
              fileName: "locked.pdf",
              status: "failed",
              detail: "암호가 걸린 PDF입니다.",
              candidateCount: 0,
              importedAt: "2026-06-13T03:00:00.000Z",
              reasonCode: "password-protected",
            },
            {
              id: "report-2",
              fileName: "world.md",
              status: "success",
              detail: "1건 후보 생성",
              candidateCount: 1,
              importedAt: "2026-06-13T03:01:00.000Z",
            },
          ],
        },
      },
    });
  });

  it("과정기록 패널에서 창작 확인서 기본 상태를 보여준다", async () => {
    render(<CpJournalPanel />);

    act(() => {
      window.dispatchEvent(new CustomEvent("loreguard:open-cp"));
    });

    const section = await screen.findByRole("dialog", { name: "창작 과정 확인서" });
    expect(within(section).getByText("0건 기록")).toBeInTheDocument();
    expect(within(section).getByText("기록된 창작 이벤트가 없습니다 — 집필을 시작하면 자동으로 기록됩니다")).toBeInTheDocument();
    expect(
      within(section).getByLabelText("창작 과정 확인서 발급 — HTML과 Markdown 다운로드"),
    ).toHaveTextContent("발급 불가 — 기록된 이벤트 없음");
  });
});
