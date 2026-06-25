"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import type { AcceptedImportCandidateRecord, CharacterSubTab, StoryConfig } from "@/lib/studio-types";
import { fireCpLog, getCreativeLogger } from "./TabCharacter.creative-log";
import { buildImportedCharacter, buildImportedItem } from "./TabCharacter.shared";

type SetConfig = (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;

interface UseCharacterImportRoutingArgs {
  setConfig: SetConfig;
  setCharSubTab: Dispatch<SetStateAction<CharacterSubTab>>;
  closeRailIfSheet: () => void;
  onSelectCharacter: Dispatch<SetStateAction<string | null>>;
  onEditingChange: Dispatch<SetStateAction<boolean>>;
}

export function useCharacterImportRouting({
  setConfig,
  setCharSubTab,
  closeRailIfSheet,
  onSelectCharacter,
  onEditingChange,
}: UseCharacterImportRoutingArgs) {
  const markImportCandidate = useCallback(
    (id: string, routedToStage: string, routedTargetKey: string) => {
      setConfig((prev) => ({
        ...prev,
        acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((candidate) =>
          candidate.id === id
            ? {
                ...candidate,
                routedToStage,
                routedTargetKey,
                routedAt: new Date().toISOString(),
              }
            : candidate,
        ),
      }));
    },
    [setConfig],
  );

  const routeCharacterImportCandidate = useCallback(
    (candidate: AcceptedImportCandidateRecord) => {
      const imported = buildImportedCharacter(candidate);
      setConfig((prev) => ({
        ...prev,
        characters: [...(prev.characters ?? []), imported],
        acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((entry) =>
          entry.id === candidate.id
            ? {
                ...entry,
                routedToStage: "character",
                routedTargetKey: imported.id,
                routedAt: new Date().toISOString(),
              }
            : entry,
        ),
      }));
      onSelectCharacter(imported.id);
      onEditingChange(false);
      setCharSubTab("characters");
      closeRailIfSheet();
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "character",
          targetId: imported.id,
          afterContent: JSON.stringify(imported),
          note: "import-character-adopt (TabCharacter)",
          stage: "character",
        }),
      );
      markExplicitCreativeLog("character");
    },
    [closeRailIfSheet, onEditingChange, onSelectCharacter, setCharSubTab, setConfig],
  );

  const routeItemImportCandidate = useCallback(
    (candidate: AcceptedImportCandidateRecord) => {
      const imported = buildImportedItem(candidate);
      setConfig((prev) => ({
        ...prev,
        items: [...(prev.items ?? []), imported],
        acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((entry) =>
          entry.id === candidate.id
            ? {
                ...entry,
                routedToStage: "item",
                routedTargetKey: imported.id,
                routedAt: new Date().toISOString(),
              }
            : entry,
        ),
      }));
      setCharSubTab("items");
      closeRailIfSheet();
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "metadata",
          targetId: imported.id,
          afterContent: JSON.stringify(imported),
          note: "import-item-adopt (TabCharacter)",
          stage: "character",
        }),
      );
    },
    [closeRailIfSheet, setCharSubTab, setConfig],
  );

  return {
    markImportCandidate,
    routeCharacterImportCandidate,
    routeItemImportCandidate,
  };
}
