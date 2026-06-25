// ============================================================
// Author Decision Audit — T15 local replay verifier
// ============================================================
//
// Replays Work Receipt decisions from a submission package and checks
// whether author approve/hold records are complete and non-conflicting.
// This is an accountability trace check, not authorship or legal proof.
// ============================================================

import type { ArtifactDescriptor, WorkReceiptJournalItem } from './submission-package';

export type HumanAccountabilityIssueReason =
  | 'missing-work-receipt-journal'
  | 'invalid-work-receipt-json'
  | 'invalid-work-receipt-kind'
  | 'work-receipt-count-mismatch'
  | 'invalid-decision'
  | 'missing-fix-id'
  | 'missing-reason'
  | 'missing-receipt-text'
  | 'receipt-decision-mismatch'
  | 'duplicate-decision'
  | 'conflicting-decision'
  | 'missing-human-decision'
  | 'unexpected-decision';

export interface HumanAccountabilityIssue {
  reason: HumanAccountabilityIssueReason;
  fixId?: string;
  entryId?: string;
  expected?: string | number;
  actual?: string | number;
}

export interface HumanAccountabilityAuditInput {
  artifacts?: readonly ArtifactDescriptor[];
  entries?: readonly WorkReceiptJournalItem[];
  expectedFixIds?: readonly string[];
}

