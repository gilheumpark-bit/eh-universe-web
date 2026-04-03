// ============================================================
// PART 1 — Dynamic Panel Imports (Existing 18 Panels)
// ============================================================
//
// Central barrel for lazy-loading every Code Studio panel.
// Named exports use .then(m => ({ default: m.X })) pattern;
// default exports are imported directly.
//

import dynamic from "next/dynamic";

// ── chat (named) ──────────────────────────────────────────────
export const ChatPanelComponent = dynamic(
  () => import("@/components/code-studio/ChatPanel").then((m) => ({ default: m.ChatPanel })),
  { ssr: false },
);

// ── pipeline (named) ──────────────────────────────────────────
export const PipelinePanelComponent = dynamic(
  () => import("@/components/code-studio/PipelinePanel").then((m) => ({ default: m.PipelinePanel })),
  { ssr: false },
);

// ── git (default) ─────────────────────────────────────────────
export const GitPanelComponent = dynamic(
  () => import("@/components/code-studio/GitPanel"),
  { ssr: false },
);

// ── deploy (default) ──────────────────────────────────────────
export const DeployPanelComponent = dynamic(
  () => import("@/components/code-studio/DeployPanel"),
  { ssr: false },
);

// ── search (named) ────────────────────────────────────────────
export const SearchPanelComponent = dynamic(
  () => import("@/components/code-studio/SearchPanel").then((m) => ({ default: m.SearchPanel })),
  { ssr: false },
);

// ── autopilot (named) ─────────────────────────────────────────
export const AutopilotPanelComponent = dynamic(
  () => import("@/components/code-studio/AutopilotPanel").then((m) => ({ default: m.AutopilotPanel })),
  { ssr: false },
);

// ── agents (named) ────────────────────────────────────────────
export const AgentPanelComponent = dynamic(
  () => import("@/components/code-studio/AgentPanel").then((m) => ({ default: m.AgentPanel })),
  { ssr: false },
);

// ── composer (default) ────────────────────────────────────────
export const ComposerPanelComponent = dynamic(
  () => import("@/components/code-studio/ComposerPanel"),
  { ssr: false },
);

// ── review (named) ────────────────────────────────────────────
export const ReviewCenterComponent = dynamic(
  () => import("@/components/code-studio/ReviewCenter").then((m) => ({ default: m.ReviewCenter })),
  { ssr: false },
);

// ── preview (default) ─────────────────────────────────────────
export const PreviewPanelComponent = dynamic(
  () => import("@/components/code-studio/PreviewPanel"),
  { ssr: false },
);

// ── outline (named) ───────────────────────────────────────────
export const OutlinePanelComponent = dynamic(
  () => import("@/components/code-studio/OutlinePanel").then((m) => ({ default: m.OutlinePanel })),
  { ssr: false },
);

// ── templates (named) ─────────────────────────────────────────
export const TemplateGalleryComponent = dynamic(
  () => import("@/components/code-studio/TemplateGallery").then((m) => ({ default: m.TemplateGallery })),
  { ssr: false },
);

