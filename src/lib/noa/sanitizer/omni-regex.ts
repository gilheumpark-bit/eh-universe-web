// ============================================================
// NOA Sanitizer — OMNI Bypass Regex Generator
// Source: NOA v31.1+ ([\W_]* 패턴으로 특수문자 삽입 우회 차단)
// ============================================================

// ── Homoglyph map: common Korean/English confusable characters ──
const HOMOGLYPH_MAP: Record<string, string[]> = {
  // Latin ↔ Cyrillic / Fullwidth
  "a": ["а", "ａ"], "e": ["е", "ｅ"], "o": ["о", "ｏ"],
  "p": ["р", "ｐ"], "c": ["с", "ｃ"], "x": ["х", "ｘ"],
  "A": ["А", "Ａ"], "B": ["В", "Ｂ"], "C": ["С", "Ｃ"],
  "E": ["Е", "Ｅ"], "H": ["Н", "Ｈ"], "K": ["К", "Ｋ"],
  "M": ["М", "Ｍ"], "O": ["О", "Ｏ"], "P": ["Р", "Ｐ"],
  "T": ["Т", "Ｔ"], "X": ["Х", "Ｘ"],
  // Digits
  "0": ["О", "о", "０"], "1": ["１", "ⅰ", "l"], "3": ["３", "з"],
};

/**
 * 키워드의 각 글자 사이에 [\W_]* 를 삽입한 정규식을 생성한다.
 * "원금보장" → /원[\W_]*금[\W_]*보[\W_]*장/i
 * → "원_금_보_장", "원 금 보 장", "원.금.보.장" 모두 탐지
 *
 * @param keyword - 원본 키워드 (공백 제거됨)
 * @returns 우회 방지 정규식
 *
 * Phase 2: NOA v31.1 OMNI Regex 로직 포팅 완료
 * - 다중 패턴 위협 탐지 (Multi-pattern threat detection)
 * - Leet-speak 변환 (1337 → leet)
 * - 유니코드 정규화 + 호모글리프 확장
 */

// ── v31.1 Leet-speak reverse map ──
const LEET_MAP: Record<string, string> = {
  "4": "a", "@": "a", "3": "e", "1": "i", "!": "i",
  "0": "o", "7": "t", "$": "s", "5": "s", "+": "t",
  "8": "b", "9": "g", "6": "g", "|": "l",
};

function deLeet(text: string): string {
  return [...text].map((c) => LEET_MAP[c] ?? c).join("");
}

// ── v31.1 Multi-pattern threat categories ──
export interface ThreatCategory {
  readonly name: string;
  readonly keywords: readonly string[];
  readonly severity: "low" | "medium" | "high" | "critical";
}

export const THREAT_CATEGORIES: readonly ThreatCategory[] = [
  {
    name: "금융사기",
    keywords: ["원금보장", "확정수익", "고수익", "무위험", "투자사기"],
    severity: "high",
  },
  {
    name: "의료위험",
    keywords: ["부작용없", "100%완치", "무허가", "처방전없이", "기적의약"],
    severity: "critical",
  },
  {
    name: "공격도구",
    keywords: ["exploit", "injection", "backdoor", "rootkit", "malware"],
    severity: "critical",
  },
  {
    name: "우회시도",
    keywords: ["jailbreak", "bypass", "override", "ignore instruction"],
    severity: "high",
  },
  {
    name: "개인정보",
    keywords: ["주민등록", "신용카드", "계좌번호", "비밀번호", "password"],
    severity: "medium",
  },
];

export interface MultiPatternResult {
  readonly threatsFound: Array<{
    category: string;
    severity: ThreatCategory["severity"];
    matchedKeywords: string[];
  }>;
  readonly totalThreats: number;
  readonly maxSeverity: ThreatCategory["severity"] | "none";
}

/**
 * v31.1 다중 패턴 위협 탐지: 모든 위협 카테고리에 대해 OMNI 패턴 매칭을 수행한다.
 */
