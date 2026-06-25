// ============================================================
// revision-report — 퇴고 보고서/승인 큐 순수 모델
// ============================================================
// Role:    Merge local revision signals, mechanical findings, and AI report
//          findings into one advisory report contract.
// Banned:  Applying manuscript edits or deciding on behalf of the author.
// Input:   Manuscript text + optional AI findings.
// Output:  Stable report findings and author-decision queue summary.
// Depends: Pure analysis modules only. No React, DOM, storage, fetch, or LLM.
// ============================================================

import {
  analyzeRevision,
  revisionIssues,
  type RevisionIssue,
} from "./revision-analysis";
import {
  buildRevisionFindingKey,
  type RevisionDecisionFinding,
} from "./revision-decision-record";
import {
  auditMechanicalDefects,
  type MechanicalDefectFinding,
  type MechanicalDefectSeverity,
} from "../creative/mechanical-defect-audit";

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export type RevisionReportSource = "local-revision" | "mechanical" | "ai-report";
export type RevisionReportSeverity = "high" | "medium" | "low";

export interface RevisionReportFinding extends RevisionDecisionFinding {
  id: string;
  source: RevisionReportSource;
  severity: RevisionReportSeverity;
  autoFixSafe: boolean;
  requiresAuthorDecision: boolean;
  decisionKey: string;
}

export interface RevisionReportSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  autoFixSafe: number;
  requiresAuthorDecision: number;
}

export interface RevisionReport {
  kind: "loreguard.revision-report.v1";
  sessionId: string | null;
  episode: number | null;
  generatedAt: number | null;
  advisoryOnly: true;
  autoApplyAllowed: false;
  summary: RevisionReportSummary;
  findings: RevisionReportFinding[];
}

export interface BuildRevisionReportInput {
  text: unknown;
  sessionId?: string | null;
  episode?: number | null;
  aiFindings?: RevisionDecisionFinding[] | null;
  generatedAt?: number | null;
}

const EMPTY_SUMMARY: RevisionReportSummary = {
  total: 0,
  high: 0,
  medium: 0,
  low: 0,
  autoFixSafe: 0,
  requiresAuthorDecision: 0,
};

// ============================================================
// PART 2 — Normalization Helpers
// ============================================================

function safeText(input: unknown): string {
  return typeof input === "string" ? input : "";
}

