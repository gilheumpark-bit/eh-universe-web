"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Files, Columns2, Command, Settings, Loader2,
} from "lucide-react";
import type { FileNode, OpenFile, CodeStudioSettings } from "@/lib/code-studio/core/types";
import type { EditorPane } from "@/components/code-studio/EditorGroup";
import { detectLanguage } from "@/lib/code-studio/core/types";
import { registerGhostTextProvider, cancelGhostText } from "@/lib/code-studio/ai/ghost";
import { registerEditorFeatures } from "@/lib/code-studio/editor/editor-features";
import { setupMonaco } from "@/lib/code-studio/editor/monaco-setup";
import { registerCrossFileProviders } from "@/lib/code-studio/core/cross-file";
import WelcomeScreen from "@/components/code-studio/WelcomeScreen";
import * as PI from "@/components/code-studio/PanelImports";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const BreadcrumbComponent = dynamic(
  () => import("@/components/code-studio/Breadcrumb").then((m) => ({ default: m.Breadcrumb })),
  { ssr: false },
);
const ToolbarComponent = dynamic(
  () => import("@/components/code-studio/Toolbar").then((m) => ({ default: m.Toolbar })),
  { ssr: false },
);

const MultiKeyPanel = dynamic(() => import("@/components/studio/MultiKeyPanel"), { ssr: false });

/** Search the file tree by file name (basename match). */
function findFileNodeByName(nodes: FileNode[], name: string): FileNode | null {
  const basename = name.includes("/") ? name.split("/").pop()! : name;
  for (const n of nodes) {
    if (n.type === "file" && n.name === basename) return n;
    if (n.children) {
      const found = findFileNodeByName(n.children, basename);
      if (found) return found;
    }
  }
  return null;
}

export interface CodeStudioEditorProps {
  // Core data
  files: FileNode[];
  openFiles: OpenFile[];
  activeFile: OpenFile | null;
  activeFileId: string | null;
  settings: CodeStudioSettings;
  loaded: boolean;
  hasEverOpened: boolean;
  isMobile: boolean;

  // Editor group
  useEditorGroup: boolean;
  onToggleEditorGroup: () => void;

  // Settings toolbar
  showSettings: boolean;
  onToggleSettings: () => void;
  showMultiKey: boolean;
  onCloseMultiKey: () => void;

  // Cursor
  onCursorChange: (line: number, col: number) => void;

  // Diff
  diffState: { original: string; modified: string; fileName: string } | null;
  onDiffAccept: (content: string) => void;
  onDiffReject: () => void;

  // File operations
  onFileSelect: (node: FileNode) => void;
  onCloseTab: (id: string) => void;
  onEditorChange: (value: string | undefined) => void;
  onApplyCode: (code: string, fileName?: string) => void;
  onSetActiveFileId: (id: string | null) => void;
  onOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>;

  // Welcome actions
  onWelcomeNewFile: () => void;
  onOpenDemo: () => void;
  onBlankProject: () => void;
  onResumeProject: () => void;

  // Command palette
  onShowCommandPalette: () => void;

  // Toolbar callbacks
  rightPanel: string | null;
  showTerminal: boolean;
  onToggleChat: () => void;
  onToggleTerminal: () => void;
  onTogglePipeline: () => void;
  onToggleAgent: () => void;
  onToggleSearch: () => void;
  onNewFile: () => void;
  onToggleProblems: () => void;
  onRunBugFinder: () => void;
  onDeploy: () => void;
  onToggleSplit: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onSaveToast: () => void;
  onSettingsSaved: () => void;

  // Filesystem updater (for cross-file providers)
  fsUpdateContent: (id: string, content: string) => void;

  // i18n
  tcs: Record<string, string>;

  // Children slot for right panel (injected by Shell)
  children?: React.ReactNode;
}

// IDENTITY_SEAL: PART-1 | role=Imports+Types | inputs=none | outputs=imports,CodeStudioEditorProps

// ============================================================
// PART 2 — Editor Component
// ============================================================

