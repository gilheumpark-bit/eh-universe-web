import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Project, ChatSession, Genre, StoryConfig, AppLanguage,
} from '@/lib/studio-types';
import { loadProjects, saveProjects, getStorageUsageBytes } from '@/lib/project-migration';
import { backupToIndexedDB, restoreFromIndexedDB, saveVersionedBackup, listVersionedBackups, restoreVersionedBackup, type VersionedBackup } from '@/lib/indexeddb-backup';
import { logger } from '@/lib/logger';
import { PlatformType } from '@/engine/types';
import { trackStudioSessionStart } from '@/lib/analytics';
import { sanitizeLoadedProjects } from '@/lib/project-sanitize';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { debouncedSyncToFirestore, loadProjectsFromFirestore, subscribeToProjectChanges } from '@/lib/firestore-project-sync';
import { configToRepoFiles } from '@/lib/project-serializer';
import { loadProfile } from '@/engine/writer-profile';

// ============================================================
// PART 1 — Initial config & types
// ============================================================

export const INITIAL_CONFIG: StoryConfig = {
  genre: Genre.SYSTEM_HUNTER,
  povCharacter: "",
  setting: "",
  primaryEmotion: "",
  episode: 1,
  title: "",
  totalEpisodes: 25,
  guardrails: { min: 3000, max: 5000 },
  characters: [],
  platform: PlatformType.MOBILE,
  narrativeIntensity: 'standard',
};

const PROJECT_NAMES: Record<AppLanguage, string> = {
  KO: '새 작품', EN: 'New Project', JP: '新しい作品', CN: '新作品',
};

const SESSION_TITLES: Record<AppLanguage, string> = {
  KO: "새로운 소설", EN: "New Story", JP: "新しい小説", CN: "新小说",
};

// ============================================================
// PART 1.5 — Post-save side effects (M1.5.5 공통화)
// ============================================================

/**
 * Primary 저장 직후 처리 — storage-full 경고, IndexedDB 백업, Cloud sync, Shadow 콜백.
 *
 * M1.5.5 에서 Primary 경로가 두 갈래(legacy / journal via primaryWriteFn)가 되었으므로
 * 부가 동작을 별도 함수로 추출했다. 이는 단순 함수 — 기존 useEffect 의 내부 로직을
 * 그대로 옮겼을 뿐 계약은 불변이다.
 *
 * [C] ok=false 여도 callback 은 호출하지 않음 (M1.5.2 규약).
 * [G] 불필요한 재계산 없음 — 조건부 dispatch 만.
 * [K] 단일 함수 — 두 경로에서 동일하게 재사용.
 */
function handleSaveAftermath(
  projects: Project[],
  ok: boolean,
  primaryDurationMs: number,
  uid: string | null,
  onSaveCompleteCb: ProjectSaveCompleteCallback | undefined,
): void {
  if (!ok) {
    const mb = (getStorageUsageBytes() / 1024 / 1024).toFixed(1);
    logger.warn('NOA', `Storage full (${mb}MB). Consider exporting and clearing old sessions.`);
    try {
      window.dispatchEvent(new CustomEvent('noa:storage-full', {
        detail: { usageMB: mb },
      }));
    } catch { /* SSR/이벤트 차단 */ }
  }
  if (isFeatureEnabled('OFFLINE_CACHE')) {
    backupToIndexedDB(projects).catch(err => logger.warn('IndexedDB', 'Backup failed:', err));
  }
  if (ok) {
    try {
      window.dispatchEvent(new CustomEvent('noa:auto-saved'));
    } catch { /* SSR/이벤트 차단 */ }
  }
  if (uid && isFeatureEnabled('CLOUD_SYNC')) {
    debouncedSyncToFirestore(uid, projects);
  }
  // [M1.5.2] Shadow 쓰기 콜백 — Primary 성공 시에만. throw 격리.
  if (ok && onSaveCompleteCb) {
    try {
      onSaveCompleteCb(projects, primaryDurationMs);
    } catch (err) {
      logger.warn('NOA', 'onSaveComplete callback threw (isolated)', err);
    }
  }
}

// ============================================================
// PART 2 — Hook implementation
// ============================================================

/**
 * [M1.5.2] Primary 저장 완료 콜백. 옵셔널. 미주입이면 기존 동작과 완전 동일.
 * 호출 시점: saveProjects(projects)가 true 반환 직후 (auto-save debounce 내부).
 *
 * 호출 규약:
 *   - Primary 경로 성공 시에만 호출 (실패/미실행 시 호출하지 않음).
 *   - payload 는 실제 저장된 projects 참조(불변 전제).
 *   - durationMs 는 saveProjects 호출부터 반환까지의 wall-clock.
 *   - 콜백은 void 반환 전제 — 내부가 Promise 를 열어도 Primary 경로는 기다리지 않음.
 */
