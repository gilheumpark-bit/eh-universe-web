"use client";

import { useCallback } from 'react';
import type { AppLanguage, ChatSession, StoryConfig } from '@/lib/studio-types';
import { generateEpisodeSummary } from '@/engine/episode-summarizer';
import { showAlert } from '@/lib/show-alert';

interface UseStudioShellNextEpisodeOptions {
  currentSession: ChatSession | null | undefined;
  editDraft: string;
  language: AppLanguage;
  setConfig: (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
}

export function useStudioShellNextEpisode({
  currentSession,
  editDraft,
  language,
  setConfig,
}: UseStudioShellNextEpisodeOptions): () => void {
  const scheduleSummaryGeneration = useCallback((episode: number, draftContent: string) => {
    if (draftContent.length < 100) return;

    setTimeout(async () => {
      try {
        const summary = await generateEpisodeSummary(draftContent, language);
        if (!summary) return;
        setConfig(previousConfig => {
          const nextManuscripts = (previousConfig.manuscripts || []).map(manuscript =>
            manuscript.episode === episode ? { ...manuscript, summary } : manuscript,
          );
          return { ...previousConfig, manuscripts: nextManuscripts };
        });
        showAlert(
          language === 'KO'
            ? '에피소드 요약이 준비되었습니다'
            : 'Episode summary is ready',
          'info',
        );
      } catch {
        // Background summary is helpful but not required for moving to the next episode.
      }
    }, 0);
  }, [language, setConfig]);

  return useCallback(() => {
    if (!currentSession) return;

    const currentEpisode = currentSession.config.episode ?? 1;
    const nextEpisode = Math.min(
      currentSession.config.episode + 1,
      currentSession.config.totalEpisodes,
    );
    const draftContent = editDraft || '';

    if (!draftContent.trim()) {
      setConfig(previousConfig => ({ ...previousConfig, episode: nextEpisode }));
      return;
    }

    const manuscript = {
      episode: currentEpisode,
      title: currentSession.config.title || `EP.${currentEpisode}`,
      content: draftContent,
      charCount: draftContent.replace(/\s/g, '').length,
      lastUpdate: Date.now(),
    };

    setConfig(previousConfig => {
      const nextManuscripts = [...(previousConfig.manuscripts || [])];
      const manuscriptIndex = nextManuscripts.findIndex(item => item.episode === currentEpisode);
      if (manuscriptIndex >= 0) {
        nextManuscripts[manuscriptIndex] = { ...nextManuscripts[manuscriptIndex], ...manuscript };
      } else {
        nextManuscripts.push(manuscript);
      }
      return { ...previousConfig, manuscripts: nextManuscripts, episode: nextEpisode };
    });

    scheduleSummaryGeneration(currentEpisode, draftContent);
  }, [currentSession, editDraft, scheduleSummaryGeneration, setConfig]);
}