export interface HumanAccountabilityReplaySummary {
  expectedFixCount: number;
  decidedFixCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface HumanAccountabilityAuditResult {
  valid: boolean;
  summary: HumanAccountabilityReplaySummary;
  issues: HumanAccountabilityIssue[];
  limitation: string;
}

interface WorkReceiptJournalPayload {
  kind?: unknown;
  count?: unknown;
  entries?: unknown;
}

type NormalizedDecision = 'approved' | 'rejected';

interface NormalizedEntry {
  id: string;
  fixId: string;
  decision: NormalizedDecision | null;
  reason: string;
  receiptText: string;
}

const WORK_RECEIPT_ARTIFACT_ID = 'work-receipt-journal';
const WORK_RECEIPT_KIND = 'loreguard.work-receipt-journal.v1';
const LIMITATION =
  'Author decision replay only. This records approval and hold decisions; it does not determine copyright ownership, direct authorship, originality, or legal compliance.';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parsePayload(content: string): WorkReceiptJournalPayload | null {
  try {
    const parsed: unknown = JSON.parse(content);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeDecision(value: unknown): NormalizedDecision | null {
  return value === 'approved' || value === 'rejected' ? value : null;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEntry(value: unknown): NormalizedEntry | null {
  if (!isObject(value)) return null;
  return {
    id: normalizeString(value.id),
    fixId: normalizeString(value.fixId),
    decision: normalizeDecision(value.decision),
    reason: normalizeString(value.reason),
    receiptText: normalizeString(value.receiptText),
  };
}

function loadEntries(input: HumanAccountabilityAuditInput, issues: HumanAccountabilityIssue[]): NormalizedEntry[] {
  if (input.entries) {
    return input.entries
      .map((entry) => normalizeEntry(entry))
      .filter((entry): entry is NormalizedEntry => Boolean(entry));
  }

  const artifact = input.artifacts?.find((item) => item.id === WORK_RECEIPT_ARTIFACT_ID);
  if (!artifact) {
    issues.push({ reason: 'missing-work-receipt-journal' });
    return [];
  }

  const payload = parsePayload(artifact.content);
  if (!payload) {
    issues.push({ reason: 'invalid-work-receipt-json', entryId: artifact.id });
    return [];
  }

  if (payload.kind !== WORK_RECEIPT_KIND) {
    issues.push({
      reason: 'invalid-work-receipt-kind',
      expected: WORK_RECEIPT_KIND,
      actual: typeof payload.kind === 'string' ? payload.kind : String(payload.kind),
    });
  }

  const rawEntries = Array.isArray(payload.entries) ? payload.entries : [];
  if (typeof payload.count === 'number' && payload.count !== rawEntries.length) {
    issues.push({
      reason: 'work-receipt-count-mismatch',
      expected: rawEntries.length,
      actual: payload.count,
    });
  }

  return rawEntries
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is NormalizedEntry => Boolean(entry));
}

function receiptMatchesDecision(entry: NormalizedEntry): boolean {
  const evidence = `${entry.reason}\n${entry.receiptText}`.toLowerCase();
  const hasApproveMark = entry.receiptText.includes('✓');
  const hasRejectMark = entry.receiptText.includes('✗');
  if (entry.decision === 'approved') {
    if (hasRejectMark && !hasApproveMark) return false;
    return hasApproveMark || evidence.includes('approved') || evidence.includes('승인');
  }
  if (entry.decision === 'rejected') {
    if (hasApproveMark && !hasRejectMark) return false;
    return (
      hasRejectMark ||
      evidence.includes('rejected') ||
      evidence.includes('held') ||
      evidence.includes('보류') ||
      evidence.includes('거절')
    );
  }
  return false;
}

export function verifyHumanAccountabilityReplay(
  input: HumanAccountabilityAuditInput,
): HumanAccountabilityAuditResult {
  const issues: HumanAccountabilityIssue[] = [];
  const entries = loadEntries(input, issues);
  const expectedFixIds = new Set((input.expectedFixIds ?? []).filter((fixId) => fixId.trim()));
  const byFixId = new Map<string, NormalizedEntry[]>();
  const hasFatalSourceIssue = issues.some((item) =>
    item.reason === 'missing-work-receipt-journal' || item.reason === 'invalid-work-receipt-json',
  );

  if (hasFatalSourceIssue && entries.length === 0) {
    return {
      valid: false,
      summary: {
        expectedFixCount: expectedFixIds.size,
        decidedFixCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
      },
      issues,
      limitation: LIMITATION,
    };
  }

  for (const entry of entries) {
    if (!entry.fixId) {
      issues.push({ reason: 'missing-fix-id', entryId: entry.id });
      continue;
    }
    if (!entry.decision) {
      issues.push({ reason: 'invalid-decision', entryId: entry.id, fixId: entry.fixId });
      continue;
    }
    if (!entry.reason) {
      issues.push({ reason: 'missing-reason', entryId: entry.id, fixId: entry.fixId });
    }
    if (!entry.receiptText) {
      issues.push({ reason: 'missing-receipt-text', entryId: entry.id, fixId: entry.fixId });
    } else if (!receiptMatchesDecision(entry)) {
      issues.push({
        reason: 'receipt-decision-mismatch',
        entryId: entry.id,
        fixId: entry.fixId,
        expected: entry.decision,
      });
    }
    if (expectedFixIds.size > 0 && !expectedFixIds.has(entry.fixId)) {
      issues.push({ reason: 'unexpected-decision', entryId: entry.id, fixId: entry.fixId });
    }
    const group = byFixId.get(entry.fixId) ?? [];
    group.push(entry);
    byFixId.set(entry.fixId, group);
  }

  for (const [fixId, group] of byFixId.entries()) {
    if (group.length <= 1) continue;
    const decisions = new Set(group.map((entry) => entry.decision).filter(Boolean));
    issues.push({
      reason: decisions.size > 1 ? 'conflicting-decision' : 'duplicate-decision',
      fixId,
      actual: group.length,
    });
  }

  for (const fixId of expectedFixIds) {
    if (!byFixId.has(fixId)) {
      issues.push({ reason: 'missing-human-decision', fixId });
    }
  }

  const validEntries = entries.filter((entry) => entry.fixId && entry.decision);
  const summary: HumanAccountabilityReplaySummary = {
    expectedFixCount: expectedFixIds.size,
    decidedFixCount: byFixId.size,
    approvedCount: validEntries.filter((entry) => entry.decision === 'approved').length,
    rejectedCount: validEntries.filter((entry) => entry.decision === 'rejected').length,
  };

  return {
    valid: issues.length === 0,
    summary,
    issues,
    limitation: LIMITATION,
  };
}