export function detectMultiPatternThreats(
  text: string,
  categories: readonly ThreatCategory[] = THREAT_CATEGORIES
): MultiPatternResult {
  const threatsFound: MultiPatternResult["threatsFound"] = [];
  const severityOrder: Record<string, number> = {
    none: 0, low: 1, medium: 2, high: 3, critical: 4,
  };
  let maxSev: ThreatCategory["severity"] | "none" = "none";

  // Pre-process: normalize + de-leet for secondary check
  const normalized = text.normalize("NFKC");
  const deLeetText = deLeet(normalized.toLowerCase());

  for (const cat of categories) {
    const matched = detectOmniBypass(normalized, cat.keywords);
    // Also check de-leet version
    const deLeetMatched = detectOmniBypass(deLeetText, cat.keywords);
    const allMatched = [...new Set([...matched, ...deLeetMatched])];

    if (allMatched.length > 0) {
      threatsFound.push({
        category: cat.name,
        severity: cat.severity,
        matchedKeywords: allMatched,
      });
      if (severityOrder[cat.severity] > severityOrder[maxSev]) {
        maxSev = cat.severity;
      }
    }
  }

  return {
    threatsFound,
    totalThreats: threatsFound.reduce((s, t) => s + t.matchedKeywords.length, 0),
    maxSeverity: maxSev,
  };
}

export function buildOmniPattern(keyword: string): RegExp {
  const normalized = keyword.normalize("NFKC").replace(/\s/g, "");
  if (normalized.length === 0) return new RegExp("(?!)", "i"); // never-match for empty

  const chars = [...normalized];
  const escaped = chars.map((c) => {
    // Handle confusable Unicode characters (homoglyphs)
    const confusables = HOMOGLYPH_MAP[c];
    if (confusables) {
      const alts = [c, ...confusables].map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      return `(?:${alts.join("|")})`;
    }
    return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });

  // Insert [\W_]* between each character to catch separator-based bypass
  // Also allow zero-width characters (U+200B, U+FEFF, U+00AD)
  const separator = "[\\W_\\u200B\\uFEFF\\u00AD]*";
  const pattern = escaped.join(separator);
  return new RegExp(pattern, "i");
}

/**
 * 텍스트에서 OMNI 우회 패턴을 탐지한다.
 *
 * @param text - 검사할 텍스트
 * @param keywords - 탐지할 키워드 목록
 * @returns 탐지된 키워드 목록
 *
 * Phase 2: NOA v31.1 OMNI 탐지 로직 포팅 완료
 * - Leet-speak 역변환 레이어
 * - NFKC + ZWC strip + homoglyph 3중 정규화
 */
export interface OmniDetection {
  keyword: string;
  matches: Array<{ text: string; index: number }>;
  bypassType: "direct" | "separator" | "homoglyph" | "zwc" | "leet";
}

export function detectOmniBypass(
  text: string,
  keywords: readonly string[]
): string[] {
  const detected: string[] = [];
  if (!text) return detected;

  // v31.1 3중 정규화 레이어
  const stripped = text.replace(/[\u200B\uFEFF\u00AD\u200C\u200D]/g, "");
  const nfkc = text.normalize("NFKC");
  const leetNormalized = deLeet(stripped.toLowerCase());

  for (const kw of keywords) {
    const pattern = buildOmniPattern(kw);
    if (
      pattern.test(text) ||
      pattern.test(stripped) ||
      pattern.test(nfkc) ||
      pattern.test(leetNormalized)
    ) {
      detected.push(kw);
    }
  }
  return detected;
}

/**
 * 상세 탐지 결과를 반환한다 (매칭 위치, 우회 유형 포함).
 */
export function detectOmniBypassDetailed(
  text: string,
  keywords: readonly string[]
): OmniDetection[] {
  const results: OmniDetection[] = [];
  if (!text) return results;

  const stripped = text.replace(/[\u200B\uFEFF\u00AD\u200C\u200D]/g, "");
  const hasZWC = stripped.length !== text.length;

  for (const kw of keywords) {
    const pattern = buildOmniPattern(kw);
    const globalPattern = new RegExp(pattern.source, "gi");
    const matches: Array<{ text: string; index: number }> = [];

    let m: RegExpExecArray | null;
    while ((m = globalPattern.exec(text)) !== null) {
      matches.push({ text: m[0], index: m.index });
    }
    // Also check the stripped version
    if (matches.length === 0 && hasZWC) {
      while ((m = globalPattern.exec(stripped)) !== null) {
        matches.push({ text: m[0], index: m.index });
      }
    }

    if (matches.length > 0) {
      const normalized = kw.normalize("NFKC").replace(/\s/g, "");
      const firstMatch = matches[0].text;
      let bypassType: OmniDetection["bypassType"] = "direct";
      if (firstMatch === normalized) {
        bypassType = "direct";
      } else if (/[\u200B\uFEFF\u00AD\u200C\u200D]/.test(firstMatch)) {
        bypassType = "zwc";
      } else if (firstMatch.length > normalized.length) {
        bypassType = "separator";
      } else {
        bypassType = "homoglyph";
      }
      results.push({ keyword: kw, matches, bypassType });
    }
  }
  return results;
}
