import { readFileSync } from "fs";
import { join } from "path";

const loreguardCss = readFileSync(join(process.cwd(), "src/app/loreguard.css"), "utf8");
const authoringTabsCss = readFileSync(join(process.cwd(), "src/app/loreguard-authoring-tabs.css"), "utf8");
const submissionCss = readFileSync(join(process.cwd(), "src/app/loreguard-submission.css"), "utf8");
const writingToolsCss = readFileSync(join(process.cwd(), "src/app/loreguard-writing-tools.css"), "utf8");
const writingResponsiveCss = readFileSync(join(process.cwd(), "src/app/loreguard-writing-responsive.css"), "utf8");
const writingBridgeCss = readFileSync(join(process.cwd(), "src/app/loreguard-writing-bridge.css"), "utf8");
const plotCss = readFileSync(join(process.cwd(), "src/app/loreguard-plot.css"), "utf8");
const exportCardsCss = readFileSync(join(process.cwd(), "src/app/loreguard-export-cards.css"), "utf8");
const revisionDirectionCss = readFileSync(join(process.cwd(), "src/app/loreguard-revision-direction.css"), "utf8");
const latePanelsCss = readFileSync(join(process.cwd(), "src/app/loreguard-late-panels.css"), "utf8");
const overlaysCss = readFileSync(join(process.cwd(), "src/app/loreguard-overlays.css"), "utf8");
const ideResizablePanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/IdeResizablePanel.tsx"), "utf8");
const loreguardShellTsx = readFileSync(join(process.cwd(), "src/components/loreguard/LoreguardShell.tsx"), "utf8");
const loreguardStudioTsx = readFileSync(join(process.cwd(), "src/components/loreguard/LoreguardStudio.tsx"), "utf8");
const loreguardStudioPaletteTs = readFileSync(join(process.cwd(), "src/components/loreguard/LoreguardStudio.palette.ts"), "utf8");
const loreguardStudioSettingsOverlayTsx = readFileSync(join(process.cwd(), "src/components/loreguard/LoreguardStudioSettingsOverlay.tsx"), "utf8");
const recoveryMountsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/RecoveryMounts.tsx"), "utf8");
const ipAssetPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/IpAssetPanel.tsx"), "utf8");
const revisionPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/RevisionPanel.tsx"), "utf8");
const revisionPanelViewTsx = readFileSync(join(process.cwd(), "src/components/loreguard/RevisionPanel.view.tsx"), "utf8");
const revisionPanelAiCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/RevisionPanel.ai-card.tsx"), "utf8");
const revisionPanelSurfaceTsx = `${revisionPanelTsx}\n${revisionPanelViewTsx}\n${revisionPanelAiCardTsx}`;
const worldOpsPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/WorldOpsPanel.tsx"), "utf8");
const worldOpsPanelSimViewTsx = readFileSync(join(process.cwd(), "src/components/loreguard/WorldOpsPanel.sim-view.tsx"), "utf8");
const worldOpsPanelTimelineViewTsx = readFileSync(join(process.cwd(), "src/components/loreguard/WorldOpsPanel.timeline-view.tsx"), "utf8");
const worldOpsPanelMapViewTsx = readFileSync(join(process.cwd(), "src/components/loreguard/WorldOpsPanel.map-view.tsx"), "utf8");
const worldOpsPanelSurfaceTsx = [
  worldOpsPanelTsx,
  worldOpsPanelSimViewTsx,
  worldOpsPanelTimelineViewTsx,
  worldOpsPanelMapViewTsx,
].join("\n");
const cpJournalPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/CpJournalPanel.tsx"), "utf8");
const cpJournalPanelViewsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/CpJournalPanel.views.tsx"), "utf8");
const memoPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/MemoPanel.tsx"), "utf8");
const historyPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/HistoryPanel.tsx"), "utf8");
const visualPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/VisualPanel.tsx"), "utf8");
const translatePanelsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/TranslatePanels.tsx"), "utf8");
const projectStartBasisPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/ProjectStartBasisPanel.tsx"), "utf8");
const relationGraphTsx = readFileSync(join(process.cwd(), "src/components/loreguard/RelationGraph.tsx"), "utf8");
const creativeContributionInspectorTsx = readFileSync(join(process.cwd(), "src/components/studio/CreativeContributionInspector.tsx"), "utf8");
const provenanceReportTsx = readFileSync(join(process.cwd(), "src/components/studio/ProvenanceReport.tsx"), "utf8");
const tabWorldTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWorld.tsx"), "utf8");
const tabWorldPartsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWorld.parts.tsx"), "utf8");
const tabWorldBoardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWorld.board.tsx"), "utf8");
const tabWorldChatPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWorldChatPanel.tsx"), "utf8");
const tabWorldSurfaceTsx = [tabWorldTsx, tabWorldPartsTsx, tabWorldBoardTsx, tabWorldChatPanelTsx].join("\n");
const tabPlotTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabPlot.tsx"), "utf8");
const tabPlotCardsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabPlot.cards.tsx"), "utf8");
const tabPlotSectionsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabPlot.sections.tsx"), "utf8");
const tabCharacterTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabCharacter.tsx"), "utf8");
const tabCharacterDockTs = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabCharacter.dock.ts"), "utf8");
const tabCharacterGraphTs = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabCharacter.graph.ts"), "utf8");
const tabCharacterImportsTs = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabCharacter.imports.ts"), "utf8");
const tabCharacterSectionsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabCharacter.sections.tsx"), "utf8");
const tabCharacterProfileTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabCharacter.profile.tsx"), "utf8");
const tabRevisionTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabRevision.tsx"), "utf8");
const revisionCompressionCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/RevisionCompressionCard.tsx"), "utf8");
const tabDirectionTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabDirection.tsx"), "utf8");
const tabDirectionPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabDirection.panel.tsx"), "utf8");
const tabDirectionSectionsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabDirection.sections.tsx"), "utf8");
const tabDirectionShotEditorTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabDirectionShotEditor.tsx"), "utf8");
const tabExportTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExport.tsx"), "utf8");
const tabExportChromeTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExport.chrome.tsx"), "utf8");
const tabExportAssetSectionTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportAssetSection.tsx"), "utf8");
const tabExportReleaseOverviewCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportReleaseOverviewCard.tsx"), "utf8");
const tabExportPackageProfileCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportPackageProfileCard.tsx"), "utf8");
const tabExportEvidenceSectionTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportEvidenceSection.tsx"), "utf8");
const tabExportRightsLedgerCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportRightsLedgerCard.tsx"), "utf8");
const tabExportCertificateOutputCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportCertificateOutputCard.tsx"), "utf8");
const tabExportCopyrightRegistrationPrepCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportCopyrightRegistrationPrepCard.tsx"), "utf8");
const tabExportCoreCopyrightCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportCoreCopyrightCard.tsx"), "utf8");
const tabExportChecklistPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportChecklistPanel.tsx"), "utf8");
const tabExportRightsProposalAdvisorCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportRightsProposalAdvisorCard.tsx"), "utf8");
const tabExportAuthorIdentityCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportAuthorIdentityCard.tsx"), "utf8");
const tabExportManuscriptRailTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportManuscriptRail.tsx"), "utf8");
const tabExportPremiumRightsPackageCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabExportPremiumRightsPackageCard.tsx"), "utf8");
const submissionPackageBuilderTsx = readFileSync(join(process.cwd(), "src/components/studio/SubmissionPackageBuilder.tsx"), "utf8");
const submissionPackageBuilderSectionsTsx = readFileSync(join(process.cwd(), "src/components/studio/SubmissionPackageBuilder.sections.tsx"), "utf8");
const tabTranslateRailTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabTranslateRail.tsx"), "utf8");
const tabTranslateTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabTranslate.tsx"), "utf8");
const tabTranslateSectionsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabTranslate.sections.tsx"), "utf8");
const tabTranslateWorkbenchTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabTranslateWorkbench.tsx"), "utf8");
const tabTranslatePanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabTranslatePanel.tsx"), "utf8");
const tabWritingStatusCardsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingStatusCards.tsx"), "utf8");
const tabWritingEditorSurfaceTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingEditorSurface.tsx"), "utf8");
const tabWritingStatsStripTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingStatsStrip.tsx"), "utf8");
const tabWritingNoaComposePlanCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingNoaComposePlanCard.tsx"), "utf8");
const tabWritingRightPanelChromeTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingRightPanelChrome.tsx"), "utf8");
const tabWritingResultStripTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingResultStrip.tsx"), "utf8");
const tabWritingStyleStudioPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingStyleStudioPanel.tsx"), "utf8");
const tabWritingProductionPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingProductionPanel.tsx"), "utf8");
const tabWritingNoticeFeedTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingNoticeFeed.tsx"), "utf8");
const tabWritingNoaRequestComposerTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingNoaRequestComposer.tsx"), "utf8");
const tabWritingComplianceCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingComplianceCard.tsx"), "utf8");
const tabWritingContextRefCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingContextRefCard.tsx"), "utf8");
const tabWritingManuscriptExportCardsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingManuscriptExportCards.tsx"), "utf8");
const tabWritingManuscriptExportPanelTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingManuscriptExportPanel.tsx"), "utf8");
const tabWritingRightPanelCardsTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingRightPanelCards.tsx"), "utf8");
const tabWritingExternalCraftBridgeCardTsx = readFileSync(join(process.cwd(), "src/components/loreguard/tabs/TabWritingExternalCraftBridgeCard.tsx"), "utf8");
const findReplaceBarTsx = readFileSync(join(process.cwd(), "src/components/loreguard/FindReplaceBar.tsx"), "utf8");
const chatCanvasDockTsx = readFileSync(join(process.cwd(), "src/components/loreguard/ChatCanvasDock.tsx"), "utf8");
const chatCanvasDockViewTsx = readFileSync(join(process.cwd(), "src/components/loreguard/ChatCanvasDock.view.tsx"), "utf8");
const chatCanvasDockSurfaceTsx = `${chatCanvasDockTsx}\n${chatCanvasDockViewTsx}`;
const loreguardSheets = [
  ["loreguard.css", loreguardCss],
  ["loreguard-authoring-tabs.css", authoringTabsCss],
  ["loreguard-submission.css", submissionCss],
  ["loreguard-writing-tools.css", writingToolsCss],
  ["loreguard-writing-responsive.css", writingResponsiveCss],
  ["loreguard-writing-bridge.css", writingBridgeCss],
  ["loreguard-plot.css", plotCss],
  ["loreguard-export-cards.css", exportCardsCss],
  ["loreguard-revision-direction.css", revisionDirectionCss],
  ["loreguard-late-panels.css", latePanelsCss],
  ["loreguard-overlays.css", overlaysCss],
] as const;
const css = loreguardSheets.map(([, value]) => value).join("\n");
const lineCount = (value: string) => value.split(/\r?\n/).length;

