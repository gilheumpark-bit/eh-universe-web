// ============================================================
// PART 1 — Panel Definition Interface & Registry
// ============================================================

/**
 * Metadata definition for a Code Studio panel.
 * Each entry maps to a unique panel that can be rendered in the right sidebar.
 */
export interface PanelDef {
  /** Unique key — matches RightPanel type */
  id: string;
  /** Display name shown in UI */
  label: string;
  /** lucide-react icon name */
  icon: string;
  /** Grouping category for command palette / menus */
  category: "View" | "Tools" | "File" | "Edit";
  /** Keyboard shortcut display string (optional) */
  shortcut?: string;
  /** Active-state color class */
  color: string;
}

// IDENTITY_SEAL: PART-1 | role=TypeDef | inputs=none | outputs=PanelDef

// ============================================================
// PART 2 — Panel Registry Array
// ============================================================

export const PANEL_REGISTRY = [
  // ── Existing 18 panels ──────────────────────────────────────
  { id: "chat",           label: "AI Chat",              icon: "MessageSquare",   category: "View",  color: "text-accent-purple" },
  { id: "pipeline",       label: "Pipeline",             icon: "Activity",        category: "View",  color: "text-accent-blue" },
  { id: "git",            label: "Git",                  icon: "GitBranch",       category: "View",  color: "text-accent-purple" },
  { id: "deploy",         label: "Deploy",               icon: "Upload",          category: "View",  color: "text-accent-green" },
  { id: "bugs",           label: "Bug Finder",           icon: "Bug",             category: "Tools", color: "text-accent-red" },
  { id: "search",         label: "Search in Files",      icon: "Search",          category: "Edit",  shortcut: "Ctrl+Shift+F", color: "text-accent-amber" },
  { id: "autopilot",      label: "Autopilot",            icon: "Play",            category: "Tools", color: "text-accent-amber" },
  { id: "agents",         label: "Agent Pipeline",       icon: "Shield",          category: "Tools", color: "text-accent-purple" },
  { id: "composer",       label: "Multi-file Composer",  icon: "Edit3",           category: "Tools", color: "text-accent-blue" },
  { id: "review",         label: "Review Center",        icon: "AlertTriangle",   category: "Tools", color: "text-accent-green" },
  { id: "preview",        label: "Live Preview",         icon: "Eye",             category: "View",  color: "text-accent-green" },
  { id: "outline",        label: "Code Outline",         icon: "List",            category: "View",  color: "text-accent-blue" },
  { id: "templates",      label: "Template Gallery",     icon: "Layout",          category: "File",  color: "text-accent-purple" },
  { id: "settings-panel", label: "Settings Panel",       icon: "Settings",        category: "View",  color: "text-accent-amber" },
  { id: "packages",       label: "Package Manager",      icon: "Package",         category: "Tools", color: "text-accent-green" },
  { id: "evaluation",     label: "Project Evaluation",   icon: "BarChart3",       category: "Tools", color: "text-accent-blue" },
  { id: "collab",         label: "Collaboration",        icon: "Users",           category: "Tools", color: "text-accent-purple" },
  { id: "creator",        label: "Code Creator",         icon: "Wand2",           category: "Tools", color: "text-accent-amber" },

  // ── New 19 panels ───────────────────────────────────────────
  { id: "terminal-panel",    label: "Terminal",           icon: "Terminal",        category: "View",  color: "text-accent-green" },
  { id: "multi-terminal",    label: "Multi Terminal",     icon: "Layers",          category: "View",  color: "text-accent-green" },
  { id: "database",          label: "Database",           icon: "Database",        category: "Tools", color: "text-accent-blue" },
  { id: "diff-editor",       label: "Diff Editor",        icon: "GitCompare",      category: "View",  color: "text-accent-amber" },
  { id: "git-graph",         label: "Git Graph",          icon: "GitFork",         category: "View",  color: "text-accent-purple" },
  { id: "ai-hub",            label: "AI Hub",             icon: "Brain",           category: "Tools", color: "text-accent-purple" },
  { id: "ai-workspace",      label: "AI Workspace",       icon: "BrainCircuit",    category: "Tools", color: "text-accent-blue" },
  { id: "canvas",            label: "Canvas",             icon: "PenTool",         category: "View",  color: "text-accent-amber" },
  { id: "progress",          label: "Progress Dashboard", icon: "TrendingUp",      category: "View",  color: "text-accent-green" },
  { id: "onboarding",        label: "Onboarding Guide",   icon: "GraduationCap",   category: "View",  color: "text-accent-blue" },
  { id: "merge-conflict",    label: "Merge Conflicts",    icon: "GitMerge",        category: "Tools", color: "text-accent-red" },
  { id: "project-switcher",  label: "Projects",           icon: "FolderKanban",    category: "File",  color: "text-accent-purple" },
  { id: "recent-files",      label: "Recent Files",       icon: "Clock",           category: "File",  color: "text-accent-amber" },
  { id: "symbol-palette",    label: "Symbol Palette",     icon: "Hash",            category: "View",  color: "text-accent-blue" },
  { id: "keybindings",       label: "Keybindings",        icon: "Keyboard",        category: "View",  color: "text-accent-amber" },
  { id: "api-config",        label: "API Configuration",  icon: "Key",             category: "View",  color: "text-accent-red" },
  { id: "network-inspector", label: "Network Inspector",  icon: "Network",         category: "Tools", color: "text-accent-amber" },
  { id: "code-actions",      label: "Code Actions",       icon: "Zap",             category: "Tools", color: "text-accent-green" },
  { id: "model-switcher",    label: "Model Switcher",     icon: "Cpu",             category: "Tools", color: "text-accent-purple" },
] as const;

// IDENTITY_SEAL: PART-2 | role=Registry | inputs=PanelDef | outputs=PANEL_REGISTRY

// ============================================================
// PART 3 — Derived Type & Helpers
// ============================================================

/** Union of all valid panel IDs (or null for "no panel open"). */
export type RightPanel = (typeof PANEL_REGISTRY)[number]["id"] | null;

/** Look up a panel definition by its id. Returns undefined if not found. */
export const getPanelDef = (id: string): PanelDef | undefined =>
  PANEL_REGISTRY.find((p) => p.id === id);

// IDENTITY_SEAL: PART-3 | role=Helpers | inputs=PANEL_REGISTRY | outputs=RightPanel,getPanelDef
