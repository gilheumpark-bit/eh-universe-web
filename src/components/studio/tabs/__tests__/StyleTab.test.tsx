// ============================================================
// PART 1 — mocks & imports
// ============================================================
import "@testing-library/jest-dom";
import React from "react";
import { render, fireEvent } from "@testing-library/react";

jest.mock("next/dynamic", () => () => {
  type StyleViewProps = {
    onProfileChange?: (p: unknown) => void;
    initialProfile?: unknown;
  };
  const Stub = (props: StyleViewProps) => (
    <div data-testid="style-studio-mock">
      <button
        data-testid="fire-profile"
        onClick={() => props.onProfileChange?.({ selectedDNA: [1], sliders: {}, checkedSF: [], checkedWeb: [] })}
      />
    </div>
  );
  Stub.displayName = "StyleStudioStub";
  return Stub;
});

jest.mock("@/lib/LangContext", () => ({ useLang: () => ({ lang: "ko" }) }));
jest.mock("@/lib/i18n", () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, v: { ko: string }) => v.ko,
}));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("@/components/studio/TabAssistant", () => ({
  __esModule: true,
  default: () => <div data-testid="tab-assistant-mock">TabAssistant</div>,
}));
jest.mock("@/components/studio/RhythmAnalyzer", () => ({
  __esModule: true,
  default: () => <div data-testid="rhythm-analyzer-mock">RhythmAnalyzer</div>,
}));

import StyleTab from "../StyleTab";
import type { StoryConfig, Message } from "@/lib/studio-types";

// ============================================================
// PART 2 — fixtures
// ============================================================
const baseConfig = {
  genre: "SF",
  episode: 1,
  styleProfile: { selectedDNA: [], sliders: {}, checkedSF: [], checkedWeb: [] },
} as unknown as StoryConfig;

const baseProps = {
  language: "KO" as const,
  config: baseConfig,
  updateCurrentSession: jest.fn(),
  triggerSave: jest.fn(),
  saveFlash: false,
  showAiLock: false,
  hostedProviders: {},
  messages: [] as Message[],
};

// ============================================================
// PART 3 — tests
// ============================================================
describe("StyleTab", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders without crashing and shows StyleStudio stub + TabAssistant (no messages)", () => {
    const { getByTestId, queryByTestId } = render(<StyleTab {...baseProps} />);
    expect(getByTestId("style-studio-mock")).toBeInTheDocument();
    expect(getByTestId("tab-assistant-mock")).toBeInTheDocument();
    // messages가 비어있으면 Rhythm 버튼/분석기 둘 다 미렌더
    expect(queryByTestId("rhythm-analyzer-mock")).toBeNull();
  });

  it("renders Rhythm toggle + RhythmAnalyzer when valid messages provided, and toggles off on click", () => {
    const msgs: Message[] = [
      { id: "m1", role: "user", content: "hello", timestamp: Date.now(), versions: [] },
      { id: "m2", role: "assistant", content: "world", timestamp: Date.now(), versions: [] },
    ];
    const { getByRole, queryByTestId } = render(<StyleTab {...baseProps} messages={msgs} />);
    // 기본 펼침 (showRhythm=true)
    expect(queryByTestId("rhythm-analyzer-mock")).toBeInTheDocument();
    // 토글 버튼 클릭 → 닫힘
    const toggle = getByRole("button", { name: /문장 리듬 분석 토글/ });
    fireEvent.click(toggle);
    expect(queryByTestId("rhythm-analyzer-mock")).toBeNull();
  });

  it("onProfileChange propagates into updateCurrentSession with merged config", () => {
    const updateCurrentSession = jest.fn();
    const { getByTestId } = render(
      <StyleTab {...baseProps} updateCurrentSession={updateCurrentSession} />,
    );
    fireEvent.click(getByTestId("fire-profile"));
    expect(updateCurrentSession).toHaveBeenCalledTimes(1);
    const arg = updateCurrentSession.mock.calls[0][0];
    expect(arg.config.styleProfile.selectedDNA).toEqual([1]);
    expect(arg.config.genre).toBe("SF");
  });
});
