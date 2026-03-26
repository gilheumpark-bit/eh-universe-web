"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Send,
  Sparkles, Menu, Globe,
  Ghost, X, PenTool, StopCircle,
  Upload, Edit3, Search, Maximize2, Minimize2, Printer, Keyboard, Sun, Moon,
  Key
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Message, StoryConfig, Genre,
  AppLanguage, AppTab,
  ChatSession, Project
} from '@/lib/studio-types';
import { TRANSLATIONS, ENGINE_VERSION } from '@/lib/studio-constants';
import { createT } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { useAuth } from '@/lib/AuthContext';
import { createHFCPState, type HFCPState as HFCPStateType } from '@/engine/hfcp';
// EngineReport type inferred from useStudioAI hook return
import ChatMessage from '@/components/studio/ChatMessage';
import { WritingToolbar } from '@/components/studio/WritingToolbar';
import CharacterTab from '@/components/studio/tabs/CharacterTab';
import SettingsView from '@/components/studio/SettingsView';
import EngineDashboard from '@/components/studio/EngineDashboard';
import EngineStatusBar from '@/components/studio/EngineStatusBar';
import ApiKeyModal from '@/components/studio/ApiKeyModal';
import ManuscriptTab from '@/components/studio/tabs/ManuscriptTab';
import { ErrorBoundary } from '@/components/studio/ErrorBoundary';
import MobileTabBar from '@/components/studio/MobileTabBar';
// generateStoryStream, exportEPUB, exportDOCX → moved to useStudioAI / useStudioExport hooks
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
import WorldTab from '@/components/studio/tabs/WorldTab';
// WorldStudioView는 WorldTab 내부에서 import됨
const SceneSheet = dynamic(() => import('@/components/studio/SceneSheet'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading Scene Sheet...</div> });
import StyleTab from '@/components/studio/tabs/StyleTab';
// StyleStudioView는 StyleTab 내부에서 import됨
const VersionDiff = dynamic(() => import('@/components/studio/VersionDiff'), { ssr: false });
const TypoPanel = dynamic(() => import('@/components/studio/TypoPanel'), { ssr: false });
const TabAssistant = dynamic(() => import('@/components/studio/TabAssistant'), { ssr: false });
const EpisodeScenePanel = dynamic(() => import('@/components/studio/EpisodeScenePanel'), { ssr: false });
const OnboardingGuide = dynamic(() => import('@/components/studio/OnboardingGuide'), { ssr: false });
const StudioDocsView = dynamic(() => import('@/components/studio/StudioDocsView'), { ssr: false });
const InlineRewriter = dynamic(() => import('@/components/studio/InlineRewriter'), { ssr: false });
const EditReferencePanel = dynamic(() => import('@/components/studio/EditReferencePanel'), { ssr: false });
const AutoRefiner = dynamic(() => import('@/components/studio/AutoRefiner'), { ssr: false });
// ItemStudioView는 CharacterTab 내부에서 import됨
const GenreReviewChat = dynamic(() => import('@/components/studio/GenreReviewChat'), { ssr: false });
const VisualTab = dynamic(() => import('@/components/studio/tabs/VisualTab'), { ssr: false });
const HistoryTab = dynamic(() => import('@/components/studio/tabs/HistoryTab'), { ssr: false });
const RulebookTab = dynamic(() => import('@/components/studio/tabs/RulebookTab'), { ssr: false });
const WritingTabInline = dynamic(() => import('@/components/studio/tabs/WritingTabInline'), { ssr: false });
const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false });
const SuggestionPanel = dynamic(() => import('@/components/studio/SuggestionPanel'), { ssr: false });
const PipelineProgress = dynamic(() => import('@/components/studio/PipelineProgress'), { ssr: false });
const AdvancedWritingPanel = dynamic(() => import('@/components/studio/AdvancedWritingPanel'), { ssr: false });
const QuickStartModal = dynamic(() => import('@/components/studio/QuickStartModal'), { ssr: false });
import { generateWorldDesign, generateCharacters } from '@/services/geminiService';
import { Wand2 } from 'lucide-react';
import { setDriveEncryptionKey } from '@/services/driveService';
import { ConfirmModal, useUnsavedWarning } from '@/components/studio/UXHelpers';
import StudioToasts from '@/components/studio/StudioToasts';
import { ShortcutsModal, MoveSessionModal, SaveSlotModal } from '@/components/studio/StudioModals';
import DirectorPanel from '@/components/studio/DirectorPanel';
// analyzeManuscript + DirectorReport → moved to useStudioAI hook
import { getApiKey, getActiveProvider, type ProviderId } from '@/lib/ai-providers';
import StudioSidebar from '@/components/studio/StudioSidebar';

type HostedAiAvailability = Partial<Record<ProviderId, boolean>>;
const PROVIDER_IDS: ProviderId[] = ['gemini', 'openai', 'claude', 'groq', 'mistral'];

