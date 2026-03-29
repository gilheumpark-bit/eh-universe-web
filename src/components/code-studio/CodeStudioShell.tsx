"use client";

// ============================================================
// PART 1 — Imports & State
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Files, Plus, X, Play, Settings, ChevronRight,
  FileText, FolderOpen, Folder, Terminal as TermIcon,
  MessageSquare, Shield, Activity, Trash2, Edit3,
  AlertTriangle, Loader2,
  Search, GitBranch, Upload, Bug, Command, Home, Columns2,
  Eye, List, Layout, Package, BarChart3, Users, Wand2,
  type LucideIcon,
} from "lucide-react";
import type { FileNode, OpenFile, CodeStudioSettings } from "@/lib/code-studio-types";
import { DEFAULT_SETTINGS, detectLanguage, fileIconColor } from "@/lib/code-studio-types";
import { getApiKey, setApiKey, getActiveProvider, setActiveProvider } from "@/lib/ai-providers";
import { saveSettings, loadSettings } from "@/lib/code-studio-store";
import { registerGhostTextProvider, cancelGhostText } from "@/lib/code-studio-ghost";
import { runStaticPipeline } from "@/lib/code-studio-pipeline";
import { searchCode, replaceAll as searchReplaceAll, type SearchResult } from "@/lib/code-studio-search";
import { findBugsStatic, findBugs, type BugReport } from "@/lib/code-studio-bugfinder";
import { runAutopilot, type AutopilotPlan } from "@/lib/code-studio-autopilot";
import { runStressReport, type StressReport } from "@/lib/code-studio-stress-test";
import { runVerificationLoop, type VerificationResult } from "@/lib/code-studio-verification-loop";
import { runAgentPipeline, createAgentSession, type AgentMessage, type AgentSession } from "@/lib/code-studio-agents";
import { registerEditorFeatures } from "@/lib/code-studio-editor-features";
import { setupMonaco } from "@/lib/code-studio-monaco-setup";
import { parseErrors, type ParsedError } from "@/lib/code-studio-error-parser";
import { registerCrossFileProviders } from "@/lib/code-studio-cross-file";
import { isMultiKeyActive } from "@/lib/multi-key-bridge";

const MultiKeyPanel = dynamic(() => import("@/components/studio/MultiKeyPanel"), { ssr: false });

import { ToastProvider, useToast } from "@/components/code-studio/ToastSystem";
import WelcomeScreen from "@/components/code-studio/WelcomeScreen";
import { useIsMobile } from "@/components/code-studio/MobileLayout";
import { useCodeStudioFileSystem } from "@/hooks/useCodeStudioFileSystem";

// Panel Registry + Barrel imports (replaces 25+ individual dynamic imports)
import { PANEL_REGISTRY, type RightPanel } from "@/lib/code-studio-panel-registry";
import * as PI from "@/components/code-studio/PanelImports";

// Non-panel dynamic imports (used directly, not right panels)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/code-studio/CommandPalette"), { ssr: false });
const DiffViewer = dynamic(() => import("@/components/code-studio/DiffViewer"), { ssr: false });
const BreadcrumbComponent = dynamic(
  () => import("@/components/code-studio/Breadcrumb").then((m) => ({ default: m.Breadcrumb })),
  { ssr: false },
);
const ToolbarComponent = dynamic(
  () => import("@/components/code-studio/Toolbar").then((m) => ({ default: m.Toolbar })),
  { ssr: false },
);
const TouchGesturesComponent = dynamic(
  () => import("@/components/code-studio/TouchGestures").then((m) => ({ default: m.TouchGestures })),
  { ssr: false },
);

// Modal/dialog + ErrorBoundary imports
import { ErrorBoundary } from "@/components/code-studio/ErrorBoundary";
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

/** Map registry icon names → lucide-react components for the activity bar */
const LUCIDE_MAP: Record<string, LucideIcon> = {
  MessageSquare, Activity, GitBranch, Upload, Bug, Search, Play,
  Shield, Edit3, AlertTriangle, Eye, List, Layout, Settings,
  Package, BarChart3, Users, Wand2,
};
const PanelIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = LUCIDE_MAP[name];
  return Icon ? <Icon className={className} /> : null;
};

// IDENTITY_SEAL: PART-1 | role=ImportsState | inputs=none | outputs=imports,dynamic-components

// ============================================================
// PART 2 — Demo Files & Types
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

interface PipelineStage {
  name: string;
  status: "pass" | "warn" | "fail" | "running" | "pending";
  score?: number;
  message?: string;
}

// IDENTITY_SEAL: PART-2 | role=DemoFiles+Types | inputs=none | outputs=DEMO_FILES,PipelineStage

