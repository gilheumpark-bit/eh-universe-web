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

// Severity router (Compliance 16-hook result routing).
export {
  groupBySeverity,
  hasWarnedThisSession,
  markWarned,
  clearWarningDedup,
  batchInfo,
  infoBufferSize,
  resetInfoBatch,
  dispatchFindings,
} from './severity-router';

export type { Severity, ComplianceFinding, SeverityGroupResult } from './severity-router';

// M2 — Ending Lock.
export {
  createEndingLock,
  verifyEndingLock,
  computeEndingLockHash,
  runEndingMatchCheck,
} from './ending-lock';

export type { CreateEndingLockInput, EndingMatchCheckInput } from './ending-lock';

// M4 — Glossary Index.
export {
  createGlossaryEntry,
  findCollisions,
  approveCandidate,
  runGlossarySurfaceFormCheck,
  extractCandidates,
} from './glossary-extractor';

export type {
  CreateGlossaryEntryInput,
  Collision,
  GlossarySurfaceFormCheckInput,
} from './glossary-extractor';

// M18 — Platform Adapter (interface only — commercial license grants rule pack).
export {
  validatePlatformProfile,
  computePlatformFitness,
  runPlatformRatingCheck,
} from './platform-adapter';

export type { ValidationError, FitnessInput } from './platform-adapter';

// IDB store (v1 — 9 stores for the 21-Module Authoring System).
export {
  openTwentyOneModulesDB,
  STORE_ENDING_LOCKS,
  STORE_GLOSSARY_ENTRIES,
  STORE_TIMELINE_EVENTS,
  STORE_INFO_RELEASE_ROWS,
  STORE_SPEECH_PROFILES,
  STORE_RELATION_EDGES,
  STORE_BEATS,
  STORE_FORESHADOW_THREADS,
  STORE_PLATFORM_PROFILES,
  _resetCachedDB,
} from './idb-store';

export type { StoreName } from './idb-store';

// M2 IDB CRUD (ending-lock-store).
export {
  saveEndingLock,
  getEndingLock,
  listEndingLocksByWork,
  getActiveEndingLock,
  removeEndingLock,
} from './ending-lock-store';

// M4 IDB CRUD (glossary-store).
export {
  saveGlossaryEntry,
  getGlossaryEntry,
  listGlossaryByWork,
  listCandidates,
  listApprovedGlossary,
  removeGlossaryEntry,
} from './glossary-store';

// M18 IDB CRUD (platform-profile-store).
export {
  cachePlatformProfile,
  getPlatformProfile,
  listProfilesByMarket,
  listAllProfiles,
  removePlatformProfile,
  hasAnyPlatformProfile,
} from './platform-profile-store';
