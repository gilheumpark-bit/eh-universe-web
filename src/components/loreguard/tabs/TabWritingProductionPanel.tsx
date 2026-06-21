import { ChevronL, ChevronR, Pen, Plus, Sparkle } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

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
        <span className="wr-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="mini-btn"
            aria-label={labels.prevEpisodeAria}
            title={labels.prevEpisodeAria}
            disabled={!canPrevEpisode}
            onClick={onPrevEpisode}
            style={{ padding: "0 4px" }}
          >
            <ChevronL size={12} />
          </button>
          <b>{labels.episodeLabel}</b> : {epNow}
          {epTotal != null ? ` / ${epTotal}` : ""}
          <button
            type="button"
            className="mini-btn"
            aria-label={labels.nextEpisodeAria}
            title={labels.nextEpisodeAria}
            disabled={!canNextEpisode}
            onClick={onNextEpisode}
            style={{ padding: "0 4px" }}
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
  return (
    <div className="wr-production-board" aria-label={L4(language, { ko: "오늘 집필 작업 상태", en: "Today's writing work status" })}>
      <div className="wr-production-main">
        <div className="wr-production-kicker">
          <span className={"rdot " + nextStep.tone} />
          {L4(language, { ko: "오늘 작업", en: "Today" })}
        </div>
        <div className="wr-production-title">{nextStep.label}</div>
        <p>{nextStep.detail}</p>
        <div
          className="wr-production-meter"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-label={L4(language, { ko: "회차 참고 분량 진행도", en: "Reference episode length progress" })}
        >
          <span style={{ width: `${progressPct}%` }} />
        </div>
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
    </div>
  );
}