function safeShortText(input: unknown, maxChars: number): string {
  if (typeof input !== "string") return "";
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxChars - 1))}…`;
}

function safeEpisode(input: number | null | undefined): number | null {
  if (typeof input !== "number" || !Number.isFinite(input)) return null;
  return Math.max(0, Math.round(input));
}

function safeGeneratedAt(input: number | null | undefined): number | null {
  if (typeof input !== "number" || !Number.isFinite(input) || input < 0) return null;
  return Math.round(input);
}

function revisionIssueSeverity(issue: RevisionIssue): RevisionReportSeverity {
  return issue.severity === "warn" ? "medium" : "low";
}

function mechanicalSeverity(severity: MechanicalDefectSeverity): RevisionReportSeverity {
  return severity;
}

function normalizeAiFinding(input: RevisionDecisionFinding): RevisionDecisionFinding | null {
  const type = safeShortText(input.type, 80);
  const diagnosis = safeShortText(input.diagnosis, 500);
  if (!type || !diagnosis) return null;
  return {
    type,
    severity: safeShortText(input.severity, 40) || "low",
    location: safeShortText(input.location, 200),
    diagnosis,
    suggestion: safeShortText(input.suggestion, 500),
  };
}

function normalizeAiSeverity(severity: string): RevisionReportSeverity {
  if (severity === "high" || severity === "medium" || severity === "low") return severity;
  return "low";
}

function summarize(findings: RevisionReportFinding[]): RevisionReportSummary {
  const summary = { ...EMPTY_SUMMARY };
  summary.total = findings.length;
  for (const finding of findings) {
    summary[finding.severity] += 1;
    if (finding.autoFixSafe) summary.autoFixSafe += 1;
    if (finding.requiresAuthorDecision) summary.requiresAuthorDecision += 1;
  }
  return summary;
}

// ============================================================
// PART 3 — Finding Mappers
// ============================================================

export function revisionDecisionFindingFromMechanicalDefect(
  finding: MechanicalDefectFinding,
): RevisionDecisionFinding {
  return {
    type: `mechanical-${finding.type}`,
    severity: finding.severity,
    location: `${finding.line}줄: ${finding.excerpt}`,
    diagnosis: finding.message,
    suggestion: finding.autoFixSafe
      ? "작가 확인 뒤 반영할 수 있는 정리 후보입니다."
      : "원고를 직접 살핀 뒤 수정 여부를 결정하세요.",
  };
}

function toReportFinding(args: {
  source: RevisionReportSource;
  sessionId: string | null;
  episode: number | null;
  index: number;
  finding: RevisionDecisionFinding;
  severity: RevisionReportSeverity;
  autoFixSafe: boolean;
  requiresAuthorDecision: boolean;
}): RevisionReportFinding {
  const decisionKey = buildRevisionFindingKey({
    sessionId: args.sessionId,
    episode: args.episode,
    index: args.index,
    finding: args.finding,
  });
  return {
    ...args.finding,
    id: `${args.source}:${decisionKey}`,
    source: args.source,
    severity: args.severity,
    autoFixSafe: args.autoFixSafe,
    requiresAuthorDecision: args.requiresAuthorDecision,
    decisionKey,
  };
}

// ============================================================
// PART 4 — Public Builder
// ============================================================

export function buildRevisionReport(input: BuildRevisionReportInput): RevisionReport {
  const text = safeText(input.text);
  const sessionId = safeShortText(input.sessionId, 80) || null;
  const episode = safeEpisode(input.episode);
  const generatedAt = safeGeneratedAt(input.generatedAt);
  const findings: RevisionReportFinding[] = [];

  const metrics = analyzeRevision(text);
  const localIssues = revisionIssues(metrics);
  localIssues.forEach((issue, index) => {
    const finding: RevisionDecisionFinding = {
      type: `revision-${issue.kind}`,
      severity: issue.severity,
      location: "",
      diagnosis: issue.hint,
      suggestion: "원고 흐름에 맞는지 직접 확인한 뒤 손보세요.",
    };
    findings.push(
      toReportFinding({
        source: "local-revision",
        sessionId,
        episode,
        index,
        finding,
        severity: revisionIssueSeverity(issue),
        autoFixSafe: false,
        requiresAuthorDecision: false,
      }),
    );
  });

  const mechanicalAudit = auditMechanicalDefects(text);
  mechanicalAudit.findings.forEach((mechanicalFinding, index) => {
    const finding = revisionDecisionFindingFromMechanicalDefect(mechanicalFinding);
    findings.push(
      toReportFinding({
        source: "mechanical",
        sessionId,
        episode,
        index,
        finding,
        severity: mechanicalSeverity(mechanicalFinding.severity),
        autoFixSafe: mechanicalFinding.autoFixSafe,
        requiresAuthorDecision: true,
      }),
    );
  });

  const aiFindings = Array.isArray(input.aiFindings) ? input.aiFindings : [];
  aiFindings.forEach((rawFinding, index) => {
    const finding = normalizeAiFinding(rawFinding);
    if (!finding) return;
    findings.push(
      toReportFinding({
        source: "ai-report",
        sessionId,
        episode,
        index,
        finding,
        severity: normalizeAiSeverity(finding.severity),
        autoFixSafe: false,
        requiresAuthorDecision: true,
      }),
    );
  });

  return {
    kind: "loreguard.revision-report.v1",
    sessionId,
    episode,
    generatedAt,
    advisoryOnly: true,
    autoApplyAllowed: false,
    summary: summarize(findings),
    findings,
  };
}
