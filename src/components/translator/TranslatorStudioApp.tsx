'use client';

import { TranslatorContext } from './core/TranslatorContext';
import { TranslatorShell } from './TranslatorShell';
import { ChangeEvent, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Key } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/LangContext';
import { getApiKey, hasDgxService, setServerDgxCache, type ProviderId } from '@/lib/ai-providers';
import type { AppLanguage } from '@/lib/studio-types';
// APIKeySlotManager moved to TranslatorModals
import { logger } from '@/lib/logger';
import {
  loadProjectFromCloud,
  saveProjectToCloud,
  listUserProjects,
  supabaseAnonKey,
  supabaseUrl,
} from '@/lib/supabase';
import { useAppDialog } from '@/hooks/useAppDialog';
import { TranslatorModals } from './TranslatorModals';
import {
  PROJECT_LIBRARY_KEY,
  MAX_LOCAL_PROJECTS,
  REFERENCE_TEXT_LIMIT,
  STORY_BIBLE_LIMIT,
  PROVIDERS,
  WORKSPACE_TAB_STORAGE_KEY,
  type WorkspaceTab,
  type TranslatorBackgroundMode,
  normalizeTranslatorBackgroundMode,
} from '@/lib/translator-constants';
import {
  limitText,
  normalizeChapter,
  normalizeProjectSnapshots,
  mergeProjectSnapshots,
  toProjectMeta,
  projectFingerprint,
  mergeStoryBible,
  buildReferenceBundle,
  splitTextIntoChunks,
} from '@/lib/project-normalize';
import { getGlossaryManager } from '@/lib/translation/glossary-manager';
import {
  buildProjectTranslationContext,
  type TranslationProjectContext,
} from '@/lib/translation/project-bridge';
import type {
  ChapterEntry,
  ProjectSnapshot,
  HistoryEntry,
  StyleHeuristicAnalysis,
  DomainPreset,
} from '@/types/translator';
// Phase 1-7 RAG/Memory/Voice integration — bypassed by direct /api/translate fetch
// before this repair. Now composed into payload.context to ensure /translation-studio
// independent route benefits from the same pipeline as the studio panel.
import { buildRAGTranslationContext, type RAGTranslationContext } from '@/services/ragService';
import { formatRAGBlock } from '@/engine/translation';
import {
  getOrCreateGraph,
  buildMemoryPromptHint,
  detectTermDrift,
  updateMemoryFromTranslation,
  saveGraphLocal,
  type EpisodeMemoryGraph,
  type TermDriftWarning,
} from '@/lib/translation/episode-memory';

const AI_STORE_PROVIDER_IDS = new Set<ProviderId>([
  'gemini',
  'openai',
  'claude',
  'groq',
  'mistral',
  'ollama',
  'lmstudio',
]);

const TRANSLATOR_API_BANNER_DISMISSED_KEY = 'eh_translator_api_banner_dismissed';

