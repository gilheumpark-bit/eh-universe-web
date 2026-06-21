"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CreativeEventLogger } from "@/hooks/useCreativeEventLogger";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";
import {
  approveNoaComposePlan,
  createNoaComposeReceipt,
  type NoaComposePlan,
} from "@/lib/loreguard/noa-compose";
import {
  clampPrefs,
  loadPrefs,
  prefsToStyle,
  savePrefs,
  type WorkspacePrefs,
} from "@/lib/writing-workspace/workspace-prefs";
import {
  fontStackById,
  type FontFamilyId,
} from "@/lib/writing-workspace/font-family";
import { useWritingFontMode, type WritingFontMode } from "@/components/loreguard/ComposerExtras";
import { buildNoaComposeBundlePlan } from "@/components/loreguard/tabs/TabWriting.derived";

type WritingLanguage = AppLanguage;
type WritingWorkspaceMode = "focus" | "advanced";
type WritingSession = {
  id: string;
  config: StoryConfig;
} | null;

const getCreativeLogger = (): CreativeEventLogger | null =>
  typeof window !== "undefined" ? window.__creativeLogger ?? null : null;

type UseTabWritingWorkspaceControlsArgs = {
  currentProjectId: string | null;
  currentSession: WritingSession;
  editDraft: string;
  language: WritingLanguage;
  triggerSave: () => Promise<boolean> | boolean;
};

export function useTabWritingWorkspaceControls({
  currentProjectId,
  currentSession,
  editDraft,
  language,
  triggerSave,
}: UseTabWritingWorkspaceControlsArgs) {
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [writingWorkspaceMode, setWritingWorkspaceMode] = useState<WritingWorkspaceMode>("focus");

  const applyWritingWorkspaceMode = useCallback((mode: WritingWorkspaceMode) => {
    setWritingWorkspaceMode(mode);
    setRightPanelCollapsed(mode === "focus");
  }, []);

  const toggleWritingBasisPanel = useCallback(() => {
    setRightPanelCollapsed((collapsed) => {
      const nextCollapsed = !collapsed;
      setWritingWorkspaceMode(nextCollapsed ? "focus" : "advanced");
      return nextCollapsed;
    });
  }, []);

  const openExport = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-export"));
  }, []);

  const saveDraftNow = useCallback(() => {
    void Promise.resolve(triggerSave()).then((ok) => {
      window.dispatchEvent(new CustomEvent("noa:toast", {
        detail: {
          message: L4(language, {
            ko: ok ? "원고 저장 완료" : "원고 저장 실패",
            en: ok ? "Draft saved" : "Draft save failed",
          }),
          variant: ok ? "success" : "error",
        },
      }));
    });
  }, [language, triggerSave]);

  const openStyle = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-style"));
  }, []);

  const openCp = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-cp"));
  }, []);

  const openRevision = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-revision"));
  }, []);

  const openIpAsset = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loreguard:open-ipasset"));
  }, []);

  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const toolMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!toolMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && toolMenuRef.current?.contains(target)) return;
      setToolMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setToolMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [toolMenuOpen]);

  const runToolMenuAction = useCallback((action: () => void) => {
    setToolMenuOpen(false);
    action();
  }, []);

  const [composePlan, setComposePlan] = useState<NoaComposePlan | null>(null);

  const openNoaComposeBundle = useCallback(() => {
    const config = currentSession?.config;
    if (!config) return;
    const plan = buildNoaComposeBundlePlan({
      config,
      currentProjectId,
      editDraft,
      language,
    });
    setComposePlan(plan);
    setWritingWorkspaceMode("advanced");
    setRightPanelCollapsed(false);
  }, [currentProjectId, currentSession, editDraft, language]);

  const approveNoaComposeBundle = useCallback(() => {
    if (!composePlan) return;
    const approved = approveNoaComposePlan(composePlan, { selectedBy: "human-author", approvedBy: "human-author" });
    setComposePlan(approved);
    const receipt = createNoaComposeReceipt(approved);
    void getCreativeLogger()?.logHumanEdit({
      targetType: "metadata",
      targetId: `noa-compose:${approved.composeId}`,
      episodeId: currentSession?.config?.episode,
      afterContent: JSON.stringify({
        title: approved.title,
        state: approved.state,
        decision: approved.decision,
        receiptId: receipt.receiptId,
        changes: approved.changes.map((change) => change.title),
      }),
      note: "노아 작업 묶음 작가 승인",
      stage: "writing",
    });
    window.dispatchEvent(new CustomEvent("noa:toast", {
      detail: {
        message: L4(language, { ko: "작업 묶음 승인 기록 완료", en: "Work bundle approval recorded" }),
        variant: "success",
      },
    }));
  }, [composePlan, currentSession?.config?.episode, language]);

  const [fontMode, setFontMode] = useWritingFontMode();
  const [viewPrefs, setViewPrefs] = useState<WorkspacePrefs>(() => loadPrefs());

  const updateViewPrefs = useCallback((patch: Partial<WorkspacePrefs>) => {
    setViewPrefs((prev) => {
      const next = clampPrefs({ ...prev, ...patch });
      savePrefs(next);
      return next;
    });
  }, []);

  const updateFontMode = useCallback(
    (nextMode: WritingFontMode) => {
      setFontMode(nextMode);
      const fontFamily: FontFamilyId =
        nextMode === "serif" ? "nanum-myeongjo" : nextMode === "mono" ? "mono" : "system";
      updateViewPrefs({ fontFamily });
    },
    [setFontMode, updateViewPrefs],
  );

  const editorViewStyle = useMemo<CSSProperties>(
    () => ({
      ...prefsToStyle(viewPrefs),
      fontFamily: fontStackById(viewPrefs.fontFamily),
    }),
    [viewPrefs],
  );

  return {
    applyWritingWorkspaceMode,
    approveNoaComposeBundle,
    composePlan,
    editorViewStyle,
    fontMode,
    openCp,
    openExport,
    openIpAsset,
    openNoaComposeBundle,
    openRevision,
    openStyle,
    rightPanelCollapsed,
    runToolMenuAction,
    saveDraftNow,
    setComposePlan,
    setFontMode,
    setRightPanelCollapsed,
    setToolMenuOpen,
    setWritingWorkspaceMode,
    toolMenuOpen,
    toolMenuRef,
    toggleWritingBasisPanel,
    updateFontMode,
    updateViewPrefs,
    viewPrefs,
    writingWorkspaceMode,
  };
}
