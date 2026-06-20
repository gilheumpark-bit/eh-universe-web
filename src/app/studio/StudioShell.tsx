"use client";

// ============================================================
// PART 1: Imports
// ============================================================
import { useState, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AppLanguage, AppTab, WritingMode } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { useAuth } from '@/lib/AuthContext';
import { createHFCPState, type HFCPState as HFCPStateType } from '@/engine/hfcp';
import type { StudioContextValue } from './StudioContext';
// [A.2 2026-05-08] 세션 스냅샷 + 마지막 작업 카드. 인체공학 §"세션 간 복구"
import { useSessionSnapshot } from '@/hooks/useSessionSnapshot';
import { useProjectManager } from '@/hooks/useProjectManager';
import { useAutoVersionSnapshot } from '@/hooks/useAutoVersionSnapshot';
import { useCreativeProcessAutoTrigger } from '@/hooks/useCreativeProcessAutoTrigger';
import { sanitizeLoadedText } from '@/lib/project-sanitize';
import { useStudioUX } from '@/hooks/useStudioUX';
import { useStudioSync } from '@/hooks/useStudioSync';
import { useStudioWritingMode } from '@/hooks/useStudioWritingMode';
import { useUnifiedSettings } from '@/lib/UnifiedSettingsContext';
import { useStudioSession } from '@/hooks/useStudioSession';
import { useStudioImport } from '@/hooks/useStudioImport';
import { useStudioQuickStart } from '@/hooks/useStudioQuickStart';
import { useStudioSessionActions } from '@/hooks/useStudioSessionActions';
// [M-08 2026-05-10] localStorage / IndexedDB quota 자동 모니터. critical 시 noa:alert 토스트.
import { useStorageQuota } from '@/hooks/useStorageQuota';
import { useStudioAI } from '@/hooks/useStudioAI';
import { useStudioExport } from '@/hooks/useStudioExport';
import { useStudioShellController } from './useStudioShellController';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useStudioMounts } from '@/hooks/useStudioMounts';
import { useEnvironmentSanity } from '@/hooks/useEnvironmentSanity';
import { useStudioShellUiState } from './StudioShell.ui-state';
import { useStudioShellDraftPersistence } from './StudioShell.draft-persistence';
import { useStudioShellAiAccess } from './useStudioShellAiAccess';
import { useStudioShellNextEpisode } from './useStudioShellNextEpisode';
import { useStudioShellActionRouting } from './useStudioShellActionRouting';
import { useStudioShellBootEffects, useStudioShellCreativeEffects, useStudioShellEventEffects } from './useStudioShellSideEffects';
import { StudioShellView } from './StudioShell.view';
import type { StudioOverlayManagerProps } from '@/components/studio/StudioOverlayManager';
import type { StudioModalBridgeProps } from '@/components/studio/StudioModalBridge';
import type { RenameDialogProps } from '@/components/studio/RenameDialog';

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+hooks+components

