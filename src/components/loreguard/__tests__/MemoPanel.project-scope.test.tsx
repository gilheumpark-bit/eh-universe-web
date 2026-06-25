import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import MemoPanel, { buildMemoStorageKey } from "@/components/loreguard/MemoPanel";

jest.mock("@/hooks/useFocusTrap", () => ({
  useFocusTrap: jest.fn(),
}));

jest.mock("@/hooks/useBodyScrollLock", () => ({
  useBodyScrollLock: jest.fn(),
}));

jest.mock("@/components/ErrorBoundary", () => ({
  reportError: jest.fn(),
}));

function openMemoPanel(): void {
  window.dispatchEvent(new CustomEvent("loreguard:open-memo"));
}

describe("MemoPanel project scope", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("buildMemoStorageKey는 프로젝트별 저장 키를 만든다", () => {
    expect(buildMemoStorageKey("project-A")).toBe("noa-lg-memos:project-A");
    expect(buildMemoStorageKey("작품 A")).toBe("noa-lg-memos:%EC%9E%91%ED%92%88%20A");
    expect(buildMemoStorageKey(null)).toBe("noa-lg-memos:no-project");
  });

  it("프로젝트를 바꾸면 메모 보드 내용이 섞이지 않는다", async () => {
    const { rerender } = render(<MemoPanel language="KO" projectId="project-A" />);

    openMemoPanel();
    expect(await screen.findByRole("dialog", { name: "메모 보드" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("새 메모"), {
      target: { value: "AI-TEST-INPUT A 프로젝트 메모" },
    });
    fireEvent.click(screen.getByRole("button", { name: "메모 추가" }));

    expect(screen.getByText("AI-TEST-INPUT A 프로젝트 메모")).toBeInTheDocument();
    expect(window.localStorage.getItem(buildMemoStorageKey("project-A"))).toContain(
      "AI-TEST-INPUT A 프로젝트 메모",
    );
    expect(window.localStorage.getItem(buildMemoStorageKey("project-B"))).toBeNull();

    rerender(<MemoPanel language="KO" projectId="project-B" />);

    await waitFor(() => {
      expect(screen.queryByText("AI-TEST-INPUT A 프로젝트 메모")).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("새 메모"), {
      target: { value: "AI-TEST-INPUT B 프로젝트 메모" },
    });
    fireEvent.click(screen.getByRole("button", { name: "메모 추가" }));

    expect(screen.getByText("AI-TEST-INPUT B 프로젝트 메모")).toBeInTheDocument();
    expect(window.localStorage.getItem(buildMemoStorageKey("project-B"))).toContain(
      "AI-TEST-INPUT B 프로젝트 메모",
    );

    rerender(<MemoPanel language="KO" projectId="project-A" />);

    expect(await screen.findByText("AI-TEST-INPUT A 프로젝트 메모")).toBeInTheDocument();
    expect(screen.queryByText("AI-TEST-INPUT B 프로젝트 메모")).not.toBeInTheDocument();
  });
});