export default function TranslatorStudioApp() {
  const { dialog, alert, confirm, dismiss, confirmYes, alertOk } = useAppDialog();
  const { loading: authLoading, userId, user: authUser, signInWithGoogle, signOut, getIdToken } = useAuth();
  const { lang } = useLang();
  const langKo = lang === 'ko';
  const isAuthLoaded = !authLoading;
  const isHydrated = useRef(false);
  const chapterAsideRef = useRef<HTMLElement>(null);
  const contextAsideRef = useRef<HTMLElement>(null);
  const networkSectionRef = useRef<HTMLDivElement>(null);

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(() => {
    if (typeof window === 'undefined') return 'translate';
    try {
      const raw = sessionStorage.getItem(WORKSPACE_TAB_STORAGE_KEY);
      if (raw === 'translate' || raw === 'chapters' || raw === 'context' || raw === 'network') return raw;
    } catch {
      /* ignore */
    }
    return 'translate';
  });
  const [hostedGemini, setHostedGemini] = useState(false);
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
  
  // App States
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
  const [compareResultB, setCompareResultB] = useState('');
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chapters' | 'context'>('chapters');
  const [showExportOptions, setShowExportOptions] = useState(false);

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
  const [_glossaryVersion, setGlossaryVersion] = useState(() => glossaryManagerRef.current.version);

  // ── Phase 1-7 Pipeline: project context for RAG / Voice / Episode Memory ──
  // [C] null-safe — 단독 실행에서도 동작 (?from 없으면 null 유지)
  // 이 컨텍스트가 있으면 fetch 페이로드에 RAG block + memory hint 자동 주입
  const [projectContext, setProjectContext] = useState<TranslationProjectContext | null>(null);
  const [driftWarnings, setDriftWarnings] = useState<TermDriftWarning[]>([]);
  const projectContextRef = useRef<TranslationProjectContext | null>(null);
  projectContextRef.current = projectContext;
  const memoryGraphRef = useRef<EpisodeMemoryGraph | null>(null);

  // Sync: glossary state → GlossaryManager (when user edits via setGlossary)
  useEffect(() => {
    const mgr = glossaryManagerRef.current;
    const current = mgr.toRecord();
    const keys = new Set([...Object.keys(current), ...Object.keys(glossary)]);
    let differs = false;
    for (const k of keys) {
      if (current[k] !== glossary[k]) { differs = true; break; }
    }
    if (differs) {
      mgr.setAll(glossary);
    }
  }, [glossary]);

  // [Phase 1-7] drift 경고 → status bar 알림 (UI 확장 여지 보존)
  // [C] driftWarnings 비어있을 땐 statusMsg 변조하지 않음
  useEffect(() => {
    if (driftWarnings.length === 0) return;
    const t = window.setTimeout(() => {
      setStatusMsg(`DRIFT ${driftWarnings.length}건 감지 — 콘솔 확인`);
    }, 80);
    return () => window.clearTimeout(t);
  }, [driftWarnings]);

  // [Phase 1-7] projectContext 디버그 신호 — 향후 UI 패널 연결 대기
  useEffect(() => {
    if (!projectContext) return;
    logger.info(
      'TranslatorStudioApp',
      `[Pipeline] projectContext loaded: chars=${projectContext.characters.length}, glossary=${projectContext.glossary.length}, episodes=${projectContext.recentEpisodes.length}`,
    );
  }, [projectContext]);

  // Sync: GlossaryManager → glossary state + version (when manager fires onChange)
  useEffect(() => {
    const mgr = glossaryManagerRef.current;
    const unsub = mgr.onChange((v) => {
      setGlossaryVersion(v);
      setGlossary(mgr.toRecord());
      // Also update glossaryText for the translation payload
      const injection = mgr.getPromptInjection();
      if (injection) {
        setGlossaryText(injection);
      }
    });
    return unsub;
  }, []);

  const patchChapterAtIndex = useCallback((index: number, patch: Record<string, unknown>) => {
    setChapters((previous) => {
      if (!previous[index]) return previous;

      const currentChapter = previous[index];
      const currentChapterRecord = currentChapter as Record<string, unknown>;
      const shouldUpdate = Object.entries(patch).some(([key, value]) => currentChapterRecord[key] !== value);
      if (!shouldUpdate) return previous;

      const next = [...previous];
      next[index] = { ...currentChapter, ...patch };
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
    if (provider === 'gemini' && hostedGemini) return true;
    if (hasDgxService()) return true;
    return false;
  }, [provider, hostedGemini, getEffectiveApiKeyForProvider]);

  const _studioLanguage: AppLanguage = useMemo(() => {
    if (lang === 'ko') return 'KO';
    if (lang === 'ja') return 'JP';
    if (lang === 'zh') return 'CN';
    return 'EN';
  }, [lang]);

  const openApiKeyModal = useCallback(() => setShowApiKeyModal(true), []);

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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/ai-capabilities', { cache: 'no-store' });
        const data = (await res.json()) as { hosted?: Partial<Record<ProviderId, boolean>>; hasDgx?: boolean };
        if (!cancelled) {
          const h = data.hosted ?? {};
          setHostedProviders(h);
          setHostedGemini(Boolean(h.gemini));
          if (data.hasDgx) setServerDgxCache(true);
          setAiCapabilitiesLoaded(true);
        }
      } catch (e) {
        logger.warn('TranslatorStudioApp', 'ai-capabilities fetch failed', e);
        if (!cancelled) setAiCapabilitiesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (tab === 'network') {
        networkSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [isZenMode],
  );

  useEffect(() => {
    const savedState = localStorage.getItem('eh_translator_ui_state');
    const savedProjectLibrary = localStorage.getItem(PROJECT_LIBRARY_KEY);
    if (!savedState) {
      if (savedProjectLibrary) {
        try {
          setProjectList(normalizeProjectSnapshots(JSON.parse(savedProjectLibrary)));
        } catch (error) {
          logger.error('TranslatorStudioApp', 'Failed to restore project library', error);
        }
      }
      isHydrated.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(savedState);
      const restoredProjects = normalizeProjectSnapshots(
        savedProjectLibrary ? JSON.parse(savedProjectLibrary) : parsed.projectList
      );
      if (parsed.projectId !== undefined) setProjectId(parsed.projectId);
      if (parsed.projectName !== undefined) setProjectName(parsed.projectName);
      if (restoredProjects.length) setProjectList(restoredProjects);
      if (parsed.chapters !== undefined && Array.isArray(parsed.chapters)) {
        setChapters(parsed.chapters.map((chapter: Partial<ChapterEntry>, index: number) => normalizeChapter(chapter, `Part ${index + 1}`)));
      }
      if (parsed.activeChapterIndex !== undefined) setActiveChapterIndex(parsed.activeChapterIndex);
      if (parsed.source !== undefined) setSource(parsed.source);
      if (parsed.result !== undefined) setResult(parsed.result);
      if (parsed.from !== undefined) setFrom(parsed.from);
      if (parsed.to !== undefined) setTo(parsed.to);
      if (parsed.provider !== undefined) setProvider(parsed.provider);
      if (parsed.history !== undefined) setHistory(parsed.history);
      if (parsed.isZenMode !== undefined) setIsZenMode(parsed.isZenMode);
      if (parsed.backgroundMode !== undefined) {
        setBackgroundMode(normalizeTranslatorBackgroundMode(parsed.backgroundMode));
      }
      if (parsed.isCatMode !== undefined) setIsCatMode(parsed.isCatMode);
      if (parsed.translationMode !== undefined) setTranslationMode(parsed.translationMode);
      if (parsed.worldContext !== undefined) setWorldContext(parsed.worldContext);
      if (parsed.characterProfiles !== undefined) setCharacterProfiles(parsed.characterProfiles);
      if (parsed.storySummary !== undefined) setStorySummary(parsed.storySummary);
      if (parsed.referenceIds !== undefined) setReferenceIds(parsed.referenceIds);
      if (parsed.glossaryText !== undefined) setGlossaryText(parsed.glossaryText);
      if (parsed.glossary !== undefined && typeof parsed.glossary === 'object' && parsed.glossary !== null && !Array.isArray(parsed.glossary)) {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed.glossary as Record<string, unknown>)) {
          if (typeof k === 'string' && typeof v === 'string' && k.trim()) next[k.trim()] = v;
        }
        if (Object.keys(next).length) setGlossary(next);
      }
      if (parsed.domainPreset !== undefined) setDomainPreset(parsed.domainPreset);
      if (parsed.preserveDialogueLayout !== undefined) setPreserveDialogueLayout(parsed.preserveDialogueLayout);
      if (parsed.apiKeys !== undefined && typeof parsed.apiKeys === 'object' && parsed.apiKeys !== null && !Array.isArray(parsed.apiKeys)) {
        const nextKeys: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed.apiKeys as Record<string, unknown>)) {
          if (typeof k === 'string' && typeof v === 'string') nextKeys[k] = v;
        }
        if (Object.keys(nextKeys).length) setApiKeys(nextKeys);
      }
    } catch (error) {
      logger.error('TranslatorStudioApp', 'Failed to restore state', error);
    } finally {
      isHydrated.current = true;
    }
  }, []);

  // [창작→번역 파이프라인] Studio 세션에서 원고 + 프로젝트 컨텍스트 자동 로드
  // URL query: ?from=<sessionId> — Studio에서 번역 스튜디오로 진입 시
  // 번역 스튜디오는 독립 라우트라 StudioContext와 단절. localStorage에서 직접 읽고
  // project-bridge로 변환하여 worldContext/characterProfiles/glossary 자동 채움.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromSessionId = params.get('from');
    if (!fromSessionId) return;

    try {
      // Studio가 사용하는 localStorage 키에서 세션 데이터 읽기
      const projectsRaw = localStorage.getItem('noa_projects');
      if (!projectsRaw) return;
      const projects = JSON.parse(projectsRaw) as Array<{
        id?: string;
        name?: string;
        sessions?: Array<{ id: string; config?: Record<string, unknown> }>;
      }>;
      let matchedSession: { id: string; config?: Record<string, unknown> } | null = null;
      let matchedProject: { id?: string; name?: string } | null = null;
      for (const proj of projects) {
        const sess = proj.sessions?.find(s => s.id === fromSessionId);
        if (sess) {
          matchedSession = sess;
          matchedProject = proj;
          break;
        }
      }
      if (!matchedSession?.config) return;

      const sessConfig = matchedSession.config as { manuscripts?: Array<{ episode: number; content: string; title?: string }> };
      const matchedManuscripts = sessConfig.manuscripts;

      // 첫 에피소드를 source에 자동 주입
      if (Array.isArray(matchedManuscripts) && matchedManuscripts.length > 0) {
        const sorted = [...matchedManuscripts].sort((a, b) => a.episode - b.episode);
        const first = sorted[0];
        if (first?.content) setSource(first.content);
      }

      // [Project Bridge] StoryConfig → 번역 컨텍스트 자동 추출
      const projectCtx = buildProjectTranslationContext(
        {
          id: matchedProject?.id || fromSessionId,
          title: matchedProject?.name,
          config: matchedSession.config,
        },
        { sourceLang: 'KO' }
      );

      if (projectCtx) {
        // [Phase 1-7 연결] projectContext state 보존 — RAG / Voice / Memory 파이프라인 입구
        setProjectContext(projectCtx);
        // [C] localStorage 그래프 1회 로드 — 후속 번역에서 drift 감지 + 업데이트에 사용
        memoryGraphRef.current = projectCtx.projectId
          ? getOrCreateGraph(projectCtx.projectId)
          : null;

        // worldBible → worldContext (텍스트 형식)
        if (projectCtx.worldBible) setWorldContext(projectCtx.worldBible);
        // characters → characterProfiles (텍스트 형식)
        if (projectCtx.characters.length > 0) {
          const profileText = projectCtx.characters
            .map(c => {
              const reg = c.register;
              const lines = [`## ${c.name}`];
              if (c.aliases.length > 0) lines.push(`- 별칭: ${c.aliases.join(', ')}`);
              if (reg?.role) lines.push(`- 역할: ${reg.role}`);
              if (reg?.age) lines.push(`- 연령: ${reg.age}`);
              if (reg?.tone) lines.push(`- 말투: ${reg.tone}`);
              if (reg?.speechHint) lines.push(`- 말투 예시: ${reg.speechHint}`);
              return lines.join('\n');
            })
            .join('\n\n');
          setCharacterProfiles(profileText);
        }
        // glossary (locked entries만) → record 형식 + 텍스트
        if (projectCtx.glossary.length > 0) {
          const glossRecord: Record<string, string> = {};
          for (const g of projectCtx.glossary) {
            if (g.target) glossRecord[g.source] = g.target;
            else glossRecord[g.source] = g.source; // alias / locked-only
          }
          if (Object.keys(glossRecord).length > 0) setGlossary(glossRecord);
        }
        // projectName 자동 채움 (비어있을 때만)
        if (projectCtx.projectTitle) {
          setProjectName(prev => prev || projectCtx.projectTitle);
        }
      }

      // URL 정리 (?from 제거) — history 오염 방지
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } catch (err) {
      logger.warn('TranslatorStudioApp', 'failed to import studio session via project-bridge', err);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated.current) return;

    const timeout = window.setTimeout(() => {
      localStorage.setItem('eh_translator_ui_state', JSON.stringify({
        projectId,
        projectName,
        chapters,
        activeChapterIndex,
        source,
        result,
        from,
        to,
        provider,
        history,
        isZenMode,
        backgroundMode,
        isCatMode,
        translationMode,
        worldContext,
        characterProfiles,
        storySummary,
        referenceIds,
        glossaryText,
        glossary,
        domainPreset,
        preserveDialogueLayout,
        apiKeys,
      }));
      setLastSavedAt(Date.now());
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [projectId, projectName, chapters, activeChapterIndex, source, result, from, to, provider, history, isZenMode, backgroundMode, isCatMode, translationMode, worldContext, characterProfiles, storySummary, referenceIds, glossaryText, glossary, domainPreset, preserveDialogueLayout, apiKeys]);

  useEffect(() => {
    if (!isHydrated.current) return;

    const timeout = window.setTimeout(() => {
      localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(projectList));
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [projectList]);

  // Sync current editor to chapters array to prevent data loss
  useEffect(() => {
    if (!isHydrated.current || activeChapterIndex === null) return;
    
    // 챕터가 전환되었을 경우, source가 갱신될 때까지 동기화를 1회 지연시킵니다. (Race Condition 방지)
    if (activeChapterIndex !== prevActiveChapterIndex.current) {
      prevActiveChapterIndex.current = activeChapterIndex;
      return;
    }

    const activeChapter = chapters[activeChapterIndex];
    if (!activeChapter) return;
    if (activeChapter.content === source && activeChapter.result === result) return;

    const timeout = window.setTimeout(() => {
      patchActiveChapter({ content: source, result });
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [source, result, activeChapterIndex, chapters, patchActiveChapter]);

  useEffect(() => {
    if (!isHydrated.current) return;

    const hasMeaningfulData =
      Boolean(projectName.trim()) ||
      Boolean(chapters.length) ||
      Boolean(worldContext.trim()) ||
      Boolean(characterProfiles.trim()) ||
      Boolean(storySummary.trim());

    if (!hasMeaningfulData) return;

    const snapshotBase = {
      id: projectId,
      project_name: projectName.trim() || `Project ${projectId.slice(-4)}`,
      chapters: chapters.map((chapter, index) => normalizeChapter(chapter, `Part ${index + 1}`)),
      worldContext,
      characterProfiles,
      storySummary,
      from,
      to,
    } satisfies Omit<ProjectSnapshot, 'updated_at'>;

    setProjectList(prev => {
      const existingIndex = prev.findIndex((project) => project.id === projectId);
      const nextFingerprint = projectFingerprint(snapshotBase);
      const existingFingerprint =
        existingIndex >= 0
          ? projectFingerprint({
              id: prev[existingIndex].id,
              project_name: prev[existingIndex].project_name,
              chapters: prev[existingIndex].chapters,
              worldContext: prev[existingIndex].worldContext,
              characterProfiles: prev[existingIndex].characterProfiles,
              storySummary: prev[existingIndex].storySummary,
              from: prev[existingIndex].from,
              to: prev[existingIndex].to,
            })
          : '';

      if (existingFingerprint === nextFingerprint) return prev;

      const nextSnapshot: ProjectSnapshot = {
        ...snapshotBase,
        updated_at: Date.now(),
      };

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = nextSnapshot;
        return next.sort((left, right) => right.updated_at - left.updated_at);
      }

      return [nextSnapshot, ...prev].slice(0, MAX_LOCAL_PROJECTS);
    });
  }, [projectId, projectName, chapters, worldContext, characterProfiles, storySummary, from, to]);

  useEffect(() => {
    if (!isHydrated.current) return;

    setReferenceIds((previous) =>
      previous.filter((referenceId) => referenceId !== projectId && projectList.some((project) => project.id === referenceId))
    );
  }, [projectId, projectList]);

  useEffect(() => {
    if (!isHydrated.current || !isAuthLoaded || !userId || !supabaseUrl || !supabaseAnonKey) return;

    let cancelled = false;

    const loadCloudProjects = async () => {
      try {
        const metadata = await listUserProjects(userId);
        if (!metadata.length || cancelled) return;

        const loadedProjects = await Promise.all(
          metadata.slice(0, MAX_LOCAL_PROJECTS).map(async (projectMeta: { id: string; projectName?: string; updatedAt?: string }) => {
            const projectData = await loadProjectFromCloud(userId, projectMeta.id);
            if (!projectData) return null;

            const normalized = normalizeProjectSnapshots([
              {
                id: projectMeta.id,
                project_name: projectMeta.projectName,
                updated_at: projectMeta.updatedAt ? Date.parse(projectMeta.updatedAt) : Date.now(),
                ...projectData,
              },
            ]);

            return normalized[0] || null;
          })
        );

        if (cancelled) return;

        const availableProjects = loadedProjects.filter((project): project is ProjectSnapshot => Boolean(project));
        if (!availableProjects.length) return;

        setProjectList((previous) => mergeProjectSnapshots(previous, availableProjects));
      } catch (error) {
        logger.error('TranslatorStudioApp', 'Failed to load cloud projects', error);
      }
    };

    loadCloudProjects();

    return () => {
      cancelled = true;
    };
  }, [isAuthLoaded, userId]);

  useEffect(() => {
    if (!isHydrated.current || !isAuthLoaded || !userId || !supabaseUrl || !supabaseAnonKey) return;

    const hasMeaningfulData =
      Boolean(projectName.trim()) ||
      Boolean(chapters.length) ||
      Boolean(worldContext.trim()) ||
      Boolean(characterProfiles.trim()) ||
      Boolean(storySummary.trim());

    if (!hasMeaningfulData) return;

    const timeout = window.setTimeout(async () => {
      setCloudSyncStatus('saving');
      setCloudSyncDetail('동기화 중…');
      try {
        const { error } = await saveProjectToCloud(userId, projectId, {
          projectId,
          projectName,
          chapters,
          activeChapterIndex,
          source,
          result,
          from,
          to,
          worldContext,
          characterProfiles,
          storySummary,
          referenceIds,
          translationMode,
          glossaryText,
          glossary,
          domainPreset,
          preserveDialogueLayout,
        });
        if (error && error !== 'DB_DISABLED') {
          setCloudSyncStatus('error');
          const msg =
            typeof error === 'object' && error !== null && 'message' in error
              ? String((error as { message?: string }).message)
              : '클라우드 저장 실패';
          setCloudSyncDetail(msg);
        } else {
          setCloudSyncStatus('ok');
          setCloudSyncDetail(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (error) {
        logger.error('TranslatorStudioApp', 'Failed to save project to cloud', error);
        setCloudSyncStatus('error');
        setCloudSyncDetail(error instanceof Error ? error.message : '클라우드 저장 실패');
      }
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [
    isAuthLoaded,
    userId,
    projectId,
    projectName,
    chapters,
    activeChapterIndex,
    source,
    result,
    from,
    to,
    worldContext,
    characterProfiles,
    storySummary,
    referenceIds,
    translationMode,
    glossaryText,
    glossary,
    domainPreset,
    preserveDialogueLayout,
  ]);

  const readStreamText = async (res: Response, onDelta: (s: string) => void) => {
    const reader = res.body?.getReader();
    if (!reader) return await res.text();
    const dec = new TextDecoder();
    let acc = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += dec.decode(value, { stream: true });
      onDelta(acc);
    }
    return acc;
  };

  const requestTranslation = async (
    payload: Record<string, unknown>,
    options?: { stream?: boolean; onDelta?: (s: string) => void }
  ) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const tok = await getIdToken();
      if (tok) headers.Authorization = `Bearer ${tok}`;
    } catch {
      /* ignore */
    }
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const approx = res.headers.get('x-approx-prompt-tokens');
    if (approx) setLastApproxTokens(parseInt(approx, 10));

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      if (contentType.includes('application/json')) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
      }

      throw new Error((await res.text()) || '요청 처리 중 오류가 발생했습니다.');
    }

    if (contentType.includes('application/json')) {
      const data = (await res.json()) as { result?: string };
      return data.result || '';
    }

    if (options?.stream && options?.onDelta) {
      return readStreamText(res, options.onDelta);
    }

    return res.text();
  };

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

  const buildEpisodeContext = (chapterIndex = activeChapterIndex) => {
    const continuityBlocks: string[] = [];

    if (chapterIndex !== null && chapterIndex > 0 && chapters[chapterIndex - 1]) {
      const previousChapter = chapters[chapterIndex - 1];
      const previousChapterText = (previousChapter.result || previousChapter.content).trim();

      if (previousChapterText) {
        continuityBlocks.push(
          `[현재 프로젝트 이전 화 / ${previousChapter.name}]\n${limitText(previousChapterText, 5000)}`
        );
      }
    }

    if (referenceBundle.episodeContext) {
      continuityBlocks.push(referenceBundle.episodeContext);
    }

    return limitText(continuityBlocks.join('\n\n---\n\n'), REFERENCE_TEXT_LIMIT);
  };

  const buildContinuityBundle = (storySummaryBase = storySummary, chapterIndex = activeChapterIndex) => ({
    context: limitText([worldContext.trim(), referenceBundle.context].filter(Boolean).join('\n\n'), 6500),
    characterProfiles: limitText(
      [characterProfiles.trim(), referenceBundle.characterProfiles].filter(Boolean).join('\n\n'),
      6500
    ),
    storySummary: limitText(
      [storySummaryBase.trim(), referenceBundle.storySummary].filter(Boolean).join('\n\n'),
      STORY_BIBLE_LIMIT
    ),
    continuityNotes: referenceBundle.continuityNotes,
    episodeContext: buildEpisodeContext(chapterIndex),
  });

  const buildTranslationPayload = (
    payload: Record<string, unknown>,
    options?: { storySummaryBase?: string; chapterIndex?: number | null }
  ) => {
    const continuity = buildContinuityBundle(options?.storySummaryBase, options?.chapterIndex ?? activeChapterIndex);

    return {
      tone: 'natural',
      genre: translationMode === 'novel' ? 'Novel' : 'General',
      context: continuity.context,
      characterProfiles: continuity.characterProfiles,
      storySummary: continuity.storySummary,
      continuityNotes: continuity.continuityNotes,
      episodeContext: continuity.episodeContext,
      referenceIds,
      glossary: glossaryManagerRef.current.getPromptInjection() || glossaryText.trim() || undefined,
      domainPreset: translationMode === 'general' ? domainPreset : 'general',
      preserveDialogueLayout: translationMode === 'novel' ? preserveDialogueLayout : false,
      ...payload,
    };
  };

  // ── Phase 1-7 RAG/Memory 페이로드 강화 ──
  // [C] projectContext null 가드 — ?from 없이 진입했으면 그대로 통과 (fallback)
  // [C] RAG 실패해도 silent — 번역 자체는 항상 진행
  // [G] sourceText 짧을 때 RAG 호출 스킵 (의미없는 컨텍스트 회피)
  // [K] context 필드에 [RAG block] + [Memory hint] prepend — buildPrompt 추가 변경 불필요
  const enrichPayloadWithPipeline = useCallback(async (
    payload: Record<string, unknown>,
    sourceText: string,
    chapterIndex: number | null,
  ): Promise<Record<string, unknown>> => {
    const ctx = projectContextRef.current;
    if (!ctx?.projectId || !sourceText || sourceText.trim().length < 50) {
      return payload;
    }

    const targetLangNorm = ((): 'KO' | 'EN' | 'JP' | 'CN' => {
      const t = String(payload.to ?? to ?? '').toLowerCase();
      if (t === 'ja' || t === 'jp') return 'JP';
      if (t === 'zh' || t === 'cn') return 'CN';
      if (t === 'en') return 'EN';
      return 'KO';
    })();

    const blocks: string[] = [];
    // 1) RAG: ChromaDB 99만 문서 + 25 장르 규칙
    try {
      const ragCtx: RAGTranslationContext = await buildRAGTranslationContext(
        {
          projectId: ctx.projectId,
          sourceText: sourceText.slice(0, 8000),
          characterNames: ctx.characters.map(c => c.name).filter(Boolean),
          targetGenre: ctx.genre,
          targetLang: targetLangNorm,
          episodeNo: typeof chapterIndex === 'number' ? chapterIndex + 1 : undefined,
        },
        { timeoutMs: 5000 },
      );
      const ragBlock = formatRAGBlock(ragCtx);
      if (ragBlock) blocks.push(ragBlock);
    } catch (err) {
      logger.warn('TranslatorStudioApp', 'RAG context fetch failed (silent fallback)', err);
    }

    // 2) Episode Memory hint — 기존 canonical 매핑 보강
    const memHint = buildMemoryPromptHint(memoryGraphRef.current);
    if (memHint) blocks.push(memHint);

    if (blocks.length === 0) return payload;

    const prevContext = typeof payload.context === 'string' ? payload.context : '';
    const merged = [blocks.join('\n\n'), prevContext].filter(Boolean).join('\n\n');
    return { ...payload, context: merged };
  }, [to]);

  // ── 번역 완료 후 Episode Memory + drift 추적 ──
  // [C] projectContext / memoryGraph null 가드 — 단독 실행 안전
  // [C] glossary 매핑이 실제 출력에 등장할 때만 기록 — false-positive drift 방지
  // [K] saveGraphLocal quota fail 무시
  const recordEpisodeMemory = useCallback((
    sourceText: string,
    translatedText: string,
    chapterIndex: number | null,
  ) => {
    const ctx = projectContextRef.current;
    const graph = memoryGraphRef.current;
    if (!ctx || !graph || !translatedText) return;

    const epNo = typeof chapterIndex === 'number' && chapterIndex >= 0 ? chapterIndex + 1 : 0;
    const lowerOut = translatedText.toLowerCase();

    // glossary record(현재 컴포넌트 상태) → drift 입력 형식
    const newPairs = Object.entries(glossary)
      .filter(([src, tgt]) => src && tgt && lowerOut.includes(tgt.toLowerCase()))
      .map(([source, target]) => ({
        source,
        target,
        episodeNo: epNo,
        isCharacter: ctx.characters.some(c =>
          c.name === source || (c.aliases ?? []).includes(source),
        ),
      }));

    if (newPairs.length === 0) return;

    // drift 감지 (기존 canonical 과 다른 번역 시도 포착)
    const warnings = detectTermDrift(graph, newPairs);
    if (warnings.length > 0) {
      setDriftWarnings(warnings);
      logger.warn('TranslatorStudioApp', 'Term drift detected', warnings);
    }

    // 메모리 그래프 업데이트 + 영속화
    const updated = updateMemoryFromTranslation(graph, newPairs);
    memoryGraphRef.current = updated;
    saveGraphLocal(updated);
  }, [glossary]);

  const updateStoryBibleAfterTranslation = async (options: {
    translatedText: string;
    chapterName: string;
    chapterIndex?: number | null;
    storySummaryBase?: string;
  }) => {
    const { translatedText, chapterName, chapterIndex = activeChapterIndex, storySummaryBase = storySummary } = options;

    if (translationMode !== 'novel' || !translatedText.trim()) {
      return storySummaryBase;
    }

    const summaryProvider =
      (getEffectiveApiKeyForProvider('gemini') && 'gemini') ||
      (getEffectiveApiKeyForProvider('openai') && 'openai') ||
      (getEffectiveApiKeyForProvider('claude') && 'claude') ||
      provider;

    const requestId = ++storyBibleRequestCounter.current;
    setStatusMsg('UPDATING STORY BIBLE');

    try {
      const summary = await requestTranslation(
        buildTranslationPayload(
          {
            text: `[${chapterName}]\n\n${translatedText}`,
            from: to,
            to,
            provider: summaryProvider,
            apiKey: getEffectiveApiKeyForProvider(summaryProvider),
            stage: 10,
            mode: 'novel',
          },
          { storySummaryBase, chapterIndex }
        )
      );

      const mergedStoryBible = mergeStoryBible(storySummaryBase, summary);

      if (storyBibleRequestCounter.current === requestId) {
        setStorySummary(mergedStoryBible);
      }

      if (chapterIndex !== null && typeof chapterIndex === 'number') {
        patchChapterAtIndex(chapterIndex, { storyNote: summary.trim() });
      }

      return mergedStoryBible;
    } catch (error) {
      logger.error('TranslatorStudioApp', 'Story Bible update failed', error);
      return storySummaryBase;
    }
  };

  // Core Actions
  const translate = async () => {
    if (!source.trim()) return;
    const now = Date.now();
    if (now - lastPrimaryTranslateAt.current < 800) return;
    lastPrimaryTranslateAt.current = now;
    setLoading(true);
    setStatusMsg('FAST DRAFT');
    try {
      const enriched = await enrichPayloadWithPipeline(
        buildTranslationPayload({
          text: source,
          from,
          to,
          provider,
          apiKey: getEffectiveApiKeyForProvider(provider),
          mode: translationMode,
        }),
        source,
        activeChapterIndex,
      );
      const translated = await requestTranslation(enriched);
      setResult(translated);
      recordEpisodeMemory(source, translated, activeChapterIndex);
      patchActiveChapter({ result: translated, isDone: true, stageProgress: 5 });
      const mergedStoryBible = await updateStoryBibleAfterTranslation({
        translatedText: translated,
        chapterName: activeChapter?.name || 'Current Chapter',
      });
      setHistory((prev) => [{ source, result: translated, time: Date.now(), from, to }, ...prev.slice(0, 19)]);
      if (translationMode === 'novel' && mergedStoryBible !== storySummary) {
        setStatusMsg('STORY BIBLE UPDATED');
      }
    } catch (error) {
      await alert(error instanceof Error ? error.message : '번역 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const deepTranslate = async () => {
    if (!source.trim()) return;
    const now = Date.now();
    if (now - lastPrimaryTranslateAt.current < 800) return;
    lastPrimaryTranslateAt.current = now;
    setLoading(true);
    const stageSequence = translationMode === 'novel'
      ? [
          { stage: 1, label: 'FIRST DRAFT', providerId: getEffectiveApiKeyForProvider('gemini') ? 'gemini' : provider },
          { stage: 2, label: 'LORE ALIGN', providerId: getEffectiveApiKeyForProvider('deepseek') ? 'deepseek' : provider },
          { stage: 3, label: 'PROSE SHAPE', providerId: getEffectiveApiKeyForProvider('claude') ? 'claude' : provider },
          { stage: 4, label: 'NATIVE RESONANCE', providerId: getEffectiveApiKeyForProvider('openai') ? 'openai' : provider },
          { stage: 5, label: 'FINAL POLISH', providerId: getEffectiveApiKeyForProvider('claude') ? 'claude' : provider },
        ]
      : [
          { stage: 1, label: 'STRUCTURAL ANALYSIS', providerId: provider },
          { stage: 5, label: 'FINAL ACCURACY', providerId: provider },
        ];
    try {
      let currentResult = source;
      for (const item of stageSequence) {
        setStatusMsg(item.label);
        const stagePayload = buildTranslationPayload({
          text: item.stage === 1 ? source : currentResult,
          sourceText: source,
          stage: item.stage,
          from,
          to,
          provider: item.providerId,
          apiKey: getEffectiveApiKeyForProvider(item.providerId),
          mode: translationMode,
        });
        // [Phase 1-7] stage 1 (FIRST DRAFT) 만 RAG 컨텍스트 강화 — 후속 단계는 누적 결과 기반이라 재주입 불필요
        const enrichedStage = item.stage === 1
          ? await enrichPayloadWithPipeline(stagePayload, source, activeChapterIndex)
          : stagePayload;
        currentResult = await requestTranslation(
          enrichedStage,
          { stream: true, onDelta: (s) => setResult(s) }
        );
        setResult(currentResult);
        patchActiveChapter({
          result: currentResult,
          stageProgress: item.stage,
          isDone: item.stage === 5,
        });
      }
      recordEpisodeMemory(source, currentResult, activeChapterIndex);
      const mergedStoryBible = await updateStoryBibleAfterTranslation({
        translatedText: currentResult,
        chapterName: activeChapter?.name || 'Current Chapter',
      });
      setHistory((prev) => [{ source, result: currentResult, time: Date.now(), from, to }, ...prev.slice(0, 19)]);
      if (translationMode === 'novel' && mergedStoryBible !== storySummary) {
        setStatusMsg('STORY BIBLE UPDATED');
      }
    } catch (error) {
      await alert(error instanceof Error ? error.message : 'Deep Pipeline 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const importUrl = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setStatusMsg('FETCHING URL');
    try {
      const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(urlInput)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'URL 읽기 오류');
      }
      if (data.text) {
        const parsedUrl = new URL(urlInput);
        const rawSlug = decodeURIComponent(parsedUrl.pathname.split('/').filter(Boolean).pop() || parsedUrl.hostname);
        const chapterName = rawSlug
          .replace(/[-_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || `Web Episode ${chapters.length + 1}`;
        const importedChapter = normalizeChapter({
          name: chapterName,
          content: data.text,
          result: '',
          isDone: false,
          stageProgress: 0,
          storyNote: '',
        }, chapterName);

        if (activeChapterIndex !== null && chapters[activeChapterIndex] && !chapters[activeChapterIndex].content.trim()) {
          patchActiveChapter({
            name: importedChapter.name,
            content: importedChapter.content,
            result: '',
            isDone: false,
            stageProgress: 0,
          });
          setSource(importedChapter.content);
          setResult('');
        } else {
          const newIndex = Math.min(chapters.length, 29);
          setChapters((prev) => [...prev, importedChapter].slice(0, 30));
          openChapter(newIndex, [...chapters, importedChapter].slice(0, 30));
        }

        setShowUrlImport(false);
        setUrlInput('');
      } else {
        await alert('내용을 가져오지 못했습니다.');
      }
    } catch (error) {
      await alert(error instanceof Error ? error.message : 'URL 읽기 오류');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

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

  const exportData = async () => {
    const ok = await confirm(
      '현재 프로젝트의 핵심 번역 데이터만 JSON 파일로 추출하시겠습니까?\n보안상 API 키와 참조 프로젝트 원문은 포함되지 않습니다.',
      '데이터 추출'
    );
    if (!ok) return;
    const blob = new Blob([JSON.stringify({
      projectName,
      chapters,
      projectLibrary: toProjectMeta(projectList),
      activeChapterIndex,
      referenceIds,
      source,
      result,
      from,
      to,
      provider,
      history,
      worldContext,
      characterProfiles,
      storySummary,
      backgroundMode,
      isZenMode,
      isCatMode,
      translationMode,
      glossaryText,
      glossary,
      domainPreset,
      preserveDialogueLayout,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eh-translator-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const input = event.target;
    if (!file) return;

    void (async () => {
      const proceed = await confirm(
        '새 프로젝트 파일을 불러오시겠습니까?\n현재 작업 중인 모든 데이터가 덮어씌워집니다. 이 작업은 되돌릴 수 없습니다.',
        '프로젝트 불러오기'
      );
      if (!proceed) {
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        void (async () => {
          try {
            const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
            startTransition(() => {
              if (parsed.projectName !== undefined) setProjectName(parsed.projectName as string);
              if (parsed.chapters !== undefined && Array.isArray(parsed.chapters)) {
                setChapters(
                  parsed.chapters.map((chapter: unknown, index: number) =>
                    normalizeChapter(chapter, `Part ${index + 1}`)
                  )
                );
              }
              if (parsed.projectList !== undefined) setProjectList(normalizeProjectSnapshots(parsed.projectList));
              if (parsed.projectLibrary !== undefined) setProjectList(normalizeProjectSnapshots(parsed.projectLibrary));
              if (parsed.activeChapterIndex !== undefined) setActiveChapterIndex(parsed.activeChapterIndex as number);
              if (parsed.source !== undefined) setSource(parsed.source as string);
              if (parsed.result !== undefined) setResult(parsed.result as string);
              if (parsed.from !== undefined) setFrom(parsed.from as string);
              if (parsed.to !== undefined) setTo(parsed.to as string);
              if (parsed.provider !== undefined) setProvider(parsed.provider as string);
              if (parsed.history !== undefined) setHistory(parsed.history as HistoryEntry[]);
              if (parsed.worldContext !== undefined) setWorldContext(parsed.worldContext as string);
              if (parsed.characterProfiles !== undefined) setCharacterProfiles(parsed.characterProfiles as string);
              if (parsed.storySummary !== undefined) setStorySummary(parsed.storySummary as string);
              if (parsed.referenceIds !== undefined)
                setReferenceIds(Array.isArray(parsed.referenceIds) ? (parsed.referenceIds as string[]) : []);
              if (parsed.backgroundMode !== undefined) {
                setBackgroundMode(normalizeTranslatorBackgroundMode(parsed.backgroundMode));
              }
              if (parsed.isZenMode !== undefined) setIsZenMode(parsed.isZenMode as boolean);
              if (parsed.isCatMode !== undefined) setIsCatMode(parsed.isCatMode as boolean);
              if (parsed.translationMode !== undefined) setTranslationMode(parsed.translationMode as 'novel' | 'general');
              setGlossaryText(typeof parsed.glossaryText === 'string' ? parsed.glossaryText : '');
              if (typeof parsed.glossary === 'object' && parsed.glossary !== null && !Array.isArray(parsed.glossary)) {
                const next: Record<string, string> = {};
                for (const [k, v] of Object.entries(parsed.glossary as Record<string, unknown>)) {
                  if (typeof k === 'string' && typeof v === 'string' && k.trim()) next[k.trim()] = v;
                }
                setGlossary(next);
              } else {
                setGlossary({});
              }
              if (parsed.domainPreset !== undefined) setDomainPreset(parsed.domainPreset as DomainPreset);
              if (parsed.preserveDialogueLayout !== undefined) setPreserveDialogueLayout(parsed.preserveDialogueLayout as boolean);
            });
          } catch {
            await alert('JSON 파일 형식이 올바르지 않습니다.');
          } finally {
            input.value = '';
          }
        })();
      };
      reader.readAsText(file);
    })();
  };

  const importDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const proceed = await confirm(`${files.length}개의 문서를 현재 프로젝트 챕터 목록에 추가하시겠습니까?`, '문서 가져오기');
    if (!proceed) {
      event.target.value = '';
      return;
    }

    setLoading(true);
    setStatusMsg('IMPORTING FILES');
    try {
      const newChapters: ChapterEntry[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', 'eh-translator');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || `${file.name} 파싱 실패`);

        const parsedChapters = Array.isArray(data.chapters) ? data.chapters : [];
        if (!parsedChapters.length) {
          throw new Error(`${file.name}에서 가져올 본문을 찾지 못했습니다.`);
        }

        const useBareFileName =
          parsedChapters.length === 1 &&
          typeof parsedChapters[0]?.title === 'string' &&
          /^split part \d+$/i.test(parsedChapters[0].title.trim());

        for (const chapter of parsedChapters) {
          const chapterTitle =
            typeof chapter?.title === 'string' && chapter.title.trim()
              ? chapter.title.trim()
              : 'Imported Part';

          newChapters.push({
            name: useBareFileName ? file.name : `${file.name} - ${chapterTitle}`,
            content: typeof chapter?.content === 'string' ? chapter.content : '',
            result: '',
            isDone: false,
            stageProgress: 0,
            storyNote: '',
          });
        }
      }

      if (newChapters.length) {
        const nextIndex = Math.min(chapters.length, 29);
        startTransition(() => {
          setChapters((prev) => [...prev, ...newChapters].slice(0, 30));
          setActiveChapterIndex(nextIndex);
          setSource(newChapters[0].content || '');
          setResult('');
        });
      }
    } catch (error) {
      await alert(error instanceof Error ? error.message : '문서 가져오기 실패');
    } finally {
      setLoading(false);
      setStatusMsg('');
      event.target.value = '';
    }
  };

  const batchTranslateAll = async () => {
    if (!chapters.length) return;
    const startBatch = await confirm(`${chapters.length}개 챕터를 순차 번역할까요?`, '일괄 번역');
    if (!startBatch) return;

    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    let rollingStorySummary = storySummary;
    const mgr = glossaryManagerRef.current;
    let batchGlossaryVersion = mgr.version;
    try {
      for (let index = 0; index < chapters.length; index += 1) {
        const chapter = chapters[index];
        if (chapter.isDone) {
          const redo = await confirm(`${chapter.name}은(는) 이미 완료되었습니다. 재번역할까요?`, '재번역');
          if (!redo) continue;
        }

        openChapter(index);

        // Real-time glossary: read fresh glossary from manager before each chapter
        const currentGlossaryVersion = mgr.version;
        if (currentGlossaryVersion !== batchGlossaryVersion) {
          logger.info('TranslatorStudioApp', `Glossary updated mid-batch: v${batchGlossaryVersion} → v${currentGlossaryVersion}`);
          batchGlossaryVersion = currentGlossaryVersion;
        }
        const freshGlossary = mgr.getPromptInjection();

        setStatusMsg(`BATCH ${index + 1}/${chapters.length}${freshGlossary ? ` [GLOSSv${currentGlossaryVersion}]` : ''}`);

        try {
          const batchPayload = buildTranslationPayload(
            {
              text: chapter.content,
              from,
              to,
              provider,
              apiKey: getEffectiveApiKeyForProvider(provider),
              mode: translationMode,
              // Override glossary with fresh real-time version
              glossary: freshGlossary || undefined,
            },
            { storySummaryBase: rollingStorySummary, chapterIndex: index }
          );
          const enrichedBatch = await enrichPayloadWithPipeline(batchPayload, chapter.content, index);
          const translated = await requestTranslation(enrichedBatch);
          setResult(translated);
          recordEpisodeMemory(chapter.content, translated, index);
          patchChapterAtIndex(index, { result: translated, isDone: true, stageProgress: 5 });

          if (translationMode === 'novel') {
            rollingStorySummary = await updateStoryBibleAfterTranslation({
              translatedText: translated,
              chapterName: chapter.name,
              chapterIndex: index,
              storySummaryBase: rollingStorySummary,
            });
          }

          successCount++;
        } catch (err: unknown) {
          logger.error('TranslatorStudioApp', 'Batch translate error', index, err);
          const msg = err instanceof Error ? err.message : 'Error';
          patchChapterAtIndex(index, { error: msg });
          failCount++;
        }
      }
      await alert(`일괄 번역 종료: 성공 ${successCount}, 실패 ${failCount}`, '일괄 번역');
    } catch (error) {
      await alert(error instanceof Error ? error.message : '일괄 작업 중 치명적 오류 발생');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const downloadAllResults = (format: 'txt' | 'md' | 'json' | 'html' | 'csv' = 'md') => {
    if (!chapters.length) return;

    let content = '';
    let mimeType = 'text/plain';

    if (format === 'md') {
      content = chapters.map((chapter: Partial<ChapterEntry>) => `# ${chapter.name}\n\n${chapter.result || '(미번역)'}`).join('\n\n---\n\n');
      mimeType = 'text/markdown';
    } else if (format === 'txt') {
      content = chapters.map((chapter: Partial<ChapterEntry>) => `[ ${chapter.name} ]\n\n${chapter.result || '(미번역)'}`).join('\n\n====================\n\n');
      mimeType = 'text/plain';
    } else if (format === 'json') {
      content = JSON.stringify(chapters.map((c: Partial<ChapterEntry>) => ({ title: c.name, content: c.result || '' })), null, 2);
      mimeType = 'application/json';
    } else if (format === 'html') {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Translation Results</title></head><body style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif;">` + 
        chapters.map((c: Partial<ChapterEntry>) => `<h2>${c.name}</h2><p>${(c.result || '').replace(/\\n/g, '<br>')}</p>`).join('<hr>') + 
        `</body></html>`;
      mimeType = 'text/html';
    } else if (format === 'csv') {
      content = '\\uFEFF"Chapter","Content"\\n' + chapters.map((c: Partial<ChapterEntry>) => `"${c.name?.replace(/"/g, '""')}","${(c.result || '').replace(/"/g, '""')}"`).join('\\n');
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eh-translator-results-${new Date().toISOString().slice(0, 10)}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
  };

  const refineResult = async () => {
    if (!result.trim()) return;

    setLoading(true);
    setStatusMsg('FINAL POLISH');
    try {
      const refined = await requestTranslation(
        buildTranslationPayload({
          text: result,
          sourceText: source,
          stage: 5,
          from,
          to,
          provider: getEffectiveApiKeyForProvider('claude') ? 'claude' : provider,
          apiKey: getEffectiveApiKeyForProvider('claude') ? getEffectiveApiKeyForProvider('claude') : getEffectiveApiKeyForProvider(provider),
          mode: translationMode,
        }),
        { stream: true, onDelta: (s) => setResult(s) }
      );
      setResult(refined);
      patchActiveChapter({ result: refined, isDone: true, stageProgress: 5 });
    } catch (error) {
      await alert(error instanceof Error ? error.message : '다듬기 실패');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const backTranslate = async () => {
    if (!result.trim()) return;

    setLoading(true);
    setStatusMsg('BACK CHECK');
    try {
      const reversed = await requestTranslation({
        text: result,
        from: to,
        to: from,
        provider,
        apiKey: getEffectiveApiKeyForProvider(provider),
        mode: 'general',
      });
      setBackResult(reversed);
    } catch (error) {
      await alert(error instanceof Error ? error.message : '역번역 검사 실패');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const runCompareB = async () => {
    if (!source.trim()) return;
    const altProvider = provider === 'openai' ? 'claude' : 'openai';
    if (!getEffectiveApiKeyForProvider(altProvider) && !getEffectiveApiKeyForProvider(provider)) {
      await alert('비교 B안을 만들려면 해당 엔진 API 키를 설정해 주세요.');
      return;
    }
    setLoading(true);
    setStatusMsg('COMPARE B');
    try {
      const enrichedB = await enrichPayloadWithPipeline(
        buildTranslationPayload({
          text: source,
          from,
          to,
          provider: getEffectiveApiKeyForProvider(altProvider) ? altProvider : provider,
          apiKey: getEffectiveApiKeyForProvider(altProvider)
            ? getEffectiveApiKeyForProvider(altProvider)
            : getEffectiveApiKeyForProvider(provider),
          mode: translationMode,
        }),
        source,
        activeChapterIndex,
      );
      const b = await requestTranslation(enrichedB);
      setCompareResultB(b);
    } catch (error) {
      await alert(error instanceof Error ? error.message : '비교 B안 실패');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const runChunkedTranslate = async () => {
    if (!source.trim()) return;
    const ok = await confirm(
      '긴 원고를 약 6000자 단위로 나눠 순서대로 번역한 뒤 이어 붙입니다. 계속할까요?',
      '분할 번역'
    );
    if (!ok) return;
    const chunks = splitTextIntoChunks(source, 6000, 400);
    setLoading(true);
    let acc = '';
    try {
      for (let i = 0; i < chunks.length; i++) {
        setStatusMsg(`CHUNK ${i + 1}/${chunks.length}`);
        // [Phase 1-7] 첫 청크에만 RAG 강화 — 같은 텍스트 분할 시 중복 호출 회피
        const chunkPayload = buildTranslationPayload({
          text: chunks[i],
          from,
          to,
          provider,
          apiKey: getEffectiveApiKeyForProvider(provider),
          mode: translationMode,
        });
        const enrichedChunk = i === 0
          ? await enrichPayloadWithPipeline(chunkPayload, source, activeChapterIndex)
          : chunkPayload;
        const part = await requestTranslation(enrichedChunk);
        acc += (acc ? '\n\n' : '') + part;
        setResult(acc);
      }
      recordEpisodeMemory(source, acc, activeChapterIndex);
      patchActiveChapter({ result: acc, isDone: true, stageProgress: 5 });
    } catch (error) {
      await alert(error instanceof Error ? error.message : '분할 번역 실패');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const activeChapter = activeChapterIndex !== null ? chapters[activeChapterIndex] : null;
  const completedChapters = chapters.filter((chapter) => chapter.isDone).length;
  const completionRate = chapters.length ? Math.round((completedChapters / chapters.length) * 100) : 0;
  const workspaceName = projectName.trim() || '새 번역 프로젝트';
  const providerLabel = PROVIDERS.find((item) => item.id === provider)?.label || provider.toUpperCase();
  const stripeCheckoutEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim());
  const autoSaveLabel = lastSavedAt
    ? langKo
      ? `로컬 저장 ${new Date(lastSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      : `Local saved ${new Date(lastSavedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
    : langKo
      ? '로컬 저장 대기(편집 시 자동)'
      : 'Local autosave (on edit)';
  const atmosphereLabel =
    backgroundMode === 'bright'
      ? 'Editorial White'
      : backgroundMode === 'beige'
        ? 'Warm Paper'
        : 'Nebula Depth';
  const pipelineLabel = translationMode === 'novel' ? 'Narrative Pipeline' : 'Auxiliary General';
  const cloudSyncEnabled = Boolean(isAuthLoaded && userId && supabaseUrl && supabaseAnonKey);
  const referenceStatusLabel = referenceBundle.projectNames.length
    ? `참조 중: ${referenceBundle.projectNames.join(', ')}`
    : '참조 프로젝트 없음';
  const storyBibleStatusLabel = storySummary.trim()
    ? `Story Bible 누적 ${storySummary.split('\n---\n').length}블록`
    : 'Story Bible 아직 비어 있음';

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
    hostedGemini,
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
    translate, deepTranslate, runChunkedTranslate, runCompareB, analyzeStyle,
    refineResult, backTranslate, batchTranslateAll, importDocument,
    exportData, importData, importUrl, downloadAllResults, handleChapterRemove,
    signInWithGoogle, signOut, getIdToken
  };

  return (
    <TranslatorContext.Provider value={contextValue}>
      <div className={`flex h-screen w-full flex-col overflow-hidden theme-${backgroundMode}`}>
        {aiCapabilitiesLoaded && !hasTranslatorAiAccess && !apiBannerDismissed && (
          <div className="flex shrink-0 items-center gap-2 border-b border-amber-700/40 bg-amber-900/25 px-3 py-1.5 text-amber-100">
            <Key className="h-3.5 w-3.5 shrink-0 text-amber-300 hidden sm:block" aria-hidden />
            <p className="min-w-0 flex-1 text-[10px] sm:text-[11px] leading-snug truncate sm:[overflow:visible] sm:[text-overflow:unset] sm:[white-space:normal]">
              {langKo
                ? 'API 키를 등록하세요.'
                : 'Add an API key to start.'}
              <span className="hidden sm:inline">
                {langKo
                  ? ' 소설 스튜디오와 동일한 패널에서 등록하거나, 호스팅 Gemini 엔진을 선택하세요.'
                  : ' Same panel as Novel Studio, or pick Gemini when server-hosted.'}
              </span>
            </p>
            <button
              type="button"
              onClick={openApiKeyModal}
              className="shrink-0 rounded-lg bg-amber-600/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-50 hover:bg-amber-600/55"
            >
              {langKo ? 'API 키' : 'API keys'}
            </button>
            <button
              type="button"
              onClick={dismissApiBanner}
              className="shrink-0 rounded p-1 text-amber-400/70 hover:bg-amber-800/30 hover:text-amber-200"
              aria-label={langKo ? '배너 닫기' : 'Dismiss banner'}
            >
              ✕
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1">
          <TranslatorShell />
        </div>
      </div>
      <TranslatorModals
        showApiKeyModal={showApiKeyModal}
        onCloseApiKeyModal={() => { setShowApiKeyModal(false); setApiKeyRefresh((n) => n + 1); }}
        dialog={dialog}
        onDismiss={dismiss}
        onConfirmYes={confirmYes}
        onAlertOk={alertOk}
      />
    </TranslatorContext.Provider>
  );
}
