import { ContextRefCard } from "@/components/loreguard/tabs/TabWritingContextRefCard";
import { ExternalCraftBridgeCard } from "@/components/loreguard/tabs/TabWritingExternalCraftBridgeCard";
import { WritingContextComplianceCard } from "@/components/loreguard/tabs/TabWritingComplianceCard";
import { NoaComposePlanCard } from "@/components/loreguard/tabs/TabWritingNoaComposePlanCard";
import {
  DraftViewSettingsCard,
  ReceiptReadinessCard,
  WritingShortcutsCard,
  WritingValueCard,
  type ProductReadinessRow,
  type WritingValueAction,
} from "@/components/loreguard/tabs/TabWritingRightPanelCards";
import {
  TabWritingRightPanelActions,
  TabWritingRightPanelHeader,
} from "@/components/loreguard/tabs/TabWritingRightPanelChrome";
import {
  ContaminationGuardCard,
  SelfCheckCard,
  SynthesisLogCard,
  VersionSnapshotsCard,
  WorkQueueCard,
  type SelfCheckLabels,
  type SynthesisIssueRow,
  type SynthesisSummary,
  type VersionSnapshotRow,
  type WorkQueueStage,
} from "@/components/loreguard/tabs/TabWritingStatusCards";
import type { WritingMetrics } from "@/components/loreguard/tabs/TabWriting.derived";
import { validateNoaComposeReceipt, type NoaComposePlan } from "@/lib/loreguard/noa-compose";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, Project, StoryConfig } from "@/lib/studio-types";
import type { WritingFontMode } from "@/components/loreguard/ComposerExtras";
import type { WorkspacePrefs } from "@/lib/writing-workspace/workspace-prefs";

type SummaryTone = "green" | "amber" | "blue" | "gray";

export interface WritingPanelSummaryItem {
  label: string;
  value: string;
  tone: SummaryTone;
}

