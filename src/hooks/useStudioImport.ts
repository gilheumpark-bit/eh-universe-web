import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';
import type { AppTab, StoryConfig, Project } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';

export function useStudioImport({
  hydrated,
  language,
  activeTab,
  setActiveTab,
  doCreateNewSession,
  setProjects,
  setAlertToast,
  setShowApiKeyModal,
}: {
  hydrated: boolean;
  language: string;
  activeTab: AppTab;
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
    } catch (err) {
      logger.warn('StudioImport', 'worldImport parse failed', err);
      setAlertToast({ message: language === 'KO' ? '\\uC138\\uACC4\\uAD00 \\uB370\\uC774\\uD130\\uB97C \\uBD88\\uB7EC\\uC624\\uC9C0 \\uBABB\\uD588\\uC2B5\\uB2C8\\uB2E4. \\uB9C1\\uD06C\\uAC00 \\uC190\\uC0C1\\uB410\\uC744 \\uC218 \\uC788\\uC2B5\\uB2C8\\uB2E4.' : 'Failed to import world data. The link may be corrupted.', variant: 'error' });
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
    } catch (err) {
      logger.warn('StudioImport', 'postImport parse failed', err);
      setAlertToast({ message: language === 'KO' ? '\\uAC8C\\uC2DC\\uAE00 \\uB370\\uC774\\uD130\\uB97C \\uBD88\\uB7EC\\uC624\\uC9C0 \\uBABB\\uD588\\uC2B5\\uB2C8\\uB2E4.' : 'Failed to import post data.', variant: 'error' });
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
