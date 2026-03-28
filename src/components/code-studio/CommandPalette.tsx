"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, FileCode, Terminal, Settings, Zap, MessageSquare, Bot, Layers, Code2, Bug } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface PaletteCommand {
  id: string;
  label: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface Props {
  commands: PaletteCommand[];
  onClose: () => void;
}

const RECENT_COMMANDS_KEY = "csl_recent_commands";
const MAX_RECENT = 5;

function loadRecentCommands(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_COMMANDS_KEY) ?? "[]"); } catch { return []; }
}

function saveRecentCommand(id: string): void {
  if (typeof window === "undefined") return;
  const recent = loadRecentCommands().filter((r) => r !== id);
  recent.unshift(id);
  try { localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT))); } catch {}
}

/** Fuzzy match: each char of query must appear in order in target. */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let consecutive = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutive++;
      score += consecutive;
    } else {
      consecutive = 0;
    }
  }
  return { match: qi === q.length, score };
}

export function CommandPalette({ commands, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const recentIds = useMemo(() => loadRecentCommands(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands at top, then the rest
      const recent = recentIds.map((id) => commands.find((c) => c.id === id)).filter(Boolean) as PaletteCommand[];
      const rest = commands.filter((c) => !recentIds.includes(c.id));
      return [...recent, ...rest];
    }
    // Fuzzy search: match by any substring in label or category
    const scored = commands.map((c) => {
      const labelResult = fuzzyMatch(query, c.label);
      const catResult = fuzzyMatch(query, c.category);
      const bestScore = Math.max(labelResult.score, catResult.score);
      const matched = labelResult.match || catResult.match;
      return { cmd: c, score: bestScore, matched };
    }).filter((x) => x.matched);
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.cmd);
  }, [query, commands, recentIds]);

  const [prevFiltered, setPrevFiltered] = useState(filtered);
  if (prevFiltered !== filtered) {
    setPrevFiltered(filtered);
    setSelectedIdx(0);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && filtered[selectedIdx]) { saveRecentCommand(filtered[selectedIdx].id); filtered[selectedIdx].action(); onClose(); }
    else if (e.key === "Escape") onClose();
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="명령 팔레트" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-[500px] max-h-[400px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
          <Search size={14} className="text-[var(--text-secondary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="명령 검색…"
            aria-label="명령 검색"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {/* Command List */}
        <div ref={listRef} className="overflow-y-auto max-h-[340px]">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-[var(--text-secondary)]">일치하는 명령 없음</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => { saveRecentCommand(cmd.id); cmd.action(); onClose(); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors ${
                  i === selectedIdx ? "bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]" : "hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <span className="text-[var(--text-secondary)] w-4">{cmd.icon}</span>
                <span className="flex-1 text-left">
                  {recentIds.includes(cmd.id) && !query.trim() && <span className="text-[9px] mr-1 text-[var(--accent-yellow)]">recent</span>}
                  {cmd.label}
                </span>
                <Badge variant="default" size="sm">{cmd.category}</Badge>
                {cmd.shortcut && (
                  <kbd className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded border border-[var(--border)]">{cmd.shortcut}</kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Default command factory ──

export function buildDefaultCommands(actions: {
  toggleTerminal: () => void;
  toggleChat: () => void;
  toggleAgent: () => void;
  toggleComposer?: () => void;
  toggleCanvas: () => void;
  togglePipeline: () => void;
  toggleSidebar?: () => void;
  openKeybindings?: () => void;
  openOutline?: () => void;
  openSymbolPalette?: () => void;
  newFile?: () => void;
  openSettings?: () => void;
  runPipeline?: () => void;
  formatDocument?: () => void;
  runBugFinder?: () => void;
  toggleProblems?: () => void;
}): PaletteCommand[] {
  return [
    { id: "toggle-terminal", label: "터미널 토글", category: "뷰", icon: <Terminal size={12} />, shortcut: "Ctrl+`", action: actions.toggleTerminal },
    { id: "toggle-chat", label: "AI 채팅 열기", category: "AI", icon: <MessageSquare size={12} />, shortcut: "Ctrl+K", action: actions.toggleChat },
    { id: "toggle-agent", label: "AI 에이전트 열기", category: "AI", icon: <Bot size={12} />, shortcut: "Ctrl+I", action: actions.toggleAgent },
    { id: "toggle-canvas", label: "캔버스 토글", category: "뷰", icon: <Layers size={12} />, action: actions.toggleCanvas },
    { id: "toggle-pipeline", label: "파이프라인 토글", category: "뷰", icon: <Zap size={12} />, action: actions.togglePipeline },
    ...(actions.newFile ? [{ id: "new-file", label: "새 파일 생성", category: "파일", icon: <FileCode size={12} />, shortcut: "Ctrl+N", action: actions.newFile }] : []),
    ...(actions.openSettings ? [{ id: "open-settings", label: "설정 열기", category: "설정", icon: <Settings size={12} />, action: actions.openSettings }] : []),
    ...(actions.runPipeline ? [{ id: "run-pipeline", label: "파이프라인 실행", category: "AI", icon: <Code2 size={12} />, shortcut: "Ctrl+Shift+Enter", action: actions.runPipeline }] : []),
    ...(actions.runBugFinder ? [{ id: "run-bug-finder", label: "Bug Finder 실행", category: "AI", icon: <Bug size={12} />, action: actions.runBugFinder }] : []),
    ...(actions.toggleProblems ? [{ id: "toggle-problems", label: "Problems 패널 토글", category: "뷰", icon: <Bug size={12} />, action: actions.toggleProblems }] : []),
  ];
}
