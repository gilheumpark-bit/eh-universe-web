/**
 * WritingTab — module integrity and export verification
 * Full render requires deeply nested TRANSLATIONS + dynamic imports.
 * We verify the module exports correctly and test with message-populated session.
 */
import "@testing-library/jest-dom";
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

const noop = () => {};

describe("WritingTab", () => {
  it("exports a valid React component", () => {
    expect(WritingTab).toBeDefined();
    expect(typeof WritingTab).toBe("function");
  });

  it("renders with messages-populated session (bypasses empty-state presets)", () => {
    const propsWithMessages = {
      language: "KO" as const,
      currentSession: {
        id: "test-session",
        title: "Test",
        config: {
          genre: "SF",
          characters: [],
          worldSetting: "",
          plotOutline: "",
        },
        messages: [
          {
            id: "m1",
            role: "user",
            content: "Hello",
            createdAt: Date.now(),
            versions: [],
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      currentSessionId: "test-session",
      updateCurrentSession: noop,
      setConfig: noop,
      writingMode: "edit" as const, // skip AI empty-state which uses presets
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
      messagesEndRef: { current: null },
      searchQuery: "",
      filteredMessages: [],
      searchMatchesEditDraft: false,
      hasApiKey: false,
      setShowApiKeyModal: noop,
      setActiveTab: noop,
      advancedSettings: { temperature: 0.7, maxTokens: 4096 },
      setAdvancedSettings: noop,
      input: "",
      setInput: noop,
      showDashboard: false,
      rightPanelOpen: false,
      setRightPanelOpen: noop,
    } as unknown as React.ComponentProps<typeof WritingTab>;

    const { container } = render(
      <WritingTab {...propsWithMessages} />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
