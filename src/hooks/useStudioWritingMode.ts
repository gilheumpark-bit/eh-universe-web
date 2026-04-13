// ============================================================
// useStudioWritingMode — 집필 모드 상태 + editDraft 세션별 persist
// ============================================================

import { useState, useEffect, useRef } from 'react';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';

type WritingMode = 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced';

const DEFAULT_ADVANCED: AdvancedWritingSettings = {
  sceneGoals: [],
  constraints: { pov: '3rd-limited', dialogueRatio: 40, tempo: 'stable', sentenceLen: 'normal', emotionExposure: 'normal' },
  references: { prevEpisodes: 3, characterCards: true, worldSetting: true, styleProfile: false, sceneSheet: false, platformPreset: false },
  locks: { speechStyle: false, worldRules: false, charRelations: false, bannedWords: false },
  outputMode: 'draft', includes: '', excludes: '',
};

/**
 * Manages writing mode state (ai/edit/canvas/refine/advanced) with per-session editDraft persistence.
 * @param currentSessionId - Active session for draft isolation
 * @param hydrated - Whether localStorage has been loaded (prevents SSR flash)
 */
export function useStudioWritingMode(currentSessionId: string | null, hydrated: boolean) {
  const [writingMode, setWritingMode] = useState<WritingMode>('edit');
  const [editDraft, setEditDraft] = useState('');
  const editDraftRef = useRef<HTMLTextAreaElement>(null);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedWritingSettings>(DEFAULT_ADVANCED);
  const [canvasContent, setCanvasContent] = useState('');
  const [canvasPass, setCanvasPass] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('noa_canvasPass');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [promptDirective, setPromptDirective] = useState('');

  // canvasPass persist
  useEffect(() => {
    if (canvasPass > 0) sessionStorage.setItem('noa_canvasPass', String(canvasPass));
    else sessionStorage.removeItem('noa_canvasPass');
  }, [canvasPass]);

  // editDraft 세션별 임시 저장 복원
  // hydration 후 localStorage에서 복원 — 의도적 setState
  useEffect(() => {
    if (!hydrated || !currentSessionId) return;
    const saved = localStorage.getItem(`noa_editdraft_${currentSessionId}`);
    if (saved !== null) {
      setTimeout(() => setEditDraft(saved), 0);
    }
     
  }, [currentSessionId, hydrated]);

  useEffect(() => {
    if (!currentSessionId || !hydrated) return;
    const key = `noa_editdraft_${currentSessionId}`;
    if (editDraft) {
      localStorage.setItem(key, editDraft);
    } else {
      const timer = setTimeout(() => {
        if (!editDraft) localStorage.removeItem(key);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [editDraft, currentSessionId, hydrated]);

  return {
    writingMode, setWritingMode,
    editDraft, setEditDraft,
    editDraftRef,
    advancedSettings, setAdvancedSettings,
    canvasContent, setCanvasContent,
    canvasPass, setCanvasPass,
    promptDirective, setPromptDirective,
  };
}
