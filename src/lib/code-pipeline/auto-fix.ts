// ============================================================
// Pipeline Auto-Fix — Code fix suggestions for pipeline findings
// ============================================================
// Generates and applies code fixes for common pipeline findings.
// Each fix type has a pattern-based generator that produces a
// FixSuggestion with the original/modified code diff.
// Supports batch application with undo support.
// ============================================================

import type { FileNode } from "../types";
import type { Finding, PipelineStage } from "./types";

// ── Types ──

export interface PipelineFinding extends Finding {
  file?: string;
  team?: PipelineStage;
}

export type FixType =
  | "missing-semicolon"
  | "unused-import"
  | "missing-type"
  | "console-log"
  | "missing-error-handling"
  | "deprecated-api"
  | "accessibility"
  | "performance"
  | "ai-assisted";

export interface FixSuggestion {
  id: string;
  finding: PipelineFinding;
  fixType: FixType;
  description: string;
  file: string;
  line: number;
  /** The original code that would be changed */
  originalCode: string;
  /** The suggested replacement code */
  fixedCode: string;
  /** Confidence level 0-100 */
  confidence: number;
  /** Whether this fix is safe to auto-apply */
  safeToAutoApply: boolean;
}

export interface FixApplicationResult {
  applied: FixSuggestion[];
  skipped: FixSuggestion[];
  errors: { fix: FixSuggestion; error: string }[];
}

// ── Fix ID Generator ──

let fixIdCounter = 0;
function nextFixId(): string {
  return `fix-${Date.now()}-${++fixIdCounter}`;
}

// ── Fix Generators ──

interface FixGenerator {
  type: FixType;
  /** Pattern to detect the issue in a line of code */
  detect: (line: string, finding: PipelineFinding) => boolean;
  /** Generate the fix for a detected issue */
  generate: (line: string, lineNumber: number, finding: PipelineFinding) => {
    originalCode: string;
    fixedCode: string;
    description: string;
    confidence: number;
    safeToAutoApply: boolean;
  } | null;
}

