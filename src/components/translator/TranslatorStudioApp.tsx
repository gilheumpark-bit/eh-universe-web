'use client';

import { TranslatorContext } from './core/TranslatorContext';
import { TranslatorShell } from './TranslatorShell';
import { ChangeEvent, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Key } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/LangContext';
import { getApiKey, type ProviderId } from '@/lib/ai-providers';
import type { AppLanguage } from '@/lib/studio-types';
import ApiKeyModal from '@/components/studio/ApiKeyModal';
import { logger } from '@/lib/logger';
import {
  loadProjectFromCloud,
  saveProjectToCloud,
  listUserProjects,
  supabaseAnonKey,
  supabaseUrl,
} from '@/lib/supabase';
import { useAppDialog } from '@/hooks/useAppDialog';
import { AppDialog } from '@/components/ui/AppDialog';
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
import type {
  ChapterEntry,
  ProjectSnapshot,
  HistoryEntry,
  StyleHeuristicAnalysis,
  DomainPreset,
} from '@/types/translator';

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
  const [apiKeyRefresh, setApiKeyRefresh] = useState(0);
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
    [apiKeys, apiKeyRefresh],
  );

  const hasTranslatorAiAccess = useMemo(() => {
    const key = getEffectiveApiKeyForProvider(provider);
    if (key) return true;
    if (provider === 'gemini' && hostedGemini) return true;
    return false;
  }, [provider, hostedGemini, getEffectiveApiKeyForProvider, apiKeyRefresh]);

  const studioLanguage: AppLanguage = useMemo(() => {
    if (lang === 'ko') return 'KO';
    if (lang === 'jp') return 'JP';
    if (lang === 'cn') return 'CN';
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
        const data = (await res.json()) as { hosted?: Partial<Record<ProviderId, boolean>> };
        if (!cancelled) {
          const h = data.hosted ?? {};
          setHostedProviders(h);
          setHostedGemini(Boolean(h.gemini));
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
      glossary: glossaryText.trim() || undefined,
      domainPreset: translationMode === 'general' ? domainPreset : 'general',
      preserveDialogueLayout: translationMode === 'novel' ? preserveDialogueLayout : false,
      ...payload,
    };
  };

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
      const translated = await requestTranslation(
        buildTranslationPayload({
          text: source,
          from,
          to,
          provider,
          apiKey: getEffectiveApiKeyForProvider(provider),
          mode: translationMode,
        })
      );
      setResult(translated);
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
        currentResult = await requestTranslation(
          buildTranslationPayload({
            text: item.stage === 1 ? source : currentResult,
            sourceText: source,
            stage: item.stage,
            from,
            to,
            provider: item.providerId,
            apiKey: getEffectiveApiKeyForProvider(item.providerId),
            mode: translationMode,
          }),
          { stream: true, onDelta: (s) => setResult(s) }
        );
        setResult(currentResult);
        patchActiveChapter({
          result: currentResult,
          stageProgress: item.stage,
          isDone: item.stage === 5,
        });
      }
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
    try {
      for (let index = 0; index < chapters.length; index += 1) {
        const chapter = chapters[index];
        if (chapter.isDone) {
          const redo = await confirm(`${chapter.name}은(는) 이미 완료되었습니다. 재번역할까요?`, '재번역');
          if (!redo) continue;
        }
        
        openChapter(index);
        setStatusMsg(`BATCH ${index + 1}/${chapters.length}`);
        
        try {
          const translated = await requestTranslation(
            buildTranslationPayload(
              {
                text: chapter.content,
                from,
                to,
                provider,
                apiKey: getEffectiveApiKeyForProvider(provider),
                mode: translationMode,
              },
              { storySummaryBase: rollingStorySummary, chapterIndex: index }
            )
          );
          setResult(translated);
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
      const b = await requestTranslation(
        buildTranslationPayload({
          text: source,
          from,
          to,
          provider: getEffectiveApiKeyForProvider(altProvider) ? altProvider : provider,
          apiKey: getEffectiveApiKeyForProvider(altProvider)
            ? getEffectiveApiKeyForProvider(altProvider)
            : getEffectiveApiKeyForProvider(provider),
          mode: translationMode,
        })
      );
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
        const part = await requestTranslation(
          buildTranslationPayload({
            text: chunks[i],
            from,
            to,
            provider,
            apiKey: getEffectiveApiKeyForProvider(provider),
            mode: translationMode,
          })
        );
        acc += (acc ? '\n\n' : '') + part;
        setResult(acc);
      }
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
  const workspaceName = projectName.trim() || 'Untitled Narrative Workspace';
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
          <div className="flex shrink-0 items-center gap-3 border-b border-amber-700/40 bg-amber-900/25 px-4 py-2.5 text-amber-100">
            <Key className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <p className="min-w-0 flex-1 text-[11px] leading-snug [word-break:keep-all]">
              {langKo
                ? '번역을 실행하려면 BYOK API 키를 등록하거나(아래 버튼·소설 스튜디오와 동일), 호스팅 Gemini가 켜진 배포에서 Gemini 엔진을 선택하세요.'
                : 'Add a BYOK API key (same panel as Novel Studio) or pick Gemini when server-hosted Gemini is enabled.'}
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
      {showApiKeyModal && (
        <ApiKeyModal
          language={studioLanguage}
          hostedProviders={hostedProviders}
          onClose={() => setShowApiKeyModal(false)}
          onSave={() => setApiKeyRefresh((n) => n + 1)}
        />
      )}
      {dialog && (
        <AppDialog
          open
          variant={dialog.kind === 'confirm' ? 'confirm' : 'alert'}
          title={dialog.title ?? '알림'}
          message={dialog.message}
          onClose={dismiss}
          onConfirm={confirmYes}
          onAlertOk={alertOk}
        />
      )}
    </TranslatorContext.Provider>
  );
}
