import {
  getNovelStudioHref,
  getStudioEntryMode,
  STUDIO_ENTRY_PARAM,
  STUDIO_PROJECT_TAB,
  STUDIO_TAB_PARAM,
} from "@/lib/studio-entry-links";

describe("studio-entry-links", () => {
  it("프로젝트 생성 진입점은 프로젝트 탭을 명시한다", () => {
    expect(getNovelStudioHref("create")).toBe(`/studio?${STUDIO_TAB_PARAM}=${STUDIO_PROJECT_TAB}`);
  });

  it("프로젝트 관리와 불러오기 진입점은 프로젝트 탭과 entry를 함께 유지한다", () => {
    expect(getNovelStudioHref("manage")).toBe(
      `/studio?${STUDIO_TAB_PARAM}=${STUDIO_PROJECT_TAB}&${STUDIO_ENTRY_PARAM}=manage`,
    );
    expect(getNovelStudioHref("import")).toBe(
      `/studio?${STUDIO_TAB_PARAM}=${STUDIO_PROJECT_TAB}&${STUDIO_ENTRY_PARAM}=import`,
    );
  });

  it("알 수 없는 entry 값은 create로 접는다", () => {
    expect(getStudioEntryMode("unknown")).toBe("create");
    expect(getStudioEntryMode(null)).toBe("create");
  });
});
