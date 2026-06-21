import {
  classifyImportedText,
  isSupportedImportFileName,
  requiresServerImportExtraction,
} from "@/lib/loreguard/import-classifier";

describe("classifyImportedText", () => {
  it("연출·콘티 자료는 씬시트가 아니라 연출 후보로 분류한다", () => {
    const candidates = classifyImportedText(
      "direction-note.md",
      [
        "# 연출 노트",
        "컷 1: 로우 앵글로 문을 보여준다.",
        "카메라: 손끝에서 열쇠로 이동한다.",
        "조명: 차갑고 낮은 청색광.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "direction",
      title: "연출 노트",
    });
  });

  it("장면 구조 자료는 씬 후보로 유지한다", () => {
    const candidates = classifyImportedText(
      "scene-sheet.md",
      [
        "# 씬시트 3화",
        "씬 1: 경비 교대 - 서윤이 경비 교대의 틈을 확인한다.",
        "씬 2: 문장 해독 - 주인공이 새벽 열쇠의 문장을 읽는다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "scenes",
      title: "씬시트 3화",
    });
  });

  it("DOCX와 PDF, EPUB을 지원 파일로 보되 서버 추출 대상으로 분리한다", () => {
    expect(isSupportedImportFileName("world.docx")).toBe(true);
    expect(isSupportedImportFileName("reference.pdf")).toBe(true);
    expect(isSupportedImportFileName("novel.epub")).toBe(true);
    expect(requiresServerImportExtraction("world.docx")).toBe(true);
    expect(requiresServerImportExtraction("reference.pdf")).toBe(true);
    expect(requiresServerImportExtraction("novel.epub")).toBe(true);
    expect(requiresServerImportExtraction("memo.md")).toBe(false);
  });

  it("DOCX에서 추출된 텍스트도 원래 파일 형식을 후보에 남긴다", () => {
    const candidates = classifyImportedText(
      "world-notes.docx",
      [
        "# 세계관 메모",
        "세계관 배경과 역사, 세력, 국가, 마법 기술을 정리한 문서입니다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "world",
      detectedFormat: "docx",
      title: "세계관 메모",
    });
  });

  it("EPUB에서 추출된 챕터도 원래 파일 형식을 후보에 남긴다", () => {
    const candidates = classifyImportedText(
      "novel.epub",
      [
        "# 프롤로그",
        "프롤로그. 제 1화처럼 이어지는 긴 본문입니다. 주인공은 새벽 문 앞에서 첫 선택을 한다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "manuscript",
      detectedFormat: "epub",
      title: "프롤로그",
    });
  });

  it("IP 판매와 미디어 확장 양식은 권리/IP 후보로 분류한다", () => {
    const candidates = classifyImportedText(
      "ip-pack.md",
      [
        "# IP 판매용 자산화 메모",
        "웹툰화, 드라마화, 영상화, 각색권, 2차 저작 범위와 수익 배분 조건을 정리한다.",
        "제출용 피칭 문서에는 판권 범위와 독점/비독점 조건을 함께 표시한다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "rightsIp",
      title: "IP 판매용 자산화 메모",
    });
  });

  it("프리비주얼과 샷리스트는 연출 후보로 분류한다", () => {
    const candidates = classifyImportedText(
      "previsual.md",
      [
        "# 프리비주얼 노트",
        "샷 리스트: 로우 앵글, 트래킹, 패닝, 클로즈업.",
        "색감은 차갑게 잡고 BGM과 효과음은 장면 전환점에서만 사용한다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "direction",
      title: "프리비주얼 노트",
    });
  });

  it("시놉시스와 트리트먼트는 메인 시나리오 후보로 분류한다", () => {
    const candidates = classifyImportedText(
      "synopsis.md",
      [
        "# 1부 시놉시스",
        "로그라인: 버려진 편집자가 금지된 원고를 찾아 메인 아크를 시작한다.",
        "트리트먼트에는 도입부, 중반부, 클라이맥스, 엔딩의 사건 흐름을 적는다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "mainScenario",
      title: "1부 시놉시스",
    });
  });

  it("씬 목표와 감정 변화가 있는 제작표는 씬 후보로 분류한다", () => {
    const candidates = classifyImportedText(
      "episode-03-scenes.md",
      [
        "# 3화 장면표",
        "장면 목표: 주인공이 금고 안의 원고를 확인한다.",
        "갈등: 경비의 입장과 주인공의 퇴장이 겹친다.",
        "전환점: 감정 변화가 분노에서 확신으로 바뀐다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "scenes",
      title: "3화 장면표",
    });
  });

  it("캐릭터 프로필 양식은 세계관이나 씬이 아니라 캐릭터 후보로 분류한다", () => {
    const candidates = classifyImportedText(
      "character-profile.json",
      JSON.stringify({
        "노아 프로필": {
          이름: "노아",
          나이: "미상",
          직업: "관리 안드로이드",
          외형: "은색 머리와 녹색 눈",
          목표: "작가의 기록을 보호한다",
          비밀: "감정 표현을 숨긴다",
          관계도: "Room 402 관리 체계",
        },
      }),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "characters",
      title: "노아 프로필",
    });
  });

  it("표 헤더와 제목은 긴 본문보다 강한 분류 단서로 반영한다", () => {
    const candidates = classifyImportedText(
      "rights-table.md",
      [
        "# IP Pack 제출용 표",
        "| 구분 | 각색권 | 정산 | 독점 |",
        "|---|---|---|---|",
        "| 웹툰화 | 가능 | 별도 협의 | 비독점 |",
        "세계관 배경 국가 마법 역사 문화 세력 기술 지리 자료를 함께 첨부한다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "rightsIp",
      title: "IP Pack 제출용 표",
    });
    expect(candidates[0].reason).toContain("제목/양식 구조 단서");
  });

  it("라벨형 양식은 본문 설명보다 양식 항목을 우선 단서로 삼는다", () => {
    const candidates = classifyImportedText(
      "scenario-form.md",
      [
        "# 1부 시놉시스",
        "로그라인: 버려진 편집자가 금지된 원고를 찾아 나선다.",
        "클라이맥스: 원고의 주인이 살아 있음을 확인한다.",
        "엔딩: 다음 시즌의 갈등을 남긴다.",
        "배경 설명에는 국가, 세력, 문화, 기술, 법, 지리, 금기 자료가 함께 들어간다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "mainScenario",
      title: "1부 시놉시스",
    });
    expect(candidates[0].reason).toContain("제목/양식 구조 단서");
  });

  it("JSON key도 양식 구조 단서로 사용한다", () => {
    const candidates = classifyImportedText(
      "visual-form.json",
      JSON.stringify({
        visualForm: {
          "샷 리스트": ["클로즈업", "트래킹"],
          렌즈: "35mm",
          BGM: "낮은 현악",
          메모: "세계관 배경과 국가 자료는 별도 설정집을 따른다.",
        },
      }),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "direction",
      title: "visualForm",
    });
    expect(candidates[0].reason).toContain("양식 구조 단서");
  });

  it("파일명 단서도 후보 분류에 반영한다", () => {
    const candidates = classifyImportedText(
      "ip-pack-draft.md",
      [
        "# 첨부 자료",
        "요약 문서입니다.",
        "세부 조건은 다음 단계에서 채웁니다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "rightsIp",
      title: "첨부 자료",
    });
    expect(candidates[0].reason).toContain("파일명 단서");
  });

  it("Markdown 제목 깊이가 얕을수록 제목 단서의 신뢰도가 높다", () => {
    const topLevel = classifyImportedText("memo.md", "# 시놉시스\n요약만 남김");
    const deepLevel = classifyImportedText("memo.md", "##### 시놉시스\n요약만 남김");

    expect(topLevel[0]).toMatchObject({ bucket: "mainScenario" });
    expect(deepLevel[0]).toMatchObject({ bucket: "mainScenario" });
    expect(topLevel[0].confidence).toBeGreaterThan(deepLevel[0].confidence);
  });

  it("zip 같은 파일명 조각을 IP 단서로 오인하지 않는다", () => {
    const candidates = classifyImportedText(
      "zip-download.md",
      [
        "# 첨부 파일",
        "압축 파일 다운로드 안내만 적힌 문서입니다.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "unclassified",
      title: "첨부 파일",
    });
  });

  it("영문 캐릭터 시트의 Role/Personality/Appearance 라벨을 캐릭터 후보로 분류한다", () => {
    const candidates = classifyImportedText(
      "cast-sheet.md",
      [
        "# Character Sheet",
        "Name: Noah",
        "Role: archive operator",
        "Personality: calm, blunt, protective",
        "Appearance: silver hair and green eyes",
        "Goal: keep the author's records intact",
        "Setting notes mention an empire and old city law.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "characters",
      title: "Character Sheet",
    });
    expect(candidates[0].reason).toContain("양식 구조 단서");
  });

  it("영문 world bible 라벨을 세계관 후보로 분류한다", () => {
    const candidates = classifyImportedText(
      "setting-bible.md",
      [
        "# Setting Bible",
        "World History: the orbital city split from the ground colonies.",
        "Magic System: memory seals are powered by recorded consent.",
        "Factions: the council, the guild, and the archive office.",
        "Culture: contracts are spoken aloud before every expedition.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "world",
      title: "Setting Bible",
    });
    expect(candidates[0].reason).toContain("양식 구조 단서");
  });

  it("영문 rights/contract 라벨을 권리/IP 후보로 분류한다", () => {
    const candidates = classifyImportedText(
      "contract-notes.md",
      [
        "# Contract Notes",
        "Rights: adaptation rights are reserved by the author.",
        "License: non-exclusive translation license only.",
        "Revenue Share: settlement is handled per platform report.",
        "Pitch: webtoon and audio drama submission package.",
      ].join("\n"),
    );

    expect(candidates[0]).toMatchObject({
      bucket: "rightsIp",
      title: "Contract Notes",
    });
    expect(candidates[0].reason).toContain("양식 구조 단서");
  });
});
