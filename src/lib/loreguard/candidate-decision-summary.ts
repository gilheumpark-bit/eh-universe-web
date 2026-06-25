import type { ReceiptJournalEntry } from "@/lib/creative/work-receipt-journal";
import { buildReceipt } from "@/lib/creative/work-receipt";

export type CandidateDecisionAction = "accepted" | "held" | "discarded";

export interface CandidateDecisionSummary {
  id: string;
  at: number;
  action: CandidateDecisionAction;
  actionLabel: string;
  surface: string;
  title: string;
  chars: number;
  reason: string;
  receiptText: string;
  jsonText: string;
}

const ACTION_LABEL: Record<CandidateDecisionAction, string> = {
  accepted: "채택",
  held: "보류",
  discarded: "폐기",
};

function parseAction(decision: string | undefined): CandidateDecisionAction | null {
  if (decision === "candidate-accepted") return "accepted";
  if (decision === "candidate-held") return "held";
  if (decision === "candidate-discarded") return "discarded";
  return null;
}

function parseReason(reason: string): { surface: string; title: string } {
  const match = /^(.*?)\s\/\s(.*?)\s후보\s(?:채택|보류|폐기)$/.exec(reason.trim());
  if (!match) return { surface: "후보 결정", title: reason.trim() || "제목 없는 후보" };
  return {
    surface: match[1]?.trim() || "후보 결정",
    title: match[2]?.trim() || "제목 없는 후보",
  };
}

export function summarizeCandidateDecisions(
  entries: ReceiptJournalEntry[],
  limit = 12,
): CandidateDecisionSummary[] {
  return entries
    .map((entry): CandidateDecisionSummary | null => {
      const action = parseAction(entry.receipt.context?.decision);
      if (!action) return null;
      const parsed = parseReason(entry.reason);
      const decisionKey = entry.receipt.context?.decision ?? `candidate-${action}`;
      const receiptText = buildReceipt({
        ...entry.receipt,
        did: [
          ...(Array.isArray(entry.receipt.did) ? entry.receipt.did : []),
          { action: decisionKey, evidence: entry.reason },
        ],
      });
      return {
        id: entry.id,
        at: entry.at,
        action,
        actionLabel: ACTION_LABEL[action],
        surface: parsed.surface,
        title: parsed.title,
        chars: entry.receipt.metrics?.chars ?? 0,
        reason: entry.reason,
        receiptText,
        jsonText: JSON.stringify(entry, null, 2),
      };
    })
    .filter((item): item is CandidateDecisionSummary => Boolean(item))
    .sort((a, b) => b.at - a.at)
    .slice(0, Math.max(0, limit));
}
