import { memo } from "react";
import { Check, X } from "@/components/loreguard/icons";
import type { ProactiveSuggestion } from "@/lib/studio-types";

export const SuggBlock = memo(function SuggBlock({
  sugg,
  color,
  acceptLabel,
  rejectLabel,
  onAccept,
  onReject,
}: {
  sugg: ProactiveSuggestion;
  color: "amber" | "blue";
  acceptLabel: string;
  rejectLabel: string;
  onAccept: (s: ProactiveSuggestion) => void;
  onReject: (s: ProactiveSuggestion) => void;
}) {
  const lines = [sugg.message, sugg.actionHint].filter((s): s is string => Boolean(s && s.trim()));

  return (
    <div className={"wr-sugg " + color} role="status" aria-live="polite">
      <div className="wr-sugg-body">
        {lines.map((line, i) => (
          <div key={i} className="wr-line-row">
            <span className="wr-n">{sugg.priority === "critical" ? "!" : "·"}</span>
            <span className="wr-t">{line}</span>
          </div>
        ))}
      </div>
      <div className="wr-sugg-actions">
        <button type="button" className="mini-btn ok" onClick={() => onAccept(sugg)}>
          <Check size={14} />
          {acceptLabel}
        </button>
        <button type="button" className="mini-btn no" onClick={() => onReject(sugg)}>
          <X size={14} />
          {rejectLabel}
        </button>
      </div>
    </div>
  );
});
