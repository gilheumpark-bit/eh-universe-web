"use client";

// ============================================================
// PART 1 — Imports & Data
// ============================================================

import { useState } from "react";
import { X, Keyboard, Search } from "lucide-react";

interface Keybinding { id: string; label: string; shortcut: string; category: string }

const DEFAULT_KEYBINDINGS: Keybinding[] = [
  { id: "new-file", label: "새 파일", shortcut: "Ctrl+N", category: "파일" },
  { id: "open-file", label: "파일 열기", shortcut: "Ctrl+P", category: "파일" },
  { id: "save", label: "저장", shortcut: "Ctrl+S", category: "파일" },
  { id: "close-tab", label: "탭 닫기", shortcut: "Ctrl+W", category: "파일" },
  { id: "find", label: "찾기", shortcut: "Ctrl+F", category: "편집" },
  { id: "replace", label: "바꾸기", shortcut: "Ctrl+H", category: "편집" },
  { id: "goto-line", label: "줄로 이동", shortcut: "Ctrl+G", category: "편집" },
  { id: "comment", label: "주석 토글", shortcut: "Ctrl+/", category: "편집" },
  { id: "duplicate", label: "줄 복제", shortcut: "Shift+Alt+↓", category: "편집" },
  { id: "format", label: "문서 포맷", shortcut: "Shift+Alt+F", category: "편집" },
  { id: "inline-edit", label: "인라인 편집", shortcut: "Ctrl+K", category: "AI" },
  { id: "command-palette", label: "커맨드 팔레트", shortcut: "Ctrl+Shift+P", category: "보기" },
  { id: "toggle-sidebar", label: "사이드바 토글", shortcut: "Ctrl+B", category: "보기" },
  { id: "toggle-terminal", label: "터미널 토글", shortcut: "Ctrl+`", category: "보기" },
  { id: "global-search", label: "전역 검색", shortcut: "Ctrl+Shift+F", category: "보기" },
  { id: "chat", label: "AI 채팅", shortcut: "Ctrl+L", category: "AI" },
  { id: "agent", label: "AI 에이전트", shortcut: "Ctrl+I", category: "AI" },
  { id: "pipeline", label: "파이프라인", shortcut: "Ctrl+Shift+Enter", category: "AI" },
];

// IDENTITY_SEAL: PART-1 | role=Data | inputs=none | outputs=Keybinding[]

// ============================================================
// PART 2 — Component
// ============================================================

interface Props { onClose: () => void }

export function KeybindingsPanel({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? DEFAULT_KEYBINDINGS.filter((k) => k.label.toLowerCase().includes(query.toLowerCase()) || k.shortcut.toLowerCase().includes(query.toLowerCase()))
    : DEFAULT_KEYBINDINGS;
  const categories = [...new Set(filtered.map((k) => k.category))];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0f1419] border border-white/10 rounded-xl shadow-2xl w-[500px] max-h-[500px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <span className="flex items-center gap-2 text-sm font-semibold text-white"><Keyboard size={14} /> 키보드 단축키</span>
          <button onClick={onClose} aria-label="닫기" className="text-white/40 hover:text-white"><X size={14} /></button>
        </div>
        <div className="px-4 py-2 border-b border-white/8">
          <div className="flex items-center gap-2 bg-white/5 rounded px-2 py-1">
            <Search size={12} className="text-white/30" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="단축키 검색..."
              className="flex-1 bg-transparent text-xs text-white outline-none" autoFocus />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[380px] p-2">
          {categories.map((cat) => (
            <div key={cat} className="mb-3">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-2 mb-1">{cat}</p>
              {filtered.filter((k) => k.category === cat).map((k) => (
                <div key={k.id} className="flex items-center justify-between px-2 py-1 text-xs text-white/70 hover:bg-white/5 rounded">
                  <span>{k.label}</span>
                  <kbd className="text-[10px] px-1.5 py-0.5 bg-[#0a0e17] border border-white/10 rounded font-mono text-white/50">{k.shortcut}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=Component | inputs=Props | outputs=JSX
