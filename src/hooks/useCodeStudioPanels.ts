// ============================================================
// Code Studio — Panel State Hook (Aggregator)
// Composes 7 sub-hooks into a single return surface:
// Recent Files / Symbols / Code Actions / Canvas /
// AI Hub / AI Workspace / Database / Merge Conflicts
//
// Sub-hooks live in ./code-studio/* — this file is a thin
// composition layer. Public return contract is unchanged.
// ============================================================

// ============================================================
// PART 1 — Imports & Options
// ============================================================

import type { FileNode } from "@/lib/code-studio/core/types";
import { useRecentFilesPanel, type RecentFileEntry } from "./code-studio/useRecentFilesPanel";
import { useSymbolPalettePanel } from "./code-studio/useSymbolPalettePanel";
import { useEditorSelectionPanel } from "./code-studio/useEditorSelectionPanel";
import { useCanvasPanel } from "./code-studio/useCanvasPanel";
import { useAIHubPanel } from "./code-studio/useAIHubPanel";
import { useAIWorkspacePanel } from "./code-studio/useAIWorkspacePanel";
import { useDatabasePanel } from "./code-studio/useDatabasePanel";
import { useMergeConflictPanel } from "./code-studio/useMergeConflictPanel";

// Re-export so existing imports `import { RecentFileEntry } from "@/hooks/useCodeStudioPanels"` stay valid.
export type { RecentFileEntry };

interface UseCodeStudioPanelsOptions {
  files: FileNode[];
  activeFileContent: string | null;
  activeFileName: string | null;
  activeFileLanguage: string | null;
}

// IDENTITY_SEAL: PART-1 | role=Imports+Options | inputs=none | outputs=UseCodeStudioPanelsOptions

// ============================================================
// PART 2 — Aggregator Hook
// ============================================================

/** Aggregate state hook for Code Studio auxiliary panels: recent files, symbols, canvas, AI hub/workspace, DB, merge conflicts */
export function useCodeStudioPanels({
  files,
  activeFileContent,
  activeFileName,
  activeFileLanguage: _activeFileLanguage,
}: UseCodeStudioPanelsOptions) {
  const recent = useRecentFilesPanel();
  const symbols = useSymbolPalettePanel(activeFileContent, activeFileName);
  const selection = useEditorSelectionPanel();
  const canvas = useCanvasPanel(files);
  const aiHub = useAIHubPanel();
  const workspace = useAIWorkspacePanel();
  const database = useDatabasePanel();
  const conflicts = useMergeConflictPanel(activeFileContent);

  // Preserve exact public return shape expected by CodeStudioShell +
  // CodeStudioPanelManager (typed via `ReturnType<typeof useCodeStudioPanels>`).
  return {
    // Recent Files
    recentFiles: recent.recentFiles,
    trackFileOpen: recent.trackFileOpen,
    clearRecentFiles: recent.clearRecentFiles,

    // Symbol Palette
    symbols: symbols.symbols,

    // Code Actions
    editorSelection: selection.editorSelection,
    updateEditorSelection: selection.updateEditorSelection,

    // Canvas
    canvasNodes: canvas.canvasNodes,
    canvasConnections: canvas.canvasConnections,
    setCanvasNodes: canvas.setCanvasNodes,
    setCanvasConnections: canvas.setCanvasConnections,
    initCanvas: canvas.initCanvas,
    refreshCanvas: canvas.refreshCanvas,

    // AI Hub
    aiFeatures: aiHub.aiFeatures,
    toggleAiFeature: aiHub.toggleAiFeature,

    // AI Workspace
    wsThreads: workspace.wsThreads,
    wsSharedMemory: workspace.wsSharedMemory,
    createWsThread: workspace.createWsThread,
    deleteWsThread: workspace.deleteWsThread,
    sendWsMessage: workspace.sendWsMessage,

    // Database
    dbConnections: database.dbConnections,
    dbTables: database.dbTables,
    handleDbConnect: database.handleDbConnect,
    handleDbQuery: database.handleDbQuery,

    // Merge Conflicts
    mergeConflictsWithResolutions: conflicts.mergeConflictsWithResolutions,
    resolveConflict: conflicts.resolveConflict,
  };
}

// IDENTITY_SEAL: PART-2 | role=Aggregator | inputs=UseCodeStudioPanelsOptions | outputs=PanelStates+Handlers
