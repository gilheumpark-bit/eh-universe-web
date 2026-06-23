import {
  buildTabExpertSystemDirective,
  getAllTabExpertProfiles,
  getTabExpertLabel,
  getTabExpertProfile,
  normalizeBrainTabId,
} from "@/lib/noa/tab-expert-registry";

describe("NOA App Brain tab expert registry", () => {
  it("keeps the active Loreguard 10-step tab set as the canonical registry", () => {
    expect(getAllTabExpertProfiles().map((profile) => profile.id)).toEqual([
      "project",
      "world",
      "character",
      "plot",
      "scene",
      "direction",
      "writing",
      "revision",
      "translate",
      "export",
    ]);
  });

  it("normalizes legacy Studio tab ids into active Loreguard tabs", () => {
    expect(normalizeBrainTabId("characters")).toBe("character");
    expect(normalizeBrainTabId("scene-sheet")).toBe("scene");
    expect(normalizeBrainTabId("style")).toBe("revision");
    expect(normalizeBrainTabId("manuscript")).toBe("revision");
    expect(normalizeBrainTabId("settings")).toBe("project");
  });

  it("provides a writing control directive without adding a public surface", () => {
    const profile = getTabExpertProfile("writing");
    const directive = buildTabExpertSystemDirective("writing", "KO");

    expect(profile.depth).toBe("D64");
    expect(profile.reasoningStage).toBe("draft");
    expect(getTabExpertLabel("writing", "KO")).toBe("집필 관제");
    expect(directive).toContain("NOA-WRITING-CONTROL");
    expect(directive).toContain("일반 대화와 타이핑은 끊지 않는다");
  });
});
