import {
  buildCandidateDecisionArgs,
  recordCandidateDecision,
} from "@/lib/loreguard/candidate-decision-receipt";
import { loadJournal } from "@/lib/creative/work-receipt-journal";

beforeEach(() => {
  window.localStorage.clear();
});

describe("candidate-decision-receipt", () => {
  it("accepted 후보 결정을 approved 영수증 입력으로 만든다", () => {
    const args = buildCandidateDecisionArgs({
      candidateId: "world-1",
      title: "제국 권력 구조",
      surface: "세계관 보드",
      stage: "world",
      action: "accepted",
      content: "황실과 길드가 행정권을 나눈다.",
      now: 1_000,
    });

    expect(args.id).toBe("candidate:world:world-1:accepted");
    expect(args.decision).toBe("approved");
    expect(args.reason).toContain("후보 채택");
    expect(args.context?.approvedBy).toBe("author-session");
    expect(args.context?.decision).toBe("candidate-accepted");
    expect(args.metrics?.heldCount).toBe(0);
    expect(args.metrics?.chars).toBe(17);
  });

  it("held 후보 결정은 본문 편입 없이 rejected 저널로 남긴다", () => {
    const list = recordCandidateDecision({
      candidateId: "beat-1",
      title: "1화 도입",
      surface: "메인 시나리오",
      stage: "plot",
      action: "held",
      content: "주인공이 회귀 사실을 숨긴다.",
      sourceLabel: "노아 비트 후보",
      now: 2_000,
    });

    expect(list).toHaveLength(1);
    const loaded = loadJournal();
    expect(loaded[0].decision).toBe("rejected");
    expect(loaded[0].reason).toContain("후보 보류");
    expect(loaded[0].receipt.context?.skippedReason).toContain("후보 보류");
    expect(loaded[0].receipt.metrics?.heldCount).toBe(1);
  });

  it("같은 후보 결정은 idempotent 하게 한 번만 저장한다", () => {
    const input = {
      candidateId: "character:도윤",
      title: "도윤",
      surface: "캐릭터·아이템",
      stage: "character",
      action: "discarded" as const,
      content: "역할: 조력자",
      now: 3_000,
    };

    recordCandidateDecision(input);
    recordCandidateDecision(input);

    const loaded = loadJournal();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("candidate:character:character-도윤:discarded");
    expect(loaded[0].receipt.context?.decision).toBe("candidate-discarded");
  });
});
