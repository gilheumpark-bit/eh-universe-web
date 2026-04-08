// @ts-nocheck
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

interface ActivityGroupDef {
  id: string;
  label: string;
  items: ItemDef[];
}

/** 대분류(섹션) → 소분류(탭) — 플랫 나열 대신 계층 표시 */
const ACTIVITY_GROUPS: ActivityGroupDef[] = [
  {
    id: "grp-explore",
    label: "탐색",
    items: [
      { id: "project", icon: <FolderOpen size={18} />, label: "프로젝트 탐색기", shortcut: "Ctrl+Shift+E" },
      { id: "search", icon: <Search size={18} />, label: "검색", shortcut: "Ctrl+Shift+F" },
    ],
  },
  {
    id: "grp-ai",
    label: "AI · 검증",
    items: [
      { id: "ai", icon: <Bot size={18} />, label: "AI 어시스턴트", shortcut: "Ctrl+Shift+A" },
      { id: "review", icon: <ShieldCheck size={18} />, label: "코드 리뷰", shortcut: "Ctrl+Shift+Q" },
    ],
  },
  {
    id: "grp-run",
    label: "실행",
    items: [
      { id: "preview", icon: <Eye size={18} />, label: "미리보기", shortcut: "Ctrl+Shift+P" },
      { id: "deploy", icon: <Rocket size={18} />, label: "배포", shortcut: "Ctrl+Shift+D" },
    ],
  },
];

const SETTINGS_ITEM: ItemDef = {
  id: "settings",
  icon: <Settings size={18} />,
  label: "설정",
};

const ALL_ITEMS: ItemDef[] = [...ACTIVITY_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];

// IDENTITY_SEAL: PART-2 | role=ItemDefs | inputs=none | outputs=ACTIVITY_GROUPS,SETTINGS_ITEM,ALL_ITEMS

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
          containerRef.current?.querySelectorAll<HTMLButtonElement>(
            "[data-activity-item]",
          );
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
          type="button"
          data-activity-item
          aria-current={isActive ? "true" : undefined}
          aria-label={item.label}
          tabIndex={isActive ? 0 : -1}
          onClick={() => onChangeView(item.id)}
          className={`relative w-10 h-10 flex items-center justify-center rounded transition-all duration-150 ${
            isActive
              ? "text-text-primary bg-accent-purple/10"
              : "text-text-secondary hover:text-text-primary hover:bg-white/5"
          }`}
        >
          {/* Active indicator — animated left border */}
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r bg-accent-purple transition-all duration-200 ${
              isActive ? "h-5 opacity-100" : "h-0 opacity-0"
            }`}
          />
          {item.icon}
        </button>
      </ActivityTooltip>
    );
  };

  return (
    <nav
      ref={containerRef}
      aria-label="활동 바"
      className="flex shrink-0 w-12 flex-col items-center gap-1 border-r border-white/8 bg-bg-primary pb-10 pt-2"
      onKeyDown={handleKeyDown}
    >
      {/* AI sparkle indicator at top */}
      <div className="mb-1 text-accent-purple/60">
        <Sparkles size={14} />
      </div>

      {ACTIVITY_GROUPS.map((group) => (
        <div
          key={group.id}
          className="flex w-full flex-col items-center gap-0.5"
        >
          <span
            className="w-full select-none px-0.5 text-center font-mono text-[8px] uppercase leading-tight tracking-[0.12em] text-text-tertiary"
            aria-hidden="true"
          >
            {group.label}
          </span>
          <div className="flex flex-col items-center gap-1">
            {group.items.map((item) => renderButton(item, activeView === item.id))}
          </div>
        </div>
      ))}

      {/* Spacer pushes settings to bottom */}
      <div className="min-h-1 flex-1" />

      <div className="flex w-full flex-col items-center gap-0.5">
        <span
          className="w-full select-none px-0.5 text-center font-mono text-[8px] uppercase leading-tight tracking-[0.12em] text-text-tertiary"
          aria-hidden="true"
        >
          시스템
        </span>
        <div className="flex flex-col items-center gap-1">{renderButton(SETTINGS_ITEM, activeView === "settings")}</div>
      </div>
    </nav>
  );
}

// IDENTITY_SEAL: PART-4 | role=ActivityBar | inputs=activeView,onChangeView | outputs=JSX
