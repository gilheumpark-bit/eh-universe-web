"use client";

// ============================================================
// PART 1 — Imports
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import type {
  StoryConfig, AppLanguage, AppTab, ChatSession, Project,
} from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { useAuth } from '@/lib/AuthContext';
import { createHFCPState, type HFCPState as HFCPStateType } from '@/engine/hfcp';
import { logger } from '@/lib/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import MobileTabBar from '@/components/studio/MobileTabBar';
import MobileDrawer from '@/components/studio/MobileDrawer';
import { useProjectManager, INITIAL_CONFIG } from '@/hooks/useProjectManager';
import { useStudioUX } from '@/hooks/useStudioUX';
import { useStudioSync } from '@/hooks/useStudioSync';
import { useStudioWritingMode } from '@/hooks/useStudioWritingMode';
import { useStudioTheme } from '@/hooks/useStudioTheme';
import { useStudioSession } from '@/hooks/useStudioSession';
import { StudioConfigProvider, StudioUIProvider } from '@/contexts/StudioContext';
import { useStudioKeyboard } from '@/hooks/useStudioKeyboard';
import { useStudioAI } from '@/hooks/useStudioAI';
import { useStudioExport } from '@/hooks/useStudioExport';
import { generateWorldDesign, generateCharacters } from '@/services/geminiService';
import { setDriveEncryptionKey } from '@/services/driveService';
import { ConfirmModal, useUnsavedWarning } from '@/components/studio/UXHelpers';
import StudioToasts from '@/components/studio/StudioToasts';
import { MoveSessionModal, SaveSlotModal } from '@/components/studio/StudioModals';
import ApiKeyModal from '@/components/studio/ApiKeyModal';
import { getApiKey, getActiveProvider, type ProviderId } from '@/lib/ai-providers';
import StudioSidebar from '@/components/studio/StudioSidebar';
import StudioMainContent from './StudioMainContent';
import { StudioSaveSlotPanel, StudioWritingAssistantPanel } from './StudioRightPanel';
import { useStudioShellController } from './useStudioShellController';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const QuickStartModal = dynamic(() => import('@/components/studio/QuickStartModal'), { ssr: false, loading: DynSkeleton });

type HostedAiAvailability = Partial<Record<ProviderId, boolean>>;
const PROVIDER_IDS: ProviderId[] = ['gemini', 'openai', 'claude', 'groq', 'mistral'];

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+hooks+components

