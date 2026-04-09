// @ts-nocheck
"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Files, Search, GitBranch, MessageSquare, Activity,
  Edit3, AlertTriangle, Eye, ChevronRight, Settings, X,
  Plus,
  type LucideIcon,
  Upload, Bug, Play, Shield, List, Layout,
  Package, BarChart3, Users, Wand2,
  Terminal, Layers, Brain, BrainCircuit, Cpu, TrendingUp,
  Network, GitMerge, GitFork, Database, GraduationCap,
  FolderKanban, Keyboard, Key, ShieldCheck, GitCompareArrows,
  BookA, Boxes, BookOpen, Code2, PenTool, Hash, Clock, Zap,
  GitCompare,
} from "lucide-react";
import { L4 } from "@/lib/i18n";
import type { FileNode, OpenFile } from "@eh/quill-engine/types";
import type { RightPanel } from "@/lib/code-studio/core/panel-registry";
import { getVisiblePanels } from "@/lib/code-studio/core/panel-registry";
import type { BugReport } from "@eh/quill-engine/pipeline/bugfinder";
import type { StressReport } from "@eh/quill-engine/pipeline/stress-test";
import type { VerificationResult } from "@eh/quill-engine/pipeline/verification-loop";
import type { ComposerMode } from "@/lib/code-studio/core/composer-state";
import type { useCodeStudioPanels } from "@/hooks/useCodeStudioPanels";
import * as PI from "@/components/code-studio/PanelImports";
import { renderRightPanelBranch } from "@/components/code-studio/right-panel-branch";
import { ThemeToggle } from "@/components/code-studio/ThemeToggle";
import { loadActivityBarOrder, saveActivityBarOrder } from "@/lib/code-studio/activity-bar-order";

/** Map registry icon names → lucide-react components for the activity bar */
const LUCIDE_MAP: Record<string, LucideIcon> = {
  MessageSquare, Activity, GitBranch, Upload, Bug, Search, Play,
  Shield, Edit3, AlertTriangle, Eye, List, Layout, Settings,
  Package, BarChart3, Users, Wand2,
  Terminal, Layers, Brain, BrainCircuit, Cpu, TrendingUp,
  Network, GitMerge, GitFork, Database, GraduationCap,
  FolderKanban, Keyboard, Key, ShieldCheck, GitCompareArrows,
  BookA, Boxes, BookOpen, Code2, PenTool, Hash, Clock, Zap,
  GitCompare,
};

/** Maps engine bug reports to Problems panel finding shape (memoize at call sites). */
function mapBugReportsToProblemFindings(bugReports: BugReport[]) {
  return bugReports.map((b) => ({
    severity: (b.severity === "critical" ? "critical" : b.severity === "high" ? "major" : b.severity === "medium" ? "minor" : "info") as "critical" | "major" | "minor" | "info",
    message: b.description,
    line: b.line,
    team: b.category,
  }));
}

interface PipelineStage {
  name: string;
  status: "pass" | "warn" | "fail" | "running" | "pending";
  score?: number;
  message?: string;
}

export interface CodeStudioPanelManagerProps {
  // Panel state
  rightPanel: RightPanel | null;
  onSetRightPanel: (panel: RightPanel | null) => void;
  showAdvancedPanels: boolean;
  onToggleAdvancedPanels: () => void;
  showSettings: boolean;
  onToggleSettings: () => void;

  // Bottom panels
  showTerminal: boolean;
  showProblems: boolean;
  showPipelineBottom: boolean;
  onToggleTerminal: () => void;
  onToggleProblems: () => void;
  onTogglePipelineBottom: () => void;
  onCloseAllBottom: () => void;
  termRef: React.RefObject<HTMLDivElement | null>;

  // Data
  files: FileNode[];
  openFiles: OpenFile[];
  activeFile: OpenFile | null;
  activeFileId: string | null;
  bugReports: BugReport[];
  pipelineStages: PipelineStage[];
  pipelineScore: number | null;
  stressReport: StressReport | null;
  isStressTesting: boolean;
  verificationResult: VerificationResult | null;
  isVerifying: boolean;
  verificationScore: number | null;
  currentVerifyRound: number;

  // Composer
  composerMode: ComposerMode;
  onComposerTransition: (mode: ComposerMode) => void;

  // Panel hook state — typed from the actual hook return
  panels: ReturnType<typeof useCodeStudioPanels>;

