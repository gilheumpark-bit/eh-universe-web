import { useEffect, useMemo, useState } from "react";
import type { EpisodeManuscript, StoryConfig } from "@/lib/studio-types";
import { canShare } from "@/lib/browser/web-share";
import { loadJournal } from "@/lib/creative/work-receipt-journal";
import {
  buildWorkReceiptCoverageAudit,
  getLatestProcessCertificate,
  listCreativeEvents,
  listSources,
  type CreativeEvent,
  type ProcessCertificate,
  type SourceRecord,
} from "@/lib/creative-process";

interface UseTabExportProcessEvidenceArgs {
  config: StoryConfig | null;
  currentProjectId: string | null | undefined;
  manuscripts: EpisodeManuscript[];
  receipt: string;
}

export function useTabExportProcessEvidence({
  config,
  currentProjectId,
  manuscripts,
  receipt,
}: UseTabExportProcessEvidenceArgs) {
  const [shareSupported] = useState(() => canShare());
  const [processEvents, setProcessEvents] = useState<CreativeEvent[]>([]);
  const [sourceRecords, setSourceRecords] = useState<SourceRecord[]>([]);
  const [latestCertificate, setLatestCertificate] = useState<ProcessCertificate | null>(null);
  const receiptJournal = useMemo(() => loadJournal(), []);

  useEffect(() => {
    let alive = true;
    const loadCoverage = async () => {
      if (!currentProjectId) return;
      try {
        const [events, sources, certificate] = await Promise.all([
          listCreativeEvents({ projectId: currentProjectId, limit: 500 }),
          listSources(currentProjectId),
          getLatestProcessCertificate(currentProjectId),
        ]);
        if (!alive) return;
        setProcessEvents(events);
        setSourceRecords(sources);
        setLatestCertificate(certificate);
      } catch {
        if (!alive) return;
        setProcessEvents([]);
        setSourceRecords([]);
        setLatestCertificate(null);
      }
    };
    void loadCoverage();
    return () => {
      alive = false;
    };
  }, [currentProjectId]);

  const scopedLatestCertificate = currentProjectId ? latestCertificate : null;
  const scopedProcessEvents = useMemo(
    () => (currentProjectId ? processEvents : []),
    [currentProjectId, processEvents],
  );
  const scopedSourceRecords = useMemo(
    () => (currentProjectId ? sourceRecords : []),
    [currentProjectId, sourceRecords],
  );

  const workReceiptCoverage = useMemo(
    () =>
      buildWorkReceiptCoverageAudit({
        events: scopedProcessEvents,
        sources: scopedSourceRecords,
        decisions: receiptJournal,
        localReceipts: receipt ? [receipt] : [],
        expectations: {
          externalImport: (config?.importFileReports?.length ?? 0) > 0 || scopedSourceRecords.length > 0,
          authorDecision: receiptJournal.some((entry) => entry.fixId.startsWith("candidate:")),
          manualRevision: manuscripts.length > 0,
          translationSignoff: (config?.translatedManuscripts ?? []).some(
            (entry) => entry.faithfulApproved || entry.marketApproved,
          ),
          packageIssuance: true,
        },
      }),
    [
      config?.importFileReports,
      config?.translatedManuscripts,
      manuscripts.length,
      receipt,
      receiptJournal,
      scopedProcessEvents,
      scopedSourceRecords,
    ],
  );

  return {
    receiptJournal,
    scopedLatestCertificate,
    scopedProcessEvents,
    scopedSourceRecords,
    shareSupported,
    workReceiptCoverage,
  };
}
