"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Check, X, ListChecks, ChevronDown } from "lucide-react";
import { computeInlineDiff, applyPartialDiff } from "@/lib/inline-diff";
import { diffStats } from "@/lib/diff-engine";

const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">Loading diff…</div> },
);

interface Props {
  original: string;
  modified: string;
  language?: string;
  onAccept: () => void;
  onReject: () => void;
  onPartialAccept?: (content: string) => void;
}

export function DiffViewer({ original, modified, language, onAccept, onReject, onPartialAccept }: Props) {
  const [showPartial, setShowPartial] = useState(false);
  const [acceptedLines, setAcceptedLines] = useState<Set<number>>(new Set());

  const inlineDiff = useMemo(() => computeInlineDiff(original, modified), [original, modified]);
  const changeLines = useMemo(() => inlineDiff.filter((c) => c.type !== "unchanged"), [inlineDiff]);
  const diffEditorRef = useRef<HTMLDivElement>(null);

  // Line count summary using diff-engine's Myers diff for accurate stats
  const lineSummary = useMemo(() => {
    const stats = diffStats(original, modified);
    return { added: stats.additions, removed: stats.deletions };
  }, [original, modified]);

  // Jump to next change hunk: scroll to the next change line in the diff editor
  const [currentHunkIndex, setCurrentHunkIndex] = useState(0);
  const jumpToNextChange = useCallback(() => {
    if (changeLines.length === 0) return;
    const nextIndex = (currentHunkIndex + 1) % changeLines.length;
    setCurrentHunkIndex(nextIndex);
    // Attempt to scroll the Monaco diff editor to the target line
    const targetLine = changeLines[nextIndex]?.line;
    if (targetLine && diffEditorRef.current) {
      // Monaco DiffEditor doesn't expose scroll API directly via DOM,
      // but we can dispatch a message via the container for custom handling
      diffEditorRef.current.dispatchEvent(
        new CustomEvent("jump-to-line", { detail: { line: targetLine } })
      );
    }
  }, [changeLines, currentHunkIndex]);

  const toggleLine = useCallback((line: number) => {
    setAcceptedLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) { next.delete(line); } else { next.add(line); }
      return next;
    });
  }, []);

  const handlePartialAccept = useCallback(() => {
    const result = applyPartialDiff(original, inlineDiff, acceptedLines);
    onPartialAccept?.(result);
  }, [original, inlineDiff, acceptedLines, onPartialAccept]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--accent-yellow)] flex items-center gap-2">
          AI 제안 코드 비교
          <span className="text-[10px] font-normal text-[var(--text-secondary)]">
            <span className="text-[var(--accent-green)]">+{lineSummary.added}</span>{" "}
            <span className="text-[var(--accent-red)]">-{lineSummary.removed}</span>
          </span>
        </span>
        <div className="flex items-center gap-2">
          {/* Jump to next change button */}
          {changeLines.length > 0 && (
            <button
              onClick={jumpToNextChange}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white rounded transition-colors"
              title={`다음 변경으로 이동 (${currentHunkIndex + 1}/${changeLines.length})`}
            >
              <ChevronDown size={12} /> 다음 변경 ({currentHunkIndex + 1}/{changeLines.length})
            </button>
          )}
          <button
            onClick={() => setShowPartial((v) => !v)}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${showPartial ? "bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white"}`}
            title="부분 수락"
          >
            <ListChecks size={12} /> 부분 수락
          </button>
          {showPartial && acceptedLines.size > 0 && (
            <button
              onClick={handlePartialAccept}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded hover:bg-[var(--accent-purple)]/30 transition-colors"
            >
              <Check size={12} /> {acceptedLines.size}개 적용
            </button>
          )}
          <button
            onClick={onAccept}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded hover:bg-[var(--accent-green)]/30 transition-colors"
          >
            <Check size={12} /> 전체 수락
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-[var(--accent-red)]/20 text-[var(--accent-red)] rounded hover:bg-[var(--accent-red)]/30 transition-colors"
          >
            <X size={12} /> 거절
          </button>
        </div>
      </div>

      {/* Partial diff line picker */}
      {showPartial && changeLines.length > 0 && (
        <div className="border-b border-[var(--border)] bg-[var(--bg-primary)] max-h-32 overflow-y-auto px-3 py-1">
          <div className="text-[10px] text-[var(--text-secondary)] mb-1">변경사항을 선택하세요:</div>
          {changeLines.map((c) => (
            <button
              key={c.line}
              onClick={() => toggleLine(c.line)}
              className={`flex items-center gap-2 w-full text-left text-[10px] px-1 py-0.5 rounded hover:bg-[var(--bg-tertiary)] ${acceptedLines.has(c.line) ? "text-[var(--accent-green)]" : "text-[var(--text-secondary)]"}`}
            >
              <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${acceptedLines.has(c.line) ? "bg-[var(--accent-green)] border-[var(--accent-green)]" : "border-[var(--border)]"}`}>
                {acceptedLines.has(c.line) && <Check size={8} className="text-black" />}
              </span>
              <span className={c.type === "add" ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}>
                {c.type === "add" ? "+" : "-"} L{c.line}: {c.content.slice(0, 60)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Diff Editor */}
      <div className="flex-1" ref={diffEditorRef}>
        <DiffEditor
          height="100%"
          original={original}
          modified={modified}
          language={language ?? "typescript"}
          theme="vs-dark"
          options={{
            readOnly: true,
            renderSideBySide: true,
            fontSize: 13,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
