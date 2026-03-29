"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useCallback } from "react";
import { FileText, Send, Check, X, ChevronDown, ChevronRight, Loader2, Eye, RefreshCw } from "lucide-react";
import type { FileNode } from "@/lib/code-studio-types";
import { fileIconColor } from "@/lib/code-studio-types";
import type { ComposerMode } from "@/lib/code-studio-composer-state";

export interface FileChange {
  fileId: string;
  fileName: string;
  original: string;
  modified: string;
  status: "pending" | "accepted" | "rejected";
}

interface ComposerPanelProps {
  files: FileNode[];
  /** Current state-machine mode (optional for backward compat) */
  composerMode?: ComposerMode;
  onCompose: (fileIds: string[], instruction: string) => Promise<FileChange[]>;
  onApplyChanges: (changes: FileChange[]) => void;
  onPreviewDiff?: (change: FileChange) => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=FileChange

// ============================================================
// PART 2 — File Selector
// ============================================================

function flattenFiles(nodes: FileNode[], prefix = ""): Array<{ id: string; path: string }> {
  const result: Array<{ id: string; path: string }> = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === "file") result.push({ id: node.id, path });
    if (node.children) result.push(...flattenFiles(node.children, path));
  }
  return result;
}

function FileSelector({
  files,
  selectedIds,
  onToggle,
}: {
  files: Array<{ id: string; path: string }>;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = filter
    ? files.filter((f) => f.path.toLowerCase().includes(filter.toLowerCase()))
    : files;

  return (
    <div className="border-b border-white/5">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter files..."
        className="w-full border-b border-white/5 bg-transparent px-3 py-1.5 text-xs text-white outline-none placeholder:text-gray-600"
      />
      <div className="max-h-40 overflow-y-auto">
        {filtered.map((f) => (
          <label
            key={f.id}
            className="flex items-center gap-2 px-3 py-1 text-xs text-gray-300 hover:bg-white/5 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(f.id)}
              onChange={() => onToggle(f.id)}
              className="rounded border-white/20"
            />
            <FileText size={12} className={fileIconColor(f.path)} />
            <span className="truncate">{f.path}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=FileSelector | inputs=files,selectedIds | outputs=JSX

// ============================================================
// PART 3 — Change Preview Card
// ============================================================

function ChangeCard({
  change,
  onAccept,
  onReject,
  onPreview,
}: {
  change: FileChange;
  onAccept: () => void;
  onReject: () => void;
  onPreview?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const linesChanged = change.modified.split("\n").length - change.original.split("\n").length;

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setExpanded(!expanded)} className="text-gray-500">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <FileText size={14} className={fileIconColor(change.fileName)} />
        <span className="flex-1 truncate text-sm text-gray-300">{change.fileName}</span>
        <span className={`text-[10px] ${linesChanged >= 0 ? "text-green-400" : "text-red-400"}`}>
          {linesChanged >= 0 ? `+${linesChanged}` : linesChanged} lines
        </span>
        {change.status === "pending" && (
          <div className="flex items-center gap-1">
            {onPreview && (
              <button onClick={onPreview} className="p-1 text-gray-500 hover:text-blue-400" title="Preview diff">
                <Eye size={14} />
              </button>
            )}
            <button onClick={onAccept} className="p-1 text-gray-500 hover:text-green-400" title="Accept">
              <Check size={14} />
            </button>
            <button onClick={onReject} className="p-1 text-gray-500 hover:text-red-400" title="Reject">
              <X size={14} />
            </button>
          </div>
        )}
        {change.status === "accepted" && <Check size={14} className="text-green-400" />}
        {change.status === "rejected" && <X size={14} className="text-red-400" />}
      </div>
      {expanded && (
        <div className="border-t border-white/5 px-3 py-2">
          <pre className="max-h-48 overflow-auto text-[11px] text-gray-400 font-mono whitespace-pre-wrap">
            {change.modified.slice(0, 2000)}
            {change.modified.length > 2000 && "\n... (truncated)"}
          </pre>
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=ChangeCard | inputs=FileChange | outputs=JSX

// ============================================================
// PART 4 — Main Composer Panel
// ============================================================

export default function ComposerPanel({
  files,
  composerMode,
  onCompose,
  onApplyChanges,
  onPreviewDiff,
}: ComposerPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [instruction, setInstruction] = useState("");
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [composing, setComposing] = useState(false);

  // Derive disabled state from state machine when available
  const isGenerating = composerMode ? composerMode === 'generating' : composing;

  const allFiles = flattenFiles(files);

  const toggleFile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCompose = useCallback(async () => {
    if (selectedIds.size === 0 || !instruction.trim()) return;
    setComposing(true);
    try {
      const result = await onCompose(Array.from(selectedIds), instruction);
      setChanges(result);
    } catch { /* handled upstream */ }
    finally { setComposing(false); }
  }, [selectedIds, instruction, onCompose]);

  const updateChangeStatus = (index: number, status: "accepted" | "rejected") => {
    setChanges((prev) => prev.map((c, i) => (i === index ? { ...c, status } : c)));
  };

  const applyAll = () => {
    const accepted = changes.filter((c) => c.status === "accepted");
    if (accepted.length > 0) onApplyChanges(accepted);
  };

  const acceptedCount = changes.filter((c) => c.status === "accepted").length;
  const pendingCount = changes.filter((c) => c.status === "pending").length;

  return (
    <div className="flex h-full flex-col bg-[#16161e]">
      <div className="border-b border-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
        Multi-file Composer
      </div>

      <FileSelector files={allFiles} selectedIds={selectedIds} onToggle={toggleFile} />

      {/* Instruction */}
      <div className="border-b border-white/5 p-3">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={3}
          placeholder="Describe the changes you want across these files..."
          className="w-full resize-none rounded border border-white/10 bg-[#12121a] px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 placeholder:text-gray-600"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-600">{selectedIds.size} file(s) selected</span>
          <button
            onClick={handleCompose}
            disabled={composing || selectedIds.size === 0 || !instruction.trim()}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {composing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Compose
          </button>
        </div>
      </div>

      {/* Changes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {changes.map((c, i) => (
          <ChangeCard
            key={`${c.fileId}-${i}`}
            change={c}
            onAccept={() => updateChangeStatus(i, "accepted")}
            onReject={() => updateChangeStatus(i, "rejected")}
            onPreview={onPreviewDiff ? () => onPreviewDiff(c) : undefined}
          />
        ))}
      </div>

      {/* Actions */}
      {changes.length > 0 && (
        <div className="border-t border-white/5 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {acceptedCount} accepted, {pendingCount} pending
          </span>
          <button
            onClick={applyAll}
            disabled={acceptedCount === 0}
            className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
          >
            <Check size={12} />
            Apply Accepted ({acceptedCount})
          </button>
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=ComposerPanelUI | inputs=files,instruction | outputs=FileChange[],JSX
