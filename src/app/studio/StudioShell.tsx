"use client";

// ============================================================
// PART 1 — Imports
// ============================================================
import { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AppLanguage, AppTab, Project, WritingMode } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { useAuth } from '@/lib/AuthContext';
import { createHFCPState, type HFCPState as HFCPStateType } from '@/engine/hfcp';
import { StudioProvider, type StudioContextValue } from './StudioContext';
import { logger } from '@/lib/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MobileTabBar from '@/components/studio/MobileTabBar';
import MobileDrawer from '@/components/studio/MobileDrawer';
import MobileSketchImportBanner from '@/components/studio/MobileSketchImportBanner';
import FirstVisitOnboarding from '@/components/studio/FirstVisitOnboarding';
import { useProjectManager } from '@/hooks/useProjectManager';
import { useStudioUX } from '@/hooks/useStudioUX';
import { useStudioSync } from '@/hooks/useStudioSync';
import { useStudioWritingMode } from '@/hooks/useStudioWritingMode';
import { useUnifiedSettings } from '@/lib/UnifiedSettingsContext';
import { useStudioSession } from '@/hooks/useStudioSession';
import { useStudioImport } from '@/hooks/useStudioImport';
import { useStudioQuickStart } from '@/hooks/useStudioQuickStart';
import { useStudioSessionActions } from '@/hooks/useStudioSessionActions';
import { StudioConfigProvider, StudioUIProvider } from '@/contexts/StudioContext';
import { useStudioKeyboard } from '@/hooks/useStudioKeyboard';
import { useStudioAI } from '@/hooks/useStudioAI';
import { useStudioExport } from '@/hooks/useStudioExport';
import { setDriveEncryptionKey } from '@/services/driveService';
import { generateEpisodeSummary } from '@/engine/episode-summarizer';
import { showAlert } from '@/lib/show-alert';
import { useUnsavedWarning } from '@/components/studio/UXHelpers';
import { getApiKey, getActiveProvider, hasStoredApiKey, hasDgxService as hasDgxServiceFn, setServerDgxCache, type ProviderId } from '@/lib/ai-providers';
import dynamic from 'next/dynamic';
// StudioSaveSlotPanel removed
import { useStudioShellController } from './useStudioShellController';
const OSDesktop = dynamic(() => import('@/components/studio/OSDesktop'), { ssr: false });
const StudioMainContent = dynamic(() => import('./StudioMainContent'), { ssr: false });
const StudioOverlayManager = dynamic(() => import('@/components/studio/StudioOverlayManager'), { ssr: false });
const MobileStudioView = dynamic(() => import('@/components/studio/MobileStudioView'), { ssr: false });
import { useIsMobile } from '@/hooks/useIsMobile';

type HostedAiAvailability = Partial<Record<ProviderId, boolean>>;
const PROVIDER_IDS: ProviderId[] = ['gemini', 'openai', 'claude', 'groq', 'mistral'];

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+hooks+components