// ============================================================
// PART 2 — State Management & Hooks
// ============================================================
export default function StudioShell({ children }: { children?: React.ReactNode } = {}) {
  const { lang } = useLang();
  const studioRouter = useRouter();
  const pathname = usePathname();
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const map: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', ja: 'JP', zh: 'CN' };
    return map[lang] || 'KO';
  });

  // [A.2 — 2026-05-08] 세션 스냅샷 자동 + 마지막 작업 카드 (휴식 후 5초 이내 컨텍스트 복구)
  const sessionSnapshot = useSessionSnapshot(pathname ?? undefined);

  // 모바일 감지 — 전체 PC UX 대신 경량 스케치 뷰로 교체
  // 사용자가 명시적으로 PC 뷰 강제 모드(?force=desktop)를 선택하면 우회 가능
  const isMobile = useIsMobile();
  const [forceDesktop, setForceDesktop] = useState(false);

  // ── [M1.5.1~M1.5.5] UI 마운트 훅 + Shadow 쓰기 + Primary Writer ──
  // FEATURE_JOURNAL_ENGINE 기본값 'shadow' (M9 P1-5 승격): legacy Primary + Shadow 병렬 관찰.
  // 'off' 전환 시: 모두 inert (shadow/primary 모두 legacy 패스스루).
  // 'on' 으로 전환 시: journal Primary + legacy Mirror (M1.5.5).
  // studioMounts 는 useProjectManager 보다 먼저 실행돼야 shadowWriter/primaryWriter 를
  // useProjectManager 의 옵셔널 콜백으로 주입 가능.
  const studioMounts = useStudioMounts({ language });
  // [M7] Boot-time environment probe — warns + emits noa:environment-degraded on missing browser APIs.
  useEnvironmentSanity();

  const pm = useProjectManager(language, null, {
    onSaveComplete: studioMounts.shadowWriter.onPrimarySaveComplete,
    // [M1.5.5] Primary Writer 주입 — flag 'on' 시 journal Primary, 그 외 legacy 패스스루.
    primaryWriteFn: studioMounts.primaryWriter.write,
  });
  const {
    projects, setProjects,
    currentProjectId, setCurrentProjectId,
    currentSessionId, setCurrentSessionId,
    hydrated,
    currentProject, sessions, currentSession,
    setSessions,
    createNewProject, createNewProjectWithSession, deleteProject: doDeleteProject, renameProject, moveSessionToProject,
    createNewSession: doCreateNewSession, deleteSession: doDeleteSession, clearAllSessions: doClearAllSessions,
    updateCurrentSession, setConfig,
    versionedBackups, doRestoreVersionedBackup, refreshBackupList,
  } = pm;

  // [auto version snapshot 2026-04-25] README "300자+ 변경 시 자동 스냅샷" 약속의 wiring.
  // 이전: saveVersionedBackup() 함수만 있고 자동 트리거 0 — 사용자가 모름.
  // 이후: 누적 char delta 300+ 도달 시 IndexedDB 에 자동 스냅샷.
  // 작가가 짧은 편집 (오타 수정 등)으로 스냅샷 폭주 안 함.
  // [Round 1-2 — 2026-05-07] cooldown 5분 → 1분 (작가 활동 정밀도 ↑, HUMAN_REVISION trigger 빈도 12배 ↑)
  useAutoVersionSnapshot({ projects, cooldownMs: 60_000 });

  // [M-08 — 2026-05-10] localStorage/IndexedDB quota 모니터 활성화.
  // 70% warning / 90% critical → noa:alert 자동 디스패치 → StudioShell 의 alertToast 가 표시.
  useStorageQuota();

  // [Track-D Phase 1.1 Round 2-2 — 2026-05-07] Scene/Character/World 편집 자동 누적.
  // useAutoVersionSnapshot 은 manuscripts/messages charDelta 만 추적 — 그 외 영역 보강.
  useCreativeProcessAutoTrigger({ projects, currentProjectId });

  useStudioShellCreativeEffects(currentProjectId, Boolean(children));

  const VALID_TABS: AppTab[] = ['world', 'writing', 'history', 'settings', 'characters', 'direction', 'style', 'manuscript', 'docs', 'visual'];
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

  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyVersion, setApiKeyVersion] = useState(0);

  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  // [Batch 3 rank 5 — 2026-06-07] WriterToolbox 18 모듈 사이드바 토글 상태.
  // ACTION_CATALOG 'studio:toolbox-open' 및 StudioMainContent 에서 소비.
  const [showToolbox, setShowToolbox] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = createT(language);
  const isKO = language === 'KO';
  const { user, signInWithGoogle, accessToken, refreshAccessToken } = useAuth();

  const {
    hostedProviders,
    aiCapabilitiesLoaded,
    hasHostedAiAccess,
    hasAiAccess,
    showAiLock,
    showQuickStartLock,
  } = useStudioShellAiAccess({ hydrated, user, apiKeyVersion });
  const apiBannerMessage = hasHostedAiAccess
    ? (isKO
      ? '노아가 준비되어 있어요. 바로 써보고, 원하면 연결 키를 추가하세요.'
      : 'Noa is ready. Start now, and add a connection key anytime.')
    : t('ui.apiKeyBanner');
  const apiSetupLabel = hasHostedAiAccess
    ? (isKO ? '\uAC1C\uC778 \uD0A4 \uCD94\uAC00' : 'Add Key')
    : t('ui.apiKeySetUp');

  const { theme, toggleTheme } = useUnifiedSettings();
  const themeLevel = theme === 'dark' ? 0 : 1;

  const [focusMode, setFocusMode] = useState(false);
  // [Doc 4 dir 01 P0 + Doc 5 — 2026-05-12] Zen 모드 state.
  // Ctrl+Shift+F 토글. body[data-zen=true] 마커 → globals.css CSS 룰로 sidebar/inspector/toolbar fade.
  // 인지 부하 41점 bad 해결 (Doc 3 ④). VS Code Zen Mode 패턴.
  const [zenMode, setZenMode] = useState(false);
  useStudioShellBootEffects({
    lang,
    language,
    setLanguage,
    setForceDesktop,
    setStudioMode,
    setStudioModeHydrated,
    setIsSidebarOpen,
    setApiKeyVersion,
    zenMode,
  });
  const [editorFontSize, setEditorFontSize] = useState(16);
  const sessionStartCharsRef = useRef<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    historyFilter,
    historyScope,
    moveModal,
    rightPanelOpen,
    mobileDrawerOpen,
    saveSlotModalOpen,
    showGlobalSearch,
    globalSearchQuery,
    renameDialogOpen,
    dispatchUi,
    setHistoryFilter,
    setHistoryScope,
    setMoveModal,
    setRightPanelOpen,
    setMobileDrawerOpen,
    setSaveSlotModalOpen,
    setShowGlobalSearch,
    setGlobalSearchQuery,
  } = useStudioShellUiState();

  // [저장 무결성] Ctrl+S가 실제 저장을 수행하도록 flush bridge 구축.
  // 실제 구현은 editDraft/projects 정의 이후에 주입 (saveFlushRef.current).
  // 이 ref 덕에 useStudioUX 시그니처는 안정적인 콜백을 받고, 실제 flush는 늦게 바인딩.
  const saveFlushRef = useRef<(() => Promise<boolean> | boolean) | null>(null);

  const {
    uxError, setUxError,
    storageFull, setStorageFull,
    exportDoneFormat, setExportDoneFormat,
    lastSaveTime, saveFlash, saveFailed, triggerSave,
    fallbackNotice, setFallbackNotice,
    confirmState, showConfirm, closeConfirm,
  } = useStudioUX({
    onSaveFlush: useCallback(async () => {
      const flush = saveFlushRef.current;
      if (!flush) return true; // flush 미주입 단계(마운트 직후) — 기만 방지용 noop OK
      return await flush();
    }, []),
  });

  const [alertToast, setAlertToast] = useState<{ message: string; variant: string } | null>(null);
  const { suggestions, setSuggestions } = useStudioShellController(currentSession || null, language);
  // [priority 3 — 2026-06-08] 명시적 호환 타입.
  // useStudioAI 는 PipelineExecution 을 전달 (id/totalDuration 포함, finalStatus union 좁음).
  // useStudioQuickStart 는 'running' 임시 상태 + stages-only 객체 전달.
  // 양쪽 superset 으로 ShellPipelineSnapshot 타입 정의 → `as any` 캐스팅 제거.
  type ShellPipelineSnapshot = {
    id?: string;
    stages: import('@/lib/studio-types').PipelineStageResult[];
    totalDuration?: number;
    finalStatus: 'completed' | 'failed' | 'partial' | 'running';
    blockedAt?: string;
  };
  const [pipelineResult, setPipelineResult] = useState<ShellPipelineSnapshot | null>(null);

  // IDENTITY_SEAL: PART-2 | role=state-management | inputs=hooks | outputs=state-variables

  // ============================================================
  // PART 3 — Import Effects & Quick Start
  // ============================================================
  const { worldImportBanner, setWorldImportBanner } = useStudioImport({
    hydrated,
    language,
    activeTab,
    currentProjectId,
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

  const flushPendingDraft = useStudioShellDraftPersistence({
    hydrated,
    currentSessionId,
    currentSession,
    projects,
    setProjects,
    writingMode,
    editDraft,
    setEditDraft,
    setConfig,
    saveFlushRef,
    language,
    saveFailed,
  });




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
    currentSession, currentSessionId, currentProjectId, setSessions, updateCurrentSession,
    hfcpState, promptDirective, language, canvasPass,
    setCanvasContent, setWritingMode, setShowApiKeyModal, setUxError,
    advancedOutputMode: advancedSettings.outputMode,
    advancedSettings,
    onSuggestionsUpdate: (newSugs) => setSuggestions(prev => [...newSugs, ...prev.filter(s => s.dismissed)]),
    // [priority 3 — 2026-06-08] PipelineExecution ⊂ ShellPipelineSnapshot — 안전한 widening.
    onPipelineUpdate: (exec) => setPipelineResult(exec),
  });

  const { showQuickStartModal, setShowQuickStartModal, isQuickGenerating, handleQuickStart, openQuickStart } = useStudioQuickStart({
    language, showQuickStartLock, setShowApiKeyModal, currentProjectId, createNewProject, setProjects, setCurrentSessionId, setActiveTab, setPipelineResult, setUxError, doHandleSend, currentSessionId, currentSession
  });

  const anyModalOpen = showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen || !!moveModal || showQuickStartModal || renameDialogOpen;

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
      try { localStorage.setItem(`noa_editdraft_${currentSessionId}`, sanitizeLoadedText(editDraft)); } catch { /* quota/private */ }
    }
    // [shell-flush] (4) 전환 전 debounce pending 강제 머지 — 마지막 <2초 입력 보전.
    // 성공(또는 대기 없음) 시 "미저장" 상태가 실제로 존재하지 않으므로 경고 다이얼로그 불필요.
    const flushed = flushPendingDraft();
    if (!flushed && tab !== activeTab && activeTab === 'writing' && writingMode === 'edit' && editDraft.trim()) {
      // [shell-flush] (6) flush 실패(quota 등)일 때만 경고 — 기존 문구 "저장되지 않았습니다"가
      // 이제 사실과 일치 (이전에는 debounce가 이미 저장한 상태에서도 떠서 오도).
      showConfirm({
        title: t('confirm.unsavedEdits'),
        message: t('confirm.unsavedEditsMsg'),
        variant: 'warning',
        confirmLabel: t('confirm.switch'),
        cancelLabel: t('confirm.keepEditing'),
        onConfirm: () => {
          closeConfirm();
          // [shell-flush] setEditDraft('') 제거 — flush 실패 상태에서 초안 메모리까지 파기하면
          // (localStorage도 같은 quota로 실패했을 가능성) 실제 데이터 손실 (S1). 초안은 유지.
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
  }, [activeTab, writingMode, editDraft, language, showConfirm, closeConfirm, currentSessionId, flushPendingDraft]);

  const {
    deleteSession, clearAllSessions, startRename, confirmRename,
    handleReorderSessions, handleVersionSwitch, handleTypoFix
  } = useStudioSessionActions({
    language, sessions, currentSessionId, setSessions, doDeleteSession, doClearAllSessions,
    showConfirm, closeConfirm, setActiveTab, setRenamingSessionId, setRenameValue,
    renamingSessionId, renameValue,
  });

  const {
    exportTXT, exportJSON, exportAllJSON,
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

  const handleSend = useCallback((customPrompt?: string) => {
    doHandleSend(customPrompt, input, () => setInput(''));
  }, [doHandleSend, input]);

  useStudioShellEventEffects({
    userUid: user?.uid,
    setAlertToast,
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    hydrated,
    setIsSidebarOpen,
    handleSync,
    aiCapabilitiesLoaded,
    hasAiAccess,
    currentSession,
    dispatchUi,
    openQuickStart,
    anyModalOpen,
    activeTab,
    messageCount,
    isGenerating,
    messagesEndRef,
  });

  const { cmdPalette } = useStudioShellActionRouting({
    childrenPresent: Boolean(children),
    language,
    setActiveTab,
    handleTabChange,
    setShowToolbox,
    setShowSearch,
    setFocusMode,
    setIsSidebarOpen,
    setZenMode,
    setShowShortcuts,
    setShowApiKeyModal,
    setShowQuickStartModal,
    setRightPanelOpen,
    setEditorFontSize,
    setWritingMode: setWritingMode as Dispatch<SetStateAction<WritingMode>>,
    dispatchUi,
    confirmState,
    closeConfirm,
    currentSession,
    setConfig,
    triggerSave,
    createNewSession,
    exportTXT,
    handleExportEPUB,
    handlePrint,
    handleSend,
    showShortcuts,
    showApiKeyModal,
    saveSlotModalOpen,
    moveModal,
    showQuickStartModal,
    showGlobalSearch,
    renameDialogOpen,
    zenMode,
    isGenerating,
    writingMode,
    editDraft,
  });

  const handleNextEpisode = useStudioShellNextEpisode({
    currentSession,
    editDraft,
    language,
    setConfig,
  });

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
    deleteProject: doDeleteProject,
    renameProject,
    // Config
    setConfig, updateCurrentSession,
    // Writing
    writingMode, setWritingMode: setWritingMode as Dispatch<SetStateAction<WritingMode>>,
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
    // [Batch 3 rank 5 — 2026-06-07] WriterToolbox 18 모듈 사이드바 토글.
    showToolbox, setShowToolbox,
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
    historyScope, setHistoryScope,
    historyFilter, setHistoryFilter,
    charSubTab, setCharSubTab,
    // Session management
    createNewSession, createNewProject, createNewProjectWithSession, createDemoSession, openQuickStart,
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
  const overlayProps: StudioOverlayManagerProps = {
    language,
    isKO,
    showQuickStartModal,
    setShowQuickStartModal,
    handleQuickStart,
    isQuickGenerating,
    showApiKeyModal,
    setShowApiKeyModal,
    setApiKeyVersion,
    confirmState,
    closeConfirm,
    moveModal,
    setMoveModal,
    moveSessionToProject,
    saveSlotModalOpen,
    setSaveSlotModalOpen,
    activeTab,
    currentSession,
    updateCurrentSession,
    triggerSave,
    showSyncReminder,
    setShowSyncReminder,
    user,
    lastSyncTime,
    handleSync,
    signInWithGoogle,
    storageFull,
    setStorageFull,
    exportAllJSON,
    fallbackNotice,
    setFallbackNotice,
    exportDoneFormat,
    setExportDoneFormat,
    worldImportBanner,
    setWorldImportBanner,
    uxError,
    setUxError,
    alertToast,
    setAlertToast,
  };

  const modalBridgeProps: StudioModalBridgeProps = {
    language,
    activeTab,
    currentSession,
    updateCurrentSession,
    triggerSave,
    apiKeyOpen: showApiKeyModal,
    setApiKeyOpen: setShowApiKeyModal,
    onApiKeyChange: () => setApiKeyVersion(version => version + 1),
    saveSlotOpen: saveSlotModalOpen,
    setSaveSlotOpen: setSaveSlotModalOpen,
  };

  const desktopProps = {
    isSidebarOpen,
    setIsSidebarOpen,
    focusMode,
    projects,
    createNewProject,
    currentProjectId,
    setCurrentProjectId,
    currentSessionId,
    setCurrentSessionId,
    sessions,
    renameProject,
    deleteProject,
    createNewSession,
    activeTab,
    handleTabChange,
    exportTXT,
    exportJSON,
    handleImportTextFiles,
    exportAllJSON,
    handleExportEPUB,
    handleExportDOCX,
    exportProjectJSON,
    exportProjectManuscripts,
    fileInputRef,
    user,
    syncStatus,
    lastSyncTime,
    language,
    setLanguage,
    onReorderSessions: handleReorderSessions,
  };

  const renameDialogProps: RenameDialogProps = {
    open: renameDialogOpen,
    projects,
    sessions,
    currentSession: currentSession || null,
    currentProjectId,
    language,
    onApply: (result) => {
      setProjects(result.projects);
      setSessions(result.sessions);
      dispatchUi({ renameDialogOpen: false });
      void triggerSave();
      window.dispatchEvent(new CustomEvent('noa:alert', {
        detail: {
          message: isKO
            ? `${result.changedCount}건 변경되었습니다`
            : `${result.changedCount} changes applied`,
          variant: 'info',
        },
      }));
    },
    onClose: () => dispatchUi({ renameDialogOpen: false }),
  };

  return (
    <StudioShellView
      language={language}
      isKO={isKO}
      hydrated={hydrated}
      isMobile={isMobile}
      forceDesktop={forceDesktop}
      activeTab={activeTab}
      studioMode={studioMode}
      focusMode={focusMode}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      mobileDrawerOpen={mobileDrawerOpen}
      setMobileDrawerOpen={setMobileDrawerOpen}
      currentSession={currentSession}
      currentProjectId={currentProjectId}
      handleTabChange={handleTabChange}
      sessionSnapshot={sessionSnapshot}
      cmdPalette={cmdPalette}
      crossTabNotification={crossTabNotification}
      reloadFromStorage={reloadFromStorage}
      dismissCrossTabNotification={dismissCrossTabNotification}
      studioMounts={studioMounts}
      studioConfigValue={studioConfigValue}
      studioUIValue={studioUIValue}
      studioContextValue={studioContextValue}
      overlayProps={overlayProps}
      modalBridgeProps={modalBridgeProps}
      desktopProps={desktopProps}
      renameDialogProps={renameDialogProps}
      zenMode={zenMode}
    >
      {children}
    </StudioShellView>
  );
}

// IDENTITY_SEAL: PART-5 | role=render | inputs=all-state | outputs=JSX(full-layout)
