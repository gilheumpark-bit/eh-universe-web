"use client";

import { useRef, useCallback } from "react";
import { FolderOpen, Search, Bot, ShieldCheck, Eye, Rocket, Settings } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { useLocale } from "@/lib/i18n";

export type ActivityCategory = "project" | "search" | "ai" | "review" | "preview" | "deploy" | "settings";

interface Props {
  activeView: ActivityCategory;
  onChangeView: (view: ActivityCategory) => void;
}

const itemDefs: { id: ActivityCategory; icon: React.ReactNode; labelKey: string; shortcut?: string }[] = [
  { id: "project", icon: <FolderOpen size={18} />, labelKey: "nav.project", shortcut: "Ctrl+Shift+E" },
  { id: "search", icon: <Search size={18} />, labelKey: "nav.search", shortcut: "Ctrl+Shift+F" },
  { id: "ai", icon: <Bot size={18} />, labelKey: "nav.ai", shortcut: "Ctrl+Shift+A" },
  { id: "review", icon: <ShieldCheck size={18} />, labelKey: "nav.review", shortcut: "Ctrl+Shift+Q" },
  { id: "preview", icon: <Eye size={18} />, labelKey: "nav.preview", shortcut: "Ctrl+Shift+P" },
  { id: "deploy", icon: <Rocket size={18} />, labelKey: "nav.deploy", shortcut: "Ctrl+Shift+D" },
];

const settingsItemDef = { id: "settings" as const, icon: <Settings size={18} />, labelKey: "nav.settings" };

// All items in order for keyboard navigation
const allItems = [...itemDefs, settingsItemDef];

export function ActivityBar({ activeView, onChangeView }: Props) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = allItems.findIndex((item) => item.id === activeView);
      let nextIndex: number | null = null;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % allItems.length;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + allItems.length) % allItems.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = allItems.length - 1;
      }

      if (nextIndex !== null) {
        const nextItem = allItems[nextIndex];
        onChangeView(nextItem.id);
        // Move focus to the newly active button
        const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        buttons?.[nextIndex]?.focus();
      }
    },
    [activeView, onChangeView],
  );

  const renderButton = (item: typeof allItems[number], isActive: boolean) => {
    const label = "shortcut" in item && item.shortcut
      ? `${t(item.labelKey)} (${item.shortcut})`
      : t(item.labelKey);
    return (
      <Tooltip key={item.id} content={label} position="right" delay={200}>
        <button
          role="tab"
          aria-selected={isActive}
          aria-label={t(item.labelKey)}
          tabIndex={isActive ? 0 : -1}
          onClick={() => onChangeView(item.id)}
          className={`relative w-10 h-10 flex items-center justify-center rounded transition-all duration-150 ${
            isActive
              ? "text-[var(--text-primary)] bg-[var(--accent-blue)]/10"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
          }`}
        >
          {/* Active indicator — animated left border */}
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r bg-[var(--accent-blue)] transition-all duration-200 ${
              isActive ? "h-5 opacity-100" : "h-0 opacity-0"
            }`}
          />
          {item.icon}
        </button>
      </Tooltip>
    );
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-orientation="vertical"
      className="flex flex-col items-center w-12 bg-[var(--bg-secondary)] border-r border-[var(--border)] py-2 gap-1 flex-shrink-0"
      onKeyDown={handleKeyDown}
    >
      {itemDefs.map((item) => renderButton(item, activeView === item.id))}

      <div className="flex-1" />

      {renderButton(settingsItemDef, activeView === "settings")}
    </div>
  );
}
