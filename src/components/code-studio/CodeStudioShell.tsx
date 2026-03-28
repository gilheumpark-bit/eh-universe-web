"use client";

// ============================================================
// PART 1 — Imports & State
// ============================================================

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Files, Plus, X, Play, Settings, ChevronRight, ChevronDown,
  FileText, FolderOpen, Folder, Terminal as TermIcon,
  MessageSquare, Shield, Activity, Send, Trash2, Edit3,
  AlertTriangle, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import type { FileNode, OpenFile, CodeStudioSettings } from "@/lib/code-studio-types";
import { DEFAULT_SETTINGS, detectLanguage } from "@/lib/code-studio-types";
import { streamChat, getApiKey, getActiveProvider } from "@/lib/ai-providers";
import { runNoa } from "@/lib/noa";
import { saveFileTree, loadFileTree, saveSettings, loadSettings, saveChatSession, listChatSessions, type StoredChatSession } from "@/lib/code-studio-store";
import { registerGhostTextProvider, cancelGhostText } from "@/lib/code-studio-ghost";
import { runStaticPipeline } from "@/lib/code-studio-pipeline";
import type { NoaResult } from "@/lib/noa/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ============================================================
// PART 2 — 데모 파일 트리
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

// ============================================================
// PART 3 — Chat Message Type
// ============================================================

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  noaResult?: NoaResult;
}

