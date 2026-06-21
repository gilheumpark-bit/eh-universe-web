"use client";

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { CreativeEventLogger } from "@/hooks/useCreativeEventLogger";
import type { Message } from "@/lib/studio-types";
import { S4_PREVIEW_LEN } from "@/components/loreguard/tabs/TabWriting.shared";

const getCreativeLogger = (): CreativeEventLogger | null =>
  typeof window !== "undefined" ? window.__creativeLogger ?? null : null;

type UseTabWritingAiResultArgs = {
  commitHumanEditIfDue: (next: string) => void;
  editDraft: string;
  filteredMessages: Message[];
  fireLog: (promise: Promise<string | null> | null | undefined) => void;
  handleRegenerate: (messageId: string) => Promise<void> | void;
  isGenerating: boolean;
  lastLoggedRef: MutableRefObject<{ text: string; sessionId: string; episode: number | null } | null>;
  manuscriptTargetId: string;
  setEditDraft: Dispatch<SetStateAction<string>>;
  snapshotEpisode: number | null;
  snapshotSessionId: string | null;
  takeSnapshot: (label: string) => void;
  aiInsertSnapshotLabel: string;
};

export function useTabWritingAiResult({
  commitHumanEditIfDue,
  editDraft,
  filteredMessages,
  fireLog,
  handleRegenerate,
  isGenerating,
  lastLoggedRef,
  manuscriptTargetId,
  setEditDraft,
  snapshotEpisode,
  snapshotSessionId,
  takeSnapshot,
  aiInsertSnapshotLabel,
}: UseTabWritingAiResultArgs) {
  const [aiResult, setAiResult] = useState<{ msgId: string; content: string } | null>(null);
  const [aiResultExpanded, setAiResultExpanded] = useState(false);
  const lastHandledAiMsgRef = useRef<{ id: string; content: string } | null>(null);
  const prevGeneratingRef = useRef(false);
  const genTargetRef = useRef<{ sessionId: string | null; episode: number | null } | null>(null);
  const cancelledByUserRef = useRef(false);

  const latestAssistantMsg = (() => {
    for (let index = filteredMessages.length - 1; index >= 0; index -= 1) {
      const message = filteredMessages[index];
      if (message.role === "assistant" && message.content.trim()) return message;
    }
    return null;
  })();

  useEffect(() => {
    const wasGenerating = prevGeneratingRef.current;
    prevGeneratingRef.current = isGenerating;
    if (isGenerating && !wasGenerating) {
      genTargetRef.current = { sessionId: snapshotSessionId, episode: snapshotEpisode };
      return;
    }
    if (!isGenerating && wasGenerating) {
      const cancelled = cancelledByUserRef.current;
      cancelledByUserRef.current = false;
      if (cancelled) return;
      const target = genTargetRef.current;
      genTargetRef.current = null;
      if (!target || target.sessionId !== snapshotSessionId || target.episode !== snapshotEpisode) return;
      if (!latestAssistantMsg) return;
      const handled = lastHandledAiMsgRef.current;
      if (handled && handled.id === latestAssistantMsg.id && handled.content === latestAssistantMsg.content) return;
      lastHandledAiMsgRef.current = { id: latestAssistantMsg.id, content: latestAssistantMsg.content };
      const resultTimer = window.setTimeout(() => {
        setAiResult({ msgId: latestAssistantMsg.id, content: latestAssistantMsg.content });
        setAiResultExpanded(false);
      }, 0);
      return () => window.clearTimeout(resultTimer);
    }
  }, [isGenerating, latestAssistantMsg, snapshotSessionId, snapshotEpisode]);

  useEffect(() => {
    lastHandledAiMsgRef.current = null;
    const resetTimer = window.setTimeout(() => {
      setAiResult(null);
      setAiResultExpanded(false);
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [snapshotSessionId, snapshotEpisode]);

  const insertAiResult = () => {
    if (!aiResult) return;
    const insert = aiResult.content.trim();
    if (!insert) {
      setAiResult(null);
      return;
    }
    takeSnapshot(aiInsertSnapshotLabel);
    commitHumanEditIfDue(editDraft);
    const nextDraft = editDraft ? editDraft.replace(/\s*$/, "") + "\n" + insert : insert;
    setEditDraft((prev) => (prev ? prev.replace(/\s*$/, "") + "\n" + insert : insert));
    if (snapshotSessionId) {
      lastLoggedRef.current = { text: nextDraft, sessionId: snapshotSessionId, episode: snapshotEpisode };
    }
    fireLog(
      getCreativeLogger()?.logAcceptAI({
        targetType: "manuscript",
        targetId: manuscriptTargetId,
        episodeId: snapshotEpisode ?? undefined,
        afterContent: nextDraft,
        provider: "loreguard-ai",
      }),
    );
    setAiResult(null);
  };

  const dismissAiResult = () => setAiResult(null);

  const regenerateLatest = () => {
    if (isGenerating || !latestAssistantMsg) return;
    void handleRegenerate(latestAssistantMsg.id);
  };

  const markGenerationCancelled = () => {
    cancelledByUserRef.current = true;
  };

  const aiResultNeedsToggle = (aiResult?.content.length ?? 0) > S4_PREVIEW_LEN;
  const aiResultPreview =
    aiResult && aiResultNeedsToggle
      ? aiResult.content.slice(0, S4_PREVIEW_LEN).trimEnd() + "…"
      : aiResult?.content ?? "";

  return {
    aiResult,
    aiResultExpanded,
    aiResultNeedsToggle,
    aiResultPreview,
    dismissAiResult,
    insertAiResult,
    latestAssistantMsg,
    markGenerationCancelled,
    regenerateLatest,
    setAiResultExpanded,
  };
}
