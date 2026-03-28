"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { FileCode } from "lucide-react";
import type { FileNode } from "@/lib/types";

interface Props {
  files: FileNode[];
  onOpen: (node: FileNode) => void;
  onClose: () => void;
}

function flattenFiles(nodes: FileNode[], prefix = ""): { node: FileNode; path: string }[] {
  const result: { node: FileNode; path: string }[] = [];
  for (const n of nodes) {
    const path = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "file") result.push({ node: n, path });
    if (n.children) result.push(...flattenFiles(n.children, path));
  }
  return result;
}

export function QuickOpen({ files, onOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const allFiles = useMemo(() => flattenFiles(files), [files]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 20);
    const q = query.toLowerCase();
    return allFiles
      .filter((f) => f.path.toLowerCase().includes(q))
      .slice(0, 20);
  }, [query, allFiles]);

  const [prevFiltered, setPrevFiltered] = useState(filtered);
  if (prevFiltered !== filtered) {
    setPrevFiltered(filtered);
    setSelectedIdx(0);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && filtered[selectedIdx]) { onOpen(filtered[selectedIdx].node); onClose(); }
    else if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl w-[480px] max-h-[350px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
          <FileCode size={14} className="text-[var(--text-secondary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="파일 이름으로 이동…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="overflow-y-auto max-h-[290px]">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-[var(--text-secondary)]">일치하는 파일 없음</div>
          ) : (
            filtered.map((f, i) => (
              <button
                key={f.node.id}
                onClick={() => { onOpen(f.node); onClose(); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                  i === selectedIdx ? "bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]" : "hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <FileCode size={12} className="text-[var(--accent-blue)] flex-shrink-0" />
                <span className="flex-1 text-left truncate">{f.path}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
