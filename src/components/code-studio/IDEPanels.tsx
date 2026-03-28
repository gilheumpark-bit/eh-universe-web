"use client";

// ============================================================
// PART 1 — Imports & Shared Types
// ============================================================

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Files,
  Search,
  GitBranch,
  Bug,
  Play,
  Upload,
  MessageSquare,
  Activity,
  Settings,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  CheckCircle,
  Package,
  Eye,
  Keyboard,
  Loader2,
  FileCode,
  Braces,
  BoxSelect,
  ArrowRightFromLine,
  Hash,
  Type,
} from "lucide-react";
import type { FileNode } from "@/lib/code-studio-types";

/** Problems panel entry */
export interface ProblemEntry {
  file: string;
  line: number;
  message: string;
  severity: "error" | "warning" | "info";
}

/** Toast notification */
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

/** Parsed symbol for outline/symbol palette */
interface ParsedSymbol {
  name: string;
  kind: "function" | "class" | "export" | "interface" | "type" | "const" | "variable";
  line: number;
}

// IDENTITY_SEAL: PART-1 | role=Imports | inputs=none | outputs=ProblemEntry,Toast,ParsedSymbol

// ============================================================
// PART 2 — Utility: Code Symbol Parser
// ============================================================

function parseSymbols(code: string, language: string): ParsedSymbol[] {
  if (!code) return [];
  const symbols: ParsedSymbol[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // function declarations
    const fnMatch = trimmed.match(
      /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/
    );
    if (fnMatch) {
      symbols.push({ name: fnMatch[1], kind: "function", line: lineNum });
      continue;
    }

    // arrow function const
    const arrowMatch = trimmed.match(
      /^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/
    );
    if (arrowMatch) {
      symbols.push({ name: arrowMatch[1], kind: "function", line: lineNum });
      continue;
    }

    // class declarations
    const classMatch = trimmed.match(/^(?:export\s+)?class\s+(\w+)/);
    if (classMatch) {
      symbols.push({ name: classMatch[1], kind: "class", line: lineNum });
      continue;
    }

    // interface declarations
    const ifaceMatch = trimmed.match(/^(?:export\s+)?interface\s+(\w+)/);
    if (ifaceMatch) {
      symbols.push({ name: ifaceMatch[1], kind: "interface", line: lineNum });
      continue;
    }

    // type alias
    const typeMatch = trimmed.match(/^(?:export\s+)?type\s+(\w+)\s*=/);
    if (typeMatch) {
      symbols.push({ name: typeMatch[1], kind: "type", line: lineNum });
      continue;
    }

    // export const (non-function)
    const constMatch = trimmed.match(
      /^export\s+(?:const|let|var)\s+(\w+)\s*[=:]/
    );
    if (constMatch && !arrowMatch) {
      symbols.push({ name: constMatch[1], kind: "const", line: lineNum });
      continue;
    }

    // export default
    if (trimmed.startsWith("export default")) {
      symbols.push({ name: "default", kind: "export", line: lineNum });
      continue;
    }

    // Python: def / class
    if (language === "python" || language === "py") {
      const pyDef = trimmed.match(/^(?:async\s+)?def\s+(\w+)/);
      if (pyDef) {
        symbols.push({ name: pyDef[1], kind: "function", line: lineNum });
        continue;
      }
      const pyCls = trimmed.match(/^class\s+(\w+)/);
      if (pyCls) {
        symbols.push({ name: pyCls[1], kind: "class", line: lineNum });
      }
    }
  }

  return symbols;
}

const SYMBOL_ICON_MAP: Record<ParsedSymbol["kind"], { icon: typeof Braces; color: string }> = {
  function: { icon: Braces, color: "text-accent-purple" },
  class: { icon: BoxSelect, color: "text-accent-amber" },
  export: { icon: ArrowRightFromLine, color: "text-accent-green" },
  interface: { icon: Type, color: "text-accent-blue" },
  type: { icon: Hash, color: "text-cyan-400" },
  const: { icon: FileCode, color: "text-accent-amber" },
  variable: { icon: FileCode, color: "text-text-secondary" },
};

