import type { RefObject } from "react";
import { FontModeToggle, type WritingFontMode } from "@/components/loreguard/ComposerExtras";
import {
  Check,
  Chevron,
  ChevronL,
  ChevronR,
  Download,
  Edit as EditIcon,
  Layers,
  Pen,
  Scale,
  Scroll,
  Search,
  Sparkle,
  Sync,
} from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

type WritingWorkspaceMode = "focus" | "advanced";

type SnapshotMeta = {
  label: string;
  at: number;
};

type TabWritingTopBarProps = {
  language: AppLanguage;
  episode: number | null;
  charCount: number;
  charUnit: string;
  writingWorkspaceMode: WritingWorkspaceMode;
  onWritingWorkspaceModeChange: (mode: WritingWorkspaceMode) => void;
  fontMode: WritingFontMode;
  onFontModeChange: (mode: WritingFontMode) => void;
  readMode: boolean;
  onToggleReadMode: () => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  findOpen: boolean;
  onToggleFind: () => void;
  saveFlash: boolean;
  hasLastSaveTime: boolean;
  snapshotMeta: SnapshotMeta | null;
  onUndoSnapshot: () => void;
  toolMenuRef: RefObject<HTMLDivElement | null>;
  toolMenuOpen: boolean;
  onToggleToolMenu: () => void;
  runToolMenuAction: (action: () => void) => void;
  openStyle: () => void;
  openRevision: () => void;
  openNoaComposeBundle: () => void;
  openCp: () => void;
  openIpAsset: () => void;
  openExport: () => void;
};

