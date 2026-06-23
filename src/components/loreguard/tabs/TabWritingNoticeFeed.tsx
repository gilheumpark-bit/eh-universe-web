import { L4 } from "@/lib/i18n";
import type { AppLanguage, ProactiveSuggestion } from "@/lib/studio-types";
import { SuggBlock } from "@/components/loreguard/tabs/TabWritingSuggestionBlock";

type TabWritingNoticeFeedProps = {
  language: AppLanguage;
  suggestions: ProactiveSuggestion[];
  pasteNotice: boolean;
  onAcceptSuggestion: (suggestion: ProactiveSuggestion) => void;
  onRejectSuggestion: (suggestion: ProactiveSuggestion) => void;
};

function suggestionTone(suggestion: ProactiveSuggestion): "amber" | "blue" {
  return suggestion.priority === "info" ? "blue" : "amber";
}

export default function TabWritingNoticeFeed({
  language,
  suggestions,
  pasteNotice,
  onAcceptSuggestion,
  onRejectSuggestion,
}: TabWritingNoticeFeedProps) {
  return (
    <>
      {suggestions.length > 0 && (
        <div className="wr-doc wr-result-root">
          {suggestions.map((suggestion) => (
            <SuggBlock
              key={suggestion.id}
              sugg={suggestion}
              color={suggestionTone(suggestion)}
              acceptLabel={L4(language, { ko: "본문 삽입", en: "Insert into draft" })}
              rejectLabel={L4(language, { ko: "거절", en: "Dismiss" })}
              onAccept={onAcceptSuggestion}
              onReject={onRejectSuggestion}
            />
          ))}
        </div>
      )}

      {pasteNotice && (
        <div className="wr-doc wr-result-root">
          <div className="wr-srow" role="status" aria-live="polite">
            <span className="rdot amber" />
            {L4(language, {
              ko: "대용량 붙여넣기 감지 — 저장에 시간이 걸릴 수 있습니다",
              en: "Large paste detected — saving may take a moment",
            })}
          </div>
        </div>
      )}
    </>
  );
}
