// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';

export interface BugReport {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  line: number;
  description: string;
  suggestion: string;
  category: 'logic' | 'security' | 'performance' | 'style' | 'error-handling' | 'type-safety';
}

const VALID_SEVERITIES = new Set<BugReport['severity']>([
  'critical', 'high', 'medium', 'low', 'info',
]);
const VALID_CATEGORIES = new Set<BugReport['category']>([
  'logic', 'security', 'performance', 'style', 'error-handling', 'type-safety',
]);

let _idCounter = 0;
function nextId(): string {
  return `bug-${Date.now()}-${++_idCounter}`;
}

// IDENTITY_SEAL: PART-1 | role=types-and-constants | inputs=none | outputs=BugReport,nextId

// ============================================================
// PART 2 — AI-Powered Bug Detection (findBugs)
// ============================================================

const SYSTEM_PROMPT = `You are a senior code reviewer. Analyze the given source code and return a JSON array of bugs found.
Each element must follow this exact schema:
[{ "severity": "critical"|"high"|"medium"|"low"|"info", "line": <number>, "description": "<string>", "suggestion": "<string>", "category": "logic"|"security"|"performance"|"style"|"error-handling"|"type-safety" }]

Rules:
- Return ONLY the JSON array. No markdown fences, no explanation text.
- If no bugs are found, return an empty array: []
- "line" must be a 1-based line number referencing the source code.
- Be precise. Do not fabricate issues that do not exist in the code.`;

function buildUserPrompt(code: string, language: string, fileName: string): string {
  return `File: ${fileName}
Language: ${language}

\`\`\`${language}
${code}
\`\`\`

Analyze the code above. Return the JSON array of bugs.`;
}

function parseAiResponse(raw: string): BugReport[] {
  // Strip markdown fences if the model wraps output
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Find the outermost JSON array
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const results: BugReport[] = [];
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;

    const severity = String(rec.severity ?? 'info');
    const category = String(rec.category ?? 'logic');
    const line = Number(rec.line);
    const description = String(rec.description ?? '');
    const suggestion = String(rec.suggestion ?? '');

    if (!description) continue;
    if (!Number.isFinite(line) || line < 1) continue;

    results.push({
      id: nextId(),
      severity: VALID_SEVERITIES.has(severity as BugReport['severity'])
        ? (severity as BugReport['severity'])
        : 'info',
      line: Math.floor(line),
      description,
      suggestion,
      category: VALID_CATEGORIES.has(category as BugReport['category'])
        ? (category as BugReport['category'])
        : 'logic',
    });
  }

  return results;
}

/**
 * AI-powered bug detection. Sends code to the active LLM provider and
 * returns structured bug reports. Falls back to an empty array on any
 * parse or network failure.
 */
export async function findBugs(
  code: string,
  language: string,
  fileName: string,
  signal?: AbortSignal,
): Promise<BugReport[]> {
  if (!code.trim()) return [];

  const provider = getActiveProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) return [];

  let accumulated = '';

  try {
    await streamChat({
      systemInstruction: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(code, language, fileName) }],
      temperature: 0.2,
      signal,
      onChunk(text: string) {
        accumulated += text;
      },
    });
  } catch (err) {
    // AbortError는 호출자에게 다시 전파
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return [];
  }

  return parseAiResponse(accumulated);
}

// IDENTITY_SEAL: PART-2 | role=ai-bug-detection | inputs=code,language,fileName,signal | outputs=BugReport[]

// ============================================================
// PART 3 — Static Bug Detection (findBugsStatic)
// ============================================================

/**
 * Local (no AI) heuristic-based bug detection. Runs synchronously.
 * Covers common patterns: unused variables, null dereference potential,
 * unreachable code, empty catch, missing switch default, division by zero.
 */
export function findBugsStatic(code: string, language: string): BugReport[] {
  if (!code.trim()) return [];

  const lines = code.split('\n');
  const reports: BugReport[] = [];

  // ---- Detectors ----

  detectUnusedVariables(lines, language, reports);
  detectNullDereference(lines, reports);
  detectUnreachableCode(lines, reports);
  detectEmptyCatch(lines, language, reports);
  detectMissingSwitchDefault(lines, language, reports);
  detectDivisionByZero(lines, reports);

  return reports;
}

// ---- Individual static detectors ----

