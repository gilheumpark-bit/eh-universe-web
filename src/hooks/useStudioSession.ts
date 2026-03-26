// ============================================================
// useStudioSession — 세션 생성/데모/이름변경 로직
// StudioContext에서 공유 상태를 가져와 의존성 최소화
// ============================================================

import { useState, useCallback } from 'react';
import type { AppLanguage, AppTab, StoryConfig, ChatSession, Message } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';
import { createT } from '@/lib/i18n';
import { DEMO_PRESETS, buildDemoSession } from '@/lib/demo-presets';

interface UseStudioSessionParams {
  language: AppLanguage;
  currentSession: ChatSession | null;
  editDraft: string;
  doCreateNewSession: () => void;
  updateCurrentSession: (data: Partial<ChatSession>) => void;
  setActiveTab: (tab: AppTab) => void;
  setIsSidebarOpen: (open: boolean) => void;
  showConfirm: (opts: {
    title: string; message: string;
    confirmLabel?: string; cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;
}

export function useStudioSession({
  language, currentSession, editDraft,
  doCreateNewSession, updateCurrentSession,
  setActiveTab, setIsSidebarOpen,
  showConfirm, closeConfirm,
}: UseStudioSessionParams) {
  const t = createT(language);
  const isKO = language === 'KO';

  // Renaming
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const createNewSession = useCallback((nextTab: AppTab = 'world') => {
    const commitNewSession = () => {
      doCreateNewSession();
      setActiveTab(nextTab);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const hasCurrentWork = Boolean(
      currentSession?.messages.some(message => message.content.trim()) ||
      editDraft.trim() ||
      currentSession?.config.title?.trim() ||
      currentSession?.config.synopsis?.trim() ||
      currentSession?.config.setting?.trim() ||
      currentSession?.config.povCharacter?.trim()
    );

    if (!hasCurrentWork) {
      commitNewSession();
      return;
    }

    showConfirm({
      title: isKO ? '새로운 소설 시작' : 'Start New Story',
      message: isKO ? '현재 작업이 초기화됩니다. 진행하시겠습니까?' : 'Current work will be reset. Do you want to continue?',
      confirmLabel: isKO ? '진행' : 'Continue',
      cancelLabel: t('confirm.cancel'),
      variant: 'warning',
      onConfirm: () => { closeConfirm(); commitNewSession(); },
    });
  }, [closeConfirm, currentSession, doCreateNewSession, editDraft, isKO, showConfirm, t, setActiveTab, setIsSidebarOpen]);

  const createDemoSession = useCallback((presetId?: string) => {
    const preset = presetId
      ? DEMO_PRESETS.find(p => p.id === presetId) || DEMO_PRESETS[0]
      : DEMO_PRESETS[0];
    const demoSession = buildDemoSession(preset, isKO);
    doCreateNewSession();
    setTimeout(() => {
      updateCurrentSession({
        messages: demoSession.messages as Message[],
        config: demoSession.config as StoryConfig,
        title: demoSession.title,
      });
      setActiveTab('writing');
    }, 50);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [isKO, doCreateNewSession, updateCurrentSession, setActiveTab, setIsSidebarOpen]);

  return {
    createNewSession,
    createDemoSession,
    renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue,
  };
}
