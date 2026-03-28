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
  Search, GitBranch, Upload, Bug, Command, Columns2,
} from "lucide-react";
import type { FileNode, OpenFile, CodeStudioSettings } from "@/lib/code-studio-types";
import { DEFAULT_SETTINGS, detectLanguage, fileIconColor } from "@/lib/code-studio-types";
import { streamChat, getApiKey, setApiKey, getActiveProvider, setActiveProvider } from "@/lib/ai-providers";
import { runNoa } from "@/lib/noa";
import { saveFileTree, loadFileTree, saveSettings, loadSettings, saveChatSession, listChatSessions, type StoredChatSession } from "@/lib/code-studio-store";
import { registerGhostTextProvider, cancelGhostText } from "@/lib/code-studio-ghost";
import { runStaticPipeline } from "@/lib/code-studio-pipeline";
import type { NoaResult } from "@/lib/noa/types";
import { searchCode, replaceAll as searchReplaceAll, type SearchResult } from "@/lib/code-studio-search";
import { findBugsStatic, findBugs, type BugReport } from "@/lib/code-studio-bugfinder";
import { runAutopilot, type AutopilotPlan } from "@/lib/code-studio-autopilot";
import { runAgentPipeline, createAgentSession, type AgentMessage, type AgentSession } from "@/lib/code-studio-agents";

import { ToastProvider, useToast } from "@/components/code-studio/ToastSystem";
import WelcomeScreen from "@/components/code-studio/WelcomeScreen";

