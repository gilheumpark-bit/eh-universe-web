"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo, startTransition } from "react";
import { FileText, Bot, Hash, X } from "lucide-react";
import type { FileNode } from "@/lib/code-studio-types";
import { fileIconColor } from "@/lib/code-studio-types";
import type { AgentRole } from "@/lib/code-studio-agents";

export type MentionKind = "file" | "agent" | "symbol";

export interface MentionItem {
  id: string;
  label: string;
  kind: MentionKind;
  detail?: string;
  icon?: React.ReactNode;
}

interface MentionPopupProps {
  query: string;
  files: FileNode[];
  agents?: AgentRole[];
  symbols?: Array<{ name: string; file: string; kind: string }>;
  position: { top: number; left: number };
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=props | outputs=MentionItem

// ============================================================
// PART 2 — Fuzzy Filter
// ============================================================

function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const lower = target.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function flattenFiles(nodes: FileNode[], prefix = ""): MentionItem[] {
  const result: MentionItem[] = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === "file") {
      result.push({
        id: node.id,
        label: node.name,
        kind: "file",
        detail: path,
      });
    }
    if (node.children) {
      result.push(...flattenFiles(node.children, path));
    }
  }
  return result;
}

// IDENTITY_SEAL: PART-2 | role=FuzzyFilter | inputs=query,FileNode[] | outputs=MentionItem[]

// ============================================================
// PART 3 — Component
// ============================================================

const AGENT_LABELS: Record<AgentRole, string> = {
  architect: "Architect",
  developer: "Developer",
  reviewer: "Reviewer",
  tester: "Tester",
  documenter: "Documenter",
};

export default function MentionPopup({
  query,
  files,
  agents = ["architect", "developer", "reviewer", "tester", "documenter"],
  symbols = [],
  position,
  onSelect,
  onClose,
}: MentionPopupProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<MentionItem[]>(() => {
    const fileItems = flattenFiles(files);
    const agentItems: MentionItem[] = agents.map((r) => ({
      id: `agent-${r}`,
      label: `@${r}`,
      kind: "agent" as const,
      detail: AGENT_LABELS[r],
    }));
    const symbolItems: MentionItem[] = symbols.map((s) => ({
      id: `sym-${s.file}-${s.name}`,
      label: s.name,
      kind: "symbol" as const,
      detail: `${s.kind} in ${s.file}`,
    }));
    const all = [...agentItems, ...fileItems, ...symbolItems];
    return all.filter((item) => fuzzyMatch(query, item.label));
  }, [query, files, agents, symbols]);

  useEffect(() => {
    startTransition(() => setSelectedIndex(0));
  }, [query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && items.length > 0) {
        e.preventDefault();
        onSelect(items[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [items, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (items.length === 0) return null;

  const kindIcon = (kind: MentionKind) => {
    switch (kind) {
      case "file": return <FileText size={14} className="text-blue-400" />;
      case "agent": return <Bot size={14} className="text-purple-400" />;
      case "symbol": return <Hash size={14} className="text-amber-400" />;
    }
  };

  return (
    <div
      className="absolute z-50 w-72 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#1e1e2e] shadow-xl"
      style={{ top: position.top, left: position.left }}
    >
      <div ref={listRef}>
        {items.slice(0, 50).map((item, i) => (
          <button
            key={item.id}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
              i === selectedIndex ? "bg-white/10 text-white" : "text-gray-300 hover:bg-white/5"
            }`}
            onMouseEnter={() => setSelectedIndex(i)}
            onClick={() => onSelect(item)}
          >
            {kindIcon(item.kind)}
            <span className="truncate font-medium">{item.label}</span>
            {item.detail && (
              <span className="ml-auto truncate text-xs text-gray-500">{item.detail}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=MentionPopupUI | inputs=query,files,agents,symbols | outputs=JSX
