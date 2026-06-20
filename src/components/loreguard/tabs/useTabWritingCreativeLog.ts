"use client";

import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import type { CreativeEventLogger } from "@/hooks/useCreativeEventLogger";
import { L4 } from "@/lib/i18n";

type WritingLanguage = Parameters<typeof L4>[0];
type LoggedDraft = { text: string; sessionId: string; episode: number | null };

const getCreativeLogger = (): CreativeEventLogger | null =>
  typeof window !== "undefined" ? window.__creativeLogger ?? null : null;

type UseTabWritingCreativeLogArgs = {
  editDraft: string;
  isComposingRef: MutableRefObject<boolean>;
  language: WritingLanguage;
  manuscriptTargetId: string;
  snapshotEpisode: number | null;
  snapshotSessionId: string | null;
};

export function useTabWritingCreativeLog({
  editDraft,
  isComposingRef,
  language,
  manuscriptTargetId,
  snapshotEpisode,
  snapshotSessionId,
}: UseTabWritingCreativeLogArgs) {
  const lastLoggedRef = useRef<LoggedDraft | null>(null);
  const humanEditTimerRef = useRef<number | null>(null);
  const logAlertAtRef = useRef(0);

  const surfaceLogFailure = useCallback(() => {
    const now = Date.now();
    if (now - logAlertAtRef.current < 60_000) return;
    logAlertAtRef.current = now;
    try {
      window.dispatchEvent(
        new CustomEvent("noa:alert", {
          detail: {
            message: L4(language, {
              ko: "창작 과정 기록 실패 — 확인서 정확도에 영향",
              en: "Failed to record creative process — journal accuracy may be affected",
            }),
            variant: "warning",
          },
        }),
      );
    } catch {
      /* alert best effort */
    }
  }, [language]);

  const fireLog = useCallback(
    (promise: Promise<string | null> | null | undefined) => {
      if (!promise) {
        surfaceLogFailure();
        return;
      }
      promise.then((id) => {
        if (id === null) surfaceLogFailure();
      }).catch(() => surfaceLogFailure());
    },
    [surfaceLogFailure],
  );

  const commitHumanEditIfDue = useCallback(
    (next: string) => {
      const base = lastLoggedRef.current;
      if (!base || !snapshotSessionId) return;
      if (base.sessionId !== snapshotSessionId || base.episode !== snapshotEpisode) return;
      if (next === base.text) return;
      if (Math.abs(next.length - base.text.length) < 20) return;
      lastLoggedRef.current = { text: next, sessionId: base.sessionId, episode: base.episode };
      fireLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "manuscript",
          targetId: manuscriptTargetId,
          episodeId: snapshotEpisode ?? undefined,
          beforeContent: base.text || undefined,
          afterContent: next,
          note: "TabWriting S2 fine-grained edit",
        }),
      );
    },
    [snapshotSessionId, snapshotEpisode, manuscriptTargetId, fireLog],
  );

  useEffect(() => {
    if (!snapshotSessionId) return;
    const base = lastLoggedRef.current;
    if (!base || base.sessionId !== snapshotSessionId || base.episode !== snapshotEpisode) {
      lastLoggedRef.current = { text: editDraft, sessionId: snapshotSessionId, episode: snapshotEpisode };
      return;
    }
    if (editDraft === base.text) return;
    const arm = (delay: number) => {
      humanEditTimerRef.current = window.setTimeout(() => {
        humanEditTimerRef.current = null;
        if (isComposingRef.current) {
          arm(300);
          return;
        }
        commitHumanEditIfDue(editDraft);
      }, delay);
    };
    arm(800);
    return () => {
      if (humanEditTimerRef.current != null) {
        window.clearTimeout(humanEditTimerRef.current);
        humanEditTimerRef.current = null;
      }
    };
  }, [editDraft, snapshotSessionId, snapshotEpisode, commitHumanEditIfDue, isComposingRef]);

  const flushHumanEditRef = useRef<() => void>(() => {});
  useEffect(() => {
    flushHumanEditRef.current = () => {
      if (!isComposingRef.current) commitHumanEditIfDue(editDraft);
    };
  });
  useEffect(() => () => flushHumanEditRef.current(), []);

  return {
    commitHumanEditIfDue,
    fireLog,
    lastLoggedRef,
  };
}