// ============================================================
// PART 4 — File Tree Component
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
            open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
          ) : <span className="w-3" />}
          {isFolder ? (
            open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent-amber" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-accent-amber" />
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
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

// ============================================================
// PART 5 — AI Chat Panel
// ============================================================

function AIChatPanel({
  activeFile, onApplyCode,
}: {
  activeFile: OpenFile | null;
  onApplyCode: (code: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [noaBlocked, setNoaBlocked] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef("chat-" + Date.now());

  // 채팅 히스토리 IndexedDB 복원
  useEffect(() => {
    (async () => {
      const sessions = await listChatSessions();
      if (sessions.length > 0) {
        const latest = sessions[0];
        sessionIdRef.current = latest.id;
        setMessages(latest.messages.map((m) => ({ ...m, id: crypto.randomUUID() })));
      }
    })();
  }, []);

  // 메시지 변경 시 자동 저장 (디바운스)
  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      saveChatSession({
        id: sessionIdRef.current,
        title: messages[0]?.content.slice(0, 50) || "Chat",
        messages: messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        createdAt: messages[0]?.timestamp || Date.now(),
        updatedAt: Date.now(),
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput("");
    setNoaBlocked(null);

    // NOA 보안 게이트
    try {
      const noaResult = await runNoa({ text });
      if (!noaResult.allowed) {
        setNoaBlocked(`[NOA ${noaResult.tactical?.selectedPath ?? "BLOCK"}] ${noaResult.fastTrack?.verdict === "BLOCK" ? "Blocked by safety filter" : `Risk grade: ${noaResult.judgment?.grade ?? "unknown"}`}`);
        return;
      }
    } catch {
      // NOA 실패 시 통과 (기능 장애가 사용을 막지 않음)
    }

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    const provider = getActiveProvider();
    const apiKey = getApiKey(provider);
    if (!apiKey) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "API key not configured. Set it in Studio settings.", timestamp: Date.now() }]);
      return;
    }

    setIsGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const systemPrompt = `You are an AI coding assistant in EH Code Studio.
${activeFile ? `The user is editing "${activeFile.name}" (${activeFile.language}). Current content:\n\`\`\`${activeFile.language}\n${activeFile.content.slice(0, 2000)}\n\`\`\`` : "No file is open."}
Respond concisely. Use markdown code blocks for code.`;

    let assistantContent = "";
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: Date.now() }]);

    try {
      await streamChat({
        systemInstruction: systemPrompt,
        messages: [{ role: "user", content: text }],
        temperature: 0.3,
        signal: controller.signal,
        onChunk: (chunk: string) => {
          assistantContent += chunk;
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent } : m));
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        assistantContent += "\n\n*[Cancelled]*";
      } else {
        assistantContent += `\n\n*Error: ${err instanceof Error ? err.message : "Unknown error"}*`;
      }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent } : m));
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [input, isGenerating, activeFile]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <MessageSquare className="h-4 w-4 text-accent-purple" />
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">AI Chat</span>
        <Shield className="ml-auto h-3 w-3 text-accent-green" aria-label="NOA Security Active" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-text-tertiary text-[11px] font-[family-name:var(--font-mono)]">
            Ask about your code, generate functions, or get explanations.
            <br />NOA 7-Layer security is active.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
              m.role === "user"
                ? "bg-accent-purple/15 text-text-primary"
                : "bg-white/[0.04] text-text-secondary"
            }`}>
              <pre className="whitespace-pre-wrap font-[family-name:var(--font-mono)] text-[11px]">{m.content || (isGenerating ? "..." : "")}</pre>
              {m.role === "assistant" && m.content.includes("```") && (
                <button
                  onClick={() => {
                    const match = m.content.match(/```\w*\n([\s\S]*?)```/);
                    if (match?.[1]) onApplyCode(match[1]);
                  }}
                  className="mt-2 rounded border border-accent-green/20 bg-accent-green/8 px-2 py-1 font-[family-name:var(--font-mono)] text-[10px] text-accent-green hover:bg-accent-green/15"
                >
                  Apply Code
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {noaBlocked && (
        <div className="mx-3 mb-2 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-[11px] text-accent-red font-[family-name:var(--font-mono)]">
          <AlertTriangle className="inline h-3 w-3 mr-1" />{noaBlocked}
        </div>
      )}

      <div className="border-t border-white/8 p-2">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask AI about your code..."
            className="flex-1 rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2 font-[family-name:var(--font-mono)] text-[12px] text-text-primary placeholder-text-tertiary outline-none focus:border-accent-green/30"
          />
          {isGenerating ? (
            <button onClick={() => abortRef.current?.abort()} className="rounded-lg bg-accent-red/20 p-2 text-accent-red"><X className="h-4 w-4" /></button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim()} className="rounded-lg bg-accent-green/20 p-2 text-accent-green disabled:opacity-30"><Send className="h-4 w-4" /></button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PART 6 — Pipeline Results Panel
// ============================================================

interface PipelineStage { name: string; status: "pass" | "warn" | "fail" | "running" | "pending"; score?: number; message?: string; }

function PipelinePanel({ stages }: { stages: PipelineStage[] }) {
  const icons = { pass: CheckCircle, warn: AlertTriangle, fail: XCircle, running: Loader2, pending: Activity };
  const colors = { pass: "text-accent-green", warn: "text-accent-amber", fail: "text-accent-red", running: "text-accent-blue animate-spin", pending: "text-text-tertiary" };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Activity className="h-4 w-4 text-accent-blue" />
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Pipeline</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {stages.length === 0 && (
          <div className="text-center py-8 text-text-tertiary text-[11px] font-[family-name:var(--font-mono)]">
            8-Team pipeline runs on code changes.
            <br />Edit a file to trigger analysis.
          </div>
        )}
        {stages.map((s) => {
          const Icon = icons[s.status];
          return (
            <div key={s.name} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
              <Icon className={`h-4 w-4 shrink-0 ${colors[s.status]}`} />
              <div className="flex-1 min-w-0">
                <div className="font-[family-name:var(--font-mono)] text-[11px] font-semibold text-text-primary">{s.name}</div>
                {s.message && <div className="text-[10px] text-text-tertiary truncate">{s.message}</div>}
              </div>
              {s.score !== undefined && (
                <span className={`font-[family-name:var(--font-mono)] text-[11px] font-bold ${s.score >= 80 ? "text-accent-green" : s.score >= 60 ? "text-accent-amber" : "text-accent-red"}`}>
                  {s.score}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// PART 7 — File Tree Helpers (CRUD)
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

function deleteFromTree(tree: FileNode[], id: string): FileNode[] {
  return tree
    .filter((n) => n.id !== id)
    .map((n) => n.children ? { ...n, children: deleteFromTree(n.children, id) } : n);
}

function renameInTree(tree: FileNode[], id: string, name: string): FileNode[] {
  return tree.map((n) => {
    if (n.id === id) return { ...n, name };
    if (n.children) return { ...n, children: renameInTree(n.children, id, name) };
    return n;
  });
}

// ============================================================
// PART 8 — Main Shell
// ============================================================

type RightPanel = "chat" | "pipeline" | null;

export default function CodeStudioShell() {
  const [files, setFiles] = useState<FileNode[]>(DEMO_FILES);
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
  const editorRef = useRef<unknown>(null);
  const termRef = useRef<HTMLDivElement>(null);

  const activeFile = openFiles.find((f) => f.id === activeFileId) ?? null;

  // IndexedDB에서 파일 트리 + 설정 로드 (최초 1회)
  useEffect(() => {
    (async () => {
      const [savedTree, savedSettings] = await Promise.all([loadFileTree(), loadSettings()]);
      if (savedTree && savedTree.length > 0) setFiles(savedTree);
      if (savedSettings) setSettings(savedSettings);
      setLoaded(true);
    })();
  }, []);

  // 파일 트리 변경 → IndexedDB 자동 저장 (디바운스)
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { saveFileTree(files); }, 1000);
    return () => clearTimeout(t);
  }, [files, loaded]);

  // 설정 변경 → IndexedDB 자동 저장
  useEffect(() => {
    if (!loaded) return;
    saveSettings(settings);
  }, [settings, loaded]);

  // xterm 초기화 + 명령 처리
  useEffect(() => {
    if (!showTerminal || !termRef.current) return;
    let term: import("@xterm/xterm").Terminal | null = null;
    let mounted = true;
    let cmdBuffer = "";

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
            result.stages.forEach((s) => {
              const icon = s.status === "pass" ? "\x1b[32m✓\x1b[0m" : s.status === "warn" ? "\x1b[33m⚠\x1b[0m" : "\x1b[31m✗\x1b[0m";
              t.writeln(`  ${icon} ${s.name}: ${s.score}/100 — ${s.message}`);
            });
            t.writeln(`  \x1b[36mOverall: ${result.overallScore}/100 (${result.overallStatus})\x1b[0m`);
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
      term.writeln("\x1b[32m╔══════════════════════════════════════╗\x1b[0m");
      term.writeln("\x1b[32m║  EH Code Studio Terminal v1.0       ║\x1b[0m");
      term.writeln("\x1b[32m╚══════════════════════════════════════╝\x1b[0m");
      term.writeln("  Type \x1b[36mhelp\x1b[0m for commands");
      term.write("\x1b[32m$ \x1b[0m");

      term.onData((data) => {
        if (!term) return;
        if (data === "\r") {
          term.writeln("");
          processCommand(cmdBuffer, term);
          cmdBuffer = "";
          term.write("\x1b[32m$ \x1b[0m");
        } else if (data === "\x7f" || data === "\b") {
          if (cmdBuffer.length > 0) {
            cmdBuffer = cmdBuffer.slice(0, -1);
            term.write("\b \b");
          }
        } else if (data === "\x03") {
          // Ctrl+C
          cmdBuffer = "";
          term.writeln("^C");
          term.write("\x1b[32m$ \x1b[0m");
        } else if (data >= " ") {
          cmdBuffer += data;
          term.write(data);
        }
      });

      const ro = new ResizeObserver(() => fit.fit());
      if (termRef.current) ro.observe(termRef.current);
    })();
    return () => { mounted = false; term?.dispose(); };
  }, [showTerminal, files, openFiles, activeFileId]);

  // 파일 선택
  const handleFileSelect = useCallback((node: FileNode) => {
    if (node.type === "folder") return;
    if (!openFiles.find((f) => f.id === node.id)) {
      setOpenFiles((prev) => [...prev, { id: node.id, name: node.name, content: node.content ?? "", language: detectLanguage(node.name) }]);
    }
    setActiveFileId(node.id);
  }, [openFiles]);

  // 탭 닫기
  const handleCloseTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFileId === id) setActiveFileId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  }, [activeFileId]);

  // 에디터 변경
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeFileId || value === undefined) return;
    setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content: value, isDirty: true } : f));
  }, [activeFileId]);

  // 파일 CRUD
  const handleNewFile = useCallback(() => {
    if (!newFileName.trim()) { setShowNewFile(true); return; }
    const id = `file-${Date.now()}`;
    const newFile: FileNode = { id, name: newFileName.trim(), type: "file", content: "" };
    setFiles((prev) => addFileToTree(prev, "src", newFile));
    setNewFileName("");
    setShowNewFile(false);
    // 새 파일 바로 열기
    setOpenFiles((prev) => [...prev, { id, name: newFileName.trim(), content: "", language: detectLanguage(newFileName.trim()) }]);
    setActiveFileId(id);
  }, [newFileName]);

  const handleDelete = useCallback((id: string) => {
    setFiles((prev) => deleteFromTree(prev, id));
    setOpenFiles((prev) => prev.filter((f) => f.id !== id));
    if (activeFileId === id) setActiveFileId(null);
  }, [activeFileId]);

  const handleRename = useCallback((id: string, name: string) => {
    setFiles((prev) => renameInTree(prev, id, name));
    setOpenFiles((prev) => prev.map((f) => f.id === id ? { ...f, name, language: detectLanguage(name) } : f));
  }, []);

  // AI 코드 적용
  const handleApplyCode = useCallback((code: string) => {
    if (!activeFileId) return;
    setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content: code, isDirty: true } : f));
  }, [activeFileId]);

  // 파이프라인 실제 정적 분석 (파일 변경 시 1초 디바운스)
  useEffect(() => {
    if (!activeFile?.isDirty) return;
    const timer = setTimeout(() => {
      const result = runStaticPipeline(activeFile.content, activeFile.language);
      setPipelineStages(result.stages);
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeFile?.isDirty, activeFile?.content]);

  return (
    <div className="flex h-full w-full bg-bg-primary text-text-primary">
      {/* Left — File Explorer */}
      <div className="flex w-56 shrink-0 flex-col border-r border-white/8 bg-bg-secondary">
        <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
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

      {/* Center — Editor + Terminal */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Tab Bar */}
        <div className="flex items-center border-b border-white/8 bg-bg-secondary">
          <div className="flex flex-1 overflow-x-auto">
            {openFiles.map((f) => (
              <button key={f.id} onClick={() => setActiveFileId(f.id)}
                className={`group flex items-center gap-2 border-r border-white/8 px-3 py-1.5 text-[12px] font-[family-name:var(--font-mono)] transition-colors ${
                  f.id === activeFileId ? "bg-bg-primary text-text-primary border-t-2 border-t-accent-green" : "text-text-tertiary hover:bg-white/[0.04]"
                }`}>
                {f.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-accent-amber" />}
                {f.name}
                <span onClick={(e) => handleCloseTab(f.id, e)} className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10"><X className="h-3 w-3" /></span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 px-2">
            <button onClick={() => setShowTerminal(!showTerminal)} className={`rounded p-1.5 transition-colors ${showTerminal ? "text-accent-green" : "text-text-tertiary"}`} title="Terminal"><TermIcon className="h-4 w-4" /></button>
            <button onClick={() => setRightPanel(rightPanel === "chat" ? null : "chat")} className={`rounded p-1.5 transition-colors ${rightPanel === "chat" ? "text-accent-purple" : "text-text-tertiary"}`} title="AI Chat"><MessageSquare className="h-4 w-4" /></button>
            <button onClick={() => setRightPanel(rightPanel === "pipeline" ? null : "pipeline")} className={`rounded p-1.5 transition-colors ${rightPanel === "pipeline" ? "text-accent-blue" : "text-text-tertiary"}`} title="Pipeline"><Activity className="h-4 w-4" /></button>
            <button className="rounded p-1.5 text-text-tertiary hover:text-text-secondary" title="Run"><Play className="h-4 w-4" /></button>
            <button onClick={() => setShowSettings(!showSettings)} className={`rounded p-1.5 transition-colors ${showSettings ? "text-accent-amber" : "text-text-tertiary hover:text-text-secondary"}`} title="Settings"><Settings className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Settings Panel (overlay) */}
        {showSettings && (
          <div className="border-b border-white/8 bg-bg-secondary px-4 py-3">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase text-text-tertiary">Font Size</label>
                <input type="number" min={10} max={24} value={settings.fontSize}
                  onChange={(e) => setSettings((s) => ({ ...s, fontSize: parseInt(e.target.value) || 14 }))}
                  className="w-14 rounded border border-white/8 bg-black/30 px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase text-text-tertiary">Tab Size</label>
                <select value={settings.tabSize}
                  onChange={(e) => setSettings((s) => ({ ...s, tabSize: parseInt(e.target.value) }))}
                  className="rounded border border-white/8 bg-black/30 px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none">
                  <option value={2}>2</option><option value={4}>4</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase text-text-tertiary">Word Wrap</label>
                <button
                  onClick={() => setSettings((s) => ({ ...s, wordWrap: s.wordWrap === "on" ? "off" : "on" }))}
                  className={`rounded border px-2 py-1 font-[family-name:var(--font-mono)] text-[10px] ${settings.wordWrap === "on" ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "border-white/8 text-text-tertiary"}`}>
                  {settings.wordWrap}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase text-text-tertiary">Minimap</label>
                <button
                  onClick={() => setSettings((s) => ({ ...s, minimap: !s.minimap }))}
                  className={`rounded border px-2 py-1 font-[family-name:var(--font-mono)] text-[10px] ${settings.minimap ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "border-white/8 text-text-tertiary"}`}>
                  {settings.minimap ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Editor + Right Panel */}
        <div className="flex flex-1 min-h-0">
          {/* Editor */}
          <div className="flex-1 min-w-0">
            {activeFile ? (
              <MonacoEditor
                height="100%" language={activeFile.language} value={activeFile.content}
                onChange={handleEditorChange} theme="vs-dark"
                options={{
                  fontSize: settings.fontSize, tabSize: settings.tabSize, wordWrap: settings.wordWrap,
                  minimap: { enabled: settings.minimap }, scrollBeyondLastLine: false, padding: { top: 12 },
                  fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
                  lineNumbers: "on", renderLineHighlight: "line",
                  bracketPairColorization: { enabled: true }, smoothScrolling: true,
                  cursorBlinking: "smooth", cursorSmoothCaretAnimation: "on",
                }}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  // Ghost Text: AI 인라인 완성 등록 (전 언어)
                  registerGhostTextProvider(monaco);
                  // 에디터 해제 시 Ghost Text 취소
                  editor.onDidDispose(() => cancelGhostText());
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 inline-block rounded-full border border-accent-green/20 bg-accent-green/8 p-4"><Files className="h-8 w-8 text-accent-green" /></div>
                  <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-text-tertiary">Select a file to start editing</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel */}
          {rightPanel && (
            <div className="w-80 shrink-0 border-l border-white/8 bg-bg-secondary">
              {rightPanel === "chat" && <AIChatPanel activeFile={activeFile} onApplyCode={handleApplyCode} />}
              {rightPanel === "pipeline" && <PipelinePanel stages={pipelineStages} />}
            </div>
          )}
        </div>

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

        {/* Status Bar */}
        <div className="flex items-center justify-between border-t border-white/8 bg-bg-secondary px-3 py-0.5">
          <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent-green" />Ready</span>
            {activeFile && <span>{activeFile.language}</span>}
            <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" />NOA</span>
          </div>
          <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
            {pipelineStages.length > 0 && (
              <span className="flex items-center gap-1">
                <Activity className="h-2.5 w-2.5" />
                {pipelineStages.filter((s) => s.status === "pass").length}/{pipelineStages.length} pass
              </span>
            )}
            <span>{openFiles.length} files</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=ImportsState | inputs=none | outputs=state,refs
// IDENTITY_SEAL: PART-2 | role=DemoFiles | inputs=none | outputs=FileNode[]
// IDENTITY_SEAL: PART-3 | role=ChatTypes | inputs=none | outputs=ChatMsg
// IDENTITY_SEAL: PART-4 | role=FileTree | inputs=node,depth | outputs=UI+CRUD
// IDENTITY_SEAL: PART-5 | role=AIChatPanel | inputs=activeFile | outputs=chat+NOA
// IDENTITY_SEAL: PART-6 | role=PipelinePanel | inputs=stages | outputs=UI
// IDENTITY_SEAL: PART-7 | role=TreeHelpers | inputs=tree,id | outputs=FileNode[]
// IDENTITY_SEAL: PART-8 | role=MainShell | inputs=none | outputs=IDE layout
