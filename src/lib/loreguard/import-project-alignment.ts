import type { ImportCandidate } from "@/lib/loreguard/import-classifier";
import type { ProjectReleasePurpose, ProjectTargetLanguage, ProjectTargetMarket } from "@/lib/studio-types";

export type ImportAlignmentSeverity = "info" | "warning";

export interface ProjectImportBasis {
  targetLanguage: ProjectTargetLanguage;
  targetMarket: ProjectTargetMarket;
  publishPlatform?: string;
  releasePurpose: ProjectReleasePurpose;
  targetEpisodeLength?: string;
  rightsNote?: string;
}

export interface ImportAlignmentWarning {
  code: string;
  severity: ImportAlignmentSeverity;
  label: string;
  detail: string;
}

export type ImportBasisUpdateField =
  | "targetLanguage"
  | "targetMarket"
  | "publishPlatform"
  | "releasePurpose"
  | "rightsNote";

export interface ImportBasisUpdateSuggestion {
  field: ImportBasisUpdateField;
  label: string;
  currentLabel: string;
  nextLabel: string;
  value: string;
  detail: string;
}

interface PlatformSignal {
  platform: string;
  label: string;
  language: ProjectTargetLanguage;
  market: ProjectTargetMarket;
  patterns: RegExp[];
}

const PLATFORM_SIGNALS: PlatformSignal[] = [
  { platform: "MUNPIA", label: "문피아", language: "KO", market: "KR", patterns: [/문피아|munpia/i] },
  { platform: "NOVELPIA", label: "노벨피아", language: "KO", market: "KR", patterns: [/노벨피아|novelpia/i] },
  { platform: "KAKAOPAGE", label: "카카오페이지", language: "KO", market: "KR", patterns: [/카카오\s*페이지|kakaopage/i] },
  { platform: "SERIES", label: "네이버 시리즈", language: "KO", market: "KR", patterns: [/네이버\s*시리즈|naver\s*series/i] },
  { platform: "ROYAL_ROAD", label: "Royal Road", language: "EN", market: "US", patterns: [/royal\s*road/i] },
  { platform: "WEBNOVEL", label: "WebNovel", language: "EN", market: "US", patterns: [/webnovel/i] },
  { platform: "KINDLE_VELLA", label: "Kindle Vella", language: "EN", market: "US", patterns: [/kindle\s*vella/i] },
  { platform: "WATTPAD", label: "Wattpad", language: "EN", market: "US", patterns: [/wattpad/i] },
  { platform: "KAKUYOMU", label: "Kakuyomu", language: "JP", market: "JP", patterns: [/kakuyomu|カクヨム/i] },
  { platform: "NAROU", label: "Shosetsuka ni Naro", language: "JP", market: "JP", patterns: [/narou|小説家になろう|syosetu/i] },
  { platform: "ALPHAPOLIS", label: "Alphapolis", language: "JP", market: "JP", patterns: [/alphapolis|アルファポリス/i] },
  { platform: "QIDIAN", label: "Qidian", language: "CN", market: "CN", patterns: [/qidian|起点/i] },
  { platform: "JJWXC", label: "JJWXC", language: "CN", market: "CN", patterns: [/jjwxc|晋江/i] },
  { platform: "FANQIE", label: "Fanqie", language: "CN", market: "CN", patterns: [/fanqie|番茄/i] },
];

const LANGUAGE_ONLY_SIGNALS: Array<{ language: ProjectTargetLanguage; label: string; patterns: RegExp[] }> = [
  { language: "KO", label: "한국어", patterns: [/한국어|회차|연재|투고|공모전|자\s*(내외|이상|이하)/i] },
  { language: "EN", label: "영어권", patterns: [/english|chapter|episode|serial|submission|publisher/i] },
  { language: "JP", label: "일본어권", patterns: [/日本語|第\d+話|応募|投稿|ライトノベル/i] },
  { language: "CN", label: "중국어권", patterns: [/中文|简体|繁體|章节|投稿|连载/i] },
];