describe("loreguard.css product contracts", () => {
  it("keeps each Loreguard stylesheet below the commercial-maintenance ceiling", () => {
    for (const [, sheet] of loreguardSheets) {
      expect(lineCount(sheet)).toBeLessThan(3000);
    }
  });

  it("does not globally block sub-1180px viewports", () => {
    expect(css).toMatch(/\.eh-app\s*\{[\s\S]*?min-width:\s*0;/);
    expect(css).not.toMatch(/\.eh-app\s*\{[\s\S]*?min-width:\s*1180px;/);
    expect(css).toMatch(/@media\s*\(max-width:\s*1179\.98px\)\s*\{[\s\S]*?\.eh-app\s*\{[^}]*min-width:\s*0;/);
  });

  it("keeps critical design tokens and minimum badge legibility intact", () => {
    expect(css).toMatch(/--accent-blue:\s*var\(--primary\);/);
    expect(css).toMatch(/--accent-green:\s*var\(--c-green\);/);
    expect(css).toMatch(/--accent-amber:\s*var\(--c-amber\);/);
    expect(css).toMatch(/--tap-min:\s*44px;/);
    expect(css).toMatch(/--z-loreguard-modal:\s*1000;/);
    expect(css).toMatch(/\.eh-new\s*\{[\s\S]*?font-size:\s*10px;/);
    expect(css).not.toMatch(/font-size:\s*8\.5px;/);
  });

  it("avoids broad transition-all animations in the Loreguard surface", () => {
    expect(css).not.toMatch(/transition:\s*all\b/);
  });

  it("does not rely on color alone for compact readiness dots", () => {
    expect(css).toMatch(/\.eh-app \.rdot\.amber\s*\{[\s\S]*?border-radius:\s*2px;[\s\S]*?transform:\s*rotate\(45deg\);/);
    expect(css).toMatch(/\.eh-app \.rdot\.blue\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?border-color:\s*var\(--c-blue\);/);
  });

  it("keeps Loreguard settings slide-over on shared class-based styling", () => {
    expect(loreguardStudioTsx).not.toMatch(/style=/);
    expect(loreguardStudioPaletteTs).not.toMatch(/style=/);
    expect(loreguardStudioSettingsOverlayTsx).not.toMatch(/style=/);
    expect(loreguardStudioTsx).toContain("buildLoreguardPaletteActions");
    expect(loreguardStudioTsx).toContain("LoreguardStudioSettingsOverlay");
    expect(loreguardStudioPaletteTs).toContain('id: "open-style-tools"');
    expect(loreguardStudioPaletteTs).toContain('id: "open-visual"');
    expect(loreguardStudioPaletteTs).toContain('id: "open-export"');
    expect(loreguardStudioSettingsOverlayTsx).toContain("lg-settings-scrim");
    expect(loreguardStudioSettingsOverlayTsx).toContain("lg-settings-action");
    expect(loreguardStudioSettingsOverlayTsx).toContain("lg-settings-close");
    expect(loreguardCss).toContain(".lg-settings-scrim");
    expect(loreguardCss).toContain(".lg-settings-action");
    expect(loreguardCss).toMatch(/\.lg-settings-shell\s*\{[\s\S]*?width:\s*min\(760px,\s*94vw\);/);
    expect(loreguardCss).toMatch(/@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.lg-settings-action\s*\{[\s\S]*?flex:\s*1 1 104px;/);
  });

  it("keeps public Loreguard chrome and recovery surfaces on shared styling", () => {
    expect(ideResizablePanelTsx).not.toMatch(/style=/);
    expect(loreguardShellTsx).not.toMatch(/style=/);
    expect(recoveryMountsTsx).not.toMatch(/style=/);
    expect(cpJournalPanelViewsTsx).not.toMatch(/style=/);
    expect(projectStartBasisPanelTsx).not.toMatch(/style=/);
    expect(tabTranslateTsx).not.toMatch(/style=/);
    expect(ideResizablePanelTsx).toContain("--lg-ide-panel-width");
    expect(ideResizablePanelTsx).toContain("bindPanelRef");
    expect(loreguardShellTsx).toContain("lg-backup-icon");
    expect(loreguardShellTsx).toContain("eh-account-avatar");
    expect(recoveryMountsTsx).toContain("lg-recovery-mounts");
    expect(recoveryMountsTsx).toContain("lg-recovery-card");
    expect(cpJournalPanelViewsTsx).toContain("cpjournal-alert-row");
    expect(cpJournalPanelViewsTsx).toContain("cpjournal-push");
    expect(projectStartBasisPanelTsx).toContain("progress");
    expect(projectStartBasisPanelTsx).toContain('className="tbar"');
    expect(tabTranslateWorkbenchTsx).toContain("tx-export-btn");
    expect(loreguardCss).toContain(".lg-backup-icon.is-success");
    expect(loreguardCss).toContain(".eh-account-avatar");
    expect(latePanelsCss).toContain("var(--lg-ide-panel-width, 48px)");
    expect(latePanelsCss).toContain(".eh-app .tx-export-btn");
    expect(latePanelsCss).toContain(".eh-app .cpjournal-alert-row");
    expect(latePanelsCss).toContain(".eh-app .cpjournal-push");
    expect(overlaysCss).toContain(".lg-recovery-mounts");
    expect(overlaysCss).toContain(".lg-recovery-card");
    expect(latePanelsCss).toContain(".eh-app progress.tbar::-webkit-progress-value");
  });

  it("keeps reading mode visually focused on the manuscript surface", () => {
    expect(css).toContain(".eh-app .wr-read-mode .wr-production-board { display: none; }");
    expect(css).toMatch(/\.eh-app \.wr-reader-page\s*\{[\s\S]*?max-width:\s*760px;/);
    expect(css).toMatch(/\.eh-app \.wr-read-p\s*\{[\s\S]*?text-wrap:\s*pretty;/);
  });

  it("keeps the IP asset panel on shared class-based styling", () => {
    expect(ipAssetPanelTsx).not.toMatch(/style=\{\{/);
    expect(ipAssetPanelTsx).toContain("ipasset-panel");
    expect(latePanelsCss).toContain(".eh-app .ipasset-panel");
    expect(latePanelsCss).toMatch(/\.eh-app \.ipasset-overlay\s*\{[\s\S]*?z-index:\s*var\(--z-loreguard-modal\);/);
  });

  it("keeps the revision panel on shared class-based styling", () => {
    expect(revisionPanelSurfaceTsx).not.toMatch(/style=\{\{/);
    expect(revisionPanelViewTsx).toContain("rvpanel-panel");
    expect(revisionPanelTsx).toContain("RevisionPanelView");
    expect(revisionPanelViewTsx).toContain("RevisionCompressionCard");
    expect(revisionPanelViewTsx).toContain("RevisionAiReportCard");
    expect(revisionPanelAiCardTsx).toContain("Noa revision report");
    expect(revisionPanelViewTsx).toContain("rvpanel-grid");
    expect(latePanelsCss).toContain(".eh-app .rvpanel-panel");
    expect(latePanelsCss).toMatch(/\.eh-app \.rvpanel-overlay\s*\{[\s\S]*?z-index:\s*var\(--z-loreguard-modal\);/);
  });

  it("keeps the world operations panel on shared class-based styling", () => {
    expect(worldOpsPanelSurfaceTsx).not.toMatch(/style=/);
    expect(worldOpsPanelTsx).toContain("wops-panel");
    expect(worldOpsPanelTsx).toContain("WorldOpsSimView");
    expect(worldOpsPanelTsx).toContain("WorldOpsTimelineView");
    expect(worldOpsPanelTsx).toContain("WorldOpsMapView");
    expect(worldOpsPanelSimViewTsx).toContain("generateWorldSim");
    expect(worldOpsPanelTimelineViewTsx).toContain("logHumanEdit");
    expect(worldOpsPanelMapViewTsx).toContain("WorldMap");
    expect(latePanelsCss).toContain(".eh-app .wops-panel");
    expect(latePanelsCss).toMatch(/\.eh-app\.wops-overlay\s*\{[\s\S]*?z-index:\s*var\(--z-loreguard-modal\);/);
  });

  it("keeps world board parts on shared class-based styling", () => {
    expect(tabWorldSurfaceTsx).not.toMatch(/style=/);
    expect(tabWorldChatPanelTsx).toContain("wd-version-card");
    expect(tabWorldChatPanelTsx).toContain("wd-prewrap");
    expect(tabWorldPartsTsx).toContain('from "./TabWorld.board"');
    expect(tabWorldBoardTsx).toContain("WorldBoardPanel");
    expect(tabWorldBoardTsx).toContain("wd-board-card");
    expect(tabWorldBoardTsx).toContain("wd-card-static");
    expect(tabWorldBoardTsx).toContain("wd-progress");
    expect(authoringTabsCss).toContain(".eh-app .wd-board-card.is-picked");
    expect(authoringTabsCss).toContain(".eh-app .wd-card-static:hover");
    expect(authoringTabsCss).toContain(".eh-app .wd-progress::-webkit-progress-value");
    expect(authoringTabsCss).toContain(".eh-app .wd-empty-suggestion");
  });

  it("keeps character board and profile on shared class-based styling", () => {
    expect(tabCharacterTsx).not.toMatch(/style=/);
    expect(tabCharacterDockTs).not.toMatch(/style=/);
    expect(tabCharacterGraphTs).not.toMatch(/style=/);
    expect(tabCharacterImportsTs).not.toMatch(/style=/);
    expect(tabCharacterSectionsTsx).not.toMatch(/style=/);
    expect(tabCharacterProfileTsx).not.toMatch(/style=/);
    expect(tabCharacterTsx).toContain("useCharacterDock");
    expect(tabCharacterTsx).toContain("useCharacterGraph");
    expect(tabCharacterTsx).toContain("useCharacterImportRouting");
    expect(tabCharacterSectionsTsx).toContain("avatarToneClass");
    expect(tabCharacterSectionsTsx).toContain("ch-empty-suggestions");
    expect(tabCharacterProfileTsx).toContain("ch-dna-progress");
    expect(tabCharacterProfileTsx).toContain("ch-form-control");
    expect(authoringTabsCss).toContain(".eh-app .ch-av-gradient");
    expect(authoringTabsCss).toContain(".eh-app .ch-form-control");
    expect(authoringTabsCss).toContain(".eh-app progress.ch-dna-progress::-webkit-progress-value");
    expect(authoringTabsCss).toMatch(/\.eh-app \.ch-rail\s*\{[\s\S]*?overflow-x:\s*hidden;/);
    expect(authoringTabsCss).toMatch(/\.eh-app \.ch-main-grid > \.ch-rail\.collapsed\s*\{[\s\S]*?flex:\s*0 0 45px;/);
    expect(authoringTabsCss).toMatch(/\.eh-app \.wd-mini-chip,[\s\S]*?box-sizing:\s*border-box;/);
    expect(loreguardCss).toMatch(/\.eh-app \.seg button\s*\{[\s\S]*?min-height:\s*var\(--tap-min\);/);
  });

  it("keeps shared relation graphs on class-based Loreguard styling", () => {
    expect(relationGraphTsx).not.toMatch(/style=/);
    expect(relationGraphTsx).toContain("lg-graph");
    expect(relationGraphTsx).toContain("lg-graph-node");
    expect(relationGraphTsx).toContain("lg-graph-edge");
    expect(relationGraphTsx).toContain("lg-graph-controls");
    expect(loreguardCss).toContain(".eh-app .lg-graph-h-440");
    expect(loreguardCss).toContain(".eh-app .lg-graph-h-520");
    expect(loreguardCss).toContain(".eh-app .react-flow__node.lg-graph-node");
    expect(loreguardCss).toContain(".eh-app .lg-graph-tone-blue");
    expect(loreguardCss).toMatch(/\.eh-app \.lg-graph \.react-flow__controls-button\s*\{[\s\S]*?width:\s*var\(--tap-min\);[\s\S]*?height:\s*var\(--tap-min\);/);
  });

  it("keeps plot board, rail, and structure cards on shared class-based styling", () => {
    expect(tabPlotTsx).not.toMatch(/style=/);
    expect(tabPlotCardsTsx).not.toMatch(/style=/);
    expect(tabPlotSectionsTsx).not.toMatch(/style=/);
    expect(tabPlotTsx).toContain("pl-center-span");
    expect(tabPlotTsx).toContain("phaseToneClass");
    expect(tabPlotTsx).toContain("timelineToneClass");
    expect(tabPlotCardsTsx).toContain("accentToneClass");
    expect(tabPlotCardsTsx).toContain("pl-structure-card");
    expect(tabPlotSectionsTsx).toContain("pl-full-btn");
    expect(plotCss).toContain(".eh-app .pl-tone-intro");
    expect(plotCss).toContain(".eh-app .pl-board-grid");
    expect(plotCss).toMatch(/\.eh-app \.pl-beat-title-input\s*\{[\s\S]*?font:\s*inherit;/);
    expect(plotCss).toMatch(/\.eh-app \.pl-tl-build\s*\{[\s\S]*?flex:\s*35 1 0;/);
  });

  it("keeps revision tab on shared class-based styling", () => {
    expect(tabRevisionTsx).not.toMatch(/style=/);
    expect(revisionCompressionCardTsx).not.toMatch(/style=/);
    expect(tabRevisionTsx).toContain("rvtab-manuscript-preview");
    expect(tabRevisionTsx).toContain("rvtab-finding-row");
    expect(tabRevisionTsx).toContain("rvtab-panel-head");
    expect(revisionCompressionCardTsx).toContain("rvcomp-verdict");
    expect(revisionCompressionCardTsx).toContain("rvcomp-list");
    expect(authoringTabsCss).toContain(".eh-app .rvtab-manuscript-preview");
    expect(authoringTabsCss).toContain(".eh-app .rvtab-finding-row");
    expect(authoringTabsCss).toContain(".eh-app .rvtab-panel-title");
    expect(revisionDirectionCss).toContain(".eh-app .rvcomp-verdict");
    expect(revisionDirectionCss).toMatch(/\.eh-app \.rvcomp-list\s*\{[\s\S]*?list-style:\s*none;/);
  });

  it("keeps authorship journal and history slide-overs on shared class-based styling", () => {
    expect(cpJournalPanelTsx).not.toMatch(/style=/);
    expect(memoPanelTsx).not.toMatch(/style=/);
    expect(historyPanelTsx).not.toMatch(/style=/);
    expect(cpJournalPanelTsx).toContain("cpjournal-panel");
    expect(cpJournalPanelTsx).toContain("cpjournal-select");
    expect(memoPanelTsx).toContain("memo-overlay");
    expect(memoPanelTsx).toContain("memo-panel");
    expect(memoPanelTsx).toContain("memo-card");
    expect(historyPanelTsx).toContain("history-panel");
    expect(historyPanelTsx).toContain("history-session-btn");
    expect(latePanelsCss).toContain(".eh-app.cpjournal-overlay");
    expect(latePanelsCss).toContain(".eh-app .cpjournal-panel");
    expect(overlaysCss).toContain(".eh-app.memo-overlay");
    expect(overlaysCss).toContain(".eh-app .memo-input");
    expect(overlaysCss).toMatch(/\.eh-app \.memo-input\s*\{[\s\S]*?min-height:\s*44px;/);
    expect(overlaysCss).toMatch(/\.eh-app \.memo-card\s*\{[\s\S]*?min-height:\s*44px;/);
    expect(overlaysCss).toContain(".eh-app.history-overlay");
    expect(overlaysCss).toContain(".eh-app .history-session-btn.is-current");
    expect(overlaysCss).toMatch(/\.eh-app \.history-panel \.mini-btn\s*\{[\s\S]*?min-height:\s*44px;/);
  });

  it("keeps the visual slide-over on shared class-based styling", () => {
    expect(visualPanelTsx).not.toMatch(/style=/);
    expect(visualPanelTsx).toContain("vpanel-overlay");
    expect(visualPanelTsx).toContain("vpanel-panel");
    expect(visualPanelTsx).toContain("vpanel-card-btn");
    expect(visualPanelTsx).toContain("vpanel-pre-skeleton");
    expect(latePanelsCss).toContain(".eh-app.vpanel-overlay");
    expect(latePanelsCss).toContain(".eh-app .vpanel-panel");
    expect(latePanelsCss).toContain(".eh-app .vpanel-card-btn.is-active");
    expect(latePanelsCss).toMatch(/\.eh-app\.vpanel-overlay\s*\{[\s\S]*?z-index:\s*var\(--z-loreguard-modal\);/);
  });

  it("keeps translation slide-over panels on shared overlay styling", () => {
    expect(translatePanelsTsx).not.toMatch(/style=/);
    expect(translatePanelsTsx).toContain("tx-panel-overlay");
    expect(translatePanelsTsx).toContain("tx-panel-shell");
    expect(overlaysCss).toMatch(/\.eh-app\.tx-panel-overlay\s*\{[\s\S]*?z-index:\s*var\(--z-loreguard-modal\);/);
    expect(overlaysCss).toMatch(/\.eh-app \.tx-panel-shell\s*\{[\s\S]*?width:\s*min\(640px,\s*94vw\);/);
  });

  it("keeps export asset and release overview sections on shared class-based styling", () => {
    expect(tabExportTsx).not.toMatch(/style=/);
    expect(tabExportChromeTsx).not.toMatch(/style=/);
    expect(tabExportAssetSectionTsx).not.toMatch(/style=/);
    expect(tabExportReleaseOverviewCardTsx).not.toMatch(/style=/);
    expect(tabExportPackageProfileCardTsx).not.toMatch(/style=/);
    expect(tabExportEvidenceSectionTsx).not.toMatch(/style=/);
    expect(tabExportChromeTsx).toContain("tex-stat-grid");
    expect(tabExportAssetSectionTsx).toContain("tex-asset-package");
    expect(tabExportReleaseOverviewCardTsx).toContain("tex-divider-grid");
    expect(tabExportPackageProfileCardTsx).toContain("tex-boundary-card");
    expect(tabExportEvidenceSectionTsx).toContain("tex-evidence-grid");
    expect(tabExportEvidenceSectionTsx).toContain("tex-receipt-pre");
    expect(authoringTabsCss).toContain(".eh-app .lg-submission-loading");
    expect(authoringTabsCss).toContain(".eh-app .tex-stat-grid");
    expect(authoringTabsCss).toContain(".eh-app .tex-asset-package");
    expect(authoringTabsCss).toContain(".eh-app .tex-profile-btn.is-active");
    expect(authoringTabsCss).toContain(".eh-app .tex-boundary-card.is-active");
    expect(authoringTabsCss).toContain(".eh-app .tex-evidence-grid");
    expect(authoringTabsCss).toContain(".eh-app .tex-receipt-pre");
    expect(authoringTabsCss).toMatch(/\.eh-app \.tex-profile-btn\s*\{[\s\S]*?min-height:\s*var\(--tap-min\);/);
  });

  it("keeps export rights and copyright cards on shared tex-* styling", () => {
    expect(tabExportRightsLedgerCardTsx).not.toMatch(/style=/);
    expect(tabExportCertificateOutputCardTsx).not.toMatch(/style=/);
    expect(tabExportCopyrightRegistrationPrepCardTsx).not.toMatch(/style=/);
    expect(tabExportCoreCopyrightCardTsx).not.toMatch(/style=/);
    expect(tabExportRightsLedgerCardTsx).toContain("tex-edit-form");
    expect(tabExportCertificateOutputCardTsx).toContain("tex-break-value");
    expect(tabExportCopyrightRegistrationPrepCardTsx).toContain("tex-card-grid");
    expect(tabExportCoreCopyrightCardTsx).toContain("tex-meta-line");
    expect(exportCardsCss).toContain(".eh-app .tex-card-grid");
    expect(exportCardsCss).toContain(".eh-app .tex-list-row.is-editing");
    expect(exportCardsCss).toMatch(/\.eh-app \.tex-value\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
    expect(exportCardsCss).toMatch(/@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.eh-app \.tex-value\s*\{[\s\S]*?text-align:\s*left;/);
  });

  it("keeps export checklist and proposal advisor on shared tex-* styling", () => {
    expect(tabExportChecklistPanelTsx).not.toMatch(/style=/);
    expect(tabExportRightsProposalAdvisorCardTsx).not.toMatch(/style=/);
    expect(tabExportAuthorIdentityCardTsx).not.toMatch(/style=/);
    expect(tabExportManuscriptRailTsx).not.toMatch(/style=/);
    expect(tabExportPremiumRightsPackageCardTsx).not.toMatch(/style=/);
    expect(tabExportChecklistPanelTsx).toContain("tex-checklist-head");
    expect(tabExportChecklistPanelTsx).toContain("tex-range-input");
    expect(tabExportRightsProposalAdvisorCardTsx).toContain("tex-advisor-textarea");
    expect(tabExportRightsProposalAdvisorCardTsx).toContain("tex-summary-value");
    expect(tabExportAuthorIdentityCardTsx).toContain("tex-copy-flex");
    expect(tabExportManuscriptRailTsx).toContain("tex-manuscript-btn");
    expect(tabExportPremiumRightsPackageCardTsx).toContain("tex-footnote-row");
    expect(exportCardsCss).toContain(".eh-app .tex-advisor-textarea");
    expect(exportCardsCss).toMatch(/\.eh-app \.tex-range-input\s*\{[\s\S]*?min-width:\s*0;/);
    expect(exportCardsCss).toMatch(/\.eh-app \.tex-summary-value\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
    expect(exportCardsCss).toContain(".eh-app .tex-manuscript-btn.is-active");
  });

  it("keeps writing editor tools and find bar on dedicated shared styling", () => {
    expect(tabWritingEditorSurfaceTsx).not.toMatch(/style=/);
    expect(tabWritingEditorSurfaceTsx).toContain("bindSurfaceRef");
    expect(tabWritingEditorSurfaceTsx).toContain("applyEditorViewVars");
    expect(tabWritingEditorSurfaceTsx).toContain("--wr-editor-font-size");
    expect(tabWritingEditorSurfaceTsx).toContain("--wr-editor-line-height");
    expect(tabWritingEditorSurfaceTsx).toContain("--wr-editor-max-width");
    expect(tabWritingEditorSurfaceTsx).toContain("--wr-editor-font-family");
    expect(tabWritingEditorSurfaceTsx).toContain("wr-manual-toolbar");
    expect(tabWritingEditorSurfaceTsx).toContain("wr-tool-btn");
    expect(findReplaceBarTsx).not.toMatch(/style=/);
    expect(findReplaceBarTsx).toContain("wr-find-row");
    expect(findReplaceBarTsx).toContain("wr-find-input");
    expect(writingToolsCss).toContain(".eh-app .wr-manual-toolbar");
    expect(writingToolsCss).toContain("max-width: var(--wr-editor-max-width, 760px)");
    expect(writingToolsCss).toContain("font-size: var(--wr-editor-font-size, var(--manuscript-text-size))");
    expect(writingToolsCss).toContain("line-height: var(--wr-editor-line-height, var(--manuscript-line-height))");
    expect(writingToolsCss).toContain("font-family: var(--wr-editor-font-family, inherit)");
    expect(writingToolsCss).toMatch(/\.eh-app \.mini-btn\.wr-tool-btn\s*\{[\s\S]*?min-height:\s*var\(--tap-min,\s*44px\);/);
    expect(writingToolsCss).toMatch(/\.eh-app \.wd-in-field\.wr-find-input\s*\{[\s\S]*?min-width:\s*0;/);
  });

  it("keeps writing support strips, style panel, and production board on shared styling", () => {
    expect(tabWritingStatsStripTsx).not.toMatch(/style=/);
    expect(tabWritingNoaComposePlanCardTsx).not.toMatch(/style=/);
    expect(tabWritingRightPanelChromeTsx).not.toMatch(/style=/);
    expect(tabWritingResultStripTsx).not.toMatch(/style=/);
    expect(tabWritingStyleStudioPanelTsx).not.toMatch(/style=/);
    expect(tabWritingProductionPanelTsx).not.toMatch(/style=/);
    expect(tabWritingNoticeFeedTsx).not.toMatch(/style=/);
    expect(tabWritingNoaRequestComposerTsx).not.toMatch(/style=/);
    expect(tabWritingStatsStripTsx).toContain("wr-stats-toggle");
    expect(tabWritingNoaComposePlanCardTsx).toContain("wr-full-cta");
    expect(tabWritingRightPanelChromeTsx).toContain("wr-action-fill");
    expect(tabWritingResultStripTsx).toContain("wr-result-expanded");
    expect(tabWritingStyleStudioPanelTsx).toContain("wr-style-panel");
    expect(tabWritingProductionPanelTsx).toContain("wr-production-progress");
    expect(tabWritingNoticeFeedTsx).toContain("wr-result-root");
    expect(tabWritingNoaRequestComposerTsx).toContain("wr-composer-shell");
    expect(writingToolsCss).toContain(".eh-app .wr-style-overlay");
    expect(writingToolsCss).toContain(".eh-app .wr-composer-shell");
    expect(writingToolsCss).toMatch(/\.eh-app \.wr-production-progress::-webkit-progress-value\s*\{[\s\S]*?var\(--grad-primary\);/);
  });

  it("keeps submission package builder and translate review sections on shared class-based styling", () => {
    expect(submissionPackageBuilderTsx).not.toMatch(/style=/);
    expect(submissionPackageBuilderSectionsTsx).not.toMatch(/style=/);
    expect(tabTranslateRailTsx).not.toMatch(/style=/);
    expect(tabTranslateSectionsTsx).not.toMatch(/style=/);
    expect(submissionPackageBuilderTsx).toContain("submission-package-builder-grid");
    expect(submissionPackageBuilderTsx).toContain("submission-package-profile-option");
    expect(submissionPackageBuilderSectionsTsx).toContain("submission-cover-preview");
    expect(submissionPackageBuilderSectionsTsx).toContain("submission-artifact-download");
    expect(tabTranslateRailTsx).toContain("trail-empty");
    expect(tabTranslatePanelTsx).toContain("tx-stat-row-top");
    expect(tabTranslateSectionsTsx).toContain("tx-empty-center");
    expect(authoringTabsCss).toContain(".eh-app .submission-package-profile-option.is-active");
    expect(authoringTabsCss).toContain(".eh-app .wd-export-grid .submission-package-primary-action:focus-visible");
    expect(submissionCss).toContain(".eh-app .submission-cover-preview");
    expect(submissionCss).toMatch(/\.eh-app \.submission-artifact-download\s*\{[\s\S]*?min-height:\s*44px;/);
    expect(latePanelsCss).toContain(".eh-app progress.tbar::-webkit-progress-value");
    expect(latePanelsCss).toContain(".eh-app .trail-empty");
    expect(latePanelsCss).toContain(".eh-app .gloss-body-button:focus-visible");
  });

  it("keeps writing status and manuscript export cards on shared class-based styling", () => {
    expect(tabWritingStatusCardsTsx).not.toMatch(/style=/);
    expect(tabWritingComplianceCardTsx).not.toMatch(/style=/);
    expect(tabWritingContextRefCardTsx).not.toMatch(/style=/);
    expect(tabWritingManuscriptExportCardsTsx).not.toMatch(/style=/);
    expect(tabWritingManuscriptExportPanelTsx).not.toMatch(/style=/);
    expect(tabWritingRightPanelCardsTsx).not.toMatch(/style=/);
    expect(tabWritingExternalCraftBridgeCardTsx).not.toMatch(/style=/);
    expect(tabWritingStatusCardsTsx).toContain("wr-q-progress");
    expect(tabWritingStatusCardsTsx).toContain("wr-inline-actions");
    expect(tabWritingComplianceCardTsx).toContain("wr-row-detail");
    expect(tabWritingContextRefCardTsx).toContain("wr-receipt-pre");
    expect(tabWritingManuscriptExportCardsTsx).toContain("wr-receipt-pre");
    expect(tabWritingManuscriptExportCardsTsx).toContain("wr-range-input");
    expect(tabWritingManuscriptExportPanelTsx).toContain("wr-export-drawer-panel");
    expect(tabWritingRightPanelCardsTsx).toContain("wr-font-select");
    expect(tabWritingRightPanelCardsTsx).toContain("wr-cta-wrap");
    expect(tabWritingExternalCraftBridgeCardTsx).toContain("craft-bridge-field");
    expect(tabWritingExternalCraftBridgeCardTsx).toContain("craft-bridge-reference-title");
    expect(authoringTabsCss).toContain(".eh-app .wr-receipt-pre");
    expect(authoringTabsCss).toContain(".eh-app .wr-export-drawer-overlay");
    expect(authoringTabsCss).toContain(".eh-app .wr-font-select");
    expect(authoringTabsCss).toContain(".eh-app .wr-q-progress.green::-webkit-progress-value");
    expect(writingBridgeCss).toMatch(/\.eh-app \.craft-bridge-control\s*\{[\s\S]*?min-height:\s*var\(--tap-min,\s*44px\);/);
    expect(writingBridgeCss).toContain(".eh-app .craft-bridge-reference-title");
  });

  it("keeps chat canvas dock on shared class-based styling", () => {
    expect(chatCanvasDockSurfaceTsx).not.toMatch(/style=/);
    expect(chatCanvasDockTsx).toContain("ChatCanvasDockView");
    expect(chatCanvasDockViewTsx).toContain("lg-chatdock-layout");
    expect(chatCanvasDockViewTsx).toContain("lg-chatdock-prefbar");
    expect(chatCanvasDockViewTsx).toContain("lg-chatdock-prefs-grid");
    expect(chatCanvasDockViewTsx).toContain("lg-chatdock-strip");
    expect(latePanelsCss).toContain(".eh-app .lg-chatdock-layout");
    expect(latePanelsCss).toContain(".eh-app .lg-chatdock-pref-select");
    expect(latePanelsCss).toMatch(/\.eh-app \.lg-chatdock-panel\s*\{[\s\S]*?max-width:\s*720px;/);
    expect(latePanelsCss).toMatch(/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.eh-app \.lg-chatdock-panel\s*\{[\s\S]*?width:\s*100%;/);
  });

  it("keeps direction sections on shared class-based styling", () => {
    expect(tabDirectionTsx).not.toMatch(/style=/);
    expect(tabDirectionPanelTsx).not.toMatch(/style=/);
    expect(tabDirectionSectionsTsx).not.toMatch(/style=/);
    expect(tabDirectionShotEditorTsx).not.toMatch(/style=/);
    expect(tabDirectionTsx).toContain("from \"./TabDirection.panel\"");
    expect(tabDirectionTsx).toContain("dr-start-grid");
    expect(tabDirectionTsx).toContain("dr-import-stack");
    expect(tabDirectionPanelTsx).toContain("LongArcReportPanel");
    expect(tabDirectionPanelTsx).toContain("SCENE_DESIGN_FIELDS");
    expect(tabDirectionSectionsTsx).toContain("dr-production-grid");
    expect(tabDirectionSectionsTsx).toContain("dr-suggestions");
    expect(tabDirectionSectionsTsx).toContain("directionGradientClass");
    expect(tabDirectionShotEditorTsx).toContain("dr-edit-control");
    expect(authoringTabsCss).toContain(".eh-app .dr-production-grid");
    expect(authoringTabsCss).toContain(".eh-app .dr-suggestions");
    expect(authoringTabsCss).toContain(".eh-app .dr-edit-control");
    expect(authoringTabsCss).toContain(".eh-app .dr-grad-0");
    expect(authoringTabsCss).toContain(".eh-app .dr-emobar-seg.green");
    expect(revisionDirectionCss).toContain(".eh-app .dr-start-empty");
    expect(revisionDirectionCss).toContain(".eh-app .dr-import-cards");
  });

  it("keeps creative-process report surfaces on shared class-based styling", () => {
    expect(creativeContributionInspectorTsx).not.toMatch(/style=/);
    expect(provenanceReportTsx).not.toMatch(/style=/);
    expect(creativeContributionInspectorTsx).toContain("cp-inspector");
    expect(provenanceReportTsx).toContain("cp-provenance");
    expect(latePanelsCss).toContain(".cp-inspector");
    expect(latePanelsCss).toContain(".cp-provenance");
    expect(latePanelsCss).toContain(".cp-meter::-webkit-progress-value");
  });
});
