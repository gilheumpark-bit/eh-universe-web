"use client";

import type { StudioEntryMode } from "@/lib/studio-entry-links";
import type { AppLanguage, Project } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import {
  projectDisplayName,
  projectEpisodeLabel,
  projectUpdatedLabel,
} from "@/components/loreguard/ProjectStart.project-helpers";
import { Download, Plus, Sparkle } from "./icons";

interface ProjectStartLibraryPanelProps {
  language: AppLanguage;
  startMode: StudioEntryMode;
  hasSavedProjects: boolean;
  savedProjectCount: number;
  visibleProjectTiles: Project[];
  currentProjectId: string | null;
  projectStartBusy: boolean;
  onCreateBlankProject: () => void;
  onContinueWithNoa: () => void;
  onFocusImport: () => void;
  onSelectProjectById: (projectId: string | null) => void;
  onOpenProject: (projectId: string) => void;
}

export function ProjectStartLibraryPanel({
  language,
  startMode,
  hasSavedProjects,
  savedProjectCount,
  visibleProjectTiles,
  currentProjectId,
  projectStartBusy,
  onCreateBlankProject,
  onContinueWithNoa,
  onFocusImport,
  onSelectProjectById,
  onOpenProject,
}: ProjectStartLibraryPanelProps) {
  return (
    <div
      id="project-management"
      className="ps-project-picker"
      aria-label={L4(language, {
        ko: "작품 보관함",
        en: "Project library",
        ja: "作品保管庫",
        zh: "作品库",
      })}
    >
      <div className="ps-project-picker-head">
        <div>
          <strong>{L4(language, {
            ko: startMode === "manage" ? "최근 작품 보관함" : "작품 보관함",
            en: startMode === "manage" ? "Recent work library" : "Project library",
            ja: startMode === "manage" ? "最近作品の保管庫" : "作品保管庫",
            zh: startMode === "manage" ? "最近作品库" : "作品库",
          })}</strong>
          <p>{L4(language, {
            ko: startMode === "manage"
              ? "이 화면은 저장된 작품을 여는 서랍입니다. 새 작품과 파일 가져오기는 위의 시작 방식에서 분리했습니다."
              : "새 작품 시작, 저장된 작품 열기, 파일 가져오기를 서로 다른 목적의 입구로 분리했습니다.",
            en: startMode === "manage"
              ? "This drawer is for saved works. New work and file import are separated above."
              : "New work, saved work, and file import are separated into distinct entry points.",
            ja: startMode === "manage"
              ? "この画面は保存済み作品を開く引き出しです。新規作品とファイル読み込みは上の開始方法で分けました。"
              : "新規作品、保存済み作品、ファイル読み込みを目的別の入口に分けました。",
            zh: startMode === "manage"
              ? "这个抽屉只用于打开已保存作品。新作品与文件导入已在上方入口分离。"
              : "新作品、已保存作品与文件导入已按不同目的分为独立入口。",
          })}</p>
        </div>
        <span className="pill">
          {hasSavedProjects
            ? L4(language, {
              ko: `${savedProjectCount}개 저장됨`,
              en: `${savedProjectCount} saved`,
              ja: `${savedProjectCount}件保存済み`,
              zh: `已保存 ${savedProjectCount} 个`,
            })
            : L4(language, { ko: "새 작품 준비", en: "New work ready", ja: "新規作品を準備", zh: "新作品准备中" })}
        </span>
      </div>

      {startMode !== "manage" || !hasSavedProjects ? (
        <div className="ps-project-entry-grid" aria-label={L4(language, {
          ko: "작품 시작 방법",
          en: "Work start methods",
          ja: "作品開始方法",
          zh: "作品开始方式",
        })}>
          <button
            type="button"
            className="ps-project-entry primary ps-project-entry-create"
            onClick={onCreateBlankProject}
            disabled={projectStartBusy}
            aria-busy={projectStartBusy}
            data-testid="lg-project-library-new"
          >
            <Plus size={17} />
            <span>
              <b>{L4(language, { ko: "새 작품", en: "New work", ja: "新規作品", zh: "新作品" })}</b>
              <small>{L4(language, {
                ko: "작가 기준으로 바로 시작",
                en: "Start from the author's standard",
                ja: "作者の基準で開始",
                zh: "按作者标准开始",
              })}</small>
            </span>
          </button>
          <button
            type="button"
            className="ps-project-entry ps-project-entry-noa"
            onClick={onContinueWithNoa}
            disabled={projectStartBusy}
            aria-busy={projectStartBusy}
            data-testid="lg-project-library-noa"
          >
            <Sparkle size={17} />
            <span>
              <b>{L4(language, { ko: "질문으로 기준 잡기", en: "Set the basis with questions", ja: "質問で基準を決める", zh: "通过提问确定基准" })}</b>
              <small>{L4(language, {
                ko: "선택지로 기준 잡기",
                en: "Set the basis with options",
                ja: "選択肢で基準を決める",
                zh: "通过选项确定基准",
              })}</small>
            </span>
          </button>
          <button
            type="button"
            className="ps-project-entry ps-project-entry-import"
            onClick={onFocusImport}
            data-testid="lg-project-library-import"
          >
            <Download size={17} />
            <span>
              <b>{L4(language, { ko: "파일 가져오기", en: "Import files", ja: "ファイルから読み込み", zh: "从文件导入" })}</b>
              <small>{L4(language, {
                ko: "작은 창에서 원고·설정집 먼저 검토",
                en: "Review manuscripts and bibles in a small dialog first",
                ja: "小さな画面で原稿・設定集を先に確認",
                zh: "先在小窗口检查正文/设定集",
              })}</small>
            </span>
          </button>
        </div>
      ) : null}

      {hasSavedProjects ? (
        <div className="ps-project-library-list" aria-label={L4(language, {
          ko: "최근 작품",
          en: "Recent works",
          ja: "最近の作品",
          zh: "最近作品",
        })}>
          <div className="ps-project-library-title">
            <strong>{L4(language, { ko: "최근 작품", en: "Recent works", ja: "最近の作品", zh: "最近作品" })}</strong>
            <span>{L4(language, {
              ko: "선택하면 오른쪽 작품 기준만 바뀝니다. 작업 열기는 이어서 할 단계로 이동합니다.",
              en: "Select changes only the basis board; open work moves to the next useful stage.",
              ja: "選択は右側の基準板だけを切り替え、作業を開くと続きの段階へ移動します。",
              zh: "选择只切换右侧基准板；打开工作会进入可继续工作的阶段。",
            })}</span>
          </div>
          {visibleProjectTiles.map((project) => {
            const isActive = project.id === currentProjectId;
            return (
              <article key={project.id} className={`ps-project-tile${isActive ? " active" : ""}`}>
                <div className="ps-project-tile-main">
                  <strong>{projectDisplayName(project, language)}</strong>
                  <span>{projectEpisodeLabel(project, language)} · {projectUpdatedLabel(project, language)}</span>
                </div>
                <div className="ps-project-tile-actions">
                  {isActive && (
                    <span className="pill blue">{L4(language, { ko: "현재", en: "Current", ja: "現在", zh: "当前" })}</span>
                  )}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onSelectProjectById(project.id)}
                    data-testid={`lg-project-select-${project.id}`}
                  >
                    {L4(language, { ko: "선택", en: "Select", ja: "選択", zh: "选择" })}
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => onOpenProject(project.id)}
                    data-testid={`lg-project-open-${project.id}`}
                  >
                    {L4(language, { ko: "작업 열기", en: "Open work", ja: "作業を開く", zh: "打开工作" })}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="ps-project-empty" role="status" aria-live="polite">
          <strong>{L4(language, {
            ko: "작가님의 첫 작품 보관함을 준비했습니다.",
            en: "Your first work library is ready.",
            ja: "作者の最初の作品保管庫を用意しました。",
            zh: "已为作者准备好首部作品库。",
          })}</strong>
          <p>{L4(language, {
            ko: "새 작품을 시작하거나, 기존 원고·설정집을 파일에서 가져오세요.",
            en: "Start a new work, or import an existing manuscript or setting book.",
            ja: "新しい作品を始めるか、既存の原稿・設定集を読み込んでください。",
            zh: "请开始新作品，或导入已有稿件/设定集。",
          })}</p>
          <div className="ps-project-empty-steps" aria-hidden="true">
            <span>{L4(language, { ko: "작업대", en: "Desk", ja: "作業台", zh: "工作台" })}</span>
            <span>{L4(language, { ko: "보관함", en: "Library", ja: "保管庫", zh: "作品库" })}</span>
            <span>{L4(language, { ko: "파일 서랍", en: "File drawer", ja: "ファイル引き出し", zh: "文件抽屉" })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