export default function TabWritingTopBar({
  language,
  episode,
  charCount,
  charUnit,
  writingWorkspaceMode,
  onWritingWorkspaceModeChange,
  fontMode,
  onFontModeChange,
  readMode,
  onToggleReadMode,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  findOpen,
  onToggleFind,
  saveFlash,
  hasLastSaveTime,
  snapshotMeta,
  onUndoSnapshot,
  toolMenuRef,
  toolMenuOpen,
  onToggleToolMenu,
  runToolMenuAction,
  openStyle,
  openRevision,
  openNoaComposeBundle,
  openCp,
  openIpAsset,
  openExport,
}: TabWritingTopBarProps) {
  return (
    <div className="wr-top">
      <div className="wr-title-block">
        <div className="wr-title">{L4(language, { ko: "집필", en: "Writing" })}</div>
        <div className="wr-title-sub">
          {episode != null
            ? L4(language, { ko: `${episode}화 원고`, en: `Episode ${episode} draft` })
            : L4(language, { ko: "원고", en: "Draft" })}
          <span aria-hidden="true">·</span>
          {charCount.toLocaleString()}
          {charUnit}
        </div>
      </div>
      <div className="wr-top-r">
        <div
          className="wr-workspace-switch"
          role="radiogroup"
          aria-label={L4(language, { ko: "집필 화면 모드", en: "Writing workspace mode" })}
        >
          <button
            type="button"
            role="radio"
            aria-checked={writingWorkspaceMode === "focus"}
            className={"wr-workspace-option" + (writingWorkspaceMode === "focus" ? " is-active" : "")}
            onClick={() => onWritingWorkspaceModeChange("focus")}
            title={L4(language, {
              ko: "원고와 노아 요청만 남겨 가볍게 씁니다.",
              en: "Keep the draft and Noa request area centered.",
            })}
          >
            {L4(language, { ko: "기본 집필", en: "Basic" })}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={writingWorkspaceMode === "advanced"}
            className={"wr-workspace-option" + (writingWorkspaceMode === "advanced" ? " is-active" : "")}
            onClick={() => onWritingWorkspaceModeChange("advanced")}
            title={L4(language, {
              ko: "작품 정보, 과정기록, 권리/IP, 출고 준비를 함께 봅니다.",
              en: "Show work info, process records, rights/IP, and package prep.",
            })}
          >
            {L4(language, { ko: "고급", en: "Advanced" })}
          </button>
        </div>
        <FontModeToggle mode={fontMode} onChange={onFontModeChange} language={language} />
        <button
          type="button"
          className={"mini-btn wr-act" + (readMode ? " ok" : "")}
          aria-label={L4(language, {
            ko: readMode ? "쓰기 모드로 돌아가기" : "원고를 읽기 모드로 검토",
            en: readMode ? "Return to editing" : "Review draft in reading mode",
          })}
          aria-pressed={readMode}
          title={L4(language, {
            ko: readMode ? "쓰기 모드로 돌아가기 (Ctrl+Alt+R)" : "원고를 책처럼 읽으며 흐름을 점검합니다. (Ctrl+Alt+R)",
            en: readMode ? "Return to editing (Ctrl+Alt+R)" : "Read the draft to check flow. (Ctrl+Alt+R)",
          })}
          onClick={onToggleReadMode}
        >
          <Scroll size={13} />
          {L4(language, { ko: readMode ? "쓰기" : "리딥", en: readMode ? "Edit" : "Read" })}
        </button>
        <button
          type="button"
          className="mini-btn wr-act"
          aria-label={L4(language, { ko: "실행 취소 (Ctrl+Z)", en: "Undo (Ctrl+Z)" })}
          title={L4(language, { ko: "실행 취소 (Ctrl+Z)", en: "Undo (Ctrl+Z)" })}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <ChevronL size={13} />
          {L4(language, { ko: "취소", en: "Undo" })}
        </button>
        <button
          type="button"
          className="mini-btn wr-act"
          aria-label={L4(language, { ko: "다시 실행 (Ctrl+Shift+Z)", en: "Redo (Ctrl+Shift+Z)" })}
          title={L4(language, { ko: "다시 실행 (Ctrl+Shift+Z / Ctrl+Y)", en: "Redo (Ctrl+Shift+Z / Ctrl+Y)" })}
          disabled={!canRedo}
          onClick={onRedo}
        >
          <ChevronR size={13} />
          {L4(language, { ko: "다시", en: "Redo" })}
        </button>
        <button
          type="button"
          className={"mini-btn wr-act" + (findOpen ? " ok" : "")}
          aria-label={L4(language, { ko: "찾기·바꾸기 (Ctrl+H)", en: "Find and replace (Ctrl+H)" })}
          aria-pressed={findOpen}
          title={L4(language, { ko: "찾기·바꾸기 (Ctrl+H)", en: "Find and replace (Ctrl+H)" })}
          onClick={onToggleFind}
        >
          <Search size={13} />
          {L4(language, { ko: "찾기", en: "Find" })}
        </button>
        {saveFlash ? (
          <span className="pill blue">
            <Sync size={12} />
            {L4(language, { ko: "저장 중…", en: "Saving…" })}
          </span>
        ) : hasLastSaveTime ? (
          <span className="pill green">
            <Check size={12} />
            {L4(language, { ko: "자동 저장됨", en: "Auto-saved" })}
          </span>
        ) : null}
        {snapshotMeta && (
          <button
            type="button"
            className="mini-btn wr-act"
            aria-label={L4(language, {
              ko: `되돌리기 — ${snapshotMeta.label} 본문과 맞바꾸기`,
              en: `Undo — swap with the "${snapshotMeta.label}" draft`,
            })}
            title={L4(language, {
              ko: `되돌리기 — ${snapshotMeta.label}`,
              en: `Undo — ${snapshotMeta.label}`,
            })}
            onClick={onUndoSnapshot}
          >
            <Sync size={13} />
            {L4(language, { ko: "되돌리기", en: "Undo" })}
          </button>
        )}
        <div className="wr-tool-menu" ref={toolMenuRef}>
          <button
            type="button"
            className={"btn wr-act wr-tool-menu-trigger" + (toolMenuOpen ? " ok" : "")}
            aria-haspopup="menu"
            aria-expanded={toolMenuOpen}
            aria-label={L4(language, { ko: "작업·출고 도구 열기", en: "Open work and publishing tools" })}
            onClick={onToggleToolMenu}
          >
            <Layers size={15} />
            {L4(language, { ko: "작업·출고", en: "Work tools" })}
            <Chevron size={13} />
          </button>
          {toolMenuOpen && (
            <div
              className="wr-tool-menu-pop"
              role="menu"
              aria-label={L4(language, { ko: "작업·출고 도구", en: "Work and publishing tools" })}
            >
              <button type="button" role="menuitem" className="wr-tool-menu-item" onClick={() => runToolMenuAction(openStyle)}>
                <Pen size={15} />
                <span>
                  <b>{L4(language, { ko: "문체", en: "Style" })}</b>
                  <small>{L4(language, { ko: "문장 톤·리듬", en: "Tone and rhythm" })}</small>
                </span>
              </button>
              <button type="button" role="menuitem" className="wr-tool-menu-item" onClick={() => runToolMenuAction(openRevision)}>
                <EditIcon size={15} />
                <span>
                  <b>{L4(language, { ko: "퇴고", en: "Revise" })}</b>
                  <small>{L4(language, { ko: "수정 후보", en: "Revision candidates" })}</small>
                </span>
              </button>
              <button type="button" role="menuitem" className="wr-tool-menu-item" onClick={() => runToolMenuAction(openNoaComposeBundle)}>
                <Sparkle size={15} />
                <span>
                  <b>{L4(language, { ko: "작업 묶음", en: "Work bundle" })}</b>
                  <small>{L4(language, { ko: "다중 탭 영향 확인", en: "Cross-tab impact" })}</small>
                </span>
              </button>
              <button type="button" role="menuitem" className="wr-tool-menu-item" onClick={() => runToolMenuAction(openCp)}>
                <Scroll size={15} />
                <span>
                  <b>{L4(language, { ko: "확인서", en: "Journal" })}</b>
                  <small>{L4(language, { ko: "과정기록", en: "Process record" })}</small>
                </span>
              </button>
              <button type="button" role="menuitem" className="wr-tool-menu-item" onClick={() => runToolMenuAction(openIpAsset)}>
                <Scale size={15} />
                <span>
                  <b>{L4(language, { ko: "IP 자산화", en: "IP assets" })}</b>
                  <small>{L4(language, { ko: "권리/IP 점검", en: "Rights/IP check" })}</small>
                </span>
              </button>
              <button type="button" role="menuitem" className="wr-tool-menu-item" onClick={() => runToolMenuAction(openExport)}>
                <Download size={15} />
                <span>
                  <b>{L4(language, { ko: "출고 패키지", en: "Publishing package" })}</b>
                  <small>{L4(language, { ko: "원고함·검수", en: "Library and review" })}</small>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
