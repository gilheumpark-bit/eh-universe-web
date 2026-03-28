// ============================================================
// CSL 8-Team Pipeline — Shared Types
// Ported from csl_team_agent/shared/types.py
// ============================================================

export type PipelineStage =
  | "simulation" | "generation" | "validation" | "size-density"
  | "asset-trace" | "stability" | "release-ip" | "governance"
  | "multi-ai-review" | "Bug Finder";

export type InputType = "question" | "command" | "core_code";
export type UsageIntent = "default" | "poc" | "commercial";

export type TeamStatus = "pass" | "warn" | "fail" | "skip" | "running" | "pending";
export type Severity = "critical" | "major" | "minor" | "info";
export type TrustState = "trusted" | "degraded" | "untrusted";

export interface Finding {
  severity: Severity;
  message: string;
  line?: number;
  column?: number;
  rule?: string;
}

export interface Suggestion {
  type: "refactor" | "optimize" | "security" | "style";
  message: string;
  line?: number;
}

export interface TeamResult {
  team: PipelineStage;
  /** @deprecated Use `team` instead. Kept for backward-compat with components. */
  stage?: PipelineStage;
  status: TeamStatus;
  score: number;        // 0–100
  message: string;
  details?: string[];
  findings: Finding[];
  suggestions: Suggestion[];
  durationMs: number;
}

export interface PipelineContext {
  code: string;
  language: string;
  fileName: string;
  intent: string;
  usageIntent: UsageIntent;
  previousCode?: string;
}

export interface PipelineCallbacks {
  onTeamStart?: (team: PipelineStage) => void;
  onTeamComplete?: (result: TeamResult) => void;
  signal?: AbortSignal;
}

export interface PipelineResult {
  id: string;
  timestamp: number;
  overallStatus: "pass" | "warn" | "fail";
  overallScore: number;
  stages: TeamResult[];
  generatedCode?: string;
  diffSuggestion?: { original: string; modified: string };
}

// ── Beacon Config (Smart Beacon) ──

export interface BeaconConfig {
  minKb: number;
  targetKb: number;
  maxKb: number;
  linesPerKb: number;
  sigma: number;          // standard deviation for gaussian targeting
  intentBias: Record<UsageIntent, number>;  // multiplier: poc=-0.2, commercial=+0.15
}

export const DEFAULT_BEACON: BeaconConfig = {
  minKb: 1, targetKb: 5, maxKb: 50,
  linesPerKb: 25,
  sigma: 0.15,
  intentBias: { default: 0, poc: -0.2, commercial: 0.15 },
};
