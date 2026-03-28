"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useEffect, useCallback } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutGroup {
  category: string;
  shortcuts: Array<{ keys: string; description: string }>;
}

interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ShortcutGroup

// ============================================================
// PART 2 — Shortcut Data
// ============================================================

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: "Editor",
    shortcuts: [
      { keys: "Ctrl+S", description: "Save file" },
      { keys: "Ctrl+Z", description: "Undo" },
      { keys: "Ctrl+Shift+Z", description: "Redo" },
      { keys: "Ctrl+D", description: "Select next occurrence" },
      { keys: "Ctrl+/", description: "Toggle comment" },
      { keys: "Alt+Up/Down", description: "Move line up/down" },
    ],
  },
  {
    category: "Terminal",
    shortcuts: [
      { keys: "Ctrl+`", description: "Toggle terminal" },
      { keys: "Ctrl+Shift+`", description: "New terminal" },
      { keys: "Ctrl+C", description: "Cancel running process" },
    ],
  },
  {
    category: "Navigation",
    shortcuts: [
      { keys: "Ctrl+P", description: "Quick file open" },
      { keys: "Ctrl+Shift+P", description: "Command palette" },
      { keys: "Ctrl+G", description: "Go to line" },
      { keys: "F1-F8", description: "Switch tabs (1-8)" },
      { keys: "Ctrl+W", description: "Close tab" },
      { keys: "Ctrl+Tab", description: "Next tab" },
    ],
  },
  {
    category: "AI",
    shortcuts: [
      { keys: "Ctrl+I", description: "AI inline suggestion" },
      { keys: "Ctrl+L", description: "Open AI chat" },
      { keys: "Ctrl+K", description: "AI command" },
      { keys: "@", description: "Mention file / agent / symbol" },
      { keys: "Ctrl+?", description: "Show shortcuts (this panel)" },
    ],
  },
];

// IDENTITY_SEAL: PART-2 | role=ShortcutData | inputs=none | outputs=ShortcutGroup[]

// ============================================================
// PART 3 — Component
// ============================================================

export default function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[640px] max-h-[80vh] overflow-y-auto rounded-xl border border-white/10 bg-[#1e1e2e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Keyboard size={18} />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                {group.category}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-white/5"
                  >
                    <span className="text-gray-300">{s.description}</span>
                    <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=ShortcutOverlayUI | inputs=open | outputs=JSX
