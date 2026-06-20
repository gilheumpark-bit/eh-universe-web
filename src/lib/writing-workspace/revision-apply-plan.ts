// ============================================================
// revision-apply-plan — approved mechanical cleanup patch plan
// ============================================================
// Role:    Build a deterministic patch plan for author-approved mechanical findings.
// Banned:  Applying unapproved, unsafe, AI voice, or style edits.
// Input:   Manuscript text + mechanical findings + recorded author decisions.
// Output:  Patch preview with before/after hashes and skipped reasons.
// Depends: Pure data only. No React, DOM, storage, fetch, or LLM.
// ============================================================

import type {
  MechanicalDefectFinding,
  MechanicalDefectType,
} from "@/lib/creative/mechanical-defect-audit";
import type { ReceiptDecision } from "@/lib/creative/work-receipt-journal";

export type RevisionPatchSkipReason =
  | "not-approved"
  | "unsafe-finding"
  | "unsupported-type"
  | "range-mismatch"
  | "overlap"
  | "no-change";

export interface RevisionPatchCandidate {
  finding: MechanicalDefectFinding;
  decisionKey: string;
  decision?: ReceiptDecision;
}

export interface RevisionPatch {
  decisionKey: string;
  type: MechanicalDefectType;
  index: number;
  length: number;
  before: string;
  after: string;
}

export interface RevisionPatchSkip {
  decisionKey: string;
  type: MechanicalDefectType;
  reason: RevisionPatchSkipReason;
  message: string;
}

export interface RevisionApplyPlan {
  kind: "loreguard.revision-apply-plan.v1";
  authorApprovedOnly: true;
  beforeHash: string;
  afterHash: string;
  beforeLength: number;
  afterLength: number;
  patches: RevisionPatch[];
  skipped: RevisionPatchSkip[];
  appliedText: string;
  changed: boolean;
}

function safeText(input: unknown): string {
  return typeof input === "string" ? input : "";
}

export function revisionTextHash(input: unknown): string {
  const text = safeText(input);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function skip(
  candidate: RevisionPatchCandidate,
  reason: RevisionPatchSkipReason,
  message: string,
): RevisionPatchSkip {
  return {
    decisionKey: candidate.decisionKey,
    type: candidate.finding.type,
    reason,
    message,
  };
}

function safeRange(text: string, finding: MechanicalDefectFinding): { start: number; end: number } | null {
  const start = Math.max(0, Math.floor(finding.index));
  const length = Math.max(0, Math.floor(finding.length));
  const end = start + length;
  if (length <= 0 || start >= text.length || end > text.length) return null;
  return { start, end };
}

function patchText(type: MechanicalDefectType, before: string): string | null {
  if (type === "glued-sentence-boundary") {
    if (!/^[.!?。？！][가-힣A-Za-z]/.test(before)) return null;
    return `${before.slice(0, 1)} ${before.slice(1)}`;
  }

  if (type === "excess-blank-lines") {
    return before.replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
  }

  return null;
}

function buildPatch(text: string, candidate: RevisionPatchCandidate): RevisionPatch | RevisionPatchSkip {
  if (candidate.decision !== "approved") {
    return skip(candidate, "not-approved", "Author approval is required before cleanup.");
  }
  if (!candidate.finding.autoFixSafe) {
    return skip(candidate, "unsafe-finding", "Finding is advisory-only and requires manual editing.");
  }

  const range = safeRange(text, candidate.finding);
  if (!range) {
    return skip(candidate, "range-mismatch", "Finding range no longer matches the manuscript.");
  }

  const before = text.slice(range.start, range.end);
  const after = patchText(candidate.finding.type, before);
  if (after == null) {
    return skip(candidate, "unsupported-type", "No deterministic cleanup patch exists for this finding type.");
  }
  if (after === before) {
    return skip(candidate, "no-change", "Cleanup patch would not change the manuscript.");
  }

  return {
    decisionKey: candidate.decisionKey,
    type: candidate.finding.type,
    index: range.start,
    length: range.end - range.start,
    before,
    after,
  };
}

export function buildRevisionApplyPlan(input: {
  text: unknown;
  candidates: RevisionPatchCandidate[];
}): RevisionApplyPlan {
  const text = safeText(input.text);
  const skipped: RevisionPatchSkip[] = [];
  const patches: RevisionPatch[] = [];

  const sortedCandidates = [...input.candidates].sort(
    (left, right) => left.finding.index - right.finding.index || left.decisionKey.localeCompare(right.decisionKey),
  );

  let occupiedEnd = -1;
  for (const candidate of sortedCandidates) {
    const draft = buildPatch(text, candidate);
    if ("reason" in draft) {
      skipped.push(draft);
      continue;
    }
    if (draft.index < occupiedEnd) {
      skipped.push(skip(candidate, "overlap", "Patch overlaps an earlier approved cleanup range."));
      continue;
    }
    patches.push(draft);
    occupiedEnd = draft.index + draft.length;
  }

  let appliedText = text;
  for (const patch of [...patches].sort((left, right) => right.index - left.index)) {
    appliedText = `${appliedText.slice(0, patch.index)}${patch.after}${appliedText.slice(patch.index + patch.length)}`;
  }

  return {
    kind: "loreguard.revision-apply-plan.v1",
    authorApprovedOnly: true,
    beforeHash: revisionTextHash(text),
    afterHash: revisionTextHash(appliedText),
    beforeLength: text.length,
    afterLength: appliedText.length,
    patches,
    skipped,
    appliedText,
    changed: appliedText !== text,
  };
}
