import {
  MAX_IMPORT_FILE_REPORTS,
  processProjectImportFiles,
} from "@/components/loreguard/ProjectStart.import-helpers";
import { PublishPlatform } from "@/lib/studio-types";

function makeFile(name: string, content: string): File {
  const file = new File([content], name, { type: "text/markdown" });
  Object.defineProperty(file, "text", {
    value: () => Promise.resolve(content),
  });
  return file;
}

const baseDraft = {
  episodeLength: "5,500자 내외",
  publishPlatform: PublishPlatform.NONE,
  releasePurpose: "serial" as const,
  rightsNote: "",
  targetLanguage: "KO" as const,
  targetMarket: "KR" as const,
};

describe("ProjectStart import helpers", () => {
  it("파일별 결과는 표시 한도 8개가 아니라 기록 한도까지 보존한다", async () => {
    const files = Array.from({ length: 12 }, (_, index) => (
      makeFile(`world-${index + 1}.md`, `# 세계관 메모 ${index + 1}\n세계관 배경과 역사 세력 국가 마법 기술 자료입니다.`)
    ));

    const result = await processProjectImportFiles(files, baseDraft);

    expect(result.fileReports).toHaveLength(12);
    expect(result.fileReports.length).toBeLessThanOrEqual(MAX_IMPORT_FILE_REPORTS);
    expect(result.nextCandidates).toHaveLength(12);
    expect(result.notice).toContain("12/12개 파일");
  });

  it("미지원 파일만 선택해도 파일별 미지원 결과를 여러 건 보존한다", async () => {
    const files = Array.from({ length: 10 }, (_, index) => (
      new File([new Uint8Array([1, 2, 3])], `cover-${index + 1}.png`, { type: "image/png" })
    ));

    const result = await processProjectImportFiles(files, baseDraft);

    expect(result.fileReports).toHaveLength(10);
    expect(result.fileReports.every((report) => report.status === "unsupported")).toBe(true);
    expect(result.notice).toContain("지원 형식은 .txt, .md, .json, .docx, .hwpx, .pdf, .epub 입니다.");
  });
});
