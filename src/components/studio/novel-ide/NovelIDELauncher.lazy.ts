import dynamic from "next/dynamic";

export const SymbolOutlinePanel = dynamic(
  () => import("@/components/studio/symbol-ide/SymbolOutlinePanel").then((module) => module.SymbolOutlinePanel),
  { ssr: false },
);

export const LongArcReportPanel = dynamic(
  () => import("@/components/studio/long-arc/LongArcReportPanel").then((module) => module.LongArcReportPanel),
  { ssr: false },
);

export const ForeshadowLedger = dynamic(
  () => import("@/components/studio/long-arc/ForeshadowLedger").then((module) => module.ForeshadowLedger),
  { ssr: false },
);

export const DebuggerPanel = dynamic(
  () => import("@/components/studio/debugger/DebuggerPanel").then((module) => module.DebuggerPanel),
  { ssr: false },
);

export const ReaderProfilePanel = dynamic(
  () => import("@/components/studio/reader-sim/ReaderProfilePanel").then((module) => module.ReaderProfilePanel),
  { ssr: false },
);

export const SnippetPalette = dynamic(
  () => import("@/components/studio/snippets/SnippetPalette").then((module) => module.SnippetPalette),
  { ssr: false },
);

export const MultiCursorBar = dynamic(
  () => import("@/components/studio/multi-cursor/MultiCursorBar").then((module) => module.MultiCursorBar),
  { ssr: false },
);

export const SemanticDiffPanel = dynamic(
  () => import("@/components/studio/semantic-diff/SemanticDiffPanel").then((module) => module.SemanticDiffPanel),
  { ssr: false },
);

export const SymbolQuickJumpModal = dynamic(
  () => import("@/components/studio/symbol-ide/SymbolQuickJumpModal").then((module) => module.SymbolQuickJumpModal),
  { ssr: false },
);

export const ReferencesPanel = dynamic(
  () => import("@/components/studio/symbol-ide/ReferencesPanel").then((module) => module.ReferencesPanel),
  { ssr: false },
);

export const LongArcGraph = dynamic(
  () => import("@/components/studio/long-arc/LongArcGraph").then((module) => module.LongArcGraph),
  { ssr: false },
);

export const DropoutHeatmap = dynamic(
  () => import("@/components/studio/reader-sim/DropoutHeatmap").then((module) => module.DropoutHeatmap),
  { ssr: false },
);

export const NovelIDESettingsPanel = dynamic(
  () => import("@/components/studio/novel-ide/NovelIDESettingsPanel").then((module) => module.NovelIDESettingsPanel),
  { ssr: false },
);

export const CompletionGapPanel = dynamic(
  () => import("@/components/studio/completion-gap/CompletionGapPanel").then((module) => module.CompletionGapPanel),
  { ssr: false },
);

export const MetaContextPanel = dynamic(
  () => import("@/components/studio/meta-context/MetaContextPanel").then((module) => module.MetaContextPanel),
  { ssr: false },
);

export const CreativeContributionInspector = dynamic(
  () => import("@/components/studio/CreativeContributionInspector").then((module) => module.default),
  { ssr: false },
);

export const ProvenanceReport = dynamic(
  () => import("@/components/studio/ProvenanceReport").then((module) => module.default),
  { ssr: false },
);

export const SubmissionPackageBuilder = dynamic(
  () => import("@/components/studio/SubmissionPackageBuilder").then((module) => module.default),
  { ssr: false },
);