export default function StudioPage() {
  // ============================================================
  // PROJECT-BASED STATE MANAGEMENT (extracted to hook)
  // ============================================================
  const { lang } = useLang();
  const searchParams = useSearchParams();
  const studioRouter = useRouter();
  const [worldImportBanner, setWorldImportBanner] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const map: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', jp: 'JP', cn: 'CN' };
    return map[lang] || 'KO';
  });

  // Sync studio language when global lang changes (e.g. header toggle)
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
  } = pm;

  const [activeTab, setActiveTab] = useState<AppTab>('world');
  const [charSubTab, setCharSubTab] = useState<'characters' | 'items'>('characters');
  const [studioMode, setStudioMode] = useState<'guided' | 'free'>(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('noa_studio_mode');
      // 이전 버그로 'api'/'manual'이 저장된 경우 → 'free'로 복구
      if (raw === 'guided' || raw === 'free') return raw;
      if (raw) localStorage.setItem('noa_studio_mode', 'free');
      return raw ? 'free' : 'guided';
    }
    return 'guided';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyVersion, setApiKeyVersion] = useState(0);
  const [showDashboard, setShowDashboard] = useState(false);
  const [hostedProviders, setHostedProviders] = useState<HostedAiAvailability>({});
  const [aiCapabilitiesLoaded, setAiCapabilitiesLoaded] = useState(false);

  const [showQuickStartModal, setShowQuickStartModal] = useState(false);
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tObj = TRANSLATIONS[language] || TRANSLATIONS['KO'];
  const t = createT(language);
  const isKO = language === 'KO';

  // API 키 존재 여부 (렌더링용, hydrated 이후만 체크, apiKeyVersion으로 갱신 트리거)
  const activeProviderId = getActiveProvider();
  const hasLocalApiKey = hydrated && (apiKeyVersion >= 0) && !!getApiKey(activeProviderId);
  const hasAiAccess = hydrated && (hasLocalApiKey || Boolean(hostedProviders[activeProviderId]));
  const hasQuickStartAccess = hydrated && (!!getApiKey('gemini') || Boolean(hostedProviders.gemini));
  const showAiLock = aiCapabilitiesLoaded && !hasAiAccess;
  const showQuickStartLock = aiCapabilitiesLoaded && !hasQuickStartAccess;
  const apiBannerMessage = Boolean(hostedProviders[activeProviderId])
    ? (isKO
      ? '기본 AI가 준비되어 있어요. 바로 써보고, 원하면 개인 키를 추가하세요.'
      : 'Base AI is ready. Start now, and add your own key anytime.')
    : t('ui.apiKeyBanner');
  const apiSetupLabel = Boolean(hostedProviders[activeProviderId])
    ? (isKO ? '개인 키 추가' : 'Add Key')
    : t('ui.apiKeySetUp');

  // UX feature states — useStudioTheme 훅
  const {
    themeLevel, lightTheme, toggleTheme,
    focusMode, setFocusMode,
    showShortcuts, setShowShortcuts,
    showSearch, setShowSearch,
    searchQuery, setSearchQuery,
  } = useStudioTheme();
  // renamingSessionId, renameValue → useStudioSession에서 제공
  const [archiveFilter, setArchiveFilter] = useState<string>('ALL');
  const [archiveScope, setArchiveScope] = useState<'project' | 'all'>('project');
  const [moveModal, setMoveModal] = useState<{ sessionId: string; others: Project[] } | null>(null);
  const { user, signInWithGoogle, signOut, isConfigured: authConfigured, accessToken, refreshAccessToken } = useAuth();

  // Drive 암호화 키 설정 (user UID 기반 AES-GCM)
  useEffect(() => {
    if (user?.uid) setDriveEncryptionKey(user.uid);
  }, [user?.uid]);

  // UX: unsaved changes warning (moved after useStudioAI to avoid TDZ)
  // see useUnsavedWarning call below useStudioAI

  // UX 상태 (토스트/알림/확인 모달) — useStudioUX 훅으로 추출
  const {
    uxError, setUxError,
    storageFull, setStorageFull,
    exportDoneFormat,
    lastSaveTime, saveFlash, triggerSave,
    fallbackNotice, setFallbackNotice,
    confirmState, showConfirm, closeConfirm,
  } = useStudioUX();

  // UX: alert() 대체 토스트 수신
  const [alertToast, setAlertToast] = useState<{ message: string; variant: string } | null>(null);

  // 3.8 자율 시스템 상태
  const [suggestions, setSuggestions] = useState<import('@/lib/studio-types').ProactiveSuggestion[]>([]);
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

  // Hydration-safe: sidebar width
  useEffect(() => {
    if (!hydrated) return;
    setIsSidebarOpen(window.innerWidth >= 768);
    // lightTheme은 useStudioTheme 내부에서 localStorage 로드
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
        console.warn('[AI] Capability check failed', error);
        if (!cancelled) {
          setHostedProviders({});
        }
      } finally {
        if (!cancelled) {
          setAiCapabilitiesLoaded(true);
        }
      }
    };

    void loadCapabilities();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  // ============================================================
  // WORLD IMPORT FROM NETWORK
  // ============================================================
  useEffect(() => {
    if (!hydrated) return;
    const raw = searchParams.get('worldImport');
    if (!raw) return;
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
        if (!project.sessions.some(session => session.id === importedSessionId)) {
          return project;
        }

        return {
          ...project,
          lastUpdate: Date.now(),
          sessions: project.sessions.map(session =>
            session.id === importedSessionId
              ? {
                  ...session,
                  config: { ...session.config, ...importedConfig },
                  lastUpdate: Date.now(),
                }
              : session,
          ),
        };
      }));
      setActiveTab('world');
      setWorldImportBanner(true);
      setTimeout(() => setWorldImportBanner(false), 5000);
      // Clear query param without full reload
      studioRouter.replace('/studio', { scroll: false });
    } catch {
      // invalid payload — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ?setup=1 → API 키 모달 자동 오픈 (StudioChoiceScreen에서 "API 사용" 선택 시)
  useEffect(() => {
    if (!hydrated) return;
    if (searchParams.get('setup') !== '1') return;
    setShowApiKeyModal(true);
    studioRouter.replace('/studio', { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // API 키 추가/삭제 감지 → 집필 모드(writingMode) 자동 전환
  // NOTE: noa_studio_mode 키는 가이드/자유 모드('guided'/'free')용이므로
  //       여기서 건드리지 않는다. 별도 키(noa_writing_access)에 저장한다.
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

  // confirmState, showConfirm, closeConfirm → useStudioUX에서 제공

  // ============================================================
  // SYNC STATE — useStudioSync 훅으로 추출
  // ============================================================

  const {
    syncStatus, lastSyncTime,
    showSyncReminder, setShowSyncReminder,
    handleSync,
  } = useStudioSync({ user, accessToken, refreshAccessToken, projects, setProjects, setUxError });

  // ============================================================
  // PROJECT MANAGEMENT (confirm-wrapped actions)
  // ============================================================
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t is derived from language (already in deps)
  }, [projects, language, showConfirm, closeConfirm, doDeleteProject]);

  const [hfcpState] = useState<HFCPStateType>(() => createHFCPState());
  // 집필 모드 상태 — useStudioWritingMode 훅으로 추출
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
  // saveFlash, lastSaveTime, triggerSave → useStudioUX에서 제공
  const [saveSlotModalOpen, setSaveSlotModalOpen] = useState(false);
  const [saveSlotName, setSaveSlotName] = useState('');

  // editDraft persist → useStudioWritingMode 내부로 이동

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hydration + auto-save handled by useProjectManager hook

  const messageCount = currentSession?.messages?.length ?? 0;
  // NOTE: scroll effect moved after useStudioAI (needs isGenerating)

  // createNewSession, createDemoSession, rename → useStudioSession 훅
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

  // createDemoSession → useStudioSession에서 제공

  // Quick Start 후 첫 생성을 위한 pending prompt
  const [pendingQuickStartPrompt, setPendingQuickStartPrompt] = useState<string | null>(null);

  const handleQuickStart = async (genre: Genre, userPrompt: string) => {
    if (showQuickStartLock) {
      setShowApiKeyModal(true);
      return;
    }
    setIsQuickGenerating(true);
    try {
      const world = await generateWorldDesign(genre, language, { synopsis: userPrompt });
      const qsConfig: StoryConfig = {
        ...INITIAL_CONFIG,
        title: world.title,
        genre: genre,
        synopsis: world.synopsis,
        povCharacter: world.povCharacter,
        setting: world.setting,
        primaryEmotion: world.primaryEmotion,
        corePremise: world.corePremise,
        powerStructure: world.powerStructure,
        currentConflict: world.currentConflict,
        worldHistory: world.worldHistory || '',
        socialSystem: world.socialSystem || '',
        economy: world.economy || '',
        magicTechSystem: world.magicTechSystem || '',
        factionRelations: world.factionRelations || '',
        survivalEnvironment: world.survivalEnvironment || '',
        culture: world.culture || '',
        religion: world.religion || '',
        education: world.education || '',
        lawOrder: world.lawOrder || '',
        taboo: world.taboo || '',
        dailyLife: world.dailyLife || '',
        travelComm: world.travelComm || '',
        truthVsBeliefs: world.truthVsBeliefs || '',
      };

      const characters = await generateCharacters(qsConfig, language);
      qsConfig.characters = characters;

      // 프로젝트가 없으면 먼저 생성 → 반환된 id로 세션을 직접 연결
      const targetProjectId = currentProjectId || createNewProject();

      // 세션을 프로젝트에 직접 삽입 (setSessions 레이스 방지)
      const newSessionId = `s-${Date.now()}`;
      const newSession: ChatSession = {
        id: newSessionId,
        title: qsConfig.title,
        config: qsConfig,
        messages: [],
        lastUpdate: Date.now(),
      };
      setProjects(prev => prev.map(p =>
        p.id === targetProjectId
          ? { ...p, sessions: [newSession, ...p.sessions], lastUpdate: Date.now() }
          : p,
      ));
      setCurrentSessionId(newSessionId);
      setActiveTab('writing');
      setShowQuickStartModal(false);

      // 3.8 — Auto Pipeline 상태 업데이트 (Quick Start 완료 시)
      setPipelineResult({
        stages: [
          { stage: 'world_check', status: 'passed', duration: 0, warnings: [] },
          { stage: 'character_sync', status: 'passed', duration: 0, warnings: [] },
          { stage: 'direction_setup', status: 'skipped', duration: 0, warnings: [] },
          { stage: 'generation', status: 'running', duration: 0, warnings: [] },
        ],
        finalStatus: 'running',
      });

      // stale closure 방지: pending state에 저장 → useEffect에서 실행
      setPendingQuickStartPrompt(`${userPrompt}\n\n첫 장면을 써줘.`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (/401|api key|not configured/i.test(errorMessage)) {
        setShowApiKeyModal(true);
      } else {
        console.error("Quick Start Failed:", err);
        setUxError({ error: err });
      }
    } finally {
      setIsQuickGenerating(false);
    }
  };

  // P1-2: Quick Start 첫 생성 — 세션 확정 후 실행 (stale closure 제거)
  useEffect(() => {
    if (pendingQuickStartPrompt && currentSessionId && currentSession) {
      doHandleSend(pendingQuickStartPrompt, '', () => {
        // 3.8 — 파이프라인 완료 상태
        setPipelineResult(prev => prev ? { ...prev, finalStatus: 'completed' as const, stages: prev.stages.map(s => ({ ...s, status: s.status === 'skipped' ? 'skipped' as const : 'passed' as const })) } : null);
      });
      setPendingQuickStartPrompt(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuickStartPrompt, currentSessionId, currentSession]);


  const openQuickStart = useCallback(() => {
    if (showQuickStartLock) {
      setShowApiKeyModal(true);
      return;
    }
    setShowQuickStartModal(true);
  }, [showQuickStartLock]);

  const handleTabChange = useCallback((tab: AppTab) => {
    // 수동 편집 중 탭 전환 시 미저장 경고 (같은 탭 재클릭 제외)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is derived from language (already in deps)
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

  // ============================================================
  // EXPORT / IMPORT / RENAME / SEARCH (extracted to hook)
  // ============================================================
  const {
    exportTXT, exportJSON, exportAllJSON, handleImportJSON,
    handlePrint, handleExportEPUB, handleExportDOCX,
  } = useStudioExport({
    currentSession, sessions, currentSessionId,
    currentProjectId, projects, setProjects, setCurrentProjectId,
    setSessions, setCurrentSessionId, setActiveTab,
    isKO, language, writingMode, editDraft,
  });

  // Rename session
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

  // Search filter
  const filteredMessages = currentSession?.messages.filter(m =>
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  const searchMatchesEditDraft = searchQuery && editDraft && editDraft.toLowerCase().includes(searchQuery.toLowerCase());

  // Switch message version
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

  // Apply single typo fix to a message
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

  // Keyboard shortcuts (extracted to hook)
  useStudioKeyboard({
    onTabChange: handleTabChange,
    onToggleSearch: () => setShowSearch(prev => !prev),
    onExportTXT: exportTXT,
    onPrint: handlePrint,
    onNewSession: createNewSession,
    onToggleFocus: () => setFocusMode(prev => !prev),
    onToggleShortcuts: () => setShowShortcuts(prev => !prev),
    disabled: showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen,
  });

  // ============================================================
  // AI STREAMING (extracted to hook)
  // ============================================================
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

  // UX: unsaved changes warning (must be after useStudioAI which provides isGenerating)
  useUnsavedWarning(isGenerating || (writingMode === 'edit' && editDraft.trim().length > 0));

  // Auto-scroll to bottom when generating (moved here — needs isGenerating from useStudioAI)
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

  // edit 모드에서는 전체 폭 활용, 그 외에는 max-w 제한
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
    setConfig,
    projects, hasAiAccess,
    studioMode, setStudioMode,
  };
  const studioUIValue = {
    activeTab, handleTabChange,
    showConfirm, closeConfirm,
    setUxError, triggerSave, saveFlash,
  };

  return (
    <ErrorBoundary language={isKO ? 'KO' : 'EN'}>
    <StudioConfigProvider value={studioConfigValue}>
    <StudioUIProvider value={studioUIValue}>
    <div
      className="flex h-screen overflow-hidden transition-colors duration-300 bg-bg-primary text-text-primary"
      data-theme={(['', 'dim', 'light', 'max'] as const)[themeLevel] || ''}
    >
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      {/* Mobile bottom tab bar */}
      <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} language={language} mode={studioMode} />

      {/* Sidebar */}
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
      />

      {/* Sidebar open toggle (visible when sidebar is closed on desktop) */}
      {!isSidebarOpen && !focusMode && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-[60] items-center justify-center w-7 h-20 bg-bg-secondary border border-border border-l-0 rounded-r-xl text-text-tertiary hover:text-accent-purple hover:bg-bg-tertiary transition-all shadow-lg cursor-pointer"
          title={language === 'KO' ? '사이드바 열기' : 'Open sidebar'}
        >
          <span className="text-xs font-bold">▶</span>
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-bg-primary overflow-hidden">
        {focusMode && (
          <button onClick={() => setFocusMode(false)}
            className="fixed top-2 right-2 z-50 px-2 py-1 bg-bg-secondary/80 border border-border rounded-lg text-[11px] text-text-tertiary hover:text-text-primary transition-all font-[family-name:var(--font-mono)] opacity-30 hover:opacity-100"
            title="F11">
            <Minimize2 className="w-3 h-3 inline mr-1" />{t('ui.exitFocus')}
          </button>
        )}
        <header className={`h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0 ${focusMode ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-bg-secondary rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-text-tertiary" />
            </button>
            <div className="text-sm font-black tracking-tighter uppercase flex items-center gap-2 min-w-0 font-[family-name:var(--font-mono)]">
              <span className="text-text-tertiary hidden sm:inline">{t('sidebar.activeProject')}:</span>
              <span className="text-text-primary truncate">{currentSession?.title || t('engine.noStory')}</span>
              {currentSessionId && <span className={`text-[10px] font-[family-name:var(--font-mono)] transition-all duration-300 ${saveFlash ? 'text-accent-green scale-125 font-black' : 'text-text-tertiary'}`}>✓ {saveFlash ? t('ui.saved') : t('ui.autoSaved')}{lastSaveTime && !saveFlash ? ` · ${Math.max(1, Math.round((Date.now() - lastSaveTime) / 1000))}${isKO ? '초 전' : 's ago'}` : ''}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {currentSession && (
              <div className="flex gap-2 md:gap-4">
                <div className="px-3 py-1 bg-bg-secondary rounded-full text-[10px] font-bold text-text-tertiary border border-border hidden sm:block font-[family-name:var(--font-mono)]">
                  {currentSession.config.genre}
                </div>
                <button
                  onClick={() => setShowDashboard(!showDashboard)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all font-[family-name:var(--font-mono)] ${
                    showDashboard
                      ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/30'
                      : 'bg-accent-purple/10 text-accent-purple border-accent-purple/20 hover:bg-accent-purple/20'
                  }`}
                >
                  ANS {ENGINE_VERSION}
                </button>
              </div>
            )}
            {/* Tool buttons */}
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSearch(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={t('ui.searchCtrlF')} aria-label={t('ui.search')}><Search className="w-4 h-4" /></button>
              <button onClick={() => setFocusMode(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={t('ui.focusMode')} aria-label={t('ui.focusModeLabel')}>{focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
              <button onClick={toggleTheme} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple flex items-center gap-1" title={isKO ? ['다크','딤','라이트','최대'][themeLevel] : ['Dark','Dim','Light','Max'][themeLevel]} aria-label={t('ui.toggleThemeLabel')}>
                {themeLevel === 0 ? <Moon className="w-4 h-4" /> : themeLevel === 1 ? <Sun className="w-4 h-4 opacity-40" /> : themeLevel === 2 ? <Sun className="w-4 h-4 opacity-70" /> : <Sun className="w-4 h-4" />}
                <span className="text-[9px] font-[family-name:var(--font-mono)] hidden md:inline">{isKO ? ['다크','딤','라이트','최대'][themeLevel] : ['D','DM','L','MX'][themeLevel]}</span>
              </button>
              <button onClick={() => setShowShortcuts(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title="Ctrl+/" aria-label={t('ui.keyboardShortcuts')}><Keyboard className="w-4 h-4" /></button>
            </div>
          </div>
        </header>

        {/* Search bar */}
        {showSearch && (
          <div className="px-4 py-2 bg-bg-secondary border-b border-border flex items-center gap-2">
            <Search className="w-4 h-4 text-text-tertiary shrink-0" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('ui.searchMessages')} autoFocus
              className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder-text-tertiary" />
            {searchMatchesEditDraft && (
              <button onClick={() => setWritingMode('edit')} className="text-[11px] text-accent-green font-bold font-[family-name:var(--font-mono)] shrink-0">
                {t('ui.foundInDraft')}
              </button>
            )}
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} aria-label="검색 닫기" className="text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Shortcuts modal */}
        {showShortcuts && <ShortcutsModal language={language} onClose={() => setShowShortcuts(false)} />}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {/* API 키 미설정 안내 배너 */}
            {hydrated && aiCapabilitiesLoaded && !hasAiAccess && !localStorage.getItem('noa_api_banner_dismissed') && (
              <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 bg-amber-900/30 border border-amber-700/40 rounded-xl text-amber-300 text-xs">
                <Key className="w-4 h-4 shrink-0" />
                <span className="flex-1">{apiBannerMessage}</span>
                <button data-testid="btn-api-key" onClick={() => setShowApiKeyModal(true)} className="shrink-0 px-3 py-1 bg-amber-600/30 hover:bg-amber-600/50 rounded-lg text-[10px] font-bold uppercase transition-colors">
                  {apiSetupLabel}
                </button>
                <button onClick={() => { localStorage.setItem('noa_api_banner_dismissed', '1'); window.dispatchEvent(new Event('storage')); }} className="shrink-0 text-amber-500/60 hover:text-amber-300 transition-colors text-sm leading-none" aria-label="Dismiss">
                  ✕
                </button>
              </div>
            )}
            {!currentSessionId && !['settings', 'history', 'rulebook', 'style', 'docs'].includes(activeTab) ? (
              <div className="h-full relative flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                {/* Background gate image */}
                <div className="absolute inset-0 z-0">
                  <Image src="/images/gate-infrastructure-visual.jpg" alt="" fill priority={true} className="object-cover opacity-20" style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
                </div>
                {/* Noise overlay matching landing */}
                <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
                {/* Content — Onboarding or Quick Start */}
                <div className="relative z-10 flex flex-col items-center w-full">
                  <OnboardingGuide
                    lang={language}
                    onComplete={() => { window.dispatchEvent(new Event('storage')); }}
                    onNavigate={(tab) => { createNewSession(tab as AppTab); }}
                    onQuickStart={openQuickStart}
                    onDemo={createDemoSession}
                    showQuickStartLock={showQuickStartLock}
                  />
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'world' && currentSession && (
                  <WorldTab
                    language={language} config={currentSession.config} setConfig={setConfig}
                    onStart={() => setActiveTab('writing')} onSave={triggerSave} saveFlash={saveFlash}
                    updateCurrentSession={updateCurrentSession} currentSessionId={currentSessionId}
                    hostedProviders={hostedProviders}
                  />
                )}
                {activeTab === 'characters' && currentSession && (
                  <CharacterTab
                    language={language} config={currentSession.config} setConfig={setConfig}
                    charSubTab={charSubTab} setCharSubTab={setCharSubTab}
                    triggerSave={triggerSave} saveFlash={saveFlash}
                    setUxError={setUxError} showAiLock={showAiLock} hostedProviders={hostedProviders}
                  />
                )}
                {activeTab === 'settings' && (
                  <SettingsView language={language} hostedProviders={hostedProviders} onClearAll={clearAllSessions} onManageApiKey={() => setShowApiKeyModal(true)} />
                )}
                {/* world studio (design/simulator/analysis) rendered above */}
                {activeTab === 'rulebook' && currentSession && (
                  <RulebookTab
                    language={language}
                    config={currentSession.config}
                    updateCurrentSession={updateCurrentSession}
                    triggerSave={triggerSave}
                    saveFlash={saveFlash}
                    currentSessionId={currentSessionId}
                    showAiLock={showAiLock}
                    hostedProviders={hostedProviders}
                  />
                )}
                {activeTab === 'writing' && currentSession && (
                  <WritingTabInline
                    language={language} currentSession={currentSession} currentSessionId={currentSessionId}
                    updateCurrentSession={updateCurrentSession} setConfig={setConfig}
                    writingMode={writingMode} setWritingMode={setWritingMode}
                    editDraft={editDraft} setEditDraft={setEditDraft} editDraftRef={editDraftRef}
                    canvasContent={canvasContent} setCanvasContent={setCanvasContent}
                    canvasPass={canvasPass} setCanvasPass={setCanvasPass}
                    promptDirective={promptDirective} setPromptDirective={setPromptDirective}
                    isGenerating={isGenerating} lastReport={lastReport}
                    handleSend={doHandleSend} handleCancel={handleCancel}
                    handleRegenerate={handleRegenerate} handleVersionSwitch={handleVersionSwitch}
                    handleTypoFix={handleTypoFix} messagesEndRef={messagesEndRef}
                    searchQuery={searchQuery} filteredMessages={filteredMessages}
                    hasApiKey={hasAiAccess} setShowApiKeyModal={setShowApiKeyModal}
                    setActiveTab={setActiveTab}
                    advancedSettings={advancedSettings} setAdvancedSettings={setAdvancedSettings}
                    advancedOutputMode={advancedSettings.outputMode} setAdvancedOutputMode={(m: string) => setAdvancedSettings({ ...advancedSettings, outputMode: m as typeof advancedSettings.outputMode })}
                    showDashboard={showDashboard}
                    rightPanelOpen={rightPanelOpen} setRightPanelOpen={setRightPanelOpen}
                    directorReport={directorReport} hfcpState={hfcpState}
                    handleNextEpisode={handleNextEpisode}
                    showAiLock={showAiLock} hostedProviders={hostedProviders}
                    saveFlash={saveFlash} triggerSave={triggerSave}
                    writingColumnShell={writingColumnShell}
                    input={input} setInput={setInput}
                  />
                )}
                {activeTab === 'style' && currentSession && (
                  <StyleTab
                    language={language} config={currentSession.config}
                    updateCurrentSession={updateCurrentSession}
                    triggerSave={triggerSave} saveFlash={saveFlash}
                    showAiLock={showAiLock} hostedProviders={hostedProviders}
                  />
                )}
                {activeTab === 'manuscript' && currentSession && (
                  <ManuscriptTab
                    language={language} config={currentSession.config} setConfig={setConfig}
                    messages={currentSession.messages}
                    onEditInStudio={(content) => { setEditDraft(content); setWritingMode('edit'); setActiveTab('writing'); }}
                  />
                )}
                {activeTab === 'history' && (
                  <HistoryTab
                    language={language}
                    archiveScope={archiveScope}
                    setArchiveScope={setArchiveScope}
                    archiveFilter={archiveFilter}
                    setArchiveFilter={setArchiveFilter}
                    projects={projects}
                    sessions={sessions}
                    currentProject={currentProject}
                    currentProjectId={currentProjectId}
                    setCurrentProjectId={setCurrentProjectId}
                    currentSessionId={currentSessionId}
                    setCurrentSessionId={setCurrentSessionId}
                    setActiveTab={setActiveTab}
                    startRename={startRename}
                    renamingSessionId={renamingSessionId}
                    setRenamingSessionId={setRenamingSessionId}
                    renameValue={renameValue}
                    setRenameValue={setRenameValue}
                    confirmRename={confirmRename}
                    moveSessionToProject={moveSessionToProject}
                    handlePrint={handlePrint}
                    deleteSession={deleteSession}
                    currentSession={currentSession}
                  />
                )}
                {activeTab === 'docs' && (
                  <StudioDocsView lang={language} />
                )}
                {activeTab === 'visual' && currentSession && (
                  <VisualTab config={currentSession.config} setConfig={setConfig} currentSession={currentSession} language={language} />
                )}
              </>
            )}
          </div>

          {showDashboard && activeTab === 'writing' && currentSession && !showAiLock && (
            <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
          )}

          {/* 수동 모드 설정 참조 패널 → EditReferencePanel로 통합됨 (edit 모드 내부에 배치) */}

          {/* Right Panel — Save Slots (all tabs except writing) */}
          {activeTab !== 'history' && activeTab !== 'settings' && activeTab !== 'manuscript' && !(activeTab === 'writing' && writingMode === 'ai' && !showDashboard) && currentSession && (
            <aside className={`hidden lg:flex shrink-0 flex-col border-l border-border bg-bg-primary transition-all duration-300 ${rightPanelOpen ? 'w-64' : 'w-8'}`}>
              <button onClick={() => setRightPanelOpen(p => !p)} className="w-full py-2 text-[10px] text-text-tertiary hover:text-text-primary transition-colors border-b border-border font-[family-name:var(--font-mono)]">
                {rightPanelOpen ? '▶' : '◀'}
              </button>
              {!rightPanelOpen ? null : (
              <div className="p-4 space-y-3">
                <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-[family-name:var(--font-mono)]">
                  📂 {t('saveSlot.savedVersions')}
                </div>

                {/* Save current */}
                <button onClick={() => {
                  setSaveSlotName('');
                  setSaveSlotModalOpen(true);
                }}
                  className="w-full py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity active:scale-95">
                  💾 {t('saveSlot.saveCurrent')}
                </button>

                {/* Saved slots list */}
                <div className="space-y-1.5">
                  {(currentSession.config.savedSlots || [])
                    .filter(s => s.tab === activeTab || s.tab === 'all')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 px-2 py-2 bg-bg-secondary/50 border border-border rounded-lg group hover:border-accent-purple/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-text-primary truncate">{slot.name}</div>
                          <div className="text-[10px] text-text-tertiary">{new Date(slot.timestamp).toLocaleString()}</div>
                        </div>
                        <button onClick={() => {
                          if (!confirm(`"${slot.name}"${t('confirm.loadSlotMsg')}`)) return;
                          // INITIAL_CONFIG를 베이스로 슬롯 데이터로 완전 교체 (부분 덮어쓰기 방지)
                          // savedSlots/manuscripts는 현재 세션 것을 유지
                          updateCurrentSession({ config: { ...INITIAL_CONFIG, ...slot.data, savedSlots: currentSession.config.savedSlots, manuscripts: currentSession.config.manuscripts } });
                          triggerSave();
                        }}
                          className="px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-[10px] font-bold hover:bg-accent-purple/20 transition-colors opacity-0 group-hover:opacity-100">
                          {t('saveSlot.load')}
                        </button>
                        <button onClick={() => {
                          updateCurrentSession({
                            config: {
                              ...currentSession.config,
                              savedSlots: (currentSession.config.savedSlots || []).filter(s => s.id !== slot.id),
                            },
                          });
                        }}
                          className="text-text-tertiary hover:text-accent-red text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                          ✕
                        </button>
                      </div>
                    ))}
                  {(currentSession.config.savedSlots || []).filter(s => s.tab === activeTab || s.tab === 'all').length === 0 && (
                    <p className="text-[11px] text-text-tertiary italic text-center py-4">
                      {t('saveSlot.noSavedVersions')}
                    </p>
                  )}
                </div>

                {/* All slots across tabs */}
                {(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).length > 0 && (
                  <details className="group">
                    <summary className="text-[11px] text-text-tertiary cursor-pointer hover:text-text-secondary">
                      {t('saveSlot.otherTabs')} ({(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).length})
                    </summary>
                    <div className="mt-1 space-y-1">
                      {(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).map(slot => (
                        <div key={slot.id} className="text-[10px] text-text-tertiary px-2 py-1 bg-bg-primary rounded">
                          [{slot.tab}] {slot.name}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              )}
            </aside>
          )}

          {/* Right Panel — Writing Assistant + AI Chat */}
          {activeTab === 'writing' && writingMode === 'ai' && currentSession && !showDashboard && (
            <aside className={`hidden lg:flex shrink-0 flex-col border-l border-border bg-bg-primary transition-all duration-300 ${rightPanelOpen ? 'w-80' : 'w-10'}`}>
              {/* Toggle button */}
              <button onClick={() => setRightPanelOpen(p => !p)} className="w-full py-2 text-[10px] text-text-tertiary hover:text-text-primary transition-colors border-b border-border font-[family-name:var(--font-mono)]">
                {rightPanelOpen ? '▶' : '◀'}
              </button>

              {rightPanelOpen && (
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  {/* 대화 히스토리 (최신 제외한 이전 메시지) */}
                  {currentSession.messages.length > 2 && (
                    <div className="p-3 border-b border-border max-h-[40vh] overflow-y-auto">
                      <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest font-[family-name:var(--font-mono)] mb-2">
                        💬 {language === 'KO' ? '대화 히스토리' : 'Chat History'} ({currentSession.messages.length - 2})
                      </div>
                      <div className="space-y-2">
                        {currentSession.messages.slice(0, -2).map(msg => (
                          <div key={msg.id} className={`text-[10px] leading-relaxed px-2 py-1.5 rounded-lg ${
                            msg.role === 'user' ? 'bg-bg-tertiary/50 text-zinc-400' : 'text-zinc-500'
                          }`}>
                            <span className="font-bold text-[9px] uppercase">{msg.role === 'user' ? '🧑' : '🤖'}</span>{' '}
                            {msg.content.slice(0, 120)}{msg.content.length > 120 ? '...' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 도우미 섹션 */}
                  <div className="p-4 space-y-3 border-b border-border min-w-0">
                    <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-[family-name:var(--font-mono)]">
                      {t('panel.reference')}
                    </div>

                    {/* ① 브릿지 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">📎 {t('panel.bridge')}</summary>
                      {(() => {
                        const prev = currentSession.messages.filter(m => m.role === 'assistant' && m.content).slice(-1)[0];
                        const txt = prev?.content.replace(/```(?:json|JSON)?\s*[\s\S]*?```/g, '').replace(/\{\s*\n\s*"(?:grade|metrics|tension|pacing|immersion|eos|active_eh_layer|critique)"[\s\S]*?\n\s*\}/g, '').trim() || '';
                        return <p className="mt-1.5 text-[11px] text-text-tertiary pl-4 italic leading-relaxed break-words overflow-hidden">{txt ? txt.slice(-250) : t('panel.none')}</p>;
                      })()}
                    </details>

                    {/* ② 씬시트 — 미설정 시 자동 open + 경고 표시 */}
                    <details className="group" open={!currentSession.config.sceneDirection}>
                      <summary className={`flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-colors ${
                        currentSession.config.sceneDirection
                          ? 'text-text-tertiary hover:text-text-secondary'
                          : 'text-amber-400 hover:text-amber-300'
                      }`}>🎬 {t('panel.scene')} {!currentSession.config.sceneDirection && <span className="text-[11px] ml-1 px-1.5 py-0.5 bg-amber-500/10 rounded text-amber-400">{t('panel.notSet')}</span>}</summary>
                      <div className="mt-1.5 pl-4 space-y-1 min-w-0">
                        {currentSession.config.sceneDirection?.hooks?.map((h, i) => <div key={i} className="text-[10px] text-blue-400 break-words">🪝 {h.desc}</div>)}
                        {currentSession.config.sceneDirection?.goguma?.map((g, i) => <div key={i} className={`text-[10px] break-words ${g.type === 'goguma' ? 'text-amber-400' : 'text-cyan-400'}`}>{g.type === 'goguma' ? '🍠' : '🥤'} {g.desc}</div>)}
                        {currentSession.config.sceneDirection?.cliffhanger && <div className="text-[10px] text-red-400 break-words">🔚 {currentSession.config.sceneDirection.cliffhanger.desc}</div>}
                        {!currentSession.config.sceneDirection && (
                          <div className="space-y-1.5 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20">
                            <p className="text-[10px] text-amber-300">{t('panel.sceneWarning')}</p>
                            <button onClick={() => setActiveTab('rulebook')} className="text-[10px] text-accent-purple hover:underline font-bold">
                              → {t('panel.setupDirection')}
                            </button>
                          </div>
                        )}
                      </div>
                    </details>

                    {/* ②-B 에피소드 씬시트 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">📋 {t('panel.episodeScenes')} ({(currentSession.config.episodeSceneSheets ?? []).length})</summary>
                      <div className="mt-1.5 pl-2 min-w-0">
                        <EpisodeScenePanel
                          lang={language}
                          currentEpisode={currentSession.config.episode}
                          episodeSceneSheets={currentSession.config.episodeSceneSheets ?? []}
                          onSave={(sheet) => {
                            const existing = currentSession.config.episodeSceneSheets ?? [];
                            const filtered = existing.filter(s => s.episode !== sheet.episode);
                            setConfig({ ...currentSession.config, episodeSceneSheets: [...filtered, sheet].sort((a, b) => a.episode - b.episode) });
                          }}
                          onDelete={(ep) => {
                            setConfig({ ...currentSession.config, episodeSceneSheets: (currentSession.config.episodeSceneSheets ?? []).filter(s => s.episode !== ep) });
                          }}
                          onUpdate={(sheet) => {
                            const existing = currentSession.config.episodeSceneSheets ?? [];
                            const filtered = existing.filter(s => s.episode !== sheet.episode);
                            setConfig({ ...currentSession.config, episodeSceneSheets: [...filtered, sheet].sort((a, b) => a.episode - b.episode) });
                          }}
                        />
                      </div>
                    </details>

                    {/* ③ 캐릭터 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">👤 {t('panel.chars')} ({currentSession.config.characters.length})</summary>
                      <div className="mt-1.5 pl-4 space-y-1.5 min-w-0">
                        {currentSession.config.characters.length > 0 ? currentSession.config.characters.map(c => (
                          <div key={c.id} className="text-[10px] break-words">
                            <span className="font-bold text-text-primary">{c.name}</span> <span className="text-text-tertiary">({c.role})</span>
                            {c.speechStyle && <span className="text-accent-blue ml-1">🗣️{c.speechStyle}</span>}
                          </div>
                        )) : <p className="text-[10px] text-text-tertiary italic">{t('panel.none')}</p>}
                      </div>
                    </details>

                    {/* ④ 서식 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">📐 {t('panel.format')}</summary>
                      <div className="mt-1.5 pl-4 grid grid-cols-2 gap-1">
                        {(tObj.panel?.formatRulesKO as string[] || []).map((r: string, i: number) => (
                          <div key={i} className="text-[11px] text-text-tertiary"><span className="text-accent-green">✓</span> {r}</div>
                        ))}
                      </div>
                    </details>

                    {/* ⑤ 감독 피드백 */}
                    <DirectorPanel report={directorReport} language={language} />

                    {/* ⑤-b 선제 경고 (3.8 Proactive Suggestions) */}
                    {suggestions.length > 0 && (
                      <SuggestionPanel
                        suggestions={suggestions}
                        onDismiss={(id) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, dismissed: true, dismissCount: s.dismissCount + 1 } : s))}
                        language={language}
                      />
                    )}

                    {/* ⑤-c 파이프라인 진행 (3.8 Auto-Pipeline) */}
                    {pipelineResult && (
                      <PipelineProgress
                        stages={pipelineResult.stages}
                        finalStatus={pipelineResult.finalStatus}
                        language={language}
                      />
                    )}

                    {/* ⑥ 대화 온도 */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-text-tertiary">🌡️</span>
                      <span className={`text-xs font-bold ${
                        hfcpState.verdict === 'engagement' ? 'text-accent-green' :
                        hfcpState.verdict === 'normal_free' ? 'text-accent-blue' :
                        hfcpState.verdict === 'normal_analysis' ? 'text-accent-amber' :
                        hfcpState.verdict === 'limited' ? 'text-accent-red' : 'text-text-tertiary'
                      }`}>
                        {({
                          engagement: t('hfcp.engagement'),
                          normal_free: t('hfcp.normalFree'),
                          normal_analysis: t('hfcp.normalAnalysis'),
                          limited: t('hfcp.limited'),
                          silent: t('hfcp.silent'),
                        } as Record<string, string>)[hfcpState.verdict] || hfcpState.verdict}
                      </span>
                      <span className="text-[10px] text-text-tertiary">{Math.round(hfcpState.score)}</span>
                    </div>
                  </div>

                  {/* AI 대화 섹션 */}
                  <div className="p-4 space-y-3">
                    <div className="text-[10px] font-black text-accent-purple uppercase tracking-widest font-[family-name:var(--font-mono)]">
                      💬 {t('panel.aiChat')}
                    </div>
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                      {currentSession.messages.filter(m => {
                        if (m.role === 'user') {
                          const isGen = m.meta?.hfcpMode === 'generate' || m.content.startsWith('[1단계') || m.content.startsWith('[2단계') || m.content.startsWith('[3단계') || m.content.startsWith('[Pass');
                          return !isGen;
                        }
                        return false;
                      }).length === 0 ? (
                        <p className="text-[11px] text-text-tertiary italic text-center py-4">{t('panel.askQuestions')}</p>
                      ) : (
                        currentSession.messages.filter(m => {
                          if (m.role === 'user' && m.meta?.hfcpMode === 'chat') return true;
                          const idx = currentSession.messages.indexOf(m);
                          if (m.role === 'assistant' && idx > 0) {
                            const prev = currentSession.messages[idx - 1];
                            return prev.meta?.hfcpMode === 'chat';
                          }
                          return false;
                        }).slice(-6).map(msg => (
                          <div key={msg.id} className={`text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-accent-purple' : 'text-text-secondary'}`}>
                            <span className="font-bold">{msg.role === 'user' ? '나' : 'NOW'}:</span> {msg.content.slice(0, 200)}{msg.content.length > 200 ? '...' : ''}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* NOW AI 채팅 */}
                  <div className="p-4 border-t border-border">
                    <TabAssistant tab="writing" language={language} config={currentSession.config} hostedProviders={hostedProviders} />
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>

        {/* Writing Input — 수동 모드(미사용)일 때 숨김 */}
        {activeTab === 'writing' && currentSessionId && !showAiLock && (
          <div className={`pb-4 md:pb-6 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pt-8 md:pt-12 shrink-0 transition-[padding] duration-300 ${writingInputDockOffset}`}>
            <div className={`${writingColumnShell} relative`}>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 md:bottom-auto md:-top-10 md:left-4 md:translate-x-0 flex gap-2 items-center">
                <button onClick={() => { if (showAiLock) { setShowApiKeyModal(true); return; } handleSend(t('engine.nextChapterPrompt')); }}
                  className={`px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${showAiLock ? 'opacity-50' : ''}`}
                  title={showAiLock ? (t('ui.apiKeyRequired')) : ''}>
                  {t('engine.nextChapter')}{showAiLock && ' 🔒'}
                </button>
                <button onClick={() => { if (showAiLock) { setShowApiKeyModal(true); return; } handleSend(t('engine.plotTwistPrompt')); }}
                  className={`px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${showAiLock ? 'opacity-50' : ''}`}
                  title={showAiLock ? (t('ui.apiKeyRequired')) : ''}>
                  {t('engine.plotTwist')}{showAiLock && ' 🔒'}
                </button>
                {currentSession && currentSession.config.episode < currentSession.config.totalEpisodes && (
                  <button onClick={handleNextEpisode} className="px-3 py-1.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-[10px] font-bold text-accent-purple hover:bg-accent-purple/20 transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                    EP.{currentSession.config.episode} → {currentSession.config.episode + 1}
                  </button>
                )}
                <span className="text-border">|</span>
                  <button onClick={() => { if (showAiLock) { setShowApiKeyModal(true); return; } setWritingMode('canvas'); setCanvasContent(''); setCanvasPass(0); }}
                    className={`px-3 py-1.5 bg-accent-green/10 border border-accent-green/20 rounded-full text-[10px] font-bold text-accent-green hover:bg-accent-green/20 transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${showAiLock ? 'opacity-50' : ''}`}
                    title={showAiLock ? (t('ui.apiKeyRequired')) : ''}>
                    {showAiLock ? '🔒' : '🎨'} {t('writingMode.openCanvas')}
                  </button>
              </div>
              <div className="relative bg-bg-secondary border border-border rounded-2xl md:rounded-[2rem] shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 md:pl-6 flex items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={showAiLock
                    ? t('writingMode.apiKeyPlaceholder')
                    : t('writing.inputPlaceholder')}
                  className={`flex-1 bg-transparent border-none outline-none py-3 md:py-4 text-sm md:text-[15px] text-text-primary placeholder-text-tertiary resize-none max-h-40 leading-relaxed ${showAiLock ? 'cursor-not-allowed opacity-60' : ''}`}
                  rows={1}
                  disabled={isGenerating || showAiLock}
                />
                {input.length > 0 && (
                  <span className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)] shrink-0 self-center mr-1">
                    {input.length}
                  </span>
                )}
                {isGenerating ? (
                  <button onClick={handleCancel} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-accent-red text-white transition-all shrink-0 hover:opacity-80">
                    <StopCircle className="w-5 h-5" />
                  </button>
                ) : (
                  <button onClick={() => handleSend()} disabled={!input.trim()} className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${input.trim() ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-tertiary'}`}>
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <QuickStartModal 
        language={language}
        isOpen={showQuickStartModal}
        onClose={() => setShowQuickStartModal(false)}
        onStart={handleQuickStart}
        isGenerating={isQuickGenerating}
      />

      {showApiKeyModal && !(hydrated && !localStorage.getItem('noa_onboarding_done')) && (
        <ApiKeyModal
          language={language}
          hostedProviders={hostedProviders}
          onClose={() => { setShowApiKeyModal(false); setApiKeyVersion(v => v + 1); }}
          onSave={() => setApiKeyVersion(v => v + 1)}
        />
      )}

      {/* UX: Confirm Modal */}
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

      {/* Move Session Modal */}
      {moveModal && <MoveSessionModal data={moveModal} language={language} onMove={moveSessionToProject} onClose={() => setMoveModal(null)} />}

      {/* Save Slot Name Modal */}
      {saveSlotModalOpen && <SaveSlotModal language={language} activeTab={activeTab} config={currentSession?.config}
        onSave={(slot) => {
          updateCurrentSession({ config: { ...(currentSession?.config || INITIAL_CONFIG), savedSlots: [...(currentSession?.config.savedSlots || []), slot] } });
          triggerSave();
        }}
        onClose={() => setSaveSlotModalOpen(false)} />}

      {/* UX: All toasts */}
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
          <span>{alertToast.variant === 'error' ? '❌' : alertToast.variant === 'info' ? 'ℹ️' : '⚠️'} {alertToast.message}</span>
          <button onClick={() => setAlertToast(null)} className="ml-2 opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}
    </div>
    </StudioUIProvider>
    </StudioConfigProvider>
    </ErrorBoundary>
  );
}