export interface TabWritingRightPanelProps {
  language: AppLanguage;
  collapsed: boolean;
  saveFlash: boolean;
  summary: readonly WritingPanelSummaryItem[];
  productReadinessRows: ProductReadinessRow[];
  writingValueActions: WritingValueAction[];
  viewPrefs: WorkspacePrefs;
  composePlan: NoaComposePlan | null;
  draftCharCount: number;
  config: StoryConfig;
  projects: Project[];
  currentProjectId: string | null;
  sessionId: string;
  editDraft: string;
  backups: VersionSnapshotRow[];
  armedRestore: number | null;
  restoring: number | null;
  canRestore: boolean;
  directorScore: number | null;
  hasDirectorReport: boolean;
  hasFindings: boolean;
  contaminationRows: Array<[string, number]>;
  selfCheckLabels: SelfCheckLabels;
  selfCheckOpen: boolean;
  writingMetrics: WritingMetrics;
  logIssues: SynthesisIssueRow[];
  logSummary: SynthesisSummary | null;
  synthesisTimeLabel: string;
  stages: WorkQueueStage[];
  stageLabel: Record<string, [string, string, string]>;
  stageStatusLabel: Record<string, string>;
  onToggle: () => void;
  onSaveDraft: () => void;
  onFocusDraft: () => void;
  onOpenExport: () => void;
  onOpenInlineRewrite: () => void;
  updateViewPrefs: (patch: Partial<WorkspacePrefs>) => void;
  setFontMode: (mode: WritingFontMode) => void;
  onApproveComposePlan: () => void;
  onCloseComposePlan: () => void;
  openCp: () => void;
  openIpAsset: () => void;
  setConfig: (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
  onRefreshBackups?: () => void;
  onArmRestore: (timestamp: number) => void;
  onCancelRestore: () => void;
  onRestore: (timestamp: number) => void;
  onDetails: () => void;
  onToggleSelfCheck: () => void;
}

export default function TabWritingRightPanel({
  language,
  collapsed,
  saveFlash,
  summary,
  productReadinessRows,
  writingValueActions,
  viewPrefs,
  composePlan,
  draftCharCount,
  config,
  projects,
  currentProjectId,
  sessionId,
  editDraft,
  backups,
  armedRestore,
  restoring,
  canRestore,
  directorScore,
  hasDirectorReport,
  hasFindings,
  contaminationRows,
  selfCheckLabels,
  selfCheckOpen,
  writingMetrics,
  logIssues,
  logSummary,
  synthesisTimeLabel,
  stages,
  stageLabel,
  stageStatusLabel,
  onToggle,
  onSaveDraft,
  onFocusDraft,
  onOpenExport,
  onOpenInlineRewrite,
  updateViewPrefs,
  setFontMode,
  onApproveComposePlan,
  onCloseComposePlan,
  openCp,
  openIpAsset,
  setConfig,
  onRefreshBackups,
  onArmRestore,
  onCancelRestore,
  onRestore,
  onDetails,
  onToggleSelfCheck,
}: TabWritingRightPanelProps) {
  return (
    <aside
      className={"wr-panel" + (collapsed ? " is-collapsed" : "")}
      aria-label={L4(language, { ko: "집필 정보·출고 준비", en: "Writing info and package" })}
    >
      <TabWritingRightPanelHeader
        language={language}
        collapsed={collapsed}
        saveFlash={saveFlash}
        onToggle={onToggle}
        onSaveDraft={onSaveDraft}
      />
      {collapsed ? (
        <div className="wr-panel-status" aria-label={summary.map((item) => `${item.label} ${item.value}`).join(", ")}>
          {summary.map((item) => (
            <span key={`${item.label}:${item.value}`} className={`wr-panel-status-chip ${item.tone}`}>
              <small>{item.label}</small>
              <b>{item.value}</b>
            </span>
          ))}
        </div>
      ) : null}

      <div className="wr-panel-body" aria-hidden={collapsed}>
        <div className="wr-advanced-summary" aria-label={L4(language, { ko: "고급 작업 요약", en: "Advanced work summary" })}>
          <span>{L4(language, { ko: "고급 작업", en: "Advanced" })}</span>
          <b>{L4(language, { ko: "작품 정보 · 과정기록 · 권리/IP · 출고", en: "Work info · Records · Rights/IP · Package" })}</b>
        </div>
        <TabWritingRightPanelActions
          language={language}
          onFocusDraft={onFocusDraft}
          onOpenExport={onOpenExport}
          onOpenInlineRewrite={onOpenInlineRewrite}
        />

        <WritingValueCard language={language} productReadinessRows={productReadinessRows} actions={writingValueActions} />

        <DraftViewSettingsCard
          language={language}
          viewPrefs={viewPrefs}
          updateViewPrefs={updateViewPrefs}
          setFontMode={setFontMode}
        />

        <WritingShortcutsCard language={language} />

        {composePlan && (
          <NoaComposePlanCard
            plan={composePlan}
            language={language}
            receiptValid={validateNoaComposeReceipt(composePlan)}
            onApprove={onApproveComposePlan}
            onClose={onCloseComposePlan}
          />
        )}

        <ReceiptReadinessCard
          language={language}
          draftCharCount={draftCharCount}
          productReadinessRows={productReadinessRows}
          openCp={openCp}
          openIpAsset={openIpAsset}
          openExport={onOpenExport}
        />

        <ExternalCraftBridgeCard
          config={config}
          language={language}
          projects={projects}
          currentProjectId={currentProjectId}
          setConfig={setConfig}
        />

        <ContextRefCard
          config={config}
          language={language}
          projectId={currentProjectId}
          sessionId={sessionId}
        />

        <WritingContextComplianceCard config={config} draft={editDraft} language={language} />

        <VersionSnapshotsCard
          language={language}
          backups={backups}
          armedRestore={armedRestore}
          restoring={restoring}
          canRestore={canRestore}
          onRefresh={onRefreshBackups}
          onArmRestore={onArmRestore}
          onCancelRestore={onCancelRestore}
          onRestore={onRestore}
        />

        <ContaminationGuardCard
          language={language}
          directorScore={directorScore}
          hasReport={hasDirectorReport}
          hasFindings={hasFindings}
          rows={contaminationRows}
          onDetails={onDetails}
        />

        <SelfCheckCard
          labels={selfCheckLabels}
          open={selfCheckOpen}
          counts={writingMetrics}
          onToggle={onToggleSelfCheck}
        />

        <SynthesisLogCard
          language={language}
          issues={logIssues}
          summary={logSummary}
          timeLabel={synthesisTimeLabel}
        />

        <WorkQueueCard
          language={language}
          stages={stages}
          stageLabel={stageLabel}
          stageStatusLabel={stageStatusLabel}
        />
      </div>
    </aside>
  );
}
