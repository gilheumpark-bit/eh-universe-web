// ============================================================
// PART 1 — Types
// ============================================================
// AI Diff Stream for EH Universe Code Studio.
// Processes streaming AI tokens, extracts code blocks,
// and computes incremental diffs against original files.

export interface DiffStreamEvent {
  type: "code-start" | "code-chunk" | "code-end" | "text" | "error";
  filePath?: string;
  language?: string;
  accumulatedCode?: string;
  text?: string;
  diff?: DiffHunk[];
  error?: string;
}

export interface DiffHunk {
  type: "add" | "remove" | "unchanged";
  content: string;
  originalLine?: number;
  newLine?: number;
}

export interface FileChange {
  filePath: string;
  language: string;
  originalContent: string;
  newContent: string;
  hunks: DiffHunk[];
  linesAdded: number;
  linesRemoved: number;
}

// IDENTITY_SEAL: PART-1 | role=타입 정의 | inputs=none | outputs=DiffStreamEvent, DiffHunk, FileChange

// ============================================================
// PART 2 — DiffStreamProcessor
// ============================================================

export class DiffStreamProcessor {
  private originalFiles: Map<string, string> = new Map();
  private listeners: Set<(event: DiffStreamEvent) => void> = new Set();
  private inCodeBlock = false;
  private codeBlockLang = "";
  private codeBlockFile = "";
  private codeAccumulator = "";
  private textAccumulator = "";
  private tickBuffer = "";
  private fileChanges: Map<string, FileChange> = new Map();

  constructor(originalFiles?: Map<string, string>) {
    if (originalFiles) this.originalFiles = originalFiles;
  }

  /** Register original file content for diff comparison */
  setOriginal(filePath: string, content: string): void {
    this.originalFiles.set(filePath, content);
  }

  /** Process a streaming token chunk */
  processChunk(chunk: string): void {
    this.tickBuffer += chunk;

    while (this.tickBuffer.length > 0) {
      if (!this.inCodeBlock) {
        const openMatch = this.tickBuffer.match(/^```(\w*)\s*(?:\/?\/?([^\n]*))?\n?/);
        if (openMatch) {
          if (this.textAccumulator.trim()) {
            this.emit({ type: "text", text: this.textAccumulator });
            this.textAccumulator = "";
          }
          this.inCodeBlock = true;
          this.codeBlockLang = openMatch[1] || "plaintext";
          this.codeBlockFile = (openMatch[2] || "").trim();
          this.codeAccumulator = "";
          this.tickBuffer = this.tickBuffer.slice(openMatch[0].length);

          if (!this.codeBlockFile && this.codeBlockLang) {
            this.codeBlockFile = guessFileFromLanguage(this.codeBlockLang);
          }

          this.emit({ type: "code-start", filePath: this.codeBlockFile, language: this.codeBlockLang });
          continue;
        }

        if (this.tickBuffer.startsWith("``") && this.tickBuffer.length < 10) break;
        if (this.tickBuffer.startsWith("`") && this.tickBuffer.length < 3) break;

        this.textAccumulator += this.tickBuffer[0];
        this.tickBuffer = this.tickBuffer.slice(1);
      } else {
        const closeIdx = this.tickBuffer.indexOf("```");
        if (closeIdx !== -1) {
          this.codeAccumulator += this.tickBuffer.slice(0, closeIdx);
          const diff = this.computeDiff(this.codeBlockFile, this.codeAccumulator);
          this.emit({ type: "code-end", filePath: this.codeBlockFile, language: this.codeBlockLang, accumulatedCode: this.codeAccumulator, diff });
          this.updateFileChange(this.codeBlockFile, this.codeBlockLang, this.codeAccumulator, diff);
          this.inCodeBlock = false;
          this.tickBuffer = this.tickBuffer.slice(closeIdx + 3);
          if (this.tickBuffer.startsWith("\n")) this.tickBuffer = this.tickBuffer.slice(1);
          continue;
        }

        if (this.tickBuffer.endsWith("``") || this.tickBuffer.endsWith("`")) {
          const safeLen = this.tickBuffer.length - (this.tickBuffer.endsWith("``") ? 2 : 1);
          if (safeLen > 0) {
            this.codeAccumulator += this.tickBuffer.slice(0, safeLen);
            this.tickBuffer = this.tickBuffer.slice(safeLen);
            this.emit({ type: "code-chunk", filePath: this.codeBlockFile, language: this.codeBlockLang, accumulatedCode: this.codeAccumulator });
          }
          break;
        }

        this.codeAccumulator += this.tickBuffer;
        this.tickBuffer = "";
        this.emit({ type: "code-chunk", filePath: this.codeBlockFile, language: this.codeBlockLang, accumulatedCode: this.codeAccumulator });
      }
    }
  }

  /** Signal end of stream */
  finish(): void {
    if (this.textAccumulator.trim()) {
      this.emit({ type: "text", text: this.textAccumulator });
    }
    if (this.inCodeBlock && this.codeAccumulator) {
      const diff = this.computeDiff(this.codeBlockFile, this.codeAccumulator);
      this.emit({ type: "code-end", filePath: this.codeBlockFile, language: this.codeBlockLang, accumulatedCode: this.codeAccumulator, diff });
      this.updateFileChange(this.codeBlockFile, this.codeBlockLang, this.codeAccumulator, diff);
    }
  }

  getFileChanges(): FileChange[] { return Array.from(this.fileChanges.values()); }

  onEvent(listener: (event: DiffStreamEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    this.inCodeBlock = false;
    this.codeBlockLang = "";
    this.codeBlockFile = "";
    this.codeAccumulator = "";
    this.textAccumulator = "";
    this.tickBuffer = "";
    this.fileChanges.clear();
  }

  private emit(event: DiffStreamEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* ignore */ }
    }
  }

