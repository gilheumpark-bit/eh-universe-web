"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
} from "react";
import { useDraftHistory } from "@/components/loreguard/tabs/TabWriting.history";
import type { StoryConfig } from "@/lib/studio-types";

type WritingSession = {
  id: string;
  config?: { episode?: number | null };
} | null;

export function useTabWritingDraftRuntime({
  currentSession,
  editDraft,
  isGenerating,
  setConfig,
  setEditDraft,
}: {
  currentSession: WritingSession;
  editDraft: string;
  isGenerating: boolean;
  setConfig: Dispatch<SetStateAction<StoryConfig>>;
  setEditDraft: Dispatch<SetStateAction<string>>;
}) {
  const [restoring, setRestoring] = useState<number | null>(null);
  const lastSnapshotRef = useRef<{
    text: string;
    label: string;
    at: number;
    sessionId: string;
    episode: number | null;
  } | null>(null);
  const [snapshotMeta, setSnapshotMeta] = useState<{ label: string; at: number } | null>(null);
  const snapshotSessionId = currentSession?.id ?? null;
  const snapshotEpisode = currentSession?.config?.episode ?? null;

  useEffect(() => {
    lastSnapshotRef.current = null;
    const t = window.setTimeout(() => setSnapshotMeta(null), 0);
    return () => window.clearTimeout(t);
  }, [snapshotSessionId, snapshotEpisode]);

  const [armedRestore, setArmedRestore] = useState<number | null>(null);
  useEffect(() => {
    if (armedRestore == null) return;
    const t = window.setTimeout(() => setArmedRestore(null), 5000);
    return () => window.clearTimeout(t);
  }, [armedRestore]);

  const [armedCancel, setArmedCancel] = useState(false);
  useEffect(() => {
    if (!armedCancel) return;
    if (!isGenerating) {
      const t = window.setTimeout(() => setArmedCancel(false), 0);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setArmedCancel(false), 5000);
    return () => window.clearTimeout(t);
  }, [armedCancel, isGenerating]);

  const hugePasteRef = useRef(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  useEffect(() => {
    if (!pasteNotice) return;
    const t = window.setTimeout(() => setPasteNotice(false), 6000);
    return () => window.clearTimeout(t);
  }, [pasteNotice]);

  const isComposingRef = useRef(false);
  const { canUndo, canRedo, doUndo, doRedo } = useDraftHistory({
    editDraft,
    setEditDraft,
    snapshotSessionId,
    snapshotEpisode,
  });
  const [findOpen, setFindOpen] = useState(false);

  const applyFindReplace = useCallback(
    (next: string) => {
      setEditDraft(next);
    },
    [setEditDraft],
  );

  const onEditorKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const k = e.key.toLowerCase();
      if (k === "h" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setFindOpen((v) => !v);
        return;
      }
      if (k === "z" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        doUndo();
        return;
      }
      if ((k === "z" && e.shiftKey) || (k === "y" && !e.shiftKey)) {
        e.preventDefault();
        doRedo();
        return;
      }
      if (k === "r" && e.shiftKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("noa:trigger-inline-rewrite"));
      }
    },
    [doUndo, doRedo],
  );

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { episode?: unknown; sceneId?: unknown } | undefined;
      const ep = detail?.episode;
      if (typeof ep !== "number" || !Number.isFinite(ep) || ep < 1) return;
      setConfig((prev) => (prev.episode === ep ? prev : { ...prev, episode: Math.floor(ep) }));
    };
    window.addEventListener("loreguard:navigate-scene", onNavigate);
    return () => window.removeEventListener("loreguard:navigate-scene", onNavigate);
  }, [setConfig]);

  const [selfCheckOpen, setSelfCheckOpen] = useState(false);
  const [readMode, setReadMode] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ctrl = event.ctrlKey || event.metaKey;
      if (!ctrl || !event.altKey || event.shiftKey || event.key.toLowerCase() !== "r") return;
      event.preventDefault();
      setReadMode((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return {
    armedCancel,
    armedRestore,
    applyFindReplace,
    canRedo,
    canUndo,
    doRedo,
    doUndo,
    findOpen,
    hugePasteRef,
    isComposingRef,
    lastSnapshotRef,
    onEditorKeyDown,
    pasteNotice,
    readMode,
    restoring,
    selfCheckOpen,
    setArmedCancel,
    setArmedRestore,
    setFindOpen,
    setPasteNotice,
    setReadMode,
    setRestoring,
    setSelfCheckOpen,
    setSnapshotMeta,
    snapshotEpisode,
    snapshotMeta,
    snapshotSessionId,
  };
}
