import type { ReceiptJournalEntry } from "@/lib/creative/work-receipt-journal";
import { summarizeCandidateDecisions } from "@/lib/loreguard/candidate-decision-summary";

function entry(
  id: string,
  at: number,
  decision: string,
  reason: string,
  chars = 10,
): ReceiptJournalEntry {
  return {
    id,
    at,
    fixId: `candidate:test:${id}`,
    decision: decision === "candidate-accepted" ? "approved" : "rejected",
    reason,
    scoreDelta: null,
    receipt: {
      did: [],
      skipped: [],
      context: { decision },
      metrics: { chars },
    },
  };
}

describe("candidate-decision-summary", () => {
  it("candidate-* 결정만 최신순으로 요약한다", () => {
    const result = summarizeCandidateDecisions([
      entry("old", 100, "candidate-held", "세계관 보드 / 제국 후보 보류", 20),
      entry("new", 300, "candidate-accepted", "캐릭터·아이템 / 도윤 후보 채택", 30),
      entry("skip", 400, "revision-held", "퇴고 / 문장 후보 보류", 40),
      entry("mid", 200, "candidate-discarded", "연출 / 추격씬 후보 폐기", 50),
    ]);

    expect(result.map((item) => item.id)).toEqual(["new", "mid", "old"]);
    expect(result[0]).toMatchObject({
      action: "accepted",
      actionLabel: "채택",
      surface: "캐릭터·아이템",
      title: "도윤",
      chars: 30,
    });
    expect(result[0].receiptText).toContain("[검사 적용]");
    expect(result[0].receiptText).toContain("candidate-accepted");
    expect(result[0].jsonText).toContain('"id": "new"');
    expect(result[1].actionLabel).toBe("폐기");
    expect(result[2].actionLabel).toBe("보류");
  });

  it("limit과 깨진 reason fallback을 처리한다", () => {
    const result = summarizeCandidateDecisions([
      entry("a", 1, "candidate-held", "형식이 다른 사유"),
      entry("b", 2, "candidate-held", "파일가져오기:권리/IP 메모 / 원본 후보 보류"),
    ], 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "b",
      surface: "파일가져오기:권리/IP 메모",
      title: "원본",
    });

    const fallback = summarizeCandidateDecisions([
      entry("a", 1, "candidate-held", "형식이 다른 사유"),
    ]);
    expect(fallback[0].surface).toBe("후보 결정");
    expect(fallback[0].title).toBe("형식이 다른 사유");
  });
});
