import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
const appDir = join(process.cwd(), "src/app");
const globalsStudioCss = readFileSync(join(process.cwd(), "src/app/globals-studio.css"), "utf8");
const globalsAnimationsCss = readFileSync(join(process.cwd(), "src/app/globals-animations.css"), "utf8");
const globalsComponentsCss = readFileSync(join(process.cwd(), "src/app/globals-components.css"), "utf8");
const loreguardCss = readFileSync(join(process.cwd(), "src/app/loreguard.css"), "utf8");
const loreguardLatePanelsCss = readFileSync(join(process.cwd(), "src/app/loreguard-late-panels.css"), "utf8");
const worldSimulatorCss = readFileSync(join(process.cwd(), "src/app/world-simulator.css"), "utf8");
const homePageTsx = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
const homePagePartsTsx = readFileSync(join(process.cwd(), "src/app/home-page-parts.tsx"), "utf8");
const homePageSurfaceTsx = `${homePageTsx}\n${homePagePartsTsx}`;
const pricingPageTsx = readFileSync(join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
const pricingDataTs = readFileSync(join(process.cwd(), "src/app/pricing/pricing.data.ts"), "utf8");
const pricingSectionsTsx = readFileSync(join(process.cwd(), "src/app/pricing/pricing.sections.tsx"), "utf8");
const pricingSurfaceTsx = `${pricingPageTsx}\n${pricingDataTs}\n${pricingSectionsTsx}`;
const studioShellViewTsx = readFileSync(join(process.cwd(), "src/app/studio/StudioShell.view.tsx"), "utf8");
const studioRightPanelTsx = readFileSync(join(process.cwd(), "src/app/studio/StudioRightPanel.tsx"), "utf8");
const studioRightPanelResizerTsx = readFileSync(join(process.cwd(), "src/app/studio/StudioRightPanel.resizer.tsx"), "utf8");
const studioMainContentTsx = readFileSync(join(process.cwd(), "src/app/studio/StudioMainContent.tsx"), "utf8");
const studioMainChromeTsx = readFileSync(join(process.cwd(), "src/app/studio/StudioMainChrome.tsx"), "utf8");
const studioMainOnboardingTsx = readFileSync(join(process.cwd(), "src/app/studio/StudioMainOnboarding.tsx"), "utf8");
const studioEpisodeExplorerPaneTsx = readFileSync(join(process.cwd(), "src/app/studio/StudioEpisodeExplorerPane.tsx"), "utf8");
const studioSidebarTsx = readFileSync(join(process.cwd(), "src/components/studio/StudioSidebar.tsx"), "utf8");
const studioSidebarHeaderTsx = readFileSync(join(process.cwd(), "src/components/studio/StudioSidebar.header.tsx"), "utf8");
const studioSidebarNavigationTsx = readFileSync(join(process.cwd(), "src/components/studio/StudioSidebar.navigation.tsx"), "utf8");
const studioSidebarFooterTsx = readFileSync(join(process.cwd(), "src/components/studio/StudioSidebarFooter.tsx"), "utf8");
const studioSidebarSurfaceTsx = [
  studioSidebarTsx,
  studioSidebarHeaderTsx,
  studioSidebarNavigationTsx,
  studioSidebarFooterTsx,
].join("\n");
const studioToastsTsx = readFileSync(join(process.cwd(), "src/components/studio/StudioToasts.tsx"), "utf8");
const mobileDesktopOnlyGateTsx = readFileSync(join(process.cwd(), "src/components/studio/MobileDesktopOnlyGate.tsx"), "utf8");
const mobileStudioViewTsx = readFileSync(join(process.cwd(), "src/components/studio/MobileStudioView.tsx"), "utf8");
const mobileStudioViewModelTs = readFileSync(join(process.cwd(), "src/components/studio/MobileStudioView.model.ts"), "utf8");
const mobileStudioViewSketchPanelsTsx = readFileSync(join(process.cwd(), "src/components/studio/MobileStudioView.sketch-panels.tsx"), "utf8");
const mobileStudioViewManuscriptsTsx = readFileSync(join(process.cwd(), "src/components/studio/MobileStudioView.manuscripts.tsx"), "utf8");
const mobileDrawerTsx = readFileSync(join(process.cwd(), "src/components/studio/MobileDrawer.tsx"), "utf8");
const mobileTabBarTsx = readFileSync(join(process.cwd(), "src/components/studio/MobileTabBar.tsx"), "utf8");
const progressFillTsx = readFileSync(join(process.cwd(), "src/components/studio/ProgressFill.tsx"), "utf8");
const uxHelpersTsx = readFileSync(join(process.cwd(), "src/components/studio/UXHelpers.tsx"), "utf8");
const uxHelpersEmptyStateTsx = readFileSync(join(process.cwd(), "src/components/studio/UXHelpers.empty-state.tsx"), "utf8");
const uxHelpersFeedbackTsx = readFileSync(join(process.cwd(), "src/components/studio/UXHelpers.feedback.tsx"), "utf8");
const uxHelpersSurfaceTsx = `${uxHelpersTsx}\n${uxHelpersEmptyStateTsx}\n${uxHelpersFeedbackTsx}`;
const tierValidatorTsx = readFileSync(join(process.cwd(), "src/components/studio/TierValidator.tsx"), "utf8");
const chatMessageTsx = readFileSync(join(process.cwd(), "src/components/studio/ChatMessage.tsx"), "utf8");
const directorPanelTsx = readFileSync(join(process.cwd(), "src/components/studio/DirectorPanel.tsx"), "utf8");
const engineStatusBarTsx = readFileSync(join(process.cwd(), "src/components/studio/EngineStatusBar.tsx"), "utf8");
const studioStatusBarTsx = readFileSync(join(process.cwd(), "src/components/studio/StudioStatusBar.tsx"), "utf8");
const osDesktopTsx = readFileSync(join(process.cwd(), "src/components/studio/OSDesktop.tsx"), "utf8");
const osDesktopTopbarTsx = readFileSync(join(process.cwd(), "src/components/studio/OSDesktop.topbar.tsx"), "utf8");
const osDesktopSystemMenuTsx = readFileSync(join(process.cwd(), "src/components/studio/OSDesktop.system-menu.tsx"), "utf8");
const osDesktopStorageTs = readFileSync(join(process.cwd(), "src/components/studio/OSDesktop.storage.ts"), "utf8");
const episodeCompareTsx = readFileSync(join(process.cwd(), "src/components/studio/EpisodeCompare.tsx"), "utf8");
const episodeComparePartsTsx = readFileSync(join(process.cwd(), "src/components/studio/EpisodeCompare.parts.tsx"), "utf8");
const episodeCompareSurfaceTsx = `${episodeCompareTsx}\n${episodeComparePartsTsx}`;
const worldTimelineTsx = readFileSync(join(process.cwd(), "src/components/studio/WorldTimeline.tsx"), "utf8");
const scenePlayerTsx = readFileSync(join(process.cwd(), "src/components/studio/ScenePlayer.tsx"), "utf8");
const inlineActionPopupTsx = readFileSync(join(process.cwd(), "src/components/studio/InlineActionPopup.tsx"), "utf8");
const authorDashboardTsx = readFileSync(join(process.cwd(), "src/components/studio/AuthorDashboard.tsx"), "utf8");
const engineDashboardTsx = readFileSync(join(process.cwd(), "src/components/studio/EngineDashboard.tsx"), "utf8");
const manuscriptViewTsx = readFileSync(join(process.cwd(), "src/components/studio/ManuscriptView.tsx"), "utf8");
const chapterAnalysisSurfaceTsx = `${readFileSync(join(process.cwd(), "src/components/studio/ChapterAnalysisView.tsx"), "utf8")}\n${readFileSync(join(process.cwd(), "src/components/studio/ChapterAnalysisView.parts.tsx"), "utf8")}`;
const genreReviewChatTsx = readFileSync(join(process.cwd(), "src/components/studio/GenreReviewChat.tsx"), "utf8");
const emotionArcChartTsx = readFileSync(join(process.cwd(), "src/components/studio/EmotionArcChart.tsx"), "utf8");
const novelIdeLauncherTsx = readFileSync(join(process.cwd(), "src/components/studio/novel-ide/NovelIDELauncher.tsx"), "utf8");
const novelIdeLauncherBodyTsx = readFileSync(join(process.cwd(), "src/components/studio/novel-ide/NovelIDELauncher.body.tsx"), "utf8");
const novelIdeLauncherLazyTs = readFileSync(join(process.cwd(), "src/components/studio/novel-ide/NovelIDELauncher.lazy.ts"), "utf8");
const novelIdeLauncherModelTs = readFileSync(join(process.cwd(), "src/components/studio/novel-ide/NovelIDELauncher.model.ts"), "utf8");
const novelIdeLauncherSubmissionTsx = readFileSync(join(process.cwd(), "src/components/studio/novel-ide/NovelIDELauncher.submission.tsx"), "utf8");
const providersSectionTsx = readFileSync(join(process.cwd(), "src/components/studio/settings/ProvidersSection.tsx"), "utf8");
const fabControlsTsx = readFileSync(join(process.cwd(), "src/components/studio/tabs/writing/FabControls.tsx"), "utf8");
const modeSwitchTsx = readFileSync(join(process.cwd(), "src/components/studio/tabs/writing/ModeSwitch.tsx"), "utf8");
const appLayoutTsx = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
const loreguardStudioOverlaysTsx = readFileSync(join(process.cwd(), "src/components/loreguard/LoreguardStudioOverlays.tsx"), "utf8");
const simulationEngineTsx = readFileSync(join(process.cwd(), "src/components/world-simulator/SimulationEngine.tsx"), "utf8");
const worldSimulatorShellTsx = readFileSync(join(process.cwd(), "src/components/world-simulator/WorldSimulatorShell.tsx"), "utf8");
const worldMapViewTsx = readFileSync(join(process.cwd(), "src/components/world-simulator/MapView.tsx"), "utf8");
const languageForgeTsx = readFileSync(join(process.cwd(), "src/components/world-simulator/LanguageForge.tsx"), "utf8");
const worldToneClassesTs = readFileSync(join(process.cwd(), "src/components/world-simulator/tone-classes.ts"), "utf8");
const styleStudioViewTsx = readFileSync(join(process.cwd(), "src/components/studio/StyleStudioView.tsx"), "utf8");
const styleStudioViewDataTsx = readFileSync(join(process.cwd(), "src/components/studio/StyleStudioView.data.tsx"), "utf8");
const styleStudioViewIdentityPanelTsx = readFileSync(join(process.cwd(), "src/components/studio/StyleStudioView.IdentityPanel.tsx"), "utf8");
const styleStudioViewChecklistPanelTsx = readFileSync(join(process.cwd(), "src/components/studio/StyleStudioView.ChecklistPanel.tsx"), "utf8");
const styleStudioViewProfilePanelTsx = readFileSync(join(process.cwd(), "src/components/studio/StyleStudioView.ProfilePanel.tsx"), "utf8");
const styleStudioViewSurfaceTsx = [
  styleStudioViewTsx,
  styleStudioViewIdentityPanelTsx,
  styleStudioViewChecklistPanelTsx,
  styleStudioViewProfilePanelTsx,
].join("\n");
const resourceViewTsx = readFileSync(join(process.cwd(), "src/components/studio/ResourceView.tsx"), "utf8");
const resourceViewCharacterCardTsx = readFileSync(join(process.cwd(), "src/components/studio/ResourceView.CharacterCard.tsx"), "utf8");
const resourceViewSocialProfilePanelTsx = readFileSync(join(process.cwd(), "src/components/studio/ResourceView.SocialProfilePanel.tsx"), "utf8");
const zenOverlaysTsx = readFileSync(join(process.cwd(), "src/components/studio/ZenOverlays.tsx"), "utf8");
const zenTweaksPanelTsx = readFileSync(join(process.cwd(), "src/components/studio/ZenTweaksPanel.tsx"), "utf8");
const privacySectionTsx = readFileSync(join(process.cwd(), "src/components/studio/settings/PrivacySection.tsx"), "utf8");
const charRelationGraphTsx = readFileSync(join(process.cwd(), "src/components/studio/CharRelationGraph.tsx"), "utf8");
const charRelationGraphPartsTsx = readFileSync(join(process.cwd(), "src/components/studio/CharRelationGraph.parts.tsx"), "utf8");
const charRelationGraphInteractionsTs = readFileSync(join(process.cwd(), "src/components/studio/CharRelationGraph.interactions.ts"), "utf8");
const charRelationGraphSharedTs = readFileSync(join(process.cwd(), "src/components/studio/CharRelationGraph.shared.ts"), "utf8");
const charRelationGraphSurfaceTsx = [
  charRelationGraphTsx,
  charRelationGraphPartsTsx,
  charRelationGraphInteractionsTs,
  charRelationGraphSharedTs,
].join("\n");
const compactCharacterRelationGraphTsx = readFileSync(join(process.cwd(), "src/components/studio/CharacterRelationGraph.tsx"), "utf8");
const continuityGraphTsx = readFileSync(join(process.cwd(), "src/components/studio/ContinuityGraph.tsx"), "utf8");
const itemStudioViewTsx = readFileSync(join(process.cwd(), "src/components/studio/ItemStudioView.tsx"), "utf8");
const sceneSheetTsx = readFileSync(join(process.cwd(), "src/components/studio/SceneSheet.tsx"), "utf8");
const sceneSheetCoreSectionsTsx = readFileSync(join(process.cwd(), "src/components/studio/SceneSheet.core-sections.tsx"), "utf8");
const sceneSheetAdvancedSectionTsx = readFileSync(join(process.cwd(), "src/components/studio/SceneSheet.advanced-section.tsx"), "utf8");
const sceneSheetPartsTsx = readFileSync(join(process.cwd(), "src/components/studio/SceneSheet.parts.tsx"), "utf8");
const sceneSheetSurfaceTsx = [
  sceneSheetTsx,
  sceneSheetCoreSectionsTsx,
  sceneSheetAdvancedSectionTsx,
  sceneSheetPartsTsx,
].join("\n");
const worldGraphEditorTsx = readFileSync(join(process.cwd(), "src/components/studio/world/WorldGraphEditor.tsx"), "utf8");
const worldGraphEditorCanvasTsx = readFileSync(join(process.cwd(), "src/components/studio/world/WorldGraphEditor.canvas.tsx"), "utf8");
const worldGraphEditorModelTs = readFileSync(join(process.cwd(), "src/components/studio/world/WorldGraphEditor.model.ts"), "utf8");
const worldGraphEditorSurfaceTsx = [
  worldGraphEditorTsx,
  worldGraphEditorCanvasTsx,
  worldGraphEditorModelTs,
].join("\n");
const workProfilerViewTsx = readFileSync(join(process.cwd(), "src/components/studio/WorkProfilerView.tsx"), "utf8");
const stylePreviewTsx = readFileSync(join(process.cwd(), "src/components/studio/StylePreview.tsx"), "utf8");
const qualityGutterTsx = readFileSync(join(process.cwd(), "src/components/studio/QualityGutter.tsx"), "utf8");
const shadowDiffDashboardTsx = readFileSync(join(process.cwd(), "src/components/studio/settings/ShadowDiffDashboard.tsx"), "utf8");
const shadowDiffDashboardPartsTsx = readFileSync(join(process.cwd(), "src/components/studio/settings/ShadowDiffDashboard.parts.tsx"), "utf8");
const shadowDiffDashboardSurfaceTsx = `${shadowDiffDashboardTsx}\n${shadowDiffDashboardPartsTsx}`;
const storageObservatoryDashboardTsx = readFileSync(join(process.cwd(), "src/components/studio/settings/StorageObservatoryDashboard.tsx"), "utf8");
const dropoutHeatmapTsx = readFileSync(join(process.cwd(), "src/components/studio/reader-sim/DropoutHeatmap.tsx"), "utf8");
const readerProfilePanelTsx = readFileSync(join(process.cwd(), "src/components/studio/reader-sim/ReaderProfilePanel.tsx"), "utf8");
const resourceViewCharRelationMapTsx = readFileSync(join(process.cwd(), "src/components/studio/ResourceView.CharRelationMap.tsx"), "utf8");
const pipelineProgressTsx = readFileSync(join(process.cwd(), "src/components/studio/PipelineProgress.tsx"), "utf8");
const writingToolbarTsx = readFileSync(join(process.cwd(), "src/components/studio/WritingToolbar.tsx"), "utf8");
const rhythmAnalyzerTsx = readFileSync(join(process.cwd(), "src/components/studio/RhythmAnalyzer.tsx"), "utf8");
const sceneTimelineTsx = readFileSync(join(process.cwd(), "src/components/studio/SceneTimeline.tsx"), "utf8");
const sceneTimelinePartsTsx = readFileSync(join(process.cwd(), "src/components/studio/SceneTimeline.parts.tsx"), "utf8");
const sceneTimelineSurfaceTsx = `${sceneTimelineTsx}\n${sceneTimelinePartsTsx}`;
const advancedPlanningSectionTsx = readFileSync(join(process.cwd(), "src/components/studio/planning/AdvancedPlanningSection.tsx"), "utf8");
const translationPanelTsx = readFileSync(join(process.cwd(), "src/components/studio/TranslationPanel.tsx"), "utf8");
const translationPanelSectionsTsx = readFileSync(join(process.cwd(), "src/components/studio/TranslationPanel.sections.tsx"), "utf8");
const parallelUniversePanelTsx = readFileSync(join(process.cwd(), "src/components/studio/ParallelUniversePanel.tsx"), "utf8");
const longArcGraphTsx = readFileSync(join(process.cwd(), "src/components/studio/long-arc/LongArcGraph.tsx"), "utf8");
const onboardingGuideTsx = readFileSync(join(process.cwd(), "src/components/studio/OnboardingGuide.tsx"), "utf8");
const resourceViewCharacterCreatorPanelTsx = readFileSync(join(process.cwd(), "src/components/studio/ResourceView.CharacterCreatorPanel.tsx"), "utf8");
const endingLockSectionTsx = readFileSync(join(process.cwd(), "src/components/studio/world/EndingLockSection.tsx"), "utf8");

function collectCssFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return collectCssFiles(path);
    return entry.endsWith(".css") ? [path] : [];
  });
}

