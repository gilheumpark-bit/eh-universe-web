import { useCallback, useState } from "react";
import type { StudioContextValue } from "@/app/studio/StudioContext";
import type { StoryConfig } from "@/lib/studio-types";
import type { MediaIpPackRightsLedgerRow } from "@/lib/creative/media-ip-pack-markdown";
import { recordCreativeEvent } from "@/lib/creative-process";
import {
  hashRightsLedgerRow,
  toRightsLedgerEntry,
  type RightsLedgerDraft,
} from "@/components/loreguard/tabs/TabExport.rights-ledger";

interface UseTabExportRightsLedgerRuntimeArgs {
  baseRightsLedgerRows: MediaIpPackRightsLedgerRow[];
  config: StoryConfig | null;
  currentProjectId: string | null | undefined;
  setConfig: StudioContextValue["setConfig"];
}

export function useTabExportRightsLedgerRuntime({
  baseRightsLedgerRows,
  config,
  currentProjectId,
  setConfig,
}: UseTabExportRightsLedgerRuntimeArgs) {
  const [editingRightsLedgerId, setEditingRightsLedgerId] = useState<string | null>(null);
  const [rightsLedgerDraft, setRightsLedgerDraft] = useState<RightsLedgerDraft | null>(null);
  const [rightsLedgerNotice, setRightsLedgerNotice] = useState("");

  const beginRightsLedgerEdit = useCallback((row: MediaIpPackRightsLedgerRow) => {
    const rowId = row.id ?? row.categoryKo;
    setEditingRightsLedgerId(rowId);
    setRightsLedgerDraft({
      id: rowId,
      categoryKo: row.categoryKo,
      ownerKo: row.ownerKo,
      usageScopeKo: row.usageScopeKo,
      exclusivityKo: row.exclusivityKo,
      termKo: row.termKo,
      regionKo: row.regionKo,
      mediaKo: row.mediaKo,
      evidenceFileKo: row.evidenceFileKo,
      statusKo: row.statusKo,
      noteKo: row.noteKo,
    });
    setRightsLedgerNotice("");
  }, []);

  const updateRightsLedgerDraft = useCallback(
    (field: keyof Omit<RightsLedgerDraft, "id">, value: string) => {
      setRightsLedgerDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    [],
  );

  const saveRightsLedgerDraft = useCallback(() => {
    if (!rightsLedgerDraft) return;
    const nextEntry = toRightsLedgerEntry(rightsLedgerDraft);
    const beforeRow =
      config?.rightsLedger?.find((row) => row.id === nextEntry.id) ??
      baseRightsLedgerRows.find((row) => row.id === nextEntry.id);

    setConfig((prev) => {
      const rest = (prev.rightsLedger ?? []).filter((row) => row.id !== nextEntry.id);
      return {
        ...prev,
        rightsLedger: [...rest, nextEntry],
      };
    });
    setEditingRightsLedgerId(null);
    setRightsLedgerDraft(null);
    setRightsLedgerNotice(`${nextEntry.categoryKo} 원장 항목을 저장했습니다.`);

    if (currentProjectId) {
      void Promise.all([hashRightsLedgerRow(beforeRow), hashRightsLedgerRow(nextEntry)])
        .then(([beforeHash, afterHash]) =>
          recordCreativeEvent({
            projectId: currentProjectId,
            targetType: "metadata",
            targetId: `rights-ledger:${nextEntry.id}`,
            eventType: "edit",
            actorType: "human",
            actorId: "author",
            originType: "HUMAN_REVISION",
            beforeHash,
            afterHash,
            stage: "publish",
            note: `권리 원장 수정: ${nextEntry.categoryKo}`,
          }),
        )
        .catch(() => {
          setRightsLedgerNotice(
            `${nextEntry.categoryKo} 원장 항목을 저장했습니다. 과정기록 저장은 다시 확인이 필요합니다.`,
          );
        });
    }
  }, [baseRightsLedgerRows, config?.rightsLedger, currentProjectId, rightsLedgerDraft, setConfig]);

  const cancelRightsLedgerEdit = useCallback(() => {
    setEditingRightsLedgerId(null);
    setRightsLedgerDraft(null);
  }, []);

  return {
    beginRightsLedgerEdit,
    cancelRightsLedgerEdit,
    editingRightsLedgerId,
    rightsLedgerDraft,
    rightsLedgerNotice,
    saveRightsLedgerDraft,
    updateRightsLedgerDraft,
  };
}
