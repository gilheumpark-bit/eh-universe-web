"use client";

import { startTransition, useCallback, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react";
import type {
  ChangeEvent as ReactChangeEvent,
  ClipboardEvent as ReactClipboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import type { ReplaceRangeInfo } from "@/components/studio/InlineActionPopup";
import type { CreativeEventLogger } from "@/hooks/useCreativeEventLogger";
import { L4 } from "@/lib/i18n";
import type { ProactiveSuggestion, StoryConfig } from "@/lib/studio-types";
import { safeReplaceRange } from "@/lib/rewrite-range";

type WritingLanguage = Parameters<typeof L4>[0];
type SnapshotRef = MutableRefObject<{
  text: string;
  label: string;
  at: number;
  sessionId: string;
  episode: number | null;
} | null>;
type LoggedDraftRef = MutableRefObject<{ text: string; sessionId: string; episode: number | null } | null>;
type WritingSession = {
  id: string;
  config?: { episode?: number | null };
} | null;

const getCreativeLogger = (): CreativeEventLogger | null =>
  typeof window !== "undefined" ? window.__creativeLogger ?? null : null;

type UseTabWritingEditorActionsArgs = {
  commitHumanEditIfDue: (next: string) => void;
  currentSession: WritingSession;
  editDraft: string;
  editDraftRef: RefObject<HTMLTextAreaElement | null>;
  fireLog: (promise: Promise<string | null> | null | undefined) => void;
  hugePasteRef: MutableRefObject<boolean>;
  isComposingRef: MutableRefObject<boolean>;
  language: WritingLanguage;
  lastLoggedRef: LoggedDraftRef;
  lastSnapshotRef: SnapshotRef;
  manuscriptTargetId: string;
  setEditDraft: Dispatch<SetStateAction<string>>;
  setConfig: Dispatch<SetStateAction<StoryConfig>>;
  setPasteNotice: Dispatch<SetStateAction<boolean>>;
  setSnapshotMeta: Dispatch<SetStateAction<{ label: string; at: number } | null>>;
  setSuggestions: Dispatch<SetStateAction<ProactiveSuggestion[]>>;
  snapshotEpisode: number | null;
  snapshotSessionId: string | null;
};

export function useTabWritingEditorActions({
  commitHumanEditIfDue,
  currentSession,
  editDraft,
  editDraftRef,
  fireLog,
  hugePasteRef,
  isComposingRef,
  language,
  lastLoggedRef,
  lastSnapshotRef,
  manuscriptTargetId,
  setEditDraft,
  setConfig,
  setPasteNotice,
  setSnapshotMeta,
  setSuggestions,
  snapshotEpisode,
  snapshotSessionId,
}: UseTabWritingEditorActionsArgs) {
  const takeSnapshot = useCallback(
    (label: string) => {
      if (!currentSession) return;
      const at = Date.now();
      lastSnapshotRef.current = {
        text: editDraft,
        label,
        at,
        sessionId: currentSession.id,
        episode: currentSession.config?.episode ?? null,
      };
      setSnapshotMeta({ label, at });
    },
    [currentSession, editDraft, lastSnapshotRef, setSnapshotMeta],
  );

  const acceptSuggestion = useCallback(
    (suggestion: ProactiveSuggestion) => {
      const insert = suggestion.actionHint?.trim() || suggestion.message?.trim() || "";
      if (insert) {
        takeSnapshot(L4(language, { ko: "제안 삽입 전", en: "Before suggestion insert" }));
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
      }
      setSuggestions((prev) => prev.map((item) => (
        item.id === suggestion.id ? { ...item, dismissed: true, dismissCount: item.dismissCount + 1 } : item
      )));
    },
    [
      commitHumanEditIfDue,
      editDraft,
      fireLog,
      language,
      lastLoggedRef,
      manuscriptTargetId,
      setEditDraft,
      setSuggestions,
      snapshotEpisode,
      snapshotSessionId,
      takeSnapshot,
    ],
  );

  const rejectSuggestion = useCallback(
    (suggestion: ProactiveSuggestion) => {
      setSuggestions((prev) => prev.map((item) => (
        item.id === suggestion.id ? { ...item, dismissed: true, dismissCount: item.dismissCount + 1 } : item
      )));
    },
    [setSuggestions],
  );

  const openInlineRewrite = useCallback(() => {
    editDraftRef.current?.focus();
    window.dispatchEvent(new CustomEvent("noa:trigger-inline-rewrite"));
  }, [editDraftRef]);

  const onEditorContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      openInlineRewrite();
    },
    [openInlineRewrite],
  );

  const handleEditorChange = useCallback(
    (event: ReactChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      if (hugePasteRef.current) {
        hugePasteRef.current = false;
        startTransition(() => setEditDraft(next));
      } else {
        setEditDraft(next);
      }
    },
    [hugePasteRef, setEditDraft],
  );

  const handleEditorPaste = useCallback((event: ReactClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData?.getData("text") ?? "";
    if (text.length > 100_000) {
      hugePasteRef.current = true;
      setPasteNotice(true);
    }
  }, [hugePasteRef, setPasteNotice]);

  const handleEditorCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, [isComposingRef]);

  const handleEditorCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, [isComposingRef]);

  const replaceInlineSelection = useCallback(
    (oldText: string, newText: string, range?: ReplaceRangeInfo) => {
      if (!currentSession) return;
      const replaced = safeReplaceRange(
        editDraft,
        oldText,
        newText,
        range?.from ?? null,
        range?.to ?? null,
      );
      if (replaced.strategy === "no-op") {
        window.dispatchEvent(new CustomEvent("noa:toast", {
          detail: {
            message: L4(language, {
              ko: "선택한 문장을 원고에서 다시 찾지 못했습니다",
              en: "The selected text could not be found in the draft",
            }),
            tone: "amber",
          },
        }));
        return;
      }

      takeSnapshot(L4(language, { ko: "리라이트 채택 전", en: "Before rewrite accept" }));
      commitHumanEditIfDue(editDraft);
      setEditDraft(replaced.content);
      if (snapshotSessionId) {
        lastLoggedRef.current = { text: replaced.content, sessionId: snapshotSessionId, episode: snapshotEpisode };
      }
      fireLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "manuscript",
          targetId: manuscriptTargetId,
          episodeId: snapshotEpisode ?? undefined,
          afterContent: replaced.content,
          provider: "loreguard-ai",
        }),
      );

      const episode = currentSession.config?.episode ?? 1;
      setConfig((prev) => {
        const manuscripts = [...(prev.manuscripts ?? [])];
        const index = manuscripts.findIndex((manuscript) => manuscript.episode === episode);
        if (index === -1) return prev;
        const current = manuscripts[index];
        manuscripts[index] = {
          ...current,
          corrections: [
            ...(current.corrections ?? []).slice(-19),
            {
              original: oldText.slice(0, 200),
              revised: newText.slice(0, 200),
              action: "rewrite",
              timestamp: Date.now(),
            },
          ],
        };
        return { ...prev, manuscripts };
      });
    },
    [
      commitHumanEditIfDue,
      currentSession,
      editDraft,
      fireLog,
      language,
      lastLoggedRef,
      manuscriptTargetId,
      setConfig,
      setEditDraft,
      snapshotEpisode,
      snapshotSessionId,
      takeSnapshot,
    ],
  );

  return {
    acceptSuggestion,
    handleEditorChange,
    handleEditorCompositionEnd,
    handleEditorCompositionStart,
    handleEditorPaste,
    onEditorContextMenu,
    openInlineRewrite,
    rejectSuggestion,
    replaceInlineSelection,
    takeSnapshot,
  };
}
