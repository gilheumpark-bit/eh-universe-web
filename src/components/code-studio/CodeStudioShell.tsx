"use client";

// ============================================================
// PART 1 — Imports & State
// ============================================================

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Files, Plus, X, Play, Settings, ChevronRight, ChevronDown,
  FileText, FolderOpen, Folder, Terminal as TermIcon,
} from "lucide-react";
import type { FileNode, OpenFile, CodeStudioSettings } from "@/lib/code-studio-types";
import { DEFAULT_SETTINGS, detectLanguage } from "@/lib/code-studio-types";

// Monaco — SSR 불가, dynamic import 필수
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ============================================================
// PART 2 — 샘플 파일 트리 (데모용)
// ============================================================

const DEMO_FILES: FileNode[] = [
  {
    id: "root",
    name: "project",
    type: "folder",
    children: [
      {
        id: "src",
        name: "src",
        type: "folder",
        children: [
          {
            id: "index-ts",
            name: "index.ts",
            type: "file",
            content: `// Welcome to Code Studio\n\nfunction greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("EH Universe"));\n`,
          },
          {
            id: "utils-ts",
            name: "utils.ts",
            type: "file",
            content: `export function sum(a: number, b: number): number {\n  return a + b;\n}\n\nexport function capitalize(str: string): string {\n  return str.charAt(0).toUpperCase() + str.slice(1);\n}\n`,
          },
          {
            id: "app-tsx",
            name: "App.tsx",
            type: "file",
            content: `import React from "react";\n\nexport default function App() {\n  return (\n    <div className="app">\n      <h1>EH Code Studio</h1>\n      <p>Monaco Editor + Terminal + AI</p>\n    </div>\n  );\n}\n`,
          },
        ],
      },
      {
        id: "pkg-json",
        name: "package.json",
        type: "file",
        content: `{\n  "name": "eh-project",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build"\n  }\n}\n`,
      },
      {
        id: "readme",
        name: "README.md",
        type: "file",
        content: `# EH Project\n\nThis is a demo project in Code Studio.\n`,
      },
    ],
  },
];

// ============================================================
// PART 3 — File Tree Component
// ============================================================

