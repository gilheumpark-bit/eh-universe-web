"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React from "react";
import Link from "next/link";
import {
  Files, Search, GitBranch, MessageSquare, Activity,
  Edit3, AlertTriangle, Eye, ChevronRight, Settings, X,
  Home, Plus,
  type LucideIcon,
  Upload, Bug, Play, Shield, List, Layout,
  Package, BarChart3, Users, Wand2,
} from "lucide-react";
import { L4 } from "@/lib/i18n";
import type { FileNode, OpenFile } from "@/lib/code-studio/core/types";
import type { RightPanel } from "@/lib/code-studio/core/panel-registry";
import { getVisiblePanels } from "@/lib/code-studio/core/panel-registry";
import { detectLanguage } from "@/lib/code-studio/core/types";
import type { BugReport } from "@/lib/code-studio/pipeline/bugfinder";
import type { StressReport } from "@/lib/code-studio/pipeline/stress-test";
import type { VerificationResult } from "@/lib/code-studio/pipeline/verification-loop";
import type { ComposerMode } from "@/lib/code-studio/core/composer-state";
import { saveProjectSpec } from "@/lib/code-studio/core/project-spec";
import {
  CODE_STUDIO_SPEC_CHAT_SEED_KEY,
  buildProjectSpecChatSeed,
  toCoreProjectSpec,
  type ProjectSpecFormData,
} from "@/lib/code-studio/core/project-spec-bridge";
import { explainCode, lintCode, generateDocstring } from "@/lib/code-studio/ai/ai-features";
import type { useCodeStudioPanels } from "@/hooks/useCodeStudioPanels";
import * as PI from "@/components/code-studio/PanelImports";

/** Map registry icon names → lucide-react components for the activity bar */
const LUCIDE_MAP: Record<string, LucideIcon> = {
  MessageSquare, Activity, GitBranch, Upload, Bug, Search, Play,
  Shield, Edit3, AlertTriangle, Eye, List, Layout, Settings,
  Package, BarChart3, Users, Wand2,
};

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
  onRejectFile: (fileName: string) => void;
  stagedFiles: Record<string, string>;
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

// ============================================================
// PART 2 — Activity Bar
// ============================================================

