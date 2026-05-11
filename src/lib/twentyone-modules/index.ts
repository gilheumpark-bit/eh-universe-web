// ============================================================
// twentyone-modules/index.ts
// — Public surface of the 21-Module Authoring System.
//
// Consumers (e.g. Settings → Advanced, ARCS WRITING_AGENT_REGISTRY,
// Compliance 16-hook router, Authorship Journal _4 Provenance) should import
// only from this barrel. Internal helpers stay file-scoped.
//
// Isolation §1:
//   - Single-direction import: this lib → studio-types.ts (never reverse).
//   - No imports from src/lib/save-engine / src/components/studio/ManuscriptView.
//   - No imports from origin-migration / OriginBadge / AuditExportButton.
//
// Trade-secret separation:
//   - Types & registry are AGPL-distributable.
//   - Rule pack data (M18 18-platform rules, M11 beat seeds, M13 forbidden codes)
//     loads externally at runtime via commercial-license grant only.
// ============================================================

export type {
  // Common
  ModuleId,
  InjectionStrategy,
  LockLevel,
  ModuleStatus,
  ModuleRecordBase,
  TwentyOneModuleRecord,
  ModuleRecordTypeMap,

  // M2 — Ending Lock
  EndingLock,

  // M4 — Glossary Index
  GlossaryEntry,
  GlossaryEntityType,
  SpoilerTier,
  ExtractionResult,

  // M5 — Timeline
  TimelineEvent,
  TimelineEventType,
  TimelineAxis,
  TimelineVisibility,
  TimelineGraph,

  // M6 — Info Release
  InfoReleaseRow,

  // M8 — Speech Register
  SpeechProfile,
  KoreanSpeechLevel,
  JapaneseRegister,
  JapaneseFirstPersonPronoun,
  YakuwarigoType,

  // M9 — Relations + Honorific Evolution
  RelationEdge,
  RelationEdgeType,
  IntimacyLevel,

  // M11 — Beat Bank
  Beat,
  BeatCategory,

  // M12 — Foreshadow Tracker
  ForeshadowThread,
  ForeshadowStatus,
  ForeshadowPayloadType,

  // M18 — Platform Adapter
  PlatformProfile,
  PlatformMarket,
  AgeRating,
  UploadFormat,
  MonetizationModel,
  RulePackSource,
  PlatformFitnessScore,
  ViolationSeverity,
} from './types';

export {
  REGISTRY,
  getModule,
  modulesByHostTab,
  modulesByStatus,
  modulesEnabledAt,
  allComplianceHookIds,
  allContextBlockIds,
  auditRegistry,
} from './registry';

export type {
  ModuleCoverageStatus,
  FeatureFlagTier,
  ModulePriority,
  ModuleRegistryEntry,
  RegistryAudit,
} from './registry';
