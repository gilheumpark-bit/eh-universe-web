// ============================================================
// useStudioWritingMode — 집필 모드 상태 + editDraft 세션별 persist
// ============================================================

import { useState, useEffect, useRef } from 'react';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import type { WritingMode } from '@/lib/studio-types';

/** [P4 low/integration 2026-06-09] writingMode 세션별 영속 키 + 유효값 가드. */
const WRITING_MODE_KEY = (sessionId: string) => `noa_writingmode_${sessionId}`;
const VALID_WRITING_MODES: ReadonlySet<WritingMode> = new Set<WritingMode>(['ai', 'edit', 'canvas', 'refine', 'advanced']);
const DEFAULT_WRITING_MODE: WritingMode = 'edit';

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
  const [writingMode, setWritingMode] = useState<WritingMode>(DEFAULT_WRITING_MODE);
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

  // [P4 low/integration 2026-06-09] writingMode 세션별 복원.
  //   탭 전환 후 집필 탭 복귀 시 기본값('edit')으로 리셋되던 결함 수리.
  //   sessionId 변경 시 그 세션의 저장값(유효값만) 우선, 없으면 기본값 유지.
  useEffect(() => {
    if (!hydrated || !currentSessionId) return;
    const saved = localStorage.getItem(WRITING_MODE_KEY(currentSessionId));
    // 세션 전환 시 저장 모드 복원(이전 세션 모드 누출 방지) — localStorage 는 클라 전용이라 effect 에서 동기화.
    if (saved && VALID_WRITING_MODES.has(saved as WritingMode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 위 사유
      setWritingMode(saved as WritingMode);
    } else {
      // 저장값 없음 — 세션 전환 시 이전 세션 모드가 누출되지 않도록 기본값 복귀.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 위 사유
      setWritingMode(DEFAULT_WRITING_MODE);
    }

  }, [currentSessionId, hydrated]);

  // [P4 low/integration 2026-06-09] writingMode 변경 시 세션별 persist.
  useEffect(() => {
    if (!hydrated || !currentSessionId) return;
    localStorage.setItem(WRITING_MODE_KEY(currentSessionId), writingMode);
  }, [writingMode, currentSessionId, hydrated]);

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
