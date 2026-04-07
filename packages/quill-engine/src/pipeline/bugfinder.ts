// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { streamChat, getApiKey, getActiveProvider } from '../_stubs/ai-providers';
import { buildFPSuppressionPrompt } from '../quality-rules-from-catalog';

export interface BugReport {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  line: number;
  description: string;
  suggestion: string;
  category: 'logic' | 'security' | 'performance' | 'style' | 'error-handling' | 'type-safety';
  source?: 'ai' | 'static' | 'ast';
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

const _FP_SUPPRESSION = buildFPSuppressionPrompt();

const SYSTEM_PROMPT = `You are a senior code reviewer. Analyze the given source code and return a JSON array of bugs found.
Each element must follow this exact schema:
[{ "severity": "critical"|"high"|"medium"|"low"|"info", "line": <number>, "description": "<string>", "suggestion": "<string>", "category": "logic"|"security"|"performance"|"style"|"error-handling"|"type-safety" }]

Rules:
- Return ONLY the JSON array. No markdown fences, no explanation text.
- If no bugs are found, return an empty array: []
- "line" must be a 1-based line number referencing the source code.
- Be precise. Do not fabricate issues that do not exist in the code.
${_FP_SUPPRESSION}`;

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
      source: 'ai',
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

  const rawReports = parseAiResponse(accumulated);
  const lineCount = code.split('\n').length;
  return validateAiResults(rawReports, lineCount);
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

