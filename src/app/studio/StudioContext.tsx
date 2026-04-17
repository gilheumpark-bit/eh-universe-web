"use client";

// ============================================================
// PART 1 — Studio Context
// 109-props God Component 해체 — 단일 Context로 통합
// ============================================================

import { createContext, useContext, type ReactNode, type Dispatch, type SetStateAction, type RefObject } from 'react';
import type {
  ChatSession, StoryConfig, AppTab, AppLanguage, Message,
  Project, ProactiveSuggestion, PipelineStageResult, WritingMode,
} from '@/lib/studio-types';
import type { HFCPState as HFCPStateType } from '@/engine/hfcp';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import type { VersionedBackup } from '@/lib/indexeddb-backup';

// ============================================================
// PART 2 — Context Value Type
// ============================================================

export interface StudioContextValue {
  // Layout
  focusMode: boolean;
  setFocusMode: Dispatch<SetStateAction<boolean>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  // Theme
  themeLevel: number;
  toggleTheme: () => void;
  // Search
  showSearch: boolean;
  setShowSearch: Dispatch<SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  showShortcuts: boolean;
  setShowShortcuts: Dispatch<SetStateAction<boolean>>;
  // Global search
  showGlobalSearch: boolean;
  setShowGlobalSearch: Dispatch<SetStateAction<boolean>>;
  globalSearchQuery: string;
  setGlobalSearchQuery: Dispatch<SetStateAction<string>>;
  // Tab
  activeTab: AppTab;
  handleTabChange: (tab: AppTab) => void;
  setActiveTab: (tab: AppTab) => void;
  // Session/Project
  currentSession: ChatSession | null;
  currentSessionId: string | null;
  currentProjectId: string | null;
  currentProject: Project | null;
  sessions: ChatSession[];
  projects: Project[];
  setCurrentSessionId: (id: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  hydrated: boolean;
  // Config
  setConfig: (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
  updateCurrentSession: (patch: Partial<ChatSession>) => void;
  // Writing
  writingMode: WritingMode;
  setWritingMode: Dispatch<SetStateAction<WritingMode>>;
  editDraft: string;
  setEditDraft: Dispatch<SetStateAction<string>>;
  editDraftRef: RefObject<HTMLTextAreaElement | null>;
  canvasContent: string;
  setCanvasContent: Dispatch<SetStateAction<string>>;
  canvasPass: number;
  setCanvasPass: Dispatch<SetStateAction<number>>;
  promptDirective: string;
  setPromptDirective: Dispatch<SetStateAction<string>>;
  advancedSettings: AdvancedWritingSettings;
  setAdvancedSettings: Dispatch<SetStateAction<AdvancedWritingSettings>>;
  // AI
  isGenerating: boolean;
  lastReport: EngineReport | null;
  directorReport: DirectorReport | null;
  generationTime: number | null;
  tokenUsage: { used: number; budget: number } | null;
  handleSend: (customPrompt?: string) => void;
  doHandleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  handleCancel: () => void;
  handleRegenerate: (assistantMsgId: string) => Promise<void>;
  handleVersionSwitch: (messageId: string, versionIndex: number) => void;
  handleTypoFix: (messageId: string, index: number, original: string, suggestion: string) => void;
  hfcpState: HFCPStateType;
  // Input
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  // Display
  showDashboard: boolean;
  setShowDashboard: Dispatch<SetStateAction<boolean>>;
  rightPanelOpen: boolean;
  setRightPanelOpen: Dispatch<SetStateAction<boolean>>;
  showAiLock: boolean;
  hasAiAccess: boolean;
  aiCapabilitiesLoaded: boolean;
  bannerDismissed: boolean;
  setBannerDismissed: Dispatch<SetStateAction<boolean>>;
  showApiKeyModal: boolean;
  setShowApiKeyModal: Dispatch<SetStateAction<boolean>>;
  showQuickStartLock: boolean;
  hostedProviders: Record<string, boolean>;
  // Save
  saveFlash: boolean;
  lastSaveTime: number | null;
  triggerSave: () => void;
  // UX
  setUxError: (err: { error: unknown } | null) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  filteredMessages: Message[];
  searchMatchesEditDraft: string | boolean | null;
  writingColumnShell: string;
  writingInputDockOffset: string;
  apiBannerMessage: string;
  apiSetupLabel: string;
  // Language
  language: AppLanguage;
  isKO: boolean;
  // Immersion
  sessionStartChars?: number;
  editorFontSize?: number;
  // History
  archiveScope: 'project' | 'all';
  setArchiveScope: Dispatch<SetStateAction<'project' | 'all'>>;
  archiveFilter: string;
  setArchiveFilter: Dispatch<SetStateAction<string>>;
  charSubTab: 'characters' | 'items';
  setCharSubTab: Dispatch<SetStateAction<'characters' | 'items'>>;
  // Session management
  createNewSession: (tab?: AppTab) => void;
  createDemoSession: () => void;
  openQuickStart: () => void;
  startRename: (sessionId: string, currentTitle: string) => void;
  renamingSessionId: string | null;
  setRenamingSessionId: (id: string | null) => void;
  renameValue: string;
  setRenameValue: (val: string) => void;
  confirmRename: () => void;
  moveSessionToProject: (sessionId: string, targetProjectId: string) => void;
  deleteSession: (sessionId: string) => void;
  handleNextEpisode: () => void;
  handlePrint: () => void;
  // External
  suggestions: ProactiveSuggestion[];
  setSuggestions: Dispatch<SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
  versionedBackups?: VersionedBackup[];
  doRestoreVersionedBackup?: (timestamp: number) => Promise<boolean>;
  refreshBackupList?: () => void;
  clearAllSessions: () => void;
}

// ============================================================
// PART 3 — Provider & Hook
// ============================================================

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ value, children }: { value: StudioContextValue; children: ReactNode }) {
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within <StudioProvider>');
  return ctx;
}
