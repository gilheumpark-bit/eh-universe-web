import type { ComponentType } from "react";
import { Download, Eye, Layers, Scale, Scroll, Search } from "@/components/loreguard/icons";
import type { WritingFontMode } from "@/components/loreguard/ComposerExtras";
import { writingFontModeFromFamily } from "@/components/loreguard/tabs/TabWriting.shared";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import type { WorkspacePrefs } from "@/lib/writing-workspace/workspace-prefs";
import { FONT_FAMILIES, isFontFamilyId } from "@/lib/writing-workspace/font-family";

type Tone = "green" | "amber" | "blue" | "gray";
type IconComponent = ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;

export interface ProductReadinessRow {
  tone: Tone;
  label: string;
  value: string;
}

export interface WritingValueAction {
  key: string;
  Icon: IconComponent;
  label: string;
  detail: string;
  status: string;
  tone: Tone;
  onClick: () => void;
}

export function WritingValueCard({
  language,
  productReadinessRows,
  actions,
}: {
  language: AppLanguage;
  productReadinessRows: ProductReadinessRow[];
  actions: WritingValueAction[];
}) {
  return (
    <div className="pcard wr-value-card" aria-label={L4(language, { ko: "집필 출고 흐름", en: "Writing to package flow" })}>
      <div className="pcard-h">
        <Layers size={15} />
        {L4(language, { ko: "집필에서 출고까지", en: "From writing to package" })}
        <span className="pill blue" style={{ marginLeft: "auto" }}>
          {L4(language, { ko: "작업장 + 출고", en: "Studio + package" })}
        </span>
      </div>
      <p className="wr-value-copy">
        {L4(language, {
          ko: "원고를 쓰는 동안 노아 제안, 과정기록, 권리/IP 점검, 출고 패키지 준비가 같은 흐름에 쌓입니다.",
          en: "As you write, Noa suggestions, process records, rights/IP checks, and package readiness stay in one flow.",
        })}
      </p>
      <div className="wr-value-progress" aria-label={L4(language, { ko: "출고 준비 상태", en: "Package readiness" })}>
        {productReadinessRows.map((row) => (
          <span key={row.label} className="wr-value-step">
            <span className={"rdot " + row.tone} />
            <span>{row.label}</span>
          </span>
        ))}
      </div>
      <div className="wr-value-actions">
        {actions.map((action) => {
          const Icon = action.Icon;
          return (
            <button key={action.key} type="button" className="wr-value-action" onClick={action.onClick}>
              <Icon size={15} />
              <span className="wr-value-action-text">
                <b>{action.label}</b>
                <small>{action.detail}</small>
              </span>
              <span className={"pill " + action.tone}>{action.status}</span>
            </button>
          );
        })}
      </div>
      <div className="wr-value-foot">
        <span>
          {L4(language, {
            ko: "작업장은 집필 흐름, 출고 크레딧은 패키지 준비에 연결됩니다.",
            en: "Studio access supports writing flow; package credits support release prep.",
          })}
        </span>
        <a className="mini-btn" href="/docs#redeem">
          {L4(language, { ko: "이용 범위 보기", en: "Usage guide" })}
        </a>
      </div>
    </div>
  );
}

