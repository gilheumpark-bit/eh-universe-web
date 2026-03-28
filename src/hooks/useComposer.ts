"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { streamChatWithSlot } from "@/lib/ai-providers";
import type { ChatMsg } from "@/lib/ai-providers";
import type { FileNode, OpenFile } from "@/lib/types";
import { getProjectRulesContext } from "@/lib/project-rules";
import { getRelevantContext, updateIndexDebounced, type CodeIndex } from "@/lib/code-indexer";
import { saveSnapshot, type ComposerSnapshot } from "@/lib/composer-history";
import { buildSymbolGraph, formatGraphContext, type SymbolGraph } from "@/lib/symbol-graph";
import { throttle } from "@/lib/speed-optimizations";

/* ── Types ── */

export type ComposerFileStatus = "pending" | "generating" | "ready" | "accepted" | "rejected";

export interface ComposerFileChange {
  id: string;
  filePath: string;
  isNew: boolean;
  originalContent: string;
  newContent: string;
  status: ComposerFileStatus;
  /** Inline progress: percentage of file generation completed during streaming */
  generationProgress?: number;
  /** Auto-detected language from content analysis (used when filename is ambiguous) */
  detectedLanguage?: string;
}

export type ComposerMode = "idle" | "generating" | "review" | "applied" | "error";

/** Analytics for partial accept/reject tracking */
export interface ComposerAcceptAnalytics {
  accepted: string[];   // file paths that were accepted
  rejected: string[];   // file paths that were rejected
  timestamp: number;
}

export interface ComposerState {
  id: string;
  prompt: string;
  mode: ComposerMode;
  files: ComposerFileChange[];
  streamBuffer: string;
  explanation: string;
  errorMessage?: string;
  startedAt: number;
  changeSummary?: { totalFiles: number; newFiles: number; modifiedFiles: number; totalLinesAdded: number; totalLinesRemoved: number };
  /** Tracks which files were individually accepted or rejected */
  acceptAnalytics?: ComposerAcceptAnalytics;
  /** Snapshot of file contents at composer start for conflict detection */
  fileSnapshotsAtStart?: Map<string, string>;
  /** Timestamp when the task completed */
  completedAt?: number;
}

/* ── File block parser ── */

const FILE_START_RE = /^=== FILE:\s*(.+?)\s*===$/;
const FILE_END_RE = /^=== END ===$/;

/**
 * Parse a streamed response for file blocks in the format:
 *   === FILE: path/to/file.ts ===
 *   <code>
 *   === END ===
 *
 * Text outside file blocks is treated as explanation.
 */
export function parseFileBlocks(raw: string): {
  explanation: string;
  files: { filePath: string; content: string }[];
} {
  const lines = raw.split("\n");
  const files: { filePath: string; content: string }[] = [];
  const explanationLines: string[] = [];

  let currentFile: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const startMatch = line.match(FILE_START_RE);
    const endMatch = FILE_END_RE.test(line);

    if (startMatch && !currentFile) {
      currentFile = startMatch[1];
      currentLines = [];
    } else if (endMatch && currentFile) {
      files.push({ filePath: currentFile, content: currentLines.join("\n") });
      currentFile = null;
      currentLines = [];
    } else if (currentFile) {
      currentLines.push(line);
    } else {
      explanationLines.push(line);
    }
  }

  // If a file block was not closed, include what we have so far
  if (currentFile && currentLines.length > 0) {
    files.push({ filePath: currentFile, content: currentLines.join("\n") });
  }

  return {
    explanation: explanationLines.join("\n").trim(),
    files,
  };
}

/* ── Hook ── */

interface UseComposerOptions {
  allFiles: FileNode[];
  openFiles: OpenFile[];
  onOpenFile: (name: string, content: string) => void;
  onEditFile: (id: string, content: string) => void;
}

