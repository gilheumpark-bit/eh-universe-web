import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import SplashScreen from "@/components/home/SplashScreen";

jest.mock("@/lib/LangContext", () => ({
  useLang: () => ({ lang: "ko", toggleLang: jest.fn() }),
}));

jest.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    signInWithGoogle: jest.fn(),
    isConfigured: false,
    loading: false,
  }),
}));

jest.mock("@/components/home/UnifiedSettingsBar", () => function UnifiedSettingsBarMock() {
  return <div data-testid="unified-settings-bar" />;
});

function renderSplash(overrides: Partial<React.ComponentProps<typeof SplashScreen>> = {}) {
  const props: React.ComponentProps<typeof SplashScreen> = {
    onUniverse: jest.fn(),
    onStudio: jest.fn(),
    onProjectManage: jest.fn(),
    onProjectImport: jest.fn(),
    onTranslationStudio: jest.fn(),
    ...overrides,
  };

  render(<SplashScreen {...props} />);
  return props;
}

describe("SplashScreen project menu", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("저장된 프로젝트가 있으면 작품 보관함 진입점으로 보낸다", async () => {
    localStorage.setItem("noa_projects_v2", JSON.stringify([{ id: "project-a", name: "AI-TEST-INPUT-A" }]));
    const props = renderSplash();

    fireEvent.click(screen.getByRole("button", { name: /작품 보관함/ }));
    const menu = await screen.findByRole("button", { name: /최근 프로젝트 열기/ });
    fireEvent.click(menu);

    expect(props.onProjectManage).toHaveBeenCalledTimes(1);
    expect(props.onStudio).not.toHaveBeenCalled();
  });

  it("저장된 프로젝트가 없으면 빈 상태 안내와 다음 행동을 보여준다", async () => {
    const props = renderSplash();

    fireEvent.click(screen.getByRole("button", { name: /작품 보관함/ }));
    fireEvent.click(await screen.findByRole("button", { name: /최근 프로젝트 열기/ }));

    const notice = await screen.findByRole("status");
    expect(within(notice).getByText("아직 저장된 프로젝트가 없습니다.")).toBeInTheDocument();
    expect(props.onProjectManage).not.toHaveBeenCalled();

    fireEvent.click(within(notice).getByRole("button", { name: "파일에서 불러오기" }));
    expect(props.onProjectImport).toHaveBeenCalledTimes(1);
  });

  it("새 프로젝트 만들기는 프로젝트 생성 첫 화면으로 보낸다", async () => {
    const props = renderSplash();

    fireEvent.click(screen.getByRole("button", { name: /작품 보관함/ }));
    const createButton = await screen.findByRole("button", { name: /새 프로젝트 만들기/ });
    fireEvent.click(createButton);

    expect(props.onStudio).toHaveBeenCalledTimes(1);
  });
});
