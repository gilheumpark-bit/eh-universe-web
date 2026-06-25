"use client";

import { useState, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { usePathname } from 'next/navigation';
import type { AppLanguage, WritingMode } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { useAuth } from '@/lib/AuthContext';
import { createHFCPState, type HFCPState as HFCPStateType } from '@/engine/hfcp';
import type { StudioContextValue } from './StudioContext';
import { useSessionSnapshot } from '@/hooks/useSessionSnapshot';
import { useProjectManager } from '@/hooks/useProjectManager';
import { useAutoVersionSnapshot } from '@/hooks/useAutoVersionSnapshot';
import { useCreativeProcessAutoTrigger } from '@/hooks/useCreativeProcessAutoTrigger';
import { useStudioUX } from '@/hooks/useStudioUX';
import { useStudioSync } from '@/hooks/useStudioSync';
import { useStudioWritingMode } from '@/hooks/useStudioWritingMode';
import { useUnifiedSettings } from '@/lib/UnifiedSettingsContext';
import { useStudioSession } from '@/hooks/useStudioSession';
import { useStudioImport } from '@/hooks/useStudioImport';
import { useStudioQuickStart } from '@/hooks/useStudioQuickStart';
import { useStudioSessionActions } from '@/hooks/useStudioSessionActions';
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
import { useCreativeProcessTrackingPreference } from '@/hooks/useCreativeProcessTrackingPreference';
import { StudioShellView } from './StudioShell.view';
import type { StudioOverlayManagerProps } from '@/components/studio/StudioOverlayManager';
import type { StudioModalBridgeProps } from '@/components/studio/StudioModalBridge';
import type { RenameDialogProps } from '@/components/studio/RenameDialog';
import { useStudioUrlTab } from './StudioShell.url-tab';
import type { ShellPipelineSnapshot } from './StudioShell.types';
import { useStudioShellTabChange } from './StudioShell.tab-change';

export default function StudioShell({ children }: { children?: React.ReactNode } = {}) {
  const { lang } = useLang();
  const pathname = usePathname();
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const map: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', ja: 'JP', zh: 'CN' };
    return map[lang] || 'KO';
  });

  const sessionSnapshot = useSessionSnapshot(pathname ?? undefined);

  const isMobile = useIsMobile();
  const [forceDesktop, setForceDesktop] = useState(false);

  const studioMounts = useStudioMounts({ language });
  useEnvironmentSanity();

  const pm = useProjectManager(language, null, {
    onSaveComplete: studioMounts.shadowWriter.onPrimarySaveComplete,
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

  useAutoVersionSnapshot({ projects, cooldownMs: 60_000 });

  useStorageQuota();

  const [creativeProcessTrackingEnabled] = useCreativeProcessTrackingPreference();
  useCreativeProcessAutoTrigger({ projects, currentProjectId, enabled: creativeProcessTrackingEnabled });

  useStudioShellCreativeEffects(currentProjectId, Boolean(children), creativeProcessTrackingEnabled);

  const { activeTab, setActiveTab } = useStudioUrlTab(pathname);

  const [charSubTab, setCharSubTab] = useState<'characters' | 'items'>('characters');
  const [studioMode, setStudioMode] = useState<'guided' | 'free'>('guided');
  const [, setStudioModeHydrated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyVersion, setApiKeyVersion] = useState(0);

  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
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
  const [zenMode, setZenMode] = useState(false);
  useStudioShellBootEffects({
    lang, language, setLanguage, setForceDesktop, setStudioMode,
    setStudioModeHydrated, setIsSidebarOpen, setApiKeyVersion, zenMode,
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
  const [pipelineResult, setPipelineResult] = useState<ShellPipelineSnapshot | null>(null);

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
    onPipelineUpdate: (exec) => setPipelineResult(exec),
  });

  const { showQuickStartModal, setShowQuickStartModal, isQuickGenerating, handleQuickStart, openQuickStart } = useStudioQuickStart({
    language, showQuickStartLock, setShowApiKeyModal, currentProjectId, createNewProject, setProjects, setCurrentSessionId, setActiveTab, setPipelineResult, setUxError, doHandleSend, currentSessionId, currentSession
  });

  const anyModalOpen = showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen || !!moveModal || showQuickStartModal || renameDialogOpen;

  const handleTabChange = useStudioShellTabChange({
    activeTab, writingMode, editDraft, currentSessionId, flushPendingDraft,
    setActiveTab, setIsSidebarOpen, showConfirm, closeConfirm, translator: t,
  });

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
    handlePrint, handleExportEPUB, handleExportDOCX, handleExportHWPX,
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

  const studioConfigValue = { language, setLanguage, isKO, currentSession, currentSessionId, currentProjectId, config: currentSession?.config ?? null, setConfig, projects, hasAiAccess, studioMode, setStudioMode };
  const studioUIValue = { activeTab, handleTabChange, showConfirm, closeConfirm, setUxError, triggerSave, saveFlash };

  const studioContextValue: StudioContextValue = {
    focusMode, setFocusMode, isSidebarOpen, setIsSidebarOpen, themeLevel, toggleTheme,
    showSearch, setShowSearch, searchQuery, setSearchQuery, showShortcuts, setShowShortcuts,
    showGlobalSearch, setShowGlobalSearch, globalSearchQuery, setGlobalSearchQuery,
    activeTab, handleTabChange, setActiveTab,
    currentSession, currentSessionId, currentProjectId, currentProject, sessions, projects,
    setCurrentSessionId, setCurrentProjectId, hydrated, deleteProject: doDeleteProject, renameProject,
    setConfig, updateCurrentSession,
    writingMode, setWritingMode: setWritingMode as Dispatch<SetStateAction<WritingMode>>,
    editDraft, setEditDraft, editDraftRef, canvasContent, setCanvasContent, canvasPass, setCanvasPass,
    promptDirective, setPromptDirective, advancedSettings, setAdvancedSettings,
    isGenerating, lastReport, directorReport, generationTime, tokenUsage, handleSend, doHandleSend,
    handleCancel, handleRegenerate, handleVersionSwitch, handleTypoFix, hfcpState,
    input, setInput, showDashboard, setShowDashboard, showToolbox, setShowToolbox,
    rightPanelOpen, setRightPanelOpen, showAiLock, hasAiAccess, aiCapabilitiesLoaded,
    bannerDismissed, setBannerDismissed, showApiKeyModal, setShowApiKeyModal,
    showQuickStartLock, hostedProviders: hostedProviders as Record<string, boolean>,
    saveFlash, lastSaveTime, triggerSave,
    setUxError, messagesEndRef, filteredMessages, searchMatchesEditDraft,
    writingColumnShell, writingInputDockOffset, apiBannerMessage, apiSetupLabel,
    language, isKO, sessionStartChars: sessionStartCharsRef.current ?? 0, editorFontSize,
    historyScope, setHistoryScope, historyFilter, setHistoryFilter, charSubTab, setCharSubTab,
    createNewSession, createNewProject, createNewProjectWithSession, createDemoSession, openQuickStart,
    startRename, renamingSessionId, setRenamingSessionId, renameValue, setRenameValue, confirmRename,
    moveSessionToProject, deleteSession, handleNextEpisode, handlePrint,
    suggestions, setSuggestions, pipelineResult,
    versionedBackups, doRestoreVersionedBackup, refreshBackupList, clearAllSessions,
  };

  const overlayProps: StudioOverlayManagerProps = {
    language, isKO, showQuickStartModal, setShowQuickStartModal, handleQuickStart, isQuickGenerating,
    showApiKeyModal, setShowApiKeyModal, setApiKeyVersion, confirmState, closeConfirm,
    moveModal, setMoveModal, moveSessionToProject, saveSlotModalOpen, setSaveSlotModalOpen,
    activeTab, currentSession, updateCurrentSession, triggerSave,
    showSyncReminder, setShowSyncReminder, user, lastSyncTime, handleSync, signInWithGoogle,
    storageFull, setStorageFull, exportAllJSON, fallbackNotice, setFallbackNotice,
    exportDoneFormat, setExportDoneFormat, worldImportBanner, setWorldImportBanner,
    uxError, setUxError, alertToast, setAlertToast,
  };

  const modalBridgeProps: StudioModalBridgeProps = {
    language, activeTab, currentSession, updateCurrentSession, triggerSave,
    apiKeyOpen: showApiKeyModal, setApiKeyOpen: setShowApiKeyModal,
    onApiKeyChange: () => setApiKeyVersion(version => version + 1),
    saveSlotOpen: saveSlotModalOpen, setSaveSlotOpen: setSaveSlotModalOpen,
  };

  const desktopProps = {
    isSidebarOpen, setIsSidebarOpen, focusMode, projects, createNewProject,
    currentProjectId, setCurrentProjectId, currentSessionId, setCurrentSessionId,
    sessions, renameProject, deleteProject, createNewSession, activeTab, handleTabChange,
    exportTXT, exportJSON, handleImportTextFiles, exportAllJSON, handleExportEPUB,
    handleExportDOCX, handleExportHWPX, exportProjectJSON, exportProjectManuscripts,
    fileInputRef, user, syncStatus, lastSyncTime, language, setLanguage,
    onReorderSessions: handleReorderSessions,
  };

  const renameDialogProps: RenameDialogProps = {
    open: renameDialogOpen, projects, sessions, currentSession: currentSession || null, currentProjectId, language,
    onApply: (result) => {
      setProjects(result.projects);
      setSessions(result.sessions);
      dispatchUi({ renameDialogOpen: false });
      void triggerSave();
      window.dispatchEvent(new CustomEvent('noa:alert', {
        detail: { message: isKO ? `${result.changedCount}건 변경되었습니다` : `${result.changedCount} changes applied`, variant: 'info' },
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