function detectUnusedVariables(
  lines: string[],
  language: string,
  reports: BugReport[],
): void {
  const isJsTsFamily = /^(javascript|typescript|jsx|tsx|js|ts)$/i.test(language);
  const isPython = /^python$/i.test(language);

  // Pattern: capture variable declarations
  const declPatterns: RegExp[] = [];
  if (isJsTsFamily) {
    declPatterns.push(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
  }
  if (isPython) {
    declPatterns.push(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
  }
  if (declPatterns.length === 0) return;

  const declarations: Array<{ name: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    for (const pat of declPatterns) {
      const m = trimmed.match(pat);
      if (m?.[1]) {
        declarations.push({ name: m[1], line: i + 1 });
      }
    }
  }

  const fullText = lines.join('\n');
  for (const decl of declarations) {
    // Count occurrences of the identifier (word-boundary match)
    const re = new RegExp(`\\b${escapeRegex(decl.name)}\\b`, 'g');
    const matches = fullText.match(re);
    // 1 occurrence = only the declaration itself
    if (matches && matches.length <= 1) {
      reports.push({
        id: nextId(),
        severity: 'low',
        line: decl.line,
        description: `Variable "${decl.name}" is assigned but never read.`,
        suggestion: `Remove the unused variable or use it in subsequent logic.`,
        category: 'style',
      });
    }
  }
}

function detectNullDereference(lines: string[], reports: BugReport[]): void {
  // Heuristic: assignment with `null` or `undefined`, then property access
  // without a null check in between. Simplified: look for `= null` or
  // `= undefined` then within 5 lines `.something` on the same identifier.
  const nullAssign = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:null|undefined)/;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(nullAssign);
    if (!m?.[1]) continue;

    const varName = m[1];
    const searchEnd = Math.min(i + 6, lines.length);

    for (let j = i + 1; j < searchEnd; j++) {
      const line = lines[j];
      // Check for property access like varName.something
      const accessPattern = new RegExp(
        `\\b${escapeRegex(varName)}\\s*\\.\\s*[a-zA-Z_]`,
      );
      // Check for null guard like if (varName) or varName != null etc.
      const guardPattern = new RegExp(
        `(?:if\\s*\\(\\s*${escapeRegex(varName)}|${escapeRegex(varName)}\\s*(?:!==?|===?)\\s*(?:null|undefined)|${escapeRegex(varName)}\\s*\\?\\.)`,
      );

      if (guardPattern.test(line)) break; // guarded — stop looking
      if (accessPattern.test(line)) {
        reports.push({
          id: nextId(),
          severity: 'high',
          line: j + 1,
          description: `Possible null dereference: "${varName}" was assigned null/undefined at line ${i + 1} and accessed without a null check.`,
          suggestion: `Add a null check before accessing properties of "${varName}".`,
          category: 'error-handling',
        });
        break;
      }
    }
  }
}

function detectUnreachableCode(lines: string[], reports: BugReport[]): void {
  // After a `return` statement at block level, if the next non-empty
  // line is still inside the same block (not a closing brace), flag it.
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!/^return\b/.test(trimmed)) continue;

    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next) continue; // skip blank lines
      if (next === '}' || next === ')' || next.startsWith('case ') || next === 'default:') break;
      // Still in the same block with executable code
      reports.push({
        id: nextId(),
        severity: 'medium',
        line: j + 1,
        description: `Unreachable code detected after return statement at line ${i + 1}.`,
        suggestion: `Remove the unreachable code or restructure the control flow.`,
        category: 'logic',
      });
      break;
    }
  }
}

function detectEmptyCatch(
  lines: string[],
  language: string,
  reports: BugReport[],
): void {
  const isJsTsFamily = /^(javascript|typescript|jsx|tsx|js|ts)$/i.test(language);
  const isPython = /^python$/i.test(language);

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (isJsTsFamily && /catch\s*\(/.test(trimmed)) {
      // Check if the catch block body is empty: { }
      const remaining = lines.slice(i).join('\n');
      const catchBody = remaining.match(/catch\s*\([^)]*\)\s*\{([^}]*)\}/);
      if (catchBody && !catchBody[1].trim()) {
        reports.push({
          id: nextId(),
          severity: 'medium',
          line: i + 1,
          description: `Empty catch block swallows errors silently.`,
          suggestion: `At minimum, log the error (e.g., console.error) or rethrow it.`,
          category: 'error-handling',
        });
      }
    }

    if (isPython && /except\b/.test(trimmed)) {
      // except ...: followed by pass/blank
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine === 'pass' || nextLine === '') {
          reports.push({
            id: nextId(),
            severity: 'medium',
            line: i + 1,
            description: `Empty except block silently ignores exceptions.`,
            suggestion: `Handle the exception properly or at least log it.`,
            category: 'error-handling',
          });
        }
      }
    }
  }
}

function detectMissingSwitchDefault(
  lines: string[],
  language: string,
  reports: BugReport[],
): void {
  const isJsTsFamily = /^(javascript|typescript|jsx|tsx|js|ts|java|c|cpp|csharp|go)$/i.test(language);
  if (!isJsTsFamily) return;

  const fullText = lines.join('\n');
  // Find switch blocks that lack a `default:` case
  const switchRegex = /switch\s*\([^)]*\)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = switchRegex.exec(fullText)) !== null) {
    const startIdx = match.index + match[0].length;
    let depth = 1;
    let pos = startIdx;
    let blockContent = '';

    while (pos < fullText.length && depth > 0) {
      if (fullText[pos] === '{') depth++;
      else if (fullText[pos] === '}') depth--;
      if (depth > 0) blockContent += fullText[pos];
      pos++;
    }

    if (!/\bdefault\s*:/.test(blockContent)) {
      // Calculate line number of the switch statement
      const lineNum = fullText.slice(0, match.index).split('\n').length;
      reports.push({
        id: nextId(),
        severity: 'low',
        line: lineNum,
        description: `Switch statement has no default case.`,
        suggestion: `Add a default case to handle unexpected values.`,
        category: 'logic',
      });
    }
  }
}

function detectDivisionByZero(lines: string[], reports: BugReport[]): void {
  // Heuristic: detect literal `/ 0` or `% 0`
  const divByZero = /(?:\/|%)\s*0(?:\s*[;,)\]}]|\s*$)/;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) continue;

    if (divByZero.test(trimmed)) {
      reports.push({
        id: nextId(),
        severity: 'critical',
        line: i + 1,
        description: `Potential division by zero detected.`,
        suggestion: `Add a guard to ensure the divisor is not zero before dividing.`,
        category: 'logic',
      });
    }
  }
}

// ---- Utility ----

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// IDENTITY_SEAL: PART-3 | role=static-bug-detection | inputs=code,language | outputs=BugReport[]
