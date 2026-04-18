// ============================================================
// Code Studio — Merge Conflict Panel Sub-hook
// Parses <<<<<<< / ======= / >>>>>>> blocks + tracks resolutions.
// ============================================================

import { useState, useMemo, useCallback } from "react";
import type { ConflictBlock } from "@/components/code-studio/MergeConflictEditor";

function parseMergeConflicts(content: string): ConflictBlock[] {
  if (!content) return [];
  const conflicts: ConflictBlock[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith("<<<<<<<")) {
      const startLine = i + 1;
      const oursLines: string[] = [];
      const theirsLines: string[] = [];
      let phase: "ours" | "theirs" = "ours";
      i++;

      while (i < lines.length) {
        if (lines[i].startsWith("=======")) {
          phase = "theirs";
          i++;
          continue;
        }
        if (lines[i].startsWith(">>>>>>>")) {
          conflicts.push({
            id: `conflict-${startLine}`,
            startLine,
            ours: oursLines.join("\n"),
            theirs: theirsLines.join("\n"),
            resolved: false,
          });
          i++;
          break;
        }
        if (phase === "ours") oursLines.push(lines[i]);
        else theirsLines.push(lines[i]);
        i++;
      }
    } else {
      i++;
    }
  }

  return conflicts;
}

/** Merge conflict detection + resolution overlay for the active file. */
export function useMergeConflictPanel(activeFileContent: string | null) {
  const mergeConflicts = useMemo(() => {
    if (!activeFileContent) return [];
    return parseMergeConflicts(activeFileContent);
  }, [activeFileContent]);

  const [resolvedConflicts, setResolvedConflicts] = useState<Record<string, ConflictBlock>>({});

  const resolveConflict = useCallback((conflictId: string, resolution: ConflictBlock["resolution"], manualContent?: string) => {
    setResolvedConflicts((prev) => ({
      ...prev,
      [conflictId]: { ...mergeConflicts.find((c) => c.id === conflictId)!, resolved: true, resolution, manualContent },
    }));
  }, [mergeConflicts]);

  const mergeConflictsWithResolutions = useMemo(() => {
    return mergeConflicts.map((c) => resolvedConflicts[c.id] ?? c);
  }, [mergeConflicts, resolvedConflicts]);

  return {
    mergeConflictsWithResolutions,
    resolveConflict,
  };
}
