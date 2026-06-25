"use client";

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { StoryConfig } from "@/lib/studio-types";

type SnapshotRef = MutableRefObject<{
  text: string;
  label: string;
  at: number;
  sessionId: string;
  episode: number | null;
} | null>;

type LoggedDraftRef = MutableRefObject<{ text: string; sessionId: string; episode: number | null } | null>;

export function useTabWritingSnapshotActions({
  commitHumanEditIfDue,
  config,
  currentSessionId,
  doRestoreVersionedBackup,
  editDraft,
  lastLoggedRef,
  lastSnapshotRef,
  setArmedRestore,
  setEditDraft,
  setRestoring,
  setSnapshotMeta,
  snapshotEpisode,
  snapshotSessionId,
}: {
  commitHumanEditIfDue: (next: string) => void;
  config: StoryConfig;
  currentSessionId: string;
  doRestoreVersionedBackup?: ((timestamp: number) => Promise<unknown>) | null;
  editDraft: string;
  lastLoggedRef: LoggedDraftRef;
  lastSnapshotRef: SnapshotRef;
  setArmedRestore: Dispatch<SetStateAction<number | null>>;
  setEditDraft: Dispatch<SetStateAction<string>>;
  setRestoring: Dispatch<SetStateAction<number | null>>;
  setSnapshotMeta: Dispatch<SetStateAction<{ label: string; at: number } | null>>;
  snapshotEpisode: number | null;
  snapshotSessionId: string | null;
}) {
  const undoSnapshot = useCallback(() => {
    const snap = lastSnapshotRef.current;
    if (!snap) return;
    if (snap.sessionId !== currentSessionId || snap.episode !== (config.episode ?? null)) {
      lastSnapshotRef.current = null;
      setSnapshotMeta(null);
      return;
    }
    const at = Date.now();
    commitHumanEditIfDue(editDraft);
    lastSnapshotRef.current = {
      text: editDraft,
      label: snap.label,
      at,
      sessionId: currentSessionId,
      episode: config.episode ?? null,
    };
    setEditDraft(snap.text);
    if (snapshotSessionId) {
      lastLoggedRef.current = { text: snap.text, sessionId: snapshotSessionId, episode: snapshotEpisode };
    }
    setSnapshotMeta({ label: snap.label, at });
  }, [
    commitHumanEditIfDue,
    config.episode,
    currentSessionId,
    editDraft,
    lastLoggedRef,
    lastSnapshotRef,
    setEditDraft,
    setSnapshotMeta,
    snapshotEpisode,
    snapshotSessionId,
  ]);

  const restoreBackup = useCallback(
    async (timestamp: number) => {
      if (!doRestoreVersionedBackup) return;
      setArmedRestore(null);
      setRestoring(timestamp);
      try {
        await doRestoreVersionedBackup(timestamp);
      } finally {
        lastLoggedRef.current = null;
        setRestoring(null);
      }
    },
    [doRestoreVersionedBackup, lastLoggedRef, setArmedRestore, setRestoring],
  );

  return { restoreBackup, undoSnapshot };
}
