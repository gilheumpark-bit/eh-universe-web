"use client";

// ============================================================
// PART 1 — Imports
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Files, Plus, X, FileText, FolderOpen, Folder,
  Edit3, Trash2, AlertTriangle, Home, Loader2,
} from "lucide-react";
import type { FileNode, OpenFile, CodeStudioSettings } from "@/lib/code-studio/core/types";
import { DEFAULT_SETTINGS, detectLanguage, fileIconColor } from "@/lib/code-studio/core/types";
import { saveSettings, loadSettings, listProjects, switchProject } from "@/lib/code-studio/core/store";
import { runStaticPipeline } from "@/lib/code-studio/pipeline/pipeline";
import { findBugsStatic, type BugReport } from "@/lib/code-studio/pipeline/bugfinder";
import { runStressReport, type StressReport } from "@/lib/code-studio/pipeline/stress-test";
import { runVerificationLoop, type VerificationResult } from "@/lib/code-studio/pipeline/verification-loop";
import { parseErrors, type ParsedError } from "@/lib/code-studio/pipeline/error-parser";
import { PANEL_REGISTRY, getPanelLabel, getGroupLabel, getVisiblePanels, type RightPanel, type PanelGroup, type PanelDef } from "@/lib/code-studio/core/panel-registry";
import { useSessionRestore, type SessionSnapshot } from "@/hooks/useSessionRestore";
import { useLang } from "@/lib/LangContext";
import { TRANSLATIONS } from "@/lib/studio-translations";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

import { ToastProvider, useToast } from "@/components/code-studio/ToastSystem";
import WelcomeScreen from "@/components/code-studio/WelcomeScreen";
import { useIsMobile } from "@/components/code-studio/MobileLayout";
import { useCodeStudioFileSystem } from "@/hooks/useCodeStudioFileSystem";
import { useCodeStudioComposer } from "@/hooks/useCodeStudioComposer";
import { useCodeStudioPanels } from "@/hooks/useCodeStudioPanels";
import { useCodeStudioKeyboard } from "@/hooks/useCodeStudioKeyboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import * as PI from "@/components/code-studio/PanelImports";
import { useStudioTheme } from "@/hooks/useStudioTheme";

// Extracted components
import { CodeStudioEditor } from "@/components/code-studio/CodeStudioEditor";
import { ActivityBar, RightPanelContent, BottomPanels, type PipelineStage } from "@/components/code-studio/CodeStudioPanelManager";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/code-studio/CommandPalette"), { ssr: false });
const TouchGesturesComponent = dynamic(
  () => import("@/components/code-studio/TouchGestures").then((m) => ({ default: m.TouchGestures })),
  { ssr: false },
);
const BreadcrumbComponent = dynamic(
  () => import("@/components/code-studio/Breadcrumb").then((m) => ({ default: m.Breadcrumb })),
  { ssr: false },
);
const ConfirmDialog = dynamic(
  () => import("@/components/code-studio/ConfirmDialog").then((m) => ({ default: m.ConfirmDialog })),
  { ssr: false },
);
const ShortcutOverlay = dynamic(
  () => import("@/components/code-studio/ShortcutOverlay"),
  { ssr: false },
);
const ErrorOverlay = dynamic(
  () => import("@/components/code-studio/ErrorOverlay"),
  { ssr: false },
);

// IDENTITY_SEAL: PART-1 | role=Imports | inputs=none | outputs=imports+dynamic-components

// ============================================================
// PART 2 — Demo Files & File Tree
// ============================================================

const DEMO_FILES: FileNode[] = [
  {
    id: "root", name: "project", type: "folder",
    children: [
      {
        id: "src", name: "src", type: "folder",
        children: [
          { id: "index-ts", name: "index.ts", type: "file", content: `// Welcome to Code Studio\n\nfunction greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("EH Universe"));\n` },
          { id: "utils-ts", name: "utils.ts", type: "file", content: `export function sum(a: number, b: number): number {\n  return a + b;\n}\n\nexport function capitalize(str: string): string {\n  return str.charAt(0).toUpperCase() + str.slice(1);\n}\n` },
          { id: "app-tsx", name: "App.tsx", type: "file", content: `import React from "react";\n\nexport default function App() {\n  return (\n    <div className="app">\n      <h1>EH Code Studio</h1>\n      <p>Monaco Editor + Terminal + AI</p>\n    </div>\n  );\n}\n` },
        ],
      },
      { id: "pkg-json", name: "package.json", type: "file", content: `{\n  "name": "eh-project",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build"\n  }\n}\n` },
      { id: "readme", name: "README.md", type: "file", content: `# EH Project\n\nThis is a demo project in Code Studio.\n` },
    ],
  },
];

function addFileToTree(tree: FileNode[], parentId: string, newFile: FileNode): FileNode[] {
  return tree.map((node) => {
    if (node.id === parentId && node.type === "folder") {
      return { ...node, children: [...(node.children ?? []), newFile] };
    }
    if (node.children) {
      return { ...node, children: addFileToTree(node.children, parentId, newFile) };
    }
    return node;
  });
}

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

