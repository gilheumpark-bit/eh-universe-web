import { useState, useEffect, useCallback, useRef } from 'react';
import type { StoryConfig, ChatSession, Project, AppLanguage, AppTab, PipelineStageResult } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { generateWorldDesign, generateCharacters } from '@/services/geminiService';
import { logger } from '@/lib/logger';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';

type PendingQuickStart = {
  prompt: string;
  sessionId: string;
};

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
  setActiveTab: (tab: AppTab) => void;
  setPipelineResult: React.Dispatch<React.SetStateAction<{ stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null>>;
  setUxError: (error: { error: unknown; retry?: () => void } | null) => void;
  doHandleSend: (customPrompt?: string, overrideInput?: string, cb?: () => void) => void;
  currentSessionId: string | null;
  currentSession: ChatSession | null;
}) {
  const [showQuickStartModal, setShowQuickStartModal] = useState(false);
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);
  const [pendingQuickStart, setPendingQuickStart] = useState<PendingQuickStart | null>(null);
  const inFlightRef = useRef(false);

  const handleQuickStart = async (genre: Genre, userPrompt: string) => {
    // [C] Lock 체크는 사용자가 DGX/기존키 없이 Gemini 무료키 경로를 선택한 경우에만 의미있음.
    // QuickStartModal의 provider 선택 UI에서 이미 분기하므로 여기서는 실패 시 fallback만.
    if (showQuickStartLock) { setShowApiKeyModal(true); return; }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsQuickGenerating(true);
    try {
      const tempConfig = { genre, synopsis: userPrompt } as StoryConfig;
      const world = await generateWorldDesign(genre, language, { synopsis: userPrompt });
      const characters = await generateCharacters(tempConfig, language);

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
        characters,
      };
      
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
      setPendingQuickStart({
        prompt: `${userPrompt}\n\n\\uCCAB \\uC7A5\\uBA74\\uC744 \\uC368\\uC918.`,
        sessionId: newSessionId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (/401|api key|not configured/i.test(errorMessage)) {
        setShowApiKeyModal(true);
      } else if (/aborted|timeout|timed out/i.test(errorMessage)) {
        setUxError({
          error: new Error(
            language === 'KO'
              ? '쾌속 시작 생성이 시간 초과로 중단되었습니다. 잠시 후 다시 시도해 주세요.'
              : 'Quick Start timed out. Please try again in a moment.',
          ),
          retry: () => {
            void handleQuickStart(genre, userPrompt);
          },
        });
      } else {
        logger.error("Studio", "Quick Start Failed:", err);
        setUxError({ error: err });
      }
    } finally {
      setIsQuickGenerating(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!pendingQuickStart) return;
    if (currentSessionId !== pendingQuickStart.sessionId) return;
    if (!currentSession || currentSession.id !== pendingQuickStart.sessionId) return;

    doHandleSend(pendingQuickStart.prompt, '', () => {
        setPipelineResult((prev) => prev ? { ...prev, finalStatus: 'completed' as const, stages: prev.stages.map((s) => ({ ...s, status: s.status === 'skipped' ? 'skipped' as const : 'passed' as const })) } : null);
    });
    setPendingQuickStart(null);
  }, [currentSession, currentSessionId, doHandleSend, pendingQuickStart, setPipelineResult]);

  const openQuickStart = useCallback(() => {
    // [K] Lock 상태여도 모달을 열어 provider 선택(Gemini/DGX/기타) UI를 먼저 보여줌.
    // 사용자는 왜 키가 필요한지 이해한 뒤 스스로 선택할 수 있음 (이탈 방지).
    setShowQuickStartModal(true);
  }, []);

  return {
    showQuickStartModal,
    setShowQuickStartModal,
    isQuickGenerating,
    handleQuickStart,
    openQuickStart,
  };
}
