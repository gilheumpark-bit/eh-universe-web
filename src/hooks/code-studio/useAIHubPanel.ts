// ============================================================
// Code Studio — AI Hub Panel Sub-hook
// Manages the list of toggleable AI features.
// ============================================================

import { useState, useCallback } from "react";
import type React from "react";
import type { AIFeature } from "@/components/code-studio/AIHub";

const DEFAULT_AI_FEATURES: Omit<AIFeature, "icon">[] = [
  { id: "ghost-text", name: "Ghost Text", description: "Inline code completion suggestions as you type", category: "generation", enabled: true, usageCount: 0 },
  { id: "chat-assist", name: "Chat Assistant", description: "AI chat for code questions and generation", category: "generation", enabled: true, usageCount: 0 },
  { id: "code-creator", name: "Code Creator", description: "Generate entire files from natural language", category: "generation", enabled: true, usageCount: 0 },
  { id: "autopilot", name: "Autopilot", description: "Autonomous multi-step code generation", category: "automation", enabled: false, usageCount: 0 },
  { id: "bug-scan", name: "Bug Scanner", description: "Static analysis to detect potential bugs", category: "analysis", enabled: true, usageCount: 0 },
  { id: "pipeline-analysis", name: "Pipeline Analysis", description: "8-team static analysis pipeline", category: "analysis", enabled: true, usageCount: 0 },
  { id: "code-review", name: "AI Code Review", description: "Automated code review with suggestions", category: "analysis", enabled: false, usageCount: 0 },
  { id: "stress-test", name: "Stress Testing", description: "Simulate edge cases and stress scenarios", category: "analysis", enabled: false, usageCount: 0 },
  { id: "safe-fix", name: "Safe Auto-Fix", description: "Automatically apply safe fixes from verification", category: "automation", enabled: true, usageCount: 0 },
  { id: "security-scan", name: "Security Scan", description: "Detect vulnerabilities and unsafe patterns", category: "security", enabled: true, usageCount: 0 },
];

/** AI Hub panel — feature toggle list. */
export function useAIHubPanel() {
  const [aiFeatures, setAiFeatures] = useState<AIFeature[]>(() =>
    DEFAULT_AI_FEATURES.map((f) => ({ ...f, icon: null as unknown as React.ReactNode })),
  );

  const toggleAiFeature = useCallback((id: string, enabled: boolean) => {
    setAiFeatures((prev) => prev.map((f) => f.id === id ? { ...f, enabled } : f));
  }, []);

  return { aiFeatures, toggleAiFeature };
}