// ── settings-panel (named) ────────────────────────────────────
export const SettingsPanelComponent = dynamic(
  () => import("@/components/code-studio/SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
  { ssr: false },
);

// ── packages (named) ──────────────────────────────────────────
export const PackagePanelComponent = dynamic(
  () => import("@/components/code-studio/PackagePanel").then((m) => ({ default: m.PackagePanel })),
  { ssr: false },
);

// ── evaluation (named) ────────────────────────────────────────
export const EvaluationPanelComponent = dynamic(
  () => import("@/components/code-studio/EvaluationPanel").then((m) => ({ default: m.EvaluationPanel })),
  { ssr: false },
);

// ── collab (default) ──────────────────────────────────────────
export const CollabPanelComponent = dynamic(
  () => import("@/components/code-studio/CollabPanel"),
  { ssr: false },
);

// ── creator (default) ─────────────────────────────────────────
export const CodeCreatorPanelComponent = dynamic(
  () => import("@/components/code-studio/CodeCreatorPanel"),
  { ssr: false },
);

// IDENTITY_SEAL: PART-1 | role=ExistingPanelImports | inputs=none | outputs=18-dynamic-components

// ============================================================
// PART 2 — Dynamic Panel Imports (New 19 Panels)
// ============================================================

// ── terminal-panel (named) ────────────────────────────────────
export const TerminalPanelComponent = dynamic(
  () => import("@/components/code-studio/TerminalPanel").then((m) => ({ default: m.TerminalPanel })),
  { ssr: false },
);

// ── multi-terminal (named) ────────────────────────────────────
export const MultiTerminalComponent = dynamic(
  () => import("@/components/code-studio/MultiTerminal").then((m) => ({ default: m.MultiTerminal })),
  { ssr: false },
);

// ── database (default) ────────────────────────────────────────
export const DatabasePanelComponent = dynamic(
  () => import("@/components/code-studio/DatabasePanel"),
  { ssr: false },
);

// ── diff-editor (named) ───────────────────────────────────────
export const DiffEditorPanelComponent = dynamic(
  () => import("@/components/code-studio/DiffEditorPanel").then((m) => ({ default: m.DiffEditorPanel })),
  { ssr: false },
);

// ── git-graph (default) ───────────────────────────────────────
export const GitGraphComponent = dynamic(
  () => import("@/components/code-studio/GitGraph"),
  { ssr: false },
);

// ── ai-hub (default) ──────────────────────────────────────────
export const AIHubComponent = dynamic(
  () => import("@/components/code-studio/AIHub"),
  { ssr: false },
);

// ── ai-workspace (default) ────────────────────────────────────
export const AIWorkspaceComponent = dynamic(
  () => import("@/components/code-studio/AIWorkspace"),
  { ssr: false },
);

// ── canvas (default) ──────────────────────────────────────────
export const CanvasPanelComponent = dynamic(
  () => import("@/components/code-studio/CanvasPanel"),
  { ssr: false },
);

// ── progress (named) ──────────────────────────────────────────
export const ProgressDashboardComponent = dynamic(
  () => import("@/components/code-studio/ProgressDashboard").then((m) => ({ default: m.ProgressDashboard })),
  { ssr: false },
);

// ── onboarding (named) ────────────────────────────────────────
export const OnboardingGuideComponent = dynamic(
  () => import("@/components/code-studio/OnboardingGuide").then((m) => ({ default: m.OnboardingGuide })),
  { ssr: false },
);

// ── merge-conflict (default) ──────────────────────────────────
export const MergeConflictEditorComponent = dynamic(
  () => import("@/components/code-studio/MergeConflictEditor"),
  { ssr: false },
);

// ── project-switcher (named) ──────────────────────────────────
export const ProjectSwitcherComponent = dynamic(
  () => import("@/components/code-studio/ProjectSwitcher").then((m) => ({ default: m.ProjectSwitcher })),
  { ssr: false },
);

// ── recent-files (default) ────────────────────────────────────
export const RecentFilesComponent = dynamic(
  () => import("@/components/code-studio/RecentFiles"),
  { ssr: false },
);

// ── symbol-palette (default) ──────────────────────────────────
export const SymbolPaletteComponent = dynamic(
  () => import("@/components/code-studio/SymbolPalette"),
  { ssr: false },
);

// ── keybindings (named) ───────────────────────────────────────
export const KeybindingsPanelComponent = dynamic(
  () => import("@/components/code-studio/KeybindingsPanel").then((m) => ({ default: m.KeybindingsPanel })),
  { ssr: false },
);

// ── api-config (unified) ──────────────────────────────────────
export const APIKeyConfigComponent = dynamic(
  () => import("@/components/home/APIKeySlotManager").then((m) => ({ default: m.APIKeySlotManager })),
  { ssr: false },
);

// ── network-inspector (default) ───────────────────────────────
export const PreviewNetworkTabComponent = dynamic(
  () => import("@/components/code-studio/PreviewNetworkTab"),
  { ssr: false },
);

// ── code-actions (named) ──────────────────────────────────────
export const QuickActionsComponent = dynamic(
  () => import("@/components/code-studio/QuickActions").then((m) => ({ default: m.QuickActions })),
  { ssr: false },
);

// ── model-switcher (named) ────────────────────────────────────
export const ModelSwitcherComponent = dynamic(
  () => import("@/components/code-studio/ModelSwitcher").then((m) => ({ default: m.ModelSwitcher })),
  { ssr: false },
);

// ── audit (named) ───────────────────────────────────────────
export const AuditPanelComponent = dynamic(
  () => import("@/components/code-studio/AuditPanel").then((m) => ({ default: m.AuditPanel })),
  { ssr: false },
);

// IDENTITY_SEAL: PART-2 | role=NewPanelImports | inputs=none | outputs=20-dynamic-components

// ============================================================
// PART 3 — Shared Utility Imports
// ============================================================

// Non-panel components frequently used alongside panels.
// These are also lazy-loaded to keep the main Shell bundle lean.

export const MonacoEditorComponent = dynamic(
  () => import("@monaco-editor/react"),
  { ssr: false },
);

export const CommandPaletteComponent = dynamic(
  () => import("@/components/code-studio/CommandPalette"),
  { ssr: false },
);

export const DiffViewerComponent = dynamic(
  () => import("@/components/code-studio/DiffViewer"),
  { ssr: false },
);

export const StatusBarComponent = dynamic(
  () => import("@/components/code-studio/StatusBar").then((m) => ({ default: m.StatusBar })),
  { ssr: false },
);

export const MobileLayoutComponent = dynamic(
  () => import("@/components/code-studio/MobileLayout"),
  { ssr: false },
);

export const TabletLayoutComponent = dynamic(
  () => import("@/components/code-studio/TabletLayout").then((m) => ({ default: m.TabletLayout })),
  { ssr: false },
);

export const EditorTabsComponent = dynamic(
  () => import("@/components/code-studio/EditorTabs").then((m) => ({ default: m.EditorTabs })),
  { ssr: false },
);

export const ProblemsPanelComponent = dynamic(
  () => import("@/components/code-studio/ProblemsPanel").then((m) => ({ default: m.ProblemsPanel })),
  { ssr: false },
);

export const QuickOpenComponent = dynamic(
  () => import("@/components/code-studio/QuickOpen").then((m) => ({ default: m.QuickOpen })),
  { ssr: false },
);

// IDENTITY_SEAL: PART-3 | role=SharedUtilImports | inputs=none | outputs=utility-dynamic-components

// ============================================================
// PART 4 — Internal Utility Components (18 components)
// ============================================================
//
// Components used internally by panels or available for future
// panel integration. Lazy-loaded to keep Shell bundle lean.
//

// ── file-explorer (named) ───────────────────────────────────
export const FileExplorerComponent = dynamic(
  () => import("@/components/code-studio/FileExplorer").then((m) => ({ default: m.FileExplorer })),
  { ssr: false },
);

// ── context-menu (named) ────────────────────────────────────
export const ContextMenuComponent = dynamic(
  () => import("@/components/code-studio/ContextMenu").then((m) => ({ default: m.ContextMenu })),
  { ssr: false },
);

// ── input-dialog (named) ────────────────────────────────────
export const InputDialogComponent = dynamic(
  () => import("@/components/code-studio/InputDialog").then((m) => ({ default: m.InputDialog })),
  { ssr: false },
);

// ── resize-handle (named) ───────────────────────────────────
export const ResizeHandleComponent = dynamic(
  () => import("@/components/code-studio/ResizeHandle").then((m) => ({ default: m.ResizeHandle })),
  { ssr: false },
);

// ── editor-group (named) ────────────────────────────────────
export const EditorGroupComponent = dynamic(
  () => import("@/components/code-studio/EditorGroup").then((m) => ({ default: m.EditorGroup })),
  { ssr: false },
);

// ── split-terminal (named) ──────────────────────────────────
export const SplitTerminalComponent = dynamic(
  () => import("@/components/code-studio/SplitTerminal").then((m) => ({ default: m.SplitTerminal })),
  { ssr: false },
);

// ── agent-diff-preview (default) ────────────────────────────
export const AgentDiffPreviewComponent = dynamic(
  () => import("@/components/code-studio/AgentDiffPreview"),
  { ssr: false },
);

// ── code-block-actions (default) ────────────────────────────
export const CodeBlockActionsComponent = dynamic(
  () => import("@/components/code-studio/CodeBlockActions"),
  { ssr: false },
);

// ── inline-edit-widget (named) ──────────────────────────────
export const InlineEditWidgetComponent = dynamic(
  () => import("@/components/code-studio/InlineEditWidget").then((m) => ({ default: m.InlineEditWidget })),
  { ssr: false },
);

// ── language-switch (named) ─────────────────────────────────
export const LanguageSwitchComponent = dynamic(
  () => import("@/components/code-studio/LanguageSwitch").then((m) => ({ default: m.LanguageSwitch })),
  { ssr: false },
);

// ── project-spec-form (named) ───────────────────────────────
export const ProjectSpecFormComponent = dynamic(
  () => import("@/components/code-studio/ProjectSpecForm").then((m) => ({ default: m.ProjectSpecForm })),
  { ssr: false },
);

// ── welcome-tab (default) ───────────────────────────────────
export const WelcomeTabComponent = dynamic(
  () => import("@/components/code-studio/WelcomeTab"),
  { ssr: false },
);

// ── activity-bar (named) ────────────────────────────────────
export const ActivityBarComponent = dynamic(
  () => import("@/components/code-studio/ActivityBar").then((m) => ({ default: m.ActivityBar })),
  { ssr: false },
);

// IDENTITY_SEAL: PART-4 | role=InternalUtilImports | inputs=none | outputs=13-utility-components
