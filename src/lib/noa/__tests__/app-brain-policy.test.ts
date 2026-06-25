import {
  buildAppBrainDecisionDirective,
  decideAppBrain,
  getDecisionProductLabel,
} from "@/lib/noa/app-brain-policy";

describe("NOA App Brain apply policy", () => {
  it("does not interrupt ordinary author typing", () => {
    const decision = decideAppBrain({
      actionKind: "manual_edit",
      tabId: "writing",
      approxChars: 240,
      scores: {
        intentClarity: 0.9,
        contextFit: 0.8,
        userControl: 1,
      },
    });

    expect(decision.decision).toBe("RECORD");
    expect(decision.shouldInterruptTyping).toBe(false);
    expect(decision.receiptLevel).toBe("light");
  });

  it("routes short scene requests to HOLD guidance without hard blocking", () => {
    const decision = decideAppBrain({
      actionKind: "noa_suggestion",
      tabId: "scene",
      approxChars: 8,
      scores: {
        intentClarity: 0.32,
        contextFit: 0.6,
        userControl: 0.8,
        userIntentUnclear: 0.7,
      },
    });
    const directive = buildAppBrainDecisionDirective(decision);

    expect(decision.decision).toBe("HOLD");
    expect(decision.shouldInterruptTyping).toBe(false);
    expect(directive).toContain("선택지 2~3개");
    expect(directive).toContain("확인 질문을 1개");
  });

  it("requires preview for external or hard-to-undo boundaries", () => {
    const decision = decideAppBrain({
      actionKind: "cloud_save",
      tabId: "export",
      crossesExternalBoundary: true,
      approxChars: 1400,
      scores: {
        intentClarity: 0.8,
        contextFit: 0.8,
      },
    });

    expect(decision.decision).toBe("PREVIEW");
    expect(decision.requiresAuthorConfirm).toBe(true);
    expect(getDecisionProductLabel(decision.decision)).toBe("미리보기");
  });

  it("protects rights and privacy work regardless of otherwise good readiness", () => {
    const decision = decideAppBrain({
      actionKind: "export",
      tabId: "export",
      touchesRightsOrPrivacy: true,
      scores: {
        intentClarity: 0.95,
        contextFit: 0.95,
        expertConfidence: 0.9,
        userControl: 0.9,
      },
    });

    expect(decision.decision).toBe("PROTECT");
    expect(decision.shouldInterruptTyping).toBe(true);
    expect(decision.receiptLevel).toBe("full");
  });

  it("splits broad non-atomic work instead of applying it in one pass", () => {
    const decision = decideAppBrain({
      actionKind: "bulk_apply",
      tabId: "plot",
      approxChars: 9000,
      targetCount: 9,
      canApplyAtomically: false,
      scores: {
        intentClarity: 0.84,
        contextFit: 0.78,
        reversibility: 0.7,
      },
    });

    expect(decision.decision).toBe("SPLIT");
    expect(decision.reasonCodes).toContain("large-scope-split");
  });
});
