import {
  buildClaudeEffortConfig,
  buildGeminiThinkingConfig,
  getReasoningStageForTab,
  getStageReasoningLevel,
  getReasoningProviderMode,
  isReasoningLevel,
  resolveReasoningLevel,
} from "@/lib/ai-reasoning";

describe("ai-reasoning", () => {
  it("accepts only known reasoning levels", () => {
    expect(isReasoningLevel("auto")).toBe(true);
    expect(isReasoningLevel("low")).toBe(true);
    expect(isReasoningLevel("medium")).toBe(true);
    expect(isReasoningLevel("high")).toBe(true);
    expect(isReasoningLevel("xhigh")).toBe(false);
    expect(isReasoningLevel(1)).toBe(false);
  });

  it("maps provider and model to the supported reasoning control mode", () => {
    expect(getReasoningProviderMode("gemini", "gemini-3.1-pro-preview")).toBe("gemini");
    expect(getReasoningProviderMode("gemini", "gemini-2.5-flash")).toBe("gemini");
    expect(getReasoningProviderMode("claude", "claude-sonnet-4-6")).toBe("claude");
    expect(getReasoningProviderMode("openai", "gpt-5.5")).toBe("unsupported");
  });

  it("uses Gemini thinkingLevel for Gemini 3 models", () => {
    expect(buildGeminiThinkingConfig("high", "gemini-3.1-pro-preview")).toEqual({
      thinkingLevel: "HIGH",
    });
  });

  it("uses Gemini thinkingBudget for Gemini 2.5 models", () => {
    expect(buildGeminiThinkingConfig("low", "gemini-2.5-flash")).toEqual({
      thinkingBudget: 1024,
    });
    expect(buildGeminiThinkingConfig("high", "gemini-2.5-pro")).toEqual({
      thinkingBudget: 32768,
    });
  });

  it("keeps auto as provider default", () => {
    expect(buildGeminiThinkingConfig("auto", "gemini-3.1-pro-preview")).toBeUndefined();
    expect(buildClaudeEffortConfig("auto", "claude-sonnet-4-6")).toBeUndefined();
  });

  it("maps Claude work depth to output effort", () => {
    expect(buildClaudeEffortConfig("medium", "claude-opus-4-8")).toEqual({
      effort: "medium",
    });
  });

  it("maps work stages to automatic depth", () => {
    expect(getStageReasoningLevel("world")).toBe("high");
    expect(getStageReasoningLevel("character")).toBe("high");
    expect(getStageReasoningLevel("scene")).toBe("medium");
    expect(getStageReasoningLevel("draft")).toBe("medium");
    expect(getStageReasoningLevel("detail")).toBe("low");
    expect(getStageReasoningLevel("completion")).toBe("auto");
  });

  it("uses manual depth before automatic stage depth", () => {
    expect(resolveReasoningLevel("low", "world")).toBe("low");
    expect(resolveReasoningLevel("auto", "world")).toBe("high");
    expect(resolveReasoningLevel(undefined, "translation")).toBe("high");
  });

  it("derives a work stage from tab keys", () => {
    expect(getReasoningStageForTab("world")).toBe("world");
    expect(getReasoningStageForTab("character")).toBe("character");
    expect(getReasoningStageForTab("plot")).toBe("scene");
    expect(getReasoningStageForTab("direction")).toBe("direction");
    expect(getReasoningStageForTab("translation")).toBe("translation");
    expect(getReasoningStageForTab("writing")).toBe("draft");
  });
});
