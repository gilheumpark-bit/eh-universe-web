"use client";

import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { AppLanguage, ChatSession, Project, StoryConfig, WritingMode } from '@/lib/studio-types';
import { useFormatOnSave } from '@/hooks/useFormatOnSave';
import { useNovelIDESettings } from '@/hooks/useNovelIDESettings';
import { saveProjects } from '@/lib/project-migration';
import { sanitizeLoadedText } from '@/lib/project-sanitize';

export function mergeDraftIntoProjects(
  currentProjects: Project[],
  sessionId: string,
  draft: string,
  episodeOverride?: number,
): Project[] {
  const sessionEntry = currentProjects
    .flatMap(project => project.sessions.map(session => ({ project, session })))
    .find(entry => entry.session.id === sessionId);

  if (!sessionEntry) return currentProjects;

  const episode = episodeOverride ?? sessionEntry.session.config?.episode ?? 1;
  const previousManuscripts = sessionEntry.session.config.manuscripts ?? [];
  const manuscriptIndex = previousManuscripts.findIndex(manuscript => manuscript.episode === episode);
  const title = sessionEntry.session.config.title || `Episode ${episode}`;
  const now = Date.now();
  const nextEntry = manuscriptIndex >= 0
    ? { ...previousManuscripts[manuscriptIndex], content: draft, charCount: draft.length, lastUpdate: now }
    : { episode, title, content: draft, charCount: draft.length, lastUpdate: now };
  const nextManuscripts = manuscriptIndex >= 0
    ? previousManuscripts.map((manuscript, index) => index === manuscriptIndex ? nextEntry : manuscript)
    : [...previousManuscripts, nextEntry];
  const nextSession = {
    ...sessionEntry.session,
    config: { ...sessionEntry.session.config, manuscripts: nextManuscripts },
    lastUpdate: now,
  };

  return currentProjects.map(project =>
    project.id === sessionEntry.project.id
      ? {
        ...project,
        sessions: project.sessions.map(session => session.id === sessionId ? nextSession : session),
        lastUpdate: now,
      }
      : project,
  );
}

