import { buildPrevisualSlots } from "@/lib/creative/previsual-slots";
import {
  buildPrevisualSlotJsonKo,
  buildPrevisualSlotMarkdownKo,
  countFilledPrevisualSlots,
  previsualSlotSourceLabel,
} from "../previsual-output";

describe("previsual-output", () => {
  const result = buildPrevisualSlots({
    subject: "주인공",
    action: "문을 연다",
    setting: "폐쇄된 기록실",
    mood: "긴장",
    dialogue: "여기서부터가 진짜야.",
  });

  it("프리비주얼 슬롯 요약을 한국어 제목과 항목명으로 출력한다", () => {
    const markdown = buildPrevisualSlotMarkdownKo(result);

    expect(markdown).toContain("## 프리비주얼 슬롯 요약");
    expect(markdown).toContain("### 이미지");
    expect(markdown).toContain("### 영상");
    expect(markdown).toContain("### 음성");
    expect(markdown).toContain("핵심: 단계 1");
    expect(markdown).toContain("시각: 단계 2");
    expect(markdown).toContain("조명: 단계 2-3");
    expect(markdown).toContain("주체(주인공 · 작품 설정)");
    expect(markdown).toContain("대사(여기서부터가 진짜야. · 작품 설정)");
    expect(markdown).toContain("프롬프트 골격");
    expect(markdown).toContain("제외 요소:");
    expect(markdown).not.toContain("[subject]");
    expect(markdown).not.toContain("camera angle");
    expect(markdown).not.toContain("Negative:");
  });

  it("JSON 출력도 한국어 키와 한국어 슬롯 라벨을 쓴다", () => {
    const payload = buildPrevisualSlotJsonKo(result);

    expect(payload["이미지"]["매체"]).toBe("이미지");
    expect(payload["이미지"]["카테고리"][0]["분류"]).toBe("핵심");
    expect(payload["이미지"]["카테고리"][0]["슬롯"][0]).toMatchObject({
      "항목": "주체",
      "값": "주인공",
      "출처": "작품 설정",
    });
    expect(payload["음성"]["카테고리"][0]["슬롯"][0]).toMatchObject({
      "항목": "음성 식별자",
      "값": "작가 입력 대기",
      "출처": "작가 입력 대기",
    });
  });

  it("슬롯 채움 수와 출처 라벨을 재사용 가능한 기준으로 제공한다", () => {
    expect(countFilledPrevisualSlots(result.slotEngine.image)).toBeGreaterThan(0);
    expect(previsualSlotSourceLabel("KO", "default")).toBe("사양 기본값");
    expect(previsualSlotSourceLabel("KO", "unfilled")).toBe("작가 입력 대기");
  });
});
