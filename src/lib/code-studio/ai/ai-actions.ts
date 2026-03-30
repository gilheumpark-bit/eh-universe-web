// ============================================================
// PART 1 — AI Hover Explanation (LRU-cached, deduplicated)
// ============================================================
// Ported from CSL IDE ai-hover.ts + ai-code-actions.ts

import { streamChat } from "@/lib/ai-providers";
import type { FileNode } from "@/lib/code-studio-types";

/** Result of an AI hover explanation request. */
export interface HoverExplanation {
  symbol: string;
  kind: string;
  explanation: string;
  signature?: string;
  parameters?: Array<{ name: string; type?: string; description?: string }>;
  returnType?: string;
  usageExamplesCount?: number;
}

const LRU_MAX = 500;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface HoverCacheEntry {
  value: HoverExplanation;
  expires: number;
}

const hoverCache = new Map<string, HoverCacheEntry>();
const hoverInflight = new Map<string, Promise<HoverExplanation | null>>();

function hoverKey(fileName: string, symbol: string, line: number): string {
  return `${fileName}:${symbol}:${line}`;
}

function hoverCacheGet(key: string): HoverExplanation | undefined {
  const entry = hoverCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    hoverCache.delete(key);
    return undefined;
  }
  hoverCache.delete(key);
  hoverCache.set(key, entry);
  return entry.value;
}

function hoverCacheSet(key: string, value: HoverExplanation): void {
  if (hoverCache.size >= LRU_MAX) {
    const oldest = hoverCache.keys().next().value;
    if (oldest !== undefined) hoverCache.delete(oldest);
  }
  hoverCache.set(key, { value, expires: Date.now() + TTL_MS });
}

const HOVER_SYSTEM_PROMPT = `You are a concise code documentation assistant. Given a code snippet and a highlighted symbol, respond with a JSON object containing:
- "symbol": the symbol name
- "kind": one of "function", "class", "interface", "type", "variable", "constant", "method", "property", "parameter", "module", "enum"
- "explanation": a brief (1-2 sentence) explanation
- "signature": the inferred type signature (if applicable)
- "parameters": array of {name, type?, description?} for functions/methods (omit if not applicable)
- "returnType": the return type (omit if not applicable)

Rules: Be concise. Output ONLY valid JSON.`;

/**
 * Get AI-generated hover explanation for a symbol.
 * Results are cached and deduplicated.
 */
export async function getHoverExplanation(
  code: string,
  symbol: string,
  line: number,
  language: string,
  signal?: AbortSignal,
  fileName?: string,
): Promise<HoverExplanation | null> {
  const key = hoverKey(fileName ?? language, symbol, line);
  const cached = hoverCacheGet(key);
  if (cached) return cached;

  const existing = hoverInflight.get(key);
  if (existing) return existing;

  const promise = _fetchHover(code, symbol, line, language, key, signal);
  hoverInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    hoverInflight.delete(key);
  }
}