// IDENTITY_SEAL: PART-2 | role=SymbolParser | inputs=code,language | outputs=ParsedSymbol[]

// ============================================================
// PART 3 — ActivityBar
// ============================================================

const ACTIVITY_ITEMS: { id: string; icon: typeof Files; label: string }[] = [
  { id: "files", icon: Files, label: "Explorer" },
  { id: "search", icon: Search, label: "Search" },
  { id: "git", icon: GitBranch, label: "Source Control" },
  { id: "debug", icon: Bug, label: "Debug" },
  { id: "run", icon: Play, label: "Run" },
  { id: "deploy", icon: Upload, label: "Deploy" },
  { id: "chat", icon: MessageSquare, label: "AI Chat" },
  { id: "activity", icon: Activity, label: "Activity" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function ActivityBar({
  activePanel,
  onPanelChange,
}: {
  activePanel: string;
  onPanelChange: (panel: string) => void;
}) {
  return (
    <div className="flex h-full w-12 flex-col items-center border-r border-border/20 bg-bg-primary py-2">
      {ACTIVITY_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activePanel === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPanelChange(item.id)}
            title={item.label}
            className={`group relative mb-0.5 flex h-10 w-10 items-center justify-center rounded transition-colors ${
              isActive
                ? "bg-accent-green/10 text-accent-green"
                : "text-text-tertiary hover:bg-white/5 hover:text-text-secondary"
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent-green" />
            )}
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=ActivityBar | inputs=activePanel,onPanelChange | outputs=JSX

// ============================================================
// PART 4 — OutlinePanel
// ============================================================

export function OutlinePanel({
  code,
  language,
  onJump,
}: {
  code: string;
  language: string;
  onJump: (line: number) => void;
}) {
  const symbols = useMemo(() => parseSymbols(code, language), [code, language]);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(
    () =>
      filter
        ? symbols.filter((s) =>
            s.name.toLowerCase().includes(filter.toLowerCase())
          )
        : symbols,
    [symbols, filter]
  );

  if (!code) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-text-tertiary">
        No file open
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-bg-secondary text-text-primary">
      <div className="border-b border-border/20 px-3 py-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter symbols..."
          className="w-full rounded bg-bg-primary/50 px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] text-text-primary outline-none placeholder:text-text-tertiary focus:ring-1 focus:ring-accent-green/40"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filtered.length === 0 ? (
          <div className="px-2 py-4 text-center text-[11px] text-text-tertiary">
            No symbols found
          </div>
        ) : (
          filtered.map((sym, idx) => {
            const meta = SYMBOL_ICON_MAP[sym.kind];
            const Icon = meta.icon;
            return (
              <button
                key={`${sym.name}-${sym.line}-${idx}`}
                onClick={() => onJump(sym.line)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors hover:bg-white/5"
              >
                <Icon size={12} className={`shrink-0 ${meta.color}`} />
                <span className="truncate font-[family-name:var(--font-mono)]">
                  {sym.name}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-text-tertiary">
                  :{sym.line}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=OutlinePanel | inputs=code,language,onJump | outputs=JSX

// ============================================================
// PART 5 — ProblemsPanel
// ============================================================

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, color: "text-accent-red", bg: "bg-accent-red/10" },
  warning: { icon: AlertTriangle, color: "text-accent-amber", bg: "bg-accent-amber/10" },
  info: { icon: Info, color: "text-accent-blue", bg: "bg-accent-blue/10" },
} as const;

export function ProblemsPanel({ problems }: { problems: ProblemEntry[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, ProblemEntry[]> = {};
    for (const p of problems) {
      if (!map[p.file]) map[p.file] = [];
      map[p.file].push(p);
    }
    return map;
  }, [problems]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (file: string) =>
    setExpanded((prev) => ({ ...prev, [file]: !prev[file] }));

  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warnCount = problems.filter((p) => p.severity === "warning").length;

  return (
    <div className="flex h-full flex-col bg-bg-secondary text-text-primary">
      <div className="flex items-center gap-3 border-b border-border/20 px-3 py-2 text-[11px]">
        <span className="font-semibold uppercase tracking-wider text-text-secondary">
          Problems
        </span>
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-accent-red">
            <AlertCircle size={11} /> {errorCount}
          </span>
        )}
        {warnCount > 0 && (
          <span className="flex items-center gap-1 text-accent-amber">
            <AlertTriangle size={11} /> {warnCount}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <CheckCircle size={24} className="mb-2 text-accent-green" />
            <span className="text-[11px]">No problems detected</span>
          </div>
        ) : (
          Object.entries(grouped).map(([file, entries]) => (
            <div key={file}>
              <button
                onClick={() => toggle(file)}
                className="flex w-full items-center gap-1 px-2 py-1 text-left text-[11px] font-medium text-text-secondary hover:bg-white/5"
              >
                {expanded[file] !== false ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                <span className="truncate font-[family-name:var(--font-mono)]">
                  {file}
                </span>
                <span className="ml-auto rounded-full bg-bg-primary px-1.5 text-[10px] text-text-tertiary">
                  {entries.length}
                </span>
              </button>
              {expanded[file] !== false &&
                entries.map((entry, idx) => {
                  const cfg = SEVERITY_CONFIG[entry.severity];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={`${entry.file}-${entry.line}-${idx}`}
                      className="flex items-start gap-2 px-6 py-1 text-[11px] hover:bg-white/5"
                    >
                      <Icon size={12} className={`mt-0.5 shrink-0 ${cfg.color}`} />
                      <span className="flex-1 text-text-secondary">{entry.message}</span>
                      <span className="shrink-0 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
                        Ln {entry.line}
                      </span>
                    </div>
                  );
                })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=ProblemsPanel | inputs=problems | outputs=JSX

// ============================================================
// PART 6 — QuickOpen (Ctrl+P)
// ============================================================

export function QuickOpen({
  files,
  open,
  onClose,
  onSelect,
}: {
  files: FileNode[];
  open: boolean;
  onClose: () => void;
  onSelect: (fileId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten file tree
  const flatFiles = useMemo(() => {
    const result: { id: string; name: string; path: string }[] = [];
    function walk(nodes: FileNode[], prefix: string) {
      for (const n of nodes) {
        const path = prefix ? `${prefix}/${n.name}` : n.name;
        if (n.type === "file") {
          result.push({ id: n.id, name: n.name, path });
        }
        if (n.children) walk(n.children, path);
      }
    }
    walk(files, "");
    return result;
  }, [files]);

  const filtered = useMemo(
    () =>
      query
        ? flatFiles.filter(
            (f) =>
              f.name.toLowerCase().includes(query.toLowerCase()) ||
              f.path.toLowerCase().includes(query.toLowerCase())
          )
        : flatFiles,
    [flatFiles, query]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && filtered.length > 0) {
        onSelect(filtered[0].id);
        onClose();
      }
    },
    [filtered, onClose, onSelect]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-border/30 bg-bg-primary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border/20 px-3 py-2">
          <Search size={14} className="text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name..."
            className="flex-1 bg-transparent font-[family-name:var(--font-mono)] text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <kbd className="rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-tertiary">
            ESC
          </kbd>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-[11px] text-text-tertiary">
              No matching files
            </div>
          ) : (
            filtered.slice(0, 20).map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  onSelect(f.id);
                  onClose();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-accent-green/10"
              >
                <FileCode size={13} className="shrink-0 text-text-tertiary" />
                <span className="font-[family-name:var(--font-mono)] text-text-primary">
                  {f.name}
                </span>
                <span className="ml-auto truncate text-[10px] text-text-tertiary">
                  {f.path}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-6 | role=QuickOpen | inputs=files,open,onClose,onSelect | outputs=JSX

// ============================================================
// PART 7 — SymbolPalette (Ctrl+Shift+O)
// ============================================================

export function SymbolPalette({
  code,
  language,
  open,
  onClose,
  onJump,
}: {
  code: string;
  language: string;
  open: boolean;
  onClose: () => void;
  onJump: (line: number) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const symbols = useMemo(() => parseSymbols(code, language), [code, language]);

  const filtered = useMemo(
    () =>
      query
        ? symbols.filter((s) =>
            s.name.toLowerCase().includes(query.toLowerCase())
          )
        : symbols,
    [symbols, query]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && filtered.length > 0) {
        onJump(filtered[0].line);
        onClose();
      }
    },
    [filtered, onClose, onJump]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-border/30 bg-bg-primary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border/20 px-3 py-2">
          <span className="text-[13px] text-accent-purple">@</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Go to symbol..."
            className="flex-1 bg-transparent font-[family-name:var(--font-mono)] text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <kbd className="rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-tertiary">
            ESC
          </kbd>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-[11px] text-text-tertiary">
              No symbols found
            </div>
          ) : (
            filtered.slice(0, 30).map((sym, idx) => {
              const meta = SYMBOL_ICON_MAP[sym.kind];
              const Icon = meta.icon;
              return (
                <button
                  key={`${sym.name}-${sym.line}-${idx}`}
                  onClick={() => {
                    onJump(sym.line);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-accent-purple/10"
                >
                  <Icon size={13} className={`shrink-0 ${meta.color}`} />
                  <span className="font-[family-name:var(--font-mono)] text-text-primary">
                    {sym.name}
                  </span>
                  <span className="rounded bg-bg-secondary px-1 text-[9px] text-text-tertiary">
                    {sym.kind}
                  </span>
                  <span className="ml-auto text-[10px] text-text-tertiary">
                    :{sym.line}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-7 | role=SymbolPalette | inputs=code,language,open,onClose,onJump | outputs=JSX

// ============================================================
// PART 8 — PackagePanel
// ============================================================

interface DepEntry {
  name: string;
  version: string;
  isDev: boolean;
}

export function PackagePanel({ packageJson }: { packageJson: string }) {
  const deps = useMemo<DepEntry[]>(() => {
    if (!packageJson) return [];
    try {
      const parsed = JSON.parse(packageJson);
      const result: DepEntry[] = [];
      if (parsed.dependencies) {
        for (const [name, ver] of Object.entries(parsed.dependencies)) {
          result.push({ name, version: ver as string, isDev: false });
        }
      }
      if (parsed.devDependencies) {
        for (const [name, ver] of Object.entries(parsed.devDependencies)) {
          result.push({ name, version: ver as string, isDev: true });
        }
      }
      return result;
    } catch {
      return [];
    }
  }, [packageJson]);

  const [showDev, setShowDev] = useState(true);

  const filtered = showDev ? deps : deps.filter((d) => !d.isDev);

  return (
    <div className="flex h-full flex-col bg-bg-secondary text-text-primary">
      <div className="flex items-center gap-2 border-b border-border/20 px-3 py-2">
        <Package size={13} className="text-accent-amber" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Dependencies
        </span>
        <button
          onClick={() => setShowDev(!showDev)}
          className={`ml-auto rounded px-1.5 py-0.5 text-[10px] transition-colors ${
            showDev
              ? "bg-accent-purple/15 text-accent-purple"
              : "bg-bg-primary/50 text-text-tertiary"
          }`}
        >
          dev
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] text-text-tertiary">
            {packageJson ? "No dependencies" : "No package.json loaded"}
          </div>
        ) : (
          filtered.map((dep) => (
            <div
              key={dep.name}
              className="flex items-center gap-2 px-3 py-1 text-[11px] hover:bg-white/5"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  dep.isDev ? "bg-accent-purple" : "bg-accent-green"
                }`}
              />
              <span className="truncate font-[family-name:var(--font-mono)] text-text-primary">
                {dep.name}
              </span>
              <span className="ml-auto shrink-0 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
                {dep.version}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-8 | role=PackagePanel | inputs=packageJson | outputs=JSX

// ============================================================
// PART 9 — PreviewPanel
// ============================================================

export function PreviewPanel({ html }: { html: string }) {
  const iframeSrc = useMemo(() => {
    if (!html) return "";
    const blob = new Blob([html], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [html]);

  useEffect(() => {
    return () => {
      if (iframeSrc) URL.revokeObjectURL(iframeSrc);
    };
  }, [iframeSrc]);

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-secondary text-[11px] text-text-tertiary">
        <Eye size={16} className="mr-2 text-text-tertiary" />
        No preview available
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-bg-secondary">
      <div className="flex items-center gap-2 border-b border-border/20 px-3 py-1.5">
        <Eye size={13} className="text-accent-blue" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Preview
        </span>
      </div>
      <div className="flex-1">
        <iframe
          src={iframeSrc}
          title="Preview"
          sandbox="allow-scripts"
          className="h-full w-full border-none bg-white"
        />
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-9 | role=PreviewPanel | inputs=html | outputs=JSX

// ============================================================
// PART 10 — ToastManager
// ============================================================

const TOAST_STYLE = {
  success: { icon: CheckCircle, color: "text-accent-green", border: "border-accent-green/30", bg: "bg-accent-green/10" },
  error: { icon: AlertCircle, color: "text-accent-red", border: "border-accent-red/30", bg: "bg-accent-red/10" },
  info: { icon: Info, color: "text-accent-blue", border: "border-accent-blue/30", bg: "bg-accent-blue/10" },
} as const;

export function ToastManager({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => {
        const style = TOAST_STYLE[toast.type];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-lg border ${style.border} ${style.bg} px-3 py-2 shadow-lg backdrop-blur-sm`}
          >
            <Icon size={14} className={style.color} />
            <span className="max-w-xs text-[12px] text-text-primary">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-2 rounded p-0.5 text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-primary"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// IDENTITY_SEAL: PART-10 | role=ToastManager | inputs=toasts,onDismiss | outputs=JSX

// ============================================================
// PART 11 — ProgressBar
// ============================================================

export function ProgressBar({
  progress,
  label,
}: {
  progress: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      {clamped < 100 && (
        <Loader2 size={12} className="shrink-0 animate-spin text-accent-amber" />
      )}
      {clamped >= 100 && (
        <CheckCircle size={12} className="shrink-0 text-accent-green" />
      )}
      <div className="flex-1">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="text-[11px] text-text-secondary">{label}</span>
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
            {Math.round(clamped)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-primary">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              clamped >= 100 ? "bg-accent-green" : "bg-accent-amber"
            }`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-11 | role=ProgressBar | inputs=progress,label | outputs=JSX

// ============================================================
// PART 12 — ConfirmDialog
// ============================================================

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border/30 bg-bg-primary p-4 shadow-2xl">
        <h3 className="mb-2 text-[14px] font-semibold text-text-primary">{title}</h3>
        <p className="mb-4 text-[12px] leading-relaxed text-text-secondary">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-[12px] text-text-secondary transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-accent-red/15 px-3 py-1.5 text-[12px] font-medium text-accent-red transition-colors hover:bg-accent-red/25"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-12 | role=ConfirmDialog | inputs=open,title,message,onConfirm,onCancel | outputs=JSX

// ============================================================
// PART 13 — InputDialog
// ============================================================

export function InputDialog({
  open,
  title,
  placeholder,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  title: string;
  placeholder: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && value.trim()) {
      onSubmit(value.trim());
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border/30 bg-bg-primary p-4 shadow-2xl">
        <h3 className="mb-3 text-[14px] font-semibold text-text-primary">{title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="mb-4 w-full rounded border border-border/20 bg-bg-secondary px-3 py-2 font-[family-name:var(--font-mono)] text-[12px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-green/40"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-[12px] text-text-secondary transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => value.trim() && onSubmit(value.trim())}
            disabled={!value.trim()}
            className="rounded bg-accent-green/15 px-3 py-1.5 text-[12px] font-medium text-accent-green transition-colors hover:bg-accent-green/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-13 | role=InputDialog | inputs=open,title,placeholder,onSubmit,onCancel | outputs=JSX

// ============================================================
// PART 14 — ErrorOverlay
// ============================================================

export function ErrorOverlay({
  error,
  onDismiss,
}: {
  error: string;
  onDismiss: () => void;
}) {
  if (!error) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-accent-red/30 bg-bg-primary p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-accent-red" />
          <h3 className="text-[16px] font-semibold text-accent-red">Error</h3>
        </div>
        <pre className="mb-4 max-h-60 overflow-auto rounded bg-accent-red/5 p-3 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed text-text-secondary">
          {error}
        </pre>
        <div className="flex justify-end">
          <button
            onClick={onDismiss}
            className="rounded bg-accent-red/15 px-4 py-2 text-[12px] font-medium text-accent-red transition-colors hover:bg-accent-red/25"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-14 | role=ErrorOverlay | inputs=error,onDismiss | outputs=JSX

// ============================================================
// PART 15 — ShortcutOverlay
// ============================================================

const SHORTCUTS: { category: string; items: { keys: string; action: string }[] }[] = [
  {
    category: "General",
    items: [
      { keys: "Ctrl+S", action: "Save file" },
      { keys: "Ctrl+Z", action: "Undo" },
      { keys: "Ctrl+Shift+Z", action: "Redo" },
      { keys: "Ctrl+P", action: "Quick open file" },
      { keys: "Ctrl+Shift+P", action: "Command palette" },
      { keys: "Ctrl+,", action: "Settings" },
    ],
  },
  {
    category: "Editor",
    items: [
      { keys: "Ctrl+D", action: "Select next occurrence" },
      { keys: "Ctrl+/", action: "Toggle comment" },
      { keys: "Alt+Up/Down", action: "Move line up/down" },
      { keys: "Ctrl+Shift+K", action: "Delete line" },
      { keys: "Ctrl+L", action: "Select line" },
    ],
  },
  {
    category: "Navigation",
    items: [
      { keys: "Ctrl+Shift+O", action: "Go to symbol" },
      { keys: "Ctrl+G", action: "Go to line" },
      { keys: "Ctrl+B", action: "Toggle sidebar" },
      { keys: "Ctrl+J", action: "Toggle terminal" },
      { keys: "Ctrl+`", action: "Toggle AI chat" },
    ],
  },
  {
    category: "AI & Build",
    items: [
      { keys: "Ctrl+Enter", action: "Send AI message" },
      { keys: "Ctrl+Shift+B", action: "Build project" },
      { keys: "Ctrl+Shift+D", action: "Deploy" },
      { keys: "Ctrl+Shift+G", action: "Git panel" },
    ],
  },
];

export function ShortcutOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-lg border border-border/30 bg-bg-primary p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-accent-green" />
            <h3 className="text-[14px] font-semibold text-text-primary">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {SHORTCUTS.map((cat) => (
            <div key={cat.category}>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-accent-purple">
                {cat.category}
              </h4>
              <div className="space-y-1">
                {cat.items.map((item) => (
                  <div
                    key={item.keys}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-text-secondary">{item.action}</span>
                    <kbd className="rounded bg-bg-secondary px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
                      {item.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-15 | role=ShortcutOverlay | inputs=open,onClose | outputs=JSX

// ============================================================
// PART 16 — SkeletonLoader
// ============================================================

export function SkeletonLoader({ lines }: { lines: number }) {
  const widths = useMemo(() => {
    const pool = [60, 75, 90, 45, 80, 55, 70, 85, 50, 65];
    return Array.from({ length: lines }, (_, i) => pool[i % pool.length]);
  }, [lines]);

  return (
    <div className="flex flex-col gap-2 p-3">
      {widths.map((w, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded bg-white/[0.06]"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-16 | role=SkeletonLoader | inputs=lines | outputs=JSX
