"use client";

import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { extractJsonBlocks, type DockSuggestion, type DockSuggestionSource } from "@/components/loreguard/ChatCanvasDock";
import { compactDockMemoText, hashDockMemoText } from "@/components/loreguard/ChatCanvasDock.helpers";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import type { Character, Item, StoryConfig } from "@/lib/studio-types";
import { fireCpLog, getCreativeLogger } from "./TabCharacter.creative-log";
import { parseCharProposals, type CharProposal } from "./TabCharacter.shared";

type SetConfig = (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;

interface UseCharacterDockArgs {
  active: Character | null;
  characters: Character[];
  items: Item[];
  isItems: boolean;
  setConfig: SetConfig;
  onSelectCharacter: Dispatch<SetStateAction<string | null>>;
  onEditingChange: Dispatch<SetStateAction<boolean>>;
}

export function useCharacterDock({
  active,
  characters,
  items,
  isItems,
  setConfig,
  onSelectCharacter,
  onEditingChange,
}: UseCharacterDockArgs) {
  const applyCharacterProposal = useCallback(
    (proposal: CharProposal) => {
      const nameKey = proposal.name.trim().toLowerCase();
      const existing = characters.find((c) => c.name.trim().toLowerCase() === nameKey);
      const targetId = existing?.id ?? `char_${Date.now()}`;
      setConfig((prev) => {
        const list = prev.characters ?? [];
        const idx = list.findIndex((c) => c.name.trim().toLowerCase() === nameKey);
        if (idx >= 0) {
          const cur = list[idx];
          const merged: Character = {
            ...cur,
            role: proposal.role ?? cur.role,
            traits: proposal.traits ?? cur.traits,
            appearance: proposal.appearance ?? cur.appearance,
            personality: proposal.personality ?? cur.personality,
            speechStyle: proposal.speechStyle ?? cur.speechStyle,
            speechExample: proposal.speechExample ?? cur.speechExample,
            developmentTier: proposal.developmentTier ?? cur.developmentTier,
            informationState: proposal.informationState ?? cur.informationState,
            publicKnowledge: proposal.publicKnowledge ?? cur.publicKnowledge,
            privateTruth: proposal.privateTruth ?? cur.privateTruth,
            relationAddress: proposal.relationAddress ?? cur.relationAddress,
            honorificRule: proposal.honorificRule ?? cur.honorificRule,
            assetPotential: proposal.assetPotential ?? cur.assetPotential,
            assetMemo: proposal.assetMemo ?? cur.assetMemo,
          };
          return { ...prev, characters: list.map((c, i) => (i === idx ? merged : c)) };
        }
        const fresh: Character = {
          id: targetId,
          name: proposal.name.trim(),
          role: proposal.role ?? "",
          traits: proposal.traits ?? "",
          appearance: proposal.appearance ?? "",
          dna: 0,
          ...(proposal.personality ? { personality: proposal.personality } : {}),
          ...(proposal.speechStyle ? { speechStyle: proposal.speechStyle } : {}),
          ...(proposal.speechExample ? { speechExample: proposal.speechExample } : {}),
          ...(proposal.developmentTier ? { developmentTier: proposal.developmentTier } : {}),
          ...(proposal.informationState ? { informationState: proposal.informationState } : {}),
          ...(proposal.publicKnowledge ? { publicKnowledge: proposal.publicKnowledge } : {}),
          ...(proposal.privateTruth ? { privateTruth: proposal.privateTruth } : {}),
          ...(proposal.relationAddress ? { relationAddress: proposal.relationAddress } : {}),
          ...(proposal.honorificRule ? { honorificRule: proposal.honorificRule } : {}),
          ...(proposal.assetPotential ? { assetPotential: proposal.assetPotential } : {}),
          ...(proposal.assetMemo ? { assetMemo: proposal.assetMemo } : {}),
        };
        return { ...prev, characters: [...list, fresh] };
      });
      onSelectCharacter(targetId);
      onEditingChange(false);
      fireCpLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "character",
          targetId,
          beforeContent: existing ? JSON.stringify(existing) : undefined,
          afterContent: JSON.stringify(proposal),
          decisionContext: {
            selectedAlternativeId: targetId,
            selectedLabel: proposal.name || "캐릭터 제안",
            selectedContent: JSON.stringify(proposal),
            reason: existing
              ? "작가가 기존 캐릭터 보강 제안으로 판단해 반영함"
              : "작가가 신규 캐릭터 후보로 판단해 반영함",
          },
          stage: "character",
        }),
      );
      markExplicitCreativeLog("character");
    },
    [characters, onEditingChange, onSelectCharacter, setConfig],
  );

  const dockExtract = useCallback(
    (content: string): DockSuggestion[] => {
      const out: DockSuggestion[] = [];
      for (const block of extractJsonBlocks(content)) {
        for (const proposal of parseCharProposals(block)) {
          const key = `char-${proposal.name.trim().toLowerCase()}`;
          if (out.some((suggestion) => suggestion.key === key)) continue;
          out.push({
            key,
            label: `캐릭터 반영: ${proposal.name}`,
            apply: () => applyCharacterProposal(proposal),
          });
          if (out.length >= 6) return out;
        }
      }
      return out;
    },
    [applyCharacterProposal],
  );

  const dockQuickExtract = useCallback(
    (source: DockSuggestionSource): DockSuggestion[] => {
      const clean = compactDockMemoText(source.content);
      if (clean.length < 18) return [];
      const hash = hashDockMemoText(clean);
      const labelSeed =
        clean
          .replace(/[.!?。！？].*$/u, "")
          .slice(0, 22)
          .trim() || "대화 메모";
      if (isItems) {
        return [
          {
            key: `item-memo-${hash}`,
            label: `아이템 메모 반영: ${labelSeed}`,
            apply: () => {
              const item: Item = {
                id: `item-memo-${hash}-${Date.now()}`,
                name: labelSeed,
                category: "misc",
                rarity: "common",
                description: clean,
                effect: "",
                obtainedFrom: "",
                status: "planned",
                ipPotential: "none",
                rightsMemo: clean,
              };
              setConfig((prev) => ({
                ...prev,
                items: [...(prev.items ?? []), item],
              }));
              fireCpLog(
                getCreativeLogger()?.logHumanEdit({
                  targetType: "metadata",
                  targetId: item.id,
                  afterContent: JSON.stringify(item),
                  note: source.live ? "item-live-memo-adopt" : "item-chat-memo-adopt",
                  stage: "character",
                }),
              );
              markExplicitCreativeLog("character");
            },
          },
        ];
      }
      if (!active) return [];
      const targetId = active.id;
      const targetName = active.name || "선택 인물";
      return [
        {
          key: `char-memo-${targetId}-${hash}`,
          label: `인물 메모 반영: ${targetName}`,
          apply: () => {
            setConfig((prev) => ({
              ...prev,
              characters: (prev.characters ?? []).map((character) => {
                if (character.id !== targetId) return character;
                const existing = character.backstory?.trim();
                const backstory = existing && !existing.includes(clean) ? `${existing}\n\n${clean}` : existing || clean;
                return { ...character, backstory };
              }),
            }));
            fireCpLog(
              getCreativeLogger()?.logHumanEdit({
                targetType: "character",
                targetId,
                afterContent: clean,
                note: source.live ? "character-live-memo-adopt" : "character-chat-memo-adopt",
                stage: "character",
              }),
            );
            markExplicitCreativeLog("character");
          },
        },
      ];
    },
    [active, isItems, setConfig],
  );

  const dockContext = useMemo(() => {
    if (isItems) {
      if (items.length === 0) return "등록된 아이템: 없음";
      const lines = items
        .slice(0, 12)
        .map((item) => `- ${item.name}${item.category ? ` (${item.category})` : ""}`);
      if (items.length > 12) lines.push(`(+${items.length - 12}개 생략)`);
      return `등록된 아이템 (${items.length}개):\n${lines.join("\n")}`;
    }
    if (characters.length === 0) return "등록된 인물: 없음";
    const lines = characters
      .slice(0, 12)
      .map((character) => `- ${character.name}${character.role ? ` (${character.role})` : ""}`);
    if (characters.length > 12) lines.push(`(+${characters.length - 12}명 생략)`);
    return `등록된 인물 (${characters.length}명):\n${lines.join("\n")}`;
  }, [characters, isItems, items]);

  return {
    dockContext,
    dockExtract,
    dockQuickExtract,
  };
}
