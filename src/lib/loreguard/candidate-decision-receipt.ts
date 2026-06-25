import {
  appendDecision,
  type ReceiptJournalEntry,
} from "@/lib/creative/work-receipt-journal";

export type CandidateDecisionKind = "accepted" | "held" | "discarded";
export const CANDIDATE_DECISION_RECORDED = "loreguard:candidate-decision-recorded";

interface CandidateDecisionInput {
  candidateId: string;
  title: string;
  surface: string;
  stage: string;
  action: CandidateDecisionKind;
  content?: string;
  sourceLabel?: string;
  actor?: string;
  now?: number;
}

const ACTION_LABEL: Record<CandidateDecisionKind, string> = {
  accepted: "채택",
  held: "보류",
  discarded: "폐기",
};

function compact(input: string | undefined, fallback: string, max = 160): string {
  const value = input?.replace(/\s+/g, " ").trim();
  return (value || fallback).slice(0, max);
}

function safeId(input: string): string {
  const value = input.replace(/[^\w가-힣.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (value || "unknown").slice(0, 120);
}

export function buildCandidateDecisionArgs(
  input: CandidateDecisionInput,
): Parameters<typeof appendDecision>[0] {
  const at = input.now ?? Date.now();
  const actionLabel = ACTION_LABEL[input.action];
  const title = compact(input.title, "제목 없는 후보");
  const surface = compact(input.surface, "Loreguard 후보");
  const stage = compact(input.stage, "candidate", 80);
  const candidateId = safeId(input.candidateId);
  const content = input.content?.trim() ?? "";
  const fixId = `candidate:${safeId(stage)}:${candidateId}`;
  const reason = `${surface} / ${title} 후보 ${actionLabel}`;

  return {
    id: `${fixId}:${input.action}`,
    at,
    fixId,
    decision: input.action === "accepted" ? "approved" : "rejected",
    reason,
    scoreDelta: null,
    context: {
      taskId: fixId,
      role: "author",
      actor: compact(input.actor, "loreguard-candidate-card", 80),
      approvedBy: input.action === "accepted" ? "author-session" : undefined,
      decision: `candidate-${input.action}`,
      skippedReason: input.action === "accepted" ? undefined : reason,
      sourceRefs: [
        {
          label: compact(input.sourceLabel, surface),
          hash: `chars:${content.length}`,
        },
      ],
      changedRange: {
        artifactId: fixId,
        afterChars: content.length,
        changedChars: input.action === "accepted" ? content.length : 0,
      },
    },
    metrics: {
      chars: content.length,
      keyInfo: 1,
      heldCount: input.action === "accepted" ? 0 : 1,
    },
  };
}

export function recordCandidateDecision(input: CandidateDecisionInput): ReceiptJournalEntry[] {
  const next = appendDecision(buildCandidateDecisionArgs(input));
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CANDIDATE_DECISION_RECORDED));
    }
  } catch {
    // 기록 자체는 이미 끝났으므로 알림 실패는 무시한다.
  }
  return next;
}
