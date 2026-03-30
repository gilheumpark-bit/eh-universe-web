// ============================================================
// Code Studio — TypeScript Language Service
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

export interface TSDiagnostic {
  fileName: string;
  line: number;
  column: number;
  message: string;
  code: number;
  severity: 'error' | 'warning' | 'suggestion';
  category: string;
}

export interface TSQuickFix {
  description: string;
  changes: Array<{
    fileName: string;
    textChanges: Array<{
      start: number;
      end: number;
      newText: string;
    }>;
  }>;
}

export interface TSCompletion {
  name: string;
  kind: 'function' | 'variable' | 'class' | 'interface' | 'type' | 'keyword' | 'property' | 'method';
  detail?: string;
  insertText: string;
  sortText: string;
}

export interface TSHoverInfo {
  displayString: string;
  documentation: string;
  kind: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=TSDiagnostic,TSQuickFix,TSCompletion,TSHoverInfo

// ============================================================
// PART 2 — Lightweight Diagnostics (regex-based)
// ============================================================

/**
 * Provides basic TypeScript diagnostics without a full TS worker.
 * In production, this would delegate to a TS language service worker.
 */
export function getBasicDiagnostics(
  code: string,
  fileName: string,
): TSDiagnostic[] {
  const diagnostics: TSDiagnostic[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Missing semicolons after return statements
    if (/^\s*return\s+[^;]*[^;{}\s]$/.test(line) && !line.trim().endsWith(',')) {
      // Not a reliable check, skip to avoid false positives
    }

    // Unused imports (basic detection)
    const importMatch = line.match(/import\s+\{([^}]+)\}\s+from/);
    if (importMatch) {
      const imports = importMatch[1].split(',').map((s) => s.trim().split(' as ').pop()!.trim());
      for (const imp of imports) {
        const restOfCode = lines.slice(i + 1).join('\n');
        const usage = new RegExp(`\\b${imp}\\b`);
        if (!usage.test(restOfCode)) {
          diagnostics.push({
            fileName, line: i + 1, column: 1,
            message: `'${imp}' is imported but never used`,
            code: 6133, severity: 'warning', category: 'unused',
          });
        }
      }
    }

    // `any` type usage
    if (/:\s*any\b/.test(line) && !/eslint-disable/.test(line)) {
      diagnostics.push({
        fileName, line: i + 1, column: line.indexOf('any') + 1,
        message: "Unexpected 'any'. Specify a more precise type.",
        code: 7006, severity: 'suggestion', category: 'type-safety',
      });
    }

    // console.log in production code
    if (/\bconsole\.log\b/.test(line) && !/(test|spec|debug)/i.test(fileName)) {
      diagnostics.push({
        fileName, line: i + 1, column: line.indexOf('console.log') + 1,
        message: 'Unexpected console.log statement',
        code: 0, severity: 'warning', category: 'debug',
      });
    }
  }

  return diagnostics;
}

// IDENTITY_SEAL: PART-2 | role=diagnostics | inputs=code,fileName | outputs=TSDiagnostic[]

// ============================================================
// PART 3 — Basic Completions
// ============================================================

const TS_KEYWORDS: TSCompletion[] = [
  'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum',
  'export', 'import', 'return', 'if', 'else', 'for', 'while', 'switch',
  'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw',
  'async', 'await', 'new', 'this', 'super', 'extends', 'implements',
  'typeof', 'instanceof', 'in', 'of', 'as', 'is', 'readonly',
].map((kw) => ({
  name: kw,
  kind: 'keyword' as const,
  insertText: kw,
  sortText: `1_${kw}`,
}));

export function getCompletions(
  code: string,
  position: number,
  _fileName: string,
): TSCompletion[] {
  const before = code.slice(0, position);
  const wordMatch = before.match(/(\w+)$/);
  const prefix = wordMatch ? wordMatch[1].toLowerCase() : '';

  if (!prefix) return [];

  // Keyword completions
  const kwMatches = TS_KEYWORDS.filter((kw) => kw.name.toLowerCase().startsWith(prefix));

  // Extract identifiers from code for local completions
  const identifiers = new Set<string>();
  const idRegex = /\b(const|let|var|function|class|interface|type)\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(code)) !== null) {
    if (match[2] && match[2].toLowerCase().startsWith(prefix) && match[2] !== prefix) {
      identifiers.add(match[2]);
    }
  }

  const localCompletions: TSCompletion[] = [...identifiers].map((id) => ({
    name: id,
    kind: 'variable' as const,
    insertText: id,
    sortText: `0_${id}`,
  }));

  return [...localCompletions, ...kwMatches].slice(0, 20);
}

// IDENTITY_SEAL: PART-3 | role=completions | inputs=code,position | outputs=TSCompletion[]

// ============================================================
// PART 4 — Hover Info
// ============================================================

export function getHoverInfo(
  code: string,
  position: number,
): TSHoverInfo | null {
  const before = code.slice(0, position);
  const after = code.slice(position);
  const wordBefore = before.match(/(\w+)$/)?.[1] ?? '';
  const wordAfter = after.match(/^(\w*)/)?.[1] ?? '';
  const word = wordBefore + wordAfter;
  if (!word) return null;

  // Find declaration
  const declRegex = new RegExp(`(?:const|let|var|function|class|interface|type)\\s+${word}\\b[^\\n]*`);
  const declMatch = code.match(declRegex);

  if (declMatch) {
    return {
      displayString: declMatch[0].trim().slice(0, 100),
      documentation: '',
      kind: declMatch[0].startsWith('function') ? 'function' :
            declMatch[0].startsWith('class') ? 'class' :
            declMatch[0].startsWith('interface') ? 'interface' :
            declMatch[0].startsWith('type') ? 'type' : 'variable',
    };
  }

  return null;
}

// IDENTITY_SEAL: PART-4 | role=hover | inputs=code,position | outputs=TSHoverInfo