// ============================================================
// PART 2 — State Management & Hooks
// ============================================================
export default function StudioShell() {
  const { lang } = useLang();
  const studioRouter = useRouter();
  const pathname = usePathname();
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const map: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', ja: 'JP', zh: 'CN' };
    return map[lang] || 'KO';
  });

  useEffect(() => {
    const map: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', ja: 'JP', zh: 'CN' };
    setLanguage(map[lang] || 'KO');
  }, [lang]);

  // 모바일 감지 — 전체 PC UX 대신 경량 스케치 뷰로 교체
  // 사용자가 명시적으로 PC 뷰 강제 모드(?force=desktop)를 선택하면 우회 가능
  const isMobile = useIsMobile();
  const [forceDesktop, setForceDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    setForceDesktop(p.get('force') === 'desktop' || localStorage.getItem('noa_force_desktop') === '1');
  }, []);

  const pm = useProjectManager(language);
  const {
    projects, setProjects,
    currentProjectId, setCurrentProjectId,
    currentSessionId, setCurrentSessionId,
    hydrated,
    currentProject, sessions, currentSession,
    setSessions,
    createNewProject, deleteProject: doDeleteProject, renameProject, moveSessionToProject,
    createNewSession: doCreateNewSession, deleteSession: doDeleteSession, clearAllSessions: doClearAllSessions,
    updateCurrentSession, setConfig,
    versionedBackups, doRestoreVersionedBackup, refreshBackupList,
  } = pm;

  const VALID_TABS: AppTab[] = ['world', 'writing', 'history', 'settings', 'characters', 'rulebook', 'style', 'manuscript', 'docs', 'visual'];
  const [activeTab, setActiveTabRaw] = useState<AppTab>(() => {
    if (typeof window === 'undefined') return 'world';
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab && VALID_TABS.includes(urlTab as AppTab)) return urlTab as AppTab;
    return 'world';
  });
  const setActiveTab = useCallback((tab: AppTab) => {
    setActiveTabRaw(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    params.delete('worldImport');
    params.delete('postImport');
    params.delete('setup');
    studioRouter.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [studioRouter, pathname]);

  const [charSubTab, setCharSubTab] = useState<'characters' | 'items'>('characters');
  // Use fixed initial value to prevent hydration mismatch, then sync from localStorage
  const [studioMode, setStudioMode] = useState<'guided' | 'free'>('guided');
  const [, setStudioModeHydrated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Hydrate studioMode from localStorage after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('noa_studio_mode');
      if (raw === 'guided' || raw === 'free') {
        setStudioMode(raw);
      }
    } catch { /* private browsing */ }
    setStudioModeHydrated(true);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);
  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyVersion, setApiKeyVersion] = useState(0);
  // Listen for key changes dispatched by setApiKey() in ai-providers.ts
  useEffect(() => {
    const bump = () => setApiKeyVersion(v => v + 1);
    window.addEventListener('noa-keys-changed', bump);
    // 초기 로드 시 슬롯 동기화 후 키 상태 반영 (타이밍 이슈 방지)
    const initialCheck = setTimeout(bump, 500);
    return () => { window.removeEventListener('noa-keys-changed', bump); clearTimeout(initialCheck); };
  }, []);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [hostedProviders, setHostedProviders] = useState<HostedAiAvailability>({});
  const [aiCapabilitiesLoaded, setAiCapabilitiesLoaded] = useState(false);
  const [dgxReady, setDgxReady] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = createT(language);
  const isKO = language === 'KO';
  const { user, signInWithGoogle, signOut, isConfigured: authConfigured, accessToken, refreshAccessToken } = useAuth();

  const activeProviderId = getActiveProvider();
  const hasLocalApiKey = hydrated && (apiKeyVersion >= 0) && (!!getApiKey(activeProviderId) || hasStoredApiKey('lmstudio') || hasStoredApiKey('ollama'));
  const hasHostedAiAccess = hydrated && Boolean(user) && Boolean(hostedProviders[activeProviderId]);
  const hasHostedQuickStartAccess = hydrated && Boolean(user) && Boolean(hostedProviders.gemini);
  const dgxAvailable = dgxReady || hasDgxServiceFn();
  const hasAiAccess = hydrated && (hasLocalApiKey || hasHostedAiAccess || dgxAvailable);
  const hasQuickStartAccess = hydrated && (!!getApiKey('gemini') || hasHostedQuickStartAccess || dgxAvailable);
  const showAiLock = aiCapabilitiesLoaded && !hasAiAccess;
  const showQuickStartLock = aiCapabilitiesLoaded && !hasQuickStartAccess;
  const apiBannerMessage = hasHostedAiAccess
    ? (isKO
      ? 'NOA가 준비되어 있어요. 바로 써보고, 원하면 개인 키를 추가하세요.'
      : 'NOA is ready. Start now, and add your own key anytime.')
    : t('ui.apiKeyBanner');
  const apiSetupLabel = hasHostedAiAccess
    ? (isKO ? '\uAC1C\uC778 \uD0A4 \uCD94\uAC00' : 'Add Key')
    : t('ui.apiKeySetUp');

  const { theme, toggleTheme } = useUnifiedSettings();
  const themeLevel = theme === 'dark' ? 0 : 1;

  const [focusMode, setFocusMode] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(16);
  const sessionStartCharsRef = useRef<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Combined UI State ──
  type UiState = {
    archiveFilter: string;
    archiveScope: 'project' | 'all';
    moveModal: { sessionId: string; others: Project[] } | null;
    rightPanelOpen: boolean;
    mobileDrawerOpen: boolean;
    saveSlotModalOpen: boolean;
    saveSlotName: string;
    showGlobalSearch: boolean;
    globalSearchQuery: string;
  };
  type UiAction = Partial<UiState> | ((prev: UiState) => Partial<UiState>);
  const [uiState, dispatchUi] = useReducer((state: UiState, action: UiAction) => {
    const next = typeof action === 'function' ? action(state) : action;
    return { ...state, ...next };
  }, {
    archiveFilter: 'ALL',
    archiveScope: 'project',
    moveModal: null,
    rightPanelOpen: false,
    mobileDrawerOpen: false,
    saveSlotModalOpen: false,
    saveSlotName: '',
    showGlobalSearch: false,
    globalSearchQuery: '',
  });
  const { archiveFilter, archiveScope, moveModal, rightPanelOpen, mobileDrawerOpen, saveSlotModalOpen, showGlobalSearch, globalSearchQuery } = uiState;

  const setArchiveFilter = useCallback((v: string | ((prev: string) => string)) => dispatchUi((s: UiState) => ({ archiveFilter: typeof v === 'function' ? v(s.archiveFilter) : v })), []);
  const setArchiveScope = useCallback((v: 'project' | 'all' | ((prev: 'project' | 'all') => 'project' | 'all')) => dispatchUi((s: UiState) => ({ archiveScope: typeof v === 'function' ? v(s.archiveScope) : v })), []);
  const setMoveModal = useCallback((v: { sessionId: string; others: Project[] } | null | ((prev: { sessionId: string; others: Project[] } | null) => { sessionId: string; others: Project[] } | null)) => dispatchUi((s: UiState) => ({ moveModal: typeof v === 'function' ? v(s.moveModal) : v })), []);
  const setRightPanelOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchUi((s: UiState) => ({ rightPanelOpen: typeof v === 'function' ? v(s.rightPanelOpen) : v })), []);
  const setMobileDrawerOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchUi((s: UiState) => ({ mobileDrawerOpen: typeof v === 'function' ? v(s.mobileDrawerOpen) : v })), []);
  const setSaveSlotModalOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchUi((s: UiState) => ({ saveSlotModalOpen: typeof v === 'function' ? v(s.saveSlotModalOpen) : v })), []);
  const _setSaveSlotName = useCallback((v: string | ((prev: string) => string)) => dispatchUi((s: UiState) => ({ saveSlotName: typeof v === 'function' ? v(s.saveSlotName) : v })), []);
  const setShowGlobalSearch = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchUi((s: UiState) => ({ showGlobalSearch: typeof v === 'function' ? v(s.showGlobalSearch) : v })), []);
  const setGlobalSearchQuery = useCallback((v: string | ((prev: string) => string)) => dispatchUi((s: UiState) => ({ globalSearchQuery: typeof v === 'function' ? v(s.globalSearchQuery) : v })), []);

  useEffect(() => {
    if (user?.uid) setDriveEncryptionKey(user.uid);
  }, [user?.uid]);

  const {
    uxError, setUxError,
    storageFull, setStorageFull,
    exportDoneFormat, setExportDoneFormat,
    lastSaveTime, saveFlash, triggerSave,
    fallbackNotice, setFallbackNotice,
    confirmState, showConfirm, closeConfirm,
  } = useStudioUX();

  const [alertToast, setAlertToast] = useState<{ message: string; variant: string } | null>(null);
  const { suggestions, setSuggestions } = useStudioShellController(currentSession || null, language);
  const [pipelineResult, setPipelineResult] = useState<{ stages: import('@/lib/studio-types').PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, variant } = (e as CustomEvent).detail;
      setAlertToast({ message, variant });
      setTimeout(() => setAlertToast(null), 4000);
    };
    window.addEventListener('noa:alert', handler);
    return () => window.removeEventListener('noa:alert', handler);
  }, []);

  useEffect(() => {
    const handleBatchDelete = (e: Event) => {
      const { ids } = (e as CustomEvent).detail as { ids: string[] };
      setSessions(prev => prev.filter(s => !ids.includes(s.id)));
      if (currentSessionId && ids.includes(currentSessionId)) {
        setCurrentSessionId(null);
      }
    };
    const handleBatchExport = (e: Event) => {
      const { ids } = (e as CustomEvent).detail as { ids: string[] };
      const selected = sessions.filter(s => ids.includes(s.id));
      if (selected.length === 0) return;
      const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-export-${selected.length}-episodes.json`;
      a.click();
      URL.revokeObjectURL(url);
    };
    window.addEventListener('noa:batch-delete', handleBatchDelete);
    window.addEventListener('noa:batch-export', handleBatchExport);
    return () => {
      window.removeEventListener('noa:batch-delete', handleBatchDelete);
      window.removeEventListener('noa:batch-export', handleBatchExport);
    };
  }, [sessions, currentSessionId, setSessions, setCurrentSessionId]);

  useEffect(() => {
    if (!hydrated) return;
    setIsSidebarOpen(window.innerWidth >= 768);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const loadCapabilities = async () => {
      try {
        const response = await fetch('/api/ai-capabilities', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Capability check failed: ${response.status}`);
        const data = await response.json() as { hosted?: Record<string, unknown>; hasDgx?: boolean };
        if (cancelled) return;
        const nextHosted: HostedAiAvailability = {};
        for (const providerId of PROVIDER_IDS) {
          nextHosted[providerId] = Boolean(data.hosted?.[providerId]);
        }
        setHostedProviders(nextHosted);
        // DGX 가용 → ai-providers 캐시 + 로컬 상태 모두 갱신
        if (data.hasDgx) {
          setDgxReady(true);
          setServerDgxCache(true);
        }
      } catch (error) {
        logger.warn('AI', 'Capability check failed', error);
        if (!cancelled) setHostedProviders({});
      } finally {
        if (!cancelled) setAiCapabilitiesLoaded(true);
      }
    };
    void loadCapabilities();
    return () => { cancelled = true; };
  }, [hydrated]);

  // IDENTITY_SEAL: PART-2 | role=state-management | inputs=hooks | outputs=state-variables

  // ============================================================
  // PART 3 — Import Effects & Quick Start
  // ============================================================
  const { worldImportBanner, setWorldImportBanner } = useStudioImport({
    hydrated,
    language,
    activeTab,
    setActiveTab,
    doCreateNewSession,
    setProjects,
    setAlertToast,
    setShowApiKeyModal,
  });



  // IDENTITY_SEAL: PART-3 | role=import-effects | inputs=hydrated | outputs=side-effects

  // ============================================================
  // PART 4 — Callbacks & Derived State
  // ============================================================
  const {
    syncStatus, lastSyncTime,
    showSyncReminder, setShowSyncReminder,
    handleSync,
    crossTabNotification, dismissCrossTabNotification, reloadFromStorage,
  } = useStudioSync({ user, accessToken, refreshAccessToken, projects, setProjects, setUxError });

  const deleteProject = useCallback((projectId: string) => {
    const projName = projects.find(p => p.id === projectId)?.name || '';
    showConfirm({
      title: t('confirm.deleteProject'),
      message: `'${projName}'${t('confirm.deleteProjectMsg')}`,
      confirmLabel: t('confirm.delete'),
      cancelLabel: t('confirm.cancel'),
      variant: 'danger',
      onConfirm: () => { closeConfirm(); doDeleteProject(projectId); },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, language, showConfirm, closeConfirm, doDeleteProject]);

  const [hfcpState] = useState<HFCPStateType>(() => createHFCPState());
  const {
    writingMode, setWritingMode,
    editDraft, setEditDraft,
    editDraftRef,
    advancedSettings, setAdvancedSettings,
    canvasContent, setCanvasContent,
    canvasPass, setCanvasPass,
    promptDirective, setPromptDirective,
  } = useStudioWritingMode(currentSessionId, hydrated);

  // Session word counter — capture initial char count once
  if (sessionStartCharsRef.current === null && editDraft) {
    sessionStartCharsRef.current = editDraft.replace(/\s/g, '').length;
  }

  useEffect(() => {
    if (!aiCapabilitiesLoaded) return;
    // AI 접근 상태만 기록. 모드 강제 전환은 하지 않음 — 입력 UI에서 잠금 안내 표시.
    try { localStorage.setItem('noa_writing_access', hasAiAccess ? 'api' : 'manual'); } catch { /* quota/private */ }
  }, [hasAiAccess, aiCapabilitiesLoaded]);

  // [창작→번역 파이프라인] 원고 완성 감지 → 번역 CTA 토스트
  // 에피소드 3개 + 3000자 이상 완성되면 1회성 제안
  useEffect(() => {
    if (!hydrated || !currentSession) return;
    const manuscripts = currentSession.config.manuscripts ?? [];
    const completedCount = manuscripts.filter(m => (m.content?.length ?? 0) >= 3000).length;
    if (completedCount < 3) return;
    const key = `noa_translate_cta_${currentSessionId}`;
    try {
      if (localStorage.getItem(key) === '1') return;
      localStorage.setItem(key, '1');
    } catch { /* quota */ }
    // 번역 CTA 이벤트 발행 — StudioToasts에서 수신
    window.dispatchEvent(new CustomEvent('noa:translate-cta', {
      detail: {
        sessionId: currentSessionId,
        episodeCount: completedCount,
      },
    }));

  }, [currentSession, currentSessionId, hydrated]);

  // editDraft → manuscripts 자동 전이 (수동 편집 내용이 EPUB/DOCX/JSON 내보내기에 반영되도록)
  // 2초 debounce로 config.manuscripts[episode].content 업데이트
  useEffect(() => {
    if (!hydrated || !currentSessionId || !editDraft) return;
    if (writingMode !== 'edit') return;
    if (!currentSession) return;
    const episode = currentSession.config?.episode ?? 1;
    const timer = setTimeout(() => {
      const prevArr = currentSession.config.manuscripts ?? [];
      const idx = prevArr.findIndex(m => m.episode === episode);
      const title = currentSession.config.title || `Episode ${episode}`;
      const now = Date.now();
      const nextEntry = idx >= 0
        ? { ...prevArr[idx], content: editDraft, charCount: editDraft.length, lastUpdate: now }
        : { episode, title, content: editDraft, charCount: editDraft.length, lastUpdate: now };
      const nextArr = idx >= 0
        ? prevArr.map((m, i) => i === idx ? nextEntry : m)
        : [...prevArr, nextEntry];
      updateCurrentSession({
        config: {
          ...currentSession.config,
          manuscripts: nextArr,
        },
      });
    }, 2000);
    return () => clearTimeout(timer);

  }, [editDraft, writingMode, currentSessionId, hydrated]);




  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const messageCount = currentSession?.messages?.length ?? 0;

  const {
    createNewSession,
    createDemoSession,
    renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue,
  } = useStudioSession({
    language, currentSession, editDraft,
    doCreateNewSession, updateCurrentSession,
    setActiveTab, setIsSidebarOpen, setWritingMode,
    showConfirm, closeConfirm,
  });

  const { isGenerating, lastReport, directorReport, generationTime, tokenUsage, handleCancel, handleSend: doHandleSend, handleRegenerate } = useStudioAI({
    currentSession, currentSessionId, setSessions, updateCurrentSession,
    hfcpState, promptDirective, language, canvasPass,
    setCanvasContent, setWritingMode, setShowApiKeyModal, setUxError,
    advancedOutputMode: advancedSettings.outputMode,
    advancedSettings,
    onSuggestionsUpdate: (newSugs) => setSuggestions(prev => [...newSugs, ...prev.filter(s => s.dismissed)]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPipelineUpdate: setPipelineResult as any,
  });

  const { showQuickStartModal, setShowQuickStartModal, isQuickGenerating, handleQuickStart, openQuickStart } = useStudioQuickStart({
    language, showQuickStartLock, setShowApiKeyModal, currentProjectId, createNewProject, setProjects, setCurrentSessionId, setActiveTab, setPipelineResult, setUxError, doHandleSend, currentSessionId, currentSession
  });

  // [First-visit 온보딩] FirstVisitOnboarding → QuickStart 모달 연결
  useEffect(() => {
    const handler = () => openQuickStart();
    window.addEventListener('noa:open-quickstart', handler);
    return () => window.removeEventListener('noa:open-quickstart', handler);
  }, [openQuickStart]);

  const prevFocusRef = useRef<Element | null>(null);
  const anyModalOpen = showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen || !!moveModal || showQuickStartModal;
  useEffect(() => {
    if (anyModalOpen) {
      prevFocusRef.current = document.activeElement;
    } else if (prevFocusRef.current && prevFocusRef.current instanceof HTMLElement) {
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [anyModalOpen, showApiKeyModal, showShortcuts, confirmState.open, saveSlotModalOpen, moveModal, showQuickStartModal]);

  const handleTabChange = useCallback((tab: AppTab) => {
    // 탭 전환 시 콘텐츠 스크롤을 상단으로 리셋
    const scrollReset = () => {
      // 렌더 완료 후 스크롤 리셋 — setTimeout으로 React 렌더 이후 보장
      setTimeout(() => {
        const scrollContainer = document.querySelector('[data-testid="studio-content"] .overflow-y-auto');
        if (scrollContainer) scrollContainer.scrollTop = 0;
      }, 50);
    };
    // Auto-save draft before tab switch so work is never lost
    if (editDraft && editDraft.trim() && currentSessionId) {
      try { localStorage.setItem(`noa_editdraft_${currentSessionId}`, editDraft); } catch { /* quota/private */ }
    }
    if (tab !== activeTab && activeTab === 'writing' && writingMode === 'edit' && editDraft.trim()) {
      showConfirm({
        title: t('confirm.unsavedEdits'),
        message: t('confirm.unsavedEditsMsg'),
        variant: 'warning',
        confirmLabel: t('confirm.switch'),
        cancelLabel: t('confirm.keepEditing'),
        onConfirm: () => {
          closeConfirm();
          setEditDraft('');
          setActiveTab(tab);
          scrollReset();
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
      });
      return;
    }
    setActiveTab(tab);
    scrollReset();
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, writingMode, editDraft, language, showConfirm, closeConfirm, currentSessionId]);

  const {
    deleteSession, clearAllSessions, startRename, confirmRename,
    handleReorderSessions, handleVersionSwitch, handleTypoFix
  } = useStudioSessionActions({
    language, sessions, currentSessionId, setSessions, doDeleteSession, doClearAllSessions,
    showConfirm, closeConfirm, setActiveTab, setRenamingSessionId, setRenameValue,
    renamingSessionId, renameValue,
  });

  const {
    exportTXT, exportJSON, exportAllJSON, handleImportJSON,
    handleImportTextFiles,
    handlePrint, handleExportEPUB, handleExportDOCX,
    exportProjectJSON, exportProjectManuscripts,
  } = useStudioExport({
    currentSession, sessions, currentSessionId,
    currentProjectId, projects, setProjects, setCurrentProjectId,
    setSessions, setCurrentSessionId, setActiveTab,
    isKO, language, writingMode, editDraft,
  });

  const filteredMessages = currentSession?.messages.filter(m =>
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  const searchMatchesEditDraft = searchQuery && editDraft && editDraft.toLowerCase().includes(searchQuery.toLowerCase());



  useStudioKeyboard({
    onTabChange: handleTabChange,
    onToggleSearch: () => setShowSearch(prev => !prev),
    onExportTXT: exportTXT,
    onPrint: handlePrint,
    onNewSession: createNewSession,
    onToggleFocus: () => setFocusMode(prev => !prev),
    onToggleShortcuts: () => setShowShortcuts(prev => !prev),
    onSave: () => { triggerSave(); setAlertToast({ message: language === 'KO' ? '저장 완료' : 'Saved', variant: 'info' }); setTimeout(() => setAlertToast(null), 2000); },
    onNewEpisode: () => {
      if (!currentSession) return;
      const nextEp = Math.min(currentSession.config.episode + 1, currentSession.config.totalEpisodes);
      setConfig({ ...currentSession.config, episode: nextEp });
    },
    onToggleAssistant: () => setRightPanelOpen(prev => !prev),
    onEscape: () => {
      if (showShortcuts) { setShowShortcuts(false); return; }
      if (showApiKeyModal) { setShowApiKeyModal(false); return; }
      if (confirmState.open) { closeConfirm(); return; }
      if (saveSlotModalOpen) { dispatchUi({ saveSlotModalOpen: false }); return; }
      if (moveModal) { dispatchUi({ moveModal: null }); return; }
      if (showQuickStartModal) { setShowQuickStartModal(false); return; }
      if (showGlobalSearch) { dispatchUi({ showGlobalSearch: false, globalSearchQuery: '' }); return; }
    },
    onGlobalSearch: () => dispatchUi((s: UiState) => ({ showGlobalSearch: !s.showGlobalSearch })),
    onFontSizeUp: () => setEditorFontSize(s => { const n = Math.min(s + 2, 28); document.documentElement.style.setProperty('--editor-font-size', `${n}px`); return n; }),
    onFontSizeDown: () => setEditorFontSize(s => { const n = Math.max(s - 2, 12); document.documentElement.style.setProperty('--editor-font-size', `${n}px`); return n; }),
    disabled: showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen,
  });



  useUnsavedWarning(isGenerating || (writingMode === 'edit' && editDraft.trim().length > 0));

  useEffect(() => {
    if (activeTab === 'writing') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount, isGenerating, activeTab]);

  const handleSend = useCallback((customPrompt?: string) => {
    doHandleSend(customPrompt, input, () => setInput(''));
  }, [doHandleSend, input]);

  const handleNextEpisode = () => {
    if (!currentSession) return;
    const nextEp = Math.min(currentSession.config.episode + 1, currentSession.config.totalEpisodes);
    // 현재 에피소드 원고를 manuscripts에 자동 저장 (유실 방지)
    const currentEp = currentSession.config.episode ?? 1;
    const draftContent = editDraft || '';
    if (draftContent.trim()) {
      const manuscript = {
        episode: currentEp,
        title: currentSession.config.title || `EP.${currentEp}`,
        content: draftContent,
        charCount: draftContent.replace(/\s/g, '').length,
        lastUpdate: Date.now(),
      };
      setConfig(prev => {
        const msList = [...(prev.manuscripts || [])];
        const idx = msList.findIndex(m => m.episode === currentEp);
        if (idx >= 0) msList[idx] = { ...msList[idx], ...manuscript };
        else msList.push(manuscript);
        return { ...prev, manuscripts: msList, episode: nextEp };
      });
      // 백그라운드 요약 생성 (비동기, 실패해도 무시)
      if (draftContent.length >= 100) {
        const lang = language;
        const ep = currentEp;
        setTimeout(async () => {
          try {
            const summary = await generateEpisodeSummary(draftContent, lang);
            if (summary) {
              setConfig(prev => {
                const ms2 = [...(prev.manuscripts || [])];
                const target = ms2.find(m => m.episode === ep);
                if (target) target.summary = summary;
                return { ...prev, manuscripts: ms2 };
              });
              // Toast: notify user that episode summary was auto-generated
              showAlert(
                lang === 'KO'
                  ? `에피소드 요약이 자동 생성되었습니다`
                  : `Episode summary auto-generated`,
                'info',
              );
            }
          } catch { /* background — non-critical */ }
        }, 0);
      }
    } else {
      setConfig({ ...currentSession.config, episode: nextEp });
    }
  };

  const writingColumnShell = writingMode === 'edit'
    ? 'w-full px-4 md:px-6 lg:px-8'
    : 'w-full px-4 md:px-8 lg:px-10';
  const writingInputDockOffset = activeTab === 'writing' && !showDashboard
    ? (writingMode === 'ai'
        ? ''
        : '')
    : '';

  const studioConfigValue = {
    language, setLanguage, isKO,
    currentSession, currentSessionId, currentProjectId,
    config: currentSession?.config ?? null,
    setConfig, projects, hasAiAccess,
    studioMode, setStudioMode,
  };
  const studioUIValue = {
    activeTab, handleTabChange,
    showConfirm, closeConfirm,
    setUxError, triggerSave, saveFlash,
  };

  // ── StudioContext value (replaces 109-prop waterfall) ──
  const studioContextValue: StudioContextValue = {
    // Layout
    focusMode, setFocusMode,
    isSidebarOpen, setIsSidebarOpen,
    // Theme
    themeLevel, toggleTheme,
    // Search
    showSearch, setShowSearch,
    searchQuery, setSearchQuery,
    showShortcuts, setShowShortcuts,
    // Global search
    showGlobalSearch, setShowGlobalSearch,
    globalSearchQuery, setGlobalSearchQuery,
    // Tab
    activeTab, handleTabChange, setActiveTab,
    // Session/Project
    currentSession, currentSessionId,
    currentProjectId, currentProject,
    sessions, projects,
    setCurrentSessionId, setCurrentProjectId,
    hydrated,
    // Config
    setConfig, updateCurrentSession,
    // Writing
    writingMode, setWritingMode: setWritingMode as React.Dispatch<React.SetStateAction<WritingMode>>,
    editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent,
    canvasPass, setCanvasPass,
    promptDirective, setPromptDirective,
    advancedSettings, setAdvancedSettings,
    // AI
    isGenerating, lastReport, directorReport,
    generationTime, tokenUsage,
    handleSend, doHandleSend,
    handleCancel, handleRegenerate,
    handleVersionSwitch, handleTypoFix,
    hfcpState,
    // Input
    input, setInput,
    // Display state
    showDashboard, setShowDashboard,
    rightPanelOpen, setRightPanelOpen,
    showAiLock, hasAiAccess, aiCapabilitiesLoaded,
    bannerDismissed, setBannerDismissed,
    showApiKeyModal, setShowApiKeyModal,
    showQuickStartLock,
    hostedProviders: hostedProviders as Record<string, boolean>,
    // Save
    saveFlash, lastSaveTime, triggerSave,
    // UX
    setUxError, messagesEndRef,
    filteredMessages, searchMatchesEditDraft,
    writingColumnShell, writingInputDockOffset,
    apiBannerMessage, apiSetupLabel,
    // Language
    language, isKO,
    // Immersion
    sessionStartChars: sessionStartCharsRef.current ?? 0,
    editorFontSize,
    // History tab
    archiveScope, setArchiveScope,
    archiveFilter, setArchiveFilter,
    charSubTab, setCharSubTab,
    // Session management
    createNewSession, createDemoSession, openQuickStart,
    startRename,
    renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue,
    confirmRename,
    moveSessionToProject,
    deleteSession, handleNextEpisode, handlePrint,
    // External
    suggestions, setSuggestions,
    pipelineResult,
    // Versioned backups
    versionedBackups, doRestoreVersionedBackup, refreshBackupList,
    // Modals/actions
    clearAllSessions,
  };

  // IDENTITY_SEAL: PART-4 | role=callbacks-derived | inputs=state | outputs=handlers+derived-values

  // ============================================================
  // PART 5 — Render
  // ============================================================

  // 모바일 전용 스케치 뷰 — PC급 스튜디오 대체
  // 데스크톱 강제 모드(?force=desktop 또는 localStorage noa_force_desktop)면 우회
  if (isMobile && !forceDesktop && hydrated) {
    return (
      <ErrorBoundary variant="section" language={isKO ? 'KO' : 'EN'}>
        <MobileStudioView
          language={language}
          onDesktopCTA={() => {
            if (typeof navigator !== 'undefined' && navigator.share) {
              navigator.share({
                title: '로어가드 집필 스튜디오',
                text: '로어가드 (Loreguard) 소설 스튜디오 (데스크톱에서 열기)',
                url: typeof window !== 'undefined' ? `${window.location.origin}/studio` : '',
              }).catch(() => {/* user cancelled */});
            } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}/studio` : '')
                .then(() => showAlert(isKO ? '데스크톱 링크가 클립보드에 복사되었습니다' : 'Desktop link copied to clipboard'))
                .catch(() => {/* clipboard denied */});
            }
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary variant="section" language={isKO ? 'KO' : 'EN'}>
    <StudioConfigProvider value={studioConfigValue}>
    <StudioUIProvider value={studioUIValue}>
    <div
      className="flex h-dvh overflow-hidden bg-bg-primary text-text-primary"
      data-testid="studio-content"
    >
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      {/* Cross-tab sync notification toast */}
      {crossTabNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-tooltip)] flex items-center gap-3 px-4 py-3 bg-accent-amber/15 border border-accent-amber/30 rounded-xl shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top duration-300" role="alert">
          <span className="text-xs font-serif text-text-primary">{isKO ? '다른 탭에서 변경됨' : 'Modified in another tab'}</span>
          <button onClick={() => { reloadFromStorage(); dismissCrossTabNotification(); }} className="px-3 py-1 text-[10px] font-bold bg-accent-amber/20 text-accent-amber rounded-lg hover:bg-accent-amber/30 transition-colors">{isKO ? '새로고침' : 'Refresh'}</button>
          <button onClick={dismissCrossTabNotification} className="text-text-tertiary hover:text-text-primary transition-colors text-xs" aria-label="Dismiss">&times;</button>
        </div>
      )}

      <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} language={language} mode={studioMode} />

      <MobileSketchImportBanner />

      <FirstVisitOnboarding />

      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title={language === 'KO' ? '\uCC38\uACE0 \uD328\uB110' : 'Reference Panel'}
      >
        {currentSession && (
          <div className="space-y-3">
            <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
              {'\uD83D\uDCC2'} {t('saveSlot.savedVersions')}
            </div>
            <div className="text-[10px] text-text-tertiary">
              {(currentSession.config.savedSlots || []).length === 0
                ? (language === 'KO' ? '\uC800\uC7A5\uB41C \uC2AC\uB86F\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.' : 'No saved slots.')
                : `${(currentSession.config.savedSlots || []).length} ${language === 'KO' ? '\uAC1C \uC800\uC7A5\uB428' : 'saved'}`
              }
            </div>
          </div>
        )}
      </MobileDrawer>

      {currentSession && activeTab !== 'writing' && (
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="fixed bottom-24 right-4 z-30 lg:hidden p-3 min-w-[48px] min-h-[48px] flex items-center justify-center bg-accent-purple text-white rounded-full shadow-lg shadow-accent-purple/30 active:scale-90 transition-transform"
          aria-label={language === 'KO' ? '\uCC38\uACE0 \uD328\uB110 \uC5F4\uAE30' : 'Open reference panel'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      )}

      <OSDesktop
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        focusMode={focusMode}
        projects={projects}
        createNewProject={createNewProject}
        currentProjectId={currentProjectId}
        setCurrentProjectId={setCurrentProjectId}
        currentSessionId={currentSessionId}
        setCurrentSessionId={setCurrentSessionId}
        currentProject={currentProject}
        sessions={sessions}
        renameProject={renameProject}
        deleteProject={deleteProject}
        createNewSession={createNewSession}
        activeTab={activeTab}
        handleTabChange={handleTabChange}
        studioMode={studioMode}
        setStudioMode={setStudioMode}
        exportTXT={exportTXT}
        exportJSON={exportJSON}
        handleImportJSON={handleImportJSON}
        handleImportTextFiles={handleImportTextFiles}
        exportAllJSON={exportAllJSON}
        handleExportEPUB={handleExportEPUB}
        handleExportDOCX={handleExportDOCX}
        exportProjectJSON={exportProjectJSON}
        exportProjectManuscripts={exportProjectManuscripts}
        fileInputRef={fileInputRef}
        user={user}
        signInWithGoogle={signInWithGoogle}
        signOut={signOut}
        authConfigured={authConfigured}
        handleSync={handleSync}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        language={language}
        setLanguage={setLanguage}
        showConfirm={showConfirm}
        closeConfirm={closeConfirm}
        onReorderSessions={handleReorderSessions}
      />

      {!isSidebarOpen && !focusMode && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-60 items-center justify-center w-7 h-20 bg-bg-secondary border border-border border-l-0 rounded-r-xl text-text-tertiary hover:text-accent-purple hover:bg-bg-tertiary transition-colors shadow-lg cursor-pointer"
          title={language === 'KO' ? '\uC0AC\uC774\uB4DC\uBC14 \uC5F4\uAE30' : 'Open sidebar'}
        >
          <span className="text-xs font-bold">{'\u25B6'}</span>
        </button>
      )}

      <StudioProvider value={studioContextValue}>
        <StudioMainContent>
          {/* StudioSaveSlotPanel removed — save slots accessible via modal */}
          {/* StudioWritingAssistantPanel removed - now integrated into WritingTabInline via RightChatPanel */}
        </StudioMainContent>
      </StudioProvider>

      <StudioOverlayManager
        language={language}
        isKO={isKO}
        showQuickStartModal={showQuickStartModal} setShowQuickStartModal={setShowQuickStartModal}
        handleQuickStart={handleQuickStart} isQuickGenerating={isQuickGenerating}
        showApiKeyModal={showApiKeyModal} setShowApiKeyModal={setShowApiKeyModal}
        hostedProviders={hostedProviders} setApiKeyVersion={setApiKeyVersion}
        confirmState={confirmState} closeConfirm={closeConfirm}
        moveModal={moveModal} setMoveModal={setMoveModal} moveSessionToProject={moveSessionToProject}
        saveSlotModalOpen={saveSlotModalOpen} setSaveSlotModalOpen={setSaveSlotModalOpen}
        activeTab={activeTab} currentSession={currentSession} updateCurrentSession={updateCurrentSession} triggerSave={triggerSave}
        showSyncReminder={showSyncReminder} setShowSyncReminder={setShowSyncReminder}
        user={user} lastSyncTime={lastSyncTime} handleSync={handleSync} signInWithGoogle={signInWithGoogle}
        storageFull={storageFull} setStorageFull={setStorageFull} exportAllJSON={exportAllJSON}
        fallbackNotice={fallbackNotice} setFallbackNotice={setFallbackNotice}
        exportDoneFormat={exportDoneFormat} setExportDoneFormat={setExportDoneFormat}
        worldImportBanner={worldImportBanner} setWorldImportBanner={setWorldImportBanner}
        uxError={uxError} setUxError={setUxError}
        alertToast={alertToast} setAlertToast={setAlertToast}
      />
    </div>
    </StudioUIProvider>
    </StudioConfigProvider>
    </ErrorBoundary>
  );
}

// IDENTITY_SEAL: PART-5 | role=render | inputs=all-state | outputs=JSX(full-layout)
