import {
  getImportAlignmentWarnings,
  getImportBasisUpdateSuggestions,
  parseEpisodeLengthGoal,
} from "@/lib/loreguard/import-project-alignment";
import type { ImportCandidate } from "@/lib/loreguard/import-classifier";

function candidate(overrides: Partial<ImportCandidate>): ImportCandidate {
  return {
    id: "c1",
    sourceFileName: "memo.md",
    bucket: "world",
    title: "불러온 자료",
    text: "",
    excerpt: "",
    confidence: 0.8,
    reason: "테스트",
    detectedFormat: "md",
    sectionIndex: 0,
    charCount: overrides.text?.length ?? 0,
    importedAt: "2026-06-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("import-project-alignment", () => {
  it("회차 분량 문자열에서 목표 범위를 읽는다", () => {
    expect(parseEpisodeLengthGoal("5,500~7,000자")).toEqual({ min: 5500, max: 7000 });
    expect(parseEpisodeLengthGoal("6000자 내외")).toEqual({ min: 4800, max: 7200 });
  });

  it("선택한 한국어 기준에 영어권 플랫폼 후보가 들어오면 검토 경고를 만든다", () => {
    const warnings = getImportAlignmentWarnings(
      candidate({ text: "Royal Road submission chapter outline", sourceFileName: "royal-road.md" }),
      {
        targetLanguage: "KO",
        targetMarket: "KR",
        publishPlatform: "MUNPIA",
        releasePurpose: "serial",
        targetEpisodeLength: "5,500~7,000자",
        rightsNote: "원작자 본인",
      },
    );

    expect(warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["language-mismatch", "market-mismatch", "platform-mismatch"]),
    );
  });

  it("영어권 플랫폼 후보가 들어오면 프로젝트 기준 수정 제안을 만든다", () => {
    const suggestions = getImportBasisUpdateSuggestions(
      candidate({ text: "Royal Road submission chapter outline", sourceFileName: "royal-road.md" }),
      {
        targetLanguage: "KO",
        targetMarket: "KR",
        publishPlatform: "MUNPIA",
        releasePurpose: "serial",
        targetEpisodeLength: "5,500~7,000자",
        rightsNote: "원작자 본인",
      },
    );

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "targetLanguage", value: "EN" }),
        expect.objectContaining({ field: "targetMarket", value: "US" }),
        expect.objectContaining({ field: "publishPlatform", value: "ROYAL_ROAD" }),
      ]),
    );
  });

  it("선택한 플랫폼과 같은 후보는 플랫폼 충돌을 만들지 않는다", () => {
    const warnings = getImportAlignmentWarnings(
      candidate({ text: "문피아 연재용 세계관 메모" }),
      {
        targetLanguage: "KO",
        targetMarket: "KR",
        publishPlatform: "MUNPIA",
        releasePurpose: "serial",
        targetEpisodeLength: "5,500~7,000자",
        rightsNote: "원작자 본인",
      },
    );

    expect(warnings.some((warning) => warning.code === "platform-mismatch")).toBe(false);
  });

  it("권리 단서가 있는데 권리 메모가 비어 있으면 채택 전 확인을 요구한다", () => {
    const warnings = getImportAlignmentWarnings(
      candidate({ bucket: "rightsIp", text: "외부자료 출처와 라이선스 확인 필요" }),
      {
        targetLanguage: "KO",
        targetMarket: "KR",
        publishPlatform: "NONE",
        releasePurpose: "publisher",
        targetEpisodeLength: "",
        rightsNote: "",
      },
    );

    expect(warnings.map((warning) => warning.code)).toContain("rights-note-missing");
  });

  it("권리 단서가 있는데 권리 메모가 비어 있으면 메모 기준 제안을 만든다", () => {
    const suggestions = getImportBasisUpdateSuggestions(
      candidate({ bucket: "rightsIp", title: "권리 점검 메모", text: "외부자료 출처와 라이선스 확인 필요" }),
      {
        targetLanguage: "KO",
        targetMarket: "KR",
        publishPlatform: "NONE",
        releasePurpose: "publisher",
        targetEpisodeLength: "",
        rightsNote: "",
      },
    );

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "rightsNote", label: "권리/IP 메모" }),
      ]),
    );
  });

  it("IP 확장 단서가 있으면 출고 목적 조정 제안을 만든다", () => {
    const suggestions = getImportBasisUpdateSuggestions(
      candidate({ text: "웹툰화와 드라마화 IP 피칭용 세계관 요약" }),
      {
        targetLanguage: "KO",
        targetMarket: "KR",
        publishPlatform: "MUNPIA",
        releasePurpose: "serial",
        targetEpisodeLength: "",
        rightsNote: "원작자 본인",
      },
    );

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "releasePurpose", value: "ip_pitch" }),
      ]),
    );
  });

  it("원고 후보 길이가 목표보다 크게 다르면 분량 확인을 만든다", () => {
    const warnings = getImportAlignmentWarnings(
      candidate({ bucket: "manuscript", text: "가".repeat(12000), charCount: 12000 }),
      {
        targetLanguage: "KO",
        targetMarket: "KR",
        publishPlatform: "MUNPIA",
        releasePurpose: "serial",
        targetEpisodeLength: "5,500~7,000자",
        rightsNote: "원작자 본인",
      },
    );

    expect(warnings.map((warning) => warning.code)).toContain("episode-length-long");
  });
});
