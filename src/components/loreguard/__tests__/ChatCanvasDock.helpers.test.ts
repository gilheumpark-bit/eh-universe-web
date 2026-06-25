import {
  buildDockShortInputDirective,
  isDockShortHelpRequest,
} from "@/components/loreguard/ChatCanvasDock.helpers";

describe("ChatCanvasDock short help handling", () => {
  it("detects short scene-sheet uncertainty requests", () => {
    expect(isDockShortHelpRequest("이거 어떻게 하면 좋을까")).toBe(true);
    expect(isDockShortHelpRequest("여기 막혔는데 좀 봐줘")).toBe(true);
    expect(isDockShortHelpRequest("이 장면에서 주인공이 문을 연다")).toBe(false);
  });

  it("builds a scene-specific lead directive", () => {
    const directive = buildDockShortInputDirective("KO", "scene", "이거 어떻게 하면 좋을까");
    expect(directive).toContain("씬시트");
    expect(directive).toContain("A안/B안/C안");
    expect(directive).toContain("추가 질문으로 시간을 끌지 말고");
  });

  it("does not add directives for concrete memo text", () => {
    expect(buildDockShortInputDirective("KO", "scene", "주인공이 문을 열고 적의 흔적을 발견한다")).toBe("");
  });
});