const RIGHTS_SIGNAL = /권리|저작권|라이선스|계약|출처|원작자|공동저작|상업\s*이용|상표|실명|IP|copyright|license|trademark/i;
const COMMERCIAL_SIGNAL = /상업\s*이용|출판|투고|공모전|계약|판매|피칭|영상화|드라마화|웹툰화|publication|submission|contest|pitch/i;
const IP_PITCH_SIGNAL = /IP\s*판매|IP\s*피칭|영상화|드라마화|웹툰화|게임화|오디오북|굿즈|adaptation|licensing|pitch/i;
const CONTEST_SIGNAL = /공모전|심사|contest|competition|award/i;
const PUBLISHER_SIGNAL = /출판사|매니지먼트|투고|제출|publication|publisher|submission/i;

const TARGET_LANGUAGE_LABEL: Record<ProjectTargetLanguage, string> = {
  KO: "한국어",
  EN: "영어권",
  JP: "일본어권",
  CN: "중국어권",
};

const TARGET_MARKET_LABEL: Record<ProjectTargetMarket, string> = {
  KR: "한국",
  US: "미국·영어권",
  EU: "EU 영어권",
  GB: "영국",
  AU: "호주",
  JP: "일본",
  CN: "중국어권",
  TW: "대만",
  GLOBAL: "글로벌 공통",
};

const RELEASE_PURPOSE_LABEL: Record<ProjectReleasePurpose, string> = {
  serial: "연재 시작",
  contest: "공모전·심사 제출",
  publisher: "출판사·매니지먼트 제출",
  ip_pitch: "IP 판매·피칭",
  private_archive: "개인 보관·정리",
};

function candidateSearchText(candidate: ImportCandidate): string {
  return [candidate.sourceFileName, candidate.title, candidate.reason, candidate.text].join("\n");
}

function uniqueByCode(warnings: ImportAlignmentWarning[]): ImportAlignmentWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    if (seen.has(warning.code)) return false;
    seen.add(warning.code);
    return true;
  });
}

function collectPlatformSignals(text: string): PlatformSignal[] {
  return PLATFORM_SIGNALS.filter((signal) => signal.patterns.some((pattern) => pattern.test(text)));
}

function collectLanguageSignals(text: string): Array<{ language: ProjectTargetLanguage; label: string }> {
  return LANGUAGE_ONLY_SIGNALS
    .filter((signal) => signal.patterns.some((pattern) => pattern.test(text)))
    .map(({ language, label }) => ({ language, label }));
}

function platformLabel(value: string | undefined): string {
  if (!value || value === "NONE") return "미정";
  return PLATFORM_SIGNALS.find((signal) => signal.platform === value)?.label ?? value;
}

function pushUniqueSuggestion(
  suggestions: ImportBasisUpdateSuggestion[],
  suggestion: ImportBasisUpdateSuggestion,
): void {
  if (suggestions.some((item) => item.field === suggestion.field)) return;
  suggestions.push(suggestion);
}

function inferReleasePurpose(text: string): ProjectReleasePurpose | null {
  if (IP_PITCH_SIGNAL.test(text)) return "ip_pitch";
  if (CONTEST_SIGNAL.test(text)) return "contest";
  if (PUBLISHER_SIGNAL.test(text)) return "publisher";
  if (COMMERCIAL_SIGNAL.test(text)) return "publisher";
  return null;
}

// 분량(자 수) 후보의 하한. 회차번호("12화")·소수 회차수 등 본문성 숫자가
// 분량 범위로 오인되는 것을 막는다. 실제 회차 분량 목표는 항상 수백~수천 자 단위.
const EPISODE_LENGTH_MIN_CHARS = 100;

