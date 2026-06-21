'use client';

import { type Dispatch, type SetStateAction, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/LangContext';
// [G-13 mount — 2026-05-10] Translator 도 quota 자동 모니터 (StudioShell 와 별도 mount 필요).
import { useStorageQuota } from '@/hooks/useStorageQuota';
import { getApiKey, hasDgxService, type ProviderId } from '@/lib/ai-providers';
import {
  supabaseAnonKey,
  supabaseUrl,
} from '@/lib/supabase';
import { useAppDialog } from '@/hooks/useAppDialog';
import { TranslatorAppFrame } from './TranslatorAppFrame';
import {
  WORKSPACE_TAB_STORAGE_KEY,
  type WorkspaceTab,
  type TranslatorBackgroundMode,
} from '@/lib/translator-constants';
import {
  buildReferenceBundle,
} from '@/lib/project-normalize';
import { getGlossaryManager } from '@/lib/translation/glossary-manager';
import {
  AI_STORE_PROVIDER_IDS,
  TRANSLATOR_API_BANNER_DISMISSED_KEY,
} from './TranslatorStudioApp.helpers';
import { buildTranslatorDisplayModel } from './TranslatorStudioApp.derived';
import { useTranslatorRequestTranslation } from './useTranslatorRequestTranslation';
import { useTranslatorLocalPersistence } from './useTranslatorLocalPersistence';
import {
  loadLocalGlossary,
  type TranslationProjectContext,
} from '@/lib/translation/project-bridge';
import type {
  ChapterEntry,
  ProjectSnapshot,
  HistoryEntry,
  StyleHeuristicAnalysis,
  DomainPreset,
} from '@/types/translator';
import {
  type EpisodeMemoryGraph,
  type TermDriftWarning,
} from '@/lib/translation/episode-memory';
import { useTranslatorStudioSessionImport } from './useTranslatorStudioSessionImport';
import { useTranslatorWorkspaceFiles } from './useTranslatorWorkspaceFiles';
import { useTranslatorUrlImport } from './useTranslatorUrlImport';
import { useTranslatorBatchTranslate } from './useTranslatorBatchTranslate';
import { useTranslatorDualTranslate } from './useTranslatorDualTranslate';
import { useTranslatorChunkedTranslate } from './useTranslatorChunkedTranslate';
import { useTranslatorReviewActions } from './useTranslatorReviewActions';
import { useTranslatorPayloadPipeline } from './useTranslatorPayloadPipeline';
import { useTranslatorPrimaryTranslate } from './useTranslatorPrimaryTranslate';
import { useTranslatorGlossaryEffects } from './useTranslatorGlossaryEffects';
import { useTranslatorProjectSync } from './useTranslatorProjectSync';
import { useTranslatorCapabilities } from './useTranslatorCapabilities';

export default function TranslatorStudioApp() {
  const { dialog, alert, confirm, dismiss, confirmYes, alertOk } = useAppDialog();
  const { loading: authLoading, userId, user: authUser, signInWithGoogle, signOut, getIdToken } = useAuth();
  const { lang } = useLang();
  const langKo = lang === 'ko';
  // [G-13 — 2026-05-10] Translator 도 storage quota 자동 모니터 — critical 시 noa:alert.
  useStorageQuota();
  const isAuthLoaded = !authLoading;
  const isHydrated = useRef(false);
  const chapterAsideRef = useRef<HTMLElement>(null);
  const contextAsideRef = useRef<HTMLElement>(null);

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(() => {
    if (typeof window === 'undefined') return 'translate';
    try {
      const raw = sessionStorage.getItem(WORKSPACE_TAB_STORAGE_KEY);
      if (raw === 'translate' || raw === 'chapters' || raw === 'context') return raw;
    } catch {
      /* ignore */
    }
    return 'translate';
  });
  const [hostedNoa, setHostedNoa] = useState(false);
  const [hostedProviders, setHostedProviders] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [aiCapabilitiesLoaded, setAiCapabilitiesLoaded] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [_apiKeyRefresh, setApiKeyRefresh] = useState(0);
  const [apiBannerDismissed, setApiBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(TRANSLATOR_API_BANNER_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [projectId, setProjectId] = useState(() => Date.now().toString());
  const [projectName, setProjectName] = useState('');
  const [projectList, setProjectList] = useState<ProjectSnapshot[]>([]);
  const [chapters, setChapters] = useState<ChapterEntry[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null);
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  
  const [source, setSource] = useState('');
  const [result, setResult] = useState('');
  const [from, setFrom] = useState('ja');
  const [to, setTo] = useState('ko');
  const [provider, setProvider] = useState('openai');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  
  // UI States
  const [isZenMode, setIsZenMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState<TranslatorBackgroundMode>('default');
  const [isCatMode, setIsCatMode] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [translationMode, setTranslationMode] = useState<'novel' | 'general'>('novel');
  const [glossaryText, setGlossaryText] = useState('');
  const [glossary, setGlossary] = useState<Record<string, string>>({});
  const [domainPreset, setDomainPreset] = useState<DomainPreset>('general');
  const [preserveDialogueLayout, setPreserveDialogueLayout] = useState(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [cloudSyncDetail, setCloudSyncDetail] = useState('');
  const [lastApproxTokens, setLastApproxTokens] = useState<number | null>(null);
  const requestTranslation = useTranslatorRequestTranslation({ getIdToken, setLastApproxTokens });
  const [compareResultB, setCompareResultB] = useState('');
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chapters' | 'context'>('chapters');
  const [showExportOptions, setShowExportOptions] = useState(false);
  // [Track-D Phase 1 D wiring — 2026-05-07] Auto-regen opt-in.
  // 점수 < 0.70 시 temperature 상승 + 자동 재시도 (최대 2회).
  // 비용 가드: 기본 OFF. chunk 당 추가 LLM 호출 발생.
  const [autoRegenEnabled, setAutoRegenEnabled] = useState(false);
  const [autoRegenAttempts, setAutoRegenAttempts] = useState<number | null>(null);
  // [2026-05-08 — 시장 분석 4차 반영] 2개 출력 모델 — Source-faithful / Market-ready.
  // 'faithful': 원문 보존 (작가 의도·고유명사·복선·문체) — 작가/번역가 검토용 기준 번역본.
  // 'market':   현지화 (대사 리듬·호칭·장르 문법·시장 감각) — 출판 시장에 맞춘 독자 친화 번역본.
  // 'default':  legacy 단일 chain (점진적으로 두 모드로 수렴 권장).
  // localStorage 'noa_translator_outputMode' 로 사용자 마지막 선택 보존.
  const [outputMode, setOutputModeState] = useState<'faithful' | 'market' | 'dual' | 'default'>(() => {
    if (typeof window === 'undefined') return 'default';
    try {
      const saved = localStorage.getItem('noa_translator_outputMode');
      if (saved === 'faithful' || saved === 'market' || saved === 'dual' || saved === 'default') return saved;
    } catch { /* private mode */ }
    return 'default';
  });
  const setOutputMode = useCallback<Dispatch<SetStateAction<'faithful' | 'market' | 'dual' | 'default'>>>(
    (value) => {
      setOutputModeState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        try { localStorage.setItem('noa_translator_outputMode', next); } catch { /* quota */ }
        return next;
      });
    },
    [],
  );
  // [Glossary Dialog] open/close + entry count badge (updated on close)
  const [glossaryDialogOpen, setGlossaryDialogOpen] = useState(false);
  const [glossaryEntryCount, setGlossaryEntryCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try { return loadLocalGlossary().length; } catch { return 0; }
  });

  // Specialized Contexts
  const [worldContext, setWorldContext] = useState('');
  const [characterProfiles, setCharacterProfiles] = useState('');
  const [storySummary, setStorySummary] = useState('');
  const [styleAnalysis, setStyleAnalysis] = useState<StyleHeuristicAnalysis | null>(null);
  const [backResult, setBackResult] = useState('');
  const prevActiveChapterIndex = useRef<number | null>(activeChapterIndex);
  const storyBibleRequestCounter = useRef(0);
  const lastPrimaryTranslateAt = useRef(0);

  // ── GlossaryManager: real-time glossary injection ──
  const glossaryManagerRef = useRef(getGlossaryManager());
  const [_glossaryVersion, setGlossaryVersion] = useState(() => getGlossaryManager().version);

  // ── Phase 1-7 Pipeline: project context for RAG / Voice / Episode Memory ──
  // [C] null-safe — 단독 실행에서도 동작 (?from 없으면 null 유지)
  // 이 컨텍스트가 있으면 fetch 페이로드에 RAG block + memory hint 자동 주입
  const [projectContext, setProjectContext] = useState<TranslationProjectContext | null>(null);
  const [driftWarnings, setDriftWarnings] = useState<TermDriftWarning[]>([]);
  const projectContextRef = useRef<TranslationProjectContext | null>(null);
  const memoryGraphRef = useRef<EpisodeMemoryGraph | null>(null);

  useEffect(() => {
    projectContextRef.current = projectContext;
  }, [projectContext]);

  useTranslatorLocalPersistence({
    isHydrated,
    projectId,
    setProjectId,
    projectName,
    setProjectName,
    projectList,
    setProjectList,
    chapters,
    setChapters,
    activeChapterIndex,
    setActiveChapterIndex,
    source,
    setSource,
    result,
    setResult,
    from,
    setFrom,
    to,
    setTo,
    provider,
    setProvider,
    history,
    setHistory,
    isZenMode,
    setIsZenMode,
    backgroundMode,
    setBackgroundMode,
    isCatMode,
    setIsCatMode,
    translationMode,
    setTranslationMode,
    worldContext,
    setWorldContext,
    characterProfiles,
    setCharacterProfiles,
    storySummary,
    setStorySummary,
    referenceIds,
    setReferenceIds,
    glossaryText,
    setGlossaryText,
    glossary,
    setGlossary,
    domainPreset,
    setDomainPreset,
    preserveDialogueLayout,
    setPreserveDialogueLayout,
    apiKeys,
    setApiKeys,
    setLastSavedAt,
  });

  useTranslatorGlossaryEffects({
    driftWarnings,
    glossary,
    glossaryManagerRef,
    lang,
    projectContext,
    setGlossary,
    setGlossaryText,
    setGlossaryVersion,
    setStatusMsg,
  });

  const patchChapterAtIndex = useCallback((index: number, patch: Record<string, unknown>) => {
    setChapters((previous) => {
      if (!previous[index]) return previous;

      const currentChapter = previous[index];
      const currentChapterRecord = currentChapter as Record<string, unknown>;
      const resultInPatch = typeof patch.result === 'string';
      const normalizedPatch = resultInPatch
        ? {
            ...patch,
            isDone: (patch.result as string).trim().length > 0,
            stageProgress: (patch.result as string).trim().length > 0 ? 5 : 0,
          }
        : patch;
      const shouldUpdate = Object.entries(normalizedPatch).some(([key, value]) => currentChapterRecord[key] !== value);
      if (!shouldUpdate) return previous;

      const next = [...previous];
      next[index] = { ...currentChapter, ...normalizedPatch };
      return next;
    });
  }, []);

  const patchActiveChapter = useCallback((patch: Record<string, unknown>) => {
    if (activeChapterIndex === null) return;
    patchChapterAtIndex(activeChapterIndex, patch);
  }, [activeChapterIndex, patchChapterAtIndex]);

  const getEffectiveApiKeyForProvider = useCallback(
    (providerId: string) => {
      const fromState = (apiKeys[providerId] || '').trim();
      if (fromState) return fromState;
      if (AI_STORE_PROVIDER_IDS.has(providerId as ProviderId)) {
        return getApiKey(providerId as ProviderId).trim();
      }
      return '';
    },
    [apiKeys],
  );

  const hasTranslatorAiAccess = useMemo(() => {
    const key = getEffectiveApiKeyForProvider(provider);
    if (key) return true;
    if (hostedNoa) return true;
    if (hasDgxService()) return true;
    return false;
  }, [hostedNoa, getEffectiveApiKeyForProvider, provider]);

  const openApiKeyModal = useCallback(() => {
    setShowApiKeyModal(true);
    window.dispatchEvent(new CustomEvent('noa:toast', {
      detail: {
        message: langKo ? '연결 키 관리를 열었습니다' : 'Connection key manager opened',
        variant: 'info',
        duration: 1600,
      },
    }));
  }, [langKo]);

  const dismissApiBanner = useCallback(() => {
    try {
      localStorage.setItem(TRANSLATOR_API_BANNER_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
    setApiBannerDismissed(true);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(WORKSPACE_TAB_STORAGE_KEY, workspaceTab);
    } catch {
      /* ignore */
    }
  }, [workspaceTab]);

  useTranslatorCapabilities({
    setAiCapabilitiesLoaded,
    setHostedNoa,
    setHostedProviders,
  });

  const handleWorkspaceTabChange = useCallback(
    (tab: WorkspaceTab) => {
      setWorkspaceTab(tab);
      if (isZenMode) setIsZenMode(false);
      if (tab === 'chapters') {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setShowMobileDrawer(true);
          setMobileTab('chapters');
        } else {
          chapterAsideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      if (tab === 'context') {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setShowMobileDrawer(true);
          setMobileTab('context');
        } else {
          contextAsideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    },
    [isZenMode],
  );

  useTranslatorStudioSessionImport({
    setSource,
    setProjectContext,
    memoryGraphRef,
    setWorldContext,
    setCharacterProfiles,
    setGlossary,
    setProjectName,
  });

  useTranslatorProjectSync({
    activeChapterIndex,
    apiReady: Boolean(supabaseUrl && supabaseAnonKey),
    chapters,
    characterProfiles,
    domainPreset,
    from,
    glossary,
    glossaryText,
    isAuthLoaded,
    isHydrated,
    patchActiveChapter,
    preserveDialogueLayout,
    prevActiveChapterIndexRef: prevActiveChapterIndex,
    projectId,
    projectList,
    projectName,
    referenceIds,
    result,
    setCloudSyncDetail,
    setCloudSyncStatus,
    setProjectList,
    setReferenceIds,
    source,
    storySummary,
    to,
    translationMode,
    userId,
    worldContext,
  });

  const openChapter = (index: number | null, chapterList = chapters) => {
    if (index === null) {
      startTransition(() => {
        setActiveChapterIndex(null);
        setSource('');
        setResult('');
      });
      return;
    }

    const chapter = chapterList[index];
    if (!chapter) return;

    startTransition(() => {
      setActiveChapterIndex(index);
      setSource(chapter.content || '');
      setResult(chapter.result || '');
    });
  };

  const referenceBundle = buildReferenceBundle(referenceIds, projectList, projectId);
  const {
    buildContinuityBundle,
    buildTranslationPayload,
    enrichPayloadWithPipeline,
    recordEpisodeMemory,
  } = useTranslatorPayloadPipeline({
    activeChapterIndex,
    chapters,
    characterProfiles,
    domainPreset,
    glossary,
    glossaryManagerRef,
    glossaryText,
    memoryGraphRef,
    preserveDialogueLayout,
    projectContextRef,
    referenceBundle,
    referenceIds,
    setDriftWarnings,
    storySummary,
    to,
    translationMode,
    worldContext,
  });

  const activeChapter = activeChapterIndex !== null ? chapters[activeChapterIndex] : null;
  const { updateStoryBibleAfterTranslation, translate, deepTranslate } = useTranslatorPrimaryTranslate({
    activeChapter,
    activeChapterIndex,
    alert,
    buildTranslationPayload,
    enrichPayloadWithPipeline,
    from,
    getEffectiveApiKeyForProvider,
    lang,
    lastPrimaryTranslateAt,
    patchActiveChapter,
    patchChapterAtIndex,
    provider,
    recordEpisodeMemory,
    requestTranslation,
    setHistory,
    setLoading,
    setResult,
    setStatusMsg,
    setStorySummary,
    source,
    storyBibleRequestCounter,
    storySummary,
    to,
    translationMode,
  });

  const importUrl = useTranslatorUrlImport({
    alert,
    lang,
    urlInput,
    getIdToken,
    chapters,
    activeChapterIndex,
    patchActiveChapter,
    setChapters,
    setSource,
    setResult,
    setShowUrlImport,
    setUrlInput,
    setLoading,
    setStatusMsg,
    openChapter,
  });

  const analyzeStyle = () => {
    if (!source.trim()) return;

    const quoteCount = (source.match(/[“"'「『]/g) || []).length;
    const longSentenceCount = source
      .split(/[.!?。！？]/)
      .filter((line) => line.trim().length > 90).length;

    setStyleAnalysis({
      genre: /마법|검|왕국|황제|용/i.test(source) ? '판타지' : /보고서|가이드|정책/i.test(source) ? '정보형' : '서사형',
      tone: quoteCount >= 6 ? '대사 중심' : longSentenceCount >= 3 ? '문장 밀도 높음' : '균형형',
      metric: {
        fluency: `${Math.min(96, 72 + longSentenceCount * 4)}%`,
        immersion: `${Math.min(95, 68 + quoteCount * 3)}%`,
      },
    });
  };

  const { exportData, importData, importDocument, downloadAllResults } = useTranslatorWorkspaceFiles({
    alert,
    confirm,
    lang,
    langKo,
    projectName,
    setProjectName,
    projectList,
    setProjectList,
    chapters,
    setChapters,
    activeChapterIndex,
    setActiveChapterIndex,
    referenceIds,
    setReferenceIds,
    source,
    setSource,
    result,
    setResult,
    from,
    setFrom,
    to,
    setTo,
    provider,
    setProvider,
    history,
    setHistory,
    worldContext,
    setWorldContext,
    characterProfiles,
    setCharacterProfiles,
    storySummary,
    setStorySummary,
    backgroundMode,
    setBackgroundMode,
    isZenMode,
    setIsZenMode,
    isCatMode,
    setIsCatMode,
    translationMode,
    setTranslationMode,
    glossaryText,
    setGlossaryText,
    glossary,
    setGlossary,
    domainPreset,
    setDomainPreset,
    preserveDialogueLayout,
    setPreserveDialogueLayout,
    setLoading,
    setStatusMsg,
    setLastSavedAt,
    setShowExportOptions,
  });

  const batchTranslateAll = useTranslatorBatchTranslate({
    alert,
    confirm,
    lang,
    chapters,
    from,
    to,
    provider,
    translationMode,
    storySummary,
    glossaryManagerRef,
    setLoading,
    setStatusMsg,
    setResult,
    openChapter,
    patchChapterAtIndex,
    getEffectiveApiKeyForProvider,
    buildTranslationPayload,
    enrichPayloadWithPipeline,
    requestTranslation,
    recordEpisodeMemory,
    updateStoryBibleAfterTranslation,
  });

  const { refineResult, backTranslate, runCompareB } = useTranslatorReviewActions({
    alert,
    lang,
    langKo,
    source,
    result,
    from,
    to,
    provider,
    translationMode,
    activeChapterIndex,
    setLoading,
    setStatusMsg,
    setResult,
    setBackResult,
    setCompareResultB,
    getEffectiveApiKeyForProvider,
    buildTranslationPayload,
    enrichPayloadWithPipeline,
    requestTranslation,
    patchActiveChapter,
  });

  const runChunkedTranslate = useTranslatorChunkedTranslate({
    alert,
    confirm,
    lang,
    source,
    from,
    to,
    provider,
    translationMode,
    activeChapterIndex,
    autoRegenEnabled,
    setAutoRegenAttempts,
    setLoading,
    setStatusMsg,
    setResult,
    getEffectiveApiKeyForProvider,
    buildTranslationPayload,
    enrichPayloadWithPipeline,
    requestTranslation,
    recordEpisodeMemory,
    patchActiveChapter,
  });

  const runDualTranslate = useTranslatorDualTranslate({
    alert,
    confirm,
    lang,
    source,
    from,
    to,
    provider,
    translationMode,
    glossaryText,
    characterProfiles,
    storySummary,
    worldContext,
    activeChapter,
    activeChapterIndex,
    setLoading,
    setStatusMsg,
    setResult,
    getEffectiveApiKeyForProvider,
    buildTranslationPayload,
    requestTranslation,
    patchActiveChapter,
    recordEpisodeMemory,
  });

  const {
    completedChapters,
    completionRate,
    workspaceName,
    providerLabel,
    stripeCheckoutEnabled,
    autoSaveLabel,
    atmosphereLabel,
    pipelineLabel,
    cloudSyncEnabled,
    referenceStatusLabel,
    storyBibleStatusLabel,
  } = buildTranslatorDisplayModel({
    chapters,
    projectName,
    langKo,
    provider,
    backgroundMode,
    translationMode,
    isAuthLoaded,
    userId,
    supabaseUrl,
    supabaseAnonKey,
    referenceBundle,
    storySummary,
    lastSavedAt,
  });

  const handleChapterRemove = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const nextChapters = chapters.filter((_, chapterIndex) => chapterIndex !== idx);
    setChapters(nextChapters);

    if (activeChapterIndex === idx) {
      const fallbackIndex = nextChapters.length ? Math.min(idx, nextChapters.length - 1) : null;
      openChapter(fallbackIndex, nextChapters);
      return;
    }

    if (activeChapterIndex !== null && activeChapterIndex > idx) {
      setActiveChapterIndex(activeChapterIndex - 1);
    }
  };

  const contextValue = {
    workspaceTab, setWorkspaceTab,
    hostedNoa,
    hostedProviders,
    aiCapabilitiesLoaded,
    openApiKeyModal,
    dismissApiBanner,
    projectId, setProjectId,
    projectName, setProjectName,
    projectList, setProjectList,
    chapters, setChapters,
    activeChapterIndex, setActiveChapterIndex,
    referenceIds, setReferenceIds,
    source, setSource, result, setResult,
    from, setFrom, to, setTo,
    provider, setProvider, apiKeys, setApiKeys,
    loading, setLoading, statusMsg, setStatusMsg,
    history, setHistory, lastSavedAt, setLastSavedAt,
    isZenMode, setIsZenMode,
    showSettings, setShowSettings,
    backgroundMode, setBackgroundMode,
    isCatMode, setIsCatMode,
    showUrlImport, setShowUrlImport,
    showCharacters, setShowCharacters,
    showSummary, setShowSummary,
    urlInput, setUrlInput,
    translationMode, setTranslationMode,
    glossaryText, setGlossaryText,
    glossary, setGlossary,
    domainPreset, setDomainPreset,
    preserveDialogueLayout, setPreserveDialogueLayout,
    cloudSyncStatus, setCloudSyncStatus,
    cloudSyncDetail, setCloudSyncDetail,
    lastApproxTokens, setLastApproxTokens,
    compareResultB, setCompareResultB,
    showMobileDrawer, setShowMobileDrawer,
    mobileTab, setMobileTab,
    showExportOptions, setShowExportOptions,
    // [Track-D Phase 1 P0-3] D wiring autoRegen 토글 + attempts 표시 노출
    autoRegenEnabled, setAutoRegenEnabled,
    autoRegenAttempts,
    // [2026-05-08 — 시장 분석 4차] 2개 출력 모델 (Source-faithful / Market-ready)
    outputMode, setOutputMode,
    worldContext, setWorldContext,
    characterProfiles, setCharacterProfiles,
    storySummary, setStorySummary,
    styleAnalysis, setStyleAnalysis,
    backResult, setBackResult,
    langKo, isAuthLoaded, userId, authUser, hasTranslatorAiAccess,
    referenceBundle, activeChapter, completedChapters, completionRate,
    workspaceName, providerLabel, stripeCheckoutEnabled, autoSaveLabel,
    atmosphereLabel, pipelineLabel, cloudSyncEnabled, referenceStatusLabel,
    storyBibleStatusLabel,
    getEffectiveApiKeyForProvider,
    handleWorkspaceTabChange,
    patchChapterAtIndex, patchActiveChapter, openChapter,
    buildContinuityBundle, buildTranslationPayload, updateStoryBibleAfterTranslation,
    translate, deepTranslate, runChunkedTranslate, runDualTranslate, runCompareB, analyzeStyle,
    refineResult, backTranslate, batchTranslateAll, importDocument,
    exportData, importData, importUrl, downloadAllResults, handleChapterRemove,
    signInWithGoogle, signOut, getIdToken
  };

  return (
    <TranslatorAppFrame
      contextValue={contextValue}
      backgroundMode={backgroundMode}
      showConnectionBanner={aiCapabilitiesLoaded && !hasTranslatorAiAccess && !apiBannerDismissed}
      lang={lang}
      langKo={langKo}
      glossaryEntryCount={glossaryEntryCount}
      glossaryDialogOpen={glossaryDialogOpen}
      onOpenConnectionKeys={openApiKeyModal}
      onDismissConnectionBanner={dismissApiBanner}
      onOpenGlossaryDialog={() => setGlossaryDialogOpen(true)}
      onCloseGlossaryDialog={() => setGlossaryDialogOpen(false)}
      onRefreshGlossaryCount={setGlossaryEntryCount}
      modalProps={{
        showApiKeyModal,
        onCloseApiKeyModal: () => { setShowApiKeyModal(false); setApiKeyRefresh((n) => n + 1); },
        dialog,
        onDismiss: dismiss,
        onConfirmYes: confirmYes,
        onAlertOk: alertOk,
      }}
    />
  );
}