function FileTreeItem({
  node, depth, activeFileId, onSelect, onDelete, onRename,
}: {
  node: FileNode; depth: number; activeFileId: string | null;
  onSelect: (node: FileNode) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const isFolder = node.type === "folder";
  const isActive = node.id === activeFileId;

  return (
    <div>
      <div
        className={`group flex w-full items-center gap-1.5 px-2 py-1 text-[12px] transition-colors hover:bg-white/[0.06] ${
          isActive ? "bg-accent-green/10 text-accent-green" : "text-text-secondary"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={() => { if (isFolder) setOpen(!open); else onSelect(node); }}
          className="flex flex-1 items-center gap-1.5 text-left min-w-0"
        >
          {isFolder ? (
            open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent-amber" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-accent-amber" />
          ) : (
            <FileText className={`h-3.5 w-3.5 shrink-0 ${fileIconColor(node.name)}`} />
          )}
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => { setEditing(false); if (editName.trim()) onRename(node.id, editName.trim()); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); if (editName.trim()) onRename(node.id, editName.trim()); } }}
              className="w-full bg-transparent text-[12px] font-[family-name:var(--font-mono)] outline-none border-b border-accent-green"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate font-[family-name:var(--font-mono)]">{node.name}</span>
          )}
        </button>
        {!isFolder && node.id !== "root" && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
            <button onClick={() => { setEditing(true); setEditName(node.name); }} className="rounded p-0.5 hover:bg-white/10"><Edit3 className="h-2.5 w-2.5" /></button>
            <button onClick={() => onDelete(node.id)} aria-label="삭제" className="rounded p-0.5 hover:bg-white/10 text-accent-red"><Trash2 className="h-2.5 w-2.5" /></button>
          </div>
        )}
      </div>
      {isFolder && open && node.children?.map((child) => (
        <FileTreeItem key={child.id} node={child} depth={depth + 1} activeFileId={activeFileId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} />
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=DemoFiles+FileTree | inputs=none | outputs=DEMO_FILES,FileTreeItem

// ============================================================
// PART 3 — Orchestrator (CodeStudioShellInner)
// ============================================================

function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => setIsTablet(e.matches);
    handleChange(mql);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);
  return isTablet;
}

function CodeStudioShellInner() {
  const { toast } = useToast();
  const { lang } = useLang();
  const tcs = TRANSLATIONS[lang.toUpperCase() as AppLanguage]?.codeStudio ?? TRANSLATIONS.KO.codeStudio;
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  // Apply theme system (same as novel studio)
  const { themeLevel, colorTheme } = useStudioTheme();

  // ── File System ──
  const { tree: files, setTree: setFiles, createFile: fsCreateFile, deleteNode: fsDeleteNode, renameNode: fsRenameNode, updateContent: fsUpdateContent, undo: fsUndo, redo: fsRedo, canUndo: fsCanUndo, canRedo: fsCanRedo, persist: fsPersist, load: fsLoad } = useCodeStudioFileSystem(DEMO_FILES);

  // ── Core State ──
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CodeStudioSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [hasEverOpened, setHasEverOpened] = useState(false);

  // ── Editor State ──
  const [useEditorGroup, setUseEditorGroup] = useState(false);
  const [diffState, setDiffState] = useState<{ original: string; modified: string; fileName: string } | null>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showMultiKey, setShowMultiKey] = useState(false);

  // ── Panel State ──
  const [rightPanel, setRightPanel] = useState<RightPanel>("chat");
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [showPipelineBottom, setShowPipelineBottom] = useState(false);
  const [showAdvancedPanels, setShowAdvancedPanels] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ── Analysis/Verification State ──
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [parsedErrors, setParsedErrors] = useState<ParsedError[]>([]);
  const [stressReport, setStressReport] = useState<StressReport | null>(null);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationScore, setVerificationScore] = useState<number | null>(null);
  const [currentVerifyRound, setCurrentVerifyRound] = useState(0);

  // ── Staging/Rollback State ──
  const [stagedFiles, setStagedFiles] = useState<Record<string, string>>({});
  const [preApplySnapshot, setPreApplySnapshot] = useState<Record<string, string>>({});

  // ── Dialog State ──
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [buildError, setBuildError] = useState<{ message: string; stack?: string; file?: string; line?: number } | null>(null);

  // ── Refs ──
  const termRef = useRef<HTMLDivElement>(null);
  const editorNavigateRef = useRef<(line: number) => void>(() => {});

  // ── Computed ──
  const activeFile = openFiles.find((f) => f.id === activeFileId) ?? null;
  const pipelineScore = pipelineStages.length > 0
    ? Math.round(pipelineStages.reduce((sum, s) => sum + (s.score ?? 0), 0) / pipelineStages.length)
    : null;

  // ── Hooks ──
  const composer = useCodeStudioComposer();
  const panels = useCodeStudioPanels({
    files,
    activeFileContent: activeFile?.content ?? null,
    activeFileName: activeFile?.name ?? null,
    activeFileLanguage: activeFile?.language ?? null,
  });

  const keyboard = useCodeStudioKeyboard({
    modalOpen: !!confirmState || showCommandPalette || showShortcuts,
    bindings: [
      { keys: "ctrl+shift+p", handler: () => setShowCommandPalette(v => !v), description: "Command Palette" },
      { keys: "ctrl+p", handler: () => setShowQuickOpen(v => !v), description: "Quick Open" },
      { keys: "ctrl+s", handler: () => {
        if (activeFileId) {
          setOpenFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false } : f));
          fsPersist();
          toast(tcs.savedLocally, "success");
        }
      }, description: "Save File" },
      { keys: "ctrl+shift+f", handler: () => setRightPanel(v => v === "search" ? null : "search"), description: "Search in Files" },
      { keys: "ctrl+`", handler: () => setShowTerminal(v => !v), description: "Toggle Terminal" },
      { keys: "ctrl+n", handler: () => setShowNewFile(true), description: "New File" },
      { keys: "ctrl+=", handler: () => setSettings(s => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) })), description: "Zoom In" },
      { keys: "ctrl+-", handler: () => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) })), description: "Zoom Out" },
    ],
  });

  // Session restore
  const handleSessionRestore = useCallback((snapshot: SessionSnapshot) => {
    if (snapshot.activePanel) setRightPanel(snapshot.activePanel as RightPanel);
    if (snapshot.sidebarWidth) setSidebarWidth(snapshot.sidebarWidth);
    if (snapshot.openFiles?.length) setHasEverOpened(true);
  }, []);
  useSessionRestore({
    projectId: null,
    openFiles: openFiles.map(f => f.name),
    activeFile: activeFileId,
    activePanel: rightPanel,
    sidebarWidth,
    onRestore: handleSessionRestore,
  });

  // ── Effects ──

  // IndexedDB load
  useEffect(() => {
    (async () => {
      const [, savedSettings] = await Promise.all([fsLoad(), loadSettings()]);
      if (savedSettings) setSettings(savedSettings);
      setLoaded(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save file tree
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { fsPersist(); }, 1000);
    return () => clearTimeout(t);
  }, [files, loaded]);

  // Auto-save settings
  useEffect(() => {
    if (!loaded) return;
    saveSettings(settings);
  }, [settings, loaded]);

  // Session state persistence
  useEffect(() => {
    if (!loaded) return;
    const uiState = { rightPanel, showTerminal, showProblems, showPipelineBottom, sidebarWidth };
    sessionStorage.setItem('codeStudio:uiState', JSON.stringify(uiState));
  }, [loaded, rightPanel, showTerminal, showProblems, showPipelineBottom, sidebarWidth]);

  // Restore session UI state
  useEffect(() => {
    if (!loaded) return;
    try {
      const saved = sessionStorage.getItem('codeStudio:uiState');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.rightPanel) setRightPanel(state.rightPanel);
        if (state.showTerminal !== undefined) setShowTerminal(state.showTerminal);
        if (state.showProblems !== undefined) setShowProblems(state.showProblems);
        if (state.showPipelineBottom !== undefined) setShowPipelineBottom(state.showPipelineBottom);
        if (state.sidebarWidth) setSidebarWidth(state.sidebarWidth);
      }
    } catch { /* corrupt data — skip */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key === "P") { e.preventDefault(); setShowCommandPalette((v) => !v); }
      if (mod && !e.shiftKey && e.key === "p") { e.preventDefault(); setShowQuickOpen((v) => !v); }
      if (mod && e.key === "z" && !e.shiftKey && fsCanUndo) { e.preventDefault(); fsUndo(); }
      if (mod && (e.key === "y" || (e.shiftKey && e.key === "z")) && fsCanRedo) { e.preventDefault(); fsRedo(); }
      if (mod && e.shiftKey && e.key === "F") { e.preventDefault(); setRightPanel((v) => v === "search" ? null : "search"); }
      if (mod && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        if (activeFileId) {
          setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, isDirty: false } : f));
          fsPersist();
          toast(tcs.savedLocally, "success");
        }
      }
      if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); setSettings((s) => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) })); }
      if (mod && e.key === "-") { e.preventDefault(); setSettings((s) => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) })); }
      if (mod && e.key === "`") { e.preventDefault(); setShowTerminal((v) => !v); }
      if (mod && e.key === "n" && !e.shiftKey) { e.preventDefault(); setShowNewFile(true); }
      if (e.key === "?" && !mod && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { setShowShortcuts((v) => !v); }
      if (mod && e.key === "w") {
        e.preventDefault();
        if (activeFileId) {
          const af = openFiles.find((f) => f.id === activeFileId);
          if (af?.isDirty && !window.confirm("Unsaved changes will be lost. Close anyway?")) return;
          setOpenFiles((prev) => { const next = prev.filter((f) => f.id !== activeFileId); setActiveFileId(next.length > 0 ? next[next.length - 1].id : null); return next; });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFileId, files, openFiles, toast]);

  // Bug analysis on file change
  useEffect(() => {
    if (!activeFile?.isDirty) return;
    const t = setTimeout(() => {
      const bugs = findBugsStatic(activeFile.content, activeFile.language);
      setBugReports(bugs);
    }, 1500);
    return () => clearTimeout(t);
  }, [activeFile?.isDirty, activeFile?.content, activeFile?.language]);

  // Terminal effect
  useEffect(() => {
    if (!showTerminal || !termRef.current) return;
    let term: import("@xterm/xterm").Terminal | null = null;
    let mounted = true;
    let cmdBuffer = "";
    const cmdHistory: string[] = [];
    let historyIdx = -1;

    const processCommand = (cmd: string, t: import("@xterm/xterm").Terminal) => {
      const parts = cmd.trim().split(/\s+/);
      const command = parts[0]?.toLowerCase();
      const args = parts.slice(1);
      switch (command) {
        case "": break;
        case "help":
          t.writeln("  \x1b[36mAvailable commands:\x1b[0m");
          t.writeln("  help       Show this message");
          t.writeln("  ls         List files");
          t.writeln("  cat <file> Show file content");
          t.writeln("  echo <msg> Print message");
          t.writeln("  clear      Clear terminal");
          t.writeln("  date       Current date/time");
          t.writeln("  whoami     Current user");
          t.writeln("  pwd        Working directory");
          t.writeln("  pipeline   Run code analysis");
          break;
        case "clear": t.clear(); break;
        case "date": t.writeln("  " + new Date().toLocaleString()); break;
        case "whoami": t.writeln("  \x1b[33meh-developer\x1b[0m"); break;
        case "pwd": t.writeln("  /project/src"); break;
        case "echo": t.writeln("  " + args.join(" ")); break;
        case "ls": {
          const flatFiles = (nodes: FileNode[]): string[] => {
            const result: string[] = [];
            for (const n of nodes) {
              if (n.type === "folder") { result.push("\x1b[34m" + n.name + "/\x1b[0m"); if (n.children) result.push(...flatFiles(n.children).map(f => "  " + f)); }
              else result.push(n.name);
            }
            return result;
          };
          flatFiles(files).forEach((f) => t.writeln("  " + f));
          break;
        }
        case "cat": {
          const findFile = (nodes: FileNode[], name: string): FileNode | null => {
            for (const n of nodes) { if (n.name === name && n.type === "file") return n; if (n.children) { const found = findFile(n.children, name); if (found) return found; } } return null;
          };
          const file = findFile(files, args[0] ?? "");
          if (file) { t.writeln(""); (file.content ?? "").split("\n").forEach((l) => t.writeln("  " + l)); }
          else t.writeln("  \x1b[31mFile not found: " + (args[0] ?? "") + "\x1b[0m");
          break;
        }
        case "pipeline": {
          const af = openFiles.find((f) => f.id === activeFileId);
          if (af) {
            t.writeln("  \x1b[36mRunning pipeline on " + af.name + "...\x1b[0m");
            const result = runStaticPipeline(af.content, af.language);
            const outputLines: string[] = [];
            result.stages.forEach((s) => {
              const icon = s.status === "pass" ? "\x1b[32m+\x1b[0m" : s.status === "warn" ? "\x1b[33m!\x1b[0m" : "\x1b[31mx\x1b[0m";
              t.writeln(`  ${icon} ${s.name}: ${s.score}/100 -- ${s.message}`);
              outputLines.push(s.message);
            });
            t.writeln(`  \x1b[36mOverall: ${result.overallScore}/100 (${result.overallStatus})\x1b[0m`);
            const errors = parseErrors(outputLines.join("\n"));
            if (errors.length > 0) { setParsedErrors(errors); setBuildError({ message: `${errors.length} error(s) found`, file: errors[0].file, line: errors[0].line }); }
            else { setParsedErrors([]); }
          } else t.writeln("  \x1b[31mNo file open\x1b[0m");
          break;
        }
        default:
          t.writeln("  \x1b[31mCommand not found: " + command + "\x1b[0m");
          t.writeln("  Type \x1b[36mhelp\x1b[0m for available commands");
      }
    };

    (async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      await import("@xterm/xterm/css/xterm.css");
      if (!mounted || !termRef.current) return;
      term = new Terminal({
        theme: { background: "#0d0d0d", foreground: "#b9b2a6", cursor: "#2f9b83", selectionBackground: "#2f9b8340" },
        fontSize: 13, fontFamily: "var(--font-mono), 'JetBrains Mono', monospace", cursorBlink: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termRef.current);
      fit.fit();
      term.writeln("\x1b[32m== EH Code Studio Console v1.0 (simulated) ==\x1b[0m");
      term.writeln("  Type \x1b[36mhelp\x1b[0m for commands");
      term.write("\x1b[32m$ \x1b[0m");
      term.onData((data) => {
        if (!term) return;
        if (data === "\r") { term.writeln(""); if (cmdBuffer.trim()) { cmdHistory.push(cmdBuffer); historyIdx = cmdHistory.length; } processCommand(cmdBuffer, term); cmdBuffer = ""; term.write("\x1b[32m$ \x1b[0m"); }
        else if (data === "\x7f" || data === "\b") { if (cmdBuffer.length > 0) { cmdBuffer = cmdBuffer.slice(0, -1); term.write("\b \b"); } }
        else if (data === "\x03") { cmdBuffer = ""; term.writeln("^C"); term.write("\x1b[32m$ \x1b[0m"); }
        else if (data === "\x1b[A") { if (historyIdx > 0) { historyIdx--; cmdBuffer = cmdHistory[historyIdx]; term.write("\r\x1b[K\x1b[32m$ \x1b[0m" + cmdBuffer); } }
        else if (data === "\x1b[B") { if (historyIdx < cmdHistory.length - 1) { historyIdx++; cmdBuffer = cmdHistory[historyIdx]; term.write("\r\x1b[K\x1b[32m$ \x1b[0m" + cmdBuffer); } else { historyIdx = cmdHistory.length; cmdBuffer = ""; term.write("\r\x1b[K\x1b[32m$ \x1b[0m"); } }
        else if (data >= " ") { cmdBuffer += data; term.write(data); }
      });
      const ro = new ResizeObserver(() => fit.fit());
      if (termRef.current) ro.observe(termRef.current);
    })();
    return () => { mounted = false; term?.dispose(); };
  }, [showTerminal, files, openFiles, activeFileId]);

  // Pipeline analysis on file change
  useEffect(() => {
    if (!activeFile?.isDirty) return;
    const timer = setTimeout(() => {
      const result = runStaticPipeline(activeFile.content, activeFile.language);
      setPipelineStages(result.stages);
      const passed = result.stages.filter((s) => s.status === "pass").length;
      toast(`Pipeline: ${passed}/${result.stages.length} passed`, passed === result.stages.length ? "success" : "info");
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeFile?.isDirty, activeFile?.content, toast]);

  // Ensure terminal mounts on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) setShowTerminal(true);
  }, [isMobile, isTablet]);

  // ── Handlers ──

  const handleFileSelect = useCallback((node: FileNode) => {
    if (node.type === "folder") return;
    if (!openFiles.find((f) => f.id === node.id)) {
      setOpenFiles((prev) => [...prev, { id: node.id, name: node.name, content: node.content ?? "", language: detectLanguage(node.name) }]);
    }
    setActiveFileId(node.id);
    setHasEverOpened(true);
    panels.trackFileOpen(node.id, node.name);
  }, [openFiles, panels.trackFileOpen]);

  const handleCloseTab = useCallback((id: string) => {
    const file = openFiles.find((f) => f.id === id);
    if (file?.isDirty) { if (!window.confirm("Unsaved changes will be lost. Close anyway?")) return; }
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFileId === id) setActiveFileId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  }, [activeFileId, openFiles]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeFileId || value === undefined) return;
    setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content: value, isDirty: true } : f));
    fsUpdateContent(activeFileId, value);
  }, [activeFileId]);

  const handleNewFile = useCallback(() => {
    if (!newFileName.trim()) { setShowNewFile(true); return; }
    const id = `file-${Date.now()}`;
    const newFile: FileNode = { id, name: newFileName.trim(), type: "file", content: "" };
    setFiles((prev) => {
      const findFirstFolder = (nodes: FileNode[]): string | null => { for (const n of nodes) { if (n.type === "folder") return n.id; } return null; };
      const targetId = findFirstFolder(prev.flatMap(n => n.children ?? [])) ?? findFirstFolder(prev);
      if (targetId) return addFileToTree(prev, targetId, newFile);
      return [...prev, newFile];
    });
    setNewFileName("");
    setShowNewFile(false);
    setOpenFiles((prev) => [...prev, { id, name: newFileName.trim(), content: "", language: detectLanguage(newFileName.trim()) }]);
    setActiveFileId(id);
    setHasEverOpened(true);
    toast(tcs.fileCreated, "success");
  }, [newFileName, toast, tcs]);

  const handleDelete = useCallback((id: string) => {
    const node = files.flatMap(function walk(n: FileNode): FileNode[] { return [n, ...(n.children ?? []).flatMap(walk)]; }).find(n => n.id === id);
    const name = node?.name ?? id;
    setConfirmState({
      title: L4(lang, { ko: "파일 삭제", en: "Delete File" }),
      message: L4(lang, { ko: `"${name}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`, en: `Delete "${name}"? This cannot be undone.` }),
      onConfirm: () => {
        fsDeleteNode(id);
        setOpenFiles((prev) => prev.filter((f) => f.id !== id));
        if (activeFileId === id) setActiveFileId(null);
        toast(tcs.fileDeleted, "info");
        setConfirmState(null);
      },
    });
  }, [activeFileId, toast, tcs, files, lang]);

  const handleRename = useCallback((id: string, name: string) => {
    fsRenameNode(id, name);
    setOpenFiles((prev) => prev.map((f) => f.id === id ? { ...f, name, language: detectLanguage(name) } : f));
  }, []);

  const handleApplyCode = useCallback((code: string, fileName?: string) => {
    const targetFileId = fileName 
      ? openFiles.find(f => f.name === fileName)?.id || findFileNodeByName(files, fileName)?.id
      : activeFileId;

    if (!targetFileId) {
      toast(`Cannot find file: ${fileName ?? 'active file'}`, "error");
      return;
    }

    setOpenFiles((prev) => {
      const exists = prev.some(f => f.id === targetFileId);
      if (exists) {
        return prev.map((f) => f.id === targetFileId ? { ...f, content: code, isDirty: true } : f);
      }
      const node = findFileNodeByName(files, fileName ?? "");
      if (node && node.type === "file") {
        return [...prev, { id: node.id, name: node.name, content: code, language: detectLanguage(node.name), isDirty: true }];
      }
      return prev;
    });

    fsUpdateContent(targetFileId, code);
    if (!activeFileId || (fileName && targetFileId !== activeFileId)) {
        setActiveFileId(targetFileId);
    }
    toast(`Applied code to ${fileName ?? 'active file'}`, "success");
  }, [activeFileId, fsUpdateContent, openFiles, files, toast]);

  const handleOpenDemo = useCallback(() => {
    setFiles(DEMO_FILES);
    const indexFile: FileNode = { id: "index-ts", name: "index.ts", type: "file", content: DEMO_FILES[0]?.children?.[0]?.children?.[0]?.content ?? "" };
    setOpenFiles([{ id: indexFile.id, name: indexFile.name, content: indexFile.content ?? "", language: detectLanguage(indexFile.name) }]);
    setActiveFileId(indexFile.id);
    setHasEverOpened(true);
    toast(tcs.demoLoaded, "success");
  }, [toast, tcs]);

  const handleBlankProject = useCallback(() => {
    const blankFiles: FileNode[] = [{ id: "root", name: "project", type: "folder", children: [{ id: "readme", name: "README.md", type: "file", content: "# New Project\n\nDescribe your project here.\n" }] }];
    setFiles(blankFiles);
    setOpenFiles([{ id: "readme", name: "README.md", content: "# New Project\n\nDescribe your project here.\n", language: "markdown" }]);
    setActiveFileId("readme");
    setHasEverOpened(true);
    toast(tcs.blankCreated, "success");
  }, [toast, tcs]);

  const handleResumeProject = useCallback(async () => {
    try {
      const projects = await listProjects();
      if (projects.length === 0) { handleOpenDemo(); return; }
      const lastProject = projects[0];
      const tree = await switchProject(lastProject.id);
      if (tree && tree.length > 0) {
        setFiles(tree);
        const firstFile = tree.flatMap(function findFiles(n: FileNode): FileNode[] { return n.type === "file" ? [n] : (n.children ?? []).flatMap(findFiles); })[0];
        if (firstFile) { setOpenFiles([{ id: firstFile.id, name: firstFile.name, content: firstFile.content ?? "", language: detectLanguage(firstFile.name) }]); setActiveFileId(firstFile.id); }
        setHasEverOpened(true);
        toast(L4(lang, { ko: "프로젝트 복원됨", en: "Project resumed" }), "success");
      } else { handleOpenDemo(); }
    } catch { handleOpenDemo(); }
  }, [handleOpenDemo, toast, lang]);

  const handleWelcomeNewFile = useCallback(() => { setShowNewFile(true); setHasEverOpened(true); }, []);

  // Stress test
  const handleRunStressTest = useCallback(async () => {
    if (!activeFile || isStressTesting) return;
    setIsStressTesting(true);
    try {
      const report = await runStressReport(activeFile.content, activeFile.name);
      setStressReport(report);
      toast(`Stress Test: ${report.grade} (${report.overallScore}/100)`, report.grade === "F" ? "error" : "success");
    } catch { toast("Stress test failed", "error"); }
    finally { setIsStressTesting(false); }
  }, [activeFile, isStressTesting, toast]);

  // Verification
  const handleRunVerification = useCallback(async () => {
    if (!activeFile || isVerifying) return;
    setIsVerifying(true);
    setCurrentVerifyRound(0);
    setVerificationResult(null);
    setRightPanel("progress");
    try {
      const result = await runVerificationLoop(activeFile.content, activeFile.language, activeFile.name, files, { enableStress: false }, (iteration) => {
        setCurrentVerifyRound(iteration.round);
        setVerificationScore(iteration.combinedScore);
        setPipelineStages((prev) => prev.map((s, i) => ({ ...s, status: i === 0 ? iteration.pipelineStatus : s.status })));
      });
      setVerificationResult(result);
      setVerificationScore(result.finalScore);
      if (result.totalFixesApplied > 0 && result.finalCode !== result.originalCode) {
        setStagedFiles(prev => ({ ...prev, [activeFile.name]: result.finalCode }));
        setRightPanel("review");
        toast(`Verification: ${result.finalStatus.toUpperCase()} (${result.finalScore}/100) — ${result.totalFixesApplied} fixes staged. Open Review Center to apply.`, result.finalStatus === "pass" ? "success" : "info");
      } else {
        toast(`Verification: ${result.finalStatus.toUpperCase()} (${result.finalScore}/100) — ${result.stopReason}`, result.finalStatus === "pass" ? "success" : result.finalStatus === "warn" ? "info" : "error");
      }
    } catch { toast(tcs.verificationFailed, "error"); }
    finally { setIsVerifying(false); }
  }, [activeFile, isVerifying, files, toast, tcs]);

  // Staging flow
  const handleApproveFile = useCallback((fileName: string) => {
    const code = stagedFiles[fileName];
    if (!code) return;
    const fileNode = openFiles.find(f => f.name === fileName) || files.flatMap(function walk(n: import("@/lib/code-studio/core/types").FileNode): import("@/lib/code-studio/core/types").FileNode[] { return [n, ...(n.children ?? []).flatMap(walk)]; }).find(n => n.name === fileName);
    const targetFileId = fileNode?.id;
    if (targetFileId) {
      setPreApplySnapshot(prev => ({ ...prev, [fileName]: fileNode.content ?? "" }));
      fsUpdateContent(targetFileId, code);
      setOpenFiles((prev) => prev.map((f) => f.id === targetFileId ? { ...f, content: code, isDirty: true } : f));
    }
    setStagedFiles(prev => { const next = { ...prev }; delete next[fileName]; return next; });
    toast(`Approved fixes for ${fileName}`, "success");
  }, [stagedFiles, openFiles, files, fsUpdateContent, toast]);

  const handleRejectFile = useCallback((fileName: string) => {
    setStagedFiles(prev => { const next = { ...prev }; delete next[fileName]; return next; });
    toast(`Rejected fixes for ${fileName}`, "info");
  }, [toast]);

  const handleRollback = useCallback((fileName: string) => {
    const snapshot = preApplySnapshot[fileName];
    if (!snapshot) return;
    const fileNode = openFiles.find(f => f.name === fileName) || files.flatMap(function walk(n: import("@/lib/code-studio/core/types").FileNode): import("@/lib/code-studio/core/types").FileNode[] { return [n, ...(n.children ?? []).flatMap(walk)]; }).find(n => n.name === fileName);
    const targetFileId = fileNode?.id;
    if (targetFileId) {
      fsUpdateContent(targetFileId, snapshot);
      setOpenFiles((prev) => prev.map((f) => f.id === targetFileId ? { ...f, content: snapshot, isDirty: true } : f));
      setPreApplySnapshot(prev => { const next = { ...prev }; delete next[fileName]; return next; });
      toast(`Rolled back ${fileName} to pre-verification state`, "info");
    }
  }, [preApplySnapshot, openFiles, files, fsUpdateContent, toast]);

  // Editor navigate-to-line callback (for outline/symbol navigation)
  const editorNavigateToLine = useCallback((line: number) => {
    editorNavigateRef.current(line);
  }, []);

  // ── Shared UI fragments for mobile/tablet ──
  const explorerPanel = (
    <div className="flex h-full flex-col bg-bg-secondary">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Link href="/" className="rounded p-1 text-text-tertiary hover:bg-white/8 hover:text-accent-amber transition-colors" title="Home"><Home className="h-3.5 w-3.5" /></Link>
        <Files className="h-4 w-4 text-accent-green" />
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Explorer</span>
        <button onClick={() => setShowNewFile(!showNewFile)} className="ml-auto rounded p-1 text-text-tertiary hover:bg-white/8 hover:text-text-primary" title="New File"><Plus className="h-3.5 w-3.5" /></button>
      </div>
      {showNewFile && (
        <div className="px-2 py-1 border-b border-white/8">
          <input value={newFileName} onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleNewFile(); if (e.key === "Escape") { setShowNewFile(false); setNewFileName(""); } }}
            placeholder="filename.ts"
            className="w-full rounded border border-accent-green/30 bg-black/30 px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none focus:border-accent-green"
            autoFocus
          />
        </div>
      )}
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((node) => (<FileTreeItem key={node.id} node={node} depth={0} activeFileId={activeFileId} onSelect={handleFileSelect} onDelete={handleDelete} onRename={handleRename} />))}
      </div>
    </div>
  );

  // Mobile editor panel (simplified)
  const mobileEditorPanel = (
    <div className="flex h-full flex-col">
      <PI.EditorTabsComponent openFiles={openFiles} activeFileId={activeFileId} onSelectFile={(id) => setActiveFileId(id)} onCloseFile={(id) => { setOpenFiles((prev) => prev.filter((f) => f.id !== id)); if (activeFileId === id) setActiveFileId(null); }} />
      {activeFile && <BreadcrumbComponent path={["project", "src", activeFile.name]} isModified={activeFile.isDirty} />}
      <div className="flex-1 min-h-0">
        {activeFile ? (
          <MonacoEditor height="100%" language={activeFile.language} value={activeFile.content} onChange={handleEditorChange} theme="vs-dark"
            options={{ fontSize: isMobile ? 13 : settings.fontSize, tabSize: settings.tabSize, wordWrap: isMobile ? "on" as const : settings.wordWrap, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 8 }, fontFamily: "var(--font-mono), 'JetBrains Mono', monospace", lineNumbers: isMobile ? "off" as const : "on" as const, renderLineHighlight: "line" as const, bracketPairColorization: { enabled: true }, smoothScrolling: true, cursorBlinking: "smooth" as const, cursorSmoothCaretAnimation: "on" as const }}
            onMount={(editor, monaco) => {
              import("@/lib/code-studio/editor/monaco-setup").then(({ setupMonaco }) => setupMonaco(monaco, editor, { theme: "dark" }));
              import("@/lib/code-studio/editor/editor-features").then(({ registerEditorFeatures }) => registerEditorFeatures(monaco, editor));
              import("@/lib/code-studio/ai/ghost").then(({ registerGhostTextProvider }) => registerGhostTextProvider(monaco));
            }}
          />
        ) : !loaded ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent-green/40" /></div>
        ) : !hasEverOpened ? (
          <WelcomeScreen onNewFile={handleWelcomeNewFile} onOpenDemo={handleOpenDemo} onBlankProject={handleBlankProject} onResumeProject={handleResumeProject} />
        ) : (
          <div className="flex h-full items-center justify-center"><div className="text-center"><div className="mb-4 inline-block rounded-full border border-accent-green/20 bg-accent-green/8 p-4"><Files className="h-8 w-8 text-accent-green" /></div><p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-text-tertiary">{tcs.selectFile}</p></div></div>
        )}
      </div>
    </div>
  );

  const chatPanel = (
    <PI.ChatPanelComponent activeFileContent={activeFile?.content} activeFileName={activeFile?.name} activeFileLanguage={activeFile?.language} allFileNames={openFiles.map(f => f.name)} onApplyCode={handleApplyCode} />
  );

  const terminalPanel = (<div className="h-full bg-[#0d0d0d]"><div ref={termRef} className="h-full" /></div>);

  const pipelinePanelMobile = (() => {
    const pipelineResult = pipelineStages.length > 0 ? { stages: pipelineStages.map((s) => ({ stage: s.name, status: s.status, score: s.score ?? 0, findings: s.message ? [{ severity: s.status === "fail" ? "critical" as const : "minor" as const, message: s.message, rule: s.name }] : [] })), overallScore: pipelineScore ?? 0, overallStatus: ((pipelineScore ?? 0) >= 80 ? "pass" : (pipelineScore ?? 0) >= 60 ? "warn" : "fail") as "pass" | "warn" | "fail", timestamp: Date.now() } : null;
    return <PI.PipelinePanelComponent result={pipelineResult} />;
  })();

  const statusBarEl = (
    <PI.StatusBarComponent activeFile={activeFile} pipelineScore={pipelineScore} cursorLine={cursorPos.line} cursorColumn={cursorPos.col} fontSize={settings.fontSize} isDirty={openFiles.some((f) => f.isDirty)} verificationScore={pipelineScore} isGenerating={composer.mode === "generating"} lang={lang} />
  );

  // ── Panel Manager Props (shared for desktop) ──
  const panelManagerProps = {
    rightPanel, onSetRightPanel: setRightPanel as (p: RightPanel | null) => void,
    showAdvancedPanels, onToggleAdvancedPanels: () => setShowAdvancedPanels(v => !v),
    showSettings, onToggleSettings: () => setShowSettings(s => !s),
    showTerminal, showProblems, showPipelineBottom,
    onToggleTerminal: () => setShowTerminal(v => !v), onToggleProblems: () => setShowProblems(v => !v),
    onTogglePipelineBottom: () => setShowPipelineBottom(v => !v),
    onCloseAllBottom: () => { setShowTerminal(false); setShowProblems(false); setShowPipelineBottom(false); },
    termRef,
    files, openFiles, activeFile, activeFileId, bugReports, pipelineStages, pipelineScore,
    stressReport, isStressTesting, verificationResult, isVerifying, verificationScore, currentVerifyRound,
    composerMode: composer.mode, onComposerTransition: composer.transitionMode,
    panels,
    onFileSelect: handleFileSelect, onApplyCode: handleApplyCode,
    onSetDiffState: setDiffState, fsUpdateContent, onSetOpenFiles: setOpenFiles, onSetFiles: setFiles,
    handleRunStressTest, handleRunVerification, editorNavigateToLine,
    onApproveFile: handleApproveFile, onRejectFile: handleRejectFile, stagedFiles,
    toast, lang, tcs,
  } as const;

  // ── Mobile Layout ──
  if (isMobile) {
    return (
      <TouchGesturesComponent className="h-full w-full"
        onSwipeLeft={() => setRightPanel(rightPanel ? null : "chat")}
        onSwipeRight={() => setRightPanel(null)}
        onPinchZoom={(scale) => { if (scale > 1.1) setSettings((s) => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) })); else if (scale < 0.9) setSettings((s) => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) })); }}
      >
        <PI.MobileLayoutComponent explorer={explorerPanel} editor={mobileEditorPanel} chat={chatPanel} terminal={terminalPanel} pipeline={pipelinePanelMobile} statusBar={statusBarEl} />
      </TouchGesturesComponent>
    );
  }

  // ── Tablet Layout ──
  if (isTablet) {
    return <PI.TabletLayoutComponent sidebar={explorerPanel} editor={mobileEditorPanel} rightPanel={chatPanel} terminal={terminalPanel} statusBar={statusBarEl} />;
  }

  // ── Desktop Layout ──
  return (
    <div className="flex h-full w-full flex-col bg-bg-primary text-text-primary">
      <a href="#main-editor" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-accent-purple focus:text-white focus:px-3 focus:py-1 focus:rounded">Skip to Editor</a>
      <div className="flex flex-1 min-h-0">
        {/* Activity Bar */}
        <ActivityBar
          rightPanel={rightPanel} onSetRightPanel={setRightPanel as (p: RightPanel | null) => void}
          bugReports={bugReports} showAdvancedPanels={showAdvancedPanels}
          onToggleAdvancedPanels={() => setShowAdvancedPanels(v => !v)}
          showSettings={showSettings} onToggleSettings={() => setShowSettings(s => !s)} lang={lang}
        />

        {/* File Explorer Sidebar */}
        <div className="flex shrink-0 flex-col border-r border-white/8 bg-bg-secondary" style={{ width: sidebarWidth }}>
          {explorerPanel}
        </div>

        {/* Sidebar Resize Handle */}
        <div
          className="w-1 cursor-col-resize hover:bg-accent-purple/30 active:bg-accent-purple/50 transition-colors shrink-0"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            const onMove = (ev: MouseEvent) => { setSidebarWidth(Math.max(150, Math.min(500, startWidth + ev.clientX - startX))); };
            const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          }}
        />

        {/* Center — Editor (extracted component) */}
        <CodeStudioEditor
          files={files} openFiles={openFiles} activeFile={activeFile} activeFileId={activeFileId}
          settings={settings} loaded={loaded} hasEverOpened={hasEverOpened} isMobile={false}
          useEditorGroup={useEditorGroup} onToggleEditorGroup={() => setUseEditorGroup(v => !v)}
          showSettings={showSettings} onToggleSettings={() => setShowSettings(s => !s)}
          showMultiKey={showMultiKey} onCloseMultiKey={() => setShowMultiKey(false)}
          onCursorChange={(line, col) => setCursorPos({ line, col })}
          diffState={diffState} onDiffAccept={(content) => { handleApplyCode(content); setDiffState(null); }} onDiffReject={() => setDiffState(null)}
          onFileSelect={handleFileSelect} onCloseTab={handleCloseTab} onEditorChange={handleEditorChange}
          onApplyCode={handleApplyCode} onSetActiveFileId={setActiveFileId} onOpenFiles={setOpenFiles}
          onWelcomeNewFile={handleWelcomeNewFile} onOpenDemo={handleOpenDemo} onBlankProject={handleBlankProject} onResumeProject={handleResumeProject}
          onShowCommandPalette={() => setShowCommandPalette(true)}
          rightPanel={rightPanel} showTerminal={showTerminal}
          onToggleChat={() => setRightPanel(rightPanel === "chat" ? null : "chat")}
          onToggleTerminal={() => setShowTerminal(v => !v)}
          onTogglePipeline={() => setRightPanel(rightPanel === "pipeline" ? null : "pipeline")}
          onToggleAgent={() => setRightPanel(rightPanel === "agents" ? null : "agents")}
          onToggleSearch={() => setRightPanel(rightPanel === "search" ? null : "search")}
          onNewFile={() => setShowNewFile(true)}
          onToggleProblems={() => setRightPanel(rightPanel === "bugs" ? null : "bugs")}
          onRunBugFinder={() => setRightPanel(rightPanel === "bugs" ? null : "bugs")}
          onDeploy={() => setRightPanel(rightPanel === "deploy" ? null : "deploy")}
          onToggleSplit={() => setUseEditorGroup(v => !v)}
          onUndo={fsCanUndo ? fsUndo : undefined} onRedo={fsCanRedo ? fsRedo : undefined}
          onZoomIn={() => setSettings(s => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) }))}
          onZoomOut={() => setSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) }))}
          onZoomReset={() => setSettings(s => ({ ...s, fontSize: 14 }))}
          onSaveToast={() => toast(tcs.savedLocally, "success")}
          onSettingsSaved={() => toast("Settings saved", "success")}
          fsUpdateContent={fsUpdateContent}
          tcs={tcs}
        >
          {/* Right Panel (extracted component) with resize handle */}
          {rightPanel && (
            <>
              {/* Right Panel Resize Handle */}
              <div
                className="w-1 cursor-col-resize hover:bg-accent-purple/30 active:bg-accent-purple/50 transition-colors shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = rightPanelWidth;
                  const onMove = (ev: MouseEvent) => { setRightPanelWidth(Math.max(250, Math.min(700, startWidth - (ev.clientX - startX)))); };
                  const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
                  document.addEventListener("mousemove", onMove);
                  document.addEventListener("mouseup", onUp);
                  document.body.style.cursor = "col-resize";
                  document.body.style.userSelect = "none";
                }}
              />
              <div className="shrink-0 flex flex-col border-l border-white/8 bg-bg-secondary overflow-hidden" style={{ width: rightPanelWidth }}>
                <RightPanelContent {...panelManagerProps as Parameters<typeof RightPanelContent>[0]} />
              </div>
            </>
          )}
        </CodeStudioEditor>

        {/* Rollback Banner */}
        {Object.keys(preApplySnapshot).length > 0 && Object.keys(stagedFiles).length === 0 && (
          <div className="border-t border-accent-purple/30 bg-accent-purple/5 px-4 py-2 flex items-center justify-between animate-[fadeSlideDown_0.2s_ease-out]">
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-accent-purple">Verification fixes applied — Rollback available</span>
            <button onClick={() => { Object.keys(preApplySnapshot).forEach(f => handleRollback(f)); }} className="rounded border border-accent-purple/30 bg-accent-purple/10 px-3 py-1 text-[11px] text-accent-purple hover:bg-accent-purple/20">Rollback All</button>
          </div>
        )}

        {/* Bottom Panels (extracted component) */}
        <BottomPanels
          showTerminal={showTerminal} showProblems={showProblems} showPipelineBottom={showPipelineBottom}
          onToggleTerminal={() => setShowTerminal(v => !v)} onToggleProblems={() => setShowProblems(v => !v)}
          onTogglePipelineBottom={() => setShowPipelineBottom(v => !v)}
          onCloseAllBottom={() => { setShowTerminal(false); setShowProblems(false); setShowPipelineBottom(false); }}
          termRef={termRef} bugReports={bugReports} pipelineStages={pipelineStages} tcs={tcs}
        />

        {/* Quick Open */}
        {showQuickOpen && (
          <PI.QuickOpenComponent files={files} onOpen={(node) => { handleFileSelect(node); setShowQuickOpen(false); }} onClose={() => setShowQuickOpen(false)} />
        )}

        {/* Command Palette */}
        {showCommandPalette && (
          <CommandPalette
            open={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onExecute={(cmdId) => {
              setShowCommandPalette(false);
              if (cmdId === "new-file") { setShowNewFile(true); return; }
              if (cmdId === "toggle-terminal") { setShowTerminal((v) => !v); return; }
              if (cmdId === "quick-open") { setShowQuickOpen(true); return; }
              if (cmdId === "toggle-settings") { setShowSettings((v) => !v); return; }
              if (cmdId === "run-stress-test") { handleRunStressTest(); return; }
              if (cmdId === "run-verification") { handleRunVerification(); return; }
              const panelId = cmdId.replace("toggle-", "");
              if (PANEL_REGISTRY.some((p) => p.id === panelId)) { setRightPanel((v) => v === panelId ? null : panelId as RightPanel); }
            }}
            commands={[
              { id: "new-file", label: L4(lang, { ko: "새 파일", en: "New File" }), shortcut: "Ctrl+N", category: "File" },
              { id: "toggle-terminal", label: L4(lang, { ko: "콘솔 토글", en: "Toggle Console" }), shortcut: "Ctrl+`", category: "View" },
              ...Object.entries(
                PANEL_REGISTRY.reduce<Record<string, readonly PanelDef[]>>((acc, p) => { const g = p.group; return { ...acc, [g]: [...(acc[g] ?? []), p] }; }, {})
              ).flatMap(([group, panels]) =>
                panels.map((p) => ({ id: `toggle-${p.id}`, label: `${getPanelLabel(p, lang)}${p.status === 'stub' ? ' (Preview)' : p.status === 'beta' ? ' (Beta)' : ''}`, shortcut: p.shortcut, category: getGroupLabel(group as PanelGroup, lang) }))
              ),
              { id: "quick-open", label: L4(lang, { ko: "빠른 파일 열기", en: "Quick Open File" }), shortcut: "Ctrl+P", category: "File" },
              { id: "toggle-settings", label: L4(lang, { ko: "인라인 설정 토글", en: "Toggle Inline Settings" }), category: "View" },
              { id: "run-stress-test", label: L4(lang, { ko: "스트레스 테스트 실행", en: "Run Stress Test (AI-Predicted)" }), category: "Tools" },
              { id: "run-verification", label: L4(lang, { ko: "통합 검증 실행", en: "Run Full Verification (Pipeline + Bugs + Stress)" }), category: "Tools" },
            ]}
          />
        )}
      </div>

      {/* Status Bar */}
      {statusBarEl}

      {/* Dialogs */}
      {confirmState && (
        <ConfirmDialog title={confirmState.title} message={confirmState.message} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />
      )}
      <ShortcutOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ErrorOverlay error={buildError} onDismiss={() => setBuildError(null)} />
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=Orchestrator | inputs=none | outputs=IDE-layout

// ============================================================
// PART 4 — Export Wrapper (ToastProvider)
// ============================================================

export default function CodeStudioShell() {
  return (
    <ErrorBoundary variant="panel" fallbackMessage="Code Studio encountered an error">
      <ToastProvider>
        <CodeStudioShellInner />
      </ToastProvider>
    </ErrorBoundary>
  );
}

// IDENTITY_SEAL: PART-4 | role=ExportWrapper | inputs=none | outputs=ToastProvider+Shell
