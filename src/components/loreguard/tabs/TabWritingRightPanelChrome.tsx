import { Check, Chevron, Download, Edit as EditIcon, Pen } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

type TabWritingRightPanelHeaderProps = {
  language: AppLanguage;
  collapsed: boolean;
  saveFlash: boolean;
  onToggle: () => void;
  onSaveDraft: () => void;
};

export function TabWritingRightPanelHeader({
  language,
  collapsed,
  saveFlash,
  onToggle,
  onSaveDraft,
}: TabWritingRightPanelHeaderProps) {
  return (
    <div className="wr-panel-head">
      <button
        type="button"
        className="wd-panel-toggle wr-panel-toggle"
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? L4(language, { ko: "집필 기준·출고 준비 열기", en: "Open writing basis and package" })
            : L4(language, { ko: "집필 기준·출고 준비 접기", en: "Collapse writing basis and package" })
        }
        title={
          collapsed
            ? L4(language, { ko: "집필 기준·출고 준비 열기", en: "Open writing basis and package" })
            : L4(language, { ko: "집필 기준·출고 준비 접기", en: "Collapse writing basis and package" })
        }
        onClick={onToggle}
      >
        <Chevron size={16} style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>
      <span>{L4(language, { ko: "집필 기준·출고 준비", en: "Writing basis and package" })}</span>
      {!collapsed && (
        <button
          type="button"
          className="mini-btn wr-panel-save"
          onClick={onSaveDraft}
          disabled={saveFlash}
          aria-busy={saveFlash}
          data-testid="writing-save-episode"
        >
          <Check size={13} />
          {L4(language, { ko: saveFlash ? "저장 중" : "저장", en: saveFlash ? "Saving" : "Save" })}
        </button>
      )}
    </div>
  );
}

type TabWritingRightPanelActionsProps = {
  language: AppLanguage;
  onFocusDraft: () => void;
  onOpenExport: () => void;
  onOpenInlineRewrite: () => void;
};

export function TabWritingRightPanelActions({
  language,
  onFocusDraft,
  onOpenExport,
  onOpenInlineRewrite,
}: TabWritingRightPanelActionsProps) {
  return (
    <div className="wr-cta wr-cta-top">
      <button
        type="button"
        className="btn primary"
        style={{ flex: 1, justifyContent: "center" }}
        onClick={onFocusDraft}
      >
        <Pen size={15} />
        {L4(language, { ko: "본문으로 이동", en: "Go to draft" })}
      </button>
      <button
        type="button"
        className="btn"
        style={{ flex: 1, justifyContent: "center" }}
        onClick={onOpenExport}
      >
        <Download size={15} />
        {L4(language, { ko: "검수·출고", en: "Review/export" })}
      </button>
      <button
        type="button"
        className="btn"
        style={{ flex: 1, justifyContent: "center" }}
        onClick={onOpenInlineRewrite}
        title={L4(language, {
          ko: "선택 영역 리라이트 — Ctrl+Shift+R 또는 우클릭",
          en: "Rewrite selection — Ctrl+Shift+R or right click",
        })}
      >
        <EditIcon size={15} />
        {L4(language, { ko: "리라이트", en: "Rewrite" })}
      </button>
    </div>
  );
}
