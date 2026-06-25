import {
  BURST_ABSOLUTE_MIN_CHARS,
  detectExternalInputBurst,
  extractInsertedText,
  shouldShowLargePasteNotice,
} from "@/lib/creative-process/input-origin-detection";

describe("input-origin-detection", () => {
  it("중간에 삽입된 텍스트만 추출한다", () => {
    expect(extractInsertedText("가나다라마바사", "가나다XYZ라마바사")).toBe("XYZ");
  });

  it("대형 붙여넣기 안내 기준은 저장 성능 알림 전용이다", () => {
    expect(shouldShowLargePasteNotice("x".repeat(100_000))).toBe(false);
    expect(shouldShowLargePasteNotice("x".repeat(100_001))).toBe(true);
  });

  it("한 번에 들어온 500자 이상 입력은 외부 편입 후보로 본다", () => {
    const burst = detectExternalInputBurst({
      before: "앞 문장",
      after: `앞 문장${"가".repeat(BURST_ABSOLUTE_MIN_CHARS)}`,
      elapsedMs: 12_000,
      isComposing: false,
    });

    expect(burst).toEqual(
      expect.objectContaining({
        insertedText: "가".repeat(BURST_ABSOLUTE_MIN_CHARS),
        reason: "large-instant-insert",
      }),
    );
  });

  it("짧은 시간에 큰 덩어리가 들어오면 버스트로 잡는다", () => {
    const burst = detectExternalInputBurst({
      before: "",
      after: "나".repeat(160),
      elapsedMs: 1_000,
      isComposing: false,
    });

    expect(burst).toEqual(
      expect.objectContaining({
        insertedText: "나".repeat(160),
        reason: "fast-input-burst",
      }),
    );
  });

  it("IME 조합 중 입력은 버스트로 보지 않는다", () => {
    expect(
      detectExternalInputBurst({
        before: "",
        after: "다".repeat(800),
        elapsedMs: 100,
        isComposing: true,
      }),
    ).toBeNull();
  });
});

