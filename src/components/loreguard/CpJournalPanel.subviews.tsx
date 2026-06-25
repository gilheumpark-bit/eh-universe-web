"use client";

import { L4 } from "@/lib/i18n";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";
import type {
  CertificateLanguage,
  CreativeEvent,
} from "@/lib/creative-process/types";
import type { CpView } from "@/components/loreguard/CpJournalPanel.helpers";
import {
  CreativeContributionInspector,
  ProvenanceReport,
  SubmissionPackageBuilder,
  SubViewBoundary,
} from "@/components/loreguard/CpJournalPanel.views";

interface CpJournalSubViewsProps {
  view: CpView;
  events: CreativeEvent[] | null;
  language: AppLanguage;
  certLang: CertificateLanguage;
  config: StoryConfig | undefined;
  currentProjectId: string | null;
  boundaryFail: (label: string) => string;
  retryLabel: string;
}

export function CpJournalSubViews({
  view,
  events,
  language,
  certLang,
  config,
  currentProjectId,
  boundaryFail,
  retryLabel,
}: CpJournalSubViewsProps) {
  if (view === "inspector") {
    return (
      <SubViewBoundary
        failMessage={boundaryFail(L4(language, { ko: "기여도", en: "contribution" }))}
        retryLabel={retryLabel}
      >
        <CreativeContributionInspector
          events={events ?? []}
          language={certLang}
          view="private"
          contextMeta={{
            sceneCount: config?.manuscripts?.length,
            activeCharacters: config?.characters?.map((character) => character.name).slice(0, 8),
          }}
          compact
        />
      </SubViewBoundary>
    );
  }

  if (view === "provenance") {
    return (
      <SubViewBoundary
        failMessage={boundaryFail(L4(language, { ko: "출처 보고서", en: "provenance report" }))}
        retryLabel={retryLabel}
      >
        <ProvenanceReport
          events={events ?? []}
          language={certLang}
          workTitle={config?.synopsis?.slice(0, 40) ?? undefined}
        />
      </SubViewBoundary>
    );
  }

  return (
    <SubViewBoundary
      failMessage={boundaryFail(L4(language, { ko: "투고 패키지", en: "submission package" }))}
      retryLabel={retryLabel}
    >
      <SubmissionPackageBuilder language={language} projectIdOverride={currentProjectId} />
    </SubViewBoundary>
  );
}
