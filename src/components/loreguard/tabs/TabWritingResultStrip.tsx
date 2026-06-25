import { Check, Sync, X } from "@/components/loreguard/icons";

export interface AiResultLabels {
  aiResultTitle: string;
  aiResultBadge: string;
  insertToDraft: string;
  dismissResult: string;
  collapseResult: string;
  expandResult: string;
  tokenMeterAria: string;
  tokenUnit: string;
  secondsUnit: string;
  regenerateAria: string;
  regenerate: string;
}

export function AiResultStrip({
  labels,
  content,
  preview,
  expanded,
  needsToggle,
  onToggle,
  onInsert,
  onDismiss,
}: {
  labels: AiResultLabels;
  content: string;
  preview: string;
  expanded: boolean;
  needsToggle: boolean;
  onToggle: () => void;
  onInsert: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="wr-doc wr-result-root">
      <div className="wr-sugg blue" role="status" aria-live="polite" aria-label={labels.aiResultTitle}>
        <div className="wr-sugg-body">
          <div className="wr-line-row">
            <span className="wr-n">{labels.aiResultBadge}</span>
            <span className={"wr-t" + (expanded ? " wr-result-expanded" : "")}>
              {expanded ? content : preview}
            </span>
          </div>
        </div>
        <div className="wr-sugg-actions">
          {needsToggle && (
            <button
              type="button"
              className="mini-btn"
              aria-expanded={expanded}
              aria-label={expanded ? labels.collapseResult : labels.expandResult}
              onClick={onToggle}
            >
              {expanded ? labels.collapseResult : labels.expandResult}
            </button>
          )}
          <button
            type="button"
            className="mini-btn ok"
            aria-label={`${labels.aiResultTitle} — ${labels.insertToDraft}`}
            onClick={onInsert}
          >
            <Check size={14} />
            {labels.insertToDraft}
          </button>
          <button
            type="button"
            className="mini-btn no"
            aria-label={`${labels.aiResultTitle} — ${labels.dismissResult}`}
            onClick={onDismiss}
          >
            <X size={14} />
            {labels.dismissResult}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TokenRegenerateBar({
  labels,
  tokenUsage,
  generationTime,
  hasLatestAssistant,
  isGenerating,
  onRegenerate,
}: {
  labels: AiResultLabels;
  tokenUsage: { used: number; budget: number } | null | undefined;
  generationTime: number | null | undefined;
  hasLatestAssistant: boolean;
  isGenerating: boolean;
  onRegenerate: () => void;
}) {
  if (!tokenUsage && !hasLatestAssistant) return null;

  return (
    <div className="wr-token-regenerate">
      {tokenUsage && (
        <span className="pill gray" aria-label={labels.tokenMeterAria}>
          {tokenUsage.used.toLocaleString()} / {tokenUsage.budget.toLocaleString()} {labels.tokenUnit}
          {generationTime != null ? ` · ${generationTime}${labels.secondsUnit}` : ""}
        </span>
      )}
      {hasLatestAssistant && (
        <button
          type="button"
          className="mini-btn wr-push"
          aria-label={labels.regenerateAria}
          title={labels.regenerateAria}
          disabled={isGenerating}
          onClick={onRegenerate}
        >
          <Sync size={13} />
          {labels.regenerate}
        </button>
      )}
    </div>
  );
}
