import { normalizeBrainTabId, type LoreguardBrainTabId } from "@/lib/noa/tab-expert-registry";

// ============================================================
// NOA App Brain Option 1 — pure apply policy
// ============================================================

export type AppBrainActionKind =
  | "noa_suggestion"
  | "manual_edit"
  | "bulk_apply"
  | "save"
  | "export"
  | "cloud_save"
  | "import"
  | "route_change"
  | "analysis"
  | "recovery";

export type AppBrainDecisionState =
  | "APPLY"
  | "PREVIEW"
  | "HOLD"
  | "SPLIT"
  | "PROTECT"
  | "RECORD"
  | "RECOVER";

export interface AppBrainPolicyScores {
  intentClarity?: number;
  contextFit?: number;
  reversibility?: number;
  expertConfidence?: number;
  evidenceFit?: number;
  userControl?: number;
  testability?: number;
  contentDamageRisk?: number;
  irreversibility?: number;
  externality?: number;
  scopeSize?: number;
  canonBreakRisk?: number;
  userIntentUnclear?: number;
  rightsOrPrivacyRisk?: number;
}

export interface AppBrainPolicyInput {
  actionKind: AppBrainActionKind;
  tabId?: unknown;
  scores?: AppBrainPolicyScores;
  approxChars?: number;
  targetCount?: number;
  crossesExternalBoundary?: boolean;
  touchesRightsOrPrivacy?: boolean;
  canApplyAtomically?: boolean;
}

export interface AppBrainDecisionEnvelope {
  decision: AppBrainDecisionState;
  tabId: LoreguardBrainTabId;
  actionKind: AppBrainActionKind;
  risk: number;
  readiness: number;
  reasonCodes: readonly string[];
  shouldInterruptTyping: boolean;
  requiresAuthorConfirm: boolean;
  receiptLevel: "none" | "light" | "full";
}

const DEFAULT_SCORES: Required<AppBrainPolicyScores> = {
  intentClarity: 0.58,
  contextFit: 0.58,
  reversibility: 0.7,
  expertConfidence: 0.56,
  evidenceFit: 0.52,
  userControl: 0.72,
  testability: 0.55,
  contentDamageRisk: 0.12,
  irreversibility: 0.12,
  externality: 0.08,
  scopeSize: 0.12,
  canonBreakRisk: 0.14,
  userIntentUnclear: 0.24,
  rightsOrPrivacyRisk: 0.08,
};