  // Callbacks
  onFileSelect: (node: FileNode) => void;
  onApplyCode: (code: string, fileName?: string) => void;
  onSetDiffState: (state: { original: string; modified: string; fileName: string } | null) => void;
  fsUpdateContent: (id: string, content: string) => void;
  onSetOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>;
  onApproveFile: (fileName: string) => void;
  onOverrideFile: (fileName: string) => void;
  onRejectFile: (fileName: string) => void;
  stagedFiles: Record<string, string>;
  guardFindingsByFile: Record<string, import("@eh/quill-engine/pipeline/pipeline-teams").Finding[]>;
  onSetFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  handleRunStressTest: () => void;
  handleRunVerification: () => void;
  editorNavigateToLine: (line: number) => void;

  // Toast
  toast: (msg: string, type: "success" | "info" | "error") => void;

  // i18n
  lang: string;
  tcs: Record<string, string>;
}

// IDENTITY_SEAL: PART-1 | role=Imports+Types | inputs=none | outputs=imports,PanelManagerProps

/** 드롭 대상 앞에 끼워 넣기 (remove → insert before target) */
function reorderActivityBarIds(ids: string[], fromId: string, toId: string): string[] {
  if (fromId === toId) return ids;
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0) return ids;
  const next = [...ids];
  const [removed] = next.splice(from, 1);
  const insertAt = next.indexOf(toId);
  next.splice(insertAt, 0, removed);
  return next;
}

// ============================================================
// PART 2 — Activity Bar
// ============================================================