function ActivityBar({
  rightPanel, onSetRightPanel, bugReports, showAdvancedPanels,
  onToggleAdvancedPanels, showSettings, onToggleSettings, lang,
  onAction,
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
}) {
  const visiblePanels = getVisiblePanels(showAdvancedPanels);
  const coreItems = [
    { id: "files" as const, icon: Files, label: "Explorer", labelKo: "탐색기", shortcut: "Ctrl+Shift+E" },
    { id: "chat" as const, icon: MessageSquare, label: "AI Chat", labelKo: "AI 채팅", shortcut: undefined },
    { id: "action-demo", icon: Play, label: "Open Demo", labelKo: "데모 열기", shortcut: undefined, isAction: true },
    { id: "action-new-file", icon: Plus, label: "New File", labelKo: "새 파일", shortcut: undefined, isAction: true },
    { id: "project-spec" as const, icon: Wand2, label: "Project Spec", labelKo: "이지모드 진입", shortcut: undefined },
    { id: "pipeline" as const, icon: Activity, label: "Pipeline", labelKo: "파이프라인", shortcut: undefined },
    { id: "search" as const, icon: Search, label: "Search", labelKo: "파일 검색", shortcut: "Ctrl+Shift+F" },
    { id: "git" as const, icon: GitBranch, label: "Git", labelKo: "Git", shortcut: undefined },
    { id: "review" as const, icon: AlertTriangle, label: "Review", labelKo: "리뷰 센터", shortcut: undefined },
    { id: "composer" as const, icon: Edit3, label: "Composer", labelKo: "멀티파일 작성기", shortcut: undefined },
    { id: "preview" as const, icon: Eye, label: "Preview", labelKo: "실시간 프리뷰", shortcut: undefined },
  ];

  return (
    <div className="w-12 shrink-0 border-r border-white/8 bg-bg-primary flex flex-col items-center py-2 gap-1">
      {/* Home button — always visible at the top */}
      <Link
        href="/"
        className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-accent-amber/10 group mb-2"
        title={L4(lang, { ko: "홈으로", en: "Go Home", ja: "ホームへ", zh: "返回首页" })}
      >
        <Home className="h-[18px] w-[18px] text-text-tertiary group-hover:text-accent-amber transition-colors" />
      </Link>
      <div className="w-6 h-px bg-white/10 mb-2" />
      
      {coreItems.map((item) => {
        const displayLabel = L4(lang, { ko: item.labelKo, en: item.label });
        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.isAction) {
                onAction?.(item.id);
              } else {
                onSetRightPanel(rightPanel === item.id ? null : item.id as RightPanel);
              }
            }}
            className="relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/6 group"
            title={`${displayLabel}${item.shortcut ? ` (${item.shortcut})` : ""}`}
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
      })}

      {/* Advanced panels */}
      {showAdvancedPanels && visiblePanels
        .filter(p => !["chat","search","outline","preview","composer","pipeline","bugs","git"].includes(p.id))
        .map(p => {
          const Icon = LUCIDE_MAP[p.icon];
          const lbl = L4(lang, { ko: p.labelKo, en: p.label });
          return (
            <button key={p.id} onClick={() => onSetRightPanel(rightPanel === p.id ? null : p.id as RightPanel)}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/6 group"
              title={lbl}>
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r bg-accent-purple transition-all duration-200 ${rightPanel === p.id ? "h-5 opacity-100" : "h-0 opacity-0"}`} />
              {Icon ? <Icon className={`h-[18px] w-[18px] transition-colors ${rightPanel === p.id ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"}`} /> : <span className="text-[10px] text-text-tertiary">{p.label.substring(0,2)}</span>}
            </button>
          );
        })}

      <div className="flex-1" />

      <button onClick={onToggleAdvancedPanels}
        className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-white/6"
        title={showAdvancedPanels ? "Hide advanced panels" : "Show all panels"}>
        <ChevronRight className={`h-[18px] w-[18px] text-text-tertiary transition-transform ${showAdvancedPanels ? "rotate-90" : ""}`} />
      </button>
      <button onClick={onToggleSettings} className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-white/6" title="Settings">
        <Settings className={`h-[18px] w-[18px] ${showSettings ? "text-accent-amber" : "text-text-tertiary hover:text-text-secondary"}`} />
      </button>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=ActivityBar | inputs=panelState | outputs=ActivityBarUI

// ============================================================
// PART 3 — Right Panel Renderer
// ============================================================

/** Finds a FileNode by basename in the tree */
function findFileNodeByName(nodes: FileNode[], name: string): FileNode | null {
  const basename = name.includes("/") ? name.split("/").pop()! : name;
  for (const n of nodes) {
    if (n.type === "file" && n.name === basename) return n;
    if (n.children) {
      const found = findFileNodeByName(n.children, basename);
      if (found) return found;
    }
  }
  return null;
}

function RightPanelContent(props: CodeStudioPanelManagerProps) {
  const {
    rightPanel, onSetRightPanel, files, openFiles, activeFile, activeFileId,
    bugReports, pipelineStages, pipelineScore, stressReport, isStressTesting,
    verificationResult, isVerifying, verificationScore, currentVerifyRound,
    composerMode, onComposerTransition, panels,
    onFileSelect, onApplyCode, onSetDiffState, fsUpdateContent,
    onSetOpenFiles, onSetFiles, handleRunStressTest, handleRunVerification,
    editorNavigateToLine, toast, onApproveFile, onRejectFile, stagedFiles,
  } = props;

  if (!rightPanel) return null;

  const problemFindings = bugReports.map((b) => ({
    severity: (b.severity === "critical" ? "critical" : b.severity === "high" ? "major" : b.severity === "medium" ? "minor" : "info") as "critical" | "major" | "minor" | "info",
    message: b.description,
    line: b.line,
    team: b.category,
  }));

  const panelPropsMap: Record<string, () => React.ReactNode> = {
    "quick-verify": () => (
      <PI.QuickVerifyComponent
        onStartVerify={(code: string, mode: string) => {
          // 검증 전용: 코드를 에이전트 태스크로 전달 + 검증 모드 표시
          const task = mode === "verify"
            ? `## Code Verification Request\n\nReview the following code for security vulnerabilities, performance issues, memory leaks, dead code, and convention violations.\n\n\`\`\`\n${code}\n\`\`\``
            : code;
          localStorage.setItem("eh-cs-agent-task", task);
          localStorage.setItem("eh-cs-agent-mode", mode);
          onSetRightPanel("agents");
          toast(mode === "verify" ? "검증 에이전트로 이동합니다." : "생성 + 검증을 시작합니다.", "success");
        }}
        onEasyMode={() => onSetRightPanel("project-spec")}
        onClose={() => onSetRightPanel(null)}
      />
    ),
    "project-spec": () => (
      <PI.ProjectSpecFormComponent
        onComplete={(spec: ProjectSpecFormData) => {
          const coreSpec = toCoreProjectSpec(spec);
          saveProjectSpec(coreSpec);
          const chatSeed = buildProjectSpecChatSeed(coreSpec, spec);
          localStorage.setItem(CODE_STUDIO_SPEC_CHAT_SEED_KEY, chatSeed);
          // 에이전트 파이프라인용 태스크도 저장
          localStorage.setItem("eh-cs-agent-task", chatSeed);
          toast("명세서 저장 완료. 에이전트 파이프라인으로 이동합니다.", "success");
          onSetRightPanel("agents");
        }}
        onClose={() => onSetRightPanel(null)}
      />
    ),
    "chat": () => (
      <PI.ChatPanelComponent
        activeFileContent={activeFile?.content}
        activeFileName={activeFile?.name}
        activeFileLanguage={activeFile?.language}
        allFileNames={openFiles.map(f => f.name)}
        onApplyCode={onApplyCode}
      />
    ),
    "pipeline": () => {
      const pipelineResult = pipelineStages.length > 0 ? {
        stages: pipelineStages.map((s) => ({
          stage: s.name, status: s.status, score: s.score ?? 0,
          findings: s.message ? [{ severity: s.status === "fail" ? "critical" as const : "minor" as const, message: s.message, rule: s.name }] : [],
        })),
        overallScore: pipelineScore ?? 0,
        overallStatus: ((pipelineScore ?? 0) >= 80 ? "pass" : (pipelineScore ?? 0) >= 60 ? "warn" : "fail") as "pass" | "warn" | "fail",
        timestamp: Date.now(),
      } : null;
      return <PI.PipelinePanelComponent result={pipelineResult} />;
    },
    "git": () => <PI.GitPanelComponent files={files} openFiles={openFiles} onRestore={(fid: string, content: string) => {
      onSetOpenFiles((prev) => prev.map((f) => f.id === fid ? { ...f, content, isDirty: true } : f));
      fsUpdateContent(fid, content);
    }} onClearDirty={() => onSetOpenFiles((prev) => prev.map((f) => ({ ...f, isDirty: false })))} />,
    "deploy": () => <PI.DeployPanelComponent files={files} language="EN" />,
    "bugs": () => <PI.ProblemsPanelComponent findings={problemFindings} />,
    "autopilot": () => (
      <PI.AutopilotPanelComponent
        code={activeFile?.content ?? ""}
        language={activeFile?.language ?? "plaintext"}
        fileName={activeFile?.name ?? "untitled"}
        onComplete={(result) => {
          if (result && result.files?.length > 0) {
            for (const f of result.files) {
              if (f.content && activeFileId) {
                const newContent = f.content;
                fsUpdateContent(activeFileId, newContent);
                onSetOpenFiles((prev) => prev.map((file) => file.id === activeFileId ? { ...file, content: newContent, isDirty: true } : file));
              }
            }
            toast(`Autopilot applied to ${result.files.length} file(s)`, "success");
          }
        }}
        onClose={() => onSetRightPanel(null)}
      />
    ),
    "agents": () => (
      <PI.AgentPanelComponent
        code={activeFile?.content ?? ""}
        language={activeFile?.language ?? "plaintext"}
        fileName={activeFile?.name ?? "untitled"}
        onApplyCode={onApplyCode}
        onOpenPreview={() => onSetRightPanel("preview")}
      />
    ),
    "search": () => (
      <PI.SearchPanelComponent
        files={files}
        onOpenFile={(name: string) => {
          const node = findFileNodeByName(files, name);
          if (node) onFileSelect(node);
        }}
        onClose={() => onSetRightPanel(null)}
      />
    ),
    "composer": () => (
      <PI.ComposerPanelComponent
        files={files}
        composerMode={composerMode}
        onCompose={async (fileIds: string[], _instruction: string) => {
          onComposerTransition('generating' as ComposerMode);
          const result = fileIds.map((fid) => {
            const f = openFiles.find((of) => of.id === fid);
            return { fileId: fid, fileName: f?.name ?? fid, original: f?.content ?? "", modified: f?.content ?? "", status: "pending" as const };
          });
          onComposerTransition('verifying' as ComposerMode);
          return result;
        }}
        onApplyChanges={(changes: Array<{ fileId: string; modified: string }>) => {
          onComposerTransition('staged' as ComposerMode);
          for (const c of changes) {
            onSetOpenFiles((prev) => prev.map((f) => f.id === c.fileId ? { ...f, content: c.modified, isDirty: true } : f));
            fsUpdateContent(c.fileId, c.modified);
          }
          onComposerTransition('applied' as ComposerMode);
          onComposerTransition('idle' as ComposerMode);
          toast(`Applied ${changes.length} file(s)`, "success");
        }}
        onPreviewDiff={(change: { original: string; modified: string; fileName: string }) => {
          onComposerTransition('review' as ComposerMode);
          onSetDiffState({ original: change.original, modified: change.modified, fileName: change.fileName });
        }}
      />
    ),
    "review": () => {
      const effectiveScore = verificationResult?.finalScore ?? pipelineScore ?? 0;
      const effectiveStatus = verificationResult?.finalStatus ?? ((pipelineScore ?? 0) >= 80 ? "pass" : (pipelineScore ?? 0) >= 60 ? "warn" : "fail") as "pass" | "warn" | "fail";
      return (
        <PI.ReviewCenterComponent
          pipelineResult={pipelineStages.length > 0 ? {
            stages: pipelineStages.map((s) => ({
              stage: s.name, status: s.status, score: s.score ?? 0,
              findings: s.message ? [{ severity: s.status === "fail" ? "critical" as const : "minor" as const, message: s.message, rule: s.name }] : [],
            })),
            overallScore: effectiveScore,
            overallStatus: effectiveStatus,
            timestamp: Date.now(),
          } : null}
          files={Object.entries(stagedFiles || {}).map(([name]) => ({
            name,
            status: "pending",
            comments: [],
            findings: [{ severity: "info" as const, message: "Self-repair fix staged for review", line: 0 }]
          }))}
          onApproveFile={onApproveFile}
          onRejectFile={onRejectFile}
        />
      );
    },
    "preview": () => <PI.PreviewPanelComponent files={files} visible={rightPanel === "preview"} />,
    "outline": () => (
      <PI.OutlinePanelComponent
        code={activeFile?.content ?? ""}
        language={activeFile?.language ?? "plaintext"}
        onNavigate={editorNavigateToLine}
      />
    ),
    "templates": () => <PI.TemplateGalleryComponent onSelectTemplate={(template) => {
      if (template?.files) {
        for (const f of template.files) {
          const node: FileNode = { id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: f.name, type: "file", content: f.content };
          onSetFiles((prev) => [...prev, node]);
        }
        toast(`Template "${template.name}" loaded`, "success");
      }
      onSetRightPanel(null);
    }} onClose={() => onSetRightPanel(null)} />,
    "settings-panel": () => <PI.SettingsPanelComponent />,
    "packages": () => <PI.PackagePanelComponent files={files} />,
    "evaluation": () => <PI.EvaluationPanelComponent files={files} onClose={() => onSetRightPanel(null)} />,
    "collab": () => <PI.CollabPanelComponent onClose={() => onSetRightPanel(null)} />,
    "creator": () => (
      <PI.CodeCreatorPanelComponent
        onMerge={(createdFiles: Array<{ path: string; content: string }>) => {
          for (const f of createdFiles) {
            const node: FileNode = { id: `created-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: f.path.split("/").pop() ?? "file.ts", type: "file", content: f.content };
            onSetFiles((prev) => [...prev, node]);
            onSetOpenFiles((prev) => [...prev, { id: node.id, name: node.name, content: f.content, language: detectLanguage(node.name) }]);
          }
          toast(`Created ${createdFiles.length} file(s)`, "success");
        }}
        onClose={() => onSetRightPanel(null)}
      />
    ),
    "terminal-panel": () => <PI.TerminalPanelComponent files={files} />,
    "multi-terminal": () => <PI.MultiTerminalComponent />,
    "database": () => <PI.DatabasePanelComponent connections={panels.dbConnections} onConnect={panels.handleDbConnect} onExecuteQuery={panels.handleDbQuery} tables={panels.dbTables} />,
    "diff-editor": () => <PI.DiffEditorPanelComponent original="" modified="" />,
    "git-graph": () => <PI.GitGraphComponent commits={[]} branches={[]} currentBranch="main" />,
    "ai-hub": () => <PI.AIHubComponent features={panels.aiFeatures} onToggleFeature={panels.toggleAiFeature} onConfigureProvider={() => onSetRightPanel("api-config" as RightPanel)} />,
    "ai-workspace": () => <PI.AIWorkspaceComponent threads={panels.wsThreads} sharedMemory={panels.wsSharedMemory} onSendMessage={panels.sendWsMessage} onCreateThread={panels.createWsThread} onDeleteThread={panels.deleteWsThread} />,
    "canvas": () => { panels.initCanvas(); return <PI.CanvasPanelComponent nodes={panels.canvasNodes} connections={panels.canvasConnections} onNodesChange={panels.setCanvasNodes} onConnectionsChange={panels.setCanvasConnections} />; },
    "progress": () => {
      const status: "pass" | "warn" | "fail" | undefined = pipelineScore ? (pipelineScore >= 80 ? "pass" : pipelineScore >= 60 ? "warn" : "fail") : undefined;
      return <PI.ProgressDashboardComponent pipelineScore={pipelineScore ?? undefined} pipelineStatus={status} stressReport={stressReport} onRunStress={handleRunStressTest} isStressTesting={isStressTesting} verificationScore={verificationScore ?? undefined} onRunVerification={handleRunVerification} isVerifying={isVerifying} verificationResult={verificationResult} currentVerifyRound={currentVerifyRound} />;
    },
    "onboarding": () => <PI.OnboardingGuideComponent onComplete={() => onSetRightPanel(null)} onSkip={() => onSetRightPanel(null)} />,
    "merge-conflict": () => <PI.MergeConflictEditorComponent fileName={activeFile?.name ?? ""} conflicts={panels.mergeConflictsWithResolutions} onResolve={(conflictId: string, resolution: "ours" | "theirs" | "both" | "manual" | undefined, content?: string) => {
      panels.resolveConflict(conflictId, resolution, content);
      if (activeFileId && content) {
        fsUpdateContent(activeFileId, content);
        onSetOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content, isDirty: true } : f));
      }
      toast("Conflict resolved", "success");
    }} />,
    "project-switcher": () => <PI.ProjectSwitcherComponent onClose={() => onSetRightPanel(null)} />,
    "recent-files": () => <PI.RecentFilesComponent files={panels.recentFiles} onOpen={(fileId: string) => {
      const found = findFileNodeByName(files, fileId);
      if (found) onFileSelect(found);
    }} onClear={() => { panels.clearRecentFiles(); toast("Recent files cleared", "info"); }} />,
    "symbol-palette": () => <PI.SymbolPaletteComponent symbols={panels.symbols} onSelect={(symbol) => {
      if (symbol?.line) editorNavigateToLine(symbol.line);
    }} onClose={() => onSetRightPanel(null)} />,
    "keybindings": () => <PI.KeybindingsPanelComponent onClose={() => onSetRightPanel(null)} />,
    "api-config": () => <PI.APIKeyConfigComponent onClose={() => onSetRightPanel(null)} />,
    "network-inspector": () => <PI.PreviewNetworkTabComponent visible={rightPanel === "network-inspector"} onClose={() => onSetRightPanel(null)} />,
    "code-actions": () => <PI.QuickActionsComponent selectedText={panels.editorSelection.text} position={{ top: panels.editorSelection.top, left: panels.editorSelection.left }} language={activeFile?.language ?? "plaintext"} onAction={async (actionId: string, contextPrompt?: string) => {
      onSetRightPanel("chat" as RightPanel);
      toast(`Running: ${actionId}`, "info");
      if (activeFile && contextPrompt) {
        try {
          let result = '';
          if (actionId === 'explain') result = await explainCode(activeFile.content, activeFile.language);
          else if (actionId === 'bugs') {
            const lints = await lintCode(activeFile.content, activeFile.language);
            result = lints.map(l => `Line ${l.line}: ${l.message}`).join('\n');
          }
          else if (actionId === 'document') result = await generateDocstring(activeFile.content, activeFile.language);
          if (result) toast(result.slice(0, 100) + '...', 'info');
        } catch { /* AI call failed */ }
      }
    }} onClose={() => onSetRightPanel(null)} />,
    "model-switcher": () => <PI.ModelSwitcherComponent />,
    "audit": () => <PI.AuditPanelComponent
      files={files.flatMap(function flatFiles(n: typeof files[number]): { path: string; content: string; language: string }[] {
        if (n.type === 'file') return [{ path: n.name, content: n.content ?? '', language: n.language ?? 'plaintext' }];
        return (n.children ?? []).flatMap(flatFiles);
      })}
      onRunAudit={() => {
        import('@/lib/code-studio/audit/audit-engine').then(({ runProjectAudit }) => {
          const ctx = {
            files: files.flatMap(function flatFiles(n: typeof files[number]): { path: string; content: string; language: string }[] {
              if (n.type === 'file') return [{ path: n.name, content: n.content ?? '', language: n.language ?? 'plaintext' }];
              return (n.children ?? []).flatMap(flatFiles);
            }),
            language: 'ko',
          };
          const report = runProjectAudit(ctx);
          toast(`Audit: ${report.totalScore}/100 (${report.totalGrade}) — ${report.totalFindings} findings`, report.hardGateFail ? 'error' : 'success');
        });
      }}
    />,
  };

  const renderer = panelPropsMap[rightPanel];
  if (!renderer) return null;

  return (
    <div className="w-80 shrink-0 border-l border-white/8 bg-bg-secondary overflow-hidden cs-panel-enter">
      {renderer()}
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
  if (!showTerminal && !showProblems && !showPipelineBottom) return null;

  const problemFindings = bugReports.map((b) => ({
    severity: (b.severity === "critical" ? "critical" : b.severity === "high" ? "major" : b.severity === "medium" ? "minor" : "info") as "critical" | "major" | "minor" | "info",
    message: b.description,
    line: b.line,
    team: b.category,
  }));

  return (
    <div className="border-t border-white/8 max-h-[40vh] overflow-hidden flex flex-col">
      <div className="flex items-center gap-1 border-b border-white/8 px-2 py-0.5 bg-bg-primary shrink-0">
        <button onClick={onToggleTerminal} title={tcs.consoleTooltip} className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors duration-150 ${showTerminal ? "text-accent-green bg-accent-green/10" : "text-text-tertiary hover:text-text-secondary"}`}>{tcs.console}</button>
        <button onClick={onToggleProblems} className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors duration-150 ${showProblems ? "text-accent-red bg-accent-red/10" : "text-text-tertiary hover:text-text-secondary"}`}>Problems {bugReports.length > 0 ? `(${bugReports.length})` : ""}</button>
        <button onClick={onTogglePipelineBottom} className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors duration-150 ${showPipelineBottom ? "text-accent-blue bg-accent-blue/10" : "text-text-tertiary hover:text-text-secondary"}`}>Pipeline</button>
        <button onClick={onCloseAllBottom} aria-label="하단 패널 닫기" className="ml-auto rounded p-0.5 text-text-tertiary hover:text-text-primary transition-colors duration-150"><X className="h-3 w-3" /></button>
      </div>
      {showTerminal && (
        <div className="h-40 bg-bg-primary dark:bg-[#0d0d0d]">
          <div ref={termRef} className="h-full" />
        </div>
      )}
      {showProblems && (
        <div className="h-40 overflow-auto">
          <PI.ProblemsPanelComponent findings={problemFindings} />
        </div>
      )}
      {showPipelineBottom && pipelineStages.length > 0 && (
        <div className="h-40 overflow-auto p-2">
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