export function DraftViewSettingsCard({
  language,
  viewPrefs,
  updateViewPrefs,
  setFontMode,
}: {
  language: AppLanguage;
  viewPrefs: WorkspacePrefs;
  updateViewPrefs: (patch: Partial<WorkspacePrefs>) => void;
  setFontMode: (mode: WritingFontMode) => void;
}) {
  return (
    <div className="pcard" aria-label={L4(language, { ko: "본문 보기 설정", en: "Draft view settings" })}>
      <div className="pcard-h">
        <Eye size={15} />
        {L4(language, { ko: "본문 보기", en: "Draft view" })}
        <span className="pill gray" style={{ marginLeft: "auto" }}>
          {viewPrefs.fontSize}px · {viewPrefs.lineHeight.toFixed(1)}
        </span>
      </div>
      <label className="wr-srow" style={{ alignItems: "center" }}>
        <span>{L4(language, { ko: "글꼴", en: "Font" })}</span>
        <select
          className="mini-btn"
          aria-label={L4(language, { ko: "본문 글꼴", en: "Draft font" })}
          value={viewPrefs.fontFamily ?? "system"}
          onChange={(event) => {
            const nextFont = isFontFamilyId(event.target.value) ? event.target.value : "system";
            updateViewPrefs({ fontFamily: nextFont });
            setFontMode(writingFontModeFromFamily(nextFont));
          }}
          style={{ marginLeft: "auto", minWidth: 150, justifyContent: "flex-start" }}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
      </label>
      <label className="wr-srow" style={{ alignItems: "center" }}>
        <span>{L4(language, { ko: "글자 크기", en: "Text size" })}</span>
        <input
          type="range"
          min={12}
          max={24}
          step={1}
          value={viewPrefs.fontSize}
          aria-label={L4(language, { ko: "본문 글자 크기", en: "Draft text size" })}
          onChange={(event) => updateViewPrefs({ fontSize: Number(event.target.value) })}
          style={{ flex: 1, minWidth: 0 }}
        />
        <b style={{ width: 42, textAlign: "right" }}>{viewPrefs.fontSize}px</b>
      </label>
      <label className="wr-srow" style={{ alignItems: "center" }}>
        <span>{L4(language, { ko: "줄간격", en: "Line height" })}</span>
        <input
          type="range"
          min={1.2}
          max={2.4}
          step={0.1}
          value={viewPrefs.lineHeight}
          aria-label={L4(language, { ko: "본문 줄간격", en: "Draft line height" })}
          onChange={(event) => updateViewPrefs({ lineHeight: Number(event.target.value) })}
          style={{ flex: 1, minWidth: 0 }}
        />
        <b style={{ width: 42, textAlign: "right" }}>{viewPrefs.lineHeight.toFixed(1)}</b>
      </label>
      <label className="wr-srow" style={{ alignItems: "center" }}>
        <span>{L4(language, { ko: "편집폭", en: "Editor width" })}</span>
        <input
          type="range"
          min={480}
          max={1100}
          step={20}
          value={viewPrefs.editorWidth}
          aria-label={L4(language, { ko: "본문 편집폭", en: "Draft editor width" })}
          onChange={(event) => updateViewPrefs({ editorWidth: Number(event.target.value) })}
          style={{ flex: 1, minWidth: 0 }}
        />
        <b style={{ width: 50, textAlign: "right" }}>{viewPrefs.editorWidth}px</b>
      </label>
    </div>
  );
}

export function WritingShortcutsCard({ language }: { language: AppLanguage }) {
  return (
    <div className="pcard" aria-label={L4(language, { ko: "집필 바로가기", en: "Writing shortcuts" })}>
      <div className="pcard-h">
        <Search size={15} />
        {L4(language, { ko: "집필 바로가기", en: "Writing shortcuts" })}
      </div>
      <div className="wr-srow">
        <span className="rdot blue" />
        {L4(language, { ko: "선택 영역 리라이트", en: "Rewrite selection" })}
        <b>Ctrl+Shift+R</b>
      </div>
      <div className="wr-srow">
        <span className="rdot gray" />
        {L4(language, { ko: "찾기·바꾸기", en: "Find/replace" })}
        <b>Ctrl+H</b>
      </div>
      <div className="wr-srow">
        <span className="rdot amber" />
        {L4(language, { ko: "리딥 모드", en: "Reading mode" })}
        <b>Ctrl+Alt+R</b>
      </div>
      <div className="wr-srow">
        <span className="rdot gray" />
        {L4(language, { ko: "되돌리기 / 다시 실행", en: "Undo / redo" })}
        <b>Ctrl+Z / Ctrl+Y</b>
      </div>
    </div>
  );
}

export function ReceiptReadinessCard({
  language,
  draftCharCount,
  productReadinessRows,
  openCp,
  openIpAsset,
  openExport,
}: {
  language: AppLanguage;
  draftCharCount: number;
  productReadinessRows: ProductReadinessRow[];
  openCp: () => void;
  openIpAsset: () => void;
  openExport: () => void;
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Scroll size={15} />
        {L4(language, { ko: "확인서·권리/IP 준비", en: "Receipt and rights/IP readiness" })}
        <span className={"pill " + (draftCharCount > 0 ? "green" : "amber")} style={{ marginLeft: "auto" }}>
          {draftCharCount > 0 ? L4(language, { ko: "진행 중", en: "Active" }) : L4(language, { ko: "준비 전", en: "Pending" })}
        </span>
      </div>
      {productReadinessRows.map((row) => (
        <div key={row.label} className="wr-srow">
          <span className={"rdot " + row.tone} />
          {row.label}
          <b>{row.value}</b>
        </div>
      ))}
      <div className="wr-cta" style={{ marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" className="mini-btn" onClick={openCp}>
          <Scroll size={13} />
          {L4(language, { ko: "확인서", en: "Receipt" })}
        </button>
        <button type="button" className="mini-btn" onClick={openIpAsset}>
          <Scale size={13} />
          {L4(language, { ko: "권리/IP 자산화", en: "Rights/IP pack" })}
        </button>
        <button type="button" className="mini-btn" onClick={openExport}>
          <Download size={13} />
          {L4(language, { ko: "출고 패키지", en: "Package" })}
        </button>
      </div>
    </div>
  );
}