function FileTreeItem({
  node, depth, activeFileId, onSelect,
}: {
  node: FileNode; depth: number; activeFileId: string | null;
  onSelect: (node: FileNode) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === "folder";
  const isActive = node.id === activeFileId;

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) setOpen(!open);
          else onSelect(node);
        }}
        className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-[12px] transition-colors hover:bg-white/[0.06] ${
          isActive ? "bg-accent-green/10 text-accent-green" : "text-text-secondary"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <span className="w-3" />
        )}
        {isFolder ? (
          open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent-amber" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-accent-amber" />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
        )}
        <span className="truncate font-[family-name:var(--font-mono)]">{node.name}</span>
      </button>
      {isFolder && open && node.children?.map((child) => (
        <FileTreeItem key={child.id} node={child} depth={depth + 1} activeFileId={activeFileId} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ============================================================
// PART 4 — Main Shell
// ============================================================

export default function CodeStudioShell() {
  const [files] = useState<FileNode[]>(DEMO_FILES);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [settings] = useState<CodeStudioSettings>(DEFAULT_SETTINGS);
  const editorRef = useRef<unknown>(null);

  const activeFile = openFiles.find((f) => f.id === activeFileId) ?? null;

  const handleFileSelect = useCallback((node: FileNode) => {
    if (node.type === "folder") return;
    const existing = openFiles.find((f) => f.id === node.id);
    if (!existing) {
      const newFile: OpenFile = {
        id: node.id,
        name: node.name,
        content: node.content ?? "",
        language: detectLanguage(node.name),
      };
      setOpenFiles((prev) => [...prev, newFile]);
    }
    setActiveFileId(node.id);
  }, [openFiles]);

  const handleCloseTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFileId === id) {
        setActiveFileId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  }, [activeFileId]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeFileId || value === undefined) return;
    setOpenFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: value, isDirty: true } : f))
    );
  }, [activeFileId]);

  return (
    <div className="flex h-full w-full bg-bg-primary text-text-primary">
      {/* Sidebar — File Explorer */}
      <div className="flex w-56 shrink-0 flex-col border-r border-white/8 bg-bg-secondary">
        <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
          <Files className="h-4 w-4 text-accent-green" />
          <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Explorer
          </span>
          <button className="ml-auto rounded p-1 text-text-tertiary hover:bg-white/8 hover:text-text-primary">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {files.map((node) => (
            <FileTreeItem key={node.id} node={node} depth={0} activeFileId={activeFileId} onSelect={handleFileSelect} />
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Tab Bar */}
        <div className="flex items-center border-b border-white/8 bg-bg-secondary">
          <div className="flex flex-1 overflow-x-auto">
            {openFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFileId(f.id)}
                className={`group flex items-center gap-2 border-r border-white/8 px-3 py-1.5 text-[12px] font-[family-name:var(--font-mono)] transition-colors ${
                  f.id === activeFileId
                    ? "bg-bg-primary text-text-primary border-t-2 border-t-accent-green"
                    : "text-text-tertiary hover:bg-white/[0.04] hover:text-text-secondary"
                }`}
              >
                {f.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-accent-amber" />}
                {f.name}
                <span
                  onClick={(e) => handleCloseTab(f.id, e)}
                  className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`rounded p-1.5 transition-colors ${showTerminal ? "text-accent-green" : "text-text-tertiary hover:text-text-secondary"}`}
              title="Toggle Terminal"
            >
              <TermIcon className="h-4 w-4" />
            </button>
            <button className="rounded p-1.5 text-text-tertiary hover:text-text-secondary" title="Run">
              <Play className="h-4 w-4" />
            </button>
            <button className="rounded p-1.5 text-text-tertiary hover:text-text-secondary" title="Settings">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0">
          {activeFile ? (
            <MonacoEditor
              height="100%"
              language={activeFile.language}
              value={activeFile.content}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: settings.fontSize,
                tabSize: settings.tabSize,
                wordWrap: settings.wordWrap,
                minimap: { enabled: settings.minimap },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                fontFamily: "var(--font-mono), 'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: "on",
                renderLineHighlight: "line",
                bracketPairColorization: { enabled: true },
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
              }}
              onMount={(editor) => { editorRef.current = editor; }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 inline-block rounded-full border border-accent-green/20 bg-accent-green/8 p-4">
                  <Files className="h-8 w-8 text-accent-green" />
                </div>
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-text-tertiary">
                  Select a file to start editing
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Terminal Panel */}
        {showTerminal && (
          <div className="h-48 border-t border-white/8 bg-[#0d0d0d]">
            <div className="flex items-center gap-2 border-b border-white/8 px-3 py-1">
              <TermIcon className="h-3.5 w-3.5 text-accent-green" />
              <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-tertiary">
                Terminal
              </span>
              <button
                onClick={() => setShowTerminal(false)}
                className="ml-auto rounded p-0.5 text-text-tertiary hover:text-text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="p-3 font-[family-name:var(--font-mono)] text-[12px] text-accent-green">
              <span className="text-text-tertiary">$</span> Ready — xterm integration in Phase 3
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="flex items-center justify-between border-t border-white/8 bg-bg-secondary px-3 py-0.5">
          <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-accent-green" />
              Ready
            </span>
            {activeFile && <span>{activeFile.language}</span>}
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
            {openFiles.length} files open
          </div>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=ImportsState | inputs=none | outputs=state,refs
// IDENTITY_SEAL: PART-2 | role=DemoFiles | inputs=none | outputs=FileNode[]
// IDENTITY_SEAL: PART-3 | role=FileTree | inputs=node,depth | outputs=UI
// IDENTITY_SEAL: PART-4 | role=MainShell | inputs=none | outputs=IDE layout
