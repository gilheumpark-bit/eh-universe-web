"use client";

import { MessageSquare, Terminal, Activity, Settings, Code2, Bot, Layers, Columns2, Search, PenTool, AlertTriangle, Bug, Undo2, Redo2, ZoomIn, ZoomOut, Users, Database, Eye, Rocket } from "lucide-react";
import { ToolbarMenu } from "./ToolbarMenu";
import { Tooltip } from "./Tooltip";
import { useLocale } from "@/lib/i18n";

interface Props {
  onToggleChat: () => void;
  onToggleTerminal: () => void;
  onTogglePipeline: () => void;
  onToggleAgent: () => void;
  onToggleComposer: () => void;
  onToggleCanvas: () => void;
  onToggleSplit: () => void;
  onToggleSidebar?: () => void;
  onToggleSearch?: () => void;
  onNewFile?: () => void;
  onOpenSettings?: () => void;
  onOpenPalette?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onToggleProblems?: () => void;
  onRunBugFinder?: () => void;
  onToggleCollab?: () => void;
  onToggleDatabase?: () => void;
  onTogglePreview?: () => void;
  onToggleAutopilot?: () => void;
  onDeploy?: () => void;
  showCollab?: boolean;
  showDatabase?: boolean;
  showPreview?: boolean;
  showAutopilot?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  fontSize?: number;
  showChat: boolean;
  showAgent: boolean;
  showComposer: boolean;
  showCanvas: boolean;
  showTerminal: boolean;
  showPipeline: boolean;
  showProblems?: boolean;
}

