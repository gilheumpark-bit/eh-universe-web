export const REASONING_LEVELS = ["auto", "low", "medium", "high"] as const;

export type ReasoningLevel = (typeof REASONING_LEVELS)[number];

export type ReasoningProviderMode = "gemini" | "claude" | "unsupported";
export type ReasoningStage =
  | "world"
  | "character"
  | "scene"
  | "direction"
  | "draft"
  | "detail"
  | "completion"
  | "translation"
  | "translation-review"
  | "summary"
  | "chat";

export const NOA_REASONING_LEVEL_KEY = "noa_lg_reasoning_level";
export const NOA_REASONING_LEVEL_CHANGED_EVENT = "noa:reasoning-level-changed";

type GeminiThinkingLevel = "LOW" | "MEDIUM" | "HIGH";

export interface GeminiThinkingConfig {
  thinkingLevel?: GeminiThinkingLevel;
  thinkingBudget?: number;
}

export interface ClaudeEffortConfig {
  effort: "low" | "medium" | "high";
}

export function isReasoningLevel(value: unknown): value is ReasoningLevel {
  return typeof value === "string" && REASONING_LEVELS.includes(value as ReasoningLevel);
}

export function getStoredReasoningLevel(): ReasoningLevel {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = window.localStorage.getItem(NOA_REASONING_LEVEL_KEY);
    return isReasoningLevel(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

export function setStoredReasoningLevel(level: ReasoningLevel): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOA_REASONING_LEVEL_KEY, level);
  } catch {
    /* private browsing — the current request still carries the in-memory selection */
  }
  window.dispatchEvent(new Event(NOA_REASONING_LEVEL_CHANGED_EVENT));
}

export function subscribeReasoningLevel(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NOA_REASONING_LEVEL_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(NOA_REASONING_LEVEL_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getReasoningProviderMode(provider: string, model: string): ReasoningProviderMode {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModel = model.toLowerCase();

  if (normalizedProvider === "gemini" && /gemini-(?:2\.5|3)/.test(normalizedModel)) {
    return "gemini";
  }

  if (normalizedProvider === "claude" && normalizedModel.startsWith("claude-")) {
    return "claude";
  }

  return "unsupported";
}

export function supportsReasoningControl(provider: string, model: string): boolean {
  return getReasoningProviderMode(provider, model) !== "unsupported";
}

export function getStageReasoningLevel(stage: ReasoningStage | undefined): ReasoningLevel {
  switch (stage) {
    case "world":
    case "character":
    case "translation":
    case "translation-review":
      return "high";
    case "scene":
    case "direction":
    case "draft":
    case "chat":
      return "medium";
    case "detail":
    case "summary":
      return "low";
    case "completion":
      return "auto";
    default:
      return "auto";
  }
}

export function getReasoningStageForTab(tabKey: string | undefined): ReasoningStage {
  const normalized = (tabKey ?? "").toLowerCase();
  if (normalized.includes("world")) return "world";
  if (normalized.includes("character") || normalized.includes("char")) return "character";
  if (normalized.includes("scene") || normalized.includes("plot")) return "scene";
  if (normalized.includes("direction") || normalized.includes("style")) return "direction";
  if (normalized.includes("translate") || normalized.includes("translation")) return "translation";
  if (normalized.includes("writing") || normalized.includes("manuscript")) return "draft";
  return "chat";
}

export function resolveReasoningLevel(
  requested: ReasoningLevel | undefined,
  stage?: ReasoningStage,
): ReasoningLevel {
  if (requested && requested !== "auto") return requested;
  return getStageReasoningLevel(stage);
}

export function buildGeminiThinkingConfig(
  level: ReasoningLevel | undefined,
  model: string,
): GeminiThinkingConfig | undefined {
  if (!level || level === "auto") return undefined;

  const normalizedModel = model.toLowerCase();
  if (normalizedModel.includes("gemini-3")) {
    return { thinkingLevel: level.toUpperCase() as GeminiThinkingLevel };
  }

  if (normalizedModel.includes("gemini-2.5")) {
    if (level === "low") return { thinkingBudget: 1024 };
    if (level === "medium") return { thinkingBudget: 8192 };
    return { thinkingBudget: normalizedModel.includes("pro") ? 32768 : 24576 };
  }

  return undefined;
}

export function buildClaudeEffortConfig(
  level: ReasoningLevel | undefined,
  model: string,
): ClaudeEffortConfig | undefined {
  if (!level || level === "auto") return undefined;
  if (!model.toLowerCase().startsWith("claude-")) return undefined;
  return { effort: level };
}
