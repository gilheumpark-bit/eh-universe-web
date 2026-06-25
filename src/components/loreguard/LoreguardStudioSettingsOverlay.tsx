"use client";

import { type RefObject } from "react";
import dynamic from "next/dynamic";
import type { AppLanguage, ChatSession } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import type { VersionedBackup } from "@/components/studio/SettingsView.panels";
import { X } from "./icons";

const SettingsView = dynamic(() => import("@/components/studio/SettingsView"), {
  ssr: false,
  loading: () => (
    <div className="lg-settings-loading">설정 불러오는 중...</div>
  ),
});

type LoreguardStudioSettingsOverlayProps = {
  language: AppLanguage;
  panelRef: RefObject<HTMLDivElement | null>;
  hostedProviders?: Partial<Record<string, boolean>>;
  versionedBackups?: VersionedBackup[];
  currentSession?: ChatSession | null;
  onClose: () => void;
  onOpenHistory: () => void;
  onOpenVisual: () => void;
  onReplayOnboarding: () => void;
  onClearAll: () => void;
  onManageApiKey: () => void;
  onRestoreBackup?: (timestamp: number) => Promise<boolean>;
  onRefreshBackups?: () => void;
};

export function LoreguardStudioSettingsOverlay({
  language,
  panelRef,
  hostedProviders,
  versionedBackups,
  currentSession,
  onClose,
  onOpenHistory,
  onOpenVisual,
  onReplayOnboarding,
  onClearAll,
  onManageApiKey,
  onRestoreBackup,
  onRefreshBackups,
}: LoreguardStudioSettingsOverlayProps) {
  const closeAndRun = (handler: () => void) => {
    onClose();
    handler();
  };

  return (
    <>
      <div
        className="lg-settings-scrim"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="lg-settings-shell"
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "환경 설정", en: "Environment settings", ja: "環境設定", zh: "环境设置" })}
      >
        <div className="lg-settings-head">
          <strong className="lg-settings-title">
            {L4(language, { ko: "환경 설정", en: "Environment settings", ja: "環境設定", zh: "环境设置" })}
          </strong>
          <div className="lg-settings-actions">
            <button
              type="button"
              className="lg-settings-action"
              onClick={() => closeAndRun(onOpenHistory)}
            >
              {L4(language, { ko: "히스토리", en: "History", ja: "履歴", zh: "历史" })}
            </button>
            <button
              type="button"
              className="lg-settings-action"
              onClick={() => closeAndRun(onOpenVisual)}
            >
              {L4(language, { ko: "비주얼", en: "Visual", ja: "ビジュアル", zh: "视觉" })}
            </button>
            <button
              type="button"
              className="lg-settings-action"
              onClick={() => closeAndRun(onReplayOnboarding)}
            >
              {L4(language, {
                ko: "온보딩 다시 보기",
                en: "Replay onboarding",
                ja: "オンボーディングを再表示",
                zh: "重看新手引导",
              })}
            </button>
            <button
              type="button"
              className="lg-settings-close"
              onClick={onClose}
              aria-label={L4(language, { ko: "설정 닫기", en: "Close settings", ja: "設定を閉じる", zh: "关闭设置" })}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="lg-settings-surface">
          <SettingsView
            language={language}
            hostedProviders={hostedProviders}
            onClearAll={onClearAll}
            onManageApiKey={onManageApiKey}
            versionedBackups={versionedBackups}
            onRestoreBackup={onRestoreBackup}
            onRefreshBackups={onRefreshBackups}
            currentSession={currentSession}
          />
        </div>
      </div>
    </>
  );
}
