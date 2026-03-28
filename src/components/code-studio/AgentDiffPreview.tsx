"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useCallback, useMemo } from "react";
import {
  Check, X, ChevronLeft, ChevronRight, FileCode, Plus, Minus, Edit3,
  CheckCircle, XCircle, AlertCircle,
} from "lucide-react";

export interface FileChangePreview {
  filePath: string;
  original: string;
  modified: string;
  language: string;
  status: "added" | "modified" | "deleted";
}

interface AgentDiffPreviewProps {
  changes: FileChangePreview[];
  onAccept: (accepted: FileChangePreview[]) => void;
  onReject: () => void;
  onPartialAccept?: (accepted: FileChangePreview[], rejected: FileChangePreview[]) => void;
}

// IDENTITY_SEAL: PART-1 | role=타입 정의 | inputs=none | outputs=FileChangePreview, AgentDiffPreviewProps

// ============================================================
// PART 2 — AgentDiffPreview Component
// ============================================================

export default function AgentDiffPreview({ changes, onAccept, onReject, onPartialAccept }: AgentDiffPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<string, "accept" | "reject" | "pending">>(
    () => new Map(changes.map((c) => [c.filePath, "pending"])),
  );
  const [showDiff, setShowDiff] = useState(true);

  const selected = changes[selectedIndex] ?? null;

  const stats = useMemo(() => {
    let added = 0, removed = 0, modified = 0;
    for (const c of changes) {
      if (c.status === "added") added++;
      else if (c.status === "deleted") removed++;
      else modified++;
    }
    const totalLinesAdded = changes.reduce((sum, c) => c.status === "deleted" ? sum : sum + c.modified.split("\n").length, 0);
    const totalLinesRemoved = changes.reduce((sum, c) => c.status === "added" ? sum : sum + c.original.split("\n").length, 0);
    return { added, removed, modified, totalLinesAdded, totalLinesRemoved };
  }, [changes]);

  const acceptedCount = useMemo(() => Array.from(decisions.values()).filter((d) => d === "accept").length, [decisions]);
  const rejectedCount = useMemo(() => Array.from(decisions.values()).filter((d) => d === "reject").length, [decisions]);

  const handleDecision = useCallback((filePath: string, decision: "accept" | "reject") => {
    setDecisions((prev) => { const next = new Map(prev); next.set(filePath, decision); return next; });
  }, []);

  const handleAcceptAll = useCallback(() => { onAccept(changes); }, [changes, onAccept]);
  const handleRejectAll = useCallback(() => { onReject(); }, [onReject]);

  const handleApplyDecisions = useCallback(() => {
    const accepted = changes.filter((c) => decisions.get(c.filePath) !== "reject");
    const rejected = changes.filter((c) => decisions.get(c.filePath) === "reject");
    if (onPartialAccept && rejected.length > 0) { onPartialAccept(accepted, rejected); }
    else { onAccept(accepted); }
  }, [changes, decisions, onAccept, onPartialAccept]);

  const handlePrev = useCallback(() => { setSelectedIndex((i) => Math.max(0, i - 1)); }, []);
  const handleNext = useCallback(() => { setSelectedIndex((i) => Math.min(changes.length - 1, i + 1)); }, [changes.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); handleNext(); }
    else if (e.key === "Tab" && e.shiftKey) { e.preventDefault(); handlePrev(); }
    else if (e.key === "Enter" && selected) { handleDecision(selected.filePath, "accept"); handleNext(); }
    else if (e.key === "Escape") { onReject(); }
  }, [handleNext, handlePrev, handleDecision, selected, onReject]);

  return (
    <div
      className="fixed inset-0 z-[300] flex bg-black/60"
      onKeyDown={handleKeyDown} tabIndex={0}
      style={{ animation: "fadeIn 0.15s ease-out" }}
    >
      <div className="flex flex-col w-full max-w-[1200px] mx-auto my-4 bg-[#0a0e17] rounded-xl shadow-2xl overflow-hidden border border-white/10"
        style={{ animation: "slideIn 0.2s ease-out" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <AlertCircle size={16} className="text-amber-400" />
            <span className="text-sm font-semibold">Agent Changes Review</span>
            <span className="text-xs text-text-secondary">{changes.length} files changed</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAcceptAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-500/15 text-green-400 rounded-lg hover:bg-green-500/25">
              <CheckCircle size={12} /> Accept All
            </button>
            <button onClick={handleRejectAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25">
              <XCircle size={12} /> Reject All
            </button>
            <button onClick={onReject} className="p-1 hover:bg-white/5 rounded"><X size={14} /></button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 px-4 py-2 text-[10px] border-b border-white/8 bg-[#0d1117]/50">
          <span className="text-green-400">+{stats.totalLinesAdded} lines</span>
          <span className="text-red-400">-{stats.totalLinesRemoved} lines</span>
          <span className="text-text-secondary">
            {stats.added > 0 && <span className="text-green-400">{stats.added} added</span>}
            {stats.modified > 0 && <span className="ml-2">{stats.modified} modified</span>}
            {stats.removed > 0 && <span className="ml-2 text-red-400">{stats.removed} deleted</span>}
          </span>
          <span className="ml-auto text-text-secondary">
            Accept: {acceptedCount} | Reject: {rejectedCount} | Pending: {changes.length - acceptedCount - rejectedCount}
          </span>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* File list sidebar */}
          <div className="w-56 border-r border-white/8 overflow-y-auto bg-[#0d1117]">
            {changes.map((change, idx) => {
              const decision = decisions.get(change.filePath) ?? "pending";
              const isSelected = idx === selectedIndex;
              return (
                <button key={change.filePath} onClick={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/5 ${
                    isSelected ? "bg-white/5 border-l-2 border-purple-500" : ""
                  }`}>
                  <StatusIcon status={change.status} />
                  <span className="flex-1 truncate">{change.filePath}</span>
                  <DecisionBadge decision={decision} />
                </button>
              );
            })}
          </div>

          {/* Main diff area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selected ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <FileCode size={14} className="text-purple-400" />
                    <span className="text-xs font-mono">{selected.filePath}</span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowDiff((v) => !v)}
                      className="text-[9px] px-2 py-1 rounded bg-white/5 text-text-secondary">
                      {showDiff ? "Code View" : "Diff View"}
                    </button>
                    <button onClick={() => handleDecision(selected.filePath, "accept")}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-500/15 text-green-400 rounded hover:bg-green-500/25">
                      <Check size={10} /> Accept
                    </button>
                    <button onClick={() => handleDecision(selected.filePath, "reject")}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-500/15 text-red-400 rounded hover:bg-red-500/25">
                      <X size={10} /> Reject
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-2 font-mono text-xs bg-[#060a12]">
                  {showDiff ? (
                    <InlineDiffView original={selected.original} modified={selected.modified} />
                  ) : (
                    <pre className="text-text-primary whitespace-pre-wrap">{selected.modified}</pre>
                  )}
                </div>

                <div className="flex items-center justify-between px-4 py-2 border-t border-white/8">
                  <button onClick={handlePrev} disabled={selectedIndex === 0}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-white disabled:opacity-30">
                    <ChevronLeft size={12} /> Previous
                  </button>
                  <span className="text-[10px] text-text-tertiary">
                    {selectedIndex + 1} / {changes.length} (Tab: next, Enter: accept, Esc: close)
                  </span>
                  <button onClick={handleNext} disabled={selectedIndex === changes.length - 1}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-white disabled:opacity-30">
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-secondary">Select a file</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-white/8 bg-[#0d1117]">
          <button onClick={handleRejectAll}
            className="px-4 py-2 text-xs rounded-lg border border-white/10 hover:bg-white/5">
            Cancel
          </button>
          <button onClick={handleApplyDecisions}
            className="px-4 py-2 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-500">
            Apply Selection ({acceptedCount} accepted)
          </button>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=Agent Diff 프리뷰 UI | inputs=AgentDiffPreviewProps | outputs=JSX.Element

// ============================================================
// PART 3 — Sub-components
// ============================================================

function StatusIcon({ status }: { status: "added" | "modified" | "deleted" }) {
  if (status === "added") return <Plus size={10} className="text-green-400" />;
  if (status === "deleted") return <Minus size={10} className="text-red-400" />;
  return <Edit3 size={10} className="text-amber-400" />;
}

function StatusBadge({ status }: { status: "added" | "modified" | "deleted" }) {
  const styles = {
    added: "bg-green-500/15 text-green-400",
    modified: "bg-amber-500/15 text-amber-400",
    deleted: "bg-red-500/15 text-red-400",
  };
  const labels = { added: "Added", modified: "Modified", deleted: "Deleted" };
  return <span className={`text-[9px] px-1.5 py-0.5 rounded ${styles[status]}`}>{labels[status]}</span>;
}

function DecisionBadge({ decision }: { decision: "accept" | "reject" | "pending" }) {
  if (decision === "accept") return <CheckCircle size={10} className="text-green-400" />;
  if (decision === "reject") return <XCircle size={10} className="text-red-400" />;
  return <span className="w-2.5 h-2.5 rounded-full border border-text-secondary" />;
}

// IDENTITY_SEAL: PART-3 | role=상태 아이콘/뱃지 | inputs=status, decision | outputs=JSX.Element

// ============================================================
// PART 4 — Inline Diff View
// ============================================================

function InlineDiffView({ original, modified }: { original: string; modified: string }) {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");

  const rows: Array<{ type: "add" | "remove" | "unchanged"; line: string; num: number }> = [];
  let oi = 0, mi = 0;

  while (oi < origLines.length || mi < modLines.length) {
    if (oi < origLines.length && mi < modLines.length && origLines[oi] === modLines[mi]) {
      rows.push({ type: "unchanged", line: origLines[oi], num: oi + 1 });
      oi++; mi++;
    } else if (oi < origLines.length && (mi >= modLines.length || origLines[oi] !== modLines[mi])) {
      rows.push({ type: "remove", line: origLines[oi], num: oi + 1 });
      oi++;
    } else {
      rows.push({ type: "add", line: modLines[mi], num: mi + 1 });
      mi++;
    }
  }

  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} className={`flex leading-5 ${
          row.type === "add" ? "bg-green-900/15" : row.type === "remove" ? "bg-red-900/15" : ""
        }`}>
          <span className="w-4 text-center shrink-0 text-text-tertiary select-none">
            {row.type === "add" ? "+" : row.type === "remove" ? "-" : " "}
          </span>
          <span className="w-10 text-right pr-2 shrink-0 text-text-tertiary select-none opacity-50">{row.num}</span>
          <span className={
            row.type === "add" ? "text-green-400" : row.type === "remove" ? "text-red-400" : "text-text-primary"
          }>{row.line}</span>
        </div>
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=인라인 diff 뷰 | inputs=original, modified | outputs=JSX.Element