// ============================================================
// PART 2 — State Management & Hooks
// ============================================================
export default function StudioShell() {
  const { lang } = useLang();
  const searchParams = useSearchParams();
  const studioRouter = useRouter();
  const pathname = usePathname();
  const [worldImportBanner, setWorldImportBanner] = useState(false);
  const [worldImportDone, setWorldImportDone] = useState<string | null>(null);
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const map: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', jp: 'JP', cn: 'CN' };
    return map[lang] || 'KO';
  });

  useEffect(() => {
    const map: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', jp: 'JP', cn: 'CN' };
    setLanguage(map[lang] || 'KO');
  }, [lang]);

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
  const [studioMode, setStudioMode] = useState<'guided' | 'free'>(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('noa_studio_mode');
      if (raw === 'guided' || raw === 'free') return raw;
      if (raw) localStorage.setItem('noa_studio_mode', 'free');
      return raw ? 'free' : 'guided';
    }
    return 'guided';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  useEffect(() => {
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);
  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyVersion, setApiKeyVersion] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(() => typeof window !== 'undefined' && localStorage.getItem('noa_api_banner_dismissed') === '1');
  const [showDashboard, setShowDashboard] = useState(false);
  const [hostedProviders, setHostedProviders] = useState<HostedAiAvailability>({});
  const [aiCapabilitiesLoaded, setAiCapabilitiesLoaded] = useState(false);
  const [showQuickStartModal, setShowQuickStartModal] = useState(false);
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = createT(language);
  const isKO = language === 'KO';

  const activeProviderId = getActiveProvider();
  const hasLocalApiKey = hydrated && (apiKeyVersion >= 0) && !!getApiKey(activeProviderId);
  const hasAiAccess = hydrated && (hasLocalApiKey || Boolean(hostedProviders[activeProviderId]));
  const hasQuickStartAccess = hydrated && (!!getApiKey('gemini') || Boolean(hostedProviders.gemini));
  const showAiLock = aiCapabilitiesLoaded && !hasAiAccess;
  const showQuickStartLock = aiCapabilitiesLoaded && !hasQuickStartAccess;
  const apiBannerMessage = Boolean(hostedProviders[activeProviderId])
    ? (isKO
      ? '\uAE30\uBCF8 AI\uAC00 \uC900\uBE44\uB418\uC5B4 \uC788\uC5B4\uC694. \uBC14\uB85C \uC368\uBCF4\uACE0, \uC6D0\uD558\uBA74 \uAC1C\uC778 \uD0A4\uB97C \uCD94\uAC00\uD558\uC138\uC694.'
      : 'Base AI is ready. Start now, and add your own key anytime.')
    : t('ui.apiKeyBanner');
  const apiSetupLabel = Boolean(hostedProviders[activeProviderId])
    ? (isKO ? '\uAC1C\uC778 \uD0A4 \uCD94\uAC00' : 'Add Key')
    : t('ui.apiKeySetUp');

  const {
    themeLevel, lightTheme, toggleTheme,
    focusMode, setFocusMode,
    showShortcuts, setShowShortcuts,
    showSearch, setShowSearch,
    searchQuery, setSearchQuery,
  } = useStudioTheme();

  const [archiveFilter, setArchiveFilter] = useState<string>('ALL');
  const [archiveScope, setArchiveScope] = useState<'project' | 'all'>('project');
  const [moveModal, setMoveModal] = useState<{ sessionId: string; others: Project[] } | null>(null);
  const { user, signInWithGoogle, signOut, isConfigured: authConfigured, accessToken, refreshAccessToken } = useAuth();

  useEffect(() => {
    if (user?.uid) setDriveEncryptionKey(user.uid);
  }, [user?.uid]);

  const {
    uxError, setUxError,
    storageFull, setStorageFull,
    exportDoneFormat,
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
        const data = await response.json() as { hosted?: Record<string, unknown> };
        if (cancelled) return;
        const nextHosted: HostedAiAvailability = {};
        for (const providerId of PROVIDER_IDS) {
          nextHosted[providerId] = Boolean(data.hosted?.[providerId]);
        }
        setHostedProviders(nextHosted);
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
  useEffect(() => {
    if (!hydrated) return;
    const raw = searchParams.get('worldImport');
    if (!raw) return;
    if (worldImportDone === raw) {
      studioRouter.replace(`${pathname}?tab=${activeTab}`, { scroll: false });
      return;
    }
    try {
      const json = JSON.parse(decodeURIComponent(escape(atob(raw))));
      const genreGuess = (json.tags as string[] | undefined)?.find((tag: string) =>
        Object.values(Genre).map(g => g.toLowerCase()).includes(tag.toLowerCase())
      );
      const importedConfig: Partial<StoryConfig> = {
        title: json.name ?? '',
        synopsis: json.summary ?? '',
        corePremise: (json.coreRules as string[] | undefined)?.join('\n') ?? '',
      };
      if (genreGuess) {
        const matched = Object.values(Genre).find(g => g.toLowerCase() === genreGuess.toLowerCase());
        if (matched) importedConfig.genre = matched;
      }
      const importedSessionId = doCreateNewSession();
      setProjects(prevProjects => prevProjects.map(project => {
        if (!project.sessions.some(session => session.id === importedSessionId)) return project;
        return {
          ...project,
          lastUpdate: Date.now(),
          sessions: project.sessions.map(session =>
            session.id === importedSessionId
              ? { ...session, config: { ...session.config, ...importedConfig }, lastUpdate: Date.now() }
              : session,
          ),
        };
      }));
      setActiveTab('world');
      setWorldImportBanner(true);
      setWorldImportDone(raw);
      setTimeout(() => setWorldImportBanner(false), 5000);
      studioRouter.replace(`${pathname}?tab=world`, { scroll: false });
    } catch {
      setAlertToast({ message: language === 'KO' ? '\uC138\uACC4\uAD00 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB9C1\uD06C\uAC00 \uC190\uC0C1\uB410\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.' : 'Failed to import world data. The link may be corrupted.', variant: 'error' });
      studioRouter.replace(`${pathname}?tab=${activeTab}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (searchParams.get('worldImport')) return;
    const raw = searchParams.get('postImport');
    if (!raw) return;
    try {
      const json = JSON.parse(decodeURIComponent(escape(atob(raw))));
      const importedConfig: Partial<StoryConfig> = {
        title: json.title ?? '',
        synopsis: json.content?.slice(0, 500) ?? '',
      };
      if (json.planetName) importedConfig.setting = json.planetName;
      const importedSessionId = doCreateNewSession();
      setProjects(prevProjects => prevProjects.map(project => {
        if (!project.sessions.some(session => session.id === importedSessionId)) return project;
        return {
          ...project,
          lastUpdate: Date.now(),
          sessions: project.sessions.map(session =>
            session.id === importedSessionId
              ? {
                  ...session,
                  config: { ...session.config, ...importedConfig },
                  messages: [
                    ...session.messages,
                    { id: `import-${Date.now()}`, role: 'assistant' as const, content: json.content ?? '', timestamp: Date.now() },
                  ],
                  lastUpdate: Date.now(),
                }
              : session,
          ),
        };
      }));
      setActiveTab('writing');
      setWorldImportBanner(true);
      setTimeout(() => setWorldImportBanner(false), 5000);
      studioRouter.replace(`${pathname}?tab=writing`, { scroll: false });
    } catch {
      setAlertToast({ message: language === 'KO' ? '\uAC8C\uC2DC\uAE00 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.' : 'Failed to import post data.', variant: 'error' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (searchParams.get('setup') !== '1') return;
    if (typeof window !== 'undefined' && !localStorage.getItem('noa_onboarding_done')) {
      localStorage.setItem('noa_onboarding_done', '1');
    }
    setShowApiKeyModal(true);
    studioRouter.replace(`${pathname}?tab=${activeTab}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!aiCapabilitiesLoaded) return;
    if (hasAiAccess) {
      setWritingMode(prev => prev === 'edit' ? 'ai' : prev);
      localStorage.setItem('noa_writing_access', 'api');
    } else {
      setWritingMode(prev => (prev === 'ai' || prev === 'refine' || prev === 'canvas' || prev === 'advanced') ? 'edit' : prev);
      localStorage.setItem('noa_writing_access', 'manual');
    }
  }, [hasAiAccess, aiCapabilitiesLoaded]);

  // IDENTITY_SEAL: PART-3 | role=import-effects | inputs=hydrated,searchParams | outputs=side-effects

  // ============================================================
  // PART 4 — Callbacks & Derived State
  // ============================================================
  const {
    syncStatus, lastSyncTime,
    showSyncReminder, setShowSyncReminder,
    handleSync,
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
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [saveSlotModalOpen, setSaveSlotModalOpen] = useState(false);
  const [saveSlotName, setSaveSlotName] = useState('');

  const prevFocusRef = useRef<Element | null>(null);
  const anyModalOpen = showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen || !!moveModal || showQuickStartModal;
  useEffect(() => {
    if (anyModalOpen) {
      prevFocusRef.current = document.activeElement;
    } else if (prevFocusRef.current && prevFocusRef.current instanceof HTMLElement) {
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [anyModalOpen]);

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

  const [pendingQuickStartPrompt, setPendingQuickStartPrompt] = useState<string | null>(null);

  const handleQuickStart = async (genre: Genre, userPrompt: string) => {
    if (showQuickStartLock) { setShowApiKeyModal(true); return; }
    setIsQuickGenerating(true);
    try {
      const world = await generateWorldDesign(genre, language, { synopsis: userPrompt });
      const qsConfig: StoryConfig = {
        ...INITIAL_CONFIG,
        title: world.title, genre, synopsis: world.synopsis,
        povCharacter: world.povCharacter, setting: world.setting,
        primaryEmotion: world.primaryEmotion, corePremise: world.corePremise,
        powerStructure: world.powerStructure, currentConflict: world.currentConflict,
        worldHistory: world.worldHistory || '', socialSystem: world.socialSystem || '',
        economy: world.economy || '', magicTechSystem: world.magicTechSystem || '',
        factionRelations: world.factionRelations || '', survivalEnvironment: world.survivalEnvironment || '',
        culture: world.culture || '', religion: world.religion || '',
        education: world.education || '', lawOrder: world.lawOrder || '',
        taboo: world.taboo || '', dailyLife: world.dailyLife || '',
        travelComm: world.travelComm || '', truthVsBeliefs: world.truthVsBeliefs || '',
      };
      const characters = await generateCharacters(qsConfig, language);
      qsConfig.characters = characters;
      const targetProjectId = currentProjectId || createNewProject();
      const newSessionId = `s-${Date.now()}`;
      const newSession: ChatSession = { id: newSessionId, title: qsConfig.title, config: qsConfig, messages: [], lastUpdate: Date.now() };
      setProjects(prev => prev.map(p =>
        p.id === targetProjectId
          ? { ...p, sessions: [newSession, ...p.sessions], lastUpdate: Date.now() }
          : p,
      ));
      setCurrentSessionId(newSessionId);
      setActiveTab('writing');
      setShowQuickStartModal(false);
      setPipelineResult({
        stages: [
          { stage: 'world_check', status: 'passed', duration: 0, warnings: [] },
          { stage: 'character_sync', status: 'passed', duration: 0, warnings: [] },
          { stage: 'direction_setup', status: 'skipped', duration: 0, warnings: [] },
          { stage: 'generation', status: 'running', duration: 0, warnings: [] },
        ],
        finalStatus: 'running',
      });
      setPendingQuickStartPrompt(`${userPrompt}\n\n\uCCAB \uC7A5\uBA74\uC744 \uC368\uC918.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (/401|api key|not configured/i.test(errorMessage)) {
        setShowApiKeyModal(true);
      } else {
        logger.error("Studio", "Quick Start Failed:", err);
        setUxError({ error: err });
      }
    } finally {
      setIsQuickGenerating(false);
    }
  };

  useEffect(() => {
    if (pendingQuickStartPrompt && currentSessionId && currentSession) {
      doHandleSend(pendingQuickStartPrompt, '', () => {
        setPipelineResult(prev => prev ? { ...prev, finalStatus: 'completed' as const, stages: prev.stages.map(s => ({ ...s, status: s.status === 'skipped' ? 'skipped' as const : 'passed' as const })) } : null);
      });
      setPendingQuickStartPrompt(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuickStartPrompt, currentSessionId, currentSession]);

  const openQuickStart = useCallback(() => {
    if (showQuickStartLock) { setShowApiKeyModal(true); return; }
    setShowQuickStartModal(true);
  }, [showQuickStartLock]);

  const handleTabChange = useCallback((tab: AppTab) => {
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
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
      });
      return;
    }
    setActiveTab(tab);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, writingMode, editDraft, language, showConfirm, closeConfirm]);

  const deleteSession = (sessionIdToDelete: string) => {
    const sessionToDelete = sessions.find(s => s.id === sessionIdToDelete);
    if (!sessionToDelete) return;
    showConfirm({
      title: t('confirm.deleteSession'),
      message: `'${sessionToDelete.title}'${t('confirm.deleteSessionMsg')}`,
      confirmLabel: t('confirm.delete'),
      cancelLabel: t('confirm.cancel'),
      variant: 'danger',
      onConfirm: () => { closeConfirm(); doDeleteSession(sessionIdToDelete); if (sessions.length <= 1) setActiveTab('world'); },
    });
  };

  const clearAllSessions = () => {
    showConfirm({
      title: t('confirm.deleteAll'),
      message: t('confirm.deleteAllMsg'),
      confirmLabel: t('confirm.deleteAllConfirm'),
      cancelLabel: t('confirm.cancel'),
      variant: 'danger',
      onConfirm: () => { closeConfirm(); doClearAllSessions(); setActiveTab('world'); },
    });
  };

  const {
    exportTXT, exportJSON, exportAllJSON, handleImportJSON,
    handlePrint, handleExportEPUB, handleExportDOCX,
    exportProjectJSON, exportAllEpisodesTXT, exportMarkdown,
  } = useStudioExport({
    currentSession, sessions, currentSessionId,
    currentProjectId, projects, setProjects, setCurrentProjectId,
    setSessions, setCurrentSessionId, setActiveTab,
    isKO, language, writingMode, editDraft,
  });

  const startRename = (sessionId: string, currentTitle: string) => {
    setRenamingSessionId(sessionId);
    setRenameValue(currentTitle);
  };
  const confirmRename = () => {
    if (!renamingSessionId || !renameValue.trim()) return;
    setSessions(prev => prev.map(s =>
      s.id === renamingSessionId ? { ...s, title: renameValue.trim() } : s
    ));
    setRenamingSessionId(null);
    setRenameValue('');
  };

  const handleReorderSessions = useCallback((fromIndex: number, toIndex: number) => {
    setSessions(prev => {
      const sorted = [...prev].sort((a, b) => a.lastUpdate - b.lastUpdate);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      return sorted.map((s, i) => ({ ...s, lastUpdate: i + 1 }));
    });
  }, [setSessions]);

  const filteredMessages = currentSession?.messages.filter(m =>
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  const searchMatchesEditDraft = searchQuery && editDraft && editDraft.toLowerCase().includes(searchQuery.toLowerCase());

  const handleVersionSwitch = useCallback((messageId: string, versionIndex: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;
      const msgs = s.messages.map(m => {
        if (m.id !== messageId || !m.versions) return m;
        const content = m.versions[versionIndex];
        if (content == null) return m;
        return { ...m, content, currentVersionIndex: versionIndex };
      });
      return { ...s, messages: msgs };
    }));
  }, [currentSessionId, setSessions]);

  const handleTypoFix = useCallback((messageId: string, index: number, original: string, suggestion: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;
      const msgs = s.messages.map(m => {
        if (m.id !== messageId) return m;
        const fixed = m.content.slice(0, index) + suggestion + m.content.slice(index + original.length);
        return { ...m, content: fixed };
      });
      return { ...s, messages: msgs };
    }));
  }, [currentSessionId, setSessions]);

  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  useStudioKeyboard({
    onTabChange: handleTabChange,
    onToggleSearch: () => setShowSearch(prev => !prev),
    onExportTXT: exportTXT,
    onPrint: handlePrint,
    onNewSession: createNewSession,
    onToggleFocus: () => setFocusMode(prev => !prev),
    onToggleShortcuts: () => setShowShortcuts(prev => !prev),
    onSave: triggerSave,
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
      if (saveSlotModalOpen) { setSaveSlotModalOpen(false); return; }
      if (moveModal) { setMoveModal(null); return; }
      if (showQuickStartModal) { setShowQuickStartModal(false); return; }
      if (showGlobalSearch) { setShowGlobalSearch(false); setGlobalSearchQuery(''); return; }
    },
    onGlobalSearch: () => setShowGlobalSearch(prev => !prev),
    disabled: showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen,
  });

  const {
    isGenerating, lastReport, directorReport, handleCancel,
    handleSend: doHandleSend, handleRegenerate,
  } = useStudioAI({
    currentSession, currentSessionId, setSessions, updateCurrentSession,
    hfcpState, promptDirective, language, canvasPass,
    setCanvasContent, setWritingMode, setShowApiKeyModal, setUxError,
    advancedOutputMode: advancedSettings.outputMode,
    onSuggestionsUpdate: (newSugs) => setSuggestions(prev => [...newSugs, ...prev.filter(s => s.dismissed)]),
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
    setConfig({ ...currentSession.config, episode: nextEp });
  };

  const writingColumnShell = writingMode === 'edit'
    ? 'w-full px-4 md:px-6 lg:px-8'
    : 'max-w-6xl w-full mx-auto px-4 md:px-8 lg:px-12';
  const writingInputDockOffset = activeTab === 'writing' && !showDashboard
    ? (writingMode === 'ai'
        ? (rightPanelOpen ? 'lg:pr-80' : 'lg:pr-10')
        : 'lg:pr-64')
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

  // IDENTITY_SEAL: PART-4 | role=callbacks-derived | inputs=state | outputs=handlers+derived-values

  // ============================================================
  // PART 5 — Render
  // ============================================================
  return (
    <ErrorBoundary variant="section" language={isKO ? 'KO' : 'EN'}>
    <StudioConfigProvider value={studioConfigValue}>
    <StudioUIProvider value={studioUIValue}>
    <div
      className="flex h-screen overflow-hidden transition-colors duration-300 bg-bg-primary text-text-primary"
      data-testid="studio-content"
      data-theme={(['', 'dim', 'light', 'max'] as const)[themeLevel] || ''}
    >
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} language={language} mode={studioMode} />

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

      <StudioSidebar
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
        exportAllJSON={exportAllJSON}
        handleExportEPUB={handleExportEPUB}
        handleExportDOCX={handleExportDOCX}
        exportProjectJSON={exportProjectJSON}
        exportAllEpisodesTXT={exportAllEpisodesTXT}
        exportMarkdown={exportMarkdown}
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
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-[60] items-center justify-center w-7 h-20 bg-bg-secondary border border-border border-l-0 rounded-r-xl text-text-tertiary hover:text-accent-purple hover:bg-bg-tertiary transition-all shadow-lg cursor-pointer"
          title={language === 'KO' ? '\uC0AC\uC774\uB4DC\uBC14 \uC5F4\uAE30' : 'Open sidebar'}
        >
          <span className="text-xs font-bold">{'\u25B6'}</span>
        </button>
      )}

      <StudioMainContent
        focusMode={focusMode} setFocusMode={setFocusMode}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        themeLevel={themeLevel} toggleTheme={toggleTheme}
        showSearch={showSearch} setShowSearch={setShowSearch}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts}
        showGlobalSearch={showGlobalSearch} setShowGlobalSearch={setShowGlobalSearch}
        globalSearchQuery={globalSearchQuery} setGlobalSearchQuery={setGlobalSearchQuery}
        activeTab={activeTab} handleTabChange={handleTabChange} setActiveTab={setActiveTab}
        currentSession={currentSession} currentSessionId={currentSessionId}
        currentProjectId={currentProjectId} currentProject={currentProject}
        sessions={sessions} projects={projects}
        setCurrentSessionId={setCurrentSessionId} setCurrentProjectId={setCurrentProjectId}
        hydrated={hydrated}
        setConfig={setConfig} updateCurrentSession={updateCurrentSession}
        writingMode={writingMode} setWritingMode={setWritingMode}
        editDraft={editDraft} setEditDraft={setEditDraft} editDraftRef={editDraftRef}
        canvasContent={canvasContent} setCanvasContent={setCanvasContent}
        canvasPass={canvasPass} setCanvasPass={setCanvasPass}
        promptDirective={promptDirective} setPromptDirective={setPromptDirective}
        advancedSettings={advancedSettings} setAdvancedSettings={setAdvancedSettings}
        isGenerating={isGenerating} lastReport={lastReport} directorReport={directorReport}
        handleSend={handleSend} doHandleSend={doHandleSend}
        handleCancel={handleCancel} handleRegenerate={handleRegenerate}
        handleVersionSwitch={handleVersionSwitch} handleTypoFix={handleTypoFix}
        hfcpState={hfcpState}
        input={input} setInput={setInput}
        showDashboard={showDashboard} setShowDashboard={setShowDashboard}
        rightPanelOpen={rightPanelOpen} setRightPanelOpen={setRightPanelOpen}
        showAiLock={showAiLock} hasAiAccess={hasAiAccess}
        aiCapabilitiesLoaded={aiCapabilitiesLoaded}
        bannerDismissed={bannerDismissed} setBannerDismissed={setBannerDismissed}
        showApiKeyModal={showApiKeyModal} setShowApiKeyModal={setShowApiKeyModal}
        showQuickStartLock={showQuickStartLock} hostedProviders={hostedProviders as Record<string, boolean>}
        saveFlash={saveFlash} lastSaveTime={lastSaveTime} triggerSave={triggerSave}
        setUxError={setUxError} messagesEndRef={messagesEndRef}
        filteredMessages={filteredMessages} searchMatchesEditDraft={searchMatchesEditDraft}
        writingColumnShell={writingColumnShell} writingInputDockOffset={writingInputDockOffset}
        apiBannerMessage={apiBannerMessage} apiSetupLabel={apiSetupLabel}
        language={language} isKO={isKO}
        archiveScope={archiveScope} setArchiveScope={setArchiveScope}
        archiveFilter={archiveFilter} setArchiveFilter={setArchiveFilter}
        charSubTab={charSubTab} setCharSubTab={setCharSubTab}
        createNewSession={createNewSession} createDemoSession={createDemoSession}
        openQuickStart={openQuickStart}
        startRename={startRename} renamingSessionId={renamingSessionId}
        setRenamingSessionId={setRenamingSessionId}
        renameValue={renameValue} setRenameValue={setRenameValue}
        confirmRename={confirmRename}
        moveSessionToProject={moveSessionToProject}
        deleteSession={deleteSession} handleNextEpisode={handleNextEpisode}
        handlePrint={handlePrint}
        versionedBackups={versionedBackups} doRestoreVersionedBackup={doRestoreVersionedBackup}
        refreshBackupList={refreshBackupList}
        clearAllSessions={clearAllSessions}
      >
        {/* Right panels injected as children */}
        {currentSession && (
          <StudioSaveSlotPanel
            currentSession={currentSession}
            activeTab={activeTab}
            language={language}
            rightPanelOpen={rightPanelOpen}
            setRightPanelOpen={setRightPanelOpen}
            writingMode={writingMode}
            showDashboard={showDashboard}
            updateCurrentSession={updateCurrentSession}
            triggerSave={triggerSave}
            setSaveSlotModalOpen={setSaveSlotModalOpen}
            setSaveSlotName={setSaveSlotName}
          />
        )}
        {activeTab === 'writing' && writingMode === 'ai' && currentSession && !showDashboard && (
          <StudioWritingAssistantPanel
            currentSession={currentSession}
            language={language}
            rightPanelOpen={rightPanelOpen}
            setRightPanelOpen={setRightPanelOpen}
            setActiveTab={setActiveTab}
            setConfig={setConfig}
            writingMode={writingMode}
            showDashboard={showDashboard}
            directorReport={directorReport}
            hfcpState={hfcpState}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            pipelineResult={pipelineResult}
            hostedProviders={hostedProviders}
          />
        )}
      </StudioMainContent>

      <QuickStartModal
        language={language}
        isOpen={showQuickStartModal}
        onClose={() => setShowQuickStartModal(false)}
        onStart={handleQuickStart}
        isGenerating={isQuickGenerating}
      />

      {showApiKeyModal && (
        <ApiKeyModal
          language={language}
          hostedProviders={hostedProviders}
          onClose={() => { setShowApiKeyModal(false); setApiKeyVersion(v => v + 1); }}
          onSave={() => setApiKeyVersion(v => v + 1)}
        />
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      {moveModal && <MoveSessionModal data={moveModal} language={language} onMove={moveSessionToProject} onClose={() => setMoveModal(null)} />}

      {saveSlotModalOpen && <SaveSlotModal language={language} activeTab={activeTab} config={currentSession?.config}
        onSave={(slot) => {
          updateCurrentSession({ config: { ...(currentSession?.config || INITIAL_CONFIG), savedSlots: [...(currentSession?.config.savedSlots || []), slot] } });
          triggerSave();
        }}
        onClose={() => setSaveSlotModalOpen(false)} />}

      <StudioToasts
        language={language} isKO={isKO}
        showSyncReminder={showSyncReminder} setShowSyncReminder={setShowSyncReminder}
        user={user} lastSyncTime={lastSyncTime} handleSync={handleSync} signInWithGoogle={signInWithGoogle}
        storageFull={storageFull} setStorageFull={setStorageFull} exportAllJSON={exportAllJSON}
        fallbackNotice={fallbackNotice} setFallbackNotice={setFallbackNotice}
        exportDoneFormat={exportDoneFormat}
        worldImportBanner={worldImportBanner} setWorldImportBanner={setWorldImportBanner}
        uxError={uxError} setUxError={setUxError}
      />
      {alertToast && (
        <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 max-w-md text-sm ${
          alertToast.variant === 'error' ? 'bg-red-900/95 border border-red-600 text-red-100'
          : alertToast.variant === 'info' ? 'bg-blue-900/95 border border-blue-600 text-blue-100'
          : 'bg-amber-900/95 border border-amber-600 text-amber-100'
        }`}>
          <span>{alertToast.variant === 'error' ? '\u274C' : alertToast.variant === 'info' ? '\u2139\uFE0F' : '\u26A0\uFE0F'} {alertToast.message}</span>
          <button onClick={() => setAlertToast(null)} className="ml-2 opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}
    </div>
    </StudioUIProvider>
    </StudioConfigProvider>
    </ErrorBoundary>
  );
}

// IDENTITY_SEAL: PART-5 | role=render | inputs=all-state | outputs=JSX(full-layout)
