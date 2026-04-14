"use client";

// ============================================================
// Dropdown — Accessible select/dropdown with keyboard navigation
// ============================================================
// Replaces inline dropdown patterns across ModelSwitcher, SearchPanel, etc.
// Uses z-dropdown token. Escape/Enter/Arrow key support.

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Width class (Tailwind), default w-full */
  width?: string;
  /** Size variant */
  size?: "sm" | "md";
  /** Disabled state */
  disabled?: boolean;
  /** Accessible label */
  ariaLabel?: string;
  className?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "선택...",
  width = "w-full",
  size = "md",
  disabled = false,
  ariaLabel,
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const enabledOptions = options.filter((o) => !o.disabled);

  const close = useCallback(() => {
    setOpen(false);
    setFocusIdx(-1);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, close]);

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusIdx < 0) return;
    const items = listRef.current?.children;
    if (items?.[focusIdx]) {
      (items[focusIdx] as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [focusIdx, open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!open) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
          setFocusIdx(0);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusIdx((prev) => {
            const next = prev + 1;
            return next >= enabledOptions.length ? 0 : next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusIdx((prev) => {
            const next = prev - 1;
            return next < 0 ? enabledOptions.length - 1 : next;
          });
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusIdx >= 0 && enabledOptions[focusIdx]) {
            onChange(enabledOptions[focusIdx].value);
            close();
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [open, focusIdx, enabledOptions, onChange, close, disabled],
  );

  const sizeClasses = size === "sm"
    ? "px-2 py-1 text-[11px]"
    : "px-3 py-2 text-xs";

  return (
    <div ref={containerRef} className={`relative ${width} ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(!open); setFocusIdx(0); } }}
        onKeyDown={handleKeyDown}
        className={`${sizeClasses} ${width} flex items-center justify-between gap-2
          bg-bg-secondary border border-border rounded-[var(--radius-md)]
          text-text-primary
          transition-colors
          hover:bg-bg-tertiary
          disabled:opacity-30 disabled:pointer-events-none`}
        style={{ transition: `border-color var(--transition-fast), background-color var(--transition-fast)` }}
      >
        <span className={selected ? "text-text-primary" : "text-text-tertiary"}>
          {selected ? (
            <span className="flex items-center gap-1.5">
              {selected.icon}
              {selected.label}
            </span>
          ) : placeholder}
        </span>
        <ChevronDown
          size={size === "sm" ? 12 : 14}
          className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
          style={{ transition: `transform var(--transition-fast)` }}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 mt-1 py-1
            bg-bg-secondary border border-border rounded-[var(--radius-md)]
            shadow-panel max-h-48 overflow-y-auto
            tooltip-animate"
          style={{ zIndex: "var(--z-dropdown)" }}
        >
          {options.map((opt, _idx) => {
            const enabledIdx = enabledOptions.indexOf(opt);
            const isFocused = enabledIdx === focusIdx;
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                className={`${sizeClasses} flex items-center gap-1.5 cursor-pointer
                  ${opt.disabled ? "opacity-30 pointer-events-none" : ""}
                  ${isFocused ? "bg-bg-tertiary" : ""}
                  ${isSelected ? "text-accent-amber" : "text-text-primary"}
                  hover:bg-bg-tertiary`}
                onClick={() => {
                  if (!opt.disabled) {
                    onChange(opt.value);
                    close();
                  }
                }}
                onMouseEnter={() => {
                  if (!opt.disabled) setFocusIdx(enabledIdx);
                }}
              >
                {opt.icon}
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
