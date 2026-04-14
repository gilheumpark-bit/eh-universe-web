import React, { createContext, useContext, Dispatch, SetStateAction } from 'react';
import type { ProviderId } from '@/lib/ai-providers';
import { ChapterEntry, ProjectSnapshot, HistoryEntry, StyleHeuristicAnalysis, TranslationMode, DomainPreset } from '@/types/translator';
import { type TranslatorBackgroundMode, WorkspaceTab } from '@/lib/translator-constants';

// ============================================================
// PART 1 — Type Definitions & Context
// ============================================================

export interface TranslatorContextState {
  workspaceTab: WorkspaceTab;
  setWorkspaceTab: Dispatch<SetStateAction<WorkspaceTab>>;
  hostedGemini: boolean;
  /** `/api/ai-capabilities` — 소설 스튜디오와 동일 BYOK/호스팅 플래그 */
  hostedProviders: Partial<Record<ProviderId, boolean>>;
  aiCapabilitiesLoaded: boolean;
  openApiKeyModal: () => void;
  dismissApiBanner: () => void;
  projectId: string;
  setProjectId: Dispatch<SetStateAction<string>>;
  projectName: string;
  setProjectName: Dispatch<SetStateAction<string>>;
  projectList: ProjectSnapshot[];
  setProjectList: Dispatch<SetStateAction<ProjectSnapshot[]>>;
  chapters: ChapterEntry[];
  setChapters: Dispatch<SetStateAction<ChapterEntry[]>>;
  activeChapterIndex: number | null;
  setActiveChapterIndex: Dispatch<SetStateAction<number | null>>;
  referenceIds: string[];
  setReferenceIds: Dispatch<SetStateAction<string[]>>;
  source: string;
  setSource: Dispatch<SetStateAction<string>>;
  result: string;
  setResult: Dispatch<SetStateAction<string>>;
  from: string;
  setFrom: Dispatch<SetStateAction<string>>;
  to: string;
  setTo: Dispatch<SetStateAction<string>>;
  provider: string;
  setProvider: Dispatch<SetStateAction<string>>;
  apiKeys: Record<string, string>;
  setApiKeys: Dispatch<SetStateAction<Record<string, string>>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  statusMsg: string;
  setStatusMsg: Dispatch<SetStateAction<string>>;
  history: HistoryEntry[];
  setHistory: Dispatch<SetStateAction<HistoryEntry[]>>;
  lastSavedAt: number | null;
  setLastSavedAt: Dispatch<SetStateAction<number | null>>;
  isZenMode: boolean;
  setIsZenMode: Dispatch<SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: Dispatch<SetStateAction<boolean>>;
  backgroundMode: TranslatorBackgroundMode;
  setBackgroundMode: Dispatch<SetStateAction<TranslatorBackgroundMode>>;
  isCatMode: boolean;
  setIsCatMode: Dispatch<SetStateAction<boolean>>;
  showUrlImport: boolean;
  setShowUrlImport: Dispatch<SetStateAction<boolean>>;
  showCharacters: boolean;
  setShowCharacters: Dispatch<SetStateAction<boolean>>;
  showSummary: boolean;
  setShowSummary: Dispatch<SetStateAction<boolean>>;
  urlInput: string;
  setUrlInput: Dispatch<SetStateAction<string>>;
  translationMode: TranslationMode;
  setTranslationMode: Dispatch<SetStateAction<TranslationMode>>;
  glossaryText: string;
  setGlossaryText: Dispatch<SetStateAction<string>>;
  glossary: Record<string, string>;
  setGlossary: Dispatch<SetStateAction<Record<string, string>>>;
  domainPreset: DomainPreset;
  setDomainPreset: Dispatch<SetStateAction<DomainPreset>>;
  preserveDialogueLayout: boolean;
  setPreserveDialogueLayout: Dispatch<SetStateAction<boolean>>;
  cloudSyncStatus: 'idle' | 'saving' | 'ok' | 'error';
  setCloudSyncStatus: Dispatch<SetStateAction<'idle' | 'saving' | 'ok' | 'error'>>;
  cloudSyncDetail: string;
  setCloudSyncDetail: Dispatch<SetStateAction<string>>;
  lastApproxTokens: number | null;
  setLastApproxTokens: Dispatch<SetStateAction<number | null>>;
  compareResultB: string;
  setCompareResultB: Dispatch<SetStateAction<string>>;
  showMobileDrawer: boolean;
  setShowMobileDrawer: Dispatch<SetStateAction<boolean>>;
  mobileTab: 'chapters' | 'context';
  setMobileTab: Dispatch<SetStateAction<'chapters' | 'context'>>;
  showExportOptions: boolean;
  setShowExportOptions: Dispatch<SetStateAction<boolean>>;
  worldContext: string;
  setWorldContext: Dispatch<SetStateAction<string>>;
  characterProfiles: string;
  setCharacterProfiles: Dispatch<SetStateAction<string>>;
  storySummary: string;
  setStorySummary: Dispatch<SetStateAction<string>>;
  styleAnalysis: StyleHeuristicAnalysis | null;
  setStyleAnalysis: Dispatch<SetStateAction<StyleHeuristicAnalysis | null>>;
  backResult: string;
  setBackResult: Dispatch<SetStateAction<string>>;
  langKo: boolean;
  isAuthLoaded: boolean;
  userId: string | null;
  authUser: { uid: string; email?: string | null; displayName?: string | null } | null;
  hasTranslatorAiAccess: boolean;
  referenceBundle: Record<string, unknown> | null;
  activeChapter: ChapterEntry | null;
  completedChapters: number;
  completionRate: number;
  workspaceName: string;
  providerLabel: string;
  stripeCheckoutEnabled: boolean;
  autoSaveLabel: string;
  atmosphereLabel: string;
  pipelineLabel: string;
  cloudSyncEnabled: boolean;
  referenceStatusLabel: string;
  storyBibleStatusLabel: string;
  
  getEffectiveApiKeyForProvider: (providerId: string) => string;
  handleWorkspaceTabChange: (tab: WorkspaceTab) => void;
  patchChapterAtIndex: (index: number, patch: Record<string, unknown>) => void;
  patchActiveChapter: (patch: Record<string, unknown>) => void;
  openChapter: (index: number | null, overrideChapters?: ChapterEntry[]) => void;
  buildContinuityBundle: () => Record<string, unknown>;
  buildTranslationPayload: (opts: Record<string, unknown>) => Record<string, unknown>;
  updateStoryBibleAfterTranslation: (options: { translatedText: string; chapterName: string; chapterIndex?: number | null; storySummaryBase?: string; }) => Promise<string>;
  translate: () => Promise<void>;
  deepTranslate: () => Promise<void>;
  runChunkedTranslate: () => Promise<void>;
  runCompareB: () => Promise<void>;
  analyzeStyle: () => void;
  refineResult: () => Promise<void>;
  backTranslate: () => Promise<void>;
  batchTranslateAll: () => Promise<void>;
  importDocument: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportData: () => void;
  importData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importUrl: () => Promise<void>;
  downloadAllResults: (format?: 'txt' | 'md' | 'json' | 'html' | 'csv') => void;
  handleChapterRemove: (e: React.MouseEvent, idx: number) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

export const TranslatorContext = createContext<TranslatorContextState | null>(null);

export function useTranslator(): TranslatorContextState {
  const context = useContext(TranslatorContext);
  if (!context) {
    throw new Error('useTranslator must be used within a TranslatorProvider');
  }
  return context;
}