interface UseStudioShellDraftPersistenceOptions {
  hydrated: boolean;
  currentSessionId: string | null;
  currentSession: ChatSession | null | undefined;
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  writingMode: WritingMode;
  editDraft: string;
  setEditDraft: Dispatch<SetStateAction<string>>;
  setConfig: (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
  saveFlushRef: MutableRefObject<(() => Promise<boolean> | boolean) | null>;
  language: AppLanguage;
  saveFailed: boolean;
}

export function useStudioShellDraftPersistence({
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
}: UseStudioShellDraftPersistenceOptions): () => boolean {
  const pendingDraftRef = useRef<{ editDraft: string; episode: number; sessionId: string } | null>(null);
  const flushPendingDraftRef = useRef<() => boolean>(() => true);
  const prevDraftTargetRef = useRef<string | null>(null);
  const episodeForFlush = currentSession?.config?.episode ?? null;

  useEffect(() => {
    const target = `${currentSessionId ?? ''}::${episodeForFlush ?? ''}`;
    const previousTarget = prevDraftTargetRef.current;
    prevDraftTargetRef.current = target;
    if (previousTarget !== null && previousTarget !== target) {
      flushPendingDraftRef.current();
    }
  }, [currentSessionId, episodeForFlush]);

  useEffect(() => {
    return () => { flushPendingDraftRef.current(); };
  }, []);

  const prevEpisodeLoadRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${currentSessionId ?? ''}::${episodeForFlush ?? ''}`;
    const previousKey = prevEpisodeLoadRef.current;
    prevEpisodeLoadRef.current = key;
    if (previousKey === null || previousKey === key) return;

    const previousSessionId = previousKey.split('::')[0];
    if (previousSessionId !== (currentSessionId ?? '')) return;

    const episode = episodeForFlush ?? 1;
    const content = currentSession?.config?.manuscripts?.find(manuscript => manuscript.episode === episode)?.content ?? '';
    setEditDraft(content);
    // currentSession intentionally excluded: episode change is the only reload trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, episodeForFlush]);

  useEffect(() => {
    if (!hydrated || !currentSessionId) return;
    if (!editDraft) {
      if (pendingDraftRef.current?.sessionId === currentSessionId) pendingDraftRef.current = null;
      return;
    }
    if (writingMode !== 'edit') return;
    if (!currentSession) return;

    const episode = currentSession.config?.episode ?? 1;
    pendingDraftRef.current = { editDraft, episode, sessionId: currentSessionId };
    const debounceTimer = setTimeout(() => {
      const now = Date.now();
      setConfig(previousConfig => {
        const previousManuscripts = previousConfig.manuscripts ?? [];
        const manuscriptIndex = previousManuscripts.findIndex(manuscript => manuscript.episode === episode);
        const title = previousConfig.title || `Episode ${episode}`;
        const nextEntry = manuscriptIndex >= 0
          ? { ...previousManuscripts[manuscriptIndex], content: editDraft, charCount: editDraft.length, lastUpdate: now }
          : { episode, title, content: editDraft, charCount: editDraft.length, lastUpdate: now };
        const nextManuscripts = manuscriptIndex >= 0
          ? previousManuscripts.map((manuscript, index) => index === manuscriptIndex ? nextEntry : manuscript)
          : [...previousManuscripts, nextEntry];
        return { ...previousConfig, manuscripts: nextManuscripts };
      });
      pendingDraftRef.current = null;
    }, 2000);

    return () => clearTimeout(debounceTimer);
    // currentSession/setConfig intentionally excluded to preserve debounce semantics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDraft, writingMode, currentSessionId, hydrated]);

  const projectsRefForFlush = useRef(projects);
  projectsRefForFlush.current = projects;
  const editDraftRefForFlush = useRef(editDraft);
  editDraftRefForFlush.current = editDraft;

  flushPendingDraftRef.current = () => {
    const pending = pendingDraftRef.current;
    if (!pending) return true;

    const currentProjects = projectsRefForFlush.current;
    const nextProjects = mergeDraftIntoProjects(
      currentProjects,
      pending.sessionId,
      pending.editDraft,
      pending.episode,
    );

    if (nextProjects === currentProjects) {
      pendingDraftRef.current = null;
      return true;
    }

    const saved = saveProjects(nextProjects);
    if (saved) {
      setProjects(nextProjects);
      projectsRefForFlush.current = nextProjects;
      pendingDraftRef.current = null;
    }
    return saved;
  };

  const formatOnSave = useFormatOnSave();
  const { settings: ideSettings } = useNovelIDESettings();
  const applyFormatRef = useRef(formatOnSave.applyFormat);
  applyFormatRef.current = formatOnSave.applyFormat;
  const formatEnabledRef = useRef(formatOnSave.settings.enabled && ideSettings.formatOnSaveAutoApply);
  formatEnabledRef.current = formatOnSave.settings.enabled && ideSettings.formatOnSaveAutoApply;
  const currentSessionIdRefForFlush = useRef(currentSessionId);
  currentSessionIdRefForFlush.current = currentSessionId;
  const writingModeRefForFlush = useRef(writingMode);
  writingModeRefForFlush.current = writingMode;

  useEffect(() => {
    saveFlushRef.current = () => {
      flushPendingDraftRef.current();

      const sessionId = currentSessionIdRefForFlush.current;
      let draft = editDraftRefForFlush.current;
      const mode = writingModeRefForFlush.current;
      const currentProjects = projectsRefForFlush.current;

      if (formatEnabledRef.current && draft && mode === 'edit') {
        const formatted = applyFormatRef.current(draft);
        if (formatted !== draft) {
          draft = formatted;
          editDraftRefForFlush.current = formatted;
          setEditDraft(formatted);
        }
      }

      if (draft) {
        const cleanDraft = sanitizeLoadedText(draft);
        if (cleanDraft !== draft) {
          draft = cleanDraft;
          editDraftRefForFlush.current = cleanDraft;
          setEditDraft(cleanDraft);
        }
      }

      if (sessionId && draft) {
        try {
          localStorage.setItem(`noa_editdraft_${sessionId}`, draft);
        } catch (error) {
          throw error instanceof Error ? error : new Error('localStorage write failed');
        }
      }

      let nextProjects = currentProjects;
      if (sessionId && draft && mode === 'edit') {
        nextProjects = mergeDraftIntoProjects(currentProjects, sessionId, draft);
      }

      const saved = saveProjects(nextProjects);
      if (saved && nextProjects !== currentProjects) {
        setProjects(nextProjects);
      }
      return saved;
    };

    return () => { saveFlushRef.current = null; };
  }, [saveFlushRef, setEditDraft, setProjects]);

  useEffect(() => {
    if (!saveFailed) return;
    window.dispatchEvent(new CustomEvent('noa:alert', {
      detail: {
        message: language === 'KO'
          ? '저장 실패 — 용량을 확인하거나 일부 데이터를 내보내세요.'
          : 'Save failed — check storage quota or export old data.',
        variant: 'error',
      },
    }));
  }, [saveFailed, language]);

  return useCallback(() => flushPendingDraftRef.current(), []);
}
