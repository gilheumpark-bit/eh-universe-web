"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare, Terminal, Activity, Settings, Code2, Bot, Columns2,
  Search, AlertTriangle, Bug, Undo2, Redo2, ZoomIn, ZoomOut, Rocket,
} from "lucide-react";

interface MenuItemDef {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
}

interface Props {
  onToggleChat: () => void;
  onToggleTerminal: () => void;
  onTogglePipeline: () => void;
  onToggleAgent: () => void;
  onToggleSidebar?: () => void;
  onToggleSearch?: () => void;
  onNewFile?: () => void;
  onOpenSettings?: () => void;
  onOpenPalette?: () => void;
  onToggleProblems?: () => void;
  onRunBugFinder?: () => void;
  onDeploy?: () => void;
  onToggleSplit?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  fontSize?: number;
  showChat: boolean;
  showAgent: boolean;
  showTerminal: boolean;
  showPipeline: boolean;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=Props,MenuItemDef

// ============================================================
// PART 2 — ToolbarMenu Sub-component
// ============================================================

function ToolbarMenu({ label, items }: { label: string; items: MenuItemDef[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="px-2 py-1 rounded text-xs text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary transition-colors">{label}</button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-50 min-w-[200px] bg-bg-primary border border-border rounded-lg shadow-xl py-1 backdrop-blur-xl">
          {items.map((item, i) => item.divider ? (
            <div key={i} className="h-px bg-border my-1" />
          ) : (
            <button key={i} onClick={() => { item.action?.(); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary transition-colors">
              <span>{item.label}</span>
              {item.shortcut && <kbd className="text-[10px] text-text-tertiary font-mono">{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=Menu | inputs=label,items | outputs=JSX

// ============================================================
// PART 3 — Toolbar Component
// ============================================================

function ToolbarButton({ icon, label, active, onClick, accent = "purple" }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; accent?: "purple" | "green" | "blue";
}) {
  const colors = {
    purple: "bg-accent-amber/15 text-accent-amber",
    green: "bg-accent-green/15 text-accent-green",
    blue: "bg-accent-purple/15 text-accent-purple",
  };
  return (
    <button onClick={onClick} title={label}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${active ? colors[accent] : "text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary"}`}>
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function Toolbar({
  onToggleChat, onToggleTerminal, onTogglePipeline, onToggleAgent,
  onToggleSidebar, onToggleSearch, onNewFile, onOpenSettings,
  onOpenPalette, onToggleProblems, onRunBugFinder, onDeploy, onToggleSplit,
  onUndo, onRedo, onZoomIn, onZoomOut, onZoomReset, fontSize,
  showChat, showAgent, showTerminal, showPipeline,
}: Props) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-bg-primary border-b border-border">
      <div className="flex items-center gap-2">
        <Code2 size={18} className="text-accent-amber" />
        <span className="text-sm font-bold tracking-tight text-text-primary">EH <span className="text-accent-amber">Code</span></span>
      </div>
      <div className="flex items-center gap-0.5 text-xs">
        <ToolbarMenu label="File" items={[
          { label: "새 파일", shortcut: "Ctrl+N", action: onNewFile },
          { label: "커맨드 팔레트", shortcut: "Ctrl+Shift+P", action: onOpenPalette },
          { divider: true, label: "" },
          { label: "설정", action: onOpenSettings },
        ]} />
        <ToolbarMenu label="Edit" items={[
          { label: "실행 취소", shortcut: "Ctrl+Z", action: onUndo },
          { label: "다시 실행", shortcut: "Ctrl+Y", action: onRedo },
          { divider: true, label: "" },
          { label: "전역 검색", shortcut: "Ctrl+Shift+F", action: onToggleSearch },
        ]} />
        <ToolbarMenu label="View" items={[
          { label: "사이드바 토글", shortcut: "Ctrl+B", action: onToggleSidebar },
          { label: "터미널 토글", shortcut: "Ctrl+`", action: onToggleTerminal },
          { label: "분할 보기", action: onToggleSplit },
        ]} />
        <ToolbarMenu label="NOA" items={[
          { label: "NOA 채팅", shortcut: "Ctrl+L", action: onToggleChat },
          { label: "에이전트", shortcut: "Ctrl+I", action: onToggleAgent },
          { divider: true, label: "" },
          { label: "파이프라인", shortcut: "Ctrl+Shift+Enter", action: onTogglePipeline },
          { label: "버그 파인더", action: onRunBugFinder },
        ]} />
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={onUndo} title="Undo (Ctrl+Z)" aria-label="실행 취소" className="p-1.5 rounded hover:bg-bg-secondary/60 text-text-secondary transition-colors"><Undo2 size={14} /></button>
        <button onClick={onRedo} title="Redo (Ctrl+Y)" aria-label="다시 실행" className="p-1.5 rounded hover:bg-bg-secondary/60 text-text-secondary transition-colors"><Redo2 size={14} /></button>
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={onZoomOut} title="Zoom Out (Ctrl+-)" aria-label="축소" className="p-1.5 rounded hover:bg-bg-secondary/60 text-text-secondary transition-colors"><ZoomOut size={14} /></button>
        {fontSize != null && <button onClick={onZoomReset} title="Reset zoom" aria-label="글꼴 크기 초기화" className="px-1.5 text-[10px] text-text-tertiary hover:bg-bg-secondary/60 rounded transition-colors">{fontSize}px</button>}
        <button onClick={onZoomIn} title="Zoom In (Ctrl+=)" aria-label="확대" className="p-1.5 rounded hover:bg-bg-secondary/60 text-text-secondary transition-colors"><ZoomIn size={14} /></button>
      </div>
      <div className="flex items-center gap-1">
        <ToolbarButton icon={<Search size={14} />} label="Search" active={false} onClick={() => onToggleSearch?.()} />
        <ToolbarButton icon={<Activity size={14} />} label="Pipeline" active={showPipeline} onClick={onTogglePipeline} />
        <ToolbarButton icon={<AlertTriangle size={14} />} label="Problems" active={false} onClick={() => onToggleProblems?.()} />
        <ToolbarButton icon={<Bug size={14} />} label="Bugs" active={false} onClick={() => onRunBugFinder?.()} accent="green" />
        <ToolbarButton icon={<Terminal size={14} />} label="Terminal" active={showTerminal} onClick={onToggleTerminal} />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton icon={<MessageSquare size={14} />} label="Chat" active={showChat} onClick={onToggleChat} accent="blue" />
        <ToolbarButton icon={<Bot size={14} />} label="Agent" active={showAgent} onClick={onToggleAgent} accent="green" />
        <ToolbarButton icon={<Columns2 size={14} />} label="Split" active={false} onClick={() => onToggleSplit?.()} />
        <ToolbarButton icon={<Rocket size={14} />} label="Deploy" active={false} onClick={() => onDeploy?.()} accent="green" />
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={onOpenSettings} aria-label="설정 열기" className="p-1.5 rounded hover:bg-bg-secondary/60 text-text-secondary"><Settings size={14} /></button>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=Component | inputs=Props | outputs=JSX
