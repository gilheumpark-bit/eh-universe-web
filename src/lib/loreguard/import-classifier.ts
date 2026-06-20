export type ImportBucket =
  | "world"
  | "characters"
  | "items"
  | "mainScenario"
  | "scenes"
  | "direction"
  | "manuscript"
  | "rightsIp"
  | "unclassified";

export interface ImportCandidate {
  id: string;
  sourceFileName: string;
  bucket: ImportBucket;
  title: string;
  text: string;
  excerpt: string;
  confidence: number;
  reason: string;
  detectedFormat: "txt" | "md" | "json" | "docx" | "pdf" | "epub";
  sectionIndex: number;
  charCount: number;
  importedAt: string;
}

export const IMPORT_BUCKET_LABELS: Record<ImportBucket, string> = {
  world: "세계관",
  characters: "캐릭터",
  items: "아이템",
  mainScenario: "메인 시나리오",
  scenes: "씬",
  direction: "연출",
  manuscript: "원고",
  rightsIp: "권리/IP 메모",
  unclassified: "미분류",
};

const SUPPORTED_IMPORT_EXTENSIONS = new Set(["txt", "md", "json", "docx", "pdf", "epub"]);
const SERVER_EXTRACT_IMPORT_EXTENSIONS = new Set(["docx", "pdf", "epub"]);

interface ImportSection {
  title: string;
  text: string;
  headingDepth: number;
}

const BUCKET_PATTERNS: Array<{
  bucket: ImportBucket;
  reason: string;
  patterns: RegExp[];
}> = [
  {
    bucket: "rightsIp",
    reason: "권리, 계약, 출처, IP 확장 관련 단서",
    patterns: [
      /권리|저작권|라이선스|계약|출처|원작자|공동저작|상업\s*이용|상표|실명|\bIP\b/i,
      /판권|각색권|2차\s*저작|이차\s*저작|독점|비독점|수익\s*배분|정산|초상권|퍼블리시티권/i,
      /웹툰화|드라마화|영상화|게임화|애니화|오디오\s*드라마|미디어\s*믹스|IP\s*판매|피칭|제출용/i,
    ],
  },
  {
    bucket: "characters",
    reason: "인물, 말투, 관계 관련 단서",
    patterns: [
      /캐릭터|인물|등장인물|주인공|조연|악역|말투|성격|관계|이름/i,
      /프로필|나이|직업|소속|외형|목표|욕망|비밀|트라우마|호칭|관계도|라이벌|조력자/i,
    ],
  },
  {
    bucket: "items",
    reason: "아이템, 장비, 능력 관련 단서",
    patterns: [
      /아이템|물건|무기|유물|장비|스킬|능력|마법도구|소지품/i,
      /아티팩트|소품|무구|장신구|스탯|등급|효과|부작용|획득\s*조건|강화|제작법/i,
    ],
  },
  {
    bucket: "direction",
    reason: "연출, 콘티, 샷, 카메라 관련 단서",
    patterns: [
      /연출|콘티|컷|샷|카메라|앵글|클로즈업|롱샷|몽타주|동선|조명|리듬|화면|스토리보드|shot|camera|storyboard/i,
      /프리비주얼|프리\s*비주얼|previsual|샷\s*리스트|구도|렌즈|패닝|틸트|트래킹|색감|음향|효과음|BGM|연기톤/i,
    ],
  },
  {
    bucket: "scenes",
    reason: "씬, 장면 구조 관련 단서",
    patterns: [
      /씬|장면|장소|시간대|대사|시점|액션/i,
      /씬시트|장면표|장면\s*목표|목적|갈등|전환점|후킹|입장|퇴장|감정\s*변화|비트\s*목표/i,
    ],
  },
  {
    bucket: "mainScenario",
    reason: "플롯, 줄거리, 결말 관련 단서",
    patterns: [
      /시나리오|플롯|줄거리|기승전결|결말|반전|챕터|메인\s*사건|사건\s*흐름/i,
      /시놉시스|트리트먼트|로그라인|메인\s*아크|서사\s*아크|클라이맥스|도입부|중반부|후반부|엔딩/i,
    ],
  },
  {
    bucket: "world",
    reason: "세계관, 역사, 사회 체계 관련 단서",
    patterns: [
      /세계관|배경|역사|문화|종교|법|경제|세력|국가|마법|기술|지리|금기/i,
      /세계관\s*(메모|설정|자료|정리)|배경\s*(메모|설정|자료|정리)|world\s*building/i,
      /시대|연표|지역|도시|왕국|제국|계급|신분|통화|화폐|길드|규칙|세계\s*법칙|마력\s*체계|권력\s*구조/i,
    ],
  },
  {
    bucket: "manuscript",
    reason: "원고 본문 또는 회차 서술 단서",
    patterns: [/원고|본문|프롤로그|에피소드|회차|제\s*\d+\s*화|“|”|"[^"]{8,}"/i],
  },
];

