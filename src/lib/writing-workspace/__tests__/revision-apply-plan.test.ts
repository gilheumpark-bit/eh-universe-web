import { auditMechanicalDefects } from "@/lib/creative/mechanical-defect-audit";
import {
  buildRevisionApplyPlan,
  revisionTextHash,
  type RevisionPatchCandidate,
} from "../revision-apply-plan";

function candidateAt(text: string, type: RevisionPatchCandidate["finding"]["type"], decision: "approved" | "rejected") {
  const finding = auditMechanicalDefects(text).findings.find((item) => item.type === type);
  if (!finding) throw new Error(`missing finding: ${type}`);
  return {
    finding,
    decisionKey: `decision:${type}:${finding.index}`,
    decision,
  };
}

describe("buildRevisionApplyPlan", () => {
  it("승인되지 않은 후보는 원고를 바꾸지 않는다", () => {
    const text = "그는 말했다.다음 문장.";
    const plan = buildRevisionApplyPlan({
      text,
      candidates: [candidateAt(text, "glued-sentence-boundary", "rejected")],
    });

    expect(plan.kind).toBe("loreguard.revision-apply-plan.v1");
    expect(plan.authorApprovedOnly).toBe(true);
    expect(plan.changed).toBe(false);
    expect(plan.appliedText).toBe(text);
    expect(plan.patches).toEqual([]);
    expect(plan.skipped[0]?.reason).toBe("not-approved");
  });

  it("승인된 안전 후보만 적용하고 before/after hash를 남긴다", () => {
    const text = "그는 말했다.다음 문장.\n\n\n\n끝.";
    const plan = buildRevisionApplyPlan({
      text,
      candidates: [
        candidateAt(text, "glued-sentence-boundary", "approved"),
        candidateAt(text, "excess-blank-lines", "approved"),
      ],
    });

    expect(plan.changed).toBe(true);
    expect(plan.appliedText).toBe("그는 말했다. 다음 문장.\n\n끝.");
    expect(plan.beforeHash).toBe(revisionTextHash(text));
    expect(plan.afterHash).toBe(revisionTextHash(plan.appliedText));
    expect(plan.beforeHash).not.toBe(plan.afterHash);
    expect(plan.patches).toHaveLength(2);
  });

  it("작가 voice에 가까운 비안전 후보는 승인돼도 자동 적용 계획에서 제외한다", () => {
    const text = "## 제목\n본문 😀";
    const findings = auditMechanicalDefects(text).findings;
    const candidates = findings.map((finding) => ({
      finding,
      decisionKey: `decision:${finding.type}:${finding.index}`,
      decision: "approved" as const,
    }));
    const plan = buildRevisionApplyPlan({ text, candidates });

    expect(plan.changed).toBe(false);
    expect(plan.patches).toEqual([]);
    expect(plan.skipped.map((item) => item.reason)).toEqual(
      expect.arrayContaining(["unsafe-finding"]),
    );
  });

  it("한국어 단어 경계가 불명확한 음절 공백은 승인돼도 수동 후보로 남긴다", () => {
    const text = "그 는 문 을 열 었 다.";
    const plan = buildRevisionApplyPlan({
      text,
      candidates: [candidateAt(text, "broken-hangul-spacing", "approved")],
    });

    expect(plan.changed).toBe(false);
    expect(plan.patches).toEqual([]);
    expect(plan.skipped[0]?.reason).toBe("unsafe-finding");
  });

  it("범위가 현재 원고와 맞지 않으면 적용하지 않는다", () => {
    const text = "그는 말했다.다음 문장.";
    const candidate = candidateAt(text, "glued-sentence-boundary", "approved");
    const plan = buildRevisionApplyPlan({
      text: "짧다",
      candidates: [candidate],
    });

    expect(plan.changed).toBe(false);
    expect(plan.skipped[0]?.reason).toBe("range-mismatch");
  });
});