async function _fetchHover(
  code: string, symbol: string, line: number, language: string, key: string, signal?: AbortSignal,
): Promise<HoverExplanation | null> {
  const userContent = `Language: ${language}\nSymbol: \`${symbol}\` at line ${line}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``;

  let result = "";
  try {
    await streamChat({
      systemInstruction: HOVER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      temperature: 0.1,
      signal,
      onChunk: (text) => { result += text; },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    return null;
  }

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as HoverExplanation;
      const explanation: HoverExplanation = {
        symbol: parsed.symbol ?? symbol,
        kind: parsed.kind ?? "variable",
        explanation: parsed.explanation ?? "",
        signature: parsed.signature,
        parameters: parsed.parameters,
        returnType: parsed.returnType,
        usageExamplesCount: parsed.usageExamplesCount ?? 0,
      };
      hoverCacheSet(key, explanation);
      return explanation;
    }
  } catch { /* fallback below */ }

  const fallback: HoverExplanation = { symbol, kind: "variable", explanation: result.trim().slice(0, 200) };
  hoverCacheSet(key, fallback);
  return fallback;
}

/** Clear hover explanation cache. */
export function clearHoverCache(): void { hoverCache.clear(); }

/** Remove a specific hover cache entry. */
export function invalidateHoverCache(fileName: string, symbol: string, line: number): void {
  hoverCache.delete(hoverKey(fileName, symbol, line));
}

// IDENTITY_SEAL: PART-1 | role=AI hover explanation | inputs=code,symbol,line | outputs=HoverExplanation

// ============================================================
// PART 2 — Docstring Generator (pure, no AI call)
// ============================================================

export interface DocstringResult {
  docstring: string;
  insertLine: number;
}

interface ParsedSignature {
  name: string;
  params: { name: string; type?: string }[];
  returnType?: string;
  isAsync: boolean;
}

function parseFunctionSignature(line: string): ParsedSignature | null {
  const funcMatch = line.match(/(?:export\s+)?(?:(async)\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w[\w<>,\s|]+))?/);
  if (funcMatch) {
    return { isAsync: !!funcMatch[1], name: funcMatch[2], params: parseParamStr(funcMatch[3]), returnType: funcMatch[4]?.trim() };
  }
  const arrowMatch = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:(async)\s+)?\(([^)]*)\)(?:\s*:\s*(\w[\w<>,\s|]+))?\s*=>/);
  if (arrowMatch) {
    return { name: arrowMatch[1], isAsync: !!arrowMatch[2], params: parseParamStr(arrowMatch[3]), returnType: arrowMatch[4]?.trim() };
  }
  return null;
}

function parseParamStr(paramStr: string): { name: string; type?: string }[] {
  if (!paramStr.trim()) return [];
  return paramStr.split(",").map((p) => {
    const parts = p.trim().split(/\s*:\s*/);
    const name = parts[0].replace(/[?=].*$/, "").trim();
    const type = parts[1]?.trim();
    return { name, type };
  }).filter((p) => p.name);
}

function buildJSDoc(sig: ParsedSignature): string {
  const lines: string[] = ["/**"];
  lines.push(` * ${sig.name}`);
  lines.push(" *");
  for (const param of sig.params) {
    const typeStr = param.type ? ` {${param.type}}` : "";
    lines.push(` * @param${typeStr} ${param.name}`);
  }
  if (sig.returnType) {
    const rt = sig.isAsync && !sig.returnType.startsWith("Promise") ? `Promise<${sig.returnType}>` : sig.returnType;
    lines.push(` * @returns {${rt}}`);
  }
  lines.push(" */");
  return lines.join("\n");
}

/** Generate JSDoc for a function near the cursor line. */
export function generateDocstring(code: string, cursorLine: number): DocstringResult | null {
  const lines = code.split("\n");
  if (cursorLine < 1 || cursorLine > lines.length) return null;
  for (let i = Math.max(0, cursorLine - 2); i < Math.min(lines.length, cursorLine + 2); i++) {
    const sig = parseFunctionSignature(lines[i]);
    if (sig) return { docstring: buildJSDoc(sig), insertLine: i };
  }
  return null;
}

// IDENTITY_SEAL: PART-2 | role=docstring generator | inputs=code,cursorLine | outputs=DocstringResult

// ============================================================
// PART 3 — AI Undo Manager (multi-file change groups)
// ============================================================

export interface AIFileChange {
  fileId: string;
  fileName: string;
  previousContent: string;
  newContent: string;
}

export interface AIChangeGroup {
  id: string;
  timestamp: number;
  description: string;
  changes: AIFileChange[];
}

const AI_UNDO_MAX = 50;

export class AIUndoManager {
  private undoStack: AIChangeGroup[] = [];
  private redoStack: AIChangeGroup[] = [];

  push(group: AIChangeGroup): void {
    this.undoStack.push(group);
    if (this.undoStack.length > AI_UNDO_MAX) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): AIChangeGroup | null {
    const group = this.undoStack.pop();
    if (!group) return null;
    this.redoStack.push(group);
    return group;
  }

  redo(): AIChangeGroup | null {
    const group = this.redoStack.pop();
    if (!group) return null;
    this.undoStack.push(group);
    return group;
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
  getHistory(): AIChangeGroup[] { return [...this.undoStack]; }
  clear(): void { this.undoStack = []; this.redoStack = []; }
}

/** Singleton AI undo manager. */
export const aiUndoManager = new AIUndoManager();

// IDENTITY_SEAL: PART-3 | role=AI undo manager | inputs=change groups | outputs=undo/redo stack

// ============================================================
// PART 4 — AI Search & Replace (NL-driven, batched)
// ============================================================

export interface SearchReplaceMatch {
  fileName: string;
  filePath: string;
  line: number;
  original: string;
  replacement: string;
  confidence: number;
}

export interface SearchReplaceResult {
  matches: SearchReplaceMatch[];
  totalFiles: number;
  totalMatches: number;
}

function flattenFilesForSearch(nodes: FileNode[], parentPath = ""): Array<{ path: string; name: string; content: string }> {
  const result: Array<{ path: string; name: string; content: string }> = [];
  for (const node of nodes) {
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (node.type === "file" && node.content != null) {
      result.push({ path: fullPath, name: node.name, content: node.content });
    }
    if (node.children) result.push(...flattenFilesForSearch(node.children, fullPath));
  }
  return result;
}

const BATCH_SIZE = 10;
const MAX_BATCH_CHARS = 30_000;

const SEARCH_REPLACE_SYSTEM = `You are a precise code transformation assistant. Given a natural-language instruction and source code, identify all lines that should be changed.

Respond ONLY with a JSON array. Each object: { "file": string, "line": number, "original": string, "replacement": string, "confidence": 0.0-1.0 }`;

/** AI-powered natural-language search & replace across files. */
export async function aiSearchReplace(
  instruction: string,
  files: FileNode[],
  signal?: AbortSignal,
  onProgress?: (processed: number, total: number) => void,
): Promise<SearchReplaceResult> {
  const flatFiles = flattenFilesForSearch(files);
  const result: SearchReplaceResult = { matches: [], totalFiles: 0, totalMatches: 0 };
  if (flatFiles.length === 0) return result;

  const batches: Array<Array<{ path: string; name: string; content: string }>> = [];
  let currentBatch: Array<{ path: string; name: string; content: string }> = [];
  let currentChars = 0;

  for (const file of flatFiles) {
    if (currentBatch.length >= BATCH_SIZE || (currentChars + file.content.length > MAX_BATCH_CHARS && currentBatch.length > 0)) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }
    currentBatch.push(file);
    currentChars += file.content.length;
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  let processedFiles = 0;
  const filesWithMatches = new Set<string>();

  for (const batch of batches) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const fileContents = batch
      .map((f) => {
        const lines = f.content.split("\n");
        const truncated = lines.slice(0, 500).join("\n");
        return `--- ${f.path} ---\n${truncated}${lines.length > 500 ? "\n... (truncated)" : ""}`;
      })
      .join("\n\n");

    let aiResponse = "";
    try {
      aiResponse = await streamChat({
        systemInstruction: SEARCH_REPLACE_SYSTEM,
        messages: [{ role: "user", content: `Instruction: ${instruction}\n\nFiles:\n${fileContents}` }],
        temperature: 0.1,
        signal,
        onChunk: () => {},
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      processedFiles += batch.length;
      onProgress?.(processedFiles, flatFiles.length);
      continue;
    }

    try {
      const cleaned = aiResponse.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const matches: Array<{ file: string; line: number; original: string; replacement: string; confidence: number }> = JSON.parse(cleaned);

      if (Array.isArray(matches)) {
        for (const match of matches) {
          const file = batch.find((f) => f.path === match.file);
          if (!file) continue;
          const lines = file.content.split("\n");
          const lineIdx = match.line - 1;
          if (lineIdx >= 0 && lineIdx < lines.length) {
            const actualLine = lines[lineIdx];
            const originalTrimmed = match.original?.trim() ?? "";
            if (originalTrimmed && actualLine.trim().includes(originalTrimmed.slice(0, 20))) {
              filesWithMatches.add(match.file);
              result.matches.push({
                fileName: file.name,
                filePath: file.path,
                line: match.line,
                original: actualLine,
                replacement: match.replacement ?? actualLine,
                confidence: Math.max(0, Math.min(1, match.confidence ?? 0.5)),
              });
            }
          }
        }
      }
    } catch { /* parse failed — skip batch */ }

    processedFiles += batch.length;
    onProgress?.(processedFiles, flatFiles.length);
  }

  result.totalFiles = filesWithMatches.size;
  result.totalMatches = result.matches.length;
  result.matches.sort((a, b) => b.confidence !== a.confidence ? b.confidence - a.confidence : a.line - b.line);
  return result;
}

// IDENTITY_SEAL: PART-4 | role=AI search & replace | inputs=instruction,files | outputs=SearchReplaceResult

// ============================================================
// PART 5 — Edit Predictor (pattern-based next-edit prediction)
// ============================================================

export interface EditPrediction {
  fileName: string;
  line: number;
  confidence: number;
  reason: string;
}

interface EditRecord {
  fileName: string;
  line: number;
  changeType: "insert" | "delete" | "modify";
  timestamp: number;
}

const MAX_RECENT_EDITS = 50;
const PREDICTION_LIMIT = 10;

/**
 * Tracks recent edits and predicts where the user will edit next.
 * Patterns: sequential, cluster, symbol-aware (with optional code index).
 */
export class EditPredictor {
  private edits: EditRecord[] = [];

  recordEdit(fileName: string, line: number, changeType: "insert" | "delete" | "modify"): void {
    this.edits.push({ fileName, line, changeType, timestamp: Date.now() });
    if (this.edits.length > MAX_RECENT_EDITS) this.edits.shift();
  }

  getRecentEdits(): Array<{ fileName: string; line: number; timestamp: number }> {
    return this.edits.map(({ fileName, line, timestamp }) => ({ fileName, line, timestamp }));
  }

  predict(): EditPrediction[] {
    if (this.edits.length === 0) return [];
    const candidates = new Map<string, EditPrediction>();

    const add = (fileName: string, line: number, confidence: number, reason: string) => {
      const key = `${fileName}:${line}`;
      const existing = candidates.get(key);
      if (existing) {
        if (confidence > existing.confidence) existing.confidence = confidence;
        if (!existing.reason.includes(reason)) existing.reason += `; ${reason}`;
      } else {
        candidates.set(key, { fileName, line, confidence, reason });
      }
    };

    // Sequential pattern
    const latest = this.edits[this.edits.length - 1];
    add(latest.fileName, latest.line + 1, 0.7, "sequential: next line");
    if (latest.line > 1) add(latest.fileName, latest.line - 1, 0.4, "sequential: previous line");

    // Cluster detection
    const fileCounts = new Map<string, number[]>();
    for (const edit of this.edits) {
      let lines = fileCounts.get(edit.fileName);
      if (!lines) { lines = []; fileCounts.set(edit.fileName, lines); }
      lines.push(edit.line);
    }
    for (const [fileName, lines] of fileCounts) {
      if (lines.length < 2) continue;
      const buckets = new Map<number, number>();
      for (const l of lines) {
        const bucket = Math.floor(l / 10) * 10;
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      }
      for (const [bucket, count] of buckets) {
        if (count >= 2) {
          add(fileName, bucket + 5, Math.min(0.3 + count * 0.1, 0.8), `cluster: ${count} edits near line ${bucket}-${bucket + 10}`);
        }
      }
    }

    return Array.from(candidates.values())
      .filter((p) => !(p.fileName === latest.fileName && p.line === latest.line))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, PREDICTION_LIMIT);
  }
}

/** Singleton edit predictor. */
export const editPredictor = new EditPredictor();

// IDENTITY_SEAL: PART-5 | role=edit predictor | inputs=edit events | outputs=EditPrediction[]

// ============================================================
// PART 6 — Monaco Code Actions Provider
// ============================================================

type MonacoModule = typeof import("monaco-editor");

/** Register lightbulb code actions for all languages. */
export function registerCodeActions(monaco: MonacoModule): void {
  monaco.languages.registerCodeActionProvider("*", {
    provideCodeActions: (model, range) => {
      const actions: import("monaco-editor").languages.CodeAction[] = [];
      const selectedText = model.getValueInRange(range);

      if (selectedText.trim().length > 0) {
        actions.push({ title: "EH: AI 리팩토링", kind: "refactor", diagnostics: [], isPreferred: false });
        actions.push({ title: "EH: AI 설명", kind: "quickfix", diagnostics: [], isPreferred: false });
        actions.push({ title: "EH: 테스트 코드 생성", kind: "quickfix", diagnostics: [], isPreferred: false });
        actions.push({ title: "EH: 독스트링 추가", kind: "quickfix", diagnostics: [], isPreferred: false });
      }

      const lineText = model.getLineContent(range.startLineNumber);
      if (/console\.log/.test(lineText)) {
        actions.push({
          title: "EH: console.log 제거",
          kind: "quickfix",
          diagnostics: [],
          isPreferred: true,
          edit: {
            edits: [{ resource: model.uri, textEdit: { range, text: "" }, versionId: model.getVersionId() }],
          },
        });
      }
      if (/\bvar\b/.test(lineText)) {
        actions.push({
          title: "EH: var → const",
          kind: "quickfix",
          diagnostics: [],
          isPreferred: true,
          edit: {
            edits: [{
              resource: model.uri,
              textEdit: {
                range: { startLineNumber: range.startLineNumber, startColumn: 1, endLineNumber: range.startLineNumber, endColumn: model.getLineMaxColumn(range.startLineNumber) },
                text: lineText.replace(/\bvar\b/, "const"),
              },
              versionId: model.getVersionId(),
            }],
          },
        });
      }
      return { actions, dispose: () => {} };
    },
  });
}

/** Update Monaco editor markers from pipeline findings. */
export function updateDiagnostics(
  monaco: MonacoModule,
  model: import("monaco-editor").editor.ITextModel,
  findings: { severity: string; message: string; line?: number; rule?: string }[],
): void {
  const markers: import("monaco-editor").editor.IMarkerData[] = findings
    .filter((f) => f.line)
    .map((f) => ({
      severity: f.severity === "critical" ? monaco.MarkerSeverity.Error :
                f.severity === "major" ? monaco.MarkerSeverity.Warning :
                monaco.MarkerSeverity.Info,
      message: f.message,
      startLineNumber: f.line!,
      startColumn: 1,
      endLineNumber: f.line!,
      endColumn: model.getLineMaxColumn(f.line!),
      source: `EH Pipeline (${f.rule ?? "check"})`,
    }));

  monaco.editor.setModelMarkers(model, "eh-pipeline", markers);
}

// IDENTITY_SEAL: PART-6 | role=Monaco code actions + diagnostics | inputs=monaco,model,findings | outputs=registered providers
