import React from "react";
import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import VisualPanel from "@/components/loreguard/VisualPanel";
import { useStudio } from "@/app/studio/StudioContext";
import type { VisualPromptCard } from "@/lib/studio-types";

jest.mock("@/app/studio/StudioContext", () => ({
  useStudio: jest.fn(),
}));

jest.mock("@/hooks/useFocusTrap", () => ({
  useFocusTrap: jest.fn(),
}));

jest.mock("@/hooks/useBodyScrollLock", () => ({
  useBodyScrollLock: jest.fn(),
}));

jest.mock("@/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({ IMAGE_GENERATION: false }),
}));

jest.mock("@/lib/ai-providers", () => ({
  hasDgxService: () => false,
}));

jest.mock("@/services/imageGenerationService", () => ({
  generateImage: jest.fn(),
}));

const mockedUseStudio = useStudio as jest.Mock;

function openVisualPanel(): void {
  act(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-visual"));
  });
}

describe("VisualPanel legacy card safety", () => {
  beforeEach(() => {
    mockedUseStudio.mockReturnValue({
      currentSession: {
        id: "session-legacy-visual",
        title: "레거시 비주얼 프로젝트",
        messages: [],
        lastUpdate: 1,
        config: {
          episode: 1,
          setting: "권리를 사고파는 도시",
          primaryEmotion: "긴장",
          characters: [{ id: "char-1", name: "유나" }],
          visualPromptCards: [
            {
              id: "legacy-card",
              episode: 1,
              title: "레거시 카드",
              subjectPrompt: "은빛 문 앞의 유나",
              backgroundPrompt: "권리 경매장",
            } as unknown as VisualPromptCard,
          ],
        },
      },
      setConfig: jest.fn(),
      language: "KO",
    });
  });

  it("moodTags와 levels가 없는 예전 비주얼 카드도 패널을 깨지 않는다", async () => {
    render(<VisualPanel />);

    openVisualPanel();

    expect(await screen.findByRole("dialog", { name: "비주얼" })).toBeInTheDocument();
    expect(screen.getByText("레거시 카드")).toBeInTheDocument();
    expect(screen.getAllByText(/은빛 문 앞의 유나/).length).toBeGreaterThan(0);
    expect(screen.getByText("매체 변환 슬롯")).toBeInTheDocument();
    expect(screen.queryByText(/SECTION ERROR/i)).not.toBeInTheDocument();
  });
});