function clampScore(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function normalizeScores(input: AppBrainPolicyInput): Required<AppBrainPolicyScores> {
  const source = input.scores ?? {};
  const next = { ...DEFAULT_SCORES };
  for (const key of Object.keys(DEFAULT_SCORES) as Array<keyof AppBrainPolicyScores>) {
    next[key] = clampScore(source[key], DEFAULT_SCORES[key]);
  }

  const approxChars = Math.max(0, input.approxChars ?? 0);
  const targetCount = Math.max(0, input.targetCount ?? 0);
  if (approxChars >= 8_000) next.scopeSize = Math.max(next.scopeSize, 0.86);
  else if (approxChars >= 3_000) next.scopeSize = Math.max(next.scopeSize, 0.72);
  else if (approxChars >= 900) next.scopeSize = Math.max(next.scopeSize, 0.46);

  if (targetCount >= 8) next.scopeSize = Math.max(next.scopeSize, 0.82);
  else if (targetCount >= 3) next.scopeSize = Math.max(next.scopeSize, 0.68);

  if (input.crossesExternalBoundary) {
    next.externality = Math.max(next.externality, 0.82);
    next.reversibility = Math.min(next.reversibility, 0.42);
  }
  if (input.touchesRightsOrPrivacy) {
    next.rightsOrPrivacyRisk = Math.max(next.rightsOrPrivacyRisk, 0.86);
  }
  if (input.actionKind === "export" || input.actionKind === "cloud_save") {
    next.externality = Math.max(next.externality, 0.72);
  }
  if (input.actionKind === "bulk_apply") {
    next.scopeSize = Math.max(next.scopeSize, 0.72);
    next.contentDamageRisk = Math.max(next.contentDamageRisk, 0.48);
  }
  if (input.actionKind === "manual_edit") {
    next.userControl = Math.max(next.userControl, 0.9);
    next.reversibility = Math.max(next.reversibility, 0.82);
  }

  return next;
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function riskScore(scores: Required<AppBrainPolicyScores>): number {
  return roundScore(
    scores.contentDamageRisk * 0.22 +
      scores.irreversibility * 0.18 +
      scores.externality * 0.16 +
      scores.scopeSize * 0.14 +
      scores.canonBreakRisk * 0.12 +
      scores.userIntentUnclear * 0.1 +
      scores.rightsOrPrivacyRisk * 0.08,
  );
}

function readinessScore(scores: Required<AppBrainPolicyScores>, risk: number): number {
  return roundScore(
    scores.intentClarity * 0.2 +
      scores.contextFit * 0.18 +
      scores.reversibility * 0.16 +
      scores.expertConfidence * 0.14 +
      scores.evidenceFit * 0.12 +
      scores.userControl * 0.1 +
      scores.testability * 0.1 -
      risk * 0.25,
  );
}

function receiptLevelFor(decision: AppBrainDecisionState, input: AppBrainPolicyInput): AppBrainDecisionEnvelope["receiptLevel"] {
  if (decision === "RECORD") return input.actionKind === "manual_edit" ? "light" : "none";
  if (decision === "APPLY") return "light";
  return "full";
}

function decisionRequiresConfirm(decision: AppBrainDecisionState): boolean {
  return decision === "PREVIEW" || decision === "HOLD" || decision === "SPLIT" || decision === "PROTECT" || decision === "RECOVER";
}

export function decideAppBrain(input: AppBrainPolicyInput): AppBrainDecisionEnvelope {
  const tabId = normalizeBrainTabId(input.tabId);
  const scores = normalizeScores(input);
  const risk = riskScore(scores);
  const readiness = readinessScore(scores, risk);
  const reasonCodes: string[] = [];
  let decision: AppBrainDecisionState;

  if (input.actionKind === "recovery") {
    decision = "RECOVER";
    reasonCodes.push("recovery-path");
  } else if (input.actionKind === "analysis" || input.actionKind === "route_change") {
    decision = "RECORD";
    reasonCodes.push("non-mutating");
  } else if (input.actionKind === "manual_edit" && risk < 0.62) {
    decision = "RECORD";
    reasonCodes.push("author-direct-control");
  } else if (scores.rightsOrPrivacyRisk >= 0.82 || risk >= 0.82) {
    decision = "PROTECT";
    reasonCodes.push("high-risk-boundary");
  } else if (scores.externality >= 0.7 || scores.irreversibility >= 0.72) {
    decision = "PREVIEW";
    reasonCodes.push("external-or-hard-to-undo");
  } else if (scores.scopeSize >= 0.72 && input.canApplyAtomically === false) {
    decision = "SPLIT";
    reasonCodes.push("large-scope-split");
  } else if (scores.intentClarity < 0.45 || scores.contextFit < 0.35) {
    decision = "HOLD";
    reasonCodes.push("needs-author-direction");
  } else if (readiness >= 0.62 && risk < 0.58) {
    decision = "APPLY";
    reasonCodes.push("small-reversible-work");
  } else {
    decision = "PREVIEW";
    reasonCodes.push("review-before-apply");
  }

  return {
    decision,
    tabId,
    actionKind: input.actionKind,
    risk,
    readiness,
    reasonCodes,
    shouldInterruptTyping: decision === "PROTECT" || decision === "RECOVER",
    requiresAuthorConfirm: decisionRequiresConfirm(decision),
    receiptLevel: receiptLevelFor(decision, input),
  };
}

export function getDecisionProductLabel(decision: AppBrainDecisionState): string {
  switch (decision) {
    case "APPLY":
      return "바로 반영";
    case "PREVIEW":
      return "미리보기";
    case "HOLD":
      return "확인 필요";
    case "SPLIT":
      return "나눠 처리";
    case "PROTECT":
      return "보호 우선";
    case "RECORD":
      return "기록";
    case "RECOVER":
      return "복구";
  }
}

export function buildAppBrainDecisionDirective(envelope: AppBrainDecisionEnvelope): string {
  const base = [
    "[NOA APPLY POLICY — internal]",
    `state: ${envelope.decision}`,
    `tab: ${envelope.tabId}`,
    `action: ${envelope.actionKind}`,
    `risk: ${envelope.risk}`,
    `readiness: ${envelope.readiness}`,
    `reasons: ${envelope.reasonCodes.join(", ")}`,
  ];

  if (envelope.decision === "HOLD") {
    base.push(
      "short-input behavior: 먼저 가능한 선택지 2~3개를 제시하고, 마지막에 필요한 확인 질문을 1개만 둔다.",
    );
  } else if (envelope.decision === "PREVIEW") {
    base.push("preview behavior: 바로 확정하지 말고 적용 전후 차이와 작가 선택지를 간단히 분리한다.");
  } else if (envelope.decision === "SPLIT") {
    base.push("split behavior: 한 번에 처리하지 말고 작은 묶음과 순서를 제안한다.");
  } else if (envelope.decision === "PROTECT") {
    base.push("protect behavior: 외부 제출, 권리/IP, 개인정보 경계는 작가 확인 전 확정하지 않는다.");
  } else if (envelope.decision === "APPLY") {
    base.push("apply behavior: 작가가 바로 쓸 수 있는 형태로 간결하게 정리한다.");
  } else {
    base.push("record behavior: 작업 흐름을 끊지 않고 필요한 근거만 남긴다.");
  }

  base.push("tone: 작가가 리드한다는 느낌을 유지하고, 과한 방어 문구를 앞세우지 않는다.");
  return base.join("\n");
}
