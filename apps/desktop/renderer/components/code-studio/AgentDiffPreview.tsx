"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useCallback, useMemo } from "react";
import {
  Check, X, ChevronLeft, ChevronRight, FileCode, Plus, Minus, Edit3,
  CheckCircle, XCircle, AlertCircle,
} from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

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
  const { lang } = useLang();
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
      className="fixed inset-0 z-[300] flex bg-bg-primary/30 backdrop-blur-sm"
      onKeyDown={handleKeyDown} tabIndex={0}
      style={{ animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className="flex flex-col w-full max-w-[1200px] mx-auto my-6 bg-bg-primary/90 backdrop-blur-3xl rounded-2xl shadow-2xl overflow-hidden border border-border/40"
        style={{ animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
          <div className="flex items-center gap-3">
            <AlertCircle size={16} className="text-amber-400" />
            <span className="text-sm font-semibold">{L4(lang, { ko: "에이전트 변경 확인", en: "Agent Changes Review" })}</span>
            <span className="text-xs text-text-secondary">{L4(lang, { ko: `${changes.length}개 파일 변경됨`, en: `${changes.length} files changed` })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAcceptAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-500/15 text-green-400 rounded-lg hover:bg-green-500/25 transition-colors">
              <CheckCircle size={12} /> {L4(lang, { ko: "모두 수락", en: "Accept All" })}
            </button>
            <button onClick={handleRejectAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 transition-colors">
              <XCircle size={12} /> {L4(lang, { ko: "모두 거절", en: "Reject All" })}
            </button>
            <button onClick={onReject} aria-label="닫기" className="p-1 hover:bg-bg-secondary/50 rounded transition-colors"><X size={14} /></button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 px-4 py-2 text-[10px] border-b border-border bg-bg-secondary/50">
          <span className="text-green-400">{L4(lang, { ko: `+${stats.totalLinesAdded}줄`, en: `+${stats.totalLinesAdded} lines` })}</span>
          <span className="text-red-400">{L4(lang, { ko: `-${stats.totalLinesRemoved}줄`, en: `-${stats.totalLinesRemoved} lines` })}</span>
          <span className="text-text-secondary">
            {stats.added > 0 && <span className="text-green-400">{L4(lang, { ko: `${stats.added} 추가됨`, en: `${stats.added} added` })}</span>}
            {stats.modified > 0 && <span className="ml-2">{L4(lang, { ko: `${stats.modified} 수정됨`, en: `${stats.modified} modified` })}</span>}
            {stats.removed > 0 && <span className="ml-2 text-red-400">{L4(lang, { ko: `${stats.removed} 삭제됨`, en: `${stats.removed} deleted` })}</span>}
          </span>
          <span className="ml-auto text-text-secondary">
            {L4(lang, { ko: `수락: ${acceptedCount} | 거절: ${rejectedCount} | 대기: ${changes.length - acceptedCount - rejectedCount}`, en: `Accept: ${acceptedCount} | Reject: ${rejectedCount} | Pending: ${changes.length - acceptedCount - rejectedCount}` })}
          </span>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-[400px]">
          {/* File list sidebar */}
          <div className="w-64 border-r border-border/40 overflow-y-auto bg-bg-secondary/10 p-2 space-y-0.5">
            {changes.map((change, idx) => {
              const decision = decisions.get(change.filePath) ?? "pending";
              const isSelected = idx === selectedIndex;
              return (
                <button key={change.filePath} onClick={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left rounded-lg transition-all duration-200 ${
                    isSelected ? "bg-bg-tertiary/70 shadow-sm" : "hover:bg-bg-tertiary/40"
                  }`}>
                  <StatusIcon status={change.status} />
                  <span className={`flex-1 truncate ${isSelected ? "font-medium" : "text-text-secondary"}`}>{change.filePath}</span>
                  <DecisionBadge decision={decision} />
                </button>
              );
            })}
          </div>

          {/* Main diff area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selected ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FileCode size={14} className="text-amber-400" />
                    <span className="text-xs font-mono">{selected.filePath}</span>
                    <StatusBadge status={selected.status} lang={lang} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowDiff((v) => !v)}
                      className="text-[9px] px-2 py-1 rounded bg-bg-tertiary/50 text-text-secondary transition-colors hover:bg-bg-tertiary">
                      {showDiff ? L4(lang, { ko: "코드 보기", en: "Code View" }) : L4(lang, { ko: "변경 비교", en: "Diff View" })}
                    </button>
                    <button onClick={() => handleDecision(selected.filePath, "accept")}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-500/15 text-green-400 rounded hover:bg-green-500/25 transition-colors">
                      <Check size={10} /> {L4(lang, { ko: "수락", en: "Accept" })}
                    </button>
                    <button onClick={() => handleDecision(selected.filePath, "reject")}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-500/15 text-red-400 rounded hover:bg-red-500/25 transition-colors">
                      <X size={10} /> {L4(lang, { ko: "거절", en: "Reject" })}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-2 font-mono text-xs bg-bg-primary dark:bg-[#060a12]">
                  {showDiff ? (
                    <InlineDiffView original={selected.original} modified={selected.modified} />
                  ) : (
                    <pre className="text-text-primary whitespace-pre-wrap">{selected.modified}</pre>
                  )}
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-bg-secondary/40">
                  <button onClick={handlePrev} disabled={selectedIndex === 0}
                    className="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all font-medium py-1">
                    <ChevronLeft size={14} /> {L4(lang, { ko: "이전 파일", en: "Previous" })}
                  </button>
                  <span className="text-[10px] text-text-tertiary font-mono tracking-tight bg-bg-tertiary/30 px-3 py-1 rounded-full">
                    {L4(lang, { ko: `${selectedIndex + 1} / ${changes.length} (Tab: 다음, Enter: 수락, Esc: 닫기)`, en: `${selectedIndex + 1} / ${changes.length} (Tab: next, Enter: accept, Esc: close)` })}
                  </span>
                  <button onClick={handleNext} disabled={selectedIndex === changes.length - 1}
                    className="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all font-medium py-1">
                    {L4(lang, { ko: "다음 파일", en: "Next" })} <ChevronRight size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-secondary">{L4(lang, { ko: "파일을 선택하세요", en: "Select a file" })}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border/40 bg-bg-secondary/60 backdrop-blur-xl">
          <button onClick={handleRejectAll}
            className="px-5 py-2 text-[11px] font-medium rounded-lg border border-border/60 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all shadow-sm">
            {L4(lang, { ko: "전체 취소", en: "Cancel" })}
          </button>
          <button onClick={handleApplyDecisions}
            className="px-6 py-2 text-[11px] font-semibold bg-accent-amber text-stone-950 rounded-lg hover:bg-accent-amber/90 transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
            {L4(lang, { ko: `선택 적용 (${acceptedCount} 수락됨)`, en: `Apply Selection (${acceptedCount} accepted)` })}
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

function StatusBadge({ status, lang }: { status: "added" | "modified" | "deleted"; lang: string }) {
  const styles = {
    added: "bg-green-500/15 text-green-400",
    modified: "bg-amber-500/15 text-amber-400",
    deleted: "bg-red-500/15 text-red-400",
  };
  const labels = {
    added: L4(lang, { ko: "추가됨", en: "Added" }),
    modified: L4(lang, { ko: "수정됨", en: "Modified" }),
    deleted: L4(lang, { ko: "삭제됨", en: "Deleted" })
  };
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
    <div className="rounded-xl border border-border/30 overflow-hidden bg-bg-primary/20">
      {rows.map((row, i) => (
        <div key={i} className={`flex transition-colors ${
          row.type === "add" ? "bg-green-500/10 hover:bg-green-500/20" : 
          row.type === "remove" ? "bg-red-500/10 hover:bg-red-500/20" : 
          "hover:bg-bg-tertiary/30"
        }`}>
          <div className={`w-6 text-center shrink-0 border-r border-border/10 flex items-center justify-center font-bold text-[10px] ${
            row.type === "add" ? "text-green-500" : row.type === "remove" ? "text-red-500" : "text-text-tertiary/30"
          }`}>
            {row.type === "add" ? "+" : row.type === "remove" ? "-" : ""}
          </div>
          <div className="w-10 text-right pr-3 shrink-0 text-text-tertiary/50 bg-bg-secondary/20 flex items-center justify-end border-r border-border/10 select-none">
            {row.num}
          </div>
          <div className={`pl-3 py-[2px] ${
            row.type === "add" ? "text-green-400" : row.type === "remove" ? "text-red-400" : "text-text-primary/90"
          }`}>{row.line || " "}</div>
        </div>
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=인라인 diff 뷰 | inputs=original, modified | outputs=JSX.Element