export function isSupportedImportFileName(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_IMPORT_EXTENSIONS.has(ext);
}

export function requiresServerImportExtraction(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return SERVER_EXTRACT_IMPORT_EXTENSIONS.has(ext);
}

export function classifyImportedText(sourceFileName: string, rawText: string): ImportCandidate[] {
  const text = rawText.trim();
  if (!text) return [];

  const ext = sourceFileName.split(".").pop()?.toLowerCase() ?? "";
  const detectedFormat: ImportCandidate["detectedFormat"] =
    ext === "json" || ext === "md" || ext === "docx" || ext === "pdf" || ext === "epub" ? ext : "txt";
  const importedAt = new Date().toISOString();
  const fileNameHints = extractFileNameClassifierHints(sourceFileName);
  const sections = detectedFormat === "json" ? sectionsFromJson(text) : sectionsFromMarkdownOrText(text);

  return sections.map((section, index) => {
    const classified = classifySection(section, fileNameHints);
    const excerpt = section.text.replace(/\s+/g, " ").trim().slice(0, 180);
    return {
      id: `${slugify(sourceFileName)}-${index}-${classified.bucket}`,
      sourceFileName,
      bucket: classified.bucket,
      title: section.title || IMPORT_BUCKET_LABELS[classified.bucket],
      text: section.text,
      excerpt,
      confidence: classified.confidence,
      reason: classified.reason,
      detectedFormat,
      sectionIndex: index,
      charCount: section.text.length,
      importedAt,
    };
  });
}

function sectionsFromMarkdownOrText(text: string): ImportSection[] {
  const lines = text.split(/\r?\n/);
  const sections: ImportSection[] = [];
  let currentTitle = "";
  let currentHeadingDepth = 0;
  let currentLines: string[] = [];

  const flush = () => {
    const body = currentLines.join("\n").trim();
    if (body) sections.push({ title: currentTitle || "불러온 자료", text: body, headingDepth: currentHeadingDepth });
    currentLines = [];
  };

  for (const line of lines) {
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      flush();
      currentHeadingDepth = heading[1].length;
      currentTitle = heading[2].trim();
      continue;
    }
    currentLines.push(line);
  }
  flush();

  if (sections.length > 0) return sections.slice(0, 24);

  return text
    .split(/\n\s*\n/g)
    .map((part, index) => ({ title: index === 0 ? "불러온 자료" : `불러온 자료 ${index + 1}`, text: part.trim(), headingDepth: 0 }))
    .filter((section) => section.text.length > 0)
    .slice(0, 24);
}

function sectionsFromJson(text: string): ImportSection[] {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>);
      return entries
        .map(([key, value]) => ({ title: key, text: stringifyJsonValue(value), headingDepth: 1 }))
        .filter((section) => section.text.trim().length > 0)
        .slice(0, 24);
    }
    return [{ title: "JSON 자료", text: stringifyJsonValue(parsed), headingDepth: 1 }];
  } catch {
    return sectionsFromMarkdownOrText(text);
  }
}

function stringifyJsonValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function classifySection(section: ImportSection, fileNameHints: string): { bucket: ImportBucket; confidence: number; reason: string } {
  const structuralHints = extractStructuredClassifierHints(section);
  const titleWeight = section.headingDepth <= 1 ? 3 : section.headingDepth <= 3 ? 2.4 : 1.8;
  const scores = BUCKET_PATTERNS.map((entry) => {
    const fileNameScore = entry.patterns.some((pattern) => patternMatches(fileNameHints, pattern)) ? 1 : 0;
    const titleScore = entry.patterns.reduce((sum, pattern) => sum + countPatternMatches(section.title, pattern), 0) * titleWeight;
    const structureScore = entry.patterns.reduce((sum, pattern) => sum + countPatternMatches(structuralHints, pattern), 0) * 2;
    const bodyScore = entry.patterns.reduce((sum, pattern) => sum + countPatternMatches(section.text, pattern), 0);
    return { ...entry, fileNameScore, titleScore, structureScore, bodyScore, score: fileNameScore + titleScore + structureScore + bodyScore };
  }).sort((a, b) =>
    b.score - a.score ||
    (b.titleScore + b.structureScore + b.bodyScore) - (a.titleScore + a.structureScore + a.bodyScore)
  );

  const best = scores[0];
  if (!best || best.score === 0) {
    const text = `${section.title}\n${section.text}`;
    const manuscriptLikely = text.length > 700 && /[.!?。！？]|다\.|요\./.test(text);
    return manuscriptLikely
      ? { bucket: "manuscript", confidence: 0.48, reason: "긴 서술형 본문 단서" }
      : { bucket: "unclassified", confidence: 0.2, reason: "분류 단서 부족" };
  }

  return {
    bucket: best.bucket,
    confidence: Math.min(0.92, 0.42 + best.score * 0.08),
    reason: formatClassifyReason(best.reason, {
      fileName: best.fileNameScore > 0,
      title: best.titleScore > 0,
      structure: best.structureScore > 0,
    }),
  };
}

function formatClassifyReason(reason: string, hints: { fileName: boolean; title: boolean; structure: boolean }): string {
  const hintLabels = [
    hints.fileName ? "파일명" : "",
    hints.title ? "제목" : "",
    hints.structure ? "양식 구조" : "",
  ].filter(Boolean);
  return hintLabels.length > 0 ? `${reason} (${hintLabels.join("/")} 단서)` : reason;
}

function countPatternMatches(value: string, pattern: RegExp): number {
  if (!value.trim()) return 0;
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return value.match(new RegExp(pattern.source, flags))?.length ?? 0;
}

function patternMatches(value: string, pattern: RegExp): boolean {
  if (!value.trim()) return false;
  return new RegExp(pattern.source, pattern.flags.replace("g", "")).test(value);
}

function extractStructuredClassifierHints(section: Pick<ImportSection, "text">): string {
  const hints: string[] = [];
  const lines = section.text.split(/\r?\n/).slice(0, 160);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^\|.+\|$/.test(trimmed)) {
      hints.push(
        ...trimmed
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell.length > 0 && !/^:?-{2,}:?$/.test(cell)),
      );
    }

    const label = trimmed.match(/^(?:[-*]\s*)?([^:：|]{1,36})\s*[:：]/);
    if (label) hints.push(label[1].trim());

    for (const match of trimmed.matchAll(/"([^"]{1,48})"\s*:/g)) {
      hints.push(match[1].trim());
    }
  }

  return hints.join("\n");
}

function extractFileNameClassifierHints(sourceFileName: string): string {
  const baseName = sourceFileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_.,()[\]{}]+/g, " ")
    .replace(/[-]+/g, " ")
    .trim();
  const lower = baseName.toLowerCase();
  const aliases: string[] = [];

  if (/\bip\s*pack\b|\bright(s)?\b|\blicen[cs]e\b|\bpitch\b|\bcontract\b/.test(lower)) {
    aliases.push("IP Pack 권리 라이선스 계약 피칭 제출용");
  }
  if (/\bcharacter\b|\bprofile\b|\bpersona\b|\broster\b/.test(lower)) {
    aliases.push("캐릭터 프로필 인물 관계도");
  }
  if (/\bitem\b|\bartifact\b|\bskill\b|\bweapon\b|\bprop\b/.test(lower)) {
    aliases.push("아이템 아티팩트 스킬 무기 소품");
  }
  if (/\bdirection\b|\bprevisual\b|\bprevis\b|\bvisual\b|\bstoryboard\b|\bshot\s*list\b/.test(lower)) {
    aliases.push("연출 프리비주얼 스토리보드 샷 리스트");
  }
  if (/\bscene\s*(sheet|list)?\b|\bbeat\s*(sheet)?\b/.test(lower)) {
    aliases.push("씬시트 장면표 비트 목표 갈등");
  }
  if (/\bsynopsis\b|\btreatment\b|\bplot\b|\bscenario\b|\blogline\b|\boutline\b/.test(lower)) {
    aliases.push("시놉시스 트리트먼트 플롯 로그라인 메인 아크");
  }
  if (/\bworld\b|\bworldbook\b|\bsetting\b|\blore\b|\btimeline\b/.test(lower)) {
    aliases.push("세계관 설정집 배경 연표 역사");
  }

  return [baseName, ...aliases].join("\n");
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "import";
}
