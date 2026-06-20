"use client";

import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { LucideIcon } from "lucide-react";
import { L4 } from "@/lib/i18n";
import {
  PublishPlatform,
  type AppLanguage,
  type Project,
} from "@/lib/studio-types";
import {
  FORMAT_LABEL_UI,
  RELEASE_PURPOSE_LABEL_UI,
  RIGHTS_STATUS_LABEL_UI,
  TARGET_LANGUAGE_LABEL_UI,
  TARGET_MARKET_LABEL_UI,
  type ProjectDraft,
} from "@/components/loreguard/ProjectStart.shared";
import IdeResizablePanel from "./IdeResizablePanel";
import {
  Alert,
  Book,
  Check,
  Clock,
  Download,
  Globe,
  Grid,
  Plus,
  Scroll,
  Shield,
  X,
} from "./icons";

const PACK_ROWS_UI: Array<{ label: { ko: string; en: string; ja: string; zh: string }; statusLabel: { ko: string; en: string; ja: string; zh: string }; Icon: LucideIcon }> = [
  {
    label: { ko: "작품 시작", en: "Work setup", ja: "作品開始", zh: "作品开始" },
    statusLabel: { ko: "진행", en: "Active", ja: "進行中", zh: "进行中" },
    Icon: Check,
  },
  {
    label: { ko: "읽은 자료 검토", en: "Imported material review", ja: "読み込み資料の確認", zh: "导入资料检查" },
    statusLabel: { ko: "자료를 기다리는 중", en: "Waiting for material", ja: "資料待ち", zh: "等待资料" },
    Icon: Clock,
  },
  {
    label: { ko: "번역·현지화 메모", en: "Translation notes", ja: "翻訳・ローカライズメモ", zh: "翻译本地化备注" },
    statusLabel: { ko: "작성 전", en: "Not written yet", ja: "作成前", zh: "尚未填写" },
    Icon: Globe,
  },
  {
    label: { ko: "확인 문서·권리/IP 자산화", en: "Journal / Rights-IP Pack", ja: "確認文書・権利/IP資産化", zh: "确认文档·权利/IP资产化" },
    statusLabel: { ko: "준비", en: "Ready", ja: "準備", zh: "准备" },
    Icon: Download,
  },
];

interface ProjectStartBasisPanelProps {
  language: AppLanguage;
  draft: ProjectDraft;
  readiness: number;
  readinessLabel: string;
  saveStateLabel: string;
  currentProjectName: string;
  currentProjectId: string | null;
  currentProject: Project | null;
  projects: Project[];
  saveFlash: boolean;
  projectStartBusy: boolean;
  deleteToken: string;
  deleteConfirmText: string;
  canDeleteCurrentProject: boolean;
  importCandidateCount: number;
  acceptedCandidateCount: number;
  onSelectProject: (event: ChangeEvent<HTMLSelectElement>) => void;
  onSaveProjectNow: () => void;
  onSaveOpenWorld: () => void;
  onDeleteCurrentProject: () => void;
  onFocusImport: () => void;
  setDeleteConfirmText: Dispatch<SetStateAction<string>>;
}

