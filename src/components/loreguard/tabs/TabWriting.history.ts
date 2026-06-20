"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

const HISTORY_LIMIT = 100;

type UseDraftHistoryArgs = {
  editDraft: string;
  setEditDraft: Dispatch<SetStateAction<string>>;
  snapshotSessionId: string | null;
  snapshotEpisode: number | null;
};

export function useDraftHistory({
  editDraft,
  setEditDraft,
  snapshotSessionId,
  snapshotEpisode,
}: UseDraftHistoryArgs) {
  const latestDraftRef = useRef(editDraft);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const historyBaseRef = useRef<string>(editDraft);
  const isApplyingHistoryRef = useRef(false);
  const suppressNextDeltaRef = useRef(false);
  const historyTimerRef = useRef<number | null>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  const refreshHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
  }, []);

  useEffect(() => {
    latestDraftRef.current = editDraft;
  }, [editDraft]);

  const pushHistorySnapshot = useCallback((prevText: string) => {
    const stack = undoStackRef.current;
    if (stack.length > 0 && stack[stack.length - 1] === prevText) return;
    stack.push(prevText);
    if (stack.length > HISTORY_LIMIT) stack.shift();
    redoStackRef.current = [];
    refreshHistoryState();
  }, [refreshHistoryState]);

  useEffect(() => {
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      historyBaseRef.current = editDraft;
      return;
    }
    if (suppressNextDeltaRef.current) {
      suppressNextDeltaRef.current = false;
      historyBaseRef.current = editDraft;
      return;
    }
    if (editDraft === historyBaseRef.current) return;
    if (historyTimerRef.current != null) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => {
      historyTimerRef.current = null;
      const previousText = historyBaseRef.current;
      if (editDraft !== previousText) {
        pushHistorySnapshot(previousText);
        historyBaseRef.current = editDraft;
      }
    }, 400);
    return () => {
      if (historyTimerRef.current != null) {
        window.clearTimeout(historyTimerRef.current);
        historyTimerRef.current = null;
      }
    };
  }, [editDraft, pushHistorySnapshot]);

  useEffect(() => {
    if (historyTimerRef.current != null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    undoStackRef.current = [];
    redoStackRef.current = [];
    historyBaseRef.current = latestDraftRef.current;
    isApplyingHistoryRef.current = false;
    suppressNextDeltaRef.current = true;
    refreshHistoryState();
  }, [snapshotSessionId, snapshotEpisode, refreshHistoryState]);

  const doUndo = useCallback(() => {
    if (historyTimerRef.current != null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
      const previousText = historyBaseRef.current;
      if (editDraft !== previousText) {
        pushHistorySnapshot(previousText);
        historyBaseRef.current = editDraft;
      }
    }
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const targetText = stack.pop() as string;
    redoStackRef.current.push(editDraft);
    historyBaseRef.current = targetText;
    if (targetText !== editDraft) {
      isApplyingHistoryRef.current = true;
      setEditDraft(targetText);
    }
    refreshHistoryState();
  }, [editDraft, pushHistorySnapshot, refreshHistoryState, setEditDraft]);

  const doRedo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const targetText = stack.pop() as string;
    undoStackRef.current.push(editDraft);
    if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
    historyBaseRef.current = targetText;
    if (targetText !== editDraft) {
      isApplyingHistoryRef.current = true;
      setEditDraft(targetText);
    }
    refreshHistoryState();
  }, [editDraft, refreshHistoryState, setEditDraft]);

  return {
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    doUndo,
    doRedo,
  };
}