export type ProjectSaveCompleteCallback = (
  projects: Project[],
  durationMs: number,
) => void;

/**
 * [M1.5.5] Primary 저장 함수. 옵셔널. 미주입 시 기존 saveProjects 경로 100% 유지.
 *
 * 계약:
 *   - 주입된 함수는 내부적으로 mode 판정 + fallback 책임을 가진다 (usePrimaryWriter).
 *   - 반환 WriteResult.primarySuccess=true 면 저장 성공 (legacy/journal/degraded 무관).
 *   - throw 는 허용하지 않음 — caller 는 항상 WriteResult 를 수신한다 (훅이 내부에서 흡수).
 *   - 호출 후 onSaveComplete (M1.5.2) 콜백은 Primary 성공 시 여전히 트리거된다.
 */
export type PrimaryWriteFn = (projects: Project[]) => Promise<{
  mode: 'legacy' | 'journal' | 'degraded';
  primarySuccess: boolean;
  mirrorSuccess: boolean;
  journalEntryId?: string;
  durationMs: number;
}>;

export interface UseProjectManagerOptions {
  /** [M1.5.2] Shadow 쓰기 등 외부 관찰자용 비간섭 콜백. */
  onSaveComplete?: ProjectSaveCompleteCallback;
  /**
   * [M1.5.5] Primary 저장 주입 — flag 'on' 시 journal Primary + legacy Mirror 경로.
   * 미주입 시 기존 `saveProjects` 직접 호출 (완전 역호환).
   */
  primaryWriteFn?: PrimaryWriteFn;
}

/**
 * Central project/session CRUD hook. Handles localStorage hydration, project creation,
 * session switching, IndexedDB backup/restore, and storage quota management.
 */
