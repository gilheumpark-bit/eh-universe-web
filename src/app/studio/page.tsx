"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Settings, Send,
  Sparkles, Menu, Globe, UserCircle,
  Zap, Ghost, X, PenTool, History, StopCircle,
  Download, Upload, Edit3, Search, Maximize2, Minimize2, Printer, Keyboard, Sun, Moon,
  FileType, Key, BookOpen
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
import ResourceView from '@/components/studio/ResourceView';
import SettingsView from '@/components/studio/SettingsView';
import EngineDashboard from '@/components/studio/EngineDashboard';
import EngineStatusBar from '@/components/studio/EngineStatusBar';
import ApiKeyModal from '@/components/studio/ApiKeyModal';
import ManuscriptView from '@/components/studio/ManuscriptView';
import { ErrorBoundary } from '@/components/studio/ErrorBoundary';
import MobileTabBar from '@/components/studio/MobileTabBar';
// generateStoryStream, exportEPUB, exportDOCX → moved to useStudioAI / useStudioExport hooks
import { useProjectManager, INITIAL_CONFIG } from '@/hooks/useProjectManager';
import { useStudioKeyboard } from '@/hooks/useStudioKeyboard';
import { useStudioAI } from '@/hooks/useStudioAI';
import { useStudioExport } from '@/hooks/useStudioExport';
// WorldSimulator loaded by WorldStudioView
// const WorldSimulator = dynamic(() => import('@/components/WorldSimulator'), { ssr: false });
const WorldStudioView = dynamic(() => import('@/components/studio/WorldStudioView'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading World Studio...</div> });
const SceneSheet = dynamic(() => import('@/components/studio/SceneSheet'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading Scene Sheet...</div> });
const StyleStudioView = dynamic(() => import('@/components/studio/StyleStudioView'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading Style Studio...</div> });
const VersionDiff = dynamic(() => import('@/components/studio/VersionDiff'), { ssr: false });
const TypoPanel = dynamic(() => import('@/components/studio/TypoPanel'), { ssr: false });
const TabAssistant = dynamic(() => import('@/components/studio/TabAssistant'), { ssr: false });
const EpisodeScenePanel = dynamic(() => import('@/components/studio/EpisodeScenePanel'), { ssr: false });
const OnboardingGuide = dynamic(() => import('@/components/studio/OnboardingGuide'), { ssr: false });
const StudioDocsView = dynamic(() => import('@/components/studio/StudioDocsView'), { ssr: false });
const InlineRewriter = dynamic(() => import('@/components/studio/InlineRewriter'), { ssr: false });
const AutoRefiner = dynamic(() => import('@/components/studio/AutoRefiner'), { ssr: false });
const ItemStudioView = dynamic(() => import('@/components/studio/ItemStudioView'), { ssr: false });
const GenreReviewChat = dynamic(() => import('@/components/studio/GenreReviewChat'), { ssr: false });
const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false });
const AdvancedWritingPanel = dynamic(() => import('@/components/studio/AdvancedWritingPanel'), { ssr: false });
const QuickStartModal = dynamic(() => import('@/components/studio/QuickStartModal'), { ssr: false });
import { generateWorldDesign, generateCharacters } from '@/services/geminiService';
import Link from 'next/link';
import { FileText, Cloud, CloudOff, Wand2 } from 'lucide-react';
import { syncAllProjects } from '@/services/driveService';
import { ConfirmModal, ErrorToast, useUnsavedWarning } from '@/components/studio/UXHelpers';
import DirectorPanel from '@/components/studio/DirectorPanel';
// analyzeManuscript + DirectorReport → moved to useStudioAI hook
import { getApiKey, getActiveProvider, type ProviderId } from '@/lib/ai-providers';

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
    if (typeof window !== 'undefined') return (localStorage.getItem('noa_studio_mode') as 'guided' | 'free') || 'guided';
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

  // UX feature states
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [lightTheme, setLightTheme] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [archiveFilter, setArchiveFilter] = useState<string>('ALL');
  const [archiveScope, setArchiveScope] = useState<'project' | 'all'>('project');
  const [moveModal, setMoveModal] = useState<{ sessionId: string; others: Project[] } | null>(null);
  const { user, signInWithGoogle, signOut, isConfigured: authConfigured, accessToken, refreshAccessToken } = useAuth();

  // UX: unsaved changes warning (moved after useStudioAI to avoid TDZ)
  // see useUnsavedWarning call below useStudioAI

  // UX: error toast state
  const [uxError, setUxError] = useState<{ error: unknown; retry?: () => void } | null>(null);

  // UX: storage-full warning listener
  const [storageFull, setStorageFull] = useState(false);
  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener('noa:storage-full', handler);
    return () => window.removeEventListener('noa:storage-full', handler);
  }, []);

  // Hydration-safe: read localStorage values after mount
  useEffect(() => {
    if (!hydrated) return;
    setIsSidebarOpen(window.innerWidth >= 768);
    setLightTheme(localStorage.getItem('noa_light_theme') === 'true');
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

  // API 키 추가/삭제 감지 → 모드 자동 전환 + localStorage 동기화
  useEffect(() => {
    if (!aiCapabilitiesLoaded) return;
    if (hasAiAccess) {
      setWritingMode(prev => prev === 'edit' ? 'ai' : prev);
      localStorage.setItem('noa_studio_mode', 'api');
    } else {
      setWritingMode(prev => (prev === 'ai' || prev === 'refine' || prev === 'canvas' || prev === 'advanced') ? 'edit' : prev);
      localStorage.setItem('noa_studio_mode', 'manual');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAiAccess, aiCapabilitiesLoaded]);

  // UX: confirm modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; message: string;
    confirmLabel?: string; cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = useCallback((opts: Omit<typeof confirmState, 'open'>) => {
    setConfirmState({ ...opts, open: true });
  }, []);
  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, open: false }));
  }, []);

  // ============================================================
  // SYNC STATE (projects only — API keys stay local per device)
  // ============================================================
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [showSyncReminder, setShowSyncReminder] = useState(false);

  // 2-hour sync reminder
  const SYNC_REMINDER_MS = 2 * 60 * 60 * 1000; // 2h
  useEffect(() => {
    if (!user) {
      // Non-logged-in users: remind to log in for backup after 2 hours
      const timer = setTimeout(() => {
        console.info('[NOA] 💡 Google 로그인 후 Drive 동기화를 사용하면 작업물을 안전하게 백업할 수 있습니다.');
        setShowSyncReminder(true);
      }, SYNC_REMINDER_MS);
      return () => clearTimeout(timer);
    }
    const timer = setInterval(() => {
      const gap = lastSyncTime ? Date.now() - lastSyncTime : Infinity;
      if (gap >= SYNC_REMINDER_MS) {
        setShowSyncReminder(true);
      }
    }, 60_000); // check every minute
    return () => clearInterval(timer);
  }, [user, lastSyncTime, SYNC_REMINDER_MS]);

  const handleSync = useCallback(async () => {
    let token = accessToken;
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return;
    }
    setSyncStatus('syncing');
    try {
      const result = await syncAllProjects(token, projects);
      setProjects(result.merged);
      setLastSyncTime(Date.now());
      if (result.failedCount > 0) {
        setSyncStatus('done');
        setUxError({ error: new Error(`Drive sync: ${result.failedCount} file(s) failed to sync`) });
      } else {
        setSyncStatus('done');
      }
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      // Auto-retry on 401 (expired token)
      if (msg.includes('401')) {
        console.warn('[Sync] Token expired, refreshing...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          try {
            const retryResult = await syncAllProjects(newToken, projects);
            setProjects(retryResult.merged);
            setLastSyncTime(Date.now());
            if (retryResult.failedCount > 0) {
              setSyncStatus('done');
              setUxError({ error: new Error(`Drive sync: ${retryResult.failedCount} file(s) failed to sync`) });
            } else {
              setSyncStatus('done');
            }
            setTimeout(() => setSyncStatus('idle'), 3000);
            return;
          } catch (retryErr) {
            console.error('[Sync] Retry failed', retryErr);
          }
        }
      }
      console.error('[Sync]', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [accessToken, refreshAccessToken, projects, setProjects]);

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
  const [writingMode, setWritingMode] = useState<'ai' | 'edit' | 'canvas' | 'refine' | 'advanced'>('ai');
  const [editDraft, setEditDraft] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState<import('@/components/studio/AdvancedWritingPanel').AdvancedWritingSettings>({
    sceneGoals: [], constraints: { pov: '3rd-limited', dialogueRatio: 40, tempo: 'stable', sentenceLen: 'normal', emotionExposure: 'normal' },
    references: { prevEpisodes: 3, characterCards: true, worldSetting: true, styleProfile: false, sceneSheet: false, platformPreset: false },
    locks: { speechStyle: false, worldRules: false, charRelations: false, bannedWords: false },
    outputMode: 'draft', includes: '', excludes: '',
  });
  const [canvasContent, setCanvasContent] = useState('');
  const [canvasPass, setCanvasPass] = useState(0);
  const [promptDirective, setPromptDirective] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [saveFlash, setSaveFlash] = useState(false);
  const [saveSlotModalOpen, setSaveSlotModalOpen] = useState(false);
  const [saveSlotName, setSaveSlotName] = useState('');
  const triggerSave = useCallback(() => {
    // Data is already auto-saved via localStorage, this is visual feedback
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, []); // 0=empty, 1=skeleton, 2=emotion, 3=sensory

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hydration + auto-save handled by useProjectManager hook

  const messageCount = currentSession?.messages?.length ?? 0;
  // NOTE: scroll effect moved after useStudioAI (needs isGenerating)

  const createNewSession = useCallback((nextTab: AppTab = 'world') => {
    const commitNewSession = () => {
      doCreateNewSession();
      setActiveTab(nextTab);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const hasCurrentWork = Boolean(
      currentSession?.messages.some(message => message.content.trim()) ||
      editDraft.trim() ||
      currentSession?.config.title?.trim() ||
      currentSession?.config.synopsis?.trim() ||
      currentSession?.config.setting?.trim() ||
      currentSession?.config.povCharacter?.trim()
    );

    if (!hasCurrentWork) {
      commitNewSession();
      return;
    }

    showConfirm({
      title: language === 'KO' ? '새로운 소설 시작' : 'Start New Story',
      message: language === 'KO'
        ? '현재 작업이 초기화됩니다. 진행하시겠습니까?'
        : 'Current work will be reset. Do you want to continue?',
      confirmLabel: language === 'KO' ? '진행' : 'Continue',
      cancelLabel: t('confirm.cancel'),
      variant: 'warning',
      onConfirm: () => {
        closeConfirm();
        commitNewSession();
      },
    });
  }, [closeConfirm, currentSession, doCreateNewSession, editDraft, language, showConfirm, t]);

  const createDemoSession = useCallback(() => {
    const isKO = language === 'KO';
    const demoConfig = {
      ...INITIAL_CONFIG,
      title: isKO ? '네온 심연의 관찰자' : 'Observer of the Neon Abyss',
      genre: Genre.SF,
      synopsis: isKO
        ? '2847년, 인류는 의식을 디지털화하여 영생을 얻었지만, 그 대가로 감정을 잃어가고 있다. 마지막 "감정 보유자"인 주인공은 시스템이 숨긴 진실을 추적하며, 인간성의 의미를 되찾으려 한다.'
        : 'In 2847, humanity achieved immortality through consciousness digitization, but at the cost of losing emotions. The protagonist, the last "emotion bearer," traces the truth hidden by the system, seeking to reclaim what it means to be human.',
      characters: [
        { name: isKO ? '카이' : 'Kai', role: isKO ? '주인공' : 'Protagonist', traits: isKO ? '냉정하지만 감정의 잔재가 남아있음' : 'Cold but retains emotional residue', dna: 78, appearance: '', personality: isKO ? '논리적이나 가끔 비합리적 선택을 함' : 'Logical but makes irrational choices', speechStyle: isKO ? '짧고 건조한 문장' : 'Short, dry sentences', speechExample: isKO ? '"데이터는 거짓말을 하지 않아. 하지만 진실을 말하지도 않지."' : '"Data doesn\'t lie. But it doesn\'t tell the truth either."' },
        { name: isKO ? '에코' : 'Echo', role: isKO ? '안내자' : 'Guide', traits: isKO ? 'AI지만 인간보다 인간적' : 'AI but more human than humans', dna: 45, appearance: '', personality: isKO ? '호기심 많고 유머러스' : 'Curious and humorous', speechStyle: isKO ? '가면 이모티콘을 섞어 말함' : 'Speaks with mask emoticons', speechExample: isKO ? '"🎭 재밌는 가설이네요, 카이. 근데 틀렸어요."' : '"🎭 Interesting hypothesis, Kai. But wrong."' },
      ],
      episode: 1,
      totalEpisodes: 25,
    };
    const demoMessages = [
      { id: 'demo-1', role: 'user' as const, content: isKO ? '첫 장면을 써줘. 카이가 네온 시티의 하층부에서 에코를 처음 만나는 장면.' : 'Write the first scene. Kai meets Echo for the first time in the lower levels of Neon City.', timestamp: Date.now() - 60000 },
      { id: 'demo-2', role: 'assistant' as const, content: isKO
        ? `하층부의 공기는 무겁다.\n\n합성 산소 필터가 뿜어내는 냄새 — 금속과 오존의 혼합물이 코끝을 찔렀다. 카이는 후드를 더 깊이 눌러 쓰고 좁은 골목을 걸었다.\n\n네온사인이 깜빡였다. '의식 업로드 — 99.7% 성공률.' 누군가 그 아래에 스프레이로 덧씌웠다. '0.3%는 어디 갔지?'\n\n좋은 질문이었다.\n\n"찾고 있는 게 있죠?"\n\n목소리는 어둠에서 왔다. 카이가 멈췄다. 손이 허리춤의 데이터 블레이드로 갔다.\n\n골목 끝, 고장난 홀로그램 광고판 앞에 누군가 앉아 있었다. 아니 — 무언가. 인간의 형상이지만, 눈이 두 개가 아니라 네 개였다. 위쪽 두 눈이 가면처럼 빛났다.\n\n"🎭 긴장 풀어요. 저는 에코. 당신이 올 줄 알았어요."\n\n카이는 대답하지 않았다. 데이터는 거짓말을 하지 않는다. 하지만 이 존재에 대한 데이터는 — 없었다.\n\n그게 문제였다.`
        : `The air in the lower levels was heavy.\n\nThe smell of synthetic oxygen filters — a mix of metal and ozone — stung his nostrils. Kai pulled his hood deeper and walked through the narrow alley.\n\nA neon sign flickered. 'Consciousness Upload — 99.7% Success Rate.' Someone had spray-painted underneath: 'Where did the 0.3% go?'\n\nGood question.\n\n"You're looking for something, aren't you?"\n\nThe voice came from the darkness. Kai stopped. His hand went to the data blade at his hip.\n\nAt the end of the alley, someone sat in front of a broken hologram ad. No — something. Human-shaped, but with four eyes instead of two. The upper pair glowed like a mask.\n\n"🎭 Relax. I'm Echo. I knew you'd come."\n\nKai didn't answer. Data doesn't lie. But data on this being — there was none.\n\nThat was the problem.`,
        timestamp: Date.now(),
        meta: { engineReport: { version: 'demo', grade: 'A-', metrics: { tension: 72, pacing: 85, immersion: 78 }, eosScore: 45, aiTonePercent: 8, tensionTarget: 70, serialization: { platform: 'MOBILE' as const, byteSize: 2400, targetRange: { min: 9500, max: 15500 }, withinRange: true }, actPosition: { act: 1, name: '도입', nameEN: 'Introduction', position: 0.04, progress: 4 }, fixes: [], issues: [], processingTimeMs: 0 } }
      },
    ];
    doCreateNewSession();
    setTimeout(() => {
      updateCurrentSession({ messages: demoMessages as Message[], config: demoConfig as StoryConfig, title: demoConfig.title });
      setActiveTab('writing');
    }, 50);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [language, doCreateNewSession, updateCurrentSession]);

  const handleQuickStart = async (genre: Genre, userPrompt: string) => {
    if (showQuickStartLock) {
      setShowApiKeyModal(true);
      return;
    }
    setIsQuickGenerating(true);
    try {
      const world = await generateWorldDesign(genre, language, { synopsis: userPrompt });
      const config: StoryConfig = {
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
      };

      const characters = await generateCharacters(config, language);
      config.characters = characters;

      // Create session and set it up
      const newSessionId = `s-${Date.now()}`;
      const newSession: ChatSession = {
        id: newSessionId,
        title: config.title,
        config: config,
        messages: [],
        lastUpdate: Date.now(),
      };

      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSessionId);
      setActiveTab('writing');
      setShowQuickStartModal(false);

      // Trigger first generation
      setTimeout(() => {
        doHandleSend(`${userPrompt}\n\n첫 장면을 써줘.`, '', () => {});
      }, 500);

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


  const openQuickStart = useCallback(() => {
    if (showQuickStartLock) {
      setShowApiKeyModal(true);
      return;
    }
    setShowQuickStartModal(true);
  }, [showQuickStartLock]);

  const handleTabChange = useCallback((tab: AppTab) => {
    // 수동 편집 중 탭 전환 시 미저장 경고
    if (activeTab === 'writing' && writingMode === 'edit' && editDraft.trim()) {
      showConfirm({
        title: t('confirm.unsavedEdits'),
        message: t('confirm.unsavedEditsMsg'),
        variant: 'warning',
        confirmLabel: t('confirm.switch'),
        cancelLabel: t('confirm.keepEditing'),
        onConfirm: () => {
          setActiveTab(tab);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
      });
      return;
    }
    setActiveTab(tab);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is derived from language (already in deps)
  }, [activeTab, writingMode, editDraft, language, showConfirm]);

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

  const writingColumnShell = 'max-w-6xl w-full mx-auto px-4 md:px-8 lg:px-12';
  const writingInputDockOffset = activeTab === 'writing' && !showDashboard
    ? (writingMode === 'ai'
        ? (rightPanelOpen ? 'lg:pr-80' : 'lg:pr-10')
        : 'lg:pr-64')
    : '';

  return (
    <ErrorBoundary language={isKO ? 'KO' : 'EN'}>
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${lightTheme ? 'bg-white text-gray-900' : 'bg-bg-primary text-text-primary'}`} style={lightTheme ? { fontFamily: 'var(--font-sans)', '--color-bg-primary': '#ffffff', '--color-bg-secondary': '#f3f4f6', '--color-bg-tertiary': '#e5e7eb', '--color-text-primary': '#111827', '--color-text-secondary': '#4b5563', '--color-text-tertiary': '#9ca3af', '--color-border': '#d1d5db' } as React.CSSProperties : { fontFamily: 'var(--font-sans)' }}>
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      {/* Mobile bottom tab bar */}
      <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} language={language} mode={studioMode} />

      {/* Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 bg-bg-primary border-r border-border transition-transform md:transition-all duration-300 flex flex-col z-50 overflow-hidden ${focusMode ? '-translate-x-full md:translate-x-0 md:w-0' : isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-0'}`}>
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
            <Zap className="w-6 h-6 text-accent-purple" />
            <div>
              <h1 className="text-lg font-black italic tracking-tighter font-[family-name:var(--font-mono)]">NOA STUDIO</h1>
              <span className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)] tracking-widest uppercase">← EH UNIVERSE</span>
            </div>
          </Link>
          {/* Project Selector */}
          <div className="mb-3 space-y-1">
            {projects.length === 0 ? (
              <button onClick={createNewProject} className="w-full flex items-center justify-center gap-2 py-3 bg-bg-secondary border border-dashed border-border rounded-xl text-[10px] font-bold text-text-tertiary hover:text-accent-purple hover:border-accent-purple transition-all font-[family-name:var(--font-mono)]">
                <Plus className="w-3.5 h-3.5" /> {t('project.newProject')}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <select
                    value={currentProjectId || ''}
                    onChange={e => { setCurrentProjectId(e.target.value); setCurrentSessionId(null); }}
                    className="flex-1 bg-bg-secondary border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold font-[family-name:var(--font-mono)] outline-none text-text-primary truncate"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sessions.length})</option>
                    ))}
                  </select>
                  <button onClick={createNewProject} className="p-1.5 bg-bg-secondary border border-border rounded-lg text-text-tertiary hover:text-accent-purple transition-colors" title={t('project.newProject')}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {currentProject && (
                  <div className="flex gap-1 text-[10px] font-[family-name:var(--font-mono)]">
                    <button onClick={() => {
                      const name = window.prompt(t('project.renameProject'), currentProject.name);
                      if (name) renameProject(currentProject.id, name);
                    }} className="text-text-tertiary hover:text-accent-purple">{t('project.renameProject')}</button>
                    {projects.length > 1 && (
                      <button onClick={() => deleteProject(currentProject.id)} className="text-text-tertiary hover:text-accent-red">{t('project.deleteProject')}</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <button data-testid="btn-new-session" onClick={() => createNewSession()} className="w-full flex items-center justify-center gap-2 py-3 bg-bg-secondary rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-bg-tertiary transition-all mb-6 border border-border font-[family-name:var(--font-mono)]">
            <Plus className="w-4 h-4" /> {t('sidebar.newProject')}
          </button>

          {/* Mode toggle */}
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-[11px] font-bold text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">
              {studioMode === 'guided' ? (language === 'KO' ? '가이드' : 'Guided') : (language === 'KO' ? '자유' : 'Free')}
            </span>
            <button type="button" onClick={() => {
              const next = studioMode === 'guided' ? 'free' : 'guided';
              setStudioMode(next);
              localStorage.setItem('noa_studio_mode', next);
            }} className={`relative w-10 h-5 rounded-full transition-colors ${studioMode === 'free' ? 'bg-accent-purple' : 'bg-border'}`}
              aria-label={language === 'KO' ? '모드 전환' : 'Toggle mode'}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${studioMode === 'free' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <nav className="space-y-1">
            {([
              { tab: 'world' as AppTab, icon: Globe, label: t('sidebar.worldStudio'), guided: true },
              { tab: 'characters' as AppTab, icon: UserCircle, label: t('sidebar.characterStudio'), guided: true },
              { tab: 'rulebook' as AppTab, icon: FileText, label: t('sidebar.rulebook'), guided: true },
              { tab: 'writing' as AppTab, icon: PenTool, label: t('sidebar.writingMode'), guided: false },
              { tab: 'style' as AppTab, icon: Edit3, label: t('sidebar.styleStudio'), guided: false },
              { tab: 'manuscript' as AppTab, icon: FileText, label: t('ui.manuscript'), guided: false },
              { tab: 'history' as AppTab, icon: History, label: t('sidebar.archives'), guided: false },
              { tab: 'docs' as AppTab, icon: BookOpen, label: language === 'KO' ? '사용설명서' : 'User Guide', guided: true },
            ]).filter(item => studioMode === 'free' || item.guided).map(({ tab, icon: Icon, label }) => (
              <button key={tab} data-testid={`tab-${tab}`} onClick={() => handleTabChange(tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all font-[family-name:var(--font-mono)] ${activeTab === tab ? 'bg-accent-purple/20 text-accent-purple shadow-lg' : 'text-text-tertiary hover:bg-bg-secondary'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto px-4 py-4 border-t border-border space-y-2">
          {/* Export / Import */}
          <div className="flex gap-1.5">
            <button onClick={exportTXT} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <Download className="w-3.5 h-3.5" /> TXT
            </button>
            <button onClick={exportJSON} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-tertiary hover:text-text-primary font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <Upload className="w-3.5 h-3.5" /> {t('export.import')}
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleExportEPUB} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <FileText className="w-3.5 h-3.5" /> EPUB
            </button>
            <button onClick={handleExportDOCX} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <FileType className="w-3.5 h-3.5" /> DOCX
            </button>
          </div>
          <button onClick={exportAllJSON} className="w-full py-2 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-tertiary hover:text-text-primary font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
            {t('export.fullBackup')}
          </button>
          {/* Auth */}
          <div className="flex items-center gap-2 py-1">
            {user ? (
              <>
                <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center text-[11px] font-bold text-accent-purple overflow-hidden">
                  {user.photoURL ? <Image src={user.photoURL} alt="" width={24} height={24} className="w-full h-full object-cover" /> : user.displayName?.[0] || '?'}
                </div>
                <span className="text-[11px] text-text-secondary truncate flex-1">{user.displayName || user.email}</span>
                <button onClick={() => showConfirm({
                  title: t('confirm.logout'),
                  message: t('confirm.logoutMsg'),
                  variant: 'warning',
                  onConfirm: () => { closeConfirm(); signOut(); },
                })} className="text-[10px] text-text-tertiary hover:text-accent-red font-bold">{t('confirm.logout')}</button>
              </>
            ) : (
              <button onClick={() => {
                if (!authConfigured) {
                  alert(t('confirm.firebaseRequired'));
                  return;
                }
                signInWithGoogle();
              }} className="w-full py-2.5 bg-bg-secondary border border-border rounded-xl text-sm font-bold text-text-secondary hover:text-text-primary font-[family-name:var(--font-mono)] transition-colors">
                🔑 {t('auth.googleLogin')}
              </button>
            )}
          </div>
          {/* Drive Sync */}
          {user && (
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all border ${
                syncStatus === 'syncing' ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30 animate-pulse'
                : syncStatus === 'done' ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                : syncStatus === 'error' ? 'bg-accent-red/10 text-accent-red border-accent-red/30'
                : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
              }`}
            >
              {syncStatus === 'syncing' ? <Cloud className="w-3 h-3 animate-spin" /> : syncStatus === 'error' ? <CloudOff className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
              {syncStatus === 'syncing' ? (t('sync.syncing'))
                : syncStatus === 'done' ? (t('sync.syncDone'))
                : syncStatus === 'error' ? (t('sync.syncError'))
                : (t('sync.syncNow'))}
            </button>
          )}
          {lastSyncTime && (
            <div className="text-[7px] text-text-tertiary font-[family-name:var(--font-mono)] text-center">
              {t('sync.lastSync')}: {new Date(lastSyncTime).toLocaleTimeString()}
            </div>
          )}
          <div className="flex gap-4">
            {(['KO', 'EN', 'JP', 'CN'] as AppLanguage[]).map(l => (
              <button key={l} onClick={() => setLanguage(l)} className={`text-[10px] font-black font-[family-name:var(--font-mono)] ${language === l ? 'text-accent-purple' : 'text-text-tertiary'}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => handleTabChange('settings')} className={`flex items-center gap-2 text-xs font-bold transition-colors font-[family-name:var(--font-mono)] ${activeTab === 'settings' ? 'text-accent-purple' : 'text-text-tertiary hover:text-text-primary'}`}>
            <Settings className="w-4 h-4" /> {t('sidebar.settings')}
          </button>
        </div>
      </aside>

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
              {currentSessionId && <span className={`text-[10px] font-[family-name:var(--font-mono)] transition-all duration-300 ${saveFlash ? 'text-accent-green scale-125 font-black' : 'text-text-tertiary'}`}>✓ {saveFlash ? t('ui.saved') : t('ui.autoSaved')}</span>}
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
              <button onClick={() => setLightTheme(prev => { const next = !prev; localStorage.setItem('noa_light_theme', String(next)); return next; })} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={t('ui.toggleTheme')} aria-label={t('ui.toggleThemeLabel')}>{lightTheme ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}</button>
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
        {showShortcuts && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
            <div className="bg-bg-primary border border-border rounded-xl p-6 max-w-md mx-4 space-y-3 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm">{t('ui.keyboardShortcuts')}</h3>
                <button onClick={() => setShowShortcuts(false)} aria-label="닫기"><X className="w-4 h-4 text-text-tertiary" /></button>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  ['F1', t('shortcuts.worldDesign')],
                  ['F2', t('shortcuts.worldSimulator')],
                  ['F3', t('shortcuts.characterStudio')],
                  ['F4', t('shortcuts.rulebook')],
                  ['F5', t('shortcuts.writingStudio')],
                  ['F6', t('shortcuts.styleStudio')],
                  ['F7', t('shortcuts.manuscript')],
                  ['F8', t('shortcuts.archive')],
                  ['F9', t('shortcuts.settings')],
                  ['F11', t('shortcuts.focusMode')],
                  ['F12', t('shortcuts.shortcutsHelp')],
                  ['Ctrl+N', t('shortcuts.newSession')],
                  ['Ctrl+F', t('shortcuts.search')],
                  ['Ctrl+E', t('shortcuts.exportTxt')],
                  ['Ctrl+P', t('shortcuts.print')],
                  ['Enter', t('shortcuts.sendMessage')],
                  ['Shift+Enter', t('shortcuts.newLine')],
                ].map(([key, desc]) => (
                  <div key={key} className="flex justify-between">
                    <span className="px-2 py-0.5 bg-bg-secondary rounded text-text-tertiary font-[family-name:var(--font-mono)]">{key}</span>
                    <span className="text-text-secondary">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
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
                  {hydrated && !localStorage.getItem('noa_onboarding_done') ? (
                    <OnboardingGuide
                      lang={language === 'KO' ? 'ko' : 'en'}
                      onComplete={() => { window.dispatchEvent(new Event('storage')); }}
                      onNavigate={(tab) => { createNewSession(tab as AppTab); }}
                      onQuickStart={openQuickStart}
                    />
                  ) : (
                    <>
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-accent-purple/30 flex items-center justify-center mb-6 backdrop-blur-sm bg-bg-primary/30">
                        <Ghost className="w-10 h-10 md:w-12 md:h-12 text-accent-purple/40" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-black mb-2 tracking-tighter uppercase font-[family-name:var(--font-mono)] text-text-primary">
                        {t('ui.firstStoryPrompt')}
                      </h2>
                      <p className="text-text-tertiary text-sm mb-6">{t('engine.startPrompt')}</p>
                      <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <button onClick={openQuickStart} className={`px-8 py-3 bg-accent-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest font-[family-name:var(--font-mono)] hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-accent-purple/20 flex items-center gap-2 ${showQuickStartLock ? 'opacity-80' : ''}`}>
                          <Wand2 className="w-4 h-4" /> {isKO ? '쾌속 시작' : 'Quick Start'}{showQuickStartLock && ' · BYOK'}
                        </button>
                        <button onClick={() => createNewSession()} className="px-8 py-3 border border-border text-text-secondary rounded-2xl font-black text-xs uppercase tracking-widest font-[family-name:var(--font-mono)] hover:bg-bg-secondary hover:scale-105 active:scale-95 transition-transform flex items-center gap-2">
                          <Plus className="w-4 h-4" /> {t('ui.setupManually')}
                        </button>
                        <button onClick={createDemoSession} className="px-8 py-3 border border-border text-text-secondary rounded-2xl font-black text-xs uppercase tracking-widest font-[family-name:var(--font-mono)] hover:bg-bg-secondary hover:scale-105 active:scale-95 transition-all">
                          🚀 {language === 'KO' ? '데모 체험' : 'Try Demo'}
                        </button>
                      </div>
                      <p className="text-text-tertiary/50 text-[10px] max-w-sm font-[family-name:var(--font-mono)]">
                        {t('ui.workflowOverview')}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'world' && currentSession && (
                  <WorldStudioView
                    language={language}
                    config={currentSession.config}
                    setConfig={setConfig}
                    onStart={() => setActiveTab('writing')}
                    onSave={triggerSave}
                    saveFlash={saveFlash}
                    handleWorldSimChange={(data) => {
                      if (!currentSessionId || !currentSession) return;
                      updateCurrentSession({
                        config: {
                          ...currentSession.config,
                          worldSimData: {
                            civs: data.civs.map((c: { name: string; era: string; color: string; traits: string[] }) => ({ name: c.name, era: c.era, color: c.color, traits: c.traits })),
                            relations: data.relations.map((r: { from: string; to: string; type: string }) => {
                              const from = data.civs.find((c: { id: string }) => c.id === r.from)?.name || '';
                              const to = data.civs.find((c: { id: string }) => c.id === r.to)?.name || '';
                              return { fromName: from, toName: to, type: r.type };
                            }),
                            transitions: data.transitions,
                            selectedGenre: data.selectedGenre,
                            selectedLevel: data.selectedLevel,
                            genreSelections: data.genreSelections,
                            ruleLevel: data.ruleLevel,
                          },
                        },
                      });
                    }}
                  />
                )}
                {activeTab === 'characters' && currentSession && (
                  <>
                    {/* 서브탭 토글: 캐릭터 / 아이템 */}
                    <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-2">
                      <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 w-fit">
                        <button onClick={() => setCharSubTab('characters')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${charSubTab === 'characters' ? 'bg-accent-purple text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'}`}>
                          👥 {t('ui.characters')}
                        </button>
                        <button onClick={() => setCharSubTab('items')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${charSubTab === 'items' ? 'bg-accent-purple text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'}`}>
                          ⚔️ {t('ui.itemStudio')}
                        </button>
                      </div>
                    </div>

                    {charSubTab === 'characters' ? (
                      <ResourceView language={language} config={currentSession.config} setConfig={setConfig} onError={(msg) => setUxError({ error: new Error(msg) })} />
                    ) : (
                      <ItemStudioView language={language} config={currentSession.config} setConfig={setConfig} />
                    )}

                    {!showAiLock && (
                    <div className="max-w-[1400px] mx-auto px-4 pb-4">
                      <TabAssistant tab="characters" language={language} config={currentSession.config} />
                    </div>
                    )}
                    <div className="max-w-[1400px] mx-auto px-4 pb-8 flex justify-end">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? t('ui.saved') : t('ui.saveSetting')}
                      </button>
                    </div>
                  </>
                )}
                {activeTab === 'settings' && (
                  <SettingsView language={language} hostedProviders={hostedProviders} onClearAll={clearAllSessions} onManageApiKey={() => setShowApiKeyModal(true)} />
                )}
                {/* world studio (design/simulator/analysis) rendered above */}
                {activeTab === 'rulebook' && (
                  <div className="max-w-5xl mx-auto py-8 px-4 md:py-12 md:px-6">
                    <SceneSheet language={language}
                      synopsis={currentSession?.config.synopsis}
                      characterNames={currentSession?.config.characters.map(c => c.name)}
                      tierContext={{
                        charProfiles: currentSession?.config.characters.map(c => ({
                          name: c.name, desire: c.desire, conflict: c.conflict,
                          changeArc: c.changeArc, values: c.values,
                        })),
                        corePremise: currentSession?.config.corePremise,
                        powerStructure: currentSession?.config.powerStructure,
                        currentConflict: currentSession?.config.currentConflict,
                      }}
                      initialDirection={currentSession?.config.sceneDirection ? {
                        goguma: currentSession.config.sceneDirection.goguma?.map((g, i) => ({ id: `r-${i}`, type: g.type as "goguma" | "cider", intensity: g.intensity as "small" | "medium" | "large", desc: g.desc, episode: g.episode || 1 })),
                        hooks: currentSession.config.sceneDirection.hooks?.map((h, i) => ({ id: `r-${i}`, position: h.position as "opening" | "middle" | "ending", hookType: h.hookType, desc: h.desc })),
                        emotions: currentSession.config.sceneDirection.emotionTargets?.map((e, i) => ({ id: `r-${i}`, position: e.position ?? i * 25, emotion: e.emotion, intensity: e.intensity })),
                        dialogueRules: currentSession.config.sceneDirection.dialogueTones?.map((d, i) => ({ id: `r-${i}`, character: d.character, tone: d.tone, notes: d.notes })),
                        dopamines: currentSession.config.sceneDirection.dopamineDevices?.map((dp, i) => ({ id: `r-${i}`, scale: dp.scale as "micro" | "medium" | "macro", device: dp.device, desc: dp.desc, resolved: dp.resolved ?? false })),
                        cliffs: currentSession.config.sceneDirection.cliffhanger ? [{ id: 'r-0', cliffType: currentSession.config.sceneDirection.cliffhanger.cliffType, desc: currentSession.config.sceneDirection.cliffhanger.desc, episode: currentSession.config.sceneDirection.cliffhanger.episode || 1 }] : [],
                        foreshadows: currentSession.config.sceneDirection.foreshadows?.map((f, i) => ({ id: `r-${i}`, planted: f.planted, payoff: f.payoff, episode: f.episode, resolved: f.resolved })),
                        pacings: currentSession.config.sceneDirection.pacings?.map((p, i) => ({ id: `r-${i}`, section: p.section, percent: p.percent, desc: p.desc })),
                        tensionPoints: currentSession.config.sceneDirection.tensionCurve?.map((t, i) => ({ id: `r-${i}`, position: t.position, level: t.level, label: t.label })),
                        canons: currentSession.config.sceneDirection.canonRules?.map((c, i) => ({ id: `r-${i}`, character: c.character, rule: c.rule })),
                        transitions: currentSession.config.sceneDirection.sceneTransitions?.map((t, i) => ({ id: `r-${i}`, fromScene: t.fromScene, toScene: t.toScene, method: t.method })),
                        writerNotes: currentSession.config.sceneDirection.writerNotes,
                        plotStructure: currentSession.config.sceneDirection.plotStructure,
                      } : undefined}
                      onDirectionUpdate={(data) => {
                        if (!currentSessionId) return;
                        updateCurrentSession({
                          config: {
                            ...(currentSession?.config || INITIAL_CONFIG),
                            sceneDirection: {
                              goguma: data.goguma.map(g => ({ type: g.type, intensity: g.intensity, desc: g.desc, episode: g.episode })),
                              hooks: data.hooks.map(h => ({ position: h.position, hookType: h.hookType, desc: h.desc })),
                              emotionTargets: data.emotions.map(e => ({ emotion: e.emotion, intensity: e.intensity, position: e.position })),
                              dialogueTones: data.dialogueRules.map(d => ({ character: d.character, tone: d.tone, notes: d.notes })),
                              dopamineDevices: data.dopamines.map(dp => ({ scale: dp.scale, device: dp.device, desc: dp.desc, resolved: dp.resolved })),
                              cliffhanger: data.cliffs.length > 0 ? { cliffType: data.cliffs[0].cliffType, desc: data.cliffs[0].desc, episode: data.cliffs[0].episode } : undefined,
                              foreshadows: data.foreshadows.map(f => ({ planted: f.planted, payoff: f.payoff, episode: f.episode, resolved: f.resolved })),
                              pacings: data.pacings.map(p => ({ section: p.section, percent: p.percent, desc: p.desc })),
                              tensionCurve: data.tensionPoints.map(t => ({ position: t.position, level: t.level, label: t.label })),
                              canonRules: data.canons.map(c => ({ character: c.character, rule: c.rule })),
                              sceneTransitions: data.transitions.map(t => ({ fromScene: t.fromScene, toScene: t.toScene, method: t.method })),
                              writerNotes: data.writerNotes,
                              plotStructure: data.plotStructure,
                            },
                          },
                        });
                      }}
                      onSimRefUpdate={(ref) => {
                        if (!currentSessionId) return;
                        updateCurrentSession({
                          config: {
                            ...(currentSession?.config || INITIAL_CONFIG),
                            simulatorRef: { ...ref },
                          },
                        });
                      }}
                    />
                    {!showAiLock && (
                    <div className="mt-4">
                      <TabAssistant tab="rulebook" language={language} config={currentSession?.config ?? null} />
                    </div>
                    )}
                    <div className="flex justify-end mt-4">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? t('ui.saved') : t('ui.saveSetting')}
                      </button>
                    </div>
                  </div>
                )}
                {activeTab === 'writing' && currentSession && (
                  <div className={`${writingColumnShell} flex flex-col ${currentSession.messages.length === 0 && writingMode === 'ai' ? 'h-full justify-center items-center' : 'py-6 md:py-8 space-y-6 min-h-full'}`}>
                    {/* Continuity Tracker Graph — 맥락 추적 */}
                    {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
                      <ContinuityGraph language={language} config={currentSession.config} />
                    )}

                    {/* Applied Settings Summary — hide when empty */}
                    {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
                    <details className="group border border-border rounded-xl bg-bg-secondary/50 overflow-hidden">
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-secondary transition-colors">
                        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
                          {t('applied.appliedSettings')}
                        </span>
                        <span className="text-[11px] text-text-tertiary group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="px-4 pb-4 space-y-3 text-[10px] border-t border-border pt-3">
                        {/* World */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-text-tertiary font-bold uppercase w-16">{t('applied.genre')}</span>
                          <span className="text-accent-purple font-bold">{currentSession.config.genre}</span>
                          <span className="text-text-tertiary">EP.{currentSession.config.episode}/{currentSession.config.totalEpisodes}</span>
                          {currentSession.config.setting && <span className="text-text-secondary">📍 {currentSession.config.setting}</span>}
                          {currentSession.config.primaryEmotion && <span className="text-text-secondary">💓 {currentSession.config.primaryEmotion}</span>}
                        </div>
                        {/* Characters */}
                        {currentSession.config.characters.length > 0 && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.characters')}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.characters.map(c => (
                                <span key={c.id} className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[11px]">
                                  <span className="font-bold text-text-primary">{c.name}</span>
                                  <span className="text-text-tertiary ml-1">({c.role})</span>
                                  {c.speechStyle && <span className="text-accent-blue ml-1">🗣️{c.speechStyle}</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Relations */}
                        {currentSession.config.charRelations && currentSession.config.charRelations.length > 0 && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.relations')}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.charRelations.map((r, i) => {
                                const from = currentSession.config.characters.find(c => c.id === r.from)?.name || '?';
                                const to = currentSession.config.characters.find(c => c.id === r.to)?.name || '?';
                                return (
                                  <span key={i} className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[11px]">
                                    {from} ⇄ {to} <span className="text-accent-purple">[{r.type}]</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* Synopsis preview */}
                        {currentSession.config.synopsis && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.synopsis')}</span>
                            <p className="text-text-secondary text-[11px] mt-0.5 line-clamp-2 italic">{currentSession.config.synopsis}</p>
                          </div>
                        )}
                        {/* Scene Direction */}
                        {currentSession.config.sceneDirection && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.direction')}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.sceneDirection.hooks && currentSession.config.sceneDirection.hooks.length > 0 && (
                                <span className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[11px] font-bold">
                                  🪝 {t('applied.hook')} {currentSession.config.sceneDirection.hooks.length}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.goguma && currentSession.config.sceneDirection.goguma.length > 0 && (
                                <span className="px-2 py-0.5 bg-accent-amber/10 text-accent-amber rounded text-[11px] font-bold">
                                  🍠 {currentSession.config.sceneDirection.goguma.filter(g => g.type === 'goguma').length} / 🥤 {currentSession.config.sceneDirection.goguma.filter(g => g.type === 'cider').length}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.cliffhanger && (
                                <span className="px-2 py-0.5 bg-accent-red/10 text-accent-red rounded text-[11px] font-bold">
                                  🔚 {currentSession.config.sceneDirection.cliffhanger.cliffType}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.emotionTargets && currentSession.config.sceneDirection.emotionTargets.length > 0 && (
                                <span className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[11px]">
                                  💓 {currentSession.config.sceneDirection.emotionTargets.map(e => e.emotion).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Simulator Ref */}
                        {currentSession.config.simulatorRef && Object.values(currentSession.config.simulatorRef).some(Boolean) && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.simulator')}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {currentSession.config.simulatorRef.worldConsistency && <span className="px-1.5 py-0.5 bg-accent-green/10 text-accent-green rounded text-[10px] font-bold">✓ {t('applied.consistency')}</span>}
                              {currentSession.config.simulatorRef.civRelations && <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[10px] font-bold">✓ {t('applied.relationsMap')}</span>}
                              {currentSession.config.simulatorRef.timeline && <span className="px-1.5 py-0.5 bg-accent-amber/10 text-accent-amber rounded text-[10px] font-bold">✓ {t('applied.timeline')}</span>}
                              {currentSession.config.simulatorRef.territoryMap && <span className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[10px] font-bold">✓ {t('applied.map')}</span>}
                              {currentSession.config.simulatorRef.languageSystem && <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[10px] font-bold">✓ {t('applied.language')}</span>}
                              {currentSession.config.simulatorRef.genreLevel && <span className="px-1.5 py-0.5 bg-accent-red/10 text-accent-red rounded text-[10px] font-bold">✓ {t('applied.genreLv')}</span>}
                            </div>
                          </div>
                        )}
                        {/* Quick nav */}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setActiveTab('world')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {t('applied.editWorld')}
                          </button>
                          <button onClick={() => setActiveTab('characters')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {t('applied.editCharacters')}
                          </button>
                          <button onClick={() => setActiveTab('rulebook')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {t('applied.editDirection')}
                          </button>
                        </div>
                      </div>
                    </details>
                    )}

                    {/* AI / Edit sub-tabs — API 없을 때는 edit 탭만 표시 */}
                    {(currentSession.messages.length > 0 || writingMode !== 'ai' || showAiLock) && (<>
                    <div className="flex gap-1 items-center">
                      {!showAiLock && (
                        <button onClick={() => setWritingMode('ai')}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                            writingMode === 'ai' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                          }`}>
                          🤖 {t('writingMode.draftGen')}
                        </button>
                      )}
                      <button onClick={() => {
                        setWritingMode('edit');
                        if (!editDraft && currentSession.messages.length > 0) {
                          const allText = currentSession.messages
                            .filter(m => m.role === 'assistant' && m.content)
                            .map(m => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                            .join('\n\n---\n\n');
                          setEditDraft(allText);
                        }
                      }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'edit' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        }`}>
                        ✏️ {t('writingMode.manualEdit')}
                      </button>
                      {!showAiLock && (<>
                        <button onClick={() => { setWritingMode('canvas'); if (!canvasContent) setCanvasPass(0); }}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                            writingMode === 'canvas' ? 'bg-accent-green text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                          }`}>
                          🎨 {t('writingMode.threeStep')}
                        </button>
                        <button onClick={() => {
                          setWritingMode('refine');
                          if (!editDraft && currentSession.messages.length > 0) {
                            const allText = currentSession.messages
                              .filter(m => m.role === 'assistant' && m.content)
                              .map(m => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                              .join('\n\n---\n\n');
                            setEditDraft(allText);
                          }
                        }}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                            writingMode === 'refine' ? 'bg-gradient-to-r from-accent-purple to-blue-600 text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                          }`}>
                          ⚡ {t('writingMode.auto30')}
                        </button>
                        <button onClick={() => setWritingMode('advanced')}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                            writingMode === 'advanced' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                          }`}>
                          🎯 {t('writingMode.advanced')}
                        </button>
                      </>)}
                      {writingMode === 'edit' && (
                        <span className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)] ml-2">
                          {editDraft.length.toLocaleString()}{t('writingMode.chars')}
                        </span>
                      )}
                    </div>

                    {/* Prompt Directive — AI 있을 때만 표시 */}
                    {!showAiLock && (
                    <div className="flex gap-2 items-center">
                      <span className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider shrink-0">
                        💡 {t('writingMode.directive')}
                      </span>
                      <input
                        value={promptDirective}
                        onChange={e => setPromptDirective(e.target.value)}
                        placeholder={t('writingMode.directivePlaceholder')}
                        className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                      />
                      {promptDirective && (
                        <button onClick={() => setPromptDirective('')} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
                      )}
                    </div>
                    )}
                    </>)}

                    {writingMode === 'ai' && (
                      <>
                        <EngineStatusBar language={language} config={currentSession.config} report={lastReport} isGenerating={isGenerating} />
                        {currentSession.messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <Sparkles className="w-14 h-14 text-accent-purple/20 mx-auto" />
                            <p className="text-text-tertiary text-base font-medium">{t('engine.startPrompt')}</p>
                            <p className="text-text-tertiary/40 text-xs font-[family-name:var(--font-mono)] max-w-sm">
                              {t('writingMode.describeFirstScene')}
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center pt-2 max-w-2xl">
                              {(tObj.presets as string[]).map((preset: string, i: number) => (
                                <button key={i} onClick={() => handleSend(preset)}
                                  className="px-3 py-1.5 bg-bg-secondary/80 border border-border rounded-full text-[10px] text-text-tertiary hover:text-accent-purple hover:border-accent-purple/50 transition-all font-[family-name:var(--font-mono)]">
                                  {preset}
                                </button>
                              ))}
                            </div>
                            {showAiLock && (
                              <div className="mt-6 pt-4 border-t border-border/30">
                                <p className="text-text-tertiary/60 text-[10px] font-[family-name:var(--font-mono)] mb-2">
                                  {t('writingMode.noApiKeyStart')}
                                </p>
                                <button onClick={() => setWritingMode('edit')}
                                  className="px-4 py-2 bg-bg-secondary border border-accent-purple/30 rounded-xl text-[10px] font-bold text-accent-purple hover:bg-accent-purple/10 transition-all font-[family-name:var(--font-mono)]">
                                  ✏️ {t('writingMode.startManualEdit')}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          (searchQuery ? filteredMessages : currentSession.messages).map(msg => (
                            <div key={msg.id}>
                              <ChatMessage message={msg} language={language} onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined} onAutoFix={msg.role === 'assistant' ? async (messageId: string) => {
                                const target = currentSession.messages.find(m => m.id === messageId);
                                if (!target) return;
                                const { applyFormattingRules } = await import('@/engine/validator');
                                const { formatted } = applyFormattingRules(target.content);
                                updateCurrentSession({
                                  messages: currentSession.messages.map(m => m.id === messageId ? { ...m, content: formatted } : m)
                                });
                              } : undefined} />
                              {msg.role === 'assistant' && msg.versions && msg.versions.length > 1 && (
                                <div className="ml-11 md:ml-12">
                                  <VersionDiff
                                    versions={msg.versions}
                                    currentIndex={msg.currentVersionIndex ?? msg.versions.length - 1}
                                    language={language}
                                    onSwitch={(idx) => handleVersionSwitch(msg.id, idx)}
                                  />
                                </div>
                              )}
                              {msg.role === 'assistant' && msg.content && (
                                <div className="ml-11 md:ml-12">
                                  <TypoPanel
                                    text={msg.content}
                                    language={language}
                                    onApplyFix={(idx, orig, sug) => handleTypoFix(msg.id, idx, orig, sug)}
                                  />
                                </div>
                              )}
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} className="h-32" />
                      </>
                    )}

                    {writingMode === 'edit' && (
                      /* ====== INLINE REWRITE MODE ====== */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          {!showAiLock && (
                          <p className="text-[10px] text-text-tertiary">
                            {t('writingMode.editDescWithApi')}
                          </p>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => {
                              if (!editDraft.trim()) return;
                              const editMsg: Message = { id: `edit-${Date.now()}`, role: 'assistant', content: editDraft, timestamp: Date.now() };
                              updateCurrentSession({
                                messages: [...currentSession.messages, { id: `u-edit-${Date.now()}`, role: 'user', content: t('writingMode.inlineEditComplete'), timestamp: Date.now() }, editMsg],
                                title: currentSession.messages.length === 0 ? editDraft.substring(0, 15) : currentSession.title
                              });
                              if (!showAiLock) setWritingMode('ai');
                              setEditDraft('');
                            }}
                              className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity">
                              {t('writingMode.applyToManuscript')}
                            </button>
                          </div>
                        </div>
                        {!editDraft.trim() ? (
                          /* ====== EMPTY EDIT ONBOARDING ====== */
                          <div className="text-center py-16 space-y-4">
                            <PenTool className="w-8 h-8 text-text-tertiary mx-auto opacity-50" />
                            <p className="text-sm text-text-secondary font-[family-name:var(--font-mono)]">
                              {t('writingMode.writeManuscript')}
                            </p>
                            <p className="text-[10px] text-text-tertiary max-w-md mx-auto">
                              {t('writingMode.writeManuscriptDesc')}
                            </p>
                            <textarea
                              value={editDraft}
                              onChange={e => setEditDraft(e.target.value)}
                              placeholder={t('writingMode.typeManuscript')}
                              className="w-full min-h-[300px] bg-bg-primary border border-border rounded-xl p-4 text-sm text-left outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] resize-y"
                            />
                          </div>
                        ) : (
                          <InlineRewriter
                            content={editDraft}
                            language={language}
                            context={currentSession.config.genre ? `${currentSession.config.genre} | ${currentSession.config.title || ''}` : undefined}
                            onApply={(newContent) => setEditDraft(newContent)}
                          />
                        )}
                      </div>
                    )}

                    {/* ====== AUTO 30% REFINE MODE ====== */}
                    {writingMode === 'refine' && editDraft && (
                      <div className="space-y-4">
                        <AutoRefiner
                          content={editDraft}
                          language={language}
                          context={currentSession.config.genre ? `${currentSession.config.genre} | ${currentSession.config.title || ''} | EP.${currentSession.config.episode}` : undefined}
                          onApply={(newContent) => {
                            setEditDraft(newContent);
                            const editMsg: Message = { id: `refine-${Date.now()}`, role: 'assistant', content: newContent, timestamp: Date.now() };
                            updateCurrentSession({ messages: [...currentSession.messages, { id: `u-refine-${Date.now()}`, role: 'user', content: t('writingMode.autoRefineComplete'), timestamp: Date.now() }, editMsg] });
                            setWritingMode('ai');
                          }}
                        />
                        <div className="text-[11px] text-zinc-600 font-[family-name:var(--font-mono)]">
                          {t('writingMode.autoRefineGuide')}
                        </div>
                      </div>
                    )}

                    {/* ====== 3-PASS CANVAS MODE ====== */}
                    {writingMode === 'canvas' && (
                      <div className="space-y-4">
                        {/* Pass progress */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 1 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            🦴 {canvasPass >= 1 ? '✓' : '1'} {t('canvas.skeleton')}
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 2 ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            💓 {canvasPass >= 2 ? '✓' : '2'} {t('canvas.emotion')}
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 3 ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            👁 {canvasPass >= 3 ? '✓' : '3'} {t('canvas.sensory')}
                          </div>
                          <span className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)]">
                            {canvasContent.length.toLocaleString()}{t('writingMode.chars')}
                          </span>
                          {isGenerating && <span className="text-[11px] text-accent-purple animate-pulse font-[family-name:var(--font-mono)]">{t('canvas.generating')}</span>}
                        </div>

                        {/* Custom prompt input */}
                        <div className="flex gap-2">
                          <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { handleSend(); } }}
                            placeholder={t('canvas.customInstruction')}
                            className="flex-1 bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-xs outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                            disabled={isGenerating}
                          />
                          <button onClick={() => { if (input.trim()) handleSend(); }} disabled={isGenerating || !input.trim()}
                            className="px-4 py-2.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0">
                            {t('canvas.send')}
                          </button>
                        </div>

                        {/* Canvas textarea */}
                        <textarea
                          value={canvasContent}
                          onChange={e => setCanvasContent(e.target.value)}
                          className="w-full min-h-[50vh] bg-bg-primary border border-border rounded-xl p-6 text-sm leading-[2] font-serif text-text-primary outline-none focus:border-accent-purple transition-colors resize-y"
                          placeholder={t('canvas.canvasPlaceholder')}
                        />

                        {/* Pass action buttons */}
                        <div className="flex gap-2 flex-wrap items-center">
                          <button disabled={isGenerating} onClick={() => {
                            setCanvasPass(1);
                            setWritingMode('ai');
                            setTimeout(() => {
                              handleSend(isKO
                                ? '[1단계 — 뼈대] 씬시트/연출표를 기반으로 초안을 작성하세요. 사건과 대사만. 감정 묘사 없이 골격만. 약 1,000토큰(2,000자). 중요: JSON 코드블록, 분석 리포트, grade, metrics 등 절대 출력하지 마세요. 순수 소설 본문만 출력하세요.'
                                : '[Pass 1 — Skeleton] Scene sheet based. Events and dialogue only. ~1,000 tokens. Story text only, no JSON.'
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-blue-600/10 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            🦴 {t('canvas.pass1')}
                          </button>
                          <button disabled={isGenerating || canvasPass < 1} onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const draft = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (!draft) { alert(t('canvas.noPass1')); return; }
                            setCanvasContent(draft);
                            setCanvasPass(2);
                            setWritingMode('ai');
                            setTimeout(() => {
                              handleSend(isKO
                                ? `[2단계 — 감정선] 아래 초안을 전체 다시 써주세요. 인물 내면, 감정 밀도, 문장 리듬 강화. 고구마/사이다 타이밍. 약 1,000토큰 추가. JSON/리포트/grade/metrics 절대 출력 금지. 소설 본문만.\n\n---초안---\n${draft.slice(0, 4000)}`
                                : `[Pass 2 — Emotion] Rewrite fully with inner thoughts, emotional density, pacing. +1,000 tokens. Full output.\n\n---Draft---\n${draft.slice(0, 4000)}`
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-pink-600/10 border border-pink-500/30 rounded-lg text-[10px] font-bold text-pink-400 hover:bg-pink-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            💓 {t('canvas.pass2')}
                          </button>
                          <button disabled={isGenerating || canvasPass < 2} onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const ms = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (!ms) { alert(t('canvas.noPass2')); return; }
                            setCanvasContent(ms);
                            setCanvasPass(3);
                            setWritingMode('ai');
                            setTimeout(() => {
                              handleSend(isKO
                                ? `[3단계 — 감각 묘사] 아래 원고를 전체 다시 써주세요. 물성/시각/청각/촉각 묘사 추가. 클리프행어 마무리. 약 1,000토큰 추가. JSON/리포트/grade/metrics 절대 출력 금지. 소설 본문만.\n\n---원고---\n${ms.slice(0, 5000)}`
                                : `[Pass 3 — Sensory] Rewrite with physical/visual/auditory descriptions. Cliffhanger. +1,000 tokens. Full output.\n\n---Manuscript---\n${ms.slice(0, 5000)}`
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-amber-600/10 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-400 hover:bg-amber-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            👁 {t('canvas.pass3')}
                          </button>
                          <span className="text-border mx-1">|</span>
                          <button onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const text = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (text) { setCanvasContent(text); setWritingMode('canvas'); }
                          }}
                            className="px-3 py-2.5 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all font-[family-name:var(--font-mono)]">
                            📋 {t('canvas.pullToCanvas')}
                          </button>
                          <button disabled={!canvasContent} onClick={() => {
                            const editMsg: Message = { id: `canvas-${Date.now()}`, role: 'assistant', content: canvasContent, timestamp: Date.now() };
                            updateCurrentSession({ messages: [...(currentSession?.messages || []), { id: `u-canvas-${Date.now()}`, role: 'user', content: `[${t('canvas.threePassComplete')} — ${canvasContent.length}${t('writingMode.chars')}]`, timestamp: Date.now() }, editMsg] });
                            setWritingMode('ai');
                          }}
                            className="px-3 py-2.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30">
                            💾 {t('canvas.saveManuscript')}
                          </button>
                        </div>
                        <p className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)]">
                          {t('canvas.canvasGuide')}
                        </p>
                      </div>
                    )}

                    {/* ====== ADVANCED WRITING MODE ====== */}
                    {writingMode === 'advanced' && currentSession && (
                      <div className="space-y-4">
                        <AdvancedWritingPanel
                          language={language}
                          config={currentSession.config}
                          settings={advancedSettings}
                          onSettingsChange={setAdvancedSettings}
                        />
                        <div className="flex gap-2 items-center">
                          <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { handleSend(); } }}
                            placeholder={t('writingMode.preciseInstruction')}
                            className="flex-1 bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-xs outline-none focus:border-amber-500 transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                            disabled={isGenerating}
                          />
                          <button onClick={() => { if (input.trim()) handleSend(); }} disabled={isGenerating || !input.trim()}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0">
                            {t('writingMode.preciseGenerate')}
                          </button>
                        </div>
                        <p className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)]">
                          {t('writingMode.advancedGuide')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'style' && currentSession && (
                  <>
                    <StyleStudioView
                      language={language}
                      initialProfile={currentSession.config.styleProfile}
                      onProfileChange={(profile) => {
                        updateCurrentSession({
                          config: { ...currentSession.config, styleProfile: profile },
                        });
                      }}
                    />
                    {!showAiLock && (
                    <div className="max-w-6xl mx-auto px-4 pb-4">
                      <TabAssistant tab="style" language={language} config={currentSession.config} />
                    </div>
                    )}
                    <div className="max-w-6xl mx-auto px-4 pb-8 flex justify-end">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? t('ui.saved') : t('ui.saveSetting')}
                      </button>
                    </div>
                  </>
                )}
                {activeTab === 'manuscript' && currentSession && (
                  <ManuscriptView
                    language={language}
                    config={currentSession.config}
                    setConfig={setConfig}
                    messages={currentSession.messages}
                    onEditInStudio={(content) => {
                      setEditDraft(content);
                      setWritingMode('edit');
                      setActiveTab('writing');
                    }}
                  />
                )}
                {activeTab === 'history' && (() => {
                  const allSessions: (ChatSession & { _projectName?: string; _projectId?: string })[] = archiveScope === 'all'
                    ? projects.flatMap(p => p.sessions.map(s => ({ ...s, _projectName: p.name, _projectId: p.id })))
                    : sessions.map(s => ({ ...s, _projectName: currentProject?.name, _projectId: currentProjectId ?? undefined }));

                  const genres = Array.from(new Set(allSessions.map(s => s.config.genre)));
                  const hasWorldData = allSessions.some(s => s.config.worldSimData?.civs?.length);

                  const categories = [
                    { key: 'ALL', label: t('archive.all') },
                    ...genres.map(g => ({ key: g, label: g })),
                    ...(hasWorldData ? [{ key: 'WORLD', label: t('archive.world') }] : []),
                  ];

                  const filtered = allSessions.filter(s => {
                    if (archiveFilter === 'ALL') return true;
                    if (archiveFilter === 'WORLD') return (s.config.worldSimData?.civs?.length ?? 0) > 0;
                    return s.config.genre === archiveFilter;
                  }).sort((a, b) => b.lastUpdate - a.lastUpdate);

                  return (
                    <div className="p-4 md:p-10">
                      {/* Archive Header: scope toggle + category filter */}
                      <div className="mb-6 space-y-3">
                        {projects.length > 1 && (
                          <div className="flex gap-1.5">
                            <button onClick={() => setArchiveScope('project')} className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveScope === 'project' ? 'bg-accent-purple/20 border-accent-purple/30 text-accent-purple' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
                              {t('archive.currentProject')}
                            </button>
                            <button onClick={() => setArchiveScope('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveScope === 'all' ? 'bg-accent-purple/20 border-accent-purple/30 text-accent-purple' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
                              {t('archive.allProjects')}
                            </button>
                          </div>
                        )}
                        <div className="flex gap-1.5 flex-wrap">
                          {categories.map(cat => (
                            <button key={cat.key} onClick={() => setArchiveFilter(cat.key)} className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveFilter === cat.key ? 'bg-blue-600/15 border-blue-500/30 text-blue-400' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
                              {cat.label}
                              <span className="ml-1 text-[10px] opacity-50">
                                {cat.key === 'ALL' ? allSessions.length : cat.key === 'WORLD' ? allSessions.filter(s => (s.config.worldSimData?.civs?.length ?? 0) > 0).length : allSessions.filter(s => s.config.genre === cat.key).length}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Session Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {filtered.length === 0 ? (
                          <div className="col-span-full py-20 text-center text-text-tertiary font-bold uppercase tracking-widest font-[family-name:var(--font-mono)]">{t('engine.noArchive')}</div>
                        ) : (
                          filtered.map(s => (
                            <div
                              key={s.id}
                              onClick={() => {
                                if (s._projectId && s._projectId !== currentProjectId) setCurrentProjectId(s._projectId);
                                setCurrentSessionId(s.id);
                                setActiveTab('writing');
                              }}
                              className={`relative group p-6 bg-bg-secondary border border-border rounded-2xl cursor-pointer hover:border-accent-purple transition-all ${currentSessionId === s.id ? 'border-accent-purple ring-1 ring-accent-purple' : ''}`}
                            >
                              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 z-10">
                                <button onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title); }} aria-label="이름 변경" className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-all"><Edit3 className="w-3 h-3" /></button>
                                {projects.length > 1 && (
                                  <button onClick={(e) => {
                                    e.stopPropagation();
                                    const others = projects.filter(p => p.id !== (s._projectId || currentProjectId));
                                    if (others.length === 1) {
                                      moveSessionToProject(s.id, others[0].id);
                                    } else if (others.length > 1) {
                                      setMoveModal({ sessionId: s.id, others });
                                    }
                                  }} aria-label="이동" className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-all" title={t('project.moveSession')}><Upload className="w-3 h-3" /></button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handlePrint(s); }} aria-label="인쇄" className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-text-primary transition-all"><Printer className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} aria-label="삭제" className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-red transition-all"><X className="w-3 h-3" /></button>
                              </div>
                              {renamingSessionId === s.id ? (
                                <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingSessionId(null); }}
                                  onBlur={confirmRename} onClick={e => e.stopPropagation()}
                                  className="font-black text-sm mb-2 pr-16 w-full bg-transparent border-b border-accent-purple outline-none" />
                              ) : (
                                <h4 className="font-black text-sm mb-2 pr-16 truncate">{s.title}</h4>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[10px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">{s.config.genre}</span>
                                <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[10px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">EP.{s.config.episode}</span>
                                {s.messages.length > 0 && (
                                  <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[10px] font-bold text-zinc-600 font-[family-name:var(--font-mono)]">{s.messages.length} msg</span>
                                )}
                                {(s.config.worldSimData?.civs?.length ?? 0) > 0 && (
                                  <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-400 font-[family-name:var(--font-mono)]">
                                    {t('archive.worldLabel')} · {s.config.worldSimData!.civs!.length}
                                  </span>
                                )}
                                {archiveScope === 'all' && s._projectName && (
                                  <span className="px-1.5 py-0.5 bg-purple-900/20 border border-purple-500/15 rounded text-[10px] font-bold text-purple-400/70 font-[family-name:var(--font-mono)]">{s._projectName}</span>
                                )}
                              </div>
                              <div className="mt-2 text-[10px] text-zinc-600 font-[family-name:var(--font-mono)]">
                                {new Date(s.lastUpdate).toLocaleDateString(language === 'KO' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Genre×Level Reviewer Chat */}
                      {currentSession && (
                        <div className="mt-8">
                          <GenreReviewChat
                            language={language}
                            config={currentSession.config}
                            manuscriptText={currentSession.messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n')}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
                {activeTab === 'docs' && (
                  <StudioDocsView lang={language} />
                )}
              </>
            )}
          </div>

          {showDashboard && activeTab === 'writing' && currentSession && !showAiLock && (
            <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
          )}

          {/* 수동 모드 설정 참조 패널 — API 없을 때 집필 탭에서 표시 */}
          {activeTab === 'writing' && showAiLock && currentSession && (
            <aside className="hidden lg:flex w-72 shrink-0 flex-col border-l border-border bg-bg-primary overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-[family-name:var(--font-mono)]">
                  📋 {isKO ? '설정 참조' : 'Config Reference'}
                </div>

                {/* 시놉시스 */}
                {currentSession.config.synopsis && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-accent-amber uppercase tracking-wider font-[family-name:var(--font-mono)]">
                      {isKO ? '시놉시스' : 'Synopsis'}
                    </div>
                    <p className="text-[11px] leading-6 text-text-secondary whitespace-pre-wrap">{currentSession.config.synopsis}</p>
                  </div>
                )}

                {/* 세계관 핵심 */}
                {(currentSession.config.corePremise || currentSession.config.powerStructure || currentSession.config.currentConflict) && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-accent-blue uppercase tracking-wider font-[family-name:var(--font-mono)]">
                      {isKO ? '세계관' : 'World'}
                    </div>
                    {currentSession.config.corePremise && (
                      <p className="text-[11px] leading-6 text-text-secondary"><span className="text-text-tertiary">{isKO ? '핵심전제 · ' : 'Premise · '}</span>{currentSession.config.corePremise}</p>
                    )}
                    {currentSession.config.powerStructure && (
                      <p className="text-[11px] leading-6 text-text-secondary"><span className="text-text-tertiary">{isKO ? '권력구조 · ' : 'Power · '}</span>{currentSession.config.powerStructure}</p>
                    )}
                    {currentSession.config.currentConflict && (
                      <p className="text-[11px] leading-6 text-text-secondary"><span className="text-text-tertiary">{isKO ? '갈등 · ' : 'Conflict · '}</span>{currentSession.config.currentConflict}</p>
                    )}
                  </div>
                )}

                {/* 캐릭터 */}
                {currentSession.config.characters && currentSession.config.characters.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-accent-green uppercase tracking-wider font-[family-name:var(--font-mono)]">
                      {isKO ? '등장인물' : 'Characters'}
                    </div>
                    {currentSession.config.characters.slice(0, 5).map((c, i) => (
                      <div key={i} className="text-[11px] leading-6 text-text-secondary">
                        <span className="text-text-primary font-bold">{c.name}</span>
                        {c.role && <span className="text-text-tertiary"> · {c.role}</span>}
                        {c.traits && <span> — {c.traits.slice(0, 40)}{c.traits.length > 40 ? '…' : ''}</span>}
                      </div>
                    ))}
                    {currentSession.config.characters.length > 5 && (
                      <p className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)]">+{currentSession.config.characters.length - 5} more</p>
                    )}
                  </div>
                )}

                {/* 현재 에피소드 씬시트 */}
                {(() => {
                  const sheet = (currentSession.config.episodeSceneSheets || []).find(s => s.episode === currentSession.config.episode);
                  if (!sheet || sheet.scenes.length === 0) return null;
                  return (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-accent-purple uppercase tracking-wider font-[family-name:var(--font-mono)]">
                        {isKO ? `EP.${sheet.episode} 씬시트` : `EP.${sheet.episode} Scenes`}
                      </div>
                      {sheet.scenes.map((sc, i) => (
                        <div key={i} className="text-[11px] leading-6 text-text-secondary">
                          <span className="text-text-tertiary">{sc.sceneId} · </span>
                          <span>{sc.sceneName}</span>
                          {sc.summary && <span className="text-text-tertiary"> — {sc.summary.slice(0, 30)}{sc.summary.length > 30 ? '…' : ''}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 배경/POV */}
                <div className="space-y-1 border-t border-border pt-3">
                  <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
                    {isKO ? '기본 설정' : 'Basics'}
                  </div>
                  {currentSession.config.setting && (
                    <p className="text-[11px] leading-6 text-text-secondary"><span className="text-text-tertiary">{isKO ? '배경 · ' : 'Setting · '}</span>{currentSession.config.setting}</p>
                  )}
                  {currentSession.config.povCharacter && (
                    <p className="text-[11px] leading-6 text-text-secondary"><span className="text-text-tertiary">POV · </span>{currentSession.config.povCharacter}</p>
                  )}
                  {currentSession.config.primaryEmotion && (
                    <p className="text-[11px] leading-6 text-text-secondary"><span className="text-text-tertiary">{isKO ? '감정 · ' : 'Emotion · '}</span>{currentSession.config.primaryEmotion}</p>
                  )}
                </div>

              </div>
            </aside>
          )}

          {/* Right Panel — Save Slots (all tabs except writing) */}
          {activeTab !== 'history' && activeTab !== 'settings' && activeTab !== 'manuscript' && !(activeTab === 'writing' && writingMode === 'ai' && !showDashboard) && currentSession && (
            <aside className="hidden lg:flex w-64 shrink-0 flex-col border-l border-border bg-bg-primary overflow-y-auto">
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
                          updateCurrentSession({ config: { ...currentSession.config, ...slot.data } });
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

                    {/* ⑤ NOD 감독 */}
                    <DirectorPanel report={directorReport} language={language} />

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
                    <TabAssistant tab="writing" language={language} config={currentSession.config} />
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
      {moveModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setMoveModal(null)}>
          <div className="bg-bg-primary border border-border rounded-2xl p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase tracking-widest">{t('project.moveSession')}</h3>
            <select
              autoFocus
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-accent-purple"
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  moveSessionToProject(moveModal.sessionId, e.target.value);
                  setMoveModal(null);
                }
              }}
            >
              <option value="" disabled>{isKO ? '프로젝트 선택...' : 'Select project...'}</option>
              {moveModal.others.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button onClick={() => setMoveModal(null)} className="w-full py-2 text-xs font-black uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors">
              {isKO ? '취소' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Save Slot Name Modal */}
      {saveSlotModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSaveSlotModalOpen(false)}>
          <div className="bg-bg-primary border border-border rounded-2xl p-6 w-[360px] space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-text-primary">{t('saveSlot.enterSaveName')}</h3>
            <input
              autoFocus
              type="text"
              value={saveSlotName}
              onChange={e => setSaveSlotName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && saveSlotName.trim()) {
                  const slot: import('@/lib/studio-types').SavedSlot = {
                    id: `slot-${Date.now()}`,
                    name: saveSlotName.trim(),
                    tab: activeTab,
                    timestamp: Date.now(),
                    data: {
                      genre: currentSession?.config.genre,
                      title: currentSession?.config.title,
                      povCharacter: currentSession?.config.povCharacter,
                      setting: currentSession?.config.setting,
                      primaryEmotion: currentSession?.config.primaryEmotion,
                      synopsis: currentSession?.config.synopsis,
                      characters: currentSession?.config.characters,
                      charRelations: currentSession?.config.charRelations,
                      sceneDirection: currentSession?.config.sceneDirection,
                      worldSimData: currentSession?.config.worldSimData,
                      simulatorRef: currentSession?.config.simulatorRef,
                      styleProfile: currentSession?.config.styleProfile,
                      items: currentSession?.config.items,
                      skills: currentSession?.config.skills,
                      magicSystems: currentSession?.config.magicSystems,
                    },
                  };
                  updateCurrentSession({
                    config: { ...(currentSession?.config || INITIAL_CONFIG), savedSlots: [...(currentSession?.config.savedSlots || []), slot] },
                  });
                  triggerSave();
                  setSaveSlotModalOpen(false);
                }
                if (e.key === 'Escape') setSaveSlotModalOpen(false);
              }}
              placeholder={t('saveSlot.saveNamePlaceholder')}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-zinc-500 focus:outline-none focus:border-accent-purple"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSaveSlotModalOpen(false)} className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors">
                {t('confirm.cancel')}
              </button>
              <button
                disabled={!saveSlotName.trim()}
                onClick={() => {
                  if (!saveSlotName.trim()) return;
                  const slot: import('@/lib/studio-types').SavedSlot = {
                    id: `slot-${Date.now()}`,
                    name: saveSlotName.trim(),
                    tab: activeTab,
                    timestamp: Date.now(),
                    data: {
                      genre: currentSession?.config.genre,
                      title: currentSession?.config.title,
                      povCharacter: currentSession?.config.povCharacter,
                      setting: currentSession?.config.setting,
                      primaryEmotion: currentSession?.config.primaryEmotion,
                      synopsis: currentSession?.config.synopsis,
                      characters: currentSession?.config.characters,
                      charRelations: currentSession?.config.charRelations,
                      sceneDirection: currentSession?.config.sceneDirection,
                      worldSimData: currentSession?.config.worldSimData,
                      simulatorRef: currentSession?.config.simulatorRef,
                      styleProfile: currentSession?.config.styleProfile,
                      items: currentSession?.config.items,
                      skills: currentSession?.config.skills,
                      magicSystems: currentSession?.config.magicSystems,
                    },
                  };
                  updateCurrentSession({
                    config: { ...(currentSession?.config || INITIAL_CONFIG), savedSlots: [...(currentSession?.config.savedSlots || []), slot] },
                  });
                  triggerSave();
                  setSaveSlotModalOpen(false);
                }}
                className="px-4 py-2 bg-accent-purple text-white rounded-lg text-xs font-bold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('saveSlot.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UX: Sync reminder (every 2 hours) */}
      {showSyncReminder && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-blue-900/95 border border-blue-600 text-blue-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-lg">
          <span className="text-sm">
            {user
              ? `${t('syncReminder.lastSyncPrefix')}${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString(language === 'KO' ? 'ko-KR' : language === 'JP' ? 'ja-JP' : language === 'CN' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : t('syncReminder.never')}${t('syncReminder.lastSyncSuffix')}`
              : t('syncReminder.browserOnly')}
          </span>
          {user ? (
            <button
              onClick={() => { setShowSyncReminder(false); handleSync(); }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md shrink-0 transition-colors"
            >
              {t('syncReminder.sync')}
            </button>
          ) : (
            <button
              onClick={() => { setShowSyncReminder(false); signInWithGoogle(); }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md shrink-0 transition-colors"
            >
              {t('syncReminder.signIn')}
            </button>
          )}
          <button onClick={() => setShowSyncReminder(false)} className="text-blue-400 hover:text-blue-200 shrink-0" aria-label={t('ui.close')}>&times;</button>
        </div>
      )}

      {/* UX: Storage full warning */}
      {storageFull && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-900/95 border border-yellow-600 text-yellow-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
          <span className="text-sm">{t('ui.storageFull')}</span>
          <button onClick={() => setStorageFull(false)} className="text-yellow-400 hover:text-yellow-200 shrink-0" aria-label={t('ui.close')}>&times;</button>
        </div>
      )}

      {/* UX: World import from Network banner */}
      {worldImportBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-900/95 border border-emerald-600 text-emerald-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
          <Globe className="w-4 h-4 shrink-0" />
          <span className="text-sm">{isKO ? 'Network에서 세계관을 불러왔습니다' : 'World imported from Network'}</span>
          <button onClick={() => setWorldImportBanner(false)} className="text-emerald-400 hover:text-emerald-200 shrink-0" aria-label="close">&times;</button>
        </div>
      )}

      {/* UX: Error Toast */}
      {uxError && (
        <ErrorToast
          error={uxError.error}
          language={language}
          onDismiss={() => setUxError(null)}
          onRetry={uxError.retry ? () => { setUxError(null); uxError.retry?.(); } : undefined}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