const fixGenerators: FixGenerator[] = [
  // ── Missing Semicolons ──
  {
    type: "missing-semicolon",
    detect: (line, finding) => {
      if (!finding.message.toLowerCase().includes("semicolon")) return false;
      const trimmed = line.trimEnd();
      if (trimmed.length === 0) return false;
      const lastChar = trimmed[trimmed.length - 1];
      return (
        lastChar !== ";" &&
        lastChar !== "{" &&
        lastChar !== "}" &&
        lastChar !== "," &&
        lastChar !== "(" &&
        lastChar !== ":" &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("/*") &&
        !trimmed.startsWith("*")
      );
    },
    generate: (line) => {
      const trimmed = line.trimEnd();
      return {
        originalCode: line,
        fixedCode: trimmed + ";",
        description: "Add missing semicolon",
        confidence: 90,
        safeToAutoApply: true,
      };
    },
  },

  // ── Unused Imports ──
  {
    type: "unused-import",
    detect: (_line, finding) => {
      return (
        finding.message.toLowerCase().includes("unused import") ||
        finding.message.toLowerCase().includes("import") && finding.message.toLowerCase().includes("unused")
      );
    },
    generate: (line) => {
      if (!/^\s*import\s/.test(line)) return null;
      return {
        originalCode: line,
        fixedCode: "", // Remove the line
        description: "Remove unused import",
        confidence: 85,
        safeToAutoApply: true,
      };
    },
  },

  // ── Missing Types ──
  {
    type: "missing-type",
    detect: (_line, finding) => {
      return (
        finding.message.toLowerCase().includes("missing type") ||
        finding.message.toLowerCase().includes("no type") ||
        finding.message.toLowerCase().includes("implicit any")
      );
    },
    generate: (line) => {
      // Parameter without type annotation: `function foo(x)` -> `function foo(x: unknown)`
      const paramMatch = line.match(/(\(\s*\w+)(\s*[,)])/);
      if (paramMatch) {
        const fixed = line.replace(
          /(\(\s*)(\w+)(\s*[,)])/,
          "$1$2: unknown$3",
        );
        return {
          originalCode: line,
          fixedCode: fixed,
          description: "Add `: unknown` type annotation (refine the type as needed)",
          confidence: 60,
          safeToAutoApply: false,
        };
      }

      // Variable without type: `const x =` -> `const x: unknown =`
      const varMatch = line.match(/((?:const|let|var)\s+\w+)(\s*=)/);
      if (varMatch) {
        const fixed = line.replace(
          /((?:const|let|var)\s+\w+)(\s*=)/,
          "$1: unknown$2",
        );
        return {
          originalCode: line,
          fixedCode: fixed,
          description: "Add `: unknown` type annotation (refine the type as needed)",
          confidence: 50,
          safeToAutoApply: false,
        };
      }

      return null;
    },
  },

  // ── Console.log Removal ──
  {
    type: "console-log",
    detect: (line, finding) => {
      return (
        (finding.message.toLowerCase().includes("console") ||
          finding.rule === "no-console") &&
        /console\.(log|debug|info|warn|error|trace)\s*\(/.test(line)
      );
    },
    generate: (line) => {
      if (!/console\.(log|debug|info|trace)\s*\(/.test(line)) return null;
      return {
        originalCode: line,
        fixedCode: "", // Remove the line
        description: "Remove console.log statement",
        confidence: 80,
        safeToAutoApply: true,
      };
    },
  },

  // ── Missing Error Handling ──
  {
    type: "missing-error-handling",
    detect: (_line, finding) => {
      return (
        finding.message.toLowerCase().includes("error handling") ||
        finding.message.toLowerCase().includes("try-catch") ||
        finding.message.toLowerCase().includes("unhandled")
      );
    },
    generate: (line) => {
      const trimmed = line.trim();
      const indent = line.match(/^(\s*)/)?.[1] ?? "";

      // Wrap async calls in try-catch
      if (/await\s+/.test(trimmed) || /\.then\s*\(/.test(trimmed)) {
        return {
          originalCode: line,
          fixedCode: [
            `${indent}try {`,
            `${indent}  ${trimmed}`,
            `${indent}} catch (error) {`,
            `${indent}  console.error("Operation failed:", error);`,
            `${indent}  throw error;`,
            `${indent}}`,
          ].join("\n"),
          description: "Wrap in try-catch block",
          confidence: 65,
          safeToAutoApply: false,
        };
      }

      return null;
    },
  },

  // ── Deprecated API Usage ──
  {
    type: "deprecated-api",
    detect: (_line, finding) => {
      return finding.message.toLowerCase().includes("deprecated");
    },
    generate: (line, _lineNumber, finding) => {
      // Common deprecation replacements
      const replacements: [RegExp, string, string][] = [
        [/\bsubstr\s*\(/, ".substring(", "Replace substr() with substring()"],
        [/\bcomponentWillMount\b/, "componentDidMount", "Replace componentWillMount with componentDidMount"],
        [/\bcomponentWillReceiveProps\b/, "static getDerivedStateFromProps", "Replace componentWillReceiveProps with getDerivedStateFromProps"],
        [/document\.write\s*\(/, "document.body.innerHTML = ", "Replace document.write with safer DOM manipulation"],
        [/\bkeyCode\b/, "key", "Replace keyCode with key property"],
      ];

      for (const [pattern, replacement, desc] of replacements) {
        if (pattern.test(line)) {
          return {
            originalCode: line,
            fixedCode: line.replace(pattern, replacement),
            description: desc,
            confidence: 70,
            safeToAutoApply: false,
          };
        }
      }

      // Generic: extract suggestion from finding message
      const suggestMatch = finding.message.match(/use\s+[`']?(\w+)[`']?\s+instead/i);
      if (suggestMatch) {
        return {
          originalCode: line,
          fixedCode: `${line} // TODO: Replace with ${suggestMatch[1]}`,
          description: `Deprecated: ${finding.message}`,
          confidence: 40,
          safeToAutoApply: false,
        };
      }

      return null;
    },
  },

  // ── Accessibility Issues ──
  {
    type: "accessibility",
    detect: (_line, finding) => {
      return (
        finding.message.toLowerCase().includes("accessibility") ||
        finding.message.toLowerCase().includes("aria") ||
        finding.message.toLowerCase().includes("a11y") ||
        finding.message.toLowerCase().includes("alt text")
      );
    },
    generate: (line) => {
      // Add aria-label to interactive elements without one
      if (/<button[^>]*>/.test(line) && !/aria-label/.test(line)) {
        const fixed = line.replace(
          /<button([^>]*)>/,
          '<button$1 aria-label="TODO: Add descriptive label">',
        );
        return {
          originalCode: line,
          fixedCode: fixed,
          description: "Add aria-label to button element",
          confidence: 75,
          safeToAutoApply: false,
        };
      }

      // Add alt text to images
      if (/<img[^>]*>/.test(line) && !/alt\s*=/.test(line)) {
        const fixed = line.replace(
          /<img([^>]*)>/,
          '<img$1 alt="TODO: Add descriptive alt text">',
        );
        return {
          originalCode: line,
          fixedCode: fixed,
          description: "Add alt attribute to image element",
          confidence: 80,
          safeToAutoApply: false,
        };
      }

      // Add role to div with onClick
      if (/<div[^>]*onClick/.test(line) && !/role\s*=/.test(line)) {
        const fixed = line.replace(
          /<div([^>]*)(onClick)/,
          '<div$1role="button" tabIndex={0} $2',
        );
        return {
          originalCode: line,
          fixedCode: fixed,
          description: 'Add role="button" and tabIndex to clickable div',
          confidence: 70,
          safeToAutoApply: false,
        };
      }

      return null;
    },
  },

  // ── Performance Issues ──
  {
    type: "performance",
    detect: (_line, finding) => {
      return (
        finding.message.toLowerCase().includes("performance") ||
        finding.message.toLowerCase().includes("memoize") ||
        finding.message.toLowerCase().includes("re-render") ||
        finding.message.toLowerCase().includes("expensive")
      );
    },
    generate: (line) => {
      const trimmed = line.trim();
      const indent = line.match(/^(\s*)/)?.[1] ?? "";

      // Wrap expensive computations in useMemo
      if (/const\s+\w+\s*=\s*\w+\.(map|filter|reduce|sort|flatMap)\s*\(/.test(trimmed)) {
        const varMatch = trimmed.match(/const\s+(\w+)\s*=\s*(.*)/);
        if (varMatch) {
          return {
            originalCode: line,
            fixedCode: `${indent}const ${varMatch[1]} = useMemo(() => ${varMatch[2]}, [/* TODO: add dependencies */]);`,
            description: "Wrap in useMemo to avoid recomputation on every render",
            confidence: 60,
            safeToAutoApply: false,
          };
        }
      }

      // Wrap inline callback in useCallback
      if (/onClick=\{[^}]*=>[^}]*\}/.test(trimmed)) {
        return {
          originalCode: line,
          fixedCode: `${indent}// TODO: Extract this callback and wrap with useCallback\n${line}`,
          description: "Extract inline callback to useCallback",
          confidence: 50,
          safeToAutoApply: false,
        };
      }

      return null;
    },
  },
];

// ── AI-Assisted Fix Prompt Generator ──

/**
 * Generate a prompt for AI-assisted fix generation.
 * Used when pattern-based fixes cannot handle the finding.
 */
function generateAIFixPrompt(finding: PipelineFinding, codeContext: string): string {
  return [
    "Fix the following code issue.",
    "",
    `Issue: ${finding.message}`,
    `Severity: ${finding.severity}`,
    finding.rule ? `Rule: ${finding.rule}` : "",
    "",
    "Code context:",
    "```",
    codeContext,
    "```",
    "",
    "Provide the corrected code only, no explanations.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Core API ──

/**
 * Generate a fix suggestion for a pipeline finding.
 * Tries each fix generator in order, returns the first match.
 * Falls back to AI-assisted fix type for complex findings.
 */
export function generateFix(
  finding: PipelineFinding,
  fileContent?: string,
): FixSuggestion | null {
  const file = finding.file ?? "unknown";
  const line = finding.line ?? 1;

  // Get the specific line from file content
  let lineContent = "";
  let contextLines: string[] = [];
  if (fileContent) {
    const lines = fileContent.split("\n");
    lineContent = lines[line - 1] ?? "";
    contextLines = lines.slice(
      Math.max(0, line - 3),
      Math.min(lines.length, line + 2),
    );
  }

  // Try each fix generator
  for (const generator of fixGenerators) {
    if (generator.detect(lineContent, finding)) {
      const result = generator.generate(lineContent, line, finding);
      if (result) {
        return {
          id: nextFixId(),
          finding,
          fixType: generator.type,
          description: result.description,
          file,
          line,
          originalCode: result.originalCode,
          fixedCode: result.fixedCode,
          confidence: result.confidence,
          safeToAutoApply: result.safeToAutoApply,
        };
      }
    }
  }

  // Fallback: AI-assisted fix suggestion
  if (fileContent && contextLines.length > 0) {
    const prompt = generateAIFixPrompt(finding, contextLines.join("\n"));
    return {
      id: nextFixId(),
      finding,
      fixType: "ai-assisted",
      description: `AI-assisted fix needed: ${finding.message}`,
      file,
      line,
      originalCode: lineContent,
      fixedCode: `// TODO: AI fix needed\n// Prompt: ${prompt.split("\n")[0]}`,
      confidence: 30,
      safeToAutoApply: false,
    };
  }

  return null;
}

/**
 * Generate fix suggestions for multiple findings.
 */
export function generateFixes(
  findings: PipelineFinding[],
  fileContents: Map<string, string>,
): FixSuggestion[] {
  const fixes: FixSuggestion[] = [];

  for (const finding of findings) {
    const content = finding.file ? fileContents.get(finding.file) : undefined;
    const fix = generateFix(finding, content);
    if (fix) {
      fixes.push(fix);
    }
  }

  // Sort by confidence descending, then by line number
  fixes.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.line - b.line;
  });

  return fixes;
}

// ── Fix Application ──

/**
 * Apply a single fix to the file tree, returning updated file nodes.
 * Does not mutate the original tree.
 */
export function applyFix(fix: FixSuggestion, files: FileNode[]): FileNode[] {
  return applyFixToNodes(fix, files);
}

function applyFixToNodes(fix: FixSuggestion, nodes: FileNode[]): FileNode[] {
  return nodes.map((node) => {
    if (node.type === "file" && (node.name === fix.file || node.id === fix.file)) {
      if (node.content == null) return node;

      const lines = node.content.split("\n");
      const lineIdx = fix.line - 1;

      if (lineIdx < 0 || lineIdx >= lines.length) return node;

      // Verify the original code matches
      if (lines[lineIdx].trim() !== fix.originalCode.trim() && fix.originalCode !== "") {
        return node;
      }

      const newLines = [...lines];
      if (fix.fixedCode === "") {
        // Remove the line
        newLines.splice(lineIdx, 1);
      } else if (fix.fixedCode.includes("\n")) {
        // Multi-line replacement
        const replacementLines = fix.fixedCode.split("\n");
        newLines.splice(lineIdx, 1, ...replacementLines);
      } else {
        // Single-line replacement
        newLines[lineIdx] = fix.fixedCode;
      }

      return { ...node, content: newLines.join("\n") };
    }

    if (node.children) {
      const newChildren = applyFixToNodes(fix, node.children);
      if (newChildren !== node.children) {
        return { ...node, children: newChildren };
      }
    }

    return node;
  });
}

/**
 * Apply multiple fixes at once. Fixes are applied in reverse line order
 * within each file to preserve line numbers.
 *
 * Returns updated file tree and application results.
 */
export function applyAllFixes(
  fixes: FixSuggestion[],
  files: FileNode[],
): { files: FileNode[]; result: FixApplicationResult } {
  const applied: FixSuggestion[] = [];
  const skipped: FixSuggestion[] = [];
  const errors: { fix: FixSuggestion; error: string }[] = [];

  // Group fixes by file
  const fixesByFile = new Map<string, FixSuggestion[]>();
  for (const fix of fixes) {
    if (!fix.safeToAutoApply) {
      skipped.push(fix);
      continue;
    }
    const group = fixesByFile.get(fix.file) ?? [];
    group.push(fix);
    fixesByFile.set(fix.file, group);
  }

  // Sort each group by line number descending (apply bottom-up to preserve line numbers)
  for (const group of fixesByFile.values()) {
    group.sort((a, b) => b.line - a.line);
  }

  let currentFiles = files;

  for (const [, group] of fixesByFile) {
    for (const fix of group) {
      try {
        const newFiles = applyFix(fix, currentFiles);
        // Check if anything actually changed
        if (newFiles !== currentFiles) {
          currentFiles = newFiles;
          applied.push(fix);
        } else {
          skipped.push(fix);
        }
      } catch (err) {
        errors.push({
          fix,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return {
    files: currentFiles,
    result: { applied, skipped, errors },
  };
}

/**
 * Preview what a fix would change — returns a unified diff-style string.
 */
export function previewFix(fix: FixSuggestion): string {
  const lines: string[] = [];
  lines.push(`--- ${fix.file} (original)`);
  lines.push(`+++ ${fix.file} (fixed)`);
  lines.push(`@@ -${fix.line},1 +${fix.line},${fix.fixedCode === "" ? 0 : fix.fixedCode.split("\n").length} @@`);

  if (fix.originalCode) {
    for (const line of fix.originalCode.split("\n")) {
      lines.push(`-${line}`);
    }
  }
  if (fix.fixedCode) {
    for (const line of fix.fixedCode.split("\n")) {
      lines.push(`+${line}`);
    }
  }

  return lines.join("\n");
}

/**
 * Preview all fixes as a combined diff report.
 */
export function previewAllFixes(fixes: FixSuggestion[]): string {
  const sections: string[] = [];

  // Group by file
  const fixesByFile = new Map<string, FixSuggestion[]>();
  for (const fix of fixes) {
    const group = fixesByFile.get(fix.file) ?? [];
    group.push(fix);
    fixesByFile.set(fix.file, group);
  }

  for (const [file, group] of fixesByFile) {
    sections.push(`\n=== ${file} ===`);
    group.sort((a, b) => a.line - b.line);
    for (const fix of group) {
      sections.push(`\nLine ${fix.line}: ${fix.description} (${fix.fixType}, confidence: ${fix.confidence}%)`);
      sections.push(previewFix(fix));
    }
  }

  return sections.join("\n");
}
