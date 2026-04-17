/**
 * WritingTab — module integrity and export verification
 * Full render requires deeply nested TRANSLATIONS + dynamic imports.
 * We verify the module exports correctly and test with message-populated session.
 */
import "@testing-library/jest-dom";
import type { ComponentProps, RefObject } from "react";
import { createRef } from "react";
import { render } from "@testing-library/react";

// Must mock dynamic before importing the component
jest.mock("next/dynamic", () => () => {
  const MockComponent = () => <div data-testid="dynamic-mock">Dynamic</div>;
  MockComponent.displayName = "DynamicMock";
  return MockComponent;
});

jest.mock("@/lib/i18n", () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, t: { ko: string }) => t.ko,
}));

// Provide full translations with presets at root
jest.mock("@/lib/studio-translations", () => ({
  TRANSLATIONS: {
    KO: {
      presets: ["프리셋1", "프리셋2"],
      writing: {},
      engine: { startPrompt: "시작" },
      sidebar: {},
    },
    EN: {
      presets: ["Preset1", "Preset2"],
      writing: {},
      engine: { startPrompt: "Start" },
      sidebar: {},
    },
  },
}));

import WritingTab from "../studio/tabs/WritingTab";
import { INITIAL_CONFIG } from "@/hooks/useProjectManager";
import { Genre } from "@/lib/studio-types";
import { DEFAULT_SETTINGS } from "@/components/studio/AdvancedWritingPanel";

const noop = () => {};

describe("WritingTab", () => {
  it("exports a valid React component", () => {
    expect(WritingTab).toBeDefined();
    expect(typeof WritingTab).toBe("function");
  });

  it("renders with messages-populated session (bypasses empty-state presets)", () => {
    const messagesEndRef = createRef<HTMLDivElement>();
    const el = document.createElement("div");
    messagesEndRef.current = el;
    const messagesEndRefTyped = messagesEndRef as RefObject<HTMLDivElement>;

    const propsWithMessages = {
      language: "KO" as const,
      currentSession: {
        id: "test-session",
        title: "Test",
        config: { ...INITIAL_CONFIG, genre: Genre.SF },
        messages: [
          {
            id: "m1",
            role: "user" as const,
            content: "Hello",
            timestamp: Date.now(),
            versions: [],
          },
        ],
        lastUpdate: Date.now(),
      },
      currentSessionId: "test-session",
      updateCurrentSession: noop,
      writingMode: "edit" as const,
      setWritingMode: noop,
      editDraft: "some text",
      setEditDraft: noop,
      canvasContent: "",
      setCanvasContent: noop,
      canvasPass: 0,
      setCanvasPass: noop,
      promptDirective: "",
      setPromptDirective: noop,
      isGenerating: false,
      lastReport: null,
      handleSend: noop,
      handleCancel: noop,
      handleRegenerate: noop,
      handleVersionSwitch: noop,
      handleTypoFix: noop,
      messagesEndRef: messagesEndRefTyped,
      searchQuery: "",
      filteredMessages: [],
      hasApiKey: false,
      setShowApiKeyModal: noop,
      setActiveTab: noop,
      advancedSettings: DEFAULT_SETTINGS,
      setAdvancedSettings: noop,
      input: "",
      setInput: noop,
      showDashboard: false,
      handleNextEpisode: noop,
    } satisfies ComponentProps<typeof WritingTab>;

    const { container } = render(
      <WritingTab {...propsWithMessages} />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
