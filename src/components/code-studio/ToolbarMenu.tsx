"use client";

// ============================================================
// PART 1 — ToolbarMenu (dropdown menu for toolbar)
// ============================================================
// Ported from CSL IDE ToolbarMenu.tsx

import { useState, useRef, useEffect } from "react";

export interface ToolbarMenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
}

interface Props {
  label: string;
  items: ToolbarMenuItem[];
}

export function ToolbarMenu({ label, items }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-2 py-1 rounded text-xs transition-colors ${
          open ? "bg-white/10 text-text-primary" : "text-text-secondary hover:bg-white/5"
        }`}
      >
        {label}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-[#0f1419] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[200px] z-[100]">
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="border-t border-white/8 my-1" />
            ) : (
              <button
                key={i}
                onClick={() => { item.action?.(); setOpen(false); }}
                disabled={item.disabled}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] text-text-tertiary ml-4">{item.shortcut}</span>
                )}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=toolbar dropdown menu | inputs=label,items | outputs=dropdown menu UI
