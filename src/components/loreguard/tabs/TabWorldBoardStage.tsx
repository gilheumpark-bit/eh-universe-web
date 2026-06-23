"use client";

import type {
  AcceptedImportCandidateRecord,
  StoryConfig,
} from "@/lib/studio-types";
import {
  WORLD_FIELDS,
  WorldBoardPanel,
  WorldCollapsedPanel,
  type CollapsedTiers,
  type WorldChatDraft,
  type WorldCollapsedSummaryItem,
  type WorldFieldKey,
} from "./TabWorld.parts";

interface TabWorldBoardStageProps {
  open: boolean;
  isSheet: boolean;
  cfg: StoryConfig | null;
  pickedField: WorldFieldKey;
  pickedDef: (typeof WORLD_FIELDS)[number];
  filledCount: number;
  completeness: number;
  collapsedTiers: CollapsedTiers;
  pendingImportCandidates: AcceptedImportCandidateRecord[];
  chatDrafts: WorldChatDraft[];
  summary: readonly WorldCollapsedSummaryItem[];
  onCollapse: () => void;
  onToggleTier: (tier: 1 | 2 | 3) => void;
  onPickField: (key: WorldFieldKey) => void;
  onApplyImportCandidate: (candidate: AcceptedImportCandidateRecord) => void;
  onPinChatDraft: (draft: WorldChatDraft) => void;
  onApplyChatDraft: (draft: WorldChatDraft) => void;
}

export default function TabWorldBoardStage({
  open,
  isSheet,
  cfg,
  pickedField,
  pickedDef,
  filledCount,
  completeness,
  collapsedTiers,
  pendingImportCandidates,
  chatDrafts,
  summary,
  onCollapse,
  onToggleTier,
  onPickField,
  onApplyImportCandidate,
  onPinChatDraft,
  onApplyChatDraft,
}: TabWorldBoardStageProps) {
  if (!open) {
    return (
      <WorldCollapsedPanel
        side="board"
        id="lg-world-board"
        label="세계관 보드"
        expandLabel="세계관 보드 펼치기"
        summary={summary}
        onExpand={onCollapse}
      />
    );
  }

  return (
    <WorldBoardPanel
      isSheet={isSheet}
      cfg={cfg}
      pickedField={pickedField}
      pickedDef={pickedDef}
      filledCount={filledCount}
      completeness={completeness}
      collapsedTiers={collapsedTiers}
      pendingImportCandidates={pendingImportCandidates}
      chatDrafts={chatDrafts}
      onCollapse={onCollapse}
      onToggleTier={onToggleTier}
      onPickField={onPickField}
      onApplyImportCandidate={onApplyImportCandidate}
      onPinChatDraft={onPinChatDraft}
      onApplyChatDraft={onApplyChatDraft}
    />
  );
}
