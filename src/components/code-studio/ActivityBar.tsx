"use client";

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { useRef, useCallback, useState } from "react";
import {
  FolderOpen,
  Search,
  Bot,
  ShieldCheck,
  Eye,
  Rocket,
  Settings,
  Sparkles,
} from "lucide-react";

export type ActivityCategory =
  | "project"
  | "search"
  | "ai"
  | "review"
  | "preview"
  | "deploy"
  | "settings";

interface ActivityBarProps {
  activeView: ActivityCategory;
  onChangeView: (view: ActivityCategory) => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ActivityCategory,ActivityBarProps

// ============================================================
// PART 2 — Item Definitions
// ============================================================

interface ItemDef {
  id: ActivityCategory;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

const MAIN_ITEMS: ItemDef[] = [
  { id: "project", icon: <FolderOpen size={18} />, label: "프로젝트 탐색기", shortcut: "Ctrl+Shift+E" },
  { id: "search", icon: <Search size={18} />, label: "검색", shortcut: "Ctrl+Shift+F" },
  { id: "ai", icon: <Bot size={18} />, label: "NOA 어시스턴트", shortcut: "Ctrl+Shift+A" },
  { id: "review", icon: <ShieldCheck size={18} />, label: "코드 리뷰", shortcut: "Ctrl+Shift+Q" },
  { id: "preview", icon: <Eye size={18} />, label: "미리보기", shortcut: "Ctrl+Shift+P" },
  { id: "deploy", icon: <Rocket size={18} />, label: "배포", shortcut: "Ctrl+Shift+D" },
];

const SETTINGS_ITEM: ItemDef = {
  id: "settings",
  icon: <Settings size={18} />,
  label: "설정",
};

const ALL_ITEMS = [...MAIN_ITEMS, SETTINGS_ITEM];

// IDENTITY_SEAL: PART-2 | role=ItemDefs | inputs=none | outputs=MAIN_ITEMS,SETTINGS_ITEM,ALL_ITEMS

// ============================================================
// PART 3 — Tooltip Component (inline)
// ============================================================

function ActivityTooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 300);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-bg-secondary text-text-primary text-[11px] rounded shadow-lg whitespace-nowrap z-50 border border-white/10 pointer-events-none">
          {content}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=Tooltip | inputs=content,children | outputs=JSX

// ============================================================
// PART 4 — ActivityBar Component
// ============================================================

export function ActivityBar({ activeView, onChangeView }: ActivityBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = ALL_ITEMS.findIndex((item) => item.id === activeView);
      let nextIndex: number | null = null;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % ALL_ITEMS.length;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + ALL_ITEMS.length) % ALL_ITEMS.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = ALL_ITEMS.length - 1;
      }

      if (nextIndex !== null) {
        onChangeView(ALL_ITEMS[nextIndex].id);
        const buttons =
          containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        buttons?.[nextIndex]?.focus();
      }
    },
    [activeView, onChangeView],
  );

  const renderButton = (item: ItemDef, isActive: boolean) => {
    const tooltipText = item.shortcut
      ? `${item.label} (${item.shortcut})`
      : item.label;

    return (
      <ActivityTooltip key={item.id} content={tooltipText}>
        <button
          role="tab"
          aria-selected={isActive}
          aria-label={item.label}
          tabIndex={isActive ? 0 : -1}
          onClick={() => onChangeView(item.id)}
          className={`relative w-10 h-10 flex items-center justify-center rounded transition-[transform,opacity,background-color,border-color,color] duration-150 ${
            isActive
              ? "text-text-primary bg-accent-purple/10"
              : "text-text-secondary hover:text-text-primary hover:bg-white/5"
          }`}
        >
          {/* Active indicator — animated left border */}
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r bg-accent-purple transition-[transform,opacity,background-color,border-color,color] duration-200 ${
              isActive ? "h-5 opacity-100" : "h-0 opacity-0"
            }`}
          />
          {item.icon}
        </button>
      </ActivityTooltip>
    );
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-orientation="vertical"
      aria-label="활동 바"
      className="flex flex-col items-center w-12 bg-bg-primary border-r border-white/8 pt-2 pb-10 gap-1 shrink-0"
      onKeyDown={handleKeyDown}
    >
      {/* AI sparkle indicator at top */}
      <div className="mb-1 text-accent-purple/60">
        <Sparkles size={14} />
      </div>

      {MAIN_ITEMS.map((item) => renderButton(item, activeView === item.id))}

      {/* Spacer pushes settings to bottom */}
      <div className="flex-1" />

      {renderButton(SETTINGS_ITEM, activeView === "settings")}
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=ActivityBar | inputs=activeView,onChangeView | outputs=JSX
