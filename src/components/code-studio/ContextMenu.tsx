"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useEffect, useRef, useState } from "react";
import {
  FilePlus, FolderPlus, Pencil, Trash2, Copy, Clipboard,
  Columns2, ChevronRight,
} from "lucide-react";
import { L4 } from "@/lib/i18n";

/** Single menu item definition */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  shortcut?: string;
  children?: ContextMenuItem[];
}

/** Convenience action type for file-explorer context menus */
export type ContextMenuAction =
  | "new-file" | "new-folder" | "rename" | "delete"
  | "copy-path" | "duplicate" | "open-in-split";

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

// IDENTITY_SEAL: PART-1 | role=TypeDefinitions | inputs=none | outputs=ContextMenuItem,ContextMenuAction,Props

// ============================================================
// PART 2 — Submenu Component
// ============================================================

function Submenu({
  items,
  onSelect,
  onClose,
}: {
  items: ContextMenuItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="absolute left-full top-0 ml-0.5 bg-[#0a0e17] border border-white/8 rounded-lg shadow-2xl py-1 min-w-[160px] z-101">
      {items.map((item) =>
        item.separator ? (
          <div key={item.id} className="mx-2 my-1 border-t border-white/8" />
        ) : (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled && !item.children) {
                  onSelect(item.id);
                  onClose();
                }
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors
                ${item.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"}
                ${item.danger ? "text-red-400" : "text-text-primary"}`}
            >
              {item.icon && <span className="w-3 shrink-0">{item.icon}</span>}
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-[9px] text-text-tertiary ml-2">{item.shortcut}</span>
              )}
              {item.children && <ChevronRight size={10} className="text-text-tertiary" />}
            </button>
            {item.children && hoveredId === item.id && (
              <Submenu items={item.children} onSelect={onSelect} onClose={onClose} />
            )}
          </div>
        ),
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=SubmenuRenderer | inputs=ContextMenuItem[] | outputs=JSX

// ============================================================
// PART 3 — Main ContextMenu Component
// ============================================================

export function ContextMenu({ x, y, items, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const visibleItems = items.filter((i) => !i.separator);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, visibleItems.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && focusIdx >= 0) {
        const item = visibleItems[focusIdx];
        if (item && !item.disabled && !item.children) {
          onSelect(item.id);
          onClose();
        }
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, focusIdx, visibleItems, onSelect]);

  // Clamp position to viewport
  const style = {
    left: Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1920) - 200),
    top: Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 1080) - 300),
  };

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-100 bg-[#0a0e17] border border-white/8 rounded-lg shadow-2xl py-1 min-w-[180px]"
      style={style}
    >
      {items.map((item) =>
        item.separator ? (
          <div key={item.id} className="mx-2 my-1 border-t border-white/8" />
        ) : (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled && !item.children) {
                  onSelect(item.id);
                  onClose();
                }
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors
                ${item.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"}
                ${item.danger ? "text-red-400" : "text-text-primary"}
                ${focusIdx === visibleItems.indexOf(item) ? "bg-white/5" : ""}`}
            >
              {item.icon && <span className="w-3 shrink-0">{item.icon}</span>}
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-[9px] text-text-tertiary ml-2">{item.shortcut}</span>
              )}
              {item.children && <ChevronRight size={10} className="text-text-tertiary" />}
            </button>
            {item.children && hoveredId === item.id && (
              <Submenu items={item.children} onSelect={onSelect} onClose={onClose} />
            )}
          </div>
        ),
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=ContextMenuRoot | inputs=x,y,items | outputs=JSX

// ============================================================
// PART 4 — File Explorer Context Menu Builder
// ============================================================

/** Build context menu items for the file explorer */
export function buildFileExplorerMenu(isFolder: boolean, lang: string): ContextMenuItem[] {
  return [
    { id: "new-file", label: L4(lang, { ko: "새 파일", en: "New File" }), icon: <FilePlus size={12} /> },
    { id: "new-folder", label: L4(lang, { ko: "새 폴더", en: "New Folder" }), icon: <FolderPlus size={12} /> },
    { id: "sep-1", label: "", separator: true },
    { id: "rename", label: L4(lang, { ko: "이름 바꾸기", en: "Rename" }), icon: <Pencil size={12} />, shortcut: "F2" },
    { id: "duplicate", label: L4(lang, { ko: "복제", en: "Duplicate" }), icon: <Copy size={12} />, disabled: isFolder },
    { id: "open-in-split", label: L4(lang, { ko: "분할 화면으로 열기", en: "Open in Split" }), icon: <Columns2 size={12} />, disabled: isFolder },
    { id: "copy-path", label: L4(lang, { ko: "경로 복사", en: "Copy Path" }), icon: <Clipboard size={12} /> },
    { id: "sep-2", label: "", separator: true },
    { id: "delete", label: L4(lang, { ko: "삭제", en: "Delete" }), icon: <Trash2 size={12} />, danger: true },
  ];
}

// IDENTITY_SEAL: PART-4 | role=FileExplorerMenuBuilder | inputs=isFolder | outputs=ContextMenuItem[]
