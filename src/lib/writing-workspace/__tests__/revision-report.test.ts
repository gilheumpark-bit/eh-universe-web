import {
  buildRevisionReport,
  revisionDecisionFindingFromMechanicalDefect,
} from "../revision-report";
import { auditMechanicalDefects } from "@/lib/creative/mechanical-defect-audit";

describe("buildRevisionReport", () => {
  it("빈 입력: advisory report를 만들되 자동 적용은 허용하지 않는다", () => {
    const report = buildRevisionReport({ text: "", sessionId: "sess-1", episode: 1 });

    expect(report.kind).toBe("loreguard.revision-report.v1");
    expect(report.sessionId).toBe("sess-1");
    expect(report.episode).toBe(1);
    expect(report.advisoryOnly).toBe(true);
    expect(report.autoApplyAllowed).toBe(false);
    expect(report.summary.total).toBe(0);
    expect(report.findings).toEqual([]);
  });

  it("기계결함: 마크다운/이모지/치환 잔재를 작가 결정 큐로 올린다", () => {
    const report = buildRevisionReport({
      text: "## 제목\n본문 😀 {{이름}}.다음문장",
      sessionId: "sess-1",
      episode: 3,
    });

    expect(report.summary.total).toBeGreaterThan(0);
    expect(report.summary.requiresAuthorDecision).toBeGreaterThan(0);
    expect(report.findings.some((finding) => finding.source === "mechanical")).toBe(true);
    expect(report.autoApplyAllowed).toBe(false);
    expect(report.findings.some((finding) => finding.decisionKey.includes("sess-1:ep3"))).toBe(true);
  });

  it("AI 퇴고 후보: 유효 항목만 승인 큐에 포함하고 긴 텍스트를 절단한다", () => {
    const report = buildRevisionReport({
      text: "원고 본문.",
      sessionId: "sess-2",
      episode: 4,
      aiFindings: [
        {
          type: "voice",
          severity: "high",
          location: "3문단",
          diagnosis: "가".repeat(800),
          suggestion: "직접 수정하지 말고 작가가 승인한 뒤 반영한다.",
        },
        { type: "", severity: "high", diagnosis: "" },
      ],
    });

    const aiFindings = report.findings.filter((finding) => finding.source === "ai-report");
    expect(aiFindings).toHaveLength(1);
    const aiFinding = aiFindings[0];
    expect(aiFinding).toBeDefined();
    expect(aiFinding?.severity).toBe("high");
    expect(aiFinding?.requiresAuthorDecision).toBe(true);
    expect((aiFinding?.diagnosis ?? "").length).toBeLessThanOrEqual(500);
  });

  it("안정성: 같은 입력은 같은 decisionKey를 만든다", () => {
    const input = {
      text: "## 잔재\n그는 기분이 들었다. 그는 기분이 들었다.",
      sessionId: "sess-stable",
      episode: 2,
    };
    const a = buildRevisionReport(input);
    const b = buildRevisionReport(input);

    expect(a.findings.map((finding) => finding.decisionKey)).toEqual(
      b.findings.map((finding) => finding.decisionKey),
    );
  });

  it("기계결함 변환: RevisionPanel 승인/보류 기록과 같은 finding 형태를 만든다", () => {
    const mechanicalFinding = auditMechanicalDefects("## 제목").findings[0];
    const finding = revisionDecisionFindingFromMechanicalDefect(mechanicalFinding);

    expect(finding.type).toBe("mechanical-markdown-residue");
    expect(finding.location).toContain("1줄");
    expect(finding.diagnosis).toContain("Markdown");
    expect(finding.suggestion).toContain("수정 여부를 결정하세요");
  });
});