  // Tag source
  for (const r of reports) {
    r.source = 'static';
  }

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

// ============================================================
// PART 4 — AST-Based Detectors
// ============================================================

/**
 * TypeScript module shape — minimal interface to avoid hard
 * dependency on the `typescript` package at bundle time.
 */
interface TsLikeModule {
  createSourceFile(fileName: string, source: string, target: unknown, setParentNodes?: boolean): TsSourceFile;
  forEachChild(node: TsNode, cb: (node: TsNode) => void): void;
  SyntaxKind: Record<string, number>;
  ScriptTarget?: Record<string, unknown>;
  [key: string]: unknown;
}

interface TsNode {
  kind: number;
  pos: number;
  end: number;
  parent?: TsNode;
  getText?(): string;
  getStart?(): number;
  getFullStart?(): number;
  name?: TsNode & { escapedText?: string };
  body?: TsNode;
  modifiers?: TsNode[];
  clauses?: TsNode[];
  // AST nodes have inherently dynamic shape; explicit properties above
  // cover known accesses, index signature covers the rest.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface TsSourceFile extends TsNode {
  getLineAndCharacterOfPosition(pos: number): { line: number; character: number };
  text: string;
}

/**
 * Attempt to load the `typescript` module dynamically.
 * Returns null if unavailable (e.g. browser without bundled TS).
 */
async function loadTs(): Promise<TsLikeModule | null> {
  try {
    // Dynamic import so the module is optional
    const ts = await import('typescript');
    return (ts.default ?? ts) as unknown as TsLikeModule;
  } catch {
    return null;
  }
}

/**
 * AST-level bug detection. Uses the TypeScript compiler API to parse source
 * and walk the tree, detecting structural issues that regex cannot reliably catch.
 *
 * Detectors:
 *  - Declared-but-never-read variables (scope-aware)
 *  - Null/undefined assignment followed by unguarded property access
 *  - Switch without default case
 *  - Async function without try/catch around await
 *  - Unhandled Promise (async call without await)
 */
export async function findBugsAst(code: string, language: string): Promise<BugReport[]> {
  const isJsTsFamily = /^(javascript|typescript|jsx|tsx|js|ts)$/i.test(language);
  if (!isJsTsFamily || !code.trim()) return [];

  const tsModule = await loadTs();
  if (!tsModule) return [];
  // Non-null const so inner closures can capture without narrowing issues
  const ts: TsLikeModule = tsModule;

  const ext = /tsx|jsx/i.test(language) ? 'file.tsx' : 'file.ts';
  let sourceFile: TsSourceFile;
  try {
    sourceFile = ts.createSourceFile(
      ext,
      code,
      ts.ScriptTarget?.Latest ?? 99,
      true,
    );
  } catch {
    return [];
  }

  const reports: BugReport[] = [];
  const SK = ts.SyntaxKind;

  // Helper: get 1-based line number
  function lineOf(node: TsNode): number {
    const start = node.getStart ? node.getStart() : node.pos;
    return sourceFile.getLineAndCharacterOfPosition(start).line + 1;
  }

  // ---- Detector: unused variable (scope-aware) ----
  const declarations = new Map<string, { line: number; count: number }>();

  function collectIdentifiers(node: TsNode): void {
    // Variable declaration
    if (node.kind === SK.VariableDeclaration && node.name) {
      const name = node.name.getText ? node.name.getText() : String(node.name.escapedText ?? '');
      if (name && !declarations.has(name)) {
        declarations.set(name, { line: lineOf(node), count: 0 });
      }
    }

    // Identifier usage (not in declaration position)
    if (node.kind === SK.Identifier) {
      const name = node.getText ? node.getText() : String(node.escapedText ?? '');
      const entry = declarations.get(name);
      if (entry) {
        const parent = node.parent;
        // Don't count the declaration itself
        const isDecl =
          parent &&
          (parent.kind === SK.VariableDeclaration ||
            parent.kind === SK.Parameter ||
            parent.kind === SK.PropertyDeclaration) &&
          parent.name === node;
        if (!isDecl) {
          entry.count++;
        }
      }
    }

    ts.forEachChild(node, collectIdentifiers);
  }
  ts.forEachChild(sourceFile, collectIdentifiers);

  for (const [name, info] of declarations) {
    if (info.count === 0) {
      reports.push({
        id: nextId(),
        severity: 'low',
        line: info.line,
        description: `Variable "${name}" is declared but never read (AST scope analysis).`,
        suggestion: `Remove the unused variable or use it.`,
        category: 'style',
        source: 'ast',
      });
    }
  }

  // ---- Detector: switch without default ----
  function detectSwitchNoDefault(node: TsNode): void {
    if (node.kind === SK.SwitchStatement) {
      const caseBlock = node.caseBlock;
      if (caseBlock && caseBlock.clauses) {
        const hasDefault = caseBlock.clauses.some(
          (c: TsNode) => c.kind === SK.DefaultClause,
        );
        if (!hasDefault) {
          reports.push({
            id: nextId(),
            severity: 'low',
            line: lineOf(node),
            description: `Switch statement has no default case (AST).`,
            suggestion: `Add a default case to handle unexpected values.`,
            category: 'logic',
            source: 'ast',
          });
        }
      }
    }
    ts.forEachChild(node, detectSwitchNoDefault);
  }
  ts.forEachChild(sourceFile, detectSwitchNoDefault);

  // ---- Detector: async function without try/catch around await ----
  function detectAsyncWithoutTryCatch(node: TsNode): void {
    const isAsyncFunc =
      (node.kind === SK.FunctionDeclaration ||
        node.kind === SK.ArrowFunction ||
        node.kind === SK.FunctionExpression ||
        node.kind === SK.MethodDeclaration) &&
      node.modifiers?.some((m: TsNode) => m.kind === SK.AsyncKeyword);

    if (isAsyncFunc && node.body) {
      let hasAwait = false;
      let hasTryCatch = false;

      function walkBody(n: TsNode): void {
        if (n.kind === SK.AwaitExpression) hasAwait = true;
        if (n.kind === SK.TryStatement) hasTryCatch = true;
        // Don't recurse into nested functions
        if (
          n !== node &&
          (n.kind === SK.FunctionDeclaration ||
            n.kind === SK.ArrowFunction ||
            n.kind === SK.FunctionExpression)
        ) {
          return;
        }
        ts.forEachChild(n, walkBody);
      }
      walkBody(node.body);

      if (hasAwait && !hasTryCatch) {
        reports.push({
          id: nextId(),
          severity: 'medium',
          line: lineOf(node),
          description: `Async function uses await without try/catch error handling.`,
          suggestion: `Wrap await calls in try/catch or add a .catch() handler.`,
          category: 'error-handling',
          source: 'ast',
        });
      }
    }
    ts.forEachChild(node, detectAsyncWithoutTryCatch);
  }
  ts.forEachChild(sourceFile, detectAsyncWithoutTryCatch);

  // ---- Detector: unhandled Promise (call to async function without await) ----
  function detectUnhandledPromise(node: TsNode): void {
    if (node.kind === SK.ExpressionStatement && node.expression) {
      const expr = node.expression;
      // CallExpression at statement level (not awaited, not .then'd)
      if (expr.kind === SK.CallExpression) {
        const callText = expr.getText ? expr.getText() : '';
        // Heuristic: function name starts with lowercase (likely user fn, not constructor)
        // and the call is a bare statement (no await, no .then)
        const parent = node.parent;
        const isAwaited = parent && parent.kind === SK.AwaitExpression;
        const hasThen = /\.then\s*\(/.test(callText);
        const hasCatch = /\.catch\s*\(/.test(callText);

        if (!isAwaited && !hasThen && !hasCatch) {
          // Check if the function name hints at async (fetch, load, save, get, post, etc.)
          const asyncHints = /\b(fetch|load|save|get|post|put|delete|send|request|upload|download)\w*\s*\(/i;
          if (asyncHints.test(callText)) {
            reports.push({
              id: nextId(),
              severity: 'medium',
              line: lineOf(node),
              description: `Potentially unhandled Promise: "${callText.slice(0, 50)}..." is called without await or .then().`,
              suggestion: `Add await or .then()/.catch() to handle the result.`,
              category: 'error-handling',
              source: 'ast',
            });
          }
        }
      }
    }
    ts.forEachChild(node, detectUnhandledPromise);
  }
  ts.forEachChild(sourceFile, detectUnhandledPromise);

  // ---- Detector: null/undefined assignment then unguarded access ----
  function detectNullDerefAst(node: TsNode): void {
    if (node.kind === SK.VariableDeclaration && node.initializer) {
      const init = node.initializer;
      const isNullish =
        init.kind === SK.NullKeyword ||
        (init.kind === SK.Identifier && init.getText?.() === 'undefined');

      if (isNullish && node.name) {
        const varName = node.name.getText ? node.name.getText() : '';
        if (!varName) { ts.forEachChild(node, detectNullDerefAst); return; }

        const declLine = lineOf(node);
        // Scan next ~10 lines of source for unguarded property access
        const codeLines = code.split('\n');
        const scanEnd = Math.min(declLine + 10, codeLines.length);

        for (let ln = declLine; ln < scanEnd; ln++) {
          const lineText = codeLines[ln];
          if (!lineText) continue;

          const guardRe = new RegExp(
            `(?:if\\s*\\(\\s*${escapeRegex(varName)}|${escapeRegex(varName)}\\s*(?:!==?|===?)\\s*(?:null|undefined)|${escapeRegex(varName)}\\s*\\?\\.|${escapeRegex(varName)}\\s*\\?\\s*\\.)`,
          );
          if (guardRe.test(lineText)) break;

          const accessRe = new RegExp(`\\b${escapeRegex(varName)}\\s*\\.\\s*[a-zA-Z_]`);
          if (accessRe.test(lineText)) {
            reports.push({
              id: nextId(),
              severity: 'high',
              line: ln + 1,
              description: `Possible null dereference (AST): "${varName}" initialized to null/undefined at line ${declLine} and accessed without guard.`,
              suggestion: `Add a null/undefined check or use optional chaining (?.).`,
              category: 'error-handling',
              source: 'ast',
            });
            break;
          }
        }
      }
    }
    ts.forEachChild(node, detectNullDerefAst);
  }
  ts.forEachChild(sourceFile, detectNullDerefAst);

  return reports;
}

// IDENTITY_SEAL: PART-4 | role=ast-bug-detection | inputs=code,language | outputs=BugReport[]

// ============================================================
// PART 5 — AI Result Validation & Deduplication
// ============================================================

/**
 * Filter AI bug reports where `line` exceeds actual file line count.
 */
function validateAiResults(reports: BugReport[], lineCount: number): BugReport[] {
  return reports.filter((r) => r.line >= 1 && r.line <= lineCount);
}

/**
 * Deduplicate between AI and static/AST results.
 * If two reports share the same line and a similar message, keep the one
 * with the higher-priority source (ast > static > ai).
 */
export function deduplicateBugReports(reports: BugReport[]): BugReport[] {
  const SOURCE_PRIORITY: Record<string, number> = { ast: 3, static: 2, ai: 1 };

  // Group by line number
  const byLine = new Map<number, BugReport[]>();
  for (const r of reports) {
    const group = byLine.get(r.line) ?? [];
    group.push(r);
    byLine.set(r.line, group);
  }

  const result: BugReport[] = [];

  for (const group of byLine.values()) {
    if (group.length <= 1) {
      result.push(...group);
      continue;
    }

    // Check for similar messages within the same line
    const kept = new Set<number>();
    for (let i = 0; i < group.length; i++) {
      if (kept.has(i)) continue;

      let best = i;
      for (let j = i + 1; j < group.length; j++) {
        if (kept.has(j)) continue;
        if (areSimilarMessages(group[i].description, group[j].description)) {
          kept.add(j);
          const bestPri = SOURCE_PRIORITY[group[best].source ?? 'ai'] ?? 0;
          const jPri = SOURCE_PRIORITY[group[j].source ?? 'ai'] ?? 0;
          if (jPri > bestPri) {
            kept.add(best);
            best = j;
          }
        }
      }
      result.push(group[best]);
    }
  }

  return result;
}

/**
 * Naive similarity check: normalize both strings and compare overlap.
 * Returns true if they share > 50% of significant words.
 */
function areSimilarMessages(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }

  const minSize = Math.min(wordsA.size, wordsB.size);
  return minSize > 0 && overlap / minSize > 0.5;
}

/**
 * Combined analysis: run AI + static + AST detectors,
 * then merge and deduplicate results.
 */
export async function findBugsCombined(
  code: string,
  language: string,
  fileName: string,
  signal?: AbortSignal,
): Promise<BugReport[]> {
  if (!code.trim()) return [];

  // Run static and AST in parallel, AI separately (may be slow)
  const [staticResults, astResults, aiResults] = await Promise.all([
    Promise.resolve(findBugsStatic(code, language)),
    findBugsAst(code, language).catch(() => [] as BugReport[]),
    findBugs(code, language, fileName, signal).catch(() => [] as BugReport[]),
  ]);

  const all = [...staticResults, ...astResults, ...aiResults];
  return deduplicateBugReports(all);
}

// IDENTITY_SEAL: PART-5 | role=validation-dedup-combined | inputs=BugReport[] | outputs=BugReport[] (deduplicated)