export function parseEpisodeLengthGoal(value: string | undefined): { min: number; max: number } | null {
  const matches = value?.match(/\d[\d,]*/g) ?? [];
  const nums = matches
    .map((match) => Number.parseInt(match.replace(/,/g, ""), 10))
    // [fix] 본문성 숫자(회차번호 등) 오인 방지: 분량으로 볼 수 있는 자 수 하한 이상만 채택
    .filter((num) => Number.isFinite(num) && num >= EPISODE_LENGTH_MIN_CHARS);
  if (nums.length >= 2) {
    const [a, b] = nums;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  if (nums.length === 1) {
    const target = nums[0];
    return { min: Math.round(target * 0.8), max: Math.round(target * 1.2) };
  }
  return null;
}

export function getImportAlignmentWarnings(
  candidate: ImportCandidate,
  basis: ProjectImportBasis,
): ImportAlignmentWarning[] {
  const text = candidateSearchText(candidate);
  const platformSignals = collectPlatformSignals(text);
  const languageSignals = [
    ...collectLanguageSignals(text),
    ...platformSignals.map((signal) => ({ language: signal.language, label: signal.label })),
  ];
  const warnings: ImportAlignmentWarning[] = [];
  const selectedPlatform = basis.publishPlatform && basis.publishPlatform !== "NONE" ? basis.publishPlatform : "";

  const mismatchedLanguage = languageSignals.find((signal) => signal.language !== basis.targetLanguage);
  if (mismatchedLanguage) {
    warnings.push({
      code: "language-mismatch",
      severity: "warning",
      label: "대상 언어권 확인",
      detail: `${mismatchedLanguage.label} 단서가 있어 현재 대상 언어권과 맞는지 확인이 필요합니다.`,
    });
  }

  const mismatchedMarket = platformSignals.find((signal) => basis.targetMarket !== "GLOBAL" && signal.market !== basis.targetMarket);
  if (mismatchedMarket) {
    warnings.push({
      code: "market-mismatch",
      severity: "warning",
      label: "국가·언어권 기준 확인",
      detail: `${mismatchedMarket.label} 단서가 현재 국가·언어권 기준과 다릅니다.`,
    });
  }

  const mismatchedPlatform = selectedPlatform
    ? platformSignals.find((signal) => signal.platform !== selectedPlatform)
    : null;
  if (mismatchedPlatform) {
    warnings.push({
      code: "platform-mismatch",
      severity: "warning",
      label: "출고 플랫폼 확인",
      detail: `${mismatchedPlatform.label} 단서가 있어 선택한 출고 플랫폼과 충돌할 수 있습니다.`,
    });
  }

  const lengthGoal = parseEpisodeLengthGoal(basis.targetEpisodeLength);
  if (candidate.bucket === "manuscript" && lengthGoal && candidate.charCount >= 300) {
    if (candidate.charCount < Math.round(lengthGoal.min * 0.45)) {
      warnings.push({
        code: "episode-length-short",
        severity: "info",
        label: "회차 분량 확인",
        detail: `후보 길이 ${candidate.charCount.toLocaleString()}자가 목표 분량보다 많이 짧습니다.`,
      });
    }
    if (candidate.charCount > Math.round(lengthGoal.max * 1.35)) {
      warnings.push({
        code: "episode-length-long",
        severity: "info",
        label: "회차 분량 확인",
        detail: `후보 길이 ${candidate.charCount.toLocaleString()}자가 목표 분량보다 많이 깁니다.`,
      });
    }
  }

  if ((candidate.bucket === "rightsIp" || RIGHTS_SIGNAL.test(text)) && !basis.rightsNote?.trim()) {
    warnings.push({
      code: "rights-note-missing",
      severity: "warning",
      label: "권리/IP 메모 필요",
      detail: "권리·출처 단서가 있어 채택 전에 권리/IP 메모를 먼저 남기는 편이 좋습니다.",
    });
  }

  if (basis.releasePurpose === "private_archive" && COMMERCIAL_SIGNAL.test(text)) {
    warnings.push({
      code: "release-purpose-commercial",
      severity: "info",
      label: "출고 목적 확인",
      detail: "개인 보관 목적과 다른 상업·제출 단서가 있습니다.",
    });
  }

  if (basis.releasePurpose === "serial" && IP_PITCH_SIGNAL.test(text)) {
    warnings.push({
      code: "release-purpose-ip",
      severity: "info",
      label: "출고 목적 확인",
      detail: "연재 시작 외에 IP 확장 단서가 있어 출고 목적을 다시 볼 수 있습니다.",
    });
  }

  return uniqueByCode(warnings);
}

export function getImportBasisUpdateSuggestions(
  candidate: ImportCandidate,
  basis: ProjectImportBasis,
): ImportBasisUpdateSuggestion[] {
  const text = candidateSearchText(candidate);
  const platformSignals = collectPlatformSignals(text);
  const languageSignals = collectLanguageSignals(text);
  const primaryPlatform = platformSignals[0];
  const selectedPlatform = basis.publishPlatform && basis.publishPlatform !== "NONE" ? basis.publishPlatform : "";
  const suggestions: ImportBasisUpdateSuggestion[] = [];

  if (primaryPlatform) {
    if (primaryPlatform.language !== basis.targetLanguage) {
      pushUniqueSuggestion(suggestions, {
        field: "targetLanguage",
        label: "대상 언어권",
        currentLabel: TARGET_LANGUAGE_LABEL[basis.targetLanguage],
        nextLabel: TARGET_LANGUAGE_LABEL[primaryPlatform.language],
        value: primaryPlatform.language,
        detail: `${primaryPlatform.label} 단서에 맞춰 대상 언어권을 조정합니다.`,
      });
    }

    if (primaryPlatform.market !== basis.targetMarket) {
      pushUniqueSuggestion(suggestions, {
        field: "targetMarket",
        label: "국가·언어권 기준",
        currentLabel: TARGET_MARKET_LABEL[basis.targetMarket],
        nextLabel: TARGET_MARKET_LABEL[primaryPlatform.market],
        value: primaryPlatform.market,
        detail: `${primaryPlatform.label} 기준으로 출고 국가·언어권을 맞춥니다.`,
      });
    }

    if (primaryPlatform.platform !== selectedPlatform) {
      pushUniqueSuggestion(suggestions, {
        field: "publishPlatform",
        label: "출고 플랫폼",
        currentLabel: platformLabel(selectedPlatform),
        nextLabel: primaryPlatform.label,
        value: primaryPlatform.platform,
        detail: `불러온 자료의 플랫폼 단서를 프로젝트 기준에 반영합니다.`,
      });
    }
  } else {
    const languageSignal = languageSignals.find((signal) => signal.language !== basis.targetLanguage);
    if (languageSignal) {
      pushUniqueSuggestion(suggestions, {
        field: "targetLanguage",
        label: "대상 언어권",
        currentLabel: TARGET_LANGUAGE_LABEL[basis.targetLanguage],
        nextLabel: TARGET_LANGUAGE_LABEL[languageSignal.language],
        value: languageSignal.language,
        detail: `${languageSignal.label} 단서에 맞춰 대상 언어권을 조정합니다.`,
      });
    }
  }

  const nextReleasePurpose = inferReleasePurpose(text);
  if (nextReleasePurpose && nextReleasePurpose !== basis.releasePurpose) {
    pushUniqueSuggestion(suggestions, {
      field: "releasePurpose",
      label: "출고 목적",
      currentLabel: RELEASE_PURPOSE_LABEL[basis.releasePurpose],
      nextLabel: RELEASE_PURPOSE_LABEL[nextReleasePurpose],
      value: nextReleasePurpose,
      detail: "상업·제출·IP 확장 단서에 맞춰 출고 목적을 조정합니다.",
    });
  }

  if ((candidate.bucket === "rightsIp" || RIGHTS_SIGNAL.test(text)) && !basis.rightsNote?.trim()) {
    pushUniqueSuggestion(suggestions, {
      field: "rightsNote",
      label: "권리/IP 메모",
      currentLabel: "비어 있음",
      nextLabel: "읽은 자료 단서 기록",
      value: `읽은 자료 "${candidate.title}"에서 권리/IP 확인 단서를 발견했습니다. 원작자, 공동기획, 외부자료, 상업 이용 범위를 확인합니다.`,
      detail: "권리·출처 단서를 프로젝트 기준 메모에 먼저 남깁니다.",
    });
  }

  return suggestions;
}

export function summarizeImportAlignmentWarnings(warnings: ImportAlignmentWarning[], limit = 2): string {
  const shown = warnings.slice(0, limit).map((warning) => `${warning.label}: ${warning.detail}`);
  const rest = warnings.length - shown.length;
  return rest > 0 ? `${shown.join("\n")} 외 ${rest}건` : shown.join("\n");
}