function flattenFiles(nodes: FileNode[], prefix = ""): { path: string; content: string }[] {
  const result: { path: string; content: string }[] = [];
  for (const node of nodes) {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === "file" && node.content != null) {
      result.push({ path: fullPath, content: node.content });
    }
    if (node.children) {
      result.push(...flattenFiles(node.children, fullPath));
    }
  }
  return result;
}

/**
 * Auto-detect language from file content when the file extension is ambiguous.
 * Uses heuristic pattern matching on code structure.
 */
function detectLanguageFromContent(content: string, filePath: string): string | undefined {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const knownExts: Record<string, string> = {
    ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
    py: "python", rs: "rust", go: "go", java: "java", rb: "ruby", css: "css", html: "html",
    json: "json", md: "markdown", sql: "sql", sh: "shell",
  };
  if (knownExts[ext]) return knownExts[ext];

  // Ambiguous or missing extension — infer from content patterns
  const sample = content.slice(0, 2000);
  if (/import\s+\w+\s+from\s+['"]|export\s+(default\s+)?(function|class|const)|:\s*(string|number|boolean)\b/.test(sample)) return "typescript";
  if (/^#!\s*\/usr\/bin\/env\s+python|^\s*def\s+\w+\(|^\s*import\s+\w+$|^\s*class\s+\w+\s*(\(|:)/m.test(sample)) return "python";
  if (/^package\s+\w+|func\s+\w+\(|:=\s+/.test(sample)) return "go";
  if (/^use\s+(std|crate)|fn\s+\w+\(|let\s+mut\s+/.test(sample)) return "rust";
  if (/^import\s+java\.|public\s+(static\s+)?class\s+/.test(sample)) return "java";
  if (/^\s*<(!DOCTYPE|html|head|body|div)\b/im.test(sample)) return "html";
  if (/^\s*\{[\s\S]*"[\w-]+"[\s\S]*:/.test(sample)) return "json";
  return undefined;
}

/**
 * Sort files for review: most-changed files first (by line diff count),
 * then by dependency order within the same change tier.
 */
function sortByChangeVolume(files: { filePath: string; content: string; originalContent?: string }[]): typeof files {
  return [...files].sort((a, b) => {
    const aChanges = Math.abs((a.content.split("\n").length) - ((a.originalContent ?? "").split("\n").length));
    const bChanges = Math.abs((b.content.split("\n").length) - ((b.originalContent ?? "").split("\n").length));
    return bChanges - aChanges; // most-changed first
  });
}

/**
 * Sort files by dependency order: files imported by others come first.
 * Uses a simple heuristic: scan for import/require references to other file paths.
 */
function sortByDependencyOrder(files: { filePath: string; content: string }[]): typeof files {
  const pathSet = new Set(files.map((f) => f.filePath));
  // Build adjacency: file -> files it imports
  const importedBy = new Map<string, number>();
  for (const f of files) importedBy.set(f.filePath, 0);
  for (const f of files) {
    const importMatches = f.content.matchAll(/(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g);
    for (const m of importMatches) {
      const raw = m[1];
      // Check if this import references another file in our set
      for (const other of pathSet) {
        if (other !== f.filePath && (raw.includes(other.replace(/\.\w+$/, "")) || other.includes(raw.replace(/^\.\//, "")))) {
          importedBy.set(other, (importedBy.get(other) ?? 0) + 1);
        }
      }
    }
  }
  // Sort: files imported by more others come first (dependencies first)
  return [...files].sort((a, b) => (importedBy.get(b.filePath) ?? 0) - (importedBy.get(a.filePath) ?? 0));
}

/**
 * Check if any target file was modified since the composer session started.
 * Returns list of conflicting file paths.
 */
function detectConflicts(
  snapshots: Map<string, string> | undefined,
  currentFiles: OpenFile[],
  flat: { path: string; content: string }[],
): string[] {
  if (!snapshots) return [];
  const conflicts: string[] = [];
  for (const [path, originalContent] of snapshots) {
    const currentOpen = currentFiles.find((f) => f.name === path || f.name.endsWith(`/${path}`));
    const currentFlat = flat.find((f) => f.path === path || f.path.endsWith(`/${path}`));
    const currentContent = currentOpen?.content ?? currentFlat?.content;
    if (currentContent != null && currentContent !== originalContent) {
      conflicts.push(path);
    }
  }
  return conflicts;
}

const COMPOSER_SYSTEM_PROMPT = `You are CSL Composer — a multi-file AI code editor.
The user will provide instructions. You MUST respond with file changes in this exact format:

First, briefly explain what changes you will make (1-3 sentences).

Then output each file using these delimiters:
=== FILE: path/to/filename.ext ===
<full file content here>
=== END ===

Rules:
- Output the COMPLETE file content for each file (not just the diff).
- You can output multiple files.
- Use the exact file paths from the project when modifying existing files.
- For new files, use reasonable paths.
- Do NOT use markdown code fences inside file blocks.
- Include ALL files that need to change, even if the change is small.`;

export function useComposer({ allFiles, openFiles, onOpenFile, onEditFile }: UseComposerOptions) {
  const [state, setState] = useState<ComposerState | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const indexRef = useRef<CodeIndex | null>(null);
  const symbolGraphRef = useRef<SymbolGraph | null>(null);

  // Auto-update code index and symbol graph when files change
  useEffect(() => {
    if (!allFiles || allFiles.length === 0) return;
    updateIndexDebounced(allFiles, 1000, (index) => {
      indexRef.current = index;
    });
    try {
      symbolGraphRef.current = buildSymbolGraph(allFiles);
    } catch { /* symbol graph build failed, non-critical */ }
  }, [allFiles]);

  const _update = useCallback((partial: Partial<ComposerState>) => {
    setState((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((prev) => {
      if (!prev) return null;
      // If we were generating, move to review with whatever we have
      if (prev.mode === "generating" && prev.files.length > 0) {
        return {
          ...prev,
          mode: "review",
          files: prev.files.map((f) =>
            f.status === "generating" ? { ...f, status: "ready" as const } : f
          ),
        };
      }
      return { ...prev, mode: "idle" };
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(null);
  }, []);

  const runComposer = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      abortRef.current = new AbortController();

      // Capture file snapshots at start for conflict detection
      const flat = flattenFiles(allFiles);
      const fileSnapshotsAtStart = new Map<string, string>();
      for (const f of flat) fileSnapshotsAtStart.set(f.path, f.content);
      for (const f of openFiles) fileSnapshotsAtStart.set(f.name, f.content);

      const newState: ComposerState = {
        id: crypto.randomUUID(),
        prompt,
        mode: "generating",
        files: [],
        streamBuffer: "",
        explanation: "",
        startedAt: Date.now(),
        fileSnapshotsAtStart,
      };
      setState(newState);

      // Build file context (flat already computed above)
      const fileList = flat.map((f) => f.path).join("\n");

      // Use code-indexer for smarter context instead of dumping all open files
      let relevantContext = "";
      if (indexRef.current) {
        const indexContext = getRelevantContext(indexRef.current, prompt, 6000);
        if (indexContext) relevantContext = indexContext;
      }
      if (!relevantContext) {
        // Fallback: use open files
        relevantContext = openFiles
          .slice(0, 8)
          .map((f) => `--- ${f.name} (${f.language}) ---\n${f.content.slice(0, 3000)}`)
          .join("\n\n");
      }

      // Enrich context with symbol graph relationships
      let symbolContext = "";
      if (symbolGraphRef.current) {
        try {
          // Find symbols related to the prompt keywords in open files
          const graph = symbolGraphRef.current;
          const openFileNames = openFiles.map((f) => f.name);
          for (const [id, node] of graph.nodes) {
            if (openFileNames.some((n) => node.filePath.includes(n))) {
              const ctx = formatGraphContext(graph, id);
              if (ctx) { symbolContext += ctx + "\n"; }
              if (symbolContext.length > 3000) break;
            }
          }
        } catch { /* non-critical */ }
      }

      const messages: ChatMsg[] = [
        {
          role: "user",
          content: `프로젝트 파일 목록:\n${fileList}\n\n관련 파일 컨텍스트:\n${relevantContext}${symbolContext ? `\n\n심볼 관계:\n${symbolContext}` : ""}\n\n작업 요청: ${prompt}`,
        },
      ];

      // Inject project rules into system prompt
      const projectRules = getProjectRulesContext(allFiles);
      const fullSystemPrompt = [COMPOSER_SYSTEM_PROMPT, projectRules]
        .filter(Boolean)
        .join("\n\n");

      let buffer = "";
      let lastParsedBlockCount = 0;

      // Throttled UI update for streaming: max once per 80ms to avoid excessive re-renders
      const flushComposerUI = throttle(() => {
        const parsed = parseFileBlocks(buffer);

        // Resolve which files are new vs modified
        const fileChanges: ComposerFileChange[] = parsed.files.map((f) => {
          const existingOpen = openFiles.find(
            (o) => o.name === f.filePath || o.name.endsWith(`/${f.filePath}`)
          );
          const existingFlat = flat.find(
            (o) => o.path === f.filePath || o.path.endsWith(`/${f.filePath}`)
          );

          const isNew = !existingOpen && !existingFlat;
          const originalContent = existingOpen?.content ?? existingFlat?.content ?? "";

          // Detect if we are mid-stream for the last file (no END marker yet)
          const isLastFile = parsed.files.indexOf(f) === parsed.files.length - 1;
          const blocksClosed = buffer.split("=== END ===").length - 1;
          const isStillGenerating = isLastFile && blocksClosed < parsed.files.length;

          // Compute inline generation progress as percentage per file
          let generationProgress: number | undefined;
          if (isStillGenerating) {
            // Estimate progress by comparing current content lines to original
            const currentLines = f.content.split("\n").length;
            const origLines = originalContent ? originalContent.split("\n").length : currentLines;
            const expectedLines = Math.max(origLines, 1);
            generationProgress = Math.min(99, Math.round((currentLines / expectedLines) * 100));
          } else {
            generationProgress = 100;
          }

          return {
            id: f.filePath,
            filePath: f.filePath,
            isNew,
            originalContent,
            newContent: f.content,
            status: isStillGenerating ? ("generating" as const) : ("ready" as const),
            generationProgress,
          };
        });

        setState((prev) =>
          prev
            ? {
                ...prev,
                streamBuffer: buffer,
                explanation: parsed.explanation,
                files: fileChanges,
              }
            : null
        );
      }, 80);

      try {
        await streamChatWithSlot('power', {
          systemInstruction: fullSystemPrompt,
          messages,
          temperature: 0.3,
          signal: abortRef.current.signal,
          onChunk: (chunk) => {
            buffer += chunk;

            // Immediately flush when a new file block completes (=== END ===)
            const currentBlockCount = (buffer.match(/=== END ===/g) || []).length;
            if (currentBlockCount > lastParsedBlockCount) {
              lastParsedBlockCount = currentBlockCount;
              // Force immediate update for completed blocks (bypass throttle)
              flushComposerUI();
            } else {
              // Regular throttled update for in-progress streaming
              flushComposerUI();
            }
          },
        });

        // Final parse after stream completes
        const finalParsed = parseFileBlocks(buffer);

        // Sort generated files: most-changed first for review, then by dependency order
        const withOriginals = finalParsed.files.map((f) => {
          const existingOpen = openFiles.find((o) => o.name === f.filePath || o.name.endsWith(`/${f.filePath}`));
          const existingFlat = flat.find((o) => o.path === f.filePath || o.path.endsWith(`/${f.filePath}`));
          return { filePath: f.filePath, content: f.content, originalContent: existingOpen?.content ?? existingFlat?.content ?? "" };
        });
        const sortedByChange = sortByChangeVolume(withOriginals);
        const sortedFiles = sortByDependencyOrder(sortedByChange.map((f) => ({ filePath: f.filePath, content: f.content })));

        const finalFiles: ComposerFileChange[] = sortedFiles.map((f) => {
          return finalParsed.files.find((pf) => pf.filePath === f.filePath)!;
        }).map((f) => {
          const existingOpen = openFiles.find(
            (o) => o.name === f.filePath || o.name.endsWith(`/${f.filePath}`)
          );
          const existingFlat = flat.find(
            (o) => o.path === f.filePath || o.path.endsWith(`/${f.filePath}`)
          );
          const originalContent = existingOpen?.content ?? existingFlat?.content ?? "";
          return {
            id: f.filePath,
            filePath: f.filePath,
            isNew: !existingOpen && !existingFlat,
            originalContent,
            newContent: f.content,
            status: "ready" as const,
            generationProgress: 100,
            detectedLanguage: detectLanguageFromContent(f.content, f.filePath),
          };
        });

        // Compute change count summary
        const changeSummary = {
          totalFiles: finalFiles.length,
          newFiles: finalFiles.filter((f) => f.isNew).length,
          modifiedFiles: finalFiles.filter((f) => !f.isNew).length,
          totalLinesAdded: finalFiles.reduce((sum, f) => {
            const newLines = f.newContent.split("\n").length;
            const oldLines = f.originalContent.split("\n").length;
            return sum + Math.max(0, newLines - oldLines);
          }, 0),
          totalLinesRemoved: finalFiles.reduce((sum, f) => {
            const newLines = f.newContent.split("\n").length;
            const oldLines = f.originalContent.split("\n").length;
            return sum + Math.max(0, oldLines - newLines);
          }, 0),
        };

        setState((prev) =>
          prev
            ? {
                ...prev,
                mode: finalFiles.length > 0 ? "review" : "error",
                files: finalFiles,
                explanation: finalParsed.explanation,
                streamBuffer: buffer,
                changeSummary,
                errorMessage: finalFiles.length === 0 ? "파일 변경사항을 파싱할 수 없습니다." : undefined,
              }
            : null
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // Already handled in cancel()
          return;
        }
        setState((prev) =>
          prev
            ? {
                ...prev,
                mode: "error",
                errorMessage: `오류: ${(err as Error).message}`,
              }
            : null
        );
      } finally {
        abortRef.current = null;
      }
    },
    [allFiles, openFiles]
  );

  /* ── Accept / Reject actions ── */

  const acceptFile = useCallback(
    (fileId: string) => {
      setState((prev) => {
        if (!prev) return null;
        const file = prev.files.find((f) => f.id === fileId);
        if (!file || file.status !== "ready") return prev;

        // Apply the change
        if (file.isNew) {
          onOpenFile(file.filePath, file.newContent);
        } else {
          const existing = openFiles.find(
            (o) => o.name === file.filePath || o.name.endsWith(`/${file.filePath}`)
          );
          if (existing) {
            onEditFile(existing.id, file.newContent);
          } else {
            onOpenFile(file.filePath, file.newContent);
          }
        }

        const updatedFiles = prev.files.map((f) =>
          f.id === fileId ? { ...f, status: "accepted" as const } : f
        );
        const allResolved = updatedFiles.every((f) => f.status === "accepted" || f.status === "rejected");

        // Track partial accept/reject analytics
        const acceptAnalytics: ComposerAcceptAnalytics = {
          accepted: updatedFiles.filter((f) => f.status === "accepted").map((f) => f.filePath),
          rejected: updatedFiles.filter((f) => f.status === "rejected").map((f) => f.filePath),
          timestamp: Date.now(),
        };

        // Save snapshot when all files are resolved
        if (allResolved) {
          try {
            const acceptedFiles = updatedFiles.filter((f) => f.status === "accepted");
            if (acceptedFiles.length > 0) {
              const snapshot: ComposerSnapshot = {
                id: prev.id,
                timestamp: Date.now(),
                prompt: prev.prompt,
                files: acceptedFiles.map((f) => ({ path: f.filePath, originalContent: f.originalContent, newContent: f.newContent })),
                status: "applied",
              };
              saveSnapshot(snapshot);
            }
          } catch { /* non-critical */ }
        }

        return {
          ...prev,
          files: updatedFiles,
          mode: allResolved ? "applied" : prev.mode,
          ...(allResolved ? { completedAt: Date.now() } : {}),
          acceptAnalytics,
        };
      });
    },
    [openFiles, onOpenFile, onEditFile]
  );

  const rejectFile = useCallback((fileId: string) => {
    setState((prev) => {
      if (!prev) return null;
      const updatedFiles = prev.files.map((f) =>
        f.id === fileId ? { ...f, status: "rejected" as const } : f
      );
      const allResolved = updatedFiles.every((f) => f.status === "accepted" || f.status === "rejected");
      return {
        ...prev,
        files: updatedFiles,
        mode: allResolved ? "applied" : prev.mode,
        ...(allResolved ? { completedAt: Date.now() } : {}),
      };
    });
  }, []);

  const acceptAll = useCallback(() => {
    setState((prev) => {
      if (!prev) return null;

      // Conflict detection: check if files changed since composer started
      const flat = flattenFiles(allFiles);
      const conflicts = detectConflicts(prev.fileSnapshotsAtStart, openFiles, flat);
      if (conflicts.length > 0) {
        return {
          ...prev,
          mode: "error",
          errorMessage: `충돌 감지: 다음 파일이 작성 시작 이후 수정되었습니다: ${conflicts.join(", ")}. 개별 파일별로 확인 후 수락하세요.`,
        };
      }

      for (const file of prev.files) {
        if (file.status !== "ready") continue;
        if (file.isNew) {
          onOpenFile(file.filePath, file.newContent);
        } else {
          const existing = openFiles.find(
            (o) => o.name === file.filePath || o.name.endsWith(`/${file.filePath}`)
          );
          if (existing) {
            onEditFile(existing.id, file.newContent);
          } else {
            onOpenFile(file.filePath, file.newContent);
          }
        }
      }

      // Save snapshot for history/rollback
      try {
        const snapshot: ComposerSnapshot = {
          id: prev.id,
          timestamp: Date.now(),
          prompt: prev.prompt,
          files: prev.files
            .filter((f) => f.status === "ready")
            .map((f) => ({ path: f.filePath, originalContent: f.originalContent, newContent: f.newContent })),
          status: "applied",
        };
        saveSnapshot(snapshot);
      } catch { /* snapshot save failed, non-critical */ }

      return {
        ...prev,
        mode: "applied",
        completedAt: Date.now(),
        files: prev.files.map((f) =>
          f.status === "ready" ? { ...f, status: "accepted" as const } : f
        ),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFiles, onOpenFile, onEditFile]);

  /** Calculate how many lines would be lost if all changes are rejected */
  const getRejectionImpact = useCallback((): { totalLinesLost: number; fileCount: number } => {
    if (!state) return { totalLinesLost: 0, fileCount: 0 };
    const readyFiles = state.files.filter((f) => f.status === "ready");
    const totalLinesLost = readyFiles.reduce((sum, f) => {
      return sum + f.newContent.split("\n").length;
    }, 0);
    return { totalLinesLost, fileCount: readyFiles.length };
  }, [state]);

  const rejectAll = useCallback(() => {
    setState((prev) => {
      if (!prev) return null;
      const analytics: ComposerAcceptAnalytics = {
        accepted: prev.files.filter((f) => f.status === "accepted").map((f) => f.filePath),
        rejected: prev.files.filter((f) => f.status === "ready" || f.status === "rejected").map((f) => f.filePath),
        timestamp: Date.now(),
      };
      return {
        ...prev,
        mode: "applied",
        completedAt: Date.now(),
        files: prev.files.map((f) =>
          f.status === "ready" ? { ...f, status: "rejected" as const } : f
        ),
        acceptAnalytics: analytics,
      };
    });
  }, []);

  return {
    state,
    runComposer,
    cancel,
    reset,
    acceptFile,
    rejectFile,
    acceptAll,
    rejectAll,
    getRejectionImpact,
  };
}
