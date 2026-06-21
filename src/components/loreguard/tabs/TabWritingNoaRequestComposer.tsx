import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import { Send, Sync, X } from "@/components/loreguard/icons";
import {
  MentionDropdown,
  ModelPickerInline,
  ReasoningLevelInline,
  type MentionItem,
} from "@/components/loreguard/ComposerExtras";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

export function NoaRequestComposer({
  language,
  hostedProviders,
  inputRef,
  input,
  isGenerating,
  armedCancel,
  hasAiAccess,
  mentionOpen,
  mentionFiltered,
  mentionActiveIdx,
  mentionListboxId,
  onInputChange,
  onInputKeyDown,
  onInputBlur,
  onMentionSelect,
  onArmCancel,
  onConfirmCancel,
  onCancelStop,
  onSubmit,
}: {
  language: AppLanguage;
  hostedProviders: Record<string, boolean>;
  inputRef: RefObject<HTMLInputElement | null>;
  input: string;
  isGenerating: boolean;
  armedCancel: boolean;
  hasAiAccess: boolean;
  mentionOpen: boolean;
  mentionFiltered: MentionItem[];
  mentionActiveIdx: number;
  mentionListboxId: string;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onMentionSelect: (item: MentionItem) => void;
  onArmCancel: () => void;
  onConfirmCancel: () => void;
  onCancelStop: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="wd-input wr-composer" style={{ position: "relative" }}>
      {mentionOpen && (
        <MentionDropdown
          items={mentionFiltered}
          activeIndex={mentionActiveIdx}
          listboxId={mentionListboxId}
          language={language}
          onSelect={onMentionSelect}
        />
      )}
      <ModelPickerInline language={language} hostedProviders={hostedProviders} disabled={isGenerating} />
      <ReasoningLevelInline language={language} disabled={isGenerating} />
      <input
        ref={inputRef}
        className="wd-in-field"
        role="combobox"
        aria-expanded={mentionOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-controls={mentionOpen ? mentionListboxId : undefined}
        aria-activedescendant={mentionOpen ? `${mentionListboxId}-opt-${mentionActiveIdx}` : undefined}
        aria-label={L4(language, {
          ko: "노아 작업 지시 입력 — @ 로 캐릭터·세계관·회차 멘션",
          en: "Noa work request — type @ to mention characters, world fields, episodes",
        })}
        placeholder={L4(language, {
          ko: "노아에게 다음 전개를 지시하세요… (@로 캐릭터·설정 참조)",
          en: "Tell Noa what happens next… (@ to reference characters or lore)",
        })}
        value={input}
        onChange={onInputChange}
        onKeyDown={onInputKeyDown}
        onBlur={onInputBlur}
        disabled={isGenerating}
      />
      {isGenerating ? (
        armedCancel ? (
          <>
            <span className="pill amber" role="alert">
              {L4(language, {
                ko: "노아 작업 중단? 진행된 내용은 폐기됩니다",
                en: "Stop Noa work? Progress so far will be discarded",
              })}
            </span>
            <button
              type="button"
              className="mini-btn no"
              aria-label={L4(language, { ko: "노아 작업 중단 확인", en: "Confirm stop Noa work" })}
              onClick={onConfirmCancel}
            >
              <X size={13} />
              {L4(language, { ko: "확인", en: "Confirm" })}
            </button>
            <button
              type="button"
              className="mini-btn"
              aria-label={L4(language, { ko: "노아 작업 계속 (중단 취소)", en: "Keep Noa working (cancel stop)" })}
              onClick={onCancelStop}
            >
              {L4(language, { ko: "취소", en: "Cancel" })}
            </button>
          </>
        ) : (
          <>
            <span className="pill blue">
              <Sync size={12} className="animate-spin" />
              {L4(language, { ko: "노아 작업 중…", en: "Noa working…" })}
            </span>
            <button
              type="button"
              className="wd-in-send"
              aria-label={L4(language, { ko: "노아 작업 중단", en: "Stop Noa work" })}
              title={L4(language, { ko: "노아 작업 중단", en: "Stop Noa work" })}
              onClick={onArmCancel}
            >
              <X size={16} />
            </button>
          </>
        )
      ) : (
        <button
          type="button"
          className="wd-in-send"
          aria-label={L4(language, { ko: "노아 요청", en: "Request Noa" })}
          title={L4(language, { ko: "노아 요청", en: "Request Noa" })}
          onClick={onSubmit}
          disabled={hasAiAccess && !input.trim()}
        >
          <Send size={16} />
        </button>
      )}
    </div>
  );
}
