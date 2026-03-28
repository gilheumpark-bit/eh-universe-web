import { streamChat } from "@/lib/ai-providers";
import type { FileNode } from "@/lib/types";

// ============================================================
// Types
// ============================================================

export interface BugReport {
  id: string;
  fileName: string;
  line: number;
  severity: "critical" | "major" | "minor" | "suggestion";
  title: string;
  description: string;
  suggestedFix?: string;
  /** One-line quick fix description */
  quickFix?: string;
  /** Name of the function this bug is in */
  affectedFunction?: string;
}

export interface BugScanResult {
  bugs: BugReport[];
  scannedFiles: number;
  totalIssues: number;
  /** Severity breakdown: count per severity level */
  severityBreakdown: { critical: number; major: number; minor: number; suggestion: number };
}

// ============================================================
// System prompt for bug detection
// ============================================================

const BUG_FINDER_SYSTEM_PROMPT = `You are an expert code reviewer and bug finder. Your task is to analyze source code and identify potential bugs, security issues, performance problems, and code quality concerns.

RULES:
1. Only report genuine issues — do not fabricate problems.
2. Each issue must have a specific line number.
3. Classify severity accurately:
   - critical: crashes, data loss, security vulnerabilities
   - major: logic errors, resource leaks, race conditions
   - minor: edge cases, missing error handling, minor inefficiencies
   - suggestion: code style, readability, best practices
4. Provide a concise title and clear description for each issue.
5. When possible, include a suggested fix as a brief code snippet.
6. Pay special attention to these common bug patterns:
   - Memory leaks: unclosed resources (streams, connections, file handles), event listeners added without corresponding cleanup (removeEventListener, unsubscribe), setInterval without clearInterval
   - Race conditions: state mutations inside async callbacks, shared mutable state accessed from concurrent paths without synchronization, stale closure captures in useEffect/setTimeout
   - Off-by-one errors: array bounds accessed with <= instead of <, loop conditions that miss the last element or iterate one past the end, substring/slice boundary mistakes
   - Type coercion bugs: == used instead of === (especially with null/undefined/0/""), implicit conversions in arithmetic (string + number), falsy value mishandling (0, "", NaN treated as absent)
   - Null reference chains: property access on potentially null/undefined values without optional chaining (?.), missing null checks before .map/.filter/.length, destructuring from nullable sources

RESPONSE FORMAT:
Respond with ONLY a JSON array (no markdown fences, no explanation). Each element:
{
  "line": <number>,
  "severity": "critical" | "major" | "minor" | "suggestion",
  "title": "<short title>",
  "description": "<detailed description>",
  "suggestedFix": "<optional code fix>",
  "quickFix": "<one-line fix description, e.g. 'Add null check before .map()'>",
  "affectedFunction": "<name of the function this bug is in, or null if top-level>"
}

If no bugs are found, respond with an empty array: []`;

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `bug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function detectLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
  };
  return map[ext] ?? ext;
}

function parseJsonArray(raw: string): unknown[] {
  // Strip potential markdown fences
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/, "");
  }

  // Find first [ and last ]
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isValidSeverity(s: unknown): s is BugReport["severity"] {
  return typeof s === "string" && ["critical", "major", "minor", "suggestion"].includes(s);
}

function collectFiles(nodes: FileNode[]): Array<{ name: string; content: string }> {
  const result: Array<{ name: string; content: string }> = [];
  function walk(items: FileNode[], prefix: string) {
    for (const node of items) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.type === "file" && node.content != null && node.content.trim().length > 0) {
        result.push({ name: path, content: node.content });
      }
      if (node.type === "folder" && node.children) {
        walk(node.children, path);
      }
    }
  }
  walk(nodes, "");
  return result;
}

// ============================================================
// Public API
// ============================================================

export async function scanFileForBugs(
  fileName: string,
  content: string,
  language: string,
  signal?: AbortSignal,
): Promise<BugReport[]> {
  if (!content.trim()) return [];

  const userMessage = `Analyze the following ${language} file for bugs.\n\nFile: ${fileName}\n\n\`\`\`${language}\n${content}\n\`\`\``;

  let response = "";
  await streamChat({
    systemInstruction: BUG_FINDER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    temperature: 0.2,
    signal,
    onChunk: (text) => {
      response += text;
    },
  });

  const rawBugs = parseJsonArray(response);

  return rawBugs
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: generateId(),
      fileName,
      line: typeof item.line === "number" ? item.line : 0,
      severity: isValidSeverity(item.severity) ? item.severity : "minor",
      title: typeof item.title === "string" ? item.title : "Unknown issue",
      description:
        typeof item.description === "string" ? item.description : "",
      ...(typeof item.suggestedFix === "string" && item.suggestedFix
        ? { suggestedFix: item.suggestedFix }
        : {}),
      ...(typeof item.quickFix === "string" && item.quickFix
        ? { quickFix: item.quickFix }
        : {}),
      ...(typeof item.affectedFunction === "string" && item.affectedFunction
        ? { affectedFunction: item.affectedFunction }
        : {}),
    }));
}

export async function scanProjectForBugs(
  files: FileNode[],
  signal?: AbortSignal,
  onProgress?: (scanned: number, total: number) => void,
): Promise<BugScanResult> {
  const fileList = collectFiles(files);
  const total = fileList.length;
  const allBugs: BugReport[] = [];
  let scanned = 0;

  for (const file of fileList) {
    if (signal?.aborted) break;

    const language = detectLanguage(file.name);
    try {
      const bugs = await scanFileForBugs(file.name, file.content, language, signal);
      allBugs.push(...bugs);
    } catch (err) {
      // Skip files that fail (e.g. abort, rate limit) but continue scanning
      if (err instanceof DOMException && err.name === "AbortError") break;
      console.warn(`[bug-finder] Failed to scan ${file.name}:`, err);
    }

    scanned++;
    onProgress?.(scanned, total);
  }

  // Compute severity breakdown
  const severityBreakdown = {
    critical: allBugs.filter((b) => b.severity === "critical").length,
    major: allBugs.filter((b) => b.severity === "major").length,
    minor: allBugs.filter((b) => b.severity === "minor").length,
    suggestion: allBugs.filter((b) => b.severity === "suggestion").length,
  };

  return {
    bugs: allBugs,
    scannedFiles: scanned,
    totalIssues: allBugs.length,
    severityBreakdown,
  };
}
