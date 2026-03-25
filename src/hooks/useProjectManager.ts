import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Project, ChatSession, Genre, StoryConfig, AppLanguage,
} from '@/lib/studio-types';
import { loadProjects, saveProjects, getStorageUsageBytes } from '@/lib/project-migration';
import { backupToIndexedDB, restoreFromIndexedDB } from '@/lib/indexeddb-backup';
import { PlatformType } from '@/engine/types';
import { trackStudioSessionStart } from '@/lib/analytics';
import { stripEngineArtifacts } from '@/engine/pipeline';

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
// PART 2 — Hook implementation
// ============================================================

function sanitizeLoadedProjects(projects: Project[]): Project[] {
  return projects.map(project => ({
    ...project,
    sessions: project.sessions.map(session => {
      const messages = session.messages.map(message => {
        if (message.role !== 'assistant' || !message.content) return message;
        const cleanContent = stripEngineArtifacts(message.content);
        const cleanVersions = message.versions?.map(version => stripEngineArtifacts(version));
        return {
          ...message,
          content: cleanContent,
          versions: cleanVersions,
        };
      });

      const manuscripts = session.config.manuscripts?.map(manuscript => {
        const cleanContent = stripEngineArtifacts(manuscript.content);
        return {
          ...manuscript,
          content: cleanContent,
          charCount: cleanContent.length,
        };
      });

      return {
        ...session,
        messages,
        config: manuscripts ? { ...session.config, manuscripts } : session.config,
      };
    }),
  }));
}

export function useProjectManager(language: AppLanguage) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

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
      if (loaded.length === 0) {
        const restored = await restoreFromIndexedDB();
        if (restored && restored.length > 0) loaded = restored;
      }
      loaded = sanitizeLoadedProjects(loaded);
      if (loaded.length > 0) {
        setProjects(loaded);
        setCurrentProjectId(loaded[0].id);
        setCurrentSessionId(loaded[0].sessions?.[0]?.id ?? null);
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      const ok = saveProjects(projects);
      if (!ok) {
        const mb = (getStorageUsageBytes() / 1024 / 1024).toFixed(1);
        console.warn(`[NOA] Storage full (${mb}MB). Consider exporting and clearing old sessions.`);
        // Surface storage-full warning to user via custom event
        window.dispatchEvent(new CustomEvent('noa:storage-full', {
          detail: { usageMB: mb },
        }));
      }
      backupToIndexedDB(projects).catch(err => console.warn('[IndexedDB] Backup failed:', err));
      if (ok) window.dispatchEvent(new CustomEvent('noa:auto-saved'));
    }, 500);
    return () => clearTimeout(timer);
  }, [projects, hydrated]);

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

  return {
    // State
    projects, setProjects,
    currentProjectId, setCurrentProjectId,
    currentSessionId, setCurrentSessionId,
    hydrated,
    currentProject, sessions, currentSession,
    setSessions,
    // Project ops
    createNewProject, deleteProject, renameProject, moveSessionToProject,
    // Session ops
    createNewSession, deleteSession, clearAllSessions,
    updateCurrentSession, setConfig,
  };
}
