// ============================================================
// PART 1 — mocks & imports (WorldTab depends on dynamic WorldStudioView)
// ============================================================
import "@testing-library/jest-dom";
import React from "react";
import { render, act } from "@testing-library/react";

// next/dynamic → 즉시 렌더되는 스텁. prop을 테스트에서 검증할 수 있게 전역 저장.
type HandleWorldSim = (d: Record<string, unknown>) => void;
const lastProps: { handleWorldSimChange?: HandleWorldSim } = {};
jest.mock("next/dynamic", () => () => {
  const MockWorldStudioView = (props: { handleWorldSimChange?: HandleWorldSim }) => {
    lastProps.handleWorldSimChange = props.handleWorldSimChange;
    return <div data-testid="world-studio-mock">WorldStudio</div>;
  };
  MockWorldStudioView.displayName = "MockWorldStudioView";
  return MockWorldStudioView;
});

jest.mock("@/lib/LangContext", () => ({ useLang: () => ({ lang: "ko" }) }));
jest.mock("@/lib/i18n", () => ({
  L4: (_lang: string, v: { ko: string }) => v.ko,
}));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { logger } = require("@/lib/logger");

import WorldTab from "../WorldTab";
import type { StoryConfig } from "@/lib/studio-types";

// ============================================================
// PART 2 — fixtures
// ============================================================
const baseConfig = {
  genre: "SF",
  episode: 1,
  worldSimData: {},
  styleProfile: { selectedDNA: [], sliders: {}, checkedSF: [], checkedWeb: [] },
} as unknown as StoryConfig;

const baseProps = {
  language: "KO" as const,
  config: baseConfig,
  setConfig: jest.fn(),
  onStart: jest.fn(),
  onSave: jest.fn(),
  saveFlash: false,
  updateCurrentSession: jest.fn(),
  currentSessionId: "s-1",
  hostedProviders: {},
};

// ============================================================
// PART 3 — tests
// ============================================================
describe("WorldTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastProps.handleWorldSimChange = undefined;
  });

  it("renders without crashing", () => {
    const { getByTestId } = render(<WorldTab {...baseProps} />);
    expect(getByTestId("world-studio-mock")).toBeInTheDocument();
  });

  it("handleWorldSimChange maps civ ids to names and pushes WorldSimData to updateCurrentSession", () => {
    const updateCurrentSession = jest.fn();
    render(<WorldTab {...baseProps} updateCurrentSession={updateCurrentSession} />);

    const payload: Record<string, unknown> = {
      civs: [
        { id: "c1", name: "Alpha", era: "Iron", color: "#fff", traits: ["curious"] },
        { id: "c2", name: "Beta", era: "Bronze", color: "#000", traits: [] },
        // [C] 잘못된 형상은 버려져야 함
        { id: "c3", name: 42, era: "Iron", color: "#fff", traits: [] },
      ],
      relations: [
        { from: "c1", to: "c2", type: "trade" },
        // [C] 누락 필드는 버려져야 함
        { from: "c1" },
      ],
      selectedGenre: "scifi",
      selectedLevel: 3,
    };

    act(() => {
      lastProps.handleWorldSimChange?.(payload);
    });

    expect(updateCurrentSession).toHaveBeenCalledTimes(1);
    const call = updateCurrentSession.mock.calls[0][0];
    expect(call.config.worldSimData.civs).toEqual([
      { name: "Alpha", era: "Iron", color: "#fff", traits: ["curious"] },
      { name: "Beta", era: "Bronze", color: "#000", traits: [] },
    ]);
    expect(call.config.worldSimData.relations).toEqual([
      { fromName: "Alpha", toName: "Beta", type: "trade" },
    ]);
    expect(call.config.worldSimData.selectedGenre).toBe("scifi");
    expect(call.config.worldSimData.selectedLevel).toBe(3);
  });

  it("skips update when currentSessionId is null, and logs warn on invalid payload", () => {
    const updateCurrentSession = jest.fn();
    render(
      <WorldTab {...baseProps} currentSessionId={null} updateCurrentSession={updateCurrentSession} />,
    );
    act(() => {
      lastProps.handleWorldSimChange?.({ civs: [] });
    });
    expect(updateCurrentSession).not.toHaveBeenCalled();

    // 재렌더: sessionId 있지만 payload가 비정상
    updateCurrentSession.mockClear();
    render(<WorldTab {...baseProps} updateCurrentSession={updateCurrentSession} />);
    act(() => {
      (lastProps.handleWorldSimChange as unknown as (v: unknown) => void)?.(null);
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});