  private computeDiff(filePath: string, newContent: string): DiffHunk[] {
    const original = this.originalFiles.get(filePath) ?? "";
    if (!original) {
      return newContent.split("\n").map((line, i) => ({ type: "add" as const, content: line, newLine: i + 1 }));
    }
    return computeLineDiff(original, newContent);
  }

  private updateFileChange(filePath: string, language: string, newContent: string, hunks: DiffHunk[]): void {
    const original = this.originalFiles.get(filePath) ?? "";
    this.fileChanges.set(filePath, {
      filePath, language, originalContent: original, newContent, hunks,
      linesAdded: hunks.filter((h) => h.type === "add").length,
      linesRemoved: hunks.filter((h) => h.type === "remove").length,
    });
  }
}

// IDENTITY_SEAL: PART-2 | role=스트림 프로세서 | inputs=chunk string | outputs=DiffStreamEvent, FileChange[]

// ============================================================
// PART 3 — Line Diff (LCS Algorithm)
// ============================================================

function computeLineDiff(original: string, modified: string): DiffHunk[] {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const hunks: DiffHunk[] = [];
  const lcs = computeLCS(origLines, modLines);
  let oi = 0, mi = 0, li = 0;

  while (oi < origLines.length || mi < modLines.length) {
    if (li < lcs.length && oi < origLines.length && mi < modLines.length && origLines[oi] === lcs[li] && modLines[mi] === lcs[li]) {
      hunks.push({ type: "unchanged", content: origLines[oi], originalLine: oi + 1, newLine: mi + 1 });
      oi++; mi++; li++;
    } else if (oi < origLines.length && (li >= lcs.length || origLines[oi] !== lcs[li])) {
      hunks.push({ type: "remove", content: origLines[oi], originalLine: oi + 1 });
      oi++;
    } else if (mi < modLines.length && (li >= lcs.length || modLines[mi] !== lcs[li])) {
      hunks.push({ type: "add", content: modLines[mi], newLine: mi + 1 });
      mi++;
    } else {
      break;
    }
  }
  return hunks;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  // Use greedy approach for large files
  if (m > 1000 || n > 1000) return computeLCSGreedy(a, b);

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { result.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) { i--; }
    else { j--; }
  }
  return result;
}

function computeLCSGreedy(a: string[], b: string[]): string[] {
  const bMap = new Map<string, number[]>();
  for (let j = 0; j < b.length; j++) {
    const list = bMap.get(b[j]) ?? [];
    list.push(j);
    bMap.set(b[j], list);
  }
  const result: string[] = [];
  let lastJ = -1;
  for (let i = 0; i < a.length; i++) {
    const positions = bMap.get(a[i]);
    if (!positions) continue;
    const nextJ = positions.find((j) => j > lastJ);
    if (nextJ !== undefined) { result.push(a[i]); lastJ = nextJ; }
  }
  return result;
}

// IDENTITY_SEAL: PART-3 | role=LCS diff 알고리즘 | inputs=original, modified | outputs=DiffHunk[]

// ============================================================
// PART 4 — Factory & Utilities
// ============================================================

export function createDiffStream(originalFiles?: Map<string, string>): DiffStreamProcessor {
  return new DiffStreamProcessor(originalFiles);
}

function guessFileFromLanguage(lang: string): string {
  const map: Record<string, string> = {
    typescript: "file.ts", tsx: "file.tsx", javascript: "file.js", jsx: "file.jsx",
    python: "file.py", rust: "file.rs", go: "file.go", java: "file.java",
    css: "file.css", html: "file.html", json: "file.json", markdown: "file.md",
    sql: "file.sql", shell: "file.sh", bash: "file.sh", yaml: "file.yaml",
  };
  return map[lang] ?? "";
}

// IDENTITY_SEAL: PART-4 | role=팩토리 | inputs=originalFiles | outputs=DiffStreamProcessor