export function ProjectStartBasisPanel({
  language,
  draft,
  readiness,
  readinessLabel,
  saveStateLabel,
  currentProjectName,
  currentProjectId,
  currentProject,
  projects,
  saveFlash,
  projectStartBusy,
  deleteToken,
  deleteConfirmText,
  canDeleteCurrentProject,
  importCandidateCount,
  acceptedCandidateCount,
  onSelectProject,
  onSaveProjectNow,
  onSaveOpenWorld,
  onDeleteCurrentProject,
  onFocusImport,
  setDeleteConfirmText,
}: ProjectStartBasisPanelProps) {
  return (
    <IdeResizablePanel
      id="project-canvas"
      side="right"
      className="ps-canvas"
      ariaLabel={L4(language, { ko: "작품 기준표", en: "Work basis board", ja: "作品基準表", zh: "作品基准表" })}
      stripLabel={L4(language, { ko: "기준표", en: "Basis", ja: "基準表", zh: "基准表" })}
      defaultWidth={410}
      minWidth={280}
      maxWidth={760}
    >
      <div className="ps-card primary">
        <div className="ps-card-top">
          <Grid size={18} />
          <strong>{L4(language, { ko: "작품 기준표", en: "Work basis board", ja: "作品基準表", zh: "作品基准表" })}</strong>
          <span className="pill green">{readinessLabel}</span>
        </div>
        <div className="tbar">
          <span style={{ width: `${readiness}%` }} />
        </div>
        <p>{L4(language, {
          ko: "작가가 고른 설정만 이곳에 쌓이고, 이후 설정집·씬시트·번역·출고 패키지로 이어집니다.",
          en: "Only the author's chosen settings stay here, then continue into the bible, scene sheets, localization, and release package.",
          ja: "作者が選んだ設定だけがここに蓄積され、設定集・シーンシート・翻訳・出稿パッケージへ続きます。",
          zh: "只有作者选定的设定会留在这里，并延续到设定集、场景表、翻译和交付包。",
        })}</p>
      </div>

      <div className="ps-project-ops" aria-label={L4(language, { ko: "현재 작품 저장과 관리", en: "Current work saving and management", ja: "現在の作品保存と管理", zh: "当前作品保存与管理" })}>
        <div className="ps-project-ops-head">
          <strong>{L4(language, { ko: "작품 관리", en: "Work management", ja: "作品管理", zh: "作品管理" })}</strong>
          <span className="pill">{saveStateLabel}</span>
        </div>
        <div className="ps-project-current">
          <span>{L4(language, { ko: "작업 중", en: "Working", ja: "作業中", zh: "工作中" })}</span>
          <b>{currentProjectName}</b>
          <small>
            {currentProjectId
              ? L4(language, {
                ko: `${currentProject?.sessions.length ?? 0}개 회차`,
                en: `${currentProject?.sessions.length ?? 0} episodes`,
                ja: `${currentProject?.sessions.length ?? 0}話`,
                zh: `${currentProject?.sessions.length ?? 0}章`,
              })
              : L4(language, { ko: "아직 저장 전", en: "Not saved yet", ja: "まだ保存前", zh: "尚未保存" })}
          </small>
        </div>
        {projects.length > 0 ? (
          <label className="ps-project-list">
            <span>{L4(language, { ko: "작품 선택", en: "Select work", ja: "作品選択", zh: "选择作品" })}</span>
            <select
              value={currentProjectId ?? ""}
              onChange={onSelectProject}
              data-testid="lg-project-list"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name || L4(language, { ko: "제목 없는 작품", en: "Untitled work", ja: "無題の作品", zh: "未命名作品" })} · {L4(language, {
                    ko: `${project.sessions.length}개 회차`,
                    en: `${project.sessions.length} episodes`,
                    ja: `${project.sessions.length}話`,
                    zh: `${project.sessions.length}章`,
                  })}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="ps-project-list empty" role="status">
            <span>{L4(language, { ko: "작품 보관함", en: "Work library", ja: "作品保管庫", zh: "作品库" })}</span>
            <b>{L4(language, { ko: "새 작품 준비", en: "New work ready", ja: "新規作品を準備", zh: "新作品准备中" })}</b>
          </div>
        )}
        <div className="ps-project-actions">
          <button
            type="button"
            className="btn primary"
            onClick={onSaveProjectNow}
            disabled={saveFlash}
            aria-busy={saveFlash}
            data-testid="lg-project-save-now"
          >
            <Check size={15} />
            {L4(language, { ko: "지금 저장", en: "Save now", ja: "今すぐ保存", zh: "立即保存" })}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onSaveOpenWorld}
            disabled={projectStartBusy}
            data-testid="lg-project-create-from-ops"
          >
            <Plus size={15} />
            {L4(language, { ko: "저장하고 세계관으로", en: "Save and open world", ja: "保存して世界観へ", zh: "保存并进入世界观" })}
          </button>
        </div>
        <div className="ps-project-danger" aria-label={L4(language, { ko: "작품 삭제", en: "Delete work", ja: "作品削除", zh: "删除作品" })}>
          <div className="ps-project-danger-head">
            <Alert size={16} />
            <strong>{L4(language, { ko: "작품 삭제", en: "Delete work", ja: "作品削除", zh: "删除作品" })}</strong>
            <span className="pill red">{L4(language, { ko: "주의", en: "Careful", ja: "注意", zh: "注意" })}</span>
          </div>
          <p>{L4(language, {
            ko: `현재 선택한 작품과 그 안의 회차를 삭제합니다. 입력창에 “${deleteToken}”만 입력하면 삭제 버튼이 켜집니다.`,
            en: `Deletes the selected work and its episodes. Type only “${deleteToken}” to enable the delete button.`,
            ja: `選択中の作品とその話数を削除します。「${deleteToken}」だけを入力すると削除ボタンが有効になります。`,
            zh: `删除当前选择的作品及其中章节。只输入“${deleteToken}”即可启用删除按钮。`,
          })}</p>
          <div className="ps-project-delete-row">
            <input
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder={deleteToken}
              aria-label={L4(language, { ko: `${deleteToken} 입력`, en: `Type ${deleteToken}`, ja: `${deleteToken} を入力`, zh: `输入 ${deleteToken}` })}
              disabled={!currentProjectId}
              data-testid="lg-project-delete-confirm"
            />
            <button
              type="button"
              className="btn danger"
              onClick={onDeleteCurrentProject}
              disabled={!canDeleteCurrentProject}
              data-testid="lg-project-delete"
            >
              <X size={15} />
              {L4(language, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
            </button>
          </div>
        </div>
      </div>

      <div className="ps-import ps-import-compact">
        <div className="ps-import-head">
          <Download size={18} />
          <strong>{L4(language, { ko: "파일 가져오기", en: "Import files", ja: "ファイルから読み込み", zh: "从文件导入" })}</strong>
          <button type="button" className="btn" onClick={onFocusImport}>
            {L4(language, { ko: "열기", en: "Open", ja: "開く", zh: "打开" })}
          </button>
        </div>
        <p>{L4(language, {
          ko: "원고·설정집·권리 메모를 작은 창에서 읽고, 반영할 항목만 고릅니다.",
          en: "Read manuscripts, bibles, and rights notes in a small dialog, then pick what to apply.",
          ja: "原稿・設定集・権利メモを小さな画面で読み、反映する項目だけ選びます。",
          zh: "在小窗口中读取正文、设定集与权利备注，只选择要写入的项目。",
        })}</p>
        <div className="ps-import-compact-count" role="status">
          {importCandidateCount > 0
            ? L4(language, {
              ko: `읽은 자료 ${importCandidateCount}건 · 반영 ${acceptedCandidateCount}건`,
              en: `${importCandidateCount} imported · ${acceptedCandidateCount} applied`,
              ja: `読み込み ${importCandidateCount}件 · 反映 ${acceptedCandidateCount}件`,
              zh: `已导入 ${importCandidateCount} 项 · 已写入 ${acceptedCandidateCount} 项`,
            })
            : L4(language, { ko: "아직 읽은 자료 없음", en: "No imported material yet", ja: "読み込み資料なし", zh: "暂无导入资料" })}
        </div>
      </div>

      <div className="ps-card">
        <Book size={18} />
        <div>
          <b>{L4(language, { ko: "작품 골격", en: "Work frame", ja: "作品の骨格", zh: "作品骨架" })}</b>
          <span>
            {draft.title.trim() || L4(language, { ko: "작품명 미정", en: "Title not set", ja: "作品名未定", zh: "作品名未定" })} · {L4(language, FORMAT_LABEL_UI[draft.format])} · {L4(language, TARGET_LANGUAGE_LABEL_UI[draft.targetLanguage])} · {L4(language, TARGET_MARKET_LABEL_UI[draft.targetMarket])}
          </span>
        </div>
      </div>
      <div className="ps-card">
        <Clock size={18} />
        <div>
          <b>{L4(language, { ko: "연재 기준", en: "Release basis", ja: "連載基準", zh: "连载基准" })}</b>
          <span>
            {draft.publishPlatform === PublishPlatform.NONE
              ? L4(language, { ko: "플랫폼 미정", en: "Platform not set", ja: "プラットフォーム未定", zh: "平台未定" })
              : draft.publishPlatform}
            {" · "}
            {L4(language, RELEASE_PURPOSE_LABEL_UI[draft.releasePurpose])}
            {" · "}
            {draft.totalEpisodes.trim() || L4(language, { ko: "회차 미정", en: "Episode count not set", ja: "話数未定", zh: "章节数未定" })}
            {" · "}
            {draft.episodeLength.trim() || L4(language, { ko: "분량 미정", en: "Length not set", ja: "分量未定", zh: "篇幅未定" })}
          </span>
        </div>
      </div>
      <div className="ps-card">
        <Globe size={18} />
        <div>
          <b>{L4(language, { ko: "세계관 시작점", en: "World starting point", ja: "世界観の開始点", zh: "世界观起点" })}</b>
          <span>{draft.premise.trim() || L4(language, { ko: "핵심 전제 작성 전", en: "Core premise not written yet", ja: "核心前提作成前", zh: "核心前提尚未填写" })}</span>
        </div>
      </div>
      <div className="ps-card">
        <Shield size={18} />
        <div>
          <b>{L4(language, { ko: "권리/IP 확인", en: "Rights/IP check", ja: "権利/IP確認", zh: "权利/IP检查" })}</b>
          <span>
            {L4(language, RIGHTS_STATUS_LABEL_UI[draft.rightsStatus])}
            {" · "}
            {draft.rightsNote.trim() || L4(language, { ko: "권리 메모 작성 전", en: "Rights note not written yet", ja: "権利メモ作成前", zh: "权利备注尚未填写" })}
          </span>
        </div>
      </div>

      <div className="ps-pack">
        <div className="ps-pack-head">
          <Scroll size={18} />
          <strong>{L4(language, { ko: "출고까지 이어지는 기록", en: "Records carried into release", ja: "出稿まで続く記録", zh: "延续到交付的记录" })}</strong>
        </div>
        {PACK_ROWS_UI.map(({ label, statusLabel, Icon }, index) => {
          const rowLabel = L4(language, label);
          return (
            <div key={rowLabel} className="ps-pack-row">
              <Icon size={15} aria-hidden="true" />
              <span>{rowLabel}</span>
              <b>
                {index === 1 && importCandidateCount > 0
                  ? `${acceptedCandidateCount}/${importCandidateCount}`
                  : L4(language, statusLabel)}
              </b>
            </div>
          );
        })}
      </div>
    </IdeResizablePanel>
  );
}
