import { useState } from "react";
import { Chevron, ChevronL, ChevronR, Pen, Plus, Sparkle } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import { isCollapsed, loadCollapse, saveCollapse, toggleCollapse } from "@/lib/writing-workspace/collapse-state";

/** "오늘 작업" 보드 접힘 상태 영속 키 (collapse-state v1 맵 내). */
const PRODUCTION_COLLAPSE_KEY = "wr-production-board";

type Tone = "green" | "amber" | "blue" | "gray";

export interface ProductionNextStep {
  tone: Tone;
  label: string;
  detail: string;
}

export interface ProductionRow {
  label: string;
  value: string;
  tone: Tone;
}

export interface EpisodeNavLabels {
  episodeLabel: string;
  prevEpisodeAria: string;
  nextEpisodeAria: string;
}

export function WritingMetaChips({
  labels,
  metaChips,
  epNow,
  epTotal,
  canPrevEpisode,
  canNextEpisode,
  onPrevEpisode,
  onNextEpisode,
}: {
  labels: EpisodeNavLabels;
  metaChips: Array<[string, string]>;
  epNow: number | null;
  epTotal: number | null;
  canPrevEpisode: boolean;
  canNextEpisode: boolean;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
}) {
  if (metaChips.length === 0 && epNow == null) return null;

  return (
    <div className="wr-metas">
      {epNow != null && (
        <span className="wr-chip wr-episode-chip">
          <button
            type="button"
            className="mini-btn wr-episode-nav"
            aria-label={labels.prevEpisodeAria}
            title={labels.prevEpisodeAria}
            disabled={!canPrevEpisode}
            onClick={onPrevEpisode}
          >
            <ChevronL size={12} />
          </button>
          <b>{labels.episodeLabel}</b> : {epNow}
          {epTotal != null ? ` / ${epTotal}` : ""}
          <button
            type="button"
            className="mini-btn wr-episode-nav"
            aria-label={labels.nextEpisodeAria}
            title={labels.nextEpisodeAria}
            disabled={!canNextEpisode}
            onClick={onNextEpisode}
          >
            <ChevronR size={12} />
          </button>
        </span>
      )}
      {metaChips.map(([key, value]) => (
        <span key={key} className="wr-chip">
          <b>{key}</b> : {value}
        </span>
      ))}
    </div>
  );
}

export function WritingProductionBoard({
  language,
  nextStep,
  progressPct,
  rows,
  canNextEpisode,
  onFocusDraft,
  onNoaSuggestion,
  onNextEpisode,
}: {
  language: AppLanguage;
  nextStep: ProductionNextStep;
  progressPct: number;
  rows: ProductionRow[];
  canNextEpisode: boolean;
  onFocusDraft: () => void;
  onNoaSuggestion: () => void;
  onNextEpisode: () => void;
}) {
  // lazy init — studio는 ssr:false라 첫 렌더부터 localStorage 안전(hydration 불일치 없음).
  const [collapsed, setCollapsed] = useState(() => isCollapsed(loadCollapse(), PRODUCTION_COLLAPSE_KEY));
  const toggleBoard = () => {
    const next = toggleCollapse(loadCollapse(), PRODUCTION_COLLAPSE_KEY);
    saveCollapse(next);
    setCollapsed(isCollapsed(next, PRODUCTION_COLLAPSE_KEY));
  };

  const toggleBtn = (
    <button
      type="button"
      className="mini-btn wr-production-toggle"
      onClick={toggleBoard}
      aria-expanded={!collapsed}
      aria-label={
        collapsed
          ? L4(language, { ko: "오늘 작업 펼치기", en: "Expand today's work" })
          : L4(language, { ko: "오늘 작업 접기", en: "Collapse today's work" })
      }
      title={
        collapsed
          ? L4(language, { ko: "오늘 작업 펼치기", en: "Expand" })
          : L4(language, { ko: "오늘 작업 접기", en: "Collapse" })
      }
    >
      <Chevron size={14} />
    </button>
  );

  const actions = (
    <div className="wr-production-actions">
      <button type="button" className="mini-btn ok" onClick={onFocusDraft}>
        <Pen size={13} />
        {L4(language, { ko: "계속 쓰기", en: "Keep writing" })}
      </button>
      <button type="button" className="mini-btn" onClick={onNoaSuggestion}>
        <Sparkle size={13} />
        {L4(language, { ko: "노아 제안", en: "Noa suggestion" })}
      </button>
      <button type="button" className="mini-btn" onClick={onNextEpisode} disabled={!canNextEpisode}>
        <Plus size={13} />
        {L4(language, { ko: "다음 회차", en: "Next episode" })}
      </button>
    </div>
  );

  const boardLabel = L4(language, { ko: "오늘 집필 작업 상태", en: "Today's writing work status" });

  // 접힘: 에디터에 세로 공간을 내주기 위해 한 줄 요약만 (kicker · 다음할일 · 진행%) + 액션.
  if (collapsed) {
    return (
      <div className="wr-production-board is-collapsed" aria-label={boardLabel}>
        {toggleBtn}
        <div className="wr-production-collapsed">
          <span className={"rdot " + nextStep.tone} />
          <span className="wr-production-collapsed-kicker">{L4(language, { ko: "오늘 작업", en: "Today" })}</span>
          <b className="wr-production-collapsed-title">{nextStep.label}</b>
          <span className="wr-production-collapsed-pct">{progressPct}%</span>
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div className="wr-production-board" aria-label={boardLabel}>
      <div className="wr-production-main">
        <div className="wr-production-kicker">
          {toggleBtn}
          <span className={"rdot " + nextStep.tone} />
          {L4(language, { ko: "오늘 작업", en: "Today" })}
        </div>
        <div className="wr-production-title">{nextStep.label}</div>
        <p>{nextStep.detail}</p>
        <progress
          className="wr-production-progress"
          value={progressPct}
          max={100}
          aria-label={L4(language, { ko: "회차 참고 분량 진행도", en: "Reference episode length progress" })}
        />
        <div className="wr-production-meter-label">
          <span>{L4(language, { ko: "참고 5,500자까지", en: "Toward 5,500 chars" })}</span>
          <b>{progressPct}%</b>
        </div>
      </div>
      <div className="wr-production-stats">
        {rows.map((row) => (
          <div key={row.label} className="wr-production-stat">
            <span className={"rdot " + row.tone} />
            <small>{row.label}</small>
            <b>{row.value}</b>
          </div>
        ))}
      </div>
      {actions}
    </div>
  );
}