// Lazy-loaded panels
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/code-studio/CommandPalette"), { ssr: false });
const DiffViewer = dynamic(() => import("@/components/code-studio/DiffViewer"), { ssr: false });
const GitPanel = dynamic(() => import("@/components/code-studio/GitPanel"), { ssr: false });
const DeployPanel = dynamic(() => import("@/components/code-studio/DeployPanel"), { ssr: false });
// MobileLayout imported but rendered via CSS responsive, not component swap

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
          <div key={m.id} className={`flex gap-2 cs-chat-bubble ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[12px] leading-relaxed ${
              m.role === "user"
                ? "bg-accent-purple/20 text-text-primary border border-accent-purple/10"
                : "bg-white/[0.04] text-text-secondary border border-white/6"
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
// PART 6B — Bug Panel (inline)
// ============================================================

function BugPanel({ bugs, onRunAI }: { bugs: BugReport[]; onRunAI?: () => void }) {
  const severityColor: Record<string, string> = { critical: "text-accent-red", high: "text-accent-red", medium: "text-accent-amber", low: "text-accent-blue", info: "text-text-tertiary" };
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Bug className="h-4 w-4 text-accent-red" />
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Bug Finder</span>
        <span className="ml-auto rounded-full bg-accent-red/20 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-accent-red">{bugs.length}</span>
        {onRunAI && <button onClick={onRunAI} className="ml-1 rounded bg-accent-purple/20 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[9px] text-accent-purple hover:bg-accent-purple/30">AI Scan</button>}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {bugs.length === 0 && <div className="text-center py-8 text-text-tertiary text-[11px] font-[family-name:var(--font-mono)]">No bugs detected. Edit code to trigger analysis.</div>}
        {bugs.map((b) => (
          <div key={b.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <span className={`font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase ${severityColor[b.severity] ?? "text-text-tertiary"}`}>{b.severity}</span>
              <span className="text-[10px] text-text-tertiary">L{b.line}</span>
              <span className="rounded bg-white/8 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] text-text-tertiary">{b.category}</span>
            </div>
            <div className="mt-1 text-[11px] text-text-primary">{b.description}</div>
            <div className="mt-1 text-[10px] text-accent-green">{b.suggestion}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PART 6C — Search Panel (inline)
// ============================================================

function SearchPanel({ files, onFileOpen, onReplace }: { files: FileNode[]; onFileOpen: (fileId: string) => void; onReplace?: (newFiles: FileNode[]) => void }) {
  const [query, setQuery] = useState("");
  const [replace, setReplace] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showReplace, setShowReplace] = useState(false);

  const handleSearch = useCallback(() => {
    if (!query.trim()) { setResults([]); return; }
    const r = searchCode(query, files, { maxResults: 50 });
    setResults(r);
  }, [query, files]);

  const handleReplaceAll = useCallback(() => {
    if (!query.trim() || !onReplace) return;
    const newFiles = searchReplaceAll(query, replace, files);
    onReplace(newFiles);
    setResults([]);
  }, [query, replace, files, onReplace]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Search className="h-4 w-4 text-accent-amber" />
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Search</span>
        <button onClick={() => setShowReplace(!showReplace)} className="ml-auto font-[family-name:var(--font-mono)] text-[9px] text-text-tertiary hover:text-text-primary">
          {showReplace ? "Hide Replace" : "Replace"}
        </button>
      </div>
      <div className="px-3 py-2 border-b border-white/8 space-y-1.5">
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          placeholder="Search in files..."
          className="w-full rounded border border-white/8 bg-black/30 px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none focus:border-accent-amber/30" />
        {showReplace && (
          <div className="flex gap-1">
            <input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Replace with..."
              className="flex-1 rounded border border-white/8 bg-black/30 px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none focus:border-accent-green/30" />
            <button onClick={handleReplaceAll} className="rounded bg-accent-green/20 px-2 py-1 font-[family-name:var(--font-mono)] text-[9px] text-accent-green hover:bg-accent-green/30">All</button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {results.length === 0 && query && <div className="text-center py-4 text-text-tertiary text-[10px]">No results</div>}
        {results.map((r, i) => (
          <button key={i} onClick={() => onFileOpen(r.fileId)}
            className="w-full text-left rounded px-2 py-1.5 hover:bg-white/[0.06] transition-colors">
            <div className="font-[family-name:var(--font-mono)] text-[10px] text-accent-amber">{r.fileName}:{r.line}</div>
            <div className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary truncate">{r.lineContent}</div>
          </button>
        ))}
        {results.length > 0 && <div className="text-center text-[10px] text-text-tertiary">{results.length} results</div>}
      </div>
    </div>
  );
}

// ============================================================
// PART 6D — Autopilot Panel
// ============================================================

function AutopilotPanel({ activeFile, onApplyCode, onShowDiff }: {
  activeFile: OpenFile | null;
  onApplyCode: (code: string) => void;
  onShowDiff: (orig: string, mod: string, name: string) => void;
}) {
  const [task, setTask] = useState("");
  const [plan, setPlan] = useState<AutopilotPlan | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async () => {
    if (!task.trim() || running) return;
    setRunning(true);
    try {
      const context = activeFile ? `File: ${activeFile.name}\n\`\`\`${activeFile.language}\n${activeFile.content.slice(0, 2000)}\n\`\`\`` : "No file open";
      const result = await runAutopilot(task, context, (p) => setPlan({ ...p }));
      setPlan(result);
      // 마지막 스텝 출력을 Apply
      const lastOutput = result.steps.filter(s => s.output).pop()?.output;
      if (lastOutput && activeFile) {
        onShowDiff(activeFile.content, lastOutput, activeFile.name);
      }
    } catch { /* */ }
    setRunning(false);
  }, [task, running, activeFile, onShowDiff]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Play className="h-4 w-4 text-accent-amber" />
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Autopilot</span>
      </div>
      <div className="px-3 py-2 border-b border-white/8">
        <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={3} placeholder="Describe what you want to build..."
          className="w-full rounded border border-white/8 bg-black/30 px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none resize-none focus:border-accent-amber/30" />
        <button onClick={handleRun} disabled={running || !task.trim()}
          className="mt-2 w-full rounded bg-accent-amber/20 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-accent-amber hover:bg-accent-amber/30 disabled:opacity-30">
          {running ? "Running..." : "Run Autopilot"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!plan && <div className="text-center py-8 text-text-tertiary text-[11px] font-[family-name:var(--font-mono)]">Describe a task. Autopilot will plan and execute in multiple steps.</div>}
        {plan?.steps.map((s) => (
          <div key={s.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-2">
            <div className="flex items-center gap-2">
              {s.status === "done" ? <CheckCircle className="h-3 w-3 text-accent-green" /> : s.status === "running" ? <Loader2 className="h-3 w-3 text-accent-amber animate-spin" /> : <Activity className="h-3 w-3 text-text-tertiary" />}
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-primary">{s.description}</span>
            </div>
            {s.output && <pre className="mt-1 text-[9px] text-text-tertiary overflow-x-auto max-h-20 overflow-y-auto">{s.output.slice(0, 200)}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PART 6E — Agent Panel
// ============================================================

function AgentPanel({ activeFile }: { activeFile: OpenFile | null }) {
  const [task, setTask] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [running, setRunning] = useState(false);

  const roleColors: Record<string, string> = { architect: "text-accent-purple", developer: "text-accent-green", reviewer: "text-accent-amber", tester: "text-accent-blue", documenter: "text-text-secondary" };

  const handleRun = useCallback(async () => {
    if (!task.trim() || running) return;
    setRunning(true);
    setMessages([]);
    const context = activeFile ? `File: ${activeFile.name}\n${activeFile.content.slice(0, 2000)}` : "";
    try {
      await runAgentPipeline(task, context, ["architect", "developer", "reviewer"], (msg) => setMessages((prev) => [...prev, msg]));
    } catch { /* */ }
    setRunning(false);
  }, [task, running, activeFile]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Shield className="h-4 w-4 text-accent-purple" />
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Agents</span>
      </div>
      <div className="px-3 py-2 border-b border-white/8">
        <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Task for agents..."
          onKeyDown={(e) => { if (e.key === "Enter") handleRun(); }}
          className="w-full rounded border border-white/8 bg-black/30 px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none focus:border-accent-purple/30" />
        <button onClick={handleRun} disabled={running || !task.trim()}
          className="mt-2 w-full rounded bg-accent-purple/20 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-accent-purple hover:bg-accent-purple/30 disabled:opacity-30">
          {running ? "Agents working..." : "Run Agent Pipeline"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && <div className="text-center py-8 text-text-tertiary text-[11px] font-[family-name:var(--font-mono)]">Architect → Developer → Reviewer pipeline. Enter a task to start.</div>}
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-2">
            <div className={`font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase ${roleColors[m.role] ?? "text-text-tertiary"}`}>{m.role}</div>
            <pre className="mt-1 text-[10px] text-text-secondary whitespace-pre-wrap max-h-32 overflow-y-auto">{m.content}</pre>
          </div>
        ))}
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

/** 파일 트리에서 특정 파일의 content를 업데이트 */
function updateContentInTree(tree: FileNode[], id: string, content: string): FileNode[] {
  return tree.map((n) => {
    if (n.id === id) return { ...n, content };
    if (n.children) return { ...n, children: updateContentInTree(n.children, id, content) };
    return n;
  });
}

// ============================================================
// PART 8 — Main Shell
// ============================================================

type RightPanel = "chat" | "pipeline" | "git" | "deploy" | "bugs" | "search" | "autopilot" | "agents" | null;

function CodeStudioShellInner() {
  const { toast } = useToast();
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
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [autopilotPlan, setAutopilotPlan] = useState<AutopilotPlan | null>(null);
  const [agentSession, setAgentSession] = useState<AgentSession | null>(null);
  const [diffState, setDiffState] = useState<{ original: string; modified: string; fileName: string } | null>(null);
  const [replaceText, setReplaceText] = useState("");
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [hasEverOpened, setHasEverOpened] = useState(false);
  // Split Editor state
  const [splitFileId, setSplitFileId] = useState<string | null>(null);
  // Tab Drag-and-Drop state
  const [dragTabIdx, setDragTabIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const editorRef = useRef<unknown>(null);
  const termRef = useRef<HTMLDivElement>(null);

  const activeFile = openFiles.find((f) => f.id === activeFileId) ?? null;
  const splitFile = splitFileId ? (openFiles.find((f) => f.id === splitFileId) ?? null) : null;

  // Split editor change handler
  const handleSplitEditorChange = useCallback((value: string | undefined) => {
    if (!splitFileId || value === undefined) return;
    setOpenFiles((prev) => prev.map((f) => f.id === splitFileId ? { ...f, content: value, isDirty: true } : f));
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

  // 키보드 단축키 (전역)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      // Ctrl+Shift+P → 커맨드 팔레트
      if (mod && e.shiftKey && e.key === "P") { e.preventDefault(); setShowCommandPalette((v) => !v); }
      // Ctrl+Shift+F → 검색 패널
      if (mod && e.shiftKey && e.key === "F") { e.preventDefault(); setRightPanel((v) => v === "search" ? null : "search"); }
      // Ctrl+S → 파일 저장 (dirty 해제 + IndexedDB 저장)
      if (mod && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        if (activeFileId) {
          setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, isDirty: false } : f));
          saveFileTree(files);
          toast("Saved locally in this browser", "success");
        }
      }
      // Ctrl+= / Ctrl+- → 줌
      if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); setSettings((s) => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) })); }
      if (mod && e.key === "-") { e.preventDefault(); setSettings((s) => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) })); }
      // Ctrl+` → 터미널 토글
      if (mod && e.key === "`") { e.preventDefault(); setShowTerminal((v) => !v); }
      // Ctrl+N → 새 파일
      if (mod && e.key === "n" && !e.shiftKey) { e.preventDefault(); setShowNewFile(true); }
      // Ctrl+W → 탭 닫기
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
  }, [activeFileId, files, toast]);

  // 버그 분석 (파일 변경 시)
  useEffect(() => {
    if (!activeFile?.isDirty) return;
    const t = setTimeout(() => {
      const bugs = findBugsStatic(activeFile.content, activeFile.language);
      setBugReports(bugs);
    }, 1500);
    return () => clearTimeout(t);
  }, [activeFile?.isDirty, activeFile?.content, activeFile?.language]);

  // xterm 초기화 + 명령 처리
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
          if (cmdBuffer.trim()) { cmdHistory.push(cmdBuffer); historyIdx = cmdHistory.length; }
          processCommand(cmdBuffer, term);
          cmdBuffer = "";
          term.write("\x1b[32m$ \x1b[0m");
        } else if (data === "\x7f" || data === "\b") {
          if (cmdBuffer.length > 0) {
            cmdBuffer = cmdBuffer.slice(0, -1);
            term.write("\b \b");
          }
        } else if (data === "\x03") {
          cmdBuffer = "";
          term.writeln("^C");
          term.write("\x1b[32m$ \x1b[0m");
        } else if (data === "\x1b[A") {
          // Up arrow — 히스토리 이전
          if (historyIdx > 0) {
            historyIdx--;
            const old = cmdBuffer;
            cmdBuffer = cmdHistory[historyIdx];
            term.write("\r\x1b[K\x1b[32m$ \x1b[0m" + cmdBuffer);
          }
        } else if (data === "\x1b[B") {
          // Down arrow — 히스토리 다음
          if (historyIdx < cmdHistory.length - 1) {
            historyIdx++;
            cmdBuffer = cmdHistory[historyIdx];
            term.write("\r\x1b[K\x1b[32m$ \x1b[0m" + cmdBuffer);
          } else {
            historyIdx = cmdHistory.length;
            cmdBuffer = "";
            term.write("\r\x1b[K\x1b[32m$ \x1b[0m");
          }
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
    setHasEverOpened(true);
  }, [openFiles]);

  // 탭 닫기
  const handleCloseTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // 에디터 변경 → openFiles + files 트리 양쪽 동기화
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeFileId || value === undefined) return;
    setOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content: value, isDirty: true } : f));
    // files 트리에도 반영 (IndexedDB 저장 대상)
    setFiles((prev) => updateContentInTree(prev, activeFileId, value));
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
    setHasEverOpened(true);
    toast("File created", "success");
  }, [newFileName, toast]);

  const handleDelete = useCallback((id: string) => {
    setFiles((prev) => deleteFromTree(prev, id));
    setOpenFiles((prev) => prev.filter((f) => f.id !== id));
    if (activeFileId === id) setActiveFileId(null);
    toast("File deleted", "info");
  }, [activeFileId, toast]);

  const handleRename = useCallback((id: string, name: string) => {
    setFiles((prev) => renameInTree(prev, id, name));
    setOpenFiles((prev) => prev.map((f) => f.id === id ? { ...f, name, language: detectLanguage(name) } : f));
  }, []);

  // 데모 파일 열기 (Welcome → Open Demo)
  const handleOpenDemo = useCallback(() => {
    setFiles(DEMO_FILES);
    // index.ts 자동 열기
    const indexFile: FileNode = { id: "index-ts", name: "index.ts", type: "file", content: DEMO_FILES[0]?.children?.[0]?.children?.[0]?.content ?? "" };
    setOpenFiles([{ id: indexFile.id, name: indexFile.name, content: indexFile.content ?? "", language: detectLanguage(indexFile.name) }]);
    setActiveFileId(indexFile.id);
    setHasEverOpened(true);
    toast("Demo project loaded", "success");
  }, [toast]);

  // Welcome → Blank Project (README only)
  const handleBlankProject = useCallback(() => {
    const blankFiles: FileNode[] = [
      {
        id: "root", name: "project", type: "folder",
        children: [
          { id: "readme", name: "README.md", type: "file", content: "# New Project\n\nDescribe your project here.\n" },
        ],
      },
    ];
    setFiles(blankFiles);
    setOpenFiles([{ id: "readme", name: "README.md", content: "# New Project\n\nDescribe your project here.\n", language: "markdown" }]);
    setActiveFileId("readme");
    setHasEverOpened(true);
    toast("Blank project created", "success");
  }, [toast]);

  // Welcome → New File
  const handleWelcomeNewFile = useCallback(() => {
    setShowNewFile(true);
    setHasEverOpened(true);
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
      const passed = result.stages.filter((s) => s.status === "pass").length;
      toast(`Pipeline: ${passed}/${result.stages.length} passed`, passed === result.stages.length ? "success" : "info");
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeFile?.isDirty, activeFile?.content, toast]);

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

      {/* Resize Handle */}
      <div className="cs-resize-handle" />

      {/* Center — Editor + Terminal */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Breadcrumb */}
        {activeFile && (
          <div className="flex items-center gap-1 border-b border-white/8 bg-bg-secondary px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
            <span className="text-accent-amber">project</span>
            <ChevronRight className="h-2.5 w-2.5" />
            <span>src</span>
            <ChevronRight className="h-2.5 w-2.5" />
            <span className={fileIconColor(activeFile.name)}>{activeFile.name}</span>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex items-center border-b border-white/8 bg-bg-secondary">
          <div className="flex flex-1 overflow-x-auto">
            {openFiles.map((f, idx) => (
              <button key={f.id}
                draggable
                onDragStart={() => setDragTabIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDrop={() => { if (dragTabIdx !== null) { handleTabDrop(dragTabIdx, idx); } setDragTabIdx(null); setDragOverIdx(null); }}
                onDragEnd={() => { setDragTabIdx(null); setDragOverIdx(null); }}
                onClick={() => setActiveFileId(f.id)}
                className={`group flex items-center gap-2 border-r border-white/8 px-3 py-1.5 text-[12px] font-[family-name:var(--font-mono)] transition-colors ${
                  f.id === activeFileId ? "bg-bg-primary text-text-primary border-t-2 border-t-accent-green" : "text-text-tertiary hover:bg-white/[0.04]"
                } ${dragTabIdx === idx ? "opacity-50" : ""} ${dragOverIdx === idx && dragTabIdx !== idx ? "border-l-2 border-l-accent-green" : ""}`}>
                {f.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-accent-amber" />}
                {f.name}
                <span onClick={(e) => handleCloseTab(f.id, e)} className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10"><X className="h-3 w-3" /></span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 px-2">
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
            <button onClick={() => setRightPanel(rightPanel === "chat" ? null : "chat")} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${rightPanel === "chat" ? "text-accent-purple" : "text-text-tertiary"}`} title="AI Chat"><MessageSquare className="h-4 w-4" /></button>
            <button onClick={() => setRightPanel(rightPanel === "pipeline" ? null : "pipeline")} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${rightPanel === "pipeline" ? "text-accent-blue" : "text-text-tertiary"}`} title="Pipeline"><Activity className="h-4 w-4" /></button>
            <button onClick={() => setRightPanel(rightPanel === "search" ? null : "search")} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${rightPanel === "search" ? "text-accent-amber" : "text-text-tertiary"}`} title="Search (Ctrl+Shift+F)"><Search className="h-4 w-4" /></button>
            <button onClick={() => setRightPanel(rightPanel === "bugs" ? null : "bugs")} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${rightPanel === "bugs" ? "text-accent-red" : "text-text-tertiary"}`} title="Bug Finder">
              <Bug className="h-4 w-4" />
              {bugReports.length > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent-red text-[8px] text-white flex items-center justify-center">{bugReports.length}</span>}
            </button>
            <button onClick={() => setRightPanel(rightPanel === "git" ? null : "git")} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${rightPanel === "git" ? "text-accent-purple" : "text-text-tertiary"}`} title="Git"><GitBranch className="h-4 w-4" /></button>
            <button onClick={() => setRightPanel(rightPanel === "deploy" ? null : "deploy")} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${rightPanel === "deploy" ? "text-accent-green" : "text-text-tertiary"}`} title="Deploy"><Upload className="h-4 w-4" /></button>
            <button onClick={() => setRightPanel(rightPanel === "autopilot" ? null : "autopilot")} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${rightPanel === "autopilot" ? "text-accent-amber" : "text-text-tertiary"}`} title="Autopilot"><Play className="h-4 w-4" /></button>
            <button onClick={() => setShowCommandPalette(true)} className="rounded p-1.5 transition-all duration-150 active:scale-95 text-text-tertiary hover:text-text-secondary" title="Commands (Ctrl+Shift+P)"><Command className="h-4 w-4" /></button>
            <button onClick={() => { if (showSettings) toast("Settings saved", "success"); setShowSettings(!showSettings); }} className={`rounded p-1.5 transition-all duration-150 active:scale-95 ${showSettings ? "text-accent-amber" : "text-text-tertiary hover:text-text-secondary"}`} title="Settings"><Settings className="h-4 w-4" /></button>
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
              {/* AI Provider + API Key */}
              <div className="flex items-center gap-1 border-l border-white/8 pl-4 ml-2">
                <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase text-text-tertiary">AI</label>
                <select
                  value={getActiveProvider()}
                  onChange={(e) => { setActiveProvider(e.target.value as Parameters<typeof setActiveProvider>[0]); toast("Provider changed", "info"); }}
                  className="rounded border border-white/8 bg-black/30 px-2 py-1 font-[family-name:var(--font-mono)] text-[10px] text-text-primary outline-none">
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude</option>
                  <option value="groq">Groq</option>
                  <option value="mistral">Mistral</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase text-text-tertiary">Key</label>
                <input
                  type="password"
                  placeholder="API Key"
                  defaultValue={getApiKey(getActiveProvider()) ? "••••••••" : ""}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val && val !== "••••••••") {
                      setApiKey(getActiveProvider(), val);
                      toast("API key saved", "success");
                    }
                  }}
                  className="w-32 rounded border border-white/8 bg-black/30 px-2 py-1 font-[family-name:var(--font-mono)] text-[10px] text-text-primary outline-none focus:border-accent-purple/30"
                />
                {getApiKey(getActiveProvider()) && (
                  <span className="h-2 w-2 rounded-full bg-accent-green" title="API key set" />
                )}
              </div>
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
                    registerGhostTextProvider(monaco);
                    editor.onDidDispose(() => cancelGhostText());
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
                  {/* Split tab header */}
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

          {/* Right Panel */}
          {rightPanel && (
            <div className="w-80 shrink-0 border-l border-white/8 bg-bg-secondary overflow-hidden cs-panel-enter">
              {rightPanel === "chat" && <AIChatPanel activeFile={activeFile} onApplyCode={handleApplyCode} />}
              {rightPanel === "pipeline" && <PipelinePanel stages={pipelineStages} />}
              {rightPanel === "git" && <GitPanel files={files} openFiles={openFiles} onRestore={(fid, content) => setOpenFiles((prev) => prev.map((f) => f.id === fid ? { ...f, content, isDirty: true } : f))} />}
              {rightPanel === "deploy" && <DeployPanel files={files} language="EN" />}
              {rightPanel === "bugs" && <BugPanel bugs={bugReports} onRunAI={async () => {
                if (!activeFile) return;
                const aiBugs = await findBugs(activeFile.content, activeFile.language, activeFile.name);
                setBugReports((prev) => [...prev, ...aiBugs]);
              }} />}
              {rightPanel === "autopilot" && <AutopilotPanel activeFile={activeFile} onApplyCode={handleApplyCode} onShowDiff={(orig, mod, name) => setDiffState({ original: orig, modified: mod, fileName: name })} />}
              {rightPanel === "agents" && <AgentPanel activeFile={activeFile} />}
              {rightPanel === "search" && <SearchPanel files={files} onReplace={(newFiles) => setFiles(newFiles)} onFileOpen={(fid) => {
                const findFile = (nodes: FileNode[]): FileNode | null => { for (const n of nodes) { if (n.id === fid) return n; if (n.children) { const f = findFile(n.children); if (f) return f; } } return null; };
                const node = findFile(files);
                if (node && node.type === "file") { handleFileSelect(node); }
              }} />}
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

        {/* Command Palette */}
        {showCommandPalette && (
          <CommandPalette
            open={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onExecute={(cmdId) => {
              setShowCommandPalette(false);
              switch (cmdId) {
                case "new-file": setShowNewFile(true); break;
                case "toggle-terminal": setShowTerminal((v) => !v); break;
                case "toggle-chat": setRightPanel((v) => v === "chat" ? null : "chat"); break;
                case "toggle-pipeline": setRightPanel((v) => v === "pipeline" ? null : "pipeline"); break;
                case "toggle-git": setRightPanel((v) => v === "git" ? null : "git"); break;
                case "toggle-deploy": setRightPanel((v) => v === "deploy" ? null : "deploy"); break;
                case "toggle-search": setRightPanel((v) => v === "search" ? null : "search"); break;
                case "toggle-bugs": setRightPanel((v) => v === "bugs" ? null : "bugs"); break;
                case "toggle-autopilot": setRightPanel((v) => v === "autopilot" ? null : "autopilot"); break;
                case "toggle-agents": setRightPanel((v) => v === "agents" ? null : "agents"); break;
                case "toggle-settings": setShowSettings((v) => !v); break;
              }
            }}
            commands={[
              { id: "new-file", label: "New File", shortcut: "Ctrl+N", category: "File" },
              { id: "toggle-terminal", label: "Toggle Terminal", shortcut: "Ctrl+`", category: "View" },
              { id: "toggle-chat", label: "Toggle AI Chat", category: "View" },
              { id: "toggle-pipeline", label: "Toggle Pipeline", category: "View" },
              { id: "toggle-git", label: "Toggle Git", category: "View" },
              { id: "toggle-deploy", label: "Toggle Deploy", category: "View" },
              { id: "toggle-search", label: "Search in Files", shortcut: "Ctrl+Shift+F", category: "Edit" },
              { id: "toggle-bugs", label: "Toggle Bug Finder", category: "Tools" },
              { id: "toggle-autopilot", label: "Autopilot (Multi-step AI)", category: "Tools" },
              { id: "toggle-agents", label: "Agent Pipeline (Architect→Dev→Review)", category: "Tools" },
              { id: "toggle-settings", label: "Toggle Settings", category: "View" },
            ]}
          />
        )}

        {/* Status Bar */}
        <div className="flex items-center justify-between border-t border-white/8 bg-bg-secondary px-3 py-0.5">
          <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent-green" />Ready</span>
            {activeFile && <span className={fileIconColor(activeFile.name)}>{activeFile.language}</span>}
            <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" />NOA</span>
          </div>
          <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
            {activeFile && <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>}
            {activeFile && <span>{activeFile.content.split("\n").length} lines</span>}
            {pipelineStages.length > 0 && (
              <span className="flex items-center gap-1">
                <Activity className="h-2.5 w-2.5" />
                {pipelineStages.filter((s) => s.status === "pass").length}/{pipelineStages.length} pass
              </span>
            )}
            {bugReports.length > 0 && <span className="text-accent-red">{bugReports.length} bugs</span>}
            <span>{openFiles.length} files</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PART 9 — Export Wrapper (ToastProvider)
// ============================================================

export default function CodeStudioShell() {
  return (
    <ToastProvider>
      <CodeStudioShellInner />
    </ToastProvider>
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
// IDENTITY_SEAL: PART-9 | role=ExportWrapper | inputs=none | outputs=ToastProvider+Shell
