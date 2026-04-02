import React, { createContext, useContext, useState, useMemo } from 'react';
import { ChapterEntry, HistoryEntry, StyleHeuristicAnalysis } from '@/types/translator';

export type WorkspaceTab = 'translate' | 'review' | 'publish' | string;

// ============================================================
// PART 1 — Type Definitions
// ============================================================
export interface TranslatorState {
  // Navigation & UI
  workspaceTab: WorkspaceTab;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  isZenMode: boolean;
  setIsZenMode: React.Dispatch<React.SetStateAction<boolean>>;
  backgroundMode: string;
  setBackgroundMode: React.Dispatch<React.SetStateAction<string>>;
  showMobileDrawer: boolean;
  setShowMobileDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  translationMode: 'novel' | 'general';
  setTranslationMode: React.Dispatch<React.SetStateAction<'novel' | 'general'>>;
  isCatMode: boolean;
  setIsCatMode: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Project & Document
  projectId: string;
  setProjectId: React.Dispatch<React.SetStateAction<string>>;
  projectName: string;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;
  chapters: ChapterEntry[];
  setChapters: React.Dispatch<React.SetStateAction<ChapterEntry[]>>;
  activeChapterIndex: number | null;
  setActiveChapterIndex: React.Dispatch<React.SetStateAction<number | null>>;
  
  // Translation Core
  source: string;
  setSource: React.Dispatch<React.SetStateAction<string>>;
  result: string;
  setResult: React.Dispatch<React.SetStateAction<string>>;
  from: string;
  setFrom: React.Dispatch<React.SetStateAction<string>>;
  to: string;
  setTo: React.Dispatch<React.SetStateAction<string>>;
  provider: string;
  setProvider: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  statusMsg: string;
  setStatusMsg: React.Dispatch<React.SetStateAction<string>>;
  history: HistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  
  // Contexts & Analysis
  worldContext: string;
  setWorldContext: React.Dispatch<React.SetStateAction<string>>;
  characterProfiles: string;
  setCharacterProfiles: React.Dispatch<React.SetStateAction<string>>;
  storySummary: string;
  setStorySummary: React.Dispatch<React.SetStateAction<string>>;
  styleAnalysis: StyleHeuristicAnalysis | null;
  setStyleAnalysis: React.Dispatch<React.SetStateAction<StyleHeuristicAnalysis | null>>;
  compareResultB: string;
  setCompareResultB: React.Dispatch<React.SetStateAction<string>>;
  
  // Extra Utils
  showCharacters: boolean;
  setShowCharacters: React.Dispatch<React.SetStateAction<boolean>>;
  showSummary: boolean;
  setShowSummary: React.Dispatch<React.SetStateAction<boolean>>;
  accentTextColor: string;
}

const TranslatorContext = createContext<TranslatorState | null>(null);

// ============================================================
// PART 2 — Context Provider & Hook
// ============================================================

export function useTranslator() {
  const context = useContext(TranslatorContext);
  if (!context) {
    throw new Error('useTranslator must be used within a TranslatorProvider');
  }
  return context;
}

export function TranslatorProvider({
  children,
  initialState
}: {
  children: React.ReactNode;
  initialState?: Partial<TranslatorState>;
}) {
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(initialState?.workspaceTab ?? 'translate');
  const [isZenMode, setIsZenMode] = useState(initialState?.isZenMode ?? false);
  const [backgroundMode, setBackgroundMode] = useState(initialState?.backgroundMode ?? 'glacial');
  const [showMobileDrawer, setShowMobileDrawer] = useState(initialState?.showMobileDrawer ?? false);
  const [translationMode, setTranslationMode] = useState<'novel' | 'general'>(initialState?.translationMode ?? 'novel');
  const [isCatMode, setIsCatMode] = useState(initialState?.isCatMode ?? false);
  
  const [projectId, setProjectId] = useState(() => initialState?.projectId ?? Date.now().toString());
  const [projectName, setProjectName] = useState(initialState?.projectName ?? '');
  const [chapters, setChapters] = useState<ChapterEntry[]>(initialState?.chapters ?? []);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(initialState?.activeChapterIndex ?? null);
  
  const [source, setSource] = useState(initialState?.source ?? '');
  const [result, setResult] = useState(initialState?.result ?? '');
  const [from, setFrom] = useState(initialState?.from ?? 'ja');
  const [to, setTo] = useState(initialState?.to ?? 'ko');
  const [provider, setProvider] = useState(initialState?.provider ?? 'openai');
  const [loading, setLoading] = useState(initialState?.loading ?? false);
  const [statusMsg, setStatusMsg] = useState(initialState?.statusMsg ?? '');
  const [history, setHistory] = useState<HistoryEntry[]>(initialState?.history ?? []);
  
  const [worldContext, setWorldContext] = useState(initialState?.worldContext ?? '');
  const [characterProfiles, setCharacterProfiles] = useState(initialState?.characterProfiles ?? '');
  const [storySummary, setStorySummary] = useState(initialState?.storySummary ?? '');
  const [styleAnalysis, setStyleAnalysis] = useState<StyleHeuristicAnalysis | null>(initialState?.styleAnalysis ?? null);
  const [compareResultB, setCompareResultB] = useState(initialState?.compareResultB ?? '');
  
  const [showCharacters, setShowCharacters] = useState(initialState?.showCharacters ?? false);
  const [showSummary, setShowSummary] = useState(initialState?.showSummary ?? false);
  
  const accentTextColor = useMemo(() => {
    switch (backgroundMode) {
      case 'glacial': return 'text-slate-800 dark:text-slate-200';
      case 'warm': return 'text-orange-800 dark:text-orange-200';
      case 'midnight': return 'text-indigo-300';
      case 'forest': return 'text-emerald-800 dark:text-emerald-200';
      case 'abyss': return 'text-zinc-300';
      default: return 'text-slate-800 dark:text-slate-200';
    }
  }, [backgroundMode]);

  const value: TranslatorState = {
    workspaceTab, setWorkspaceTab,
    isZenMode, setIsZenMode,
    backgroundMode, setBackgroundMode,
    showMobileDrawer, setShowMobileDrawer,
    translationMode, setTranslationMode,
    isCatMode, setIsCatMode,
    
    projectId, setProjectId,
    projectName, setProjectName,
    chapters, setChapters,
    activeChapterIndex, setActiveChapterIndex,
    
    source, setSource,
    result, setResult,
    from, setFrom,
    to, setTo,
    provider, setProvider,
    loading, setLoading,
    statusMsg, setStatusMsg,
    history, setHistory,
    
    worldContext, setWorldContext,
    characterProfiles, setCharacterProfiles,
    storySummary, setStorySummary,
    styleAnalysis, setStyleAnalysis,
    compareResultB, setCompareResultB,
    
    showCharacters, setShowCharacters,
    showSummary, setShowSummary,
    accentTextColor
  };

  return <TranslatorContext.Provider value={value}>{children}</TranslatorContext.Provider>;
}

// IDENTITY_SEAL: PART-2 | role=Context Provider for Translator | inputs=React Tree | outputs=TranslatorState
