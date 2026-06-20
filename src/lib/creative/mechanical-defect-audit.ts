// ============================================================
// mechanical-defect-audit — local manuscript hygiene scanner
// ============================================================
// Role:    Detect mechanical manuscript defects before revision/export.
// Banned:  Rewriting author voice or applying patches automatically.
// Input:   Manuscript text.
// Output:  Structured findings for an author approval queue.
// Depends: No React, DOM, storage, fetch, or LLM.
// ============================================================

export type MechanicalDefectType =
  | 'markdown-residue'
  | 'emoji'
  | 'dialogue-run-on'
  | 'replacement-residue'
  | 'broken-hangul-spacing'
  | 'glued-sentence-boundary'
  | 'excess-blank-lines'
  | 'title-body-boundary';

export type MechanicalDefectSeverity = 'high' | 'medium' | 'low';

export interface MechanicalDefectFinding {
  type: MechanicalDefectType;
  severity: MechanicalDefectSeverity;
  message: string;
  index: number;
  length: number;
  line: number;
  excerpt: string;
  autoFixSafe: boolean;
}

export interface MechanicalDefectAudit {
  passed: boolean;
  findings: MechanicalDefectFinding[];
  byType: Record<MechanicalDefectType, number>;
}

const DEFECT_TYPES: readonly MechanicalDefectType[] = [
  'markdown-residue',
  'emoji',
  'dialogue-run-on',
  'replacement-residue',
  'broken-hangul-spacing',
  'glued-sentence-boundary',
  'excess-blank-lines',
  'title-body-boundary',
];

const REGEX_RULES: ReadonlyArray<{
  type: MechanicalDefectType;
  severity: MechanicalDefectSeverity;
  regex: RegExp;
  message: string;
  autoFixSafe: boolean;
}> = [
  {
    type: 'emoji',
    severity: 'medium',
    regex: /\p{Extended_Pictographic}/gu,
    message: 'Emoji or pictographic symbol remains in manuscript text.',
    autoFixSafe: false,
  },
  {
    type: 'replacement-residue',
    severity: 'high',
    regex: /\{\{[^}\n]{1,80}\}\}|<<[^>\n]{1,80}>>|\[(?:TODO|FIXME|PLACEHOLDER|이름|장소|인물|대사|감정)\]/giu,
    message: 'Template or replacement residue remains unresolved.',
    autoFixSafe: false,
  },
  {
    type: 'broken-hangul-spacing',
    severity: 'medium',
    regex: /(?:[가-힣]\s){3,}[가-힣]/g,
    message: 'Hangul syllables appear broken by repeated spaces.',
    autoFixSafe: false,
  },
  {
    type: 'glued-sentence-boundary',
    severity: 'low',
    regex: /[.!?。？！][가-힣A-Za-z]/g,
    message: 'Sentence boundary may be glued to the next sentence.',
    autoFixSafe: true,
  },
  {
    type: 'excess-blank-lines',
    severity: 'low',
    regex: /\n[ \t]*\n[ \t]*\n[ \t]*\n+/g,
    message: 'Excess blank lines remain in manuscript text.',
    autoFixSafe: true,
  },
];

const MARKDOWN_LINE_RE = /^(?:#{1,6}\s+\S|[-*+]\s+\S|>\s+\S|```)/;
const TITLE_PREFIX_RE = /^(?:제목|Title)\s*[:：]\s*\S+/i;
const DIALOGUE_RE = /"[^"\n]+?"|“[^”\n]+?”|「[^」\n]+?」|『[^』\n]+?』/g;

function normalizeText(input: unknown): string {
  return typeof input === 'string' ? input : '';
}

function lineNumberAt(text: string, index: number): number {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) line += 1;
  }
  return line;
}

function excerptAt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + Math.max(length, 1) + 20);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function emptyCounts(): Record<MechanicalDefectType, number> {
  return Object.fromEntries(DEFECT_TYPES.map((type) => [type, 0])) as Record<MechanicalDefectType, number>;
}

function pushFinding(
  text: string,
  findings: MechanicalDefectFinding[],
  draft: Omit<MechanicalDefectFinding, 'line' | 'excerpt'> & { length: number },
): void {
  if (findings.some((finding) => finding.type === draft.type && finding.index === draft.index)) return;
  findings.push({
    type: draft.type,
    severity: draft.severity,
    message: draft.message,
    index: draft.index,
    length: Math.max(0, draft.length),
    line: lineNumberAt(text, draft.index),
    excerpt: excerptAt(text, draft.index, draft.length),
    autoFixSafe: draft.autoFixSafe,
  });
}

function scanLineRules(text: string, findings: MechanicalDefectFinding[]): void {
  let offset = 0;
  for (const lineText of text.split(/\n/)) {
    const trimmed = lineText.trimStart();
    const trimOffset = lineText.length - trimmed.length;
    if (MARKDOWN_LINE_RE.test(trimmed)) {
      pushFinding(text, findings, {
        type: 'markdown-residue',
        severity: 'medium',
        message: 'Markdown structural marker remains in manuscript text.',
        index: offset + trimOffset,
        length: trimmed.length,
        autoFixSafe: false,
      });
    }
    if (TITLE_PREFIX_RE.test(trimmed)) {
      pushFinding(text, findings, {
        type: 'title-body-boundary',
        severity: 'low',
        message: 'Title label appears inside body text.',
        index: offset + trimOffset,
        length: trimmed.length,
        autoFixSafe: false,
      });
    }
    const dialogueCount = (trimmed.match(DIALOGUE_RE) ?? []).length;
    if (dialogueCount >= 3) {
      pushFinding(text, findings, {
        type: 'dialogue-run-on',
        severity: 'medium',
        message: 'Several dialogue beats are packed into one line.',
        index: offset + trimOffset,
        length: trimmed.length,
        autoFixSafe: false,
      });
    }
    offset += lineText.length + 1;
  }
}

function scanRegexRules(text: string, findings: MechanicalDefectFinding[]): void {
  for (const rule of REGEX_RULES) {
    for (const match of text.matchAll(rule.regex)) {
      pushFinding(text, findings, {
        type: rule.type,
        severity: rule.severity,
        message: rule.message,
        index: match.index ?? 0,
        length: match[0].length,
        autoFixSafe: rule.autoFixSafe,
      });
    }
  }
}

export function auditMechanicalDefects(input: unknown): MechanicalDefectAudit {
  const text = normalizeText(input);
  const findings: MechanicalDefectFinding[] = [];
  if (text.trim().length > 0) {
    scanLineRules(text, findings);
    scanRegexRules(text, findings);
  }

  findings.sort((left, right) => left.index - right.index || left.type.localeCompare(right.type));
  const byType = emptyCounts();
  for (const finding of findings) {
    byType[finding.type] += 1;
  }
  return {
    passed: findings.length === 0,
    findings,
    byType,
  };
}