// ============================================================
// PART 3 — File Tree Component
// ============================================================

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
            <button onClick={() => onDelete(node.id)} className="rounded p-0.5 hover:bg-white/10 text-accent-red"><Trash2 className="h-2.5 w-2.5" /></button>
          </div>
        )}
      </div>
      {isFolder && open && node.children?.map((child) => (
        <FileTreeItem key={child.id} node={child} depth={depth + 1} activeFileId={activeFileId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} />
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=FileTree | inputs=node,depth | outputs=UI+CRUD

// PART 4 — removed (AIChatPanel migrated to external ChatPanel component)

// ============================================================
// PART 5 — File Tree Helpers (addFileToTree only — rest handled by useCodeStudioFileSystem)
// ============================================================

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

/** Search the file tree by file name (basename match). Used for cross-file navigation. */
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

// IDENTITY_SEAL: PART-5 | role=TreeHelper(addFileToTree,findFileNodeByName) | inputs=tree,parentId,newFile | outputs=FileNode[]

// ============================================================
// PART 6 — Main Shell
// ============================================================

// RightPanel type imported from @/lib/code-studio-panel-registry

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
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { tree: files, setTree: setFiles, createFile: fsCreateFile, deleteNode: fsDeleteNode, renameNode: fsRenameNode, updateContent: fsUpdateContent, undo: fsUndo, redo: fsRedo, canUndo: fsCanUndo, canRedo: fsCanRedo, persist: fsPersist, load: fsLoad } = useCodeStudioFileSystem(DEMO_FILES);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("chat");
  const [settings, setSettings] = useState<CodeStudioSettings>(DEFAULT_SETTINGS);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [diffState, setDiffState] = useState<{ original: string; modified: string; fileName: string } | null>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [hasEverOpened, setHasEverOpened] = useState(false);
  const [showMultiKey, setShowMultiKey] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [buildError, setBuildError] = useState<{ message: string; stack?: string; file?: string; line?: number } | null>(null);
  const [splitFileId, setSplitFileId] = useState<string | null>(null);
  const [dragTabIdx, setDragTabIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const editorRef = useRef<unknown>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const crossFileDisposableRef = useRef<{ dispose(): void } | null>(null);
  const [parsedErrors, setParsedErrors] = useState<ParsedError[]>([]);
  const [stressReport, setStressReport] = useState<StressReport | null>(null);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [currentVerifyRound, setCurrentVerifyRound] = useState(0);
  const [stagedCode, setStagedCode] = useState<string | null>(null);
  const [preApplySnapshot, setPreApplySnapshot] = useState<string | null>(null);

  const activeFile = openFiles.find((f) => f.id === activeFileId) ?? null;
  const splitFile = splitFileId ? (openFiles.find((f) => f.id === splitFileId) ?? null) : null;

  // Split editor change handler
  const handleSplitEditorChange = useCallback((value: string | undefined) => {
    if (!splitFileId || value === undefined) return;
    setOpenFiles((prev) => prev.map((f) => f.id === splitFileId ? { ...f, content: value, isDirty: true } : f));
    fsUpdateContent(splitFileId, value);
  }, [splitFileId]);

  // Tab reorder handler
  const handleTabDrop = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setOpenFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  // Stress test handler
  const handleRunStressTest = useCallback(async () => {
    if (!activeFile || isStressTesting) return;
    setIsStressTesting(true);
    try {
      const report = await runStressReport(activeFile.content, activeFile.name);
      setStressReport(report);
      toast(`Stress Test: ${report.grade} (${report.overallScore}/100)`, report.grade === "F" ? "error" : "success");
    } catch {
      toast("Stress test failed", "error");
    } finally {
      setIsStressTesting(false);
    }
  }, [activeFile, isStressTesting, toast]);

  // Full Verification — Verification Loop Engine (Pipeline → Auto-fix → Re-verify)
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationScore, setVerificationScore] = useState<number | null>(null);
  const handleRunVerification = useCallback(async () => {
    if (!activeFile || isVerifying) return;
    setIsVerifying(true);
    setCurrentVerifyRound(0);
    setVerificationResult(null);
    setRightPanel("progress");

    try {
      const result = await runVerificationLoop(
        activeFile.content,
        activeFile.language,
        activeFile.name,
        files,
        { enableStress: false },
        (iteration) => {
          setCurrentVerifyRound(iteration.round);
          setVerificationScore(iteration.combinedScore);
          // Sync pipeline stages from iteration data
          setPipelineStages((prev) => prev.map((s, i) => ({
            ...s,
            status: i === 0 ? iteration.pipelineStatus : s.status,
          })));
        },
      );

      setVerificationResult(result);
      setVerificationScore(result.finalScore);

      // If fixes were applied, stage the result instead of auto-applying
      if (result.totalFixesApplied > 0 && result.finalCode !== result.originalCode) {
        setStagedCode(result.finalCode);
        toast(
          `Verification: ${result.finalStatus.toUpperCase()} (${result.finalScore}/100) — ${result.totalFixesApplied} fixes staged`,
          result.finalStatus === "pass" ? "success" : "info",
        );
      } else {
        toast(
          `Verification: ${result.finalStatus.toUpperCase()} (${result.finalScore}/100) — ${result.stopReason}`,
          result.finalStatus === "pass" ? "success" : result.finalStatus === "warn" ? "info" : "error",
        );
      }
    } catch {
      toast("Verification failed", "error");
    } finally {
      setIsVerifying(false);
    }
  }, [activeFile, isVerifying, files, toast]);

  // Staging flow — accept/reject staged code, rollback
  const handleApplyStagedCode = useCallback(() => {
    if (!stagedCode || !activeFileId) return;
    setPreApplySnapshot(activeFile?.content ?? null);
    fsUpdateContent(activeFileId, stagedCode);
    setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content: stagedCode, isDirty: true } : f));
    toast("Staged fixes applied", "success");
    setStagedCode(null);
  }, [stagedCode, activeFileId, activeFile, fsUpdateContent, toast]);

  const handleRejectStaged = useCallback(() => {
    setStagedCode(null);
    toast("Staged fixes rejected", "info");
  }, [toast]);

  const handleRollback = useCallback(() => {
    if (!preApplySnapshot || !activeFileId) return;
    fsUpdateContent(activeFileId, preApplySnapshot);
    setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content: preApplySnapshot, isDirty: true } : f));
    setPreApplySnapshot(null);
    toast("Rolled back to pre-verification state", "info");
  }, [preApplySnapshot, activeFileId, fsUpdateContent, toast]);

  // IndexedDB load (once)
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
          toast("Saved locally in this browser", "success");
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

  // xterm terminal
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
            for (const n of nodes) {
              if (n.name === name && n.type === "file") return n;
              if (n.children) { const found = findFile(n.children, name); if (found) return found; }
            }
            return null;
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
              const line = `  ${icon} ${s.name}: ${s.score}/100 -- ${s.message}`;
              t.writeln(line);
              outputLines.push(s.message);
            });
            t.writeln(`  \x1b[36mOverall: ${result.overallScore}/100 (${result.overallStatus})\x1b[0m`);
            // Parse any structured errors from pipeline output
            const errors = parseErrors(outputLines.join("\n"));
            if (errors.length > 0) {
              setParsedErrors(errors);
              setBuildError({ message: `${errors.length} error(s) found`, file: errors[0].file, line: errors[0].line });
            } else {
              setParsedErrors([]);
            }
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
        fontSize: 13, fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
        cursorBlink: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termRef.current);
      fit.fit();
      term.writeln("\x1b[32m== EH Code Studio Terminal v1.0 ==\x1b[0m");
      term.writeln("  Type \x1b[36mhelp\x1b[0m for commands");
      term.write("\x1b[32m$ \x1b[0m");

      term.onData((data) => {
        if (!term) return;
        if (data === "\r") {
          term.writeln("");
          if (cmdBuffer.trim()) { cmdHistory.push(cmdBuffer); historyIdx = cmdHistory.length; }
          processCommand(cmdBuffer, term);
          cmdBuffer = "";
          term.write("\x1b[32m$ \x1b[0m");
        } else if (data === "\x7f" || data === "\b") {
          if (cmdBuffer.length > 0) { cmdBuffer = cmdBuffer.slice(0, -1); term.write("\b \b"); }
        } else if (data === "\x03") {
          cmdBuffer = ""; term.writeln("^C"); term.write("\x1b[32m$ \x1b[0m");
        } else if (data === "\x1b[A") {
          if (historyIdx > 0) { historyIdx--; cmdBuffer = cmdHistory[historyIdx]; term.write("\r\x1b[K\x1b[32m$ \x1b[0m" + cmdBuffer); }
        } else if (data === "\x1b[B") {
          if (historyIdx < cmdHistory.length - 1) { historyIdx++; cmdBuffer = cmdHistory[historyIdx]; term.write("\r\x1b[K\x1b[32m$ \x1b[0m" + cmdBuffer); }
          else { historyIdx = cmdHistory.length; cmdBuffer = ""; term.write("\r\x1b[K\x1b[32m$ \x1b[0m"); }
        } else if (data >= " ") { cmdBuffer += data; term.write(data); }
      });

      const ro = new ResizeObserver(() => fit.fit());
      if (termRef.current) ro.observe(termRef.current);
    })();
    return () => { mounted = false; term?.dispose(); };
  }, [showTerminal, files, openFiles, activeFileId]);

  // File select
  const handleFileSelect = useCallback((node: FileNode) => {
    if (node.type === "folder") return;
    if (!openFiles.find((f) => f.id === node.id)) {
      setOpenFiles((prev) => [...prev, { id: node.id, name: node.name, content: node.content ?? "", language: detectLanguage(node.name) }]);
    }
    setActiveFileId(node.id);
    setHasEverOpened(true);
  }, [openFiles]);

  // Close tab
  const handleCloseTab = useCallback((id: string) => {
    const file = openFiles.find((f) => f.id === id);
    if (file?.isDirty) {
      if (!window.confirm("Unsaved changes will be lost. Close anyway?")) return;
    }
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFileId === id) setActiveFileId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  }, [activeFileId, openFiles]);

  // Editor change
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeFileId || value === undefined) return;
    setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content: value, isDirty: true } : f));
    fsUpdateContent(activeFileId, value);
  }, [activeFileId]);

  // File CRUD
  const handleNewFile = useCallback(() => {
    if (!newFileName.trim()) { setShowNewFile(true); return; }
    const id = `file-${Date.now()}`;
    const newFile: FileNode = { id, name: newFileName.trim(), type: "file", content: "" };
    setFiles((prev) => {
      const findFirstFolder = (nodes: FileNode[]): string | null => {
        for (const n of nodes) { if (n.type === "folder") return n.id; }
        return null;
      };
      const targetId = findFirstFolder(prev.flatMap(n => n.children ?? [])) ?? findFirstFolder(prev);
      if (targetId) return addFileToTree(prev, targetId, newFile);
      return [...prev, newFile];
    });
    setNewFileName("");
    setShowNewFile(false);
    setOpenFiles((prev) => [...prev, { id, name: newFileName.trim(), content: "", language: detectLanguage(newFileName.trim()) }]);
    setActiveFileId(id);
    setHasEverOpened(true);
    toast("File created", "success");
  }, [newFileName, toast]);

  const handleDelete = useCallback((id: string) => {
    fsDeleteNode(id);
    setOpenFiles((prev) => prev.filter((f) => f.id !== id));
    if (activeFileId === id) setActiveFileId(null);
    toast("File deleted", "info");
  }, [activeFileId, toast]);

  const handleRename = useCallback((id: string, name: string) => {
    fsRenameNode(id, name);
    setOpenFiles((prev) => prev.map((f) => f.id === id ? { ...f, name, language: detectLanguage(name) } : f));
  }, []);

  const handleOpenDemo = useCallback(() => {
    setFiles(DEMO_FILES);
    const indexFile: FileNode = { id: "index-ts", name: "index.ts", type: "file", content: DEMO_FILES[0]?.children?.[0]?.children?.[0]?.content ?? "" };
    setOpenFiles([{ id: indexFile.id, name: indexFile.name, content: indexFile.content ?? "", language: detectLanguage(indexFile.name) }]);
    setActiveFileId(indexFile.id);
    setHasEverOpened(true);
    toast("Demo project loaded", "success");
  }, [toast]);

  const handleBlankProject = useCallback(() => {
    const blankFiles: FileNode[] = [
      { id: "root", name: "project", type: "folder", children: [
        { id: "readme", name: "README.md", type: "file", content: "# New Project\n\nDescribe your project here.\n" },
      ]},
    ];
    setFiles(blankFiles);
    setOpenFiles([{ id: "readme", name: "README.md", content: "# New Project\n\nDescribe your project here.\n", language: "markdown" }]);
    setActiveFileId("readme");
    setHasEverOpened(true);
    toast("Blank project created", "success");
  }, [toast]);

  const handleWelcomeNewFile = useCallback(() => {
    setShowNewFile(true);
    setHasEverOpened(true);
  }, []);

  const handleApplyCode = useCallback((code: string) => {
    if (!activeFileId) return;
    setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content: code, isDirty: true } : f));
    fsUpdateContent(activeFileId, code);
  }, [activeFileId, fsUpdateContent]);

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

  // Compute pipeline score for StatusBar
  const pipelineScore = pipelineStages.length > 0
    ? Math.round(pipelineStages.reduce((sum, s) => sum + (s.score ?? 0), 0) / pipelineStages.length)
    : null;

  // Convert BugReport[] to ProblemFinding[] for ProblemsPanel
  const problemFindings = bugReports.map((b) => ({
    severity: (b.severity === "critical" ? "critical" : b.severity === "high" ? "major" : b.severity === "medium" ? "minor" : "info") as "critical" | "major" | "minor" | "info",
    message: b.description,
    line: b.line,
    team: b.category,
  }));

  // ── Shared UI fragments for mobile/tablet layouts ──
  const explorerPanel = (
    <div className="flex h-full flex-col bg-bg-secondary">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Link href="/" className="rounded p-1 text-text-tertiary hover:bg-white/8 hover:text-accent-amber transition-colors" title="Home">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <Files className="h-4 w-4 text-accent-green" />
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Explorer</span>
        <button onClick={() => setShowNewFile(!showNewFile)} className="ml-auto rounded p-1 text-text-tertiary hover:bg-white/8 hover:text-text-primary" title="New File">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {showNewFile && (
        <div className="px-2 py-1 border-b border-white/8">
          <input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleNewFile(); if (e.key === "Escape") { setShowNewFile(false); setNewFileName(""); } }}
            placeholder="filename.ts"
            className="w-full rounded border border-accent-green/30 bg-black/30 px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none focus:border-accent-green"
            autoFocus
          />
        </div>
      )}
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((node) => (
          <FileTreeItem key={node.id} node={node} depth={0} activeFileId={activeFileId} onSelect={handleFileSelect} onDelete={handleDelete} onRename={handleRename} />
        ))}
      </div>
    </div>
  );

  const editorPanel = (
    <div className="flex h-full flex-col">
      <PI.EditorTabsComponent
        openFiles={openFiles}
        activeFileId={activeFileId}
        onSelectFile={(id) => setActiveFileId(id)}
        onCloseFile={(id) => { setOpenFiles((prev) => prev.filter((f) => f.id !== id)); if (activeFileId === id) setActiveFileId(null); }}
      />
      {activeFile && (
        <BreadcrumbComponent
          path={["project", "src", activeFile.name]}
          isModified={activeFile.isDirty}
        />
      )}
      <div className="flex-1 min-h-0">
        {activeFile ? (
          <MonacoEditor
            height="100%" language={activeFile.language} value={activeFile.content}
            onChange={handleEditorChange} theme="vs-dark"
            options={{
              fontSize: isMobile ? 13 : settings.fontSize, tabSize: settings.tabSize,
              wordWrap: isMobile ? "on" as const : settings.wordWrap,
              minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 8 },
              fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
              lineNumbers: isMobile ? "off" as const : "on" as const,
              renderLineHighlight: "line" as const,
              bracketPairColorization: { enabled: true },
              smoothScrolling: true,
              cursorBlinking: "smooth" as const, cursorSmoothCaretAnimation: "on" as const,
            }}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              setupMonaco(monaco, editor, { theme: "dark" });
              registerEditorFeatures(monaco, editor);
              registerGhostTextProvider(monaco);
              crossFileDisposableRef.current?.dispose();
              crossFileDisposableRef.current = registerCrossFileProviders(monaco, {
                onOpenFile: (filePath) => {
                  const node = findFileNodeByName(files, filePath);
                  if (node) handleFileSelect(node);
                },
              });
              editor.onDidDispose(() => {
                cancelGhostText();
                crossFileDisposableRef.current?.dispose();
                crossFileDisposableRef.current = null;
              });
              editor.onDidChangeCursorPosition((e) => {
                setCursorPos({ line: e.position.lineNumber, col: e.position.column });
              });
            }}
          />
        ) : !loaded ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent-green/40" />
          </div>
        ) : !hasEverOpened ? (
          <WelcomeScreen onNewFile={handleWelcomeNewFile} onOpenDemo={handleOpenDemo} onBlankProject={handleBlankProject} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 inline-block rounded-full border border-accent-green/20 bg-accent-green/8 p-4"><Files className="h-8 w-8 text-accent-green" /></div>
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-text-tertiary">Select a file</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const chatPanel = (
    <PI.ChatPanelComponent
      activeFileContent={activeFile?.content}
      activeFileName={activeFile?.name}
      activeFileLanguage={activeFile?.language}
      allFileNames={openFiles.map(f => f.name)}
      onApplyCode={handleApplyCode}
    />
  );

  // Ensure terminal mounts on mobile/tablet (xterm needs showTerminal=true for ref)
  useEffect(() => {
    if (isMobile || isTablet) setShowTerminal(true);
  }, [isMobile, isTablet]);

  const terminalPanel = (
    <div className="h-full bg-[#0d0d0d]">
      <div ref={termRef} className="h-full" />
    </div>
  );

  const pipelinePanel = (() => {
    const pipelineResult = pipelineStages.length > 0 ? {
      stages: pipelineStages.map((s) => ({
        stage: s.name, status: s.status, score: s.score ?? 0,
        findings: s.message ? [{ severity: s.status === "fail" ? "critical" as const : "minor" as const, message: s.message, rule: s.name }] : [],
      })),
      overallScore: pipelineScore ?? 0,
      overallStatus: ((pipelineScore ?? 0) >= 80 ? "pass" : (pipelineScore ?? 0) >= 60 ? "warn" : "fail") as "pass" | "warn" | "fail",
      timestamp: Date.now(),
    } : null;
    return <PI.PipelinePanelComponent result={pipelineResult} />;
  })();

  const statusBarEl = (
    <PI.StatusBarComponent
      activeFile={activeFile}
      pipelineScore={pipelineScore}
      cursorLine={cursorPos.line}
      cursorColumn={cursorPos.col}
      fontSize={settings.fontSize}
    />
  );

  // ── Mobile Layout (<768px) — wrapped with TouchGestures for swipe/pinch ──
  if (isMobile) {
    return (
      <TouchGesturesComponent
        className="h-full w-full"
        onSwipeLeft={() => setRightPanel(rightPanel ? null : "chat")}
        onSwipeRight={() => setRightPanel(null)}
        onPinchZoom={(scale) => {
          if (scale > 1.1) setSettings((s) => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) }));
          else if (scale < 0.9) setSettings((s) => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) }));
        }}
      >
        <PI.MobileLayoutComponent
          explorer={explorerPanel}
          editor={editorPanel}
          chat={chatPanel}
          terminal={terminalPanel}
          pipeline={pipelinePanel}
          statusBar={statusBarEl}
        />
      </TouchGesturesComponent>
    );
  }

  // ── Tablet Layout (768–1023px) ──
  if (isTablet) {
    return (
      <PI.TabletLayoutComponent
        sidebar={explorerPanel}
        editor={editorPanel}
        rightPanel={chatPanel}
        terminal={terminalPanel}
        statusBar={statusBarEl}
      />
    );
  }

  // ── Desktop Layout (>=1024px) — existing code below ──
  return (
    <div className="flex h-full w-full flex-col bg-bg-primary text-text-primary">
      <div className="flex flex-1 min-h-0">
        {/* Left -- File Explorer */}
        <div className="flex w-56 shrink-0 flex-col border-r border-white/8 bg-bg-secondary">
          <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
            <Link href="/" className="rounded p-1 text-text-tertiary hover:bg-white/8 hover:text-accent-amber transition-colors" title="Back to Home">
              <Home className="h-3.5 w-3.5" />
            </Link>
            <Files className="h-4 w-4 text-accent-green" />
            <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Explorer</span>
            <button onClick={() => setShowNewFile(!showNewFile)} className="ml-auto rounded p-1 text-text-tertiary hover:bg-white/8 hover:text-text-primary" title="New File">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {showNewFile && (
            <div className="px-2 py-1 border-b border-white/8">
              <input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleNewFile(); if (e.key === "Escape") { setShowNewFile(false); setNewFileName(""); } }}
                placeholder="filename.ts"
                className="w-full rounded border border-accent-green/30 bg-black/30 px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none focus:border-accent-green"
                autoFocus
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto py-1">
            {files.map((node) => (
              <FileTreeItem key={node.id} node={node} depth={0} activeFileId={activeFileId} onSelect={handleFileSelect} onDelete={handleDelete} onRename={handleRename} />
            ))}
          </div>
        </div>

        {/* Resize Handle */}
        <div className="cs-resize-handle" />

        {/* Center -- Editor + Terminal */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Breadcrumb — external component */}
          {activeFile && (
            <BreadcrumbComponent
              path={["project", "src", activeFile.name]}
              isModified={activeFile.isDirty}
            />
          )}

          {/* Editor Tabs -- external component */}
          <div className="flex items-center border-b border-white/8 bg-bg-secondary">
            <div className="flex-1 min-w-0">
              <PI.EditorTabsComponent
                openFiles={openFiles}
                activeFileId={activeFileId}
                onSelectFile={(id) => setActiveFileId(id)}
                onCloseFile={handleCloseTab}
              />
            </div>
            <div className="flex items-center gap-1 px-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (splitFileId) { setSplitFileId(null); }
                  else if (activeFileId) { const other = openFiles.find((f) => f.id !== activeFileId); setSplitFileId(other?.id ?? activeFileId); }
                }}
                disabled={openFiles.length === 0}
                className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${splitFileId ? "text-accent-green" : "text-text-tertiary"} disabled:opacity-30`}
                title="Split Editor"
              >
                <Columns2 className="h-4 w-4" />
              </button>
              <button onClick={() => setShowTerminal(!showTerminal)} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${showTerminal ? "text-accent-green" : "text-text-tertiary"}`} title="Terminal"><TermIcon className="h-4 w-4" /></button>
              {/* Registry-driven panel buttons (first 12 = original activity bar set) */}
              {[...PANEL_REGISTRY].slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setRightPanel(rightPanel === p.id ? null : p.id as RightPanel)}
                  className={`relative rounded p-1.5 transition-all duration-150 active:scale-95 ${rightPanel === p.id ? p.color : "text-text-tertiary"}`}
                  title={p.label + ("shortcut" in p ? ` (${(p as { shortcut: string }).shortcut})` : "")}
                >
                  <PanelIcon name={p.icon} className="h-4 w-4" />
                  {p.id === "bugs" && bugReports.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent-red text-[8px] text-white flex items-center justify-center">{bugReports.length}</span>
                  )}
                </button>
              ))}
              <button onClick={() => setShowCommandPalette(true)} className="rounded p-1.5 transition-all duration-150 active:scale-95 text-text-tertiary hover:text-text-secondary" title="Commands (Ctrl+Shift+P)"><Command className="h-4 w-4" /></button>
              <button onClick={() => { if (showSettings) toast("Settings saved", "success"); setShowSettings(!showSettings); }} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${showSettings ? "text-accent-amber" : "text-text-tertiary hover:text-text-secondary"}`} title="Settings"><Settings className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Toolbar — external component (replaces inline settings overlay) */}
          {showSettings && (
            <ToolbarComponent
              onToggleChat={() => setRightPanel(rightPanel === "chat" ? null : "chat")}
              onToggleTerminal={() => setShowTerminal((v) => !v)}
              onTogglePipeline={() => setRightPanel(rightPanel === "pipeline" ? null : "pipeline")}
              onToggleAgent={() => setRightPanel(rightPanel === "agents" ? null : "agents")}
              onToggleSidebar={() => {}}
              onToggleSearch={() => setRightPanel(rightPanel === "search" ? null : "search")}
              onNewFile={() => setShowNewFile(true)}
              onOpenSettings={() => { setShowSettings(false); toast("Settings saved", "success"); }}
              onOpenPalette={() => setShowCommandPalette(true)}
              onToggleProblems={() => setRightPanel(rightPanel === "bugs" ? null : "bugs")}
              onRunBugFinder={() => setRightPanel(rightPanel === "bugs" ? null : "bugs")}
              onDeploy={() => setRightPanel(rightPanel === "deploy" ? null : "deploy")}
              onToggleSplit={() => {
                if (splitFileId) setSplitFileId(null);
                else if (activeFileId) { const other = openFiles.find((f) => f.id !== activeFileId); setSplitFileId(other?.id ?? activeFileId); }
              }}
              onUndo={fsCanUndo ? fsUndo : undefined}
              onRedo={fsCanRedo ? fsRedo : undefined}
              onZoomIn={() => setSettings((s) => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) }))}
              onZoomOut={() => setSettings((s) => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) }))}
              onZoomReset={() => setSettings((s) => ({ ...s, fontSize: 14 }))}
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
                <MultiKeyPanel language="ko" onClose={() => setShowMultiKey(false)} />
              </div>
            </div>
          )}

          {/* Editor + Right Panel */}
          <div className="flex flex-1 min-h-0">
            {/* Diff Viewer Overlay */}
            {diffState && (
              <div className="absolute inset-0 z-20 bg-bg-primary">
                <DiffViewer
                  original={diffState.original}
                  modified={diffState.modified}
                  language={activeFile?.language ?? "plaintext"}
                  fileName={diffState.fileName}
                  onAccept={(content) => { handleApplyCode(content); setDiffState(null); }}
                  onReject={() => setDiffState(null)}
                />
              </div>
            )}
            {/* Editor Area (supports split view) */}
            <div className={`flex-1 min-w-0 ${splitFileId ? "flex" : ""}`}>
              {/* Primary Editor */}
              <div className={splitFileId ? "flex-1 min-w-0" : "h-full"}>
                {activeFile ? (
                  <MonacoEditor
                    height="100%" language={activeFile.language} value={activeFile.content}
                    onChange={handleEditorChange} theme="vs-dark"
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
                    onMount={(editor, monaco) => {
                      editorRef.current = editor;
                      setupMonaco(monaco, editor, { theme: "dark" });
                      registerEditorFeatures(monaco, editor);
                      registerGhostTextProvider(monaco);
                      crossFileDisposableRef.current?.dispose();
                      crossFileDisposableRef.current = registerCrossFileProviders(monaco, {
                        onOpenFile: (filePath) => {
                          const node = findFileNodeByName(files, filePath);
                          if (node) handleFileSelect(node);
                        },
                      });
                      editor.onDidDispose(() => {
                        cancelGhostText();
                        crossFileDisposableRef.current?.dispose();
                        crossFileDisposableRef.current = null;
                      });
                      editor.onDidChangeCursorPosition((e) => {
                        setCursorPos({ line: e.position.lineNumber, col: e.position.column });
                      });
                    }}
                  />
                ) : !loaded ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-accent-green/40" />
                  </div>
                ) : !hasEverOpened ? (
                  <WelcomeScreen onNewFile={handleWelcomeNewFile} onOpenDemo={handleOpenDemo} onBlankProject={handleBlankProject} />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4 inline-block rounded-full border border-accent-green/20 bg-accent-green/8 p-4"><Files className="h-8 w-8 text-accent-green" /></div>
                      <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-text-tertiary">Select a file to start editing</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Split Editor (right side) */}
              {splitFileId && splitFile && (
                <>
                  <div className="w-px bg-white/8" />
                  <div className="flex flex-1 min-w-0 flex-col">
                    <div className="flex items-center gap-2 border-b border-white/8 bg-bg-secondary px-2 py-1">
                      <Columns2 className="h-3 w-3 text-accent-green" />
                      <select
                        value={splitFileId}
                        onChange={(e) => setSplitFileId(e.target.value)}
                        className="flex-1 bg-transparent font-[family-name:var(--font-mono)] text-[11px] text-text-secondary outline-none"
                      >
                        {openFiles.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <button onClick={() => setSplitFileId(null)} className="rounded p-0.5 text-text-tertiary hover:text-text-primary hover:bg-white/10" title="Close Split">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-h-0">
                      <MonacoEditor
                        height="100%" language={splitFile.language} value={splitFile.content}
                        onChange={handleSplitEditorChange} theme="vs-dark"
                        options={{
                          fontSize: settings.fontSize, tabSize: settings.tabSize, wordWrap: settings.wordWrap,
                          minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 },
                          fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
                          lineNumbers: "on", renderLineHighlight: "line",
                          bracketPairColorization: { enabled: true },
                          smoothScrolling: true,
                          cursorBlinking: "smooth", cursorSmoothCaretAnimation: "on",
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Panel -- registry-driven render via panelPropsMap */}
            {rightPanel && (() => {
              const panelPropsMap: Record<string, () => React.ReactNode> = {
                "chat": () => (
                  <PI.ChatPanelComponent
                    activeFileContent={activeFile?.content}
                    activeFileName={activeFile?.name}
                    activeFileLanguage={activeFile?.language}
                    allFileNames={openFiles.map(f => f.name)}
                    onApplyCode={handleApplyCode}
                  />
                ),
                "pipeline": () => {
                  const pipelineResult = pipelineStages.length > 0 ? {
                    stages: pipelineStages.map((s) => ({
                      stage: s.name, status: s.status, score: s.score ?? 0,
                      findings: s.message ? [{ severity: s.status === "fail" ? "critical" as const : "minor" as const, message: s.message, rule: s.name }] : [],
                    })),
                    overallScore: pipelineScore ?? 0,
                    overallStatus: ((pipelineScore ?? 0) >= 80 ? "pass" : (pipelineScore ?? 0) >= 60 ? "warn" : "fail") as "pass" | "warn" | "fail",
                    timestamp: Date.now(),
                  } : null;
                  return <PI.PipelinePanelComponent result={pipelineResult} />;
                },
                "git": () => <PI.GitPanelComponent files={files} openFiles={openFiles} onRestore={(fid: string, content: string) => {
                  setOpenFiles((prev) => prev.map((f) => f.id === fid ? { ...f, content, isDirty: true } : f));
                  fsUpdateContent(fid, content);
                }} onClearDirty={() => setOpenFiles((prev) => prev.map((f) => ({ ...f, isDirty: false })))} />,
                "deploy": () => <PI.DeployPanelComponent files={files} language="EN" />,
                "bugs": () => <PI.ProblemsPanelComponent findings={problemFindings} />,
                "autopilot": () => (
                  <PI.AutopilotPanelComponent
                    code={activeFile?.content ?? ""}
                    language={activeFile?.language ?? "plaintext"}
                    fileName={activeFile?.name ?? "untitled"}
                    onComplete={() => {}}
                    onClose={() => setRightPanel(null)}
                  />
                ),
                "agents": () => (
                  <PI.AgentPanelComponent
                    code={activeFile?.content ?? ""}
                    language={activeFile?.language ?? "plaintext"}
                    fileName={activeFile?.name ?? "untitled"}
                  />
                ),
                "search": () => (
                  <PI.SearchPanelComponent
                    files={files}
                    onOpenFile={(name: string) => {
                      const findByName = (nodes: FileNode[]): FileNode | null => {
                        for (const n of nodes) { if (n.name === name && n.type === "file") return n; if (n.children) { const f = findByName(n.children); if (f) return f; } } return null;
                      };
                      const node = findByName(files);
                      if (node) handleFileSelect(node);
                    }}
                    onClose={() => setRightPanel(null)}
                  />
                ),
                "composer": () => (
                  <PI.ComposerPanelComponent
                    files={files}
                    onCompose={async (fileIds: string[], instruction: string) => {
                      return fileIds.map((fid) => {
                        const f = openFiles.find((of) => of.id === fid);
                        return { fileId: fid, fileName: f?.name ?? fid, original: f?.content ?? "", modified: f?.content ?? "", status: "pending" as const };
                      });
                    }}
                    onApplyChanges={(changes: Array<{ fileId: string; modified: string }>) => {
                      for (const c of changes) {
                        setOpenFiles((prev) => prev.map((f) => f.id === c.fileId ? { ...f, content: c.modified, isDirty: true } : f));
                        fsUpdateContent(c.fileId, c.modified);
                      }
                      toast(`Applied ${changes.length} file(s)`, "success");
                    }}
                    onPreviewDiff={(change: { original: string; modified: string; fileName: string }) => setDiffState({ original: change.original, modified: change.modified, fileName: change.fileName })}
                  />
                ),
                "review": () => {
                  // If verification ran, use its final score/status; otherwise fall back to pipeline-only
                  const effectiveScore = verificationResult?.finalScore ?? pipelineScore ?? 0;
                  const effectiveStatus = verificationResult?.finalStatus ?? ((pipelineScore ?? 0) >= 80 ? "pass" : (pipelineScore ?? 0) >= 60 ? "warn" : "fail") as "pass" | "warn" | "fail";
                  return (
                    <PI.ReviewCenterComponent
                      pipelineResult={pipelineStages.length > 0 ? {
                        stages: pipelineStages.map((s) => ({
                          stage: s.name, status: s.status, score: s.score ?? 0,
                          findings: s.message ? [{ severity: s.status === "fail" ? "critical" as const : "minor" as const, message: s.message, rule: s.name }] : [],
                        })),
                        overallScore: effectiveScore,
                        overallStatus: effectiveStatus,
                        timestamp: Date.now(),
                      } : null}
                    />
                  );
                },
                "preview": () => <PI.PreviewPanelComponent files={files} visible={rightPanel === "preview"} />,
                "outline": () => (
                  <PI.OutlinePanelComponent
                    code={activeFile?.content ?? ""}
                    language={activeFile?.language ?? "plaintext"}
                    onNavigate={(line: number) => {
                      const editor = editorRef.current as { revealLineInCenter?: (l: number) => void; setPosition?: (p: { lineNumber: number; column: number }) => void } | null;
                      editor?.revealLineInCenter?.(line);
                      editor?.setPosition?.({ lineNumber: line, column: 1 });
                    }}
                  />
                ),
                "templates": () => <PI.TemplateGalleryComponent onSelectTemplate={() => {}} onClose={() => setRightPanel(null)} />,
                "settings-panel": () => <PI.SettingsPanelComponent />,
                "packages": () => <PI.PackagePanelComponent files={files} />,
                "evaluation": () => <PI.EvaluationPanelComponent files={files} onClose={() => setRightPanel(null)} />,
                "collab": () => <PI.CollabPanelComponent onClose={() => setRightPanel(null)} />,
                "creator": () => (
                  <PI.CodeCreatorPanelComponent
                    onMerge={(createdFiles: Array<{ path: string; content: string }>) => {
                      for (const f of createdFiles) {
                        const node: FileNode = { id: `created-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: f.path.split("/").pop() ?? "file.ts", type: "file", content: f.content };
                        setFiles((prev) => [...prev, node]);
                        setOpenFiles((prev) => [...prev, { id: node.id, name: node.name, content: f.content, language: detectLanguage(node.name) }]);
                        setActiveFileId(node.id);
                      }
                      toast(`Created ${createdFiles.length} file(s)`, "success");
                    }}
                    onClose={() => setRightPanel(null)}
                  />
                ),
                // New panels (19) — stub props for panels not yet fully integrated
                "terminal-panel": () => <PI.TerminalPanelComponent files={files} />,
                "multi-terminal": () => <PI.MultiTerminalComponent />,
                "database": () => <PI.DatabasePanelComponent connections={[]} onConnect={async () => false} onExecuteQuery={async () => ({ columns: [], rows: [], rowCount: 0, duration: 0, executionTime: 0 })} />,
                "diff-editor": () => <PI.DiffEditorPanelComponent original="" modified="" />,
                "git-graph": () => <PI.GitGraphComponent commits={[]} branches={[]} currentBranch="main" />,
                "ai-hub": () => <PI.AIHubComponent features={[]} onToggleFeature={() => {}} />,
                "ai-workspace": () => <PI.AIWorkspaceComponent threads={[]} sharedMemory={[]} onSendMessage={async () => ""} onCreateThread={() => {}} onDeleteThread={() => {}} />,
                "canvas": () => <PI.CanvasPanelComponent nodes={[]} connections={[]} onNodesChange={() => {}} onConnectionsChange={() => {}} />,
                "progress": () => {
                  const status: "pass" | "warn" | "fail" | undefined = pipelineScore ? (pipelineScore >= 80 ? "pass" : pipelineScore >= 60 ? "warn" : "fail") : undefined;
                  return <PI.ProgressDashboardComponent pipelineScore={pipelineScore ?? undefined} pipelineStatus={status} stressReport={stressReport} onRunStress={handleRunStressTest} isStressTesting={isStressTesting} verificationScore={verificationScore ?? undefined} onRunVerification={handleRunVerification} isVerifying={isVerifying} verificationResult={verificationResult} currentVerifyRound={currentVerifyRound} />;
                },
                "onboarding": () => <PI.OnboardingGuideComponent onComplete={() => setRightPanel(null)} onSkip={() => setRightPanel(null)} />,
                "merge-conflict": () => <PI.MergeConflictEditorComponent fileName={activeFile?.name ?? ""} conflicts={[]} onResolve={() => {}} />,
                "project-switcher": () => <PI.ProjectSwitcherComponent onClose={() => setRightPanel(null)} />,
                "recent-files": () => <PI.RecentFilesComponent files={[]} onOpen={() => {}} onClear={() => {}} />,
                "symbol-palette": () => <PI.SymbolPaletteComponent symbols={[]} onSelect={() => {}} onClose={() => setRightPanel(null)} />,
                "keybindings": () => <PI.KeybindingsPanelComponent onClose={() => setRightPanel(null)} />,
                "api-config": () => <PI.APIKeyConfigComponent onClose={() => setRightPanel(null)} />,
                "network-inspector": () => <PI.PreviewNetworkTabComponent visible={rightPanel === "network-inspector"} onClose={() => setRightPanel(null)} />,
                "code-actions": () => <PI.QuickActionsComponent selectedText="" position={{ top: 0, left: 0 }} language={activeFile?.language ?? "plaintext"} onAction={() => {}} onClose={() => setRightPanel(null)} />,
                "model-switcher": () => <PI.ModelSwitcherComponent />,
              };
              return (
                <div className="w-80 shrink-0 border-l border-white/8 bg-bg-secondary overflow-hidden cs-panel-enter">
                  {panelPropsMap[rightPanel]?.()}
                </div>
              );
            })()}
          </div>

          {/* Staging Banner — shows when verification fixes are staged */}
          {stagedCode && (
            <div className="border-t border-accent-amber/30 bg-accent-amber/5 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent-amber" />
                <span className="font-[family-name:var(--font-mono)] text-[11px] text-accent-amber">
                  {verificationResult?.totalFixesApplied ?? 0} fixes staged — Review before applying
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleApplyStagedCode} className="rounded border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-[11px] text-accent-green hover:bg-accent-green/20">
                  Accept &amp; Apply
                </button>
                <button onClick={handleRejectStaged} className="rounded border border-accent-red/30 bg-accent-red/10 px-3 py-1 text-[11px] text-accent-red hover:bg-accent-red/20">
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Rollback Banner — shows after fixes were applied */}
          {preApplySnapshot && !stagedCode && (
            <div className="border-t border-accent-purple/30 bg-accent-purple/5 px-4 py-2 flex items-center justify-between">
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-accent-purple">
                Verification fixes applied — Rollback available
              </span>
              <button onClick={handleRollback} className="rounded border border-accent-purple/30 bg-accent-purple/10 px-3 py-1 text-[11px] text-accent-purple hover:bg-accent-purple/20">
                Rollback
              </button>
            </div>
          )}

          {/* Terminal */}
          {showTerminal && (
            <div className="h-48 border-t border-white/8 bg-[#0d0d0d]">
              <div className="flex items-center gap-2 border-b border-white/8 px-3 py-1">
                <TermIcon className="h-3.5 w-3.5 text-accent-green" />
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-tertiary">Terminal</span>
                <button onClick={() => setShowTerminal(false)} className="ml-auto rounded p-0.5 text-text-tertiary hover:text-text-primary"><X className="h-3 w-3" /></button>
              </div>
              <div ref={termRef} className="h-[calc(100%-28px)]" />
            </div>
          )}

          {/* Quick Open (Ctrl+P) */}
          {showQuickOpen && (
            <PI.QuickOpenComponent
              files={files}
              onOpen={(node) => { handleFileSelect(node); setShowQuickOpen(false); }}
              onClose={() => setShowQuickOpen(false)}
            />
          )}

          {/* Command Palette — registry-driven commands */}
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
                // Registry-driven panel toggle
                const panelId = cmdId.replace("toggle-", "");
                if (PANEL_REGISTRY.some((p) => p.id === panelId)) {
                  setRightPanel((v) => v === panelId ? null : panelId as RightPanel);
                }
              }}
              commands={[
                { id: "new-file", label: "New File", shortcut: "Ctrl+N", category: "File" },
                { id: "toggle-terminal", label: "Toggle Terminal", shortcut: "Ctrl+`", category: "View" },
                ...[...PANEL_REGISTRY].map((p) => ({
                  id: `toggle-${p.id}`,
                  label: p.label,
                  shortcut: "shortcut" in p ? (p as { shortcut: string }).shortcut : undefined,
                  category: p.category,
                })),
                { id: "quick-open", label: "Quick Open File", shortcut: "Ctrl+P", category: "File" },
                { id: "toggle-settings", label: "Toggle Inline Settings", category: "View" },
                { id: "run-stress-test", label: "Run Stress Test (AI-Predicted)", category: "Tools" },
                { id: "run-verification", label: "Run Full Verification (Pipeline + Bugs + Stress)", category: "Tools" },
              ]}
            />
          )}
        </div>
      </div>

      {/* StatusBar -- external component */}
      <PI.StatusBarComponent
        activeFile={activeFile}
        pipelineScore={pipelineScore}
        cursorLine={cursorPos.line}
        cursorColumn={cursorPos.col}
        fontSize={settings.fontSize}
      />

      {/* Modal/Dialog overlays */}
      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}
      <ShortcutOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ErrorOverlay error={buildError} onDismiss={() => setBuildError(null)} />
    </div>
  );
}

// IDENTITY_SEAL: PART-6 | role=MainShell | inputs=none | outputs=IDE-layout

// PART 7 — removed (PipelinePanelInline migrated to external PipelinePanel component)

// ============================================================
// PART 8 — Export Wrapper (ToastProvider)
// ============================================================

export default function CodeStudioShell() {
  return (
    <ErrorBoundary fallbackMessage="Code Studio encountered an error">
      <ToastProvider>
        <CodeStudioShellInner />
      </ToastProvider>
    </ErrorBoundary>
  );
}

// IDENTITY_SEAL: PART-8 | role=ExportWrapper | inputs=none | outputs=ToastProvider+Shell
