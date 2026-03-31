import { useState, useEffect, useCallback } from 'react';
import type { StoryConfig, ChatSession, Project, AppLanguage } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { generateWorldDesign, generateCharacters } from '@/services/geminiService';
import { logger } from '@/lib/logger';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';

export function useStudioQuickStart({
  language,
  showQuickStartLock,
  setShowApiKeyModal,
  currentProjectId,
  createNewProject,
  setProjects,
  setCurrentSessionId,
  setActiveTab,
  setPipelineResult,
  setUxError,
  doHandleSend,
  currentSessionId,
  currentSession,
}: {
  language: AppLanguage;
  showQuickStartLock: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  currentProjectId: string | null;
  createNewProject: () => string;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setCurrentSessionId: (id: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setActiveTab: (tab: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPipelineResult: React.Dispatch<React.SetStateAction<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setUxError: (error: any) => void;
  doHandleSend: (customPrompt?: string, overrideInput?: string, cb?: () => void) => void;
  currentSessionId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentSession: any;
}) {
  const [showQuickStartModal, setShowQuickStartModal] = useState(false);
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);
  const [pendingQuickStartPrompt, setPendingQuickStartPrompt] = useState<string | null>(null);

  const handleQuickStart = async (genre: Genre, userPrompt: string) => {
    if (showQuickStartLock) { setShowApiKeyModal(true); return; }
    setIsQuickGenerating(true);
    try {
      const world = await generateWorldDesign(genre, language, { synopsis: userPrompt });
      const qsConfig: StoryConfig = {
        ...INITIAL_CONFIG,
        title: world.title, genre, synopsis: world.synopsis,
        povCharacter: world.povCharacter, setting: world.setting,
        primaryEmotion: world.primaryEmotion, corePremise: world.corePremise,
        powerStructure: world.powerStructure, currentConflict: world.currentConflict,
        worldHistory: world.worldHistory || '', socialSystem: world.socialSystem || '',
        economy: world.economy || '', magicTechSystem: world.magicTechSystem || '',
        factionRelations: world.factionRelations || '', survivalEnvironment: world.survivalEnvironment || '',
        culture: world.culture || '', religion: world.religion || '',
        education: world.education || '', lawOrder: world.lawOrder || '',
        taboo: world.taboo || '', dailyLife: world.dailyLife || '',
        travelComm: world.travelComm || '', truthVsBeliefs: world.truthVsBeliefs || '',
      };
      const characters = await generateCharacters(qsConfig, language);
      qsConfig.characters = characters;
      const targetProjectId = currentProjectId || createNewProject();
      const newSessionId = `s-${Date.now()}`;
      const newSession: ChatSession = { id: newSessionId, title: qsConfig.title, config: qsConfig, messages: [], lastUpdate: Date.now() };
      setProjects((prev: Project[]) => prev.map((p: Project) =>
        p.id === targetProjectId
          ? { ...p, sessions: [newSession, ...p.sessions], lastUpdate: Date.now() }
          : p,
      ));
      setCurrentSessionId(newSessionId);
      setActiveTab('writing');
      setShowQuickStartModal(false);
      setPipelineResult({
        stages: [
          { stage: 'world_check', status: 'passed', duration: 0, warnings: [] },
          { stage: 'character_sync', status: 'passed', duration: 0, warnings: [] },
          { stage: 'direction_setup', status: 'skipped', duration: 0, warnings: [] },
          { stage: 'generation', status: 'running', duration: 0, warnings: [] },
        ],
        finalStatus: 'running',
      });
      setPendingQuickStartPrompt(`${userPrompt}\n\n\\uCCAB \\uC7A5\\uBA74\\uC744 \\uC368\\uC918.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (/401|api key|not configured/i.test(errorMessage)) {
        setShowApiKeyModal(true);
      } else {
        logger.error("Studio", "Quick Start Failed:", err);
        setUxError({ error: err });
      }
    } finally {
      setIsQuickGenerating(false);
    }
  };

  useEffect(() => {
    if (pendingQuickStartPrompt && currentSessionId && currentSession) {
      doHandleSend(pendingQuickStartPrompt, '', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPipelineResult((prev: any) => prev ? { ...prev, finalStatus: 'completed' as const, stages: prev.stages.map((s: any) => ({ ...s, status: s.status === 'skipped' ? 'skipped' as const : 'passed' as const })) } : null);
      });
      setPendingQuickStartPrompt(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuickStartPrompt, currentSessionId, currentSession]);

  const openQuickStart = useCallback(() => {
    if (showQuickStartLock) { setShowApiKeyModal(true); return; }
    setShowQuickStartModal(true);
  }, [showQuickStartLock, setShowApiKeyModal]);

  return {
    showQuickStartModal,
    setShowQuickStartModal,
    isQuickGenerating,
    handleQuickStart,
    openQuickStart,
  };
}
