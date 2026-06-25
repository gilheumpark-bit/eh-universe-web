// ============================================================
// PART 1 — Module Header
// ============================================================
//
// format-on-save/rules.ts — 자동 줄바꿈/문단 정리 룰.
//
// 코드 IDE 의 prettier/eslint --fix 대응 → 소설 도메인.
//
// 룰:
//   1. 다중 빈 줄 압축 (3+ 연속 → 2개)
//   2. trailing whitespace 제거
//   3. 큰따옴표 정규화 ("/“”/" → 일관된 한 종류)
//   4. 작은따옴표 정규화 ('/'’/' )
//   5. 한글 따옴표 → 표준 (＂ → ", ＇ → ')
//   6. 말줄임표 정규화 (... / … → 통일)
//   7. 대화 단락 분리 (대사 시작/끝 줄바꿈)
//   8. 화살표 (--> → →) 등 흔한 typo 자동
//
// [C] 입력 텍스트 변경 안 하는 룰은 idempotent / [G] 단일 패스 / [K] 룰별 분리
// ============================================================

export interface FormatRule {
  id: string;
  name: { ko: string; en: string };
  /** 활성 기본값 */
  enabledByDefault: boolean;
  apply: (text: string) => string;
}

export interface FormatOptions {
  /** 룰 ID set — 활성 룰만 적용. 미지정이면 enabledByDefault === true 적용 */
  enabledRules?: Set<string>;
  /** 따옴표 통일 — 'curly' (“ ”) 또는 'straight' (" ") */
  quoteStyle?: 'curly' | 'straight';
  /** 말줄임표 — 'ellipsis' (…) 또는 'dots' (...) */
  ellipsisStyle?: 'ellipsis' | 'dots';
}

// ============================================================
// PART 2 — Rules
// ============================================================

const collapseBlankLines: FormatRule = {
  id: 'collapse-blank-lines',
  name: { ko: '빈 줄 압축', en: 'Collapse blank lines' },
  enabledByDefault: true,
  apply: (text) => text.replace(/\n{3,}/g, '\n\n'),
};

const trimTrailingWhitespace: FormatRule = {
  id: 'trim-trailing',
  name: { ko: '줄 끝 공백 제거', en: 'Trim trailing whitespace' },
  enabledByDefault: true,
  apply: (text) => text.split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n'),
};

const normalizeDoubleQuotes: FormatRule = {
  id: 'normalize-double-quotes',
  name: { ko: '큰따옴표 정규화', en: 'Normalize double quotes' },
  enabledByDefault: true,
  apply: (text) => text.replace(/[“”＂]/g, '"'),
};

const normalizeSingleQuotes: FormatRule = {
  id: 'normalize-single-quotes',
  name: { ko: '작은따옴표 정규화', en: 'Normalize single quotes' },
  enabledByDefault: false, // 줄임말 충돌 방지 — 기본 OFF
  apply: (text) => text.replace(/[‘’＇]/g, "'"),
};

const normalizeEllipsis: FormatRule = {
  id: 'normalize-ellipsis',
  name: { ko: '말줄임표 정규화', en: 'Normalize ellipsis' },
  enabledByDefault: true,
  apply: (text) => text.replace(/\.{3,}/g, '…'),
};

const normalizeArrows: FormatRule = {
  id: 'normalize-arrows',
  name: { ko: '화살표 정규화', en: 'Normalize arrows' },
  enabledByDefault: true,
  apply: (text) =>
    text
      .replace(/-->/g, '→')
      .replace(/<--/g, '←')
      .replace(/=>/g, '⇒'),
};

const dialogueLineBreak: FormatRule = {
  id: 'dialogue-line-break',
  name: { ko: '대화 단락 분리', en: 'Dialogue line break' },
  enabledByDefault: false, // 기본 OFF — 작가별 스타일 차이 큼
  apply: (text) => {
    // 대사 ("...") 가 다른 텍스트 중간에 있으면 앞뒤로 줄바꿈 추가.
    // 단순 휴리스틱 — 한국 웹소설 흔한 패턴.
    // [fix] 후행 문자를 lookahead 로 변경 — 캡처(소비)하면 인접 대사의
    //       선행 문자까지 함께 먹어 정규식 재개 지점이 어긋나며 다음 대사를 누락함.
    //       lookahead 는 위치만 확인하고 소비하지 않아 연속 대사도 모두 매칭.
    return text.replace(/([^\n])("(?:[^"\n]+)")(?=[^\n])/g, '$1\n$2\n');
  },
};

const ALL_RULES: FormatRule[] = [
  collapseBlankLines,
  trimTrailingWhitespace,
  normalizeDoubleQuotes,
  normalizeSingleQuotes,
  normalizeEllipsis,
  normalizeArrows,
  dialogueLineBreak,
];

// ============================================================
// PART 3 — Public API
// ============================================================

export function getAllFormatRules(): FormatRule[] {
  return [...ALL_RULES];
}

/**
 * 텍스트에 활성 룰 일괄 적용.
 */
export function formatText(text: string, options: FormatOptions = {}): string {
  if (!text) return text;
  const enabled = options.enabledRules
    ? options.enabledRules
    : new Set(ALL_RULES.filter((r) => r.enabledByDefault).map((r) => r.id));

  let result = text;
  for (const rule of ALL_RULES) {
    if (!enabled.has(rule.id)) continue;
    result = rule.apply(result);
  }

  // quoteStyle / ellipsisStyle 후처리
  if (options.quoteStyle === 'curly') {
    // 단순 휴리스틱 — 짝수 인덱스는 left, 홀수는 right
    let toggle = false;
    result = result.replace(/"/g, () => {
      toggle = !toggle;
      return toggle ? '“' : '”';
    });
  }
  if (options.ellipsisStyle === 'dots') {
    result = result.replace(/…/g, '...');
  }

  return result;
}

/** Diff — 변경된 줄 수 카운트 (UI 통계용) */
export function countChangedLines(before: string, after: string): number {
  if (before === after) return 0;
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const max = Math.max(beforeLines.length, afterLines.length);
  let diff = 0;
  for (let i = 0; i < max; i++) {
    if (beforeLines[i] !== afterLines[i]) diff++;
  }
  return diff;
}
