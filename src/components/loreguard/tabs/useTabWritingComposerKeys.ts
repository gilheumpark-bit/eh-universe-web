"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import type { MentionItem } from "@/components/loreguard/ComposerExtras";

type UseTabWritingComposerKeysArgs = {
  dismissMention: () => void;
  handleCancel: () => void;
  markGenerationCancelled: () => void;
  mentionActiveIdx: number;
  mentionFiltered: MentionItem[];
  mentionOpen: boolean;
  selectMention: (item: MentionItem) => void;
  setArmedCancel: (value: boolean) => void;
  setInput: (value: string) => void;
  setMentionIndex: (updater: (index: number) => number) => void;
  submitGenerate: () => void;
  suppressMention: () => void;
  updateMention: (element: HTMLInputElement) => void;
};

export function useTabWritingComposerKeys({
  dismissMention,
  handleCancel,
  markGenerationCancelled,
  mentionActiveIdx,
  mentionFiltered,
  mentionOpen,
  selectMention,
  setArmedCancel,
  setInput,
  setMentionIndex,
  submitGenerate,
  suppressMention,
  updateMention,
}: UseTabWritingComposerKeysArgs) {
  const handleComposerChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
    updateMention(event.target);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (mentionOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((index) => (index + 1) % mentionFiltered.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex((index) => (index - 1 + mentionFiltered.length) % mentionFiltered.length);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        selectMention(mentionFiltered[mentionActiveIdx]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        suppressMention();
        return;
      }
      if (event.key === "Tab") dismissMention();
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitGenerate();
    }
  };

  const confirmCancelGeneration = () => {
    setArmedCancel(false);
    markGenerationCancelled();
    handleCancel();
  };

  return {
    confirmCancelGeneration,
    handleComposerChange,
    handleComposerKeyDown,
  };
}