export function CodeStudioEditor(props: CodeStudioEditorProps) {
  const {
    files, openFiles, activeFile, activeFileId, settings, loaded,
    hasEverOpened, isMobile, useEditorGroup, onToggleEditorGroup,
    showSettings, onToggleSettings, showMultiKey, onCloseMultiKey,
    onCursorChange, diffState, onDiffAccept, onDiffReject,
    onFileSelect, onCloseTab, onEditorChange, onApplyCode,
    onSetActiveFileId, onOpenFiles,
    onWelcomeNewFile, onOpenDemo, onBlankProject, onResumeProject,
    onShowCommandPalette,
    rightPanel, showTerminal,
    onToggleChat, onToggleTerminal, onTogglePipeline, onToggleAgent,
    onToggleSearch, onNewFile, onToggleProblems, onRunBugFinder,
    onDeploy, onToggleSplit, onUndo, onRedo, onZoomIn, onZoomOut,
    onZoomReset, onSaveToast, onSettingsSaved,
    fsUpdateContent, tcs, children,
  } = props;

  const editorRef = useRef<unknown>(null);
  const crossFileDisposableRef = useRef<{ dispose(): void } | null>(null);

  // Cleanup cross-file disposable on unmount
  useEffect(() => {
    return () => {
      crossFileDisposableRef.current?.dispose();
      crossFileDisposableRef.current = null;
    };
  }, []);

  // EditorGroup per-pane editor renderer
  const renderEditorPane = useCallback((pane: EditorPane, isFocused: boolean) => {
    const paneFile = pane.files.find((f) => f.id === pane.activeFileId);
    if (!paneFile) {
      return (
        <div className="h-full flex items-center justify-center text-text-tertiary text-xs">
          {tcs.selectFile}
        </div>
      );
    }
    return (
      <MonacoEditor
        height="100%" language={paneFile.language} value={paneFile.content}
        onChange={(value: string | undefined) => {
          if (value === undefined) return;
          onOpenFiles((prev) => prev.map((f) => f.id === paneFile.id ? { ...f, content: value, isDirty: true } : f));
          fsUpdateContent(paneFile.id, value);
        }}
        theme="vs-dark"
        options={{
          fontSize: settings.fontSize, tabSize: settings.tabSize, wordWrap: settings.wordWrap,
          minimap: { enabled: isFocused ? settings.minimap : false }, scrollBeyondLastLine: false, padding: { top: 12 },
          fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
          lineNumbers: "on", renderLineHighlight: "line",
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: "smooth", cursorSmoothCaretAnimation: "on",
        }}
        onMount={isFocused ? (editor: unknown, monaco: unknown) => {
          editorRef.current = editor;
          setupMonaco(monaco as Parameters<typeof setupMonaco>[0], editor as Parameters<typeof setupMonaco>[1], { theme: "dark" });
          registerEditorFeatures(monaco as Parameters<typeof registerEditorFeatures>[0], editor as Parameters<typeof registerEditorFeatures>[1]);
          registerGhostTextProvider(monaco as Parameters<typeof registerGhostTextProvider>[0]);
        } : undefined}
      />
    );
  }, [settings.fontSize, settings.tabSize, settings.wordWrap, settings.minimap, fsUpdateContent, onOpenFiles, tcs.selectFile]);

  const handleMountDesktopEditor = useCallback((editor: unknown, monaco: unknown) => {
    editorRef.current = editor;
    setupMonaco(monaco as Parameters<typeof setupMonaco>[0], editor as Parameters<typeof setupMonaco>[1], { theme: "dark" });
    registerEditorFeatures(monaco as Parameters<typeof registerEditorFeatures>[0], editor as Parameters<typeof registerEditorFeatures>[1]);
    registerGhostTextProvider(monaco as Parameters<typeof registerGhostTextProvider>[0]);
    crossFileDisposableRef.current?.dispose();
    crossFileDisposableRef.current = registerCrossFileProviders(monaco as Parameters<typeof registerCrossFileProviders>[0], {
      onOpenFile: (filePath: string) => {
        const node = findFileNodeByName(files, filePath);
        if (node) onFileSelect(node);
      },
    });
    (editor as { onDidDispose: (cb: () => void) => void }).onDidDispose(() => {
      cancelGhostText();
      crossFileDisposableRef.current?.dispose();
      crossFileDisposableRef.current = null;
    });
    (editor as { onDidChangeCursorPosition: (cb: (e: { position: { lineNumber: number; column: number } }) => void) => void }).onDidChangeCursorPosition((e) => {
      onCursorChange(e.position.lineNumber, e.position.column);
    });
  }, [files, onFileSelect, onCursorChange]);

  // Expose editor ref for outline navigation etc.
  const navigateToLine = useCallback((line: number) => {
    const editor = editorRef.current as { revealLineInCenter?: (l: number) => void; setPosition?: (p: { lineNumber: number; column: number }) => void } | null;
    editor?.revealLineInCenter?.(line);
    editor?.setPosition?.({ lineNumber: line, column: 1 });
  }, []);

  // Empty state renderer
  const emptyState = !loaded ? (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent-green/40" />
    </div>
  ) : !hasEverOpened ? (
    <WelcomeScreen onNewFile={onWelcomeNewFile} onOpenDemo={onOpenDemo} onBlankProject={onBlankProject} onResumeProject={onResumeProject} />
  ) : (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block rounded-full border border-accent-green/20 bg-accent-green/8 p-4"><Files className="h-8 w-8 text-accent-green" /></div>
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-text-tertiary">{tcs.selectFile}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Breadcrumb */}
      {activeFile && (
        <BreadcrumbComponent
          path={["project", "src", activeFile.name]}
          isModified={activeFile.isDirty}
        />
      )}

      {/* Editor Tabs */}
      <div className="flex items-center border-b border-white/8 bg-bg-secondary">
        <div className="flex-1 min-w-0">
          <PI.EditorTabsComponent
            openFiles={openFiles}
            activeFileId={activeFileId}
            onSelectFile={(id) => onSetActiveFileId(id)}
            onCloseFile={onCloseTab}
          />
        </div>
        <div className="flex items-center gap-1 px-2 flex-shrink-0">
          <button
            onClick={onToggleEditorGroup}
            disabled={openFiles.length === 0}
            className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${useEditorGroup ? "text-accent-green" : "text-text-tertiary"} disabled:opacity-30`}
            title="Split Editor (EditorGroup)"
          >
            <Columns2 className="h-4 w-4" />
          </button>
          <button onClick={onShowCommandPalette} className="rounded p-1.5 transition-all duration-150 active:scale-95 text-text-tertiary hover:text-text-secondary" title="Commands (Ctrl+Shift+P)"><Command className="h-4 w-4" /></button>
          <button onClick={() => { if (showSettings) onSettingsSaved(); onToggleSettings(); }} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${showSettings ? "text-accent-amber" : "text-text-tertiary hover:text-text-secondary"}`} title="Inline Settings" aria-label="인라인 설정"><Settings className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Toolbar */}
      {showSettings && (
        <ToolbarComponent
          onToggleChat={onToggleChat}
          onToggleTerminal={onToggleTerminal}
          onTogglePipeline={onTogglePipeline}
          onToggleAgent={onToggleAgent}
          onToggleSidebar={() => {}}
          onToggleSearch={onToggleSearch}
          onNewFile={onNewFile}
          onOpenSettings={() => { onToggleSettings(); onSettingsSaved(); }}
          onOpenPalette={onShowCommandPalette}
          onToggleProblems={onToggleProblems}
          onRunBugFinder={onRunBugFinder}
          onDeploy={onDeploy}
          onToggleSplit={onToggleSplit}
          onUndo={onUndo}
          onRedo={onRedo}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
          fontSize={settings.fontSize}
          showChat={rightPanel === "chat"}
          showAgent={rightPanel === "agents"}
          showTerminal={showTerminal}
          showPipeline={rightPanel === "pipeline"}
        />
      )}

      {/* Multi-Key Panel Modal */}
      {showMultiKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[480px] max-h-[80vh] rounded-xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
            <MultiKeyPanel language="ko" onClose={onCloseMultiKey} />
          </div>
        </div>
      )}

      {/* Editor + Right Panel area (children injected by Shell) */}
      <div className="flex flex-1 min-h-0">
        {/* Diff Viewer Overlay */}
        {diffState && (
          <div className="absolute inset-0 z-20 bg-bg-primary">
            <PI.DiffViewerComponent
              original={diffState.original}
              modified={diffState.modified}
              language={activeFile?.language ?? "plaintext"}
              fileName={diffState.fileName}
              onAccept={(content: string) => { onApplyCode(content); onDiffReject(); }}
              onReject={onDiffReject}
            />
          </div>
        )}

        {/* Editor Area */}
        <div id="main-editor" className="flex-1 min-w-0 flex flex-col">
          {useEditorGroup ? (
            <PI.EditorGroupComponent
              openFiles={openFiles}
              activeFileId={activeFileId}
              onSelectFile={(id: string) => onSetActiveFileId(id)}
              onCloseFile={onCloseTab}
              renderEditor={renderEditorPane}
            />
          ) : (
            activeFile ? (
              <MonacoEditor
                height="100%" language={activeFile.language} value={activeFile.content}
                onChange={onEditorChange} theme="vs-dark"
                options={{
                  fontSize: settings.fontSize, tabSize: settings.tabSize, wordWrap: settings.wordWrap,
                  minimap: { enabled: settings.minimap }, scrollBeyondLastLine: false, padding: { top: 12 },
                  fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
                  lineNumbers: "on", renderLineHighlight: "line",
                  bracketPairColorization: { enabled: true },
                  guides: { indentation: true, bracketPairs: true, highlightActiveIndentation: true },
                  smoothScrolling: true,
                  cursorBlinking: "smooth", cursorSmoothCaretAnimation: "on",
                  stickyScroll: { enabled: true },
                }}
                onMount={handleMountDesktopEditor}
              />
            ) : emptyState
          )}
        </div>

        {/* Right panel slot — injected via children from Shell */}
        {children}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=EditorComponent | inputs=EditorProps | outputs=EditorUI+Monaco
