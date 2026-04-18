// ============================================================
// PART 1 — mocks & imports
// ============================================================
import "@testing-library/jest-dom";
import React from "react";
import { render, fireEvent } from "@testing-library/react";

// next/image — stub with plain <img>
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { src: string; alt?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return React.createElement("img", props);
  },
}));

// i18n & language context — KO strings
jest.mock("@/lib/LangContext", () => ({ useLang: () => ({ lang: "ko" }) }));
jest.mock("@/lib/i18n", () => ({
  L4: (_lang: string, v: { ko: string; en: string }) => v.ko,
}));

// Logger — silent, trackable
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Feature flags
jest.mock("@/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({ IMAGE_GENERATION: true }),
}));

// DGX check — off for stable BYOK path
jest.mock("@/lib/ai-providers", () => ({
  hasDgxService: () => false,
}));

// Image generation service — never actually invoked in tests
jest.mock("@/services/imageGenerationService", () => ({
  generateImage: jest.fn().mockResolvedValue({ images: [], error: null }),
}));

// Visual prompt helpers — stable stubs
jest.mock("@/lib/visual-prompt", () => ({
  buildFinalVisualPrompt: () => "mock final prompt",
  buildNegativePrompt: () => "mock neg prompt",
  getLevelLabel: (n: number) => `L${n}`,
  buildLevelPromptFragment: () => "",
}));

// Visual defaults — mint predictable cards
jest.mock("@/lib/visual-defaults", () => ({
  DEFAULT_LEVELS: { subject: 2, background: 2, scene: 2, composition: 2, lighting: 2, style: 2 },
  VISUAL_PRESETS: [],
  createVisualCard: (episode: number) => ({
    id: `card-new-${episode}`,
    episode,
    title: "",
    shotType: "medium",
    targetUse: "scene",
    selectedCharacters: [],
    selectedObjects: [],
    levels: { subject: 2, background: 2, scene: 2, composition: 2, lighting: 2, style: 2 },
    subjectPrompt: "",
    backgroundPrompt: "",
    scenePrompt: "",
    compositionPrompt: "",
    lightingPrompt: "",
    stylePrompt: "",
    negativePrompt: "",
    moodTags: [],
    consistencyTags: [],
    createdAt: 1000,
    updatedAt: 1000,
  }),
  createCardFromAnalysis: () => [],
}));

// VisualPromptEditor — stub (deep internals out of scope for smoke test)
jest.mock("@/components/studio/VisualPromptEditor", () => ({
  __esModule: true,
  default: ({ card }: { card: { id: string } }) => (
    <div data-testid="visual-prompt-editor-mock">editor:{card.id}</div>
  ),
}));

import VisualTab from "../VisualTab";
import type { StoryConfig, VisualPromptCard } from "@/lib/studio-types";

// ============================================================
// PART 2 — fixtures
// ============================================================
function makeCard(id: string, overrides: Partial<VisualPromptCard> = {}): VisualPromptCard {
  return {
    id,
    episode: 1,
    title: `Card ${id}`,
    shotType: "medium",
    targetUse: "scene",
    selectedCharacters: [],
    selectedObjects: [],
    levels: { subject: 2, background: 2, scene: 2, composition: 2, lighting: 2, style: 2 },
    subjectPrompt: "",
    backgroundPrompt: "",
    scenePrompt: "",
    compositionPrompt: "",
    lightingPrompt: "",
    stylePrompt: "",
    negativePrompt: "",
    moodTags: [],
    consistencyTags: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  } as VisualPromptCard;
}

const baseConfig = {
  genre: "SF",
  episode: 1,
  totalEpisodes: 10,
  characters: [],
  visualPromptCards: [] as VisualPromptCard[],
  chapterAnalyses: [],
} as unknown as StoryConfig;

function renderTab(overrides: Partial<StoryConfig> = {}) {
  const setConfig = jest.fn();
  const utils = render(
    <VisualTab
      config={{ ...baseConfig, ...overrides }}
      setConfig={setConfig}
      currentSession={null}
      language="KO"
    />,
  );
  return { ...utils, setConfig };
}

// ============================================================
// PART 3 — tests
// ============================================================
describe("VisualTab", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders empty state banner when no cards exist", () => {
    const { container, getByText } = renderTab();
    expect(container.firstChild).toBeTruthy();
    // Guide banner only shows when cards.length === 0
    expect(
      getByText(/이미지 생성.*원고 Manuscript.*비주얼 노벨 모드로 재생/),
    ).toBeInTheDocument();
    // Empty-center prompt visible
    expect(getByText(/비주얼 카드를 선택하거나 생성하세요/)).toBeInTheDocument();
  });

  it("adds a new empty card via the + button and selects it", () => {
    const { setConfig, container } = renderTab();
    // The card-list "+" button is inside the left sidebar card list
    const plusButtons = container.querySelectorAll("button");
    // find the first button whose rendered innerHTML contains a Plus (lucide) svg
    // simpler: click the empty-state "빈 카드 만들기" button
    const emptyStateButton = Array.from(plusButtons).find(b =>
      /빈 카드 만들기/.test(b.textContent ?? ""),
    );
    expect(emptyStateButton).toBeTruthy();
    fireEvent.click(emptyStateButton!);
    expect(setConfig).toHaveBeenCalledTimes(1);
    const newConfig = setConfig.mock.calls[0][0];
    expect(newConfig.visualPromptCards).toHaveLength(1);
    expect(newConfig.visualPromptCards[0].id).toBe("card-new-1");
  });

  it("renders existing cards in the sidebar list and mounts editor when selected", () => {
    const cards = [makeCard("c1"), makeCard("c2", { episode: 2, title: "Scene 2" })];
    const { getByText, getByTestId } = renderTab({ visualPromptCards: cards });
    // Sidebar card list shows titles
    expect(getByText("Card c1")).toBeInTheDocument();
    expect(getByText("Scene 2")).toBeInTheDocument();
    // Editor for first card should NOT be mounted yet (selectedCardId starts null)
    // Click the first card button
    fireEvent.click(getByText("Card c1"));
    // Editor mock appears with the selected card id
    expect(getByTestId("visual-prompt-editor-mock")).toHaveTextContent("editor:c1");
  });

  it("migrates legacy localStorage API key to sessionStorage on mount", () => {
    // Seed a legacy key in localStorage and ensure sessionStorage is empty.
    localStorage.setItem("noa-img-apikey", "legacy-key-xyz");
    sessionStorage.removeItem("noa-img-apikey");

    try {
      renderTab();

      // Legacy slot is purged; session slot now carries the key.
      expect(localStorage.getItem("noa-img-apikey")).toBeNull();
      expect(sessionStorage.getItem("noa-img-apikey")).toBe("legacy-key-xyz");
    } finally {
      localStorage.removeItem("noa-img-apikey");
      sessionStorage.removeItem("noa-img-apikey");
    }
  });
});
