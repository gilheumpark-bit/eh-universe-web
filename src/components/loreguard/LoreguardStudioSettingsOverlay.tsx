"use client";

import { type RefObject, useState } from "react";
import dynamic from "next/dynamic";
import type { AppLanguage, ChatSession } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import type { VersionedBackup } from "@/components/studio/SettingsView.panels";
import { Alert, X } from "./icons";
import { useStudio } from "@/app/studio/StudioContext";
import { deleteConfirmationToken } from "@/components/loreguard/ProjectStart.project-helpers";

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
  const { currentProjectId, currentProject, deleteProject } = useStudio();
  const [confirmReset, setConfirmReset] = useState(false);
  // derive delete confirm text: auto-resets when project changes
  const [deleteConfirmState, setDeleteConfirmState] = useState({ id: currentProjectId, text: "" });
  const deleteConfirmText = deleteConfirmState.id === currentProjectId ? deleteConfirmState.text : "";
  const setDeleteConfirmText = (text: string) =>
    setDeleteConfirmState({ id: currentProjectId, text });

  const deleteToken = deleteConfirmationToken(language);
  const currentProjectName = currentProject?.name?.trim() || L4(language, {
    ko: "제목 없음", en: "Untitled", ja: "無題", zh: "未命名",
  });
  const canDeleteProject = Boolean(currentProjectId) && deleteConfirmText.trim() === deleteToken;

  const handleDeleteProject = () => {
    if (!currentProjectId || !canDeleteProject) return;
    const name = currentProjectName;
    deleteProject(currentProjectId);
    setDeleteConfirmText("");
    onClose();
    window.dispatchEvent(new CustomEvent("noa:toast", {
      detail: {
        message: L4(language, {
          ko: `작품 삭제 완료: ${name}`,
          en: `Work deleted: ${name}`,
          ja: `作品を削除しました: ${name}`,
          zh: `作品已删除：${name}`,
        }),
        variant: "warning",
      },
    }));
  };

  const handleResetClick = () => {
    if (confirmReset) {
      onClearAll();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
    }
  };

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

        {/* 위험 구역: 작품 삭제 + 환경 초기화 */}
        <div className="lg-settings-danger-zone">
          {currentProjectId && (
            <div
              className="ps-project-danger"
              aria-label={L4(language, { ko: "작품 삭제", en: "Delete work", ja: "作品削除", zh: "删除作品" })}
            >
              <div className="ps-project-danger-head">
                <Alert size={16} />
                <strong>{L4(language, { ko: "작품 삭제", en: "Delete work", ja: "作品削除", zh: "删除作品" })}</strong>
                <span className="pill red">{L4(language, { ko: "주의", en: "Careful", ja: "注意", zh: "注意" })}</span>
              </div>
              <p>{L4(language, {
                ko: `현재 작품 "${currentProjectName}"과 모든 회차를 삭제합니다. 입력창에 "${deleteToken}"만 입력하면 삭제 버튼이 켜집니다.`,
                en: `Deletes work "${currentProjectName}" and all its episodes. Type only "${deleteToken}" to enable the delete button.`,
                ja: `作品「${currentProjectName}」とすべての話数を削除します。「${deleteToken}」だけを入力すると削除ボタンが有効になります。`,
                zh: `删除作品"${currentProjectName}"及其所有章节。只输入"${deleteToken}"即可启用删除按钮。`,
              })}</p>
              <div className="ps-project-delete-row">
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteToken}
                  aria-label={L4(language, { ko: "삭제 확인 입력", en: "Confirm deletion", ja: "削除確認入力", zh: "确认删除输入" })}
                  data-testid="lg-settings-project-delete-input"
                />
                <button
                  type="button"
                  className="btn danger"
                  disabled={!canDeleteProject}
                  onClick={handleDeleteProject}
                  data-testid="lg-settings-project-delete"
                >
                  {L4(language, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                </button>
              </div>
            </div>
          )}

          <div
            className="ps-project-danger"
            aria-label={L4(language, { ko: "환경 초기화", en: "Reset environment", ja: "環境初期化", zh: "环境重置" })}
          >
            <div className="ps-project-danger-head">
              <Alert size={16} />
              <strong>{L4(language, { ko: "환경 초기화", en: "Reset environment", ja: "環境初期化", zh: "环境重置" })}</strong>
              <span className="pill red">{L4(language, { ko: "주의", en: "Careful", ja: "注意", zh: "注意" })}</span>
            </div>
            <p>{L4(language, {
              ko: "모든 작품·회차·설정을 초기화합니다. 이 작업은 되돌릴 수 없습니다.",
              en: "Resets all works, episodes, and settings. This cannot be undone.",
              ja: "すべての作品・話数・設定を初期化します。この操作は元に戻せません。",
              zh: "重置所有作品、章节和设置。此操作无法撤销。",
            })}</p>
            <div className="ps-project-delete-row">
              <button
                type="button"
                className={`btn${confirmReset ? " danger" : ""}`}
                onClick={handleResetClick}
                data-testid="lg-settings-reset"
              >
                {confirmReset
                  ? L4(language, { ko: "정말 초기화", en: "Really reset", ja: "本当に初期化", zh: "确认重置" })
                  : L4(language, { ko: "환경 초기화", en: "Reset environment", ja: "環境初期化", zh: "环境重置" })}
              </button>
              {confirmReset && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setConfirmReset(false)}
                >
                  {L4(language, { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                </button>
              )}
            </div>
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