function ActivityBar({
  rightPanel, onSetRightPanel, bugReports, showAdvancedPanels,
  onToggleAdvancedPanels, showSettings, onToggleSettings, lang,
  onAction,
  widthPx,
}: {
  rightPanel: RightPanel | null;
  onSetRightPanel: (panel: RightPanel | null) => void;
  bugReports: BugReport[];
  showAdvancedPanels: boolean;
  onToggleAdvancedPanels: () => void;
  showSettings: boolean;
  onToggleSettings: () => void;
  lang: string;
  onAction?: (actionId: string) => void;
  /** 드래그로 조절되는 액티비티 열 너비(px) */
  widthPx: number;
}) {
  const visiblePanels = getVisiblePanels(showAdvancedPanels);

  const coreItemCatalog: Record<
    string,
    {
      id: string;
      icon: LucideIcon;
      label: string;
      labelKo: string;
      shortcut?: string;
      isAction?: boolean;
    }
  > = {
    files: { id: "files", icon: Files, label: "Explorer", labelKo: "탐색기", shortcut: "Ctrl+Shift+E" },
    chat: { id: "chat", icon: MessageSquare, label: "AI Chat", labelKo: "AI 채팅" },
    "action-demo": { id: "action-demo", icon: Play, label: "Open Demo", labelKo: "데모 열기", isAction: true },
    "action-new-file": { id: "action-new-file", icon: Plus, label: "New File", labelKo: "새 파일", isAction: true },
    "project-spec": { id: "project-spec", icon: Wand2, label: "Project Spec", labelKo: "이지모드 진입" },
    pipeline: { id: "pipeline", icon: Activity, label: "Pipeline", labelKo: "파이프라인" },
    search: { id: "search", icon: Search, label: "Search", labelKo: "파일 검색", shortcut: "Ctrl+Shift+F" },
    git: { id: "git", icon: GitBranch, label: "Git", labelKo: "Git" },
    review: { id: "review", icon: AlertTriangle, label: "Review", labelKo: "리뷰 센터" },
    composer: { id: "composer", icon: Edit3, label: "Composer", labelKo: "멀티파일 작성기" },
    preview: { id: "preview", icon: Eye, label: "Preview", labelKo: "실시간 프리뷰" },
    canvas: { id: "canvas", icon: PenTool, label: "Canvas", labelKo: "캔버스" },
  };

  const [itemOrder, setItemOrder] = useState<string[]>(() => loadActivityBarOrder());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  /** dragOver 시점에 getData가 비는 브라우저 대비 */
  const draggedIdRef = useRef<string | null>(null);

  useEffect(() => {
    saveActivityBarOrder(itemOrder);
  }, [itemOrder]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    draggedIdRef.current = id;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const from = draggedIdRef.current;
    if (from && from !== id) setDropTargetId(id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain") || draggedIdRef.current;
    draggedIdRef.current = null;
    if (!fromId || fromId === targetId) {
      setDraggedId(null);
      setDropTargetId(null);
      return;
    }
    setItemOrder((prev) => reorderActivityBarIds(prev, fromId, targetId));
    setDraggedId(null);
    setDropTargetId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDropTargetId(null);
  }, []);

  const orderedCoreItems = itemOrder.map((id) => coreItemCatalog[id]).filter(Boolean);
  const majorIds = new Set(["files", "search", "chat", "composer", "canvas", "preview"]);
  const majorItems = orderedCoreItems.filter(item => majorIds.has(item.id));
  const minorItems = orderedCoreItems.filter(item => !majorIds.has(item.id));

  const renderIconBtn = (item: typeof coreItemCatalog[string]) => {
    const displayLabel = L4(lang, { ko: item.labelKo, en: item.label });
    const reorderHint = L4(lang, { ko: "드래그하여 순서 변경", en: "Drag to reorder" });
    const titleBase = `${displayLabel}${item.shortcut ? ` (${item.shortcut})` : ""}`;
    const isDrop = dropTargetId === item.id && draggedId && draggedId !== item.id;
    return (
      <button
        key={item.id}
        type="button"
        draggable
        data-dragging={draggedId === item.id ? "true" : undefined}
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragOver={(e) => handleDragOver(e, item.id)}
        onDrop={(e) => handleDrop(e, item.id)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (item.isAction) {
            onAction?.(item.id);
          } else {
            onSetRightPanel(rightPanel === item.id ? null : (item.id as RightPanel));
          }
        }}
        className={`relative w-10 h-10 flex shrink-0 items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/6 group cursor-grab active:cursor-grabbing ${
          draggedId === item.id ? "opacity-50" : ""
        } ${isDrop ? "ring-2 ring-accent-purple/60 ring-offset-1 ring-offset-bg-primary rounded-lg" : ""}`}
        title={`${titleBase} — ${reorderHint}`}
      >
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r bg-accent-purple transition-all duration-200 ${
          rightPanel === item.id ? "h-5 opacity-100" : "h-0 opacity-0"
        }`} />
        <item.icon className={`h-[18px] w-[18px] transition-colors ${
          rightPanel === item.id ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"
        }`} />
        {item.id === "pipeline" && bugReports.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-accent-red text-[8px] text-white flex items-center justify-center">{bugReports.length}</span>
        )}
      </button>
    );
  };

  return (
    <div
      style={{ width: widthPx }}
      className="shrink-0 border-r border-white/8 bg-bg-primary flex flex-col items-center py-3 gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden min-w-0"
    >

      {/* Major Icons Container */}
      <div
        className="flex flex-wrap justify-center gap-1 w-full px-1"
        role="toolbar"
        aria-label={L4(lang, { ko: "주요 도구", en: "Primary Tools" })}
      >
        {majorItems.map(renderIconBtn)}
      </div>

      <div className="w-6 h-[1px] bg-white/10 shrink-0 my-1 rounded-full" />

      {/* Minor & Advanced Icons Container */}
      <div
        className="flex flex-wrap justify-center gap-1 w-full px-1"
        role="toolbar"
        aria-label={L4(lang, { ko: "보조 도구", en: "Secondary Tools" })}
      >
        {minorItems.map(renderIconBtn)}

        {/* Advanced panels */}
        {showAdvancedPanels && visiblePanels
          .filter(p => !["chat","search","outline","preview","composer","pipeline","bugs","git"].includes(p.id))
          .map(p => {
            const Icon = LUCIDE_MAP[p.icon];
            const lbl = L4(lang, { ko: p.labelKo, en: p.label });
            return (
              <button key={p.id} onClick={() => onSetRightPanel(rightPanel === p.id ? null : p.id as RightPanel)}
                className="relative w-10 h-10 flex shrink-0 items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/6 group"
                title={lbl}>
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r bg-accent-purple transition-all duration-200 ${rightPanel === p.id ? "h-5 opacity-100" : "h-0 opacity-0"}`} />
                {Icon ? <Icon className={`h-[18px] w-[18px] transition-colors ${rightPanel === p.id ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"}`} /> : <span className="text-[10px] text-text-tertiary">{p.label.substring(0,2)}</span>}
              </button>
            );
          })}
      </div>

      <div className="w-6 h-[1px] bg-white/10 shrink-0 my-1 rounded-full" />

      {/* System Category */}
      <div className="flex flex-wrap justify-center gap-1 w-full px-1 shrink-0 pb-1">
        <ThemeToggle
          variant="icon-only"
          className="!min-h-10 !min-w-10 shrink-0 rounded-lg text-text-tertiary hover:bg-white/6 hover:text-text-secondary"
        />
        <button onClick={onToggleAdvancedPanels}
          className="w-10 h-10 flex shrink-0 items-center justify-center rounded-lg transition-all hover:bg-white/6"
          title={showAdvancedPanels ? L4(lang, { ko: "확장 패널 숨기기", en: "Hide advanced panels" }) : L4(lang, { ko: "모든 패널 보기", en: "Show all panels" })}>
          <ChevronRight className={`h-[18px] w-[18px] text-text-tertiary transition-transform ${showAdvancedPanels ? "rotate-180" : ""}`} />
        </button>
        <button onClick={onToggleSettings} className="w-10 h-10 flex shrink-0 items-center justify-center rounded-lg transition-all hover:bg-white/6" title="Settings">
          <Settings className={`h-[18px] w-[18px] ${showSettings ? "text-accent-amber" : "text-text-tertiary hover:text-text-secondary"}`} />
        </button>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=ActivityBar | inputs=panelState | outputs=ActivityBarUI

