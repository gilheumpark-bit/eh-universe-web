"use client";

import { type RefObject } from "react";
import dynamic from "next/dynamic";
import type { AppLanguage, StyleProfile } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { X } from "./icons";
import { LOREGUARD_TABS, getLoreguardTabLabel, type LoreguardTabId } from "./LoreguardShell";
import { TAB_HELP_SUMMARY } from "./LoreguardStudio.helpers";

const StyleStudioView = dynamic(() => import("@/components/studio/StyleStudioView"), {
  ssr: false,
  loading: () => (
    <div className="lg-overlay-loading">문체 패널 불러오는 중…</div>
  ),
});

type HelpToolsOverlayProps = {
  activeTab: LoreguardTabId;
  language: AppLanguage;
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSelectTab: (tab: LoreguardTabId) => void;
  onOpenSearch: () => void;
  onSaveNow: () => void;
  onOpenMemo: () => void;
  onOpenHistory: () => void;
  onOpenStyleTools: () => void;
  onOpenVisual: () => void;
  onOpenLayoutProfile: () => void;
  onOpenSettings: () => void;
  onOpenDocs: () => void;
};

export function HelpToolsOverlay({
  activeTab,
  language,
  panelRef,
  onClose,
  onSelectTab,
  onOpenSearch,
  onSaveNow,
  onOpenMemo,
  onOpenHistory,
  onOpenStyleTools,
  onOpenVisual,
  onOpenLayoutProfile,
  onOpenSettings,
  onOpenDocs,
}: HelpToolsOverlayProps) {
  const closeAndRun = (handler: () => void) => {
    onClose();
    handler();
  };

  return (
    <>
      <div className="lg-help-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="lg-help-panel"
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "도움말 및 작업 도우미", en: "Help and work aids", ja: "ヘルプと作業補助", zh: "帮助与工作辅助" })}
      >
        <div className="lg-help-head">
          <div>
            <span>Loreguard Guide</span>
            <strong>{L4(language, { ko: "도움말 및 작업 도우미", en: "Help and work aids", ja: "ヘルプと作業補助", zh: "帮助与工作辅助" })}</strong>
            <p>{L4(language, {
              ko: "현재 10단계 작업 흐름과 자주 쓰는 보조 기능을 바로 엽니다.",
              en: "Open the current 10-step workflow and common work aids.",
              ja: "現在の10段階ワークフローとよく使う補助機能を開きます。",
              zh: "打开当前 10 步工作流和常用辅助功能。",
            })}</p>
          </div>
          <button
            type="button"
            className="lg-help-close"
            onClick={onClose}
            aria-label={L4(language, { ko: "도움말 및 작업 도우미 닫기", en: "Close help and work aids", ja: "ヘルプと作業補助を閉じる", zh: "关闭帮助与工作辅助" })}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <section className="lg-help-section" aria-labelledby="lg-help-tabs-title">
          <h2 id="lg-help-tabs-title">{L4(language, { ko: "작업 단계", en: "Workflow steps", ja: "作業ステップ", zh: "工作步骤" })}</h2>
          <div className="lg-help-tabs">
            {LOREGUARD_TABS.map((tab, index) => {
              const tabLabel = getLoreguardTabLabel(tab.id, language);
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "on" : undefined}
                  onClick={() => closeAndRun(() => onSelectTab(tab.id))}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{tabLabel}</b>
                  <small>{L4(language, TAB_HELP_SUMMARY[tab.id])}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="lg-help-section" aria-labelledby="lg-help-tools-title">
          <h2 id="lg-help-tools-title">{L4(language, { ko: "작업 도우미", en: "Work aids", ja: "作業補助", zh: "工作辅助" })}</h2>
          <div className="lg-help-tools">
            <button type="button" onClick={() => closeAndRun(onOpenSearch)}>
              <b>{L4(language, { ko: "전체 찾기", en: "Find across work", ja: "全体検索", zh: "全局查找" })}</b>
              <span>{L4(language, {
                ko: "작품 안의 캐릭터, 회차, 세계관, 본문, 명령을 한 번에 찾습니다.",
                en: "Find characters, episodes, world notes, drafts, and commands in the current workspace.",
                ja: "作品内のキャラクター、回、世界観、本文、コマンドをまとめて検索します。",
                zh: "一次查找作品内的角色、章节、世界观、正文和命令。",
              })}</span>
            </button>
            <button type="button" onClick={() => closeAndRun(onSaveNow)}>
              <b>{L4(language, { ko: "지금 저장", en: "Save now", ja: "今すぐ保存", zh: "立即保存" })}</b>
              <span>{L4(language, {
                ko: "현재 세션을 바로 저장하고 저장 상태를 갱신합니다.",
                en: "Save the current session and refresh save status.",
                ja: "現在のセッションを保存し、保存状態を更新します。",
                zh: "保存当前会话并更新保存状态。",
              })}</span>
            </button>
            <button type="button" onClick={() => closeAndRun(onOpenMemo)}>
              <b>{L4(language, { ko: "메모 보드", en: "Memo board", ja: "メモボード", zh: "便签板" })}</b>
              <span>{L4(language, {
                ko: "즉흥 아이디어와 작업 메모를 따로 엽니다.",
                en: "Open a separate space for quick ideas and work notes.",
                ja: "即興アイデアと作業メモを別枠で開きます。",
                zh: "单独打开灵感和工作备注空间。",
              })}</span>
            </button>
            <button type="button" onClick={() => closeAndRun(onOpenHistory)}>
              <b>{L4(language, { ko: "히스토리", en: "History", ja: "履歴", zh: "历史" })}</b>
              <span>{L4(language, {
                ko: "회차 저장 이력, 버전 백업, 과정기록을 확인합니다.",
                en: "Check episode saves, version backups and process records.",
                ja: "回の保存履歴、バージョンバックアップ、過程記録を確認します。",
                zh: "查看章节保存记录、版本备份和过程记录。",
              })}</span>
            </button>
            <button type="button" onClick={() => closeAndRun(onOpenStyleTools)}>
              <b>{L4(language, { ko: "문체 정렬", en: "Style alignment", ja: "文体調整", zh: "文体校准" })}</b>
              <span>{L4(language, {
                ko: "문체 DNA, 기법 체크리스트, 문장 실험실을 엽니다.",
                en: "Open style DNA, technique checklist and sentence lab.",
                ja: "文体DNA、技法チェックリスト、文章ラボを開きます。",
                zh: "打开文体 DNA、技法清单和句子实验室。",
              })}</span>
            </button>
            <button type="button" onClick={() => closeAndRun(onOpenVisual)}>
              <b>{L4(language, { ko: "비주얼", en: "Visual", ja: "ビジュアル", zh: "视觉" })}</b>
              <span>{L4(language, {
                ko: "장면 카드와 매체 확장용 프롬프트를 관리합니다.",
                en: "Manage scene cards and prompts for media expansion.",
                ja: "シーンカードとメディア展開用プロンプトを管理します。",
                zh: "管理场景卡和媒体扩展提示词。",
              })}</span>
            </button>
            <button type="button" onClick={() => closeAndRun(onOpenLayoutProfile)}>
              <b>{L4(language, { ko: "레이아웃 프리셋", en: "Layout presets", ja: "レイアウトプリセット", zh: "布局预设" })}</b>
              <span>{L4(language, {
                ko: "패널 접힘, 폭, 도크 상태를 저장하거나 불러옵니다.",
                en: "Save or load panel collapse, width and dock states.",
                ja: "パネルの折りたたみ、幅、ドック状態を保存・読込します。",
                zh: "保存或加载面板折叠、宽度和停靠状态。",
              })}</span>
            </button>
            <button type="button" onClick={() => closeAndRun(onOpenSettings)}>
              <b>{L4(language, { ko: "환경 설정", en: "Environment settings", ja: "環境設定", zh: "环境设置" })}</b>
              <span>{L4(language, {
                ko: "노아, 저장, 과정기록, 출고 관련 설정을 조정합니다.",
                en: "Adjust Noa, saving, process records and release settings.",
                ja: "Noa、保存、過程記録、出稿関連の設定を調整します。",
                zh: "调整 Noa、保存、过程记录和交付设置。",
              })}</span>
            </button>
            <button type="button" onClick={() => closeAndRun(onOpenDocs)}>
              <b>{L4(language, { ko: "전체 문서", en: "Full docs", ja: "全ドキュメント", zh: "完整文档" })}</b>
              <span>{L4(language, {
                ko: "자세한 안내와 정책 문서를 새 창에서 봅니다.",
                en: "Open detailed guides and policy documents in a new window.",
                ja: "詳しい案内とポリシー文書を新しいウィンドウで開きます。",
                zh: "在新窗口打开详细指南和政策文档。",
              })}</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

type StyleToolsOverlayProps = {
  initialProfile?: StyleProfile;
  language: AppLanguage;
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

export function StyleToolsOverlay({ initialProfile, language, panelRef, onClose }: StyleToolsOverlayProps) {
  return (
    <>
      <div className="lg-help-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="lg-help-panel lg-style-panel"
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "문체 정렬", en: "Style alignment", ja: "文体調整", zh: "文体校准" })}
      >
        <div className="lg-help-head">
          <div>
            <span>STYLE ALIGNMENT</span>
            <strong>{L4(language, { ko: "문체 정렬", en: "Style alignment", ja: "文体調整", zh: "文体校准" })}</strong>
            <p>{L4(language, {
              ko: "문체 DNA, 기법 체크리스트, 문장 실험실을 한 화면에서 점검합니다.",
              en: "Check style DNA, techniques and sentence lab in one surface.",
              ja: "文体DNA、技法チェックリスト、文章ラボを一画面で確認します。",
              zh: "在一个界面检查文体 DNA、技法清单和句子实验室。",
            })}</p>
          </div>
          <button
            type="button"
            className="lg-help-close"
            onClick={onClose}
            aria-label={L4(language, { ko: "문체 정렬 닫기", en: "Close style alignment", ja: "文体調整を閉じる", zh: "关闭文体校准" })}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="lg-style-panel-body">
          <StyleStudioView language={language} initialProfile={initialProfile} />
        </div>
      </div>
    </>
  );
}
