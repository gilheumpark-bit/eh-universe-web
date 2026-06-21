import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';
import type { AppTab, StoryConfig, Project } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';

export function resolveStudioImportProjectScopeId(currentProjectId?: string | null): string | null {
  const trimmed = currentProjectId?.trim();
  return trimmed ? trimmed : null;
}

export function useStudioImport({
  hydrated,
  language,
  activeTab,
  currentProjectId,
  setActiveTab,
  doCreateNewSession,
  setProjects,
  setAlertToast,
  setShowApiKeyModal,
}: {
  hydrated: boolean;
  language: string;
  activeTab: AppTab;
  currentProjectId: string | null;
  setActiveTab: (tab: AppTab) => void;
  doCreateNewSession: () => string;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setAlertToast: (toast: { message: string; variant: string } | null) => void;
  setShowApiKeyModal: (show: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const studioRouter = useRouter();
  const pathname = usePathname();
  const [worldImportBanner, setWorldImportBanner] = useState(false);
  const [worldImportDone, setWorldImportDone] = useState<string | null>(null);

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
      setProjects((prevProjects: Project[]) => prevProjects.map(project => {
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

      // [Track-D Phase 1 P0-5 Trigger 2 — 2026-05-07] EXTERNAL_IMPORT 자동 기록.
      // dynamic import 로 격리. SSR-safe + 실패 시 silent.
      // useEffect 콜백이 동기이므로 IIFE async 로 fire-and-forget.
      void (async () => {
        try {
          if (typeof window === 'undefined') return;
          const projectId = resolveStudioImportProjectScopeId(currentProjectId);
          if (!projectId) return;
          const cp = await import('@/lib/creative-process');
          const contentJson = JSON.stringify(importedConfig);
          const contentHash = await cp.computeSha256Hex(contentJson);
          const sourceId = await cp.recordSource({
            projectId,
            sourceType: 'external_doc',
            label: importedConfig.title || 'World Import',
            contentHash,
            url: window.location.href,
            visibility: 'private',
          });
          await cp.recordCreativeEvent({
            projectId,
            targetType: 'world',
            targetId: importedSessionId,
            eventType: 'import',
            actorType: 'human',
            actorId: 'author',
            originType: 'EXTERNAL_IMPORT',
            beforeHash: null,
            afterHash: contentHash,
            sourceId,
          });
        } catch (cpErr) { logger.warn('StudioImport', 'creative-process logging failed (non-blocking)', cpErr); }
      })();
    } catch (err) {
      logger.warn('StudioImport', 'worldImport parse failed', err);
      setAlertToast({ message: language === 'KO' ? '세계관 데이터를 불러오지 못했습니다. 링크가 손상됐을 수 있습니다.' : 'Failed to import world data. The link may be corrupted.', variant: 'error' });
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
      setProjects((prevProjects: Project[]) => prevProjects.map(project => {
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

      void (async () => {
        try {
          if (typeof window === 'undefined') return;
          const projectId = resolveStudioImportProjectScopeId(currentProjectId);
          if (!projectId) return;
          const cp = await import('@/lib/creative-process');
          const importedContent = [
            importedConfig.title ? `제목: ${importedConfig.title}` : '',
            importedConfig.setting ? `출처 위치: ${importedConfig.setting}` : '',
            typeof json.content === 'string' ? json.content : '',
          ].filter(Boolean).join('\n\n');
          const contentHash = await cp.computeSha256Hex(importedContent || JSON.stringify(importedConfig));
          const sourceId = await cp.recordSource({
            projectId,
            sourceType: 'external_doc',
            label: importedConfig.title || 'Post Import',
            contentHash,
            url: window.location.href,
            visibility: 'private',
          });
          await cp.recordCreativeEvent({
            projectId,
            targetType: 'manuscript',
            targetId: importedSessionId,
            eventType: 'import',
            actorType: 'human',
            actorId: 'author',
            originType: 'EXTERNAL_IMPORT',
            beforeHash: null,
            afterHash: contentHash,
            sourceId,
          });
        } catch (cpErr) { logger.warn('StudioImport', 'postImport creative-process logging failed (non-blocking)', cpErr); }
      })();
    } catch (err) {
      logger.warn('StudioImport', 'postImport parse failed', err);
      setAlertToast({ message: language === 'KO' ? '게시글 데이터를 불러오지 못했습니다.' : 'Failed to import post data.', variant: 'error' });
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

  return { worldImportBanner, setWorldImportBanner };
}