export function Toolbar({
  onToggleChat, onToggleTerminal, onTogglePipeline,
  onToggleAgent, onToggleComposer, onToggleCanvas, onToggleSplit,
  onToggleSidebar, onToggleSearch, onNewFile, onOpenSettings,
  onOpenPalette, onExport, onImport, onToggleProblems, onRunBugFinder,
  onUndo, onRedo, onZoomIn, onZoomOut, onZoomReset, onFind, onReplace, fontSize,
  onToggleCollab, onToggleDatabase, onTogglePreview, onToggleAutopilot, onDeploy,
  showChat, showAgent, showComposer, showCanvas, showTerminal, showPipeline, showProblems,
  showCollab, showDatabase, showPreview, showAutopilot,
}: Props) {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      {/* Left — Logo */}
      <div className="flex items-center gap-2">
        <Code2 size={18} className="text-[var(--accent-blue)]" />
        <span className="text-sm font-bold tracking-tight">
          CSL <span className="text-[var(--accent-purple)]">IDE</span>
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-[var(--accent-green)]/15 text-[var(--accent-green)] rounded font-mono">
          v7.0
        </span>
      </div>

      {/* Center — Menus + View Toggles */}
      <div className="flex items-center gap-0.5 text-xs">
        <ToolbarMenu label="File" items={[
          { label: t('menu.newFile'), shortcut: "Ctrl+N", action: onNewFile },
          { label: t('menu.openFolder'), shortcut: "Ctrl+O", action: onImport },
          { divider: true, label: "" },
          { label: t('menu.exportProject'), action: onExport },
          { label: t('menu.importProject'), action: onImport },
          { divider: true, label: "" },
          { label: t('common.settings'), action: onOpenSettings },
        ]} />
        <ToolbarMenu label="Edit" items={[
          { label: t('menu.undo'), shortcut: "Ctrl+Z", action: onUndo },
          { label: t('menu.redo'), shortcut: "Ctrl+Y", action: onRedo },
          { divider: true, label: "" },
          { label: t('menu.find'), shortcut: "Ctrl+F", action: onFind },
          { label: t('menu.replace'), shortcut: "Ctrl+H", action: onReplace },
          { label: t('menu.globalSearch'), shortcut: "Ctrl+Shift+F", action: onToggleSearch },
        ]} />
        <ToolbarMenu label="View" items={[
          { label: t('menu.commandPalette'), shortcut: "Ctrl+Shift+P", action: onOpenPalette },
          { divider: true, label: "" },
          { label: t('menu.toggleSidebar'), shortcut: "Ctrl+B", action: onToggleSidebar },
          { label: t('menu.toggleTerminal'), shortcut: "Ctrl+`", action: onToggleTerminal },
          { label: t('menu.pipelineToggle'), action: onTogglePipeline },
          { divider: true, label: "" },
          { label: t('menu.canvasMode'), action: onToggleCanvas },
          { label: t('menu.splitMode'), action: onToggleSplit },
        ]} />
        <ToolbarMenu label="AI" items={[
          { label: t('ai.chat'), shortcut: "Ctrl+K", action: onToggleChat },
          { label: t('ai.agent'), shortcut: "Ctrl+I", action: onToggleAgent },
          { label: t('ai.composer'), shortcut: "Ctrl+Shift+I", action: onToggleComposer },
          { divider: true, label: "" },
          { label: t('menu.pipelineRun'), shortcut: "Ctrl+Shift+Enter", action: onTogglePipeline },
          { divider: true, label: "" },
          { label: t('menu.bugFinderRun'), action: onRunBugFinder },
        ]} />
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <button onClick={onUndo} title="Undo (Ctrl+Z)" className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
          <Undo2 size={14} />
        </button>
        <button onClick={onRedo} title="Redo (Ctrl+Y)" className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
          <Redo2 size={14} />
        </button>
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <button onClick={onZoomOut} title="Zoom Out (Ctrl+-)" className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
          <ZoomOut size={14} />
        </button>
        {fontSize != null && (
          <button onClick={onZoomReset} title="Reset Zoom (Ctrl+0)" className="px-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors">
            {fontSize}px
          </button>
        )}
        <button onClick={onZoomIn} title="Zoom In (Ctrl+=)" className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
          <ZoomIn size={14} />
        </button>
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <ToolbarButton icon={<Layers size={14} />} label="Canvas" active={showCanvas} onClick={onToggleCanvas} />
        <ToolbarButton icon={<Columns2 size={14} />} label="Split" active={false} onClick={onToggleSplit} />
      </div>

      {/* Right — Panel Toggles */}
      <div className="flex items-center gap-1">
        <ToolbarButton icon={<Search size={14} />} label="Search" active={false} onClick={() => onToggleSearch?.()} />
        <ToolbarButton icon={<Activity size={14} />} label="Pipeline" active={showPipeline} onClick={onTogglePipeline} />
        <ToolbarButton icon={<AlertTriangle size={14} />} label="Problems" active={!!showProblems} onClick={() => onToggleProblems?.()} accent="purple" />
        <ToolbarButton icon={<Bug size={14} />} label="Bug Finder" active={false} onClick={() => onRunBugFinder?.()} accent="green" />
        <ToolbarButton icon={<Terminal size={14} />} label="Terminal" active={showTerminal} onClick={onToggleTerminal} />
        <ToolbarButton icon={<Database size={14} />} label="DB" active={!!showDatabase} onClick={() => onToggleDatabase?.()} />
        <ToolbarButton icon={<Eye size={14} />} label="Preview" active={!!showPreview} onClick={() => onTogglePreview?.()} accent="green" />
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <ToolbarButton icon={<MessageSquare size={14} />} label="Chat" active={showChat} onClick={onToggleChat} />
        <ToolbarButton icon={<Bot size={14} />} label="Agent" active={showAgent} onClick={onToggleAgent} accent="green" />
        <ToolbarButton icon={<PenTool size={14} />} label="Composer" active={showComposer} onClick={onToggleComposer} accent="purple" />
        <ToolbarButton icon={<Users size={14} />} label="Collab" active={!!showCollab} onClick={() => onToggleCollab?.()} accent="green" />
        <ToolbarButton icon={<Rocket size={14} />} label="Autopilot" active={!!showAutopilot} onClick={() => onToggleAutopilot?.()} accent="purple" />
        <ToolbarButton icon={<Rocket size={14} />} label="Deploy" active={false} onClick={() => onDeploy?.()} accent="green" />
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <button onClick={onOpenSettings} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({ icon, label, active, onClick, accent = "blue" }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; accent?: "blue" | "green" | "purple";
}) {
  const colors = {
    blue: "bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]",
    green: "bg-[var(--accent-green)]/15 text-[var(--accent-green)]",
    purple: "bg-[var(--accent-purple)]/15 text-[var(--accent-purple)]",
  };

  return (
    <Tooltip content={label} position="bottom">
      <button
        onClick={onClick}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
          active ? colors[accent] : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
        }`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </button>
    </Tooltip>
  );
}