describe("app css product contracts", () => {
  it("does not use transition-all in app stylesheets", () => {
    const offenders = collectCssFiles(appDir)
      .map((path) => ({
        path: relative(process.cwd(), path).replace(/\\/g, "/"),
        css: readFileSync(path, "utf8"),
      }))
      .filter(({ css }) => /transition:\s*all\b/.test(css))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("keeps home first-impression chrome split into reusable parts", () => {
    expect(homePageTsx).toContain('from "./home-page-parts"');
    expect(homePageTsx).not.toContain("function HubGrid(");
    expect(homePageTsx).not.toContain("function useFadeIn");
    expect(homePagePartsTsx).toContain("export function HubGrid");
    expect(homePagePartsTsx).toContain("export function HomePageFallback");
    expect(homePageSurfaceTsx).not.toMatch(/style=/);
    expect(homePageSurfaceTsx).toContain("premium-link-card");
    expect(homePageSurfaceTsx).toContain("home_apps_expanded");
    expect(homePageSurfaceTsx).toContain("prefers-reduced-motion");
  });

  it("keeps pricing commercial surface split and class-based", () => {
    expect(pricingPageTsx).toContain("from \"./pricing.sections\"");
    expect(pricingPageTsx).toContain("from \"./pricing.data\"");
    expect(pricingSurfaceTsx).not.toMatch(/style=/);
    expect(pricingSectionsTsx).toContain("pricing-plan-grid");
    expect(pricingSectionsTsx).toContain("Check");
    expect(pricingSectionsTsx).not.toContain("✓");
    expect(globalsComponentsCss).toContain(".pricing-plan-grid");
  });

  it("keeps StyleStudioView layout styling in shared ss-* classes", () => {
    expect(styleStudioViewSurfaceTsx).not.toMatch(/style=/);
    expect(styleStudioViewSurfaceTsx).toContain("ss-radar-panel");
    expect(styleStudioViewSurfaceTsx).toContain("ss-preview-grid");
    expect(styleStudioViewSurfaceTsx).toContain("ss-progress-meter");
    expect(styleStudioViewSurfaceTsx).toContain("ss-empty-dna");
    expect(styleStudioViewSurfaceTsx).toContain("ss-range-");
    expect(styleStudioViewDataTsx).not.toMatch(/style=/);
    expect(styleStudioViewDataTsx).toContain("ss-radar-svg");
    expect(styleStudioViewDataTsx).toContain("ss-metrics-grid");
    expect(styleStudioViewDataTsx).not.toContain("getSliderTrackStyle");
    expect(globalsStudioCss).toContain(".ss-radar-panel");
    expect(globalsStudioCss).toContain(".ss-radar-svg");
    expect(globalsStudioCss).toContain(".ss-metrics-grid");
    expect(globalsStudioCss).toContain(".ss-metric-value");
    expect(globalsStudioCss).toContain(".ss-preview-card.styled");
    expect(globalsStudioCss).toContain(".ss-progress-meter::-webkit-progress-value");
    expect(globalsStudioCss).toContain(".ss-range-5");
    expect(globalsStudioCss).toContain("@media (max-width: 520px)");
    expect(globalsStudioCss).toContain("flex-wrap: wrap");
  });

  it("keeps studio panel chrome and onboarding ambience on class-based styling", () => {
    const studioMainSurfaceTsx = [
      studioMainContentTsx,
      studioMainChromeTsx,
      studioMainOnboardingTsx,
      studioEpisodeExplorerPaneTsx,
    ].join("\n");

    expect(studioRightPanelTsx).not.toMatch(/style=/);
    expect(studioRightPanelResizerTsx).not.toMatch(/style=/);
    expect(studioMainSurfaceTsx).not.toMatch(/style=/);
    expect(studioRightPanelTsx).toContain("StudioRightPanel.resizer");
    expect(studioRightPanelResizerTsx).toContain("lg-rpanel-grip");
    expect(studioMainOnboardingTsx).toContain("studio-onboarding-bg-image");
    expect(studioMainOnboardingTsx).toContain("studio-onboarding-noise");
    expect(loreguardLatePanelsCss).toMatch(/\.lg-rpanel-grip\s*\{[\s\S]*?left:\s*calc\(100vw - var\(--lg-rpanel-w,\s*360px\)\);/);
    expect(globalsStudioCss).toContain(".studio-onboarding-bg-image");
    expect(globalsStudioCss).toContain("-webkit-mask-image");
    expect(globalsStudioCss).toContain(".studio-onboarding-noise");
  });

  it("keeps legacy Studio chrome controls on token and CSS-variable styling", () => {
    expect(studioSidebarSurfaceTsx).not.toMatch(/style=/);
    expect(studioToastsTsx).not.toMatch(/style=/);
    expect(mobileDesktopOnlyGateTsx).not.toMatch(/style=/);
    expect(fabControlsTsx).not.toMatch(/style=/);
    expect(modeSwitchTsx).not.toMatch(/style=/);
    expect(studioSidebarTsx).toContain("StudioSidebarHeader");
    expect(studioSidebarTsx).toContain("StudioSidebarNavigation");
    expect(studioSidebarHeaderTsx).toContain("Writing Workbench");
    expect(studioSidebarNavigationTsx).toContain("studio-mode-switch");
    expect(studioSidebarNavigationTsx).toContain("studio-scale-in-x");
    expect(studioSidebarFooterTsx).toContain("--studio-storage-usage-pct");
    expect(studioToastsTsx).toContain("--toast-drain-duration");
    expect(mobileDesktopOnlyGateTsx).toContain("safe-area-top");
    expect(mobileDesktopOnlyGateTsx).toContain("safe-area-bottom");
    expect(fabControlsTsx).toContain("z-[var(--z-overlay)]");
    expect(modeSwitchTsx).toContain("z-[var(--z-dropdown)]");
    expect(globalsStudioCss).toContain(".studio-mode-switch");
    expect(globalsStudioCss).toContain(".studio-storage-usage-fill");
    expect(globalsAnimationsCss).toContain(".toast-drain-bar");
    expect(globalsAnimationsCss).toContain("animation-duration: var(--toast-drain-duration, 4000ms)");
    expect(globalsAnimationsCss).toContain(".studio-scale-in-x");
    expect(globalsAnimationsCss).toContain(".studio-scale-in-y");
  });

  it("keeps Studio progress rails and mobile tab chrome on shared CSS contracts", () => {
    const progressConsumers = [
      uxHelpersFeedbackTsx,
      tierValidatorTsx,
      chatMessageTsx,
      directorPanelTsx,
      engineStatusBarTsx,
      studioStatusBarTsx,
      providersSectionTsx,
    ];

    expect(mobileTabBarTsx).not.toMatch(/style=/);
    expect(mobileTabBarTsx).not.toContain("<style jsx");
    expect(mobileTabBarTsx).toContain("mobile-tabbar-safe-bottom");
    expect(mobileTabBarTsx).toContain("mobile-tabbar-touch-scroll");
    expect(mobileTabBarTsx).toContain("mobile-tabbar-fade-in-scale");
    expect(mobileTabBarTsx).toContain("mobile-tabbar-indicator-scale");

    expect(progressFillTsx).not.toMatch(/style=/);
    expect(progressFillTsx).toContain("--studio-progress-fill");
    for (const source of progressConsumers) {
      expect(source).not.toMatch(/style=/);
      expect(source).toContain("ProgressFill");
    }

    expect(globalsStudioCss).toContain(".studio-progress-fill");
    expect(globalsStudioCss).toContain("width: var(--studio-progress-fill, 0%)");
    expect(globalsStudioCss).toContain(".mobile-tabbar-safe-bottom");
    expect(globalsStudioCss).toContain("padding-bottom: max(0.5rem, env(safe-area-inset-bottom))");
    expect(globalsStudioCss).toContain(".mobile-tabbar-touch-scroll");
    expect(globalsAnimationsCss).toContain(".mobile-tabbar-fade-in-scale");
    expect(globalsAnimationsCss).toContain(".mobile-tabbar-indicator-scale");
  });

  it("keeps UX helper primitives split by responsibility", () => {
    expect(uxHelpersTsx).toContain("from './UXHelpers.empty-state'");
    expect(uxHelpersTsx).toContain("from './UXHelpers.feedback'");
    expect(uxHelpersSurfaceTsx).not.toMatch(/style=/);
    expect(uxHelpersEmptyStateTsx).toContain("EMPTY_STATE_CONFIGS");
    expect(uxHelpersEmptyStateTsx).toContain("Wand2");
    expect(uxHelpersFeedbackTsx).toContain("ProgressFill");
    expect(uxHelpersFeedbackTsx).toContain("CheckCircle2");
    expect(uxHelpersFeedbackTsx).not.toContain("<svg");
  });

  it("keeps mobile Studio chrome and manuscript progress on reusable classes", () => {
    expect(mobileStudioViewTsx).not.toMatch(/style=/);
    expect(mobileStudioViewSketchPanelsTsx).not.toMatch(/style=/);
    expect(mobileStudioViewManuscriptsTsx).not.toMatch(/style=/);
    expect(mobileStudioViewTsx).toContain("mobile-studio-safe-header");
    expect(mobileStudioViewTsx).toContain("mobile-studio-safe-footer");
    expect(mobileStudioViewTsx).toContain("MobileStudioView.model");
    expect(mobileStudioViewTsx).toContain("MobileStudioView.sketch-panels");
    expect(mobileStudioViewTsx).toContain("MobileStudioView.manuscripts");
    expect(mobileStudioViewModelTs).toContain("saveMobileSketchStore");
    expect(mobileStudioViewSketchPanelsTsx).toContain("WorldMemoPanel");
    expect(mobileStudioViewManuscriptsTsx).toContain("ManuscriptsPanel");
    expect(mobileDrawerTsx).not.toMatch(/style=/);
    expect(mobileDrawerTsx).toContain("mobile-drawer-backdrop");
    expect(mobileDrawerTsx).toContain("mobile-drawer-panel");
    expect(mobileDrawerTsx).toContain("studio-touch-none");
    expect(mobileDrawerTsx).toContain("studio-touch-scroll");
    expect(novelIdeLauncherTsx).not.toMatch(/style=/);
    expect(novelIdeLauncherBodyTsx).not.toMatch(/style=/);
    expect(novelIdeLauncherSubmissionTsx).not.toMatch(/style=/);
    expect(novelIdeLauncherTsx).toContain("studio-aux-fab-force-white");
    expect(novelIdeLauncherTsx).toContain("NovelIDELauncherTabBody");
    expect(novelIdeLauncherTsx).toContain("NovelIDELauncher.lazy");
    expect(novelIdeLauncherBodyTsx).toContain("CreativeContributionInspector");
    expect(novelIdeLauncherLazyTs).toContain("SubmissionPackageBuilder");
    expect(novelIdeLauncherModelTs).toContain("getLauncherTabs");
    for (const source of [manuscriptViewTsx, chapterAnalysisSurfaceTsx]) expect(source).not.toMatch(/style=/);
    expect(manuscriptViewTsx).toContain("ProgressFill");
    for (const marker of ["ChapterAnalysisView.parts", "CopyButton"]) expect(chapterAnalysisSurfaceTsx).toContain(marker);
    expect(manuscriptViewTsx).toContain("studio-touch-scroll");
    expect(authorDashboardTsx).toContain("ProgressFill");
    expect(engineDashboardTsx).toContain("ProgressFill");
    expect(osDesktopTsx).toContain("OSDesktopTopBar");
    expect(osDesktopTsx).toContain("OSDesktopSystemMenu");
    expect(osDesktopTsx).toContain("studio-dock-tile");
    expect(osDesktopTopbarTsx).toContain("latestProjectSessionId");
    expect(osDesktopSystemMenuTsx).toContain("STUDIO_MANUSCRIPT_IMPORT_ACCEPT");
    expect(osDesktopStorageTs).toContain("loadDockPosition");
    expect(osDesktopStorageTs).toContain("saveDockOrder");

    expect(globalsStudioCss).toContain(".studio-touch-scroll");
    expect(globalsStudioCss).toContain(".studio-touch-none");
    expect(globalsStudioCss).toContain(".mobile-studio-safe-header");
    expect(globalsStudioCss).toContain(".mobile-studio-safe-footer");
    expect(globalsStudioCss).toContain(".mobile-drawer-backdrop");
    expect(globalsStudioCss).toContain(".mobile-drawer-backdrop.is-visible");
    expect(globalsStudioCss).toContain(".mobile-drawer-panel");
    expect(globalsStudioCss).toContain(".studio-dock-tile");
    expect(globalsStudioCss).toContain(".studio-aux-fab-force-white");
  });

  it("keeps Studio analytic charts on CSS variables and semantic chart classes", () => {
    for (const source of [
      episodeCompareTsx,
      episodeComparePartsTsx,
      genreReviewChatTsx,
      emotionArcChartTsx,
      authorDashboardTsx,
      engineDashboardTsx,
    ]) {
      expect(source).not.toMatch(/style=/);
    }

    expect(episodeCompareSurfaceTsx).toContain("episode-metric-dot");
    expect(episodeCompareSurfaceTsx).toContain("episode-selected-card");
    expect(episodeCompareSurfaceTsx).toContain("episode-axis-label");
    expect(episodeCompareSurfaceTsx).toContain("ProgressFill");
    expect(genreReviewChatTsx).toContain("genre-benchmark-zone");
    expect(genreReviewChatTsx).toContain("genre-aspect-marker");
    expect(genreReviewChatTsx).toContain("genre-typing-dot-delay-2");
    expect(emotionArcChartTsx).toContain("emotion-legend-dash");
    expect(authorDashboardTsx).toContain("studio-bar-height");
    expect(engineDashboardTsx).toContain("studio-bar-height");

    expect(globalsStudioCss).toContain(".studio-bar-height");
    expect(globalsStudioCss).toContain(".genre-benchmark-zone");
    expect(globalsStudioCss).toContain(".genre-aspect-marker.warn");
    expect(globalsStudioCss).toContain(".genre-typing-dot-delay-2");
    expect(globalsStudioCss).toContain(".emotion-legend-dash.tension");
    expect(globalsStudioCss).toContain(".episode-metric-dot.tension");
    expect(globalsStudioCss).toContain(".episode-selected-card");
    expect(globalsStudioCss).toContain(".episode-compare-tone-text");
  });

  it("keeps Studio timeline, scene-player chrome, and inline actions on reusable classes", () => {
    expect(worldTimelineTsx).not.toMatch(/style=/);
    expect(worldTimelineTsx).toContain("studio-mono-svg");
    expect(worldTimelineTsx).toContain("world-timeline-clickable");
    expect(worldTimelineTsx).toContain("world-timeline-reorder-button");
    expect(worldTimelineTsx).toContain("studio-tone-swatch");

    expect(scenePlayerTsx).toContain("ProgressFill");
    expect(scenePlayerTsx).toContain("scene-player-wave-sm");
    expect(scenePlayerTsx).toContain("scene-player-wave-lg");
    expect(scenePlayerTsx).not.toContain("style={{ width: `${(currentGlobalBeat / totalBeats) * 100}%` }}");

    expect(inlineActionPopupTsx).toContain("inline-action-result-preview");
    expect(inlineActionPopupTsx).not.toContain("borderBottom: '1px dashed var(--color-accent-amber)'");
    expect(inlineActionPopupTsx).not.toContain("style={{ color: '#1a1410' }}");

    expect(globalsStudioCss).toContain(".studio-mono-svg");
    expect(globalsStudioCss).toContain(".studio-tone-swatch");
    expect(globalsStudioCss).toContain(".world-timeline-reorder-button");
    expect(globalsStudioCss).toContain(".scene-player-wave-sm");
    expect(globalsStudioCss).toContain(".scene-player-wave-lg");
    expect(globalsStudioCss).toContain(".inline-action-result-preview");
  });

  it("keeps Studio graph, map, progress, and analysis polish on shared styling", () => {
    for (const source of [
      charRelationGraphSurfaceTsx,
      compactCharacterRelationGraphTsx,
      continuityGraphTsx,
      itemStudioViewTsx,
      sceneSheetSurfaceTsx,
      worldGraphEditorSurfaceTsx,
      workProfilerViewTsx,
      stylePreviewTsx,
      qualityGutterTsx,
      shadowDiffDashboardSurfaceTsx,
      storageObservatoryDashboardTsx,
      dropoutHeatmapTsx,
      readerProfilePanelTsx,
      resourceViewCharRelationMapTsx,
      resourceViewCharacterCardTsx,
      resourceViewSocialProfilePanelTsx,
      pipelineProgressTsx,
      writingToolbarTsx,
      rhythmAnalyzerTsx,
      sceneTimelineSurfaceTsx,
      advancedPlanningSectionTsx,
      translationPanelTsx,
      translationPanelSectionsTsx,
      parallelUniversePanelTsx,
      longArcGraphTsx,
      onboardingGuideTsx,
      resourceViewCharacterCreatorPanelTsx,
      endingLockSectionTsx,
    ]) {
      expect(source).not.toMatch(/style=/);
    }

    expect(progressFillTsx).toContain("ariaLabel");
    expect(charRelationGraphSurfaceTsx).toContain("studio-edge-fade");
    expect(worldGraphEditorTsx).toContain("WorldGraphCanvas");
    expect(worldGraphEditorSurfaceTsx).toContain("studio-grab-node");
    expect(shadowDiffDashboardTsx).toContain("PromotionCriteriaChecklist");
    expect(shadowDiffDashboardPartsTsx).toContain("ModeBadge");
    expect(workProfilerViewTsx).toContain("studio-grid-columns-dynamic");
    expect(sceneSheetTsx).toContain("SceneSheetCoreSections");
    expect(sceneSheetTsx).toContain("SceneSheetAdvancedSection");
    expect(sceneSheetSurfaceTsx).toContain("scene-segment-cell");
    expect(sceneTimelineTsx).toContain("SceneLane");
    expect(sceneTimelinePartsTsx).toContain("ProgressFill");
    expect(sceneTimelinePartsTsx).toContain("MessageSquare");
    expect(translationPanelSectionsTsx).toContain("studio-progress-fill");
    expect(parallelUniversePanelTsx).toContain("parallel-connector-line");
    expect(onboardingGuideTsx).toContain("studio-animation-delay");
    expect(globalsStudioCss).toContain(".studio-mini-score-bar");
    expect(globalsStudioCss).toContain(".studio-tone-button-active");
    expect(globalsStudioCss).toContain(".quality-popover-scroll");
    expect(globalsStudioCss).toContain(".parallel-connector-line");
    expect(globalsStudioCss).toContain(".studio-animation-delay");
  });

  it("keeps the compact Loreguard help entry visible on 390px desktop-forced layouts", () => {
    expect(loreguardLatePanelsCss).toContain("button.eh-icbtn:nth-of-type(-n+3)");
    expect(loreguardLatePanelsCss).not.toContain("button.eh-icbtn:nth-of-type(-n+4)");
  });

  it("keeps Loreguard tool overlays separated from the studio shell without inline styling", () => {
    expect(loreguardStudioOverlaysTsx).not.toMatch(/style=/);
    expect(loreguardStudioOverlaysTsx).toContain("HelpToolsOverlay");
    expect(loreguardStudioOverlaysTsx).toContain("StyleToolsOverlay");
    expect(loreguardCss).toContain(".lg-overlay-loading");
  });

  it("keeps Zen overlays and tweaks panel on class-based portal styling", () => {
    expect(zenOverlaysTsx).not.toMatch(/style=/);
    expect(zenTweaksPanelTsx).not.toMatch(/style=/);
    expect(zenTweaksPanelTsx).toContain("zen-tweaks-panel");
    expect(zenOverlaysTsx).toContain("zen-toast");
    expect(globalsStudioCss).toContain("body > .zen-tweaks-panel");
    expect(globalsStudioCss).toContain("body > .zen-toast.is-visible");
    expect(globalsStudioCss).toContain("body > .zen-corner.is-active");
  });

  it("keeps Privacy DSAR actions on token-based class styling", () => {
    expect(privacySectionTsx).not.toMatch(/style=/);
    expect(privacySectionTsx).toContain("privacy-action-card");
    expect(privacySectionTsx).toContain("privacy-confirm-backdrop");
    expect(privacySectionTsx).toContain("privacy-confirm-button danger");
    expect(globalsStudioCss).toContain(".privacy-section-body");
    expect(globalsStudioCss).toMatch(/\.privacy-action-button\s*\{[\s\S]*?min-height:\s*44px;/);
    expect(globalsStudioCss).toMatch(/\.privacy-confirm-button\s*\{[\s\S]*?min-height:\s*44px;/);
    expect(globalsStudioCss).toMatch(/@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.privacy-confirm-button\s*\{[\s\S]*?width:\s*100%;/);
  });

  it("keeps ResourceView character cards on class-based styling", () => {
    expect(resourceViewTsx).not.toMatch(/style=/);
    expect(resourceViewCharacterCardTsx).not.toMatch(/style=/);
    expect(resourceViewSocialProfilePanelTsx).not.toMatch(/style=/);
    expect(resourceViewCharacterCardTsx).toContain("resource-dna-progress");
    expect(resourceViewCharacterCardTsx).toContain("resource-role-select");
    expect(resourceViewSocialProfilePanelTsx).toContain("resource-social-panel");
    expect(resourceViewTsx).toContain("expandedSocialPanels");
    expect(globalsStudioCss).toContain(".resource-dna-progress");
    expect(globalsStudioCss).toContain(".resource-role-select");
    expect(globalsStudioCss).toContain(".resource-social-panel[hidden]");
  });

  it("keeps the world simulator color system on reusable ws-* tone classes", () => {
    expect(simulationEngineTsx).not.toMatch(/style=/);
    expect(worldSimulatorShellTsx).not.toMatch(/style=/);
    expect(worldMapViewTsx).not.toMatch(/style=/);
    expect(languageForgeTsx).not.toMatch(/style=/);
    expect(simulationEngineTsx).toContain("ws-genre-card");
    expect(simulationEngineTsx).toContain("ws-civ-card");
    expect(simulationEngineTsx).toContain("ws-svg-line");
    expect(worldSimulatorShellTsx).toContain("colorToneClass");
    expect(worldSimulatorShellTsx).toContain("genreToneClass");
    expect(worldMapViewTsx).toContain("colorToneClass");
    expect(languageForgeTsx).toContain("signalToneClass");
    expect(worldToneClassesTs).toContain("export function colorToneClass");
    expect(worldToneClassesTs).toContain("export function signalToneClass");
    expect(appLayoutTsx).toContain('import "./world-simulator.css";');
    expect(worldSimulatorCss).toContain(".ws-tone-fantasy");
    expect(worldSimulatorCss).toContain(".ws-tone-green-bright");
    expect(worldSimulatorCss).toContain(".ws-tone-sky");
    expect(worldSimulatorCss).toContain(".ws-bg-soft-tone");
    expect(worldSimulatorCss).toContain(".ws-border-tone");
    expect(worldSimulatorCss).toContain(".ws-phoneme-chip");
    expect(worldSimulatorCss).toMatch(/\.ws-genre-card\.is-selected\s*\{[\s\S]*?border-color:\s*var\(--ws-tone\);/);
    expect(worldSimulatorCss).toMatch(/\.ws-civ-card\s*\{[\s\S]*?border-left-width:\s*3px;/);
    expect(worldSimulatorCss).toContain(".ws-svg-node-halo");
  });

  it("keeps Zen chrome mounted in both classic StudioShell and Loreguard child shell", () => {
    expect(studioShellViewTsx).toContain("const zenChrome = (");
    expect((studioShellViewTsx.match(/\{zenChrome\}/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(studioShellViewTsx).toMatch(/if \(children\)[\s\S]*\{children\}[\s\S]*\{zenChrome\}/);
  });
});
