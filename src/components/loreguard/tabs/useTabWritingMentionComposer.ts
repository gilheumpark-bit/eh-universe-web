"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { L4 } from "@/lib/i18n";
import {
  buildMentionContextBlock,
  buildMentionItems,
  detectMentionQuery,
  filterMentionItems,
  applyMention,
  type MentionItem,
} from "@/components/loreguard/ComposerExtras";
import {
  buildAIWritePromptFromContextPack,
  buildWritingContextPack,
} from "@/lib/writing-workspace/context-pack";
import { CONTEXT_WORLD_FIELDS } from "@/components/loreguard/tabs/TabWriting.shared";
import type { AppLanguage } from "@/lib/studio-types";

type WritingLanguage = AppLanguage;
type WritingSession = {
  id: string;
  config: Parameters<typeof buildMentionItems>[0];
} | null;

type UseTabWritingMentionComposerArgs = {
  currentProjectId: string | null;
  currentSession: WritingSession;
  editDraft: string;
  handleSend: (prompt: string) => void;
  hasAiAccess: boolean;
  input: string;
  isGenerating: boolean;
  language: WritingLanguage;
  setInput: Dispatch<SetStateAction<string>>;
  setRightPanelCollapsed: Dispatch<SetStateAction<boolean>>;
  setShowApiKeyModal: Dispatch<SetStateAction<boolean>>;
  setWritingWorkspaceMode: Dispatch<SetStateAction<"focus" | "advanced">>;
};

export function useTabWritingMentionComposer({
  currentProjectId,
  currentSession,
  editDraft,
  handleSend,
  hasAiAccess,
  input,
  isGenerating,
  language,
  setInput,
  setRightPanelCollapsed,
  setShowApiKeyModal,
  setWritingWorkspaceMode,
}: UseTabWritingMentionComposerArgs) {
  const genInputRef = useRef<HTMLInputElement | null>(null);
  const [mentionState, setMentionState] = useState<{ start: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionSuppressRef = useRef<number | null>(null);
  const mentionCaretRafRef = useRef<number | null>(null);
  const mentionLastStartRef = useRef<number | null>(null);
  const mentionListboxId = useId();

  useEffect(
    () => () => {
      if (mentionCaretRafRef.current != null) cancelAnimationFrame(mentionCaretRafRef.current);
    },
    [],
  );

  const openNoaSuggestionPoint = useCallback(() => {
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    if (!input.trim()) {
      setInput(L4(language, {
        ko: "현재 원고의 다음 장면 후보를 3개로 정리해 주세요.",
        en: "List three candidate next scenes from the current draft.",
      }));
    }
    const focusComposer = () => genInputRef.current?.focus();
    if (typeof window === "undefined") {
      focusComposer();
      return;
    }
    window.requestAnimationFrame(focusComposer);
  }, [hasAiAccess, input, language, setInput, setShowApiKeyModal]);

  const mentionItems = useMemo<MentionItem[]>(
    () =>
      currentSession?.config
        ? buildMentionItems(currentSession.config, CONTEXT_WORLD_FIELDS, language)
        : [],
    [currentSession, language],
  );

  const mentionFiltered = useMemo(
    () => (mentionState ? filterMentionItems(mentionItems, mentionState.query) : []),
    [mentionState, mentionItems],
  );
  const mentionOpen = mentionState != null && mentionFiltered.length > 0;
  const mentionActiveIdx = Math.min(mentionIndex, Math.max(0, mentionFiltered.length - 1));

  const updateMention = useCallback((el: HTMLInputElement) => {
    const caret = el.selectionStart ?? el.value.length;
    const detected = detectMentionQuery(el.value, caret);
    if (!detected || mentionSuppressRef.current === detected.start) {
      if (detected == null) mentionSuppressRef.current = null;
      mentionLastStartRef.current = null;
      setMentionState(null);
      return;
    }
    if (mentionLastStartRef.current !== detected.start) setMentionIndex(0);
    mentionLastStartRef.current = detected.start;
    setMentionState(detected);
  }, []);

  const selectMention = useCallback(
    (item: MentionItem) => {
      const el = genInputRef.current;
      const state = mentionState;
      if (!el || !state) return;
      const caret = el.selectionStart ?? input.length;
      const applied = applyMention(input, caret, state.start, item);
      setInput(applied.next);
      setMentionState(null);
      setMentionIndex(0);
      mentionSuppressRef.current = null;
      mentionLastStartRef.current = null;
      if (mentionCaretRafRef.current != null) cancelAnimationFrame(mentionCaretRafRef.current);
      mentionCaretRafRef.current = requestAnimationFrame(() => {
        mentionCaretRafRef.current = null;
        el.focus();
        try {
          el.setSelectionRange(applied.caret, applied.caret);
        } catch {
          /* selection restore best effort */
        }
      });
    },
    [mentionState, input, setInput],
  );

  const dismissMention = useCallback(() => {
    setMentionState(null);
  }, []);

  const suppressMention = useCallback(() => {
    mentionSuppressRef.current = mentionState?.start ?? null;
    setMentionState(null);
  }, [mentionState]);

  const submitGenerate = useCallback(() => {
    if (isGenerating) return;
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    if (!input.trim()) return;
    const sessionConfig = currentSession?.config;
    if (!sessionConfig) return;
    setMentionState(null);
    const mentionBlock = buildMentionContextBlock(input, mentionItems, language);
    const sceneRequest = input.replace(/\s+$/, "");
    const sceneInstruction = mentionBlock ? sceneRequest + mentionBlock : sceneRequest;
    const contextPack = buildWritingContextPack({
      config: sessionConfig,
      projectId: currentProjectId,
      sessionId: currentSession.id,
    });
    const promptPayload = buildAIWritePromptFromContextPack({
      pack: contextPack,
      scene: sceneInstruction,
      manuscript: editDraft,
      useAgentRegistry: true,
    });
    if (!promptPayload.canGenerate) {
      setWritingWorkspaceMode("advanced");
      setRightPanelCollapsed(false);
      window.dispatchEvent(new CustomEvent("noa:toast", {
        detail: {
          message: L4(language, {
            ko: "작품 정보 확인이 필요합니다. 고급 작업에서 빠진 항목과 충돌 항목을 확인해 주세요.",
            en: "Review the work info in Advanced before sending.",
          }),
          variant: "warning",
        },
      }));
      return;
    }
    handleSend(promptPayload.prompt);
  }, [
    currentProjectId,
    currentSession,
    editDraft,
    handleSend,
    hasAiAccess,
    input,
    isGenerating,
    language,
    mentionItems,
    setRightPanelCollapsed,
    setShowApiKeyModal,
    setWritingWorkspaceMode,
  ]);

  return {
    dismissMention,
    genInputRef,
    mentionActiveIdx,
    mentionFiltered,
    mentionListboxId,
    mentionOpen,
    openNoaSuggestionPoint,
    selectMention,
    setMentionIndex,
    submitGenerate,
    suppressMention,
    updateMention,
  };
}