// ============================================================
// PART 3 — Right Panel Renderer
// ============================================================

function RightPanelContent(props: CodeStudioPanelManagerProps) {
  const problemFindings = useMemo(
    () => mapBugReportsToProblemFindings(props.bugReports),
    [props.bugReports],
  );

  if (!props.rightPanel) return null;

  const body = renderRightPanelBranch(props.rightPanel, props, problemFindings);
  if (body == null) return null;

  // Parent (Shell) sets width; fill height so flex children (e.g. ChatPanel h-full) work.
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-bg-secondary cs-panel-enter">
      {body}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=RightPanelRenderer | inputs=panelPropsMap | outputs=panelUI

// ============================================================
// PART 4 — Bottom Panels
// ============================================================

function BottomPanels({
  showTerminal, showProblems, showPipelineBottom,
  onToggleTerminal, onToggleProblems, onTogglePipelineBottom,
  onCloseAllBottom, termRef, bugReports, pipelineStages, tcs,
}: {
  showTerminal: boolean;
  showProblems: boolean;
  showPipelineBottom: boolean;
  onToggleTerminal: () => void;
  onToggleProblems: () => void;
  onTogglePipelineBottom: () => void;
  onCloseAllBottom: () => void;
  termRef: React.RefObject<HTMLDivElement | null>;
  bugReports: BugReport[];
  pipelineStages: PipelineStage[];
  tcs: Record<string, string>;
}) {
  const problemFindings = useMemo(
    () => mapBugReportsToProblemFindings(bugReports),
    [bugReports],
  );

  if (!showTerminal && !showProblems && !showPipelineBottom) return null;

  return (
    <div className="shrink-0 border-t border-border flex max-h-[min(520px,55vh)] min-h-0 w-full flex-col overflow-hidden bg-bg-primary">
      <div className="flex shrink-0 items-center gap-1 border-b border-white/8 bg-bg-secondary px-2 py-1">
        <button onClick={onToggleTerminal} title={tcs.consoleTooltip} className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors duration-150 ${showTerminal ? "text-accent-green bg-accent-green/10" : "text-text-tertiary hover:text-text-secondary"}`}>{tcs.console}</button>
        <button onClick={onToggleProblems} className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors duration-150 ${showProblems ? "text-accent-red bg-accent-red/10" : "text-text-tertiary hover:text-text-secondary"}`}>Problems {bugReports.length > 0 ? `(${bugReports.length})` : ""}</button>
        <button onClick={onTogglePipelineBottom} className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors duration-150 ${showPipelineBottom ? "text-accent-blue bg-accent-blue/10" : "text-text-tertiary hover:text-text-secondary"}`}>Pipeline</button>
        <button onClick={onCloseAllBottom} aria-label="하단 패널 닫기" className="ml-auto rounded p-0.5 text-text-tertiary hover:text-text-primary transition-colors duration-150"><X className="h-3 w-3" /></button>
      </div>
      {showTerminal && (
        <div className="min-h-[min(320px,42vh)] h-[min(400px,48vh)] w-full bg-bg-primary dark:bg-[#0d0d0d]">
          <div ref={termRef} className="h-full min-h-[inherit] w-full" />
        </div>
      )}
      {showProblems && (
        <div className="min-h-[min(240px,35vh)] max-h-[min(360px,45vh)] w-full overflow-auto">
          <PI.ProblemsPanelComponent findings={problemFindings} />
        </div>
      )}
      {showPipelineBottom && pipelineStages.length > 0 && (
        <div className="min-h-[min(200px,30vh)] max-h-[min(320px,40vh)] w-full overflow-auto p-2">
          {pipelineStages.map((s) => (
            <div key={s.name} className="flex items-center gap-2 py-1 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${s.status === "pass" ? "bg-accent-green" : s.status === "warn" ? "bg-accent-amber" : s.status === "fail" ? "bg-accent-red" : "bg-white/20"}`} />
              <span className="text-text-secondary flex-1">{s.name}</span>
              <span className="text-text-tertiary">{s.score ?? "-"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=BottomPanels | inputs=panelToggles | outputs=BottomPanelUI

// ============================================================
// PART 5 — Exported Composite
// ============================================================

export { ActivityBar, RightPanelContent, BottomPanels };
export type { PipelineStage };

// IDENTITY_SEAL: PART-5 | role=Exports | inputs=none | outputs=ActivityBar,RightPanelContent,BottomPanels