export function useProjectManager(
  language: AppLanguage,
  uid: string | null = null,
  options: UseProjectManagerOptions = {},
) {
  // [M1.5.2] 콜백 최신 참조 유지용 ref — 옵션 객체 identity 변화로 저장 effect가
  // 재실행되는 일을 막는다. 콜백 자체는 호출 시점에 최신이 주입된다.
  const onSaveCompleteRef = useRef(options.onSaveComplete);
  onSaveCompleteRef.current = options.onSaveComplete;
  // [M1.5.5] Primary Writer 주입 — 미주입 시 기존 saveProjects 직접 호출 (역호환).
  const primaryWriteFnRef = useRef(options.primaryWriteFn);
  primaryWriteFnRef.current = options.primaryWriteFn;
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [restoreWarning, setRestoreWarning] = useState<string | null>(null);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  // Derived state
  const currentProject = projects.find(p => p.id === currentProjectId) ?? null;
  const sessions = useMemo(() => currentProject?.sessions ?? [], [currentProject?.sessions]);
  const currentSession = sessions.find(s => s.id === currentSessionId) ?? null;

  // ---- setSessions helper ----
  const setSessions = useCallback(
    (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
      setProjects(prev => prev.map(p => {
        if (p.id !== currentProjectId) return p;
        const next = typeof updater === 'function' ? updater(p.sessions) : updater;
        return { ...p, sessions: next, lastUpdate: Date.now() };
      }));
    },
    [currentProjectId],
  );

  // ============================================================
  // PART 3 — Persistence (hydration + auto-save)
  // ============================================================

  useEffect(() => {
    (async () => {
      let loaded = loadProjects();
      if (loaded.length === 0 && isFeatureEnabled('OFFLINE_CACHE')) {
        try {
          const restored = await restoreFromIndexedDB();
          if (restored && restored.length > 0) loaded = restored;
        } catch (err) {
          logger.error('IndexedDB', 'Restore failed:', err);
          const msg = language === 'KO'
            ? 'IndexedDB 복원에 실패했습니다. 데이터가 유실될 수 있습니다.'
            : 'IndexedDB restore failed. Data may be lost.';
          setRestoreWarning(msg);
          window.dispatchEvent(new CustomEvent('noa:alert', {
            detail: { message: msg, variant: 'error' },
          }));
        }
      }
      loaded = sanitizeLoadedProjects(loaded);
      if (loaded.length > 0) {
        setProjects(loaded);
        // [세션 자동 복원] 마지막 사용 프로젝트/세션 ID를 localStorage에서 복원
        // 없거나 유효하지 않으면 첫 프로젝트의 첫 세션으로 폴백
        let lastProjectId: string | null = null;
        let lastSessionId: string | null = null;
        try {
          lastProjectId = localStorage.getItem('noa_last_project_id');
          lastSessionId = localStorage.getItem('noa_last_session_id');
        } catch { /* quota */ }
        const matchedProject = lastProjectId ? loaded.find(p => p.id === lastProjectId) : null;
        const matchedSession = matchedProject?.sessions?.find(s => s.id === lastSessionId);
        if (matchedProject && matchedSession) {
          setCurrentProjectId(matchedProject.id);
          setCurrentSessionId(matchedSession.id);
        } else {
          setCurrentProjectId(loaded[0].id);
          setCurrentSessionId(loaded[0].sessions?.[0]?.id ?? null);
        }
      }
      setHydrated(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      // [M1.5.2] Primary 저장 wall-clock 측정 — Shadow 콜백에 전달용.
      // [M1.5.5] primaryWriteFn 주입 시 Journal Primary + legacy Mirror 경로로 분기.
      //          미주입 시 saveProjects 직접 호출 (기존 M1.5.2 경로와 100% 동일).
      const t0 = performance.now();
      const primaryWriteFn = primaryWriteFnRef.current;

      if (primaryWriteFn) {
        // ---- Path A: M1.5.5 Primary Writer 주입 경로 ----
        // primaryWriteFn 은 자체적으로 mode 판정 + legacy fallback 을 내장.
        // throw 없음 계약 — 실패도 WriteResult.primarySuccess=false 로 반환.
        void primaryWriteFn(projects)
          .then((result) => {
            const primaryDurationMs = result.durationMs > 0
              ? result.durationMs
              : Math.max(0, performance.now() - t0);
            handleSaveAftermath(
              projects,
              result.primarySuccess,
              primaryDurationMs,
              uid,
              onSaveCompleteRef.current,
            );
          })
          .catch((err) => {
            // 계약 위반 (primaryWriteFn 이 throw) — legacy 동기 복귀.
            logger.warn('NOA', 'primaryWriteFn threw (fallback to legacy)', err);
            const ok = saveProjects(projects);
            const primaryDurationMs = Math.max(0, performance.now() - t0);
            handleSaveAftermath(
              projects,
              ok,
              primaryDurationMs,
              uid,
              onSaveCompleteRef.current,
            );
          });
      } else {
        // ---- Path B: M1.5.2 기존 경로 — 100% 역호환 ----
        const ok = saveProjects(projects);
        const primaryDurationMs = performance.now() - t0;
        handleSaveAftermath(
          projects,
          ok,
          primaryDurationMs,
          uid,
          onSaveCompleteRef.current,
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [projects, hydrated, uid]);

  // [세션 자동 복원 저장] 마지막 활성 프로젝트/세션 ID를 localStorage에 기록
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (currentProjectId) localStorage.setItem('noa_last_project_id', currentProjectId);
      if (currentSessionId) localStorage.setItem('noa_last_session_id', currentSessionId);
    } catch { /* quota/private */ }
  }, [currentProjectId, currentSessionId, hydrated]);

  // Fix #4: beforeunload — flush save synchronously to prevent data loss
  useEffect(() => {
    if (!hydrated) return;
    const handleBeforeUnload = () => {
      const current = projectsRef.current;
      if (current.length === 0) return;
      // Attempt synchronous localStorage write first
      try {
        saveProjects(current);
      } catch {
        // Fallback: sendBeacon with JSON payload
        try {
          const blob = new Blob([JSON.stringify(current)], { type: 'application/json' });
          navigator.sendBeacon?.('/api/noop', blob);
        } catch {
          // Last resort — already attempted sync save above
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hydrated]);

  // ============================================================
  // PART 3.5 — Versioned auto-backup (every 10 minutes, max 5)
  // ============================================================

  const [versionedBackups, setVersionedBackups] = useState<VersionedBackup[]>([]);

  // Load backup list on hydration
  useEffect(() => {
    if (!hydrated || !isFeatureEnabled('OFFLINE_CACHE')) return;
    listVersionedBackups().then(setVersionedBackups).catch(() => {});
  }, [hydrated]);

  // Auto-backup every 10 minutes
  useEffect(() => {
    if (!hydrated || projects.length === 0 || !isFeatureEnabled('OFFLINE_CACHE')) return;
    const BACKUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
    const interval = setInterval(() => {
      const current = projectsRef.current;
      if (current.length === 0) return;
      saveVersionedBackup(current)
        .then(() => listVersionedBackups().then(setVersionedBackups))
        .catch(err => logger.warn('IndexedDB', 'Versioned backup failed:', err));
    }, BACKUP_INTERVAL);
    return () => clearInterval(interval);
  }, [hydrated, projects.length]);

  // ============================================================
  // PART 3.6 — Firestore 클라우드 동기화 (CLOUD_SYNC flag)
  // ============================================================

  // 초기 로드: Firestore에서 더 최신 데이터가 있으면 병합
  useEffect(() => {
    if (!hydrated || !uid || !isFeatureEnabled('CLOUD_SYNC')) return;
    loadProjectsFromFirestore(uid).then(remoteProjects => {
      if (!remoteProjects || remoteProjects.length === 0) return;
      setProjects(prev => {
        const localMap = new Map(prev.map(p => [p.id, p]));
        let merged = false;
        for (const rp of remoteProjects) {
          const local = localMap.get(rp.id);
          if (!local || (rp.lastUpdate && rp.lastUpdate > (local.lastUpdate || 0))) {
            localMap.set(rp.id, rp);
            merged = true;
          }
        }
        if (!merged) return prev;
        return Array.from(localMap.values()).sort((a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0));
      });
    }).catch(() => {});
  }, [hydrated, uid]);

  // 실시간 구독: 다른 디바이스에서 변경 시 자동 반영
  useEffect(() => {
    if (!hydrated || !uid || !isFeatureEnabled('CLOUD_SYNC')) return;
    let unsub: (() => void) | null = null;
    subscribeToProjectChanges(uid, (remoteProjects) => {
      setProjects(prev => {
        const localMap = new Map(prev.map(p => [p.id, p]));
        for (const rp of remoteProjects) {
          const local = localMap.get(rp.id);
          if (!local || (rp.lastUpdate && rp.lastUpdate > (local.lastUpdate || 0))) {
            localMap.set(rp.id, rp);
          }
        }
        return Array.from(localMap.values()).sort((a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0));
      });
    }).then(fn => { unsub = fn; }).catch(() => {});
    return () => { unsub?.(); };
  }, [hydrated, uid]);

  const doRestoreVersionedBackup = useCallback(async (timestamp: number) => {
    const restored = await restoreVersionedBackup(timestamp);
    if (restored && restored.length > 0) {
      setProjects(restored);
      setCurrentProjectId(restored[0].id);
      setCurrentSessionId(restored[0].sessions?.[0]?.id ?? null);
      return true;
    }
    return false;
  }, []);

  const refreshBackupList = useCallback(async () => {
    const list = await listVersionedBackups();
    setVersionedBackups(list);
  }, []);

  // ============================================================
  // PART 4 — Project management
  // ============================================================

  const createNewProject = useCallback((): string => {
    const p: Project = {
      id: `project-${crypto.randomUUID()}`,
      name: PROJECT_NAMES[language],
      description: '',
      genre: Genre.SF,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      sessions: [],
    };
    setProjects(prev => [...prev, p]);
    setCurrentProjectId(p.id);
    setCurrentSessionId(null);
    return p.id;
  }, [language]);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(prev => {
      const remaining = prev.filter(p => p.id !== projectId);
      if (currentProjectId === projectId) {
        setCurrentProjectId(remaining[0]?.id ?? null);
        setCurrentSessionId(null);
      }
      return remaining;
    });
  }, [currentProjectId]);

  const renameProject = useCallback((projectId: string, newName: string) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, name: newName, lastUpdate: Date.now() } : p,
    ));
  }, []);

  const moveSessionToProject = useCallback((sessionId: string, targetProjectId: string) => {
    setProjects(prev => {
      const src = prev.find(p => p.sessions.some(s => s.id === sessionId));
      if (!src || src.id === targetProjectId) return prev;
      const session = src.sessions.find(s => s.id === sessionId);
      if (!session) return prev;
      return prev.map(p => {
        if (p.id === src.id)
          return { ...p, sessions: p.sessions.filter(s => s.id !== sessionId), lastUpdate: Date.now() };
        if (p.id === targetProjectId)
          return { ...p, sessions: [session, ...p.sessions], lastUpdate: Date.now() };
        return p;
      });
    });
    if (currentSessionId === sessionId) setCurrentProjectId(targetProjectId);
  }, [currentSessionId]);

  // ============================================================
  // PART 5 — Session management
  // ============================================================

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session-${crypto.randomUUID()}`,
      title: SESSION_TITLES[language],
      messages: [],
      config: { ...INITIAL_CONFIG },
      lastUpdate: Date.now(),
    };

    if (projects.length === 0) {
      const p: Project = {
        id: 'project-default',
        name: '미분류',
        description: '',
        genre: Genre.SF,
        createdAt: Date.now(),
        lastUpdate: Date.now(),
        sessions: [newSession],
      };
      setProjects([p]);
      setCurrentProjectId(p.id);
    } else {
      setSessions(prev => [newSession, ...prev]);
    }
    setCurrentSessionId(newSession.id);
    trackStudioSessionStart();
    return newSession.id;
  }, [language, projects.length, setSessions]);

  const deleteSession = useCallback((sessionId: string) => {
    const remaining = sessions.filter(s => s.id !== sessionId);
    setSessions(remaining);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(remaining[0]?.id ?? null);
    }
  }, [sessions, currentSessionId, setSessions]);

  const clearAllSessions = useCallback(() => {
    // Clear ALL projects and sessions, not just sessions in the current project
    const freshProject: Project = {
      id: `project-${crypto.randomUUID()}`,
      name: PROJECT_NAMES[language],
      description: '',
      genre: Genre.SF,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      sessions: [],
    };
    setProjects([freshProject]);
    setCurrentProjectId(freshProject.id);
    setCurrentSessionId(null);
  }, [language, setProjects]);

  const updateCurrentSession = useCallback((updates: Partial<ChatSession>) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s =>
      s.id === currentSessionId ? { ...s, ...updates, lastUpdate: Date.now() } : s,
    ));
  }, [currentSessionId, setSessions]);

  const setConfig = useCallback((newConfig: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
    if (typeof newConfig === 'function') {
      updateCurrentSession({ config: newConfig(currentSession?.config ?? INITIAL_CONFIG) });
    } else {
      updateCurrentSession({ config: newConfig });
    }
  }, [updateCurrentSession, currentSession?.config]);

  // ============================================================
  // PART 6 — GitHub Sync (serialize config -> repo files)
  // ============================================================

  /**
   * Serialize the current session's config into repo files using project-serializer.
   * The caller (e.g. a settings panel) provides a `saveFileFn` from useGitHubSync
   * so that this hook does not depend on GitHub connection state directly.
   *
   * Returns the count of files synced, or 0 on failure.
   */
  const syncProjectToGitHub = useCallback(
    async (
      saveFileFn: (path: string, content: string, message?: string) => Promise<string | null>,
    ): Promise<number> => {
      if (!isFeatureEnabled('GITHUB_SYNC')) return 0;

      const session = currentSession;
      if (!session?.config) return 0;

      try {
        // WriterProfile 동반 push — 다른 기기에서도 작가 학습 상태 이어받기
        const writerProfile = (() => {
          try { return loadProfile(); } catch { return undefined; }
        })();
        const repoFiles = configToRepoFiles(session.config, writerProfile);
        if (repoFiles.length === 0) return 0;

        let synced = 0;
        for (const file of repoFiles) {
          const sha = await saveFileFn(file.path, file.content);
          if (sha) synced++;
        }

        if (synced > 0) {
          logger.info('GitHubSync', `Synced ${synced}/${repoFiles.length} files`);
          window.dispatchEvent(new CustomEvent('noa:github-synced', {
            detail: { count: synced, total: repoFiles.length },
          }));
        }

        return synced;
      } catch (err) {
        logger.error('GitHubSync', 'Sync failed:', err);
        return 0;
      }
    },
    [currentSession],
  );

  /** Compute summary statistics for a given project */
  const getProjectStats = useCallback((projectId: string): { episodeCount: number; totalChars: number; lastModified: number | null } => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return { episodeCount: 0, totalChars: 0, lastModified: null };
    let totalChars = 0;
    let episodeCount = 0;
    for (const session of proj.sessions) {
      const manuscripts = session.config?.manuscripts ?? [];
      episodeCount += manuscripts.length;
      for (const m of manuscripts) {
        totalChars += m.charCount ?? m.content?.length ?? 0;
      }
    }
    return { episodeCount, totalChars, lastModified: proj.lastUpdate ?? proj.createdAt ?? null };
  }, [projects]);

  return {
    // State
    projects, setProjects,
    currentProjectId, setCurrentProjectId,
    currentSessionId, setCurrentSessionId,
    hydrated,
    currentProject, sessions, currentSession,
    setSessions,
    restoreWarning,
    // Project ops
    createNewProject, deleteProject, renameProject, moveSessionToProject,
    // Session ops
    createNewSession, deleteSession, clearAllSessions,
    updateCurrentSession, setConfig,
    // Versioned backup (플래그 꺼지면 설정 탭에 섹션 미표시)
    versionedBackups: isFeatureEnabled('OFFLINE_CACHE') ? versionedBackups : undefined,
    doRestoreVersionedBackup,
    refreshBackupList,
    // Project stats
    getProjectStats,
    // GitHub sync
    syncProjectToGitHub,
  };
}
