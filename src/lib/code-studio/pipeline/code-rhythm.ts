// ============================================================
// PART 1 — Types (scene-parser BeatType 분류 패턴 차용)
// ============================================================

/**
 * 코드 라인 분류 (scene-parser의 BeatType에서 영감)
 * - dialogue → comment
 * - narration → logic
 * - description → type/import
 */
export type CodeLineType =
  | 'import'
  | 'type'
  | 'logic'
  | 'comment'
  | 'blank'
  | 'return'
  | 'decorator'
  | 'block-boundary';  // { or }

export interface ClassifiedLine {
  lineNumber: number;
  type: CodeLineType;
  text: string;
}

export interface RhythmSection {
  startLine: number;
  endLine: number;
  density: number;    // 0-100 (100 = 모두 logic, 0 = 모두 blank/comment)
  types: Record<CodeLineType, number>;
}

export interface RhythmSuggestion {
  line: number;
  message: string;
  severity: 'info' | 'warn';
}

export interface CodeRhythmResult {
  lines: ClassifiedLine[];
  sections: RhythmSection[];
  suggestions: RhythmSuggestion[];
  overallDensity: number;
  commentRatio: number;
  blankRatio: number;
}

// ============================================================
// PART 2 — Line Classification
// ============================================================

const IMPORT_RE = /^\s*(import\s|from\s|require\s*\(|export\s+(default\s+)?(?:function|class|const|interface|type|enum))/;
const TYPE_RE = /^\s*(interface\s|type\s|enum\s|declare\s)/;
const COMMENT_RE = /^\s*(\/\/|\/\*|\*|#)/;
const BLANK_RE = /^\s*$/;
const RETURN_RE = /^\s*return\b/;
const DECORATOR_RE = /^\s*@\w/;
const BLOCK_BOUNDARY_RE = /^\s*[{}]\s*$/;

export function classifyLine(text: string): CodeLineType {
  if (BLANK_RE.test(text)) return 'blank';
  if (COMMENT_RE.test(text)) return 'comment';
  if (DECORATOR_RE.test(text)) return 'decorator';
  if (BLOCK_BOUNDARY_RE.test(text)) return 'block-boundary';
  if (RETURN_RE.test(text)) return 'return';
  if (IMPORT_RE.test(text)) return 'import';
  if (TYPE_RE.test(text)) return 'type';
  return 'logic';
}

function classifyLines(code: string): ClassifiedLine[] {
  return code.split('\n').map((text, i) => ({
    lineNumber: i + 1,
    type: classifyLine(text),
    text,
  }));
}

// ============================================================
// PART 3 — Section Analysis
// ============================================================

const SECTION_SIZE = 10; // 10줄 단위 섹션

function buildSections(lines: ClassifiedLine[]): RhythmSection[] {
  const sections: RhythmSection[] = [];

  for (let i = 0; i < lines.length; i += SECTION_SIZE) {
    const slice = lines.slice(i, i + SECTION_SIZE);
    const types: Record<CodeLineType, number> = {
      import: 0, type: 0, logic: 0, comment: 0,
      blank: 0, return: 0, decorator: 0, 'block-boundary': 0,
    };

    for (const l of slice) types[l.type]++;

    const denseTypes = types.logic + types.return + types.import + types.type + types.decorator;
    const density = slice.length > 0
      ? Math.round((denseTypes / slice.length) * 100)
      : 0;

    sections.push({
      startLine: slice[0].lineNumber,
      endLine: slice[slice.length - 1].lineNumber,
      density,
      types,
    });
  }

  return sections;
}

// ============================================================
// PART 4 — Suggestion Engine
// ============================================================

function generateSuggestions(lines: ClassifiedLine[]): RhythmSuggestion[] {
  const suggestions: RhythmSuggestion[] = [];

  // 1) 연속 dense 블록 (15줄 이상 comment/blank 없이)
  let denseRun = 0;
  let denseStart = 0;
  for (const line of lines) {
    if (line.type === 'logic' || line.type === 'return' || line.type === 'decorator') {
      if (denseRun === 0) denseStart = line.lineNumber;
      denseRun++;
    } else {
      if (denseRun >= 15) {
        suggestions.push({
          line: denseStart,
          message: `${denseRun} consecutive dense lines (${denseStart}-${line.lineNumber - 1}). Consider adding whitespace or comments.`,
          severity: 'warn',
        });
      }
      denseRun = 0;
    }
  }
  if (denseRun >= 15) {
    suggestions.push({
      line: denseStart,
      message: `${denseRun} consecutive dense lines from line ${denseStart}. Consider breaking up.`,
      severity: 'warn',
    });
  }

  // 2) 코멘트 밀도 검사 (전체 파일)
  const total = lines.length;
  if (total > 20) {
    const comments = lines.filter((l) => l.type === 'comment').length;
    const ratio = comments / total;
    if (ratio < 0.05) {
      suggestions.push({
        line: 1,
        message: `Comment ratio is ${Math.round(ratio * 100)}% (< 5%). Consider adding explanatory comments.`,
        severity: 'info',
      });
    }
  }

  // 3) 빈 줄 부족 검사
  if (total > 30) {
    const blanks = lines.filter((l) => l.type === 'blank').length;
    const blankRatio = blanks / total;
    if (blankRatio < 0.08) {
      suggestions.push({
        line: 1,
        message: `Only ${Math.round(blankRatio * 100)}% blank lines. Code may feel cramped.`,
        severity: 'info',
      });
    }
  }

  return suggestions;
}

// ============================================================
// PART 5 — Public API
// ============================================================

export function analyzeCodeRhythm(code: string): CodeRhythmResult {
  if (!code.trim()) {
    return {
      lines: [],
      sections: [],
      suggestions: [],
      overallDensity: 0,
      commentRatio: 0,
      blankRatio: 0,
    };
  }

  const lines = classifyLines(code);
  const sections = buildSections(lines);
  const suggestions = generateSuggestions(lines);

  const total = lines.length;
  const commentCount = lines.filter((l) => l.type === 'comment').length;
  const blankCount = lines.filter((l) => l.type === 'blank').length;
  const denseCount = lines.filter(
    (l) => l.type === 'logic' || l.type === 'return' || l.type === 'import' || l.type === 'type',
  ).length;

  return {
    lines,
    sections,
    suggestions,
    overallDensity: total > 0 ? Math.round((denseCount / total) * 100) : 0,
    commentRatio: total > 0 ? Math.round((commentCount / total) * 100) : 0,
    blankRatio: total > 0 ? Math.round((blankCount / total) * 100) : 0,
  };
}

// IDENTITY_SEAL: code-rhythm | role=CodeRhythmAnalyzer | inputs=codeString | outputs=CodeRhythmResult
