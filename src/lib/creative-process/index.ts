// ============================================================
// Creative Process — 외부 진입점 (단일 import path)
// ============================================================
//
// 사용처에서 `import { ... } from '@/lib/creative-process'` 형태로.
// 현행 창작·번역·출고 표면은 본 모듈을 통해서만 creative-process 기능에 접근.
// 구 표면명 대신 제품 역할 기준으로 경계를 둔다.
// ============================================================

// ── Types ──
export type {
  CreativeOriginType,
  CreativeEventTarget,
  CreativeEventType,
  CreativeActorType,
  CreativeDecisionAction,
  CreativeDecisionAlternative,
  CreativeDecisionDelta,
  CreativeDecisionContext,
  CreativeEvent,
  CreativeStage,
  SourceRecordType,
  SourceVisibility,
  SourceRecord,
  CertificateView,
  CertificateExternalStatus,
  CertificateSectionId,
  CertificateSummaryStats,
  ProcessCertificate,
  ManuscriptOriginEntry,
  CertificateLanguage,
} from './types';

export { ALL_CREATIVE_ORIGINS, CERTIFICATE_LABELS } from './types';

// ── Origin Adapter ──
export {
  mapEntryOriginToCreativeOrigin,
  ENTRY_ORIGIN_CASES,
  type OriginAdapterContext,
} from './origin-adapter';

// ── Limitation Text ──
export {
  LIMITATION_TEXT_4LANG,
  LIMITATION_TEXT_VERSION,
  FORBIDDEN_WORDS_4LANG,
  assertNoForbiddenWords,
  getDisclaimer,
} from './limitation-text';

// ── External Status Mapper ──
export {
  mapInternalToExternalStatus,
  ALL_INTERNAL_STATUSES,
  type InternalStatus,
} from './external-status-mapper';

// ── Event Recorder ──
export {
  recordCreativeEvent,
  listCreativeEvents,
  countCreativeEvents,
  computeEventHash,
  CREATIVE_EVENT_CAPTURED,
  type ListEventsFilter,
} from './event-recorder';

// ── Chain Verify ([s81-hash-chain]) ──
export {
  verifyCreativeChain,
  verifyEventChain,
  extractChainTipHash,
  sortEventsForChain,
  type ChainVerifyResult,
} from './chain-verify';

// ── Source Recorder ──
export {
  recordSource,
  getSource,
  listSources,
  countSources,
  computeSha256Hex,
} from './source-recorder';

// ── Report Builder ──
export {
  buildCertificate,
  MENU_LABELS,
  getCertificateLabel,
  type CertificateBuildInput,
  type SectionPayload,
  type CertificateBuildOutput,
} from './report-builder';

export {
  saveProcessCertificate,
  listProcessCertificates,
  getLatestProcessCertificate,
} from './certificate-store';

// ── HTML Renderer ──
export {
  renderCertificateHtml,
  buildCertificateFilename,
  escapeHtml,
} from './html-renderer';

// ── Markdown Renderer ──
export {
  renderCertificateMarkdown,
  escapeMarkdown,
} from './markdown-renderer';

// ── Visual Charter v1.0 (2026-05-10) ──
export {
  VISUAL_TOKENS,
  buildCSSVarsString,
  buildCertificateBaseCSS,
} from './visual-tokens';

export {
  computeHCIDetail,
  categorizeOriginSummary,
  HCI_DISCLAIMER_4LANG,
  HCI_AXIS_LABELS,
  ORIGIN_CATEGORY_LABELS,
  type HCIResult,
  type OriginSummary,
  type ExternalOriginCategory,
} from './hci-calculator';

export {
  ATTESTATION_OF_GENESIS_4LANG,
  SIGNATURE_DISCLAIMER_4LANG,
  ATTESTATION_LABELS,
  ATTESTATION_VERSION,
} from './attestation-text';

export {
  issueWitnessSeal,
  buildWitnessSealSVG,
  buildOriginDonutSVG,
} from './seal-issuer';

export {
  generateQRDataUrl,
  buildPlaceholderQRDataUrl,
  buildVerifyUrl,
} from './qr-renderer';

// ── Submission Package (`_1`) ──
export {
  buildSubmissionPackage,
  DISTRIBUTION_PROFILES,
  ARTIFACT_LABELS,
  type SubmissionPackage,
  type SubmissionPackageInput,
  type DistributionProfile,
  type DistributionProfileId,
  type ArtifactDescriptor,
  type ArtifactId,
} from './submission-package';

export {
  buildExportPackageProfilePlan,
  EXPORT_PACKAGE_PROFILES,
  listExportPackageProfiles,
  type ExportPackageAudience,
  type ExportPackagePlanStatus,
  type ExportPackageProfile,
  type ExportPackageProfileId,
  type ExportPackageProfilePlan,
  type ExportPackageProfilePlanItem,
} from './export-package-profile';

export {
  buildCopyrightRegistrationPrep,
  serializeCopyrightRegistrationPrepMarkdown,
  type CopyrightPrepCheckItem,
  type CopyrightPrepCheckStatus,
  type CopyrightRegistrationDescriptionVariant,
  type CopyrightRegistrationPrepInput,
  type CopyrightRegistrationPrepPackage,
  type CopyrightRegistrationVariantId,
} from './copyright-registration-prep';

export {
  buildCoreCopyrightPackage,
  serializeCoreCopyrightPackageMarkdown,
  type CoreCopyrightCanonMatrixRow,
  type CoreCopyrightChecklistItem,
  type CoreCopyrightDeclarationField,
  type CoreCopyrightDocument,
  type CoreCopyrightDocumentId,
  type CoreCopyrightOriginalityDeclaration,
  type CoreCopyrightPackage,
  type CoreCopyrightPackageInput,
  type CoreCopyrightReadiness,
  type CoreCopyrightStatus,
} from './core-copyright-package';

export {
  buildRightsProposalAdvisor,
  serializeRightsProposalAdvisorMarkdown,
  type RightsProposalAdvisorInput,
  type RightsProposalAdvisorResult,
  type RightsProposalAxisId,
  type RightsProposalAxisReview,
  type RightsProposalAxisStatus,
} from './rights-proposal-advisor';

export {
  buildCertificateOutputPlan,
  CERTIFICATE_OUTPUT_PROFILES,
  selectCertificateOutputProfile,
  type CertificateOutputPlan,
  type CertificateOutputProfile,
  type CertificateOutputProfileId,
  type CertificateOutputStatus,
  type CertificateQrPolicy,
} from './certificate-output-profile';

export {
  buildPublicCertificateCardPayload,
  buildPublicCertificateLookupCardPayload,
  getPublicRecordLevelKo,
  serializePublicCertificateCardForUserKo,
  type PublicCertificateCardPayload,
} from './public-certificate-card';

export {
  normalizePublicVerificationUrl,
} from './public-verification-url';

export {
  buildC2paReadyManifest,
  buildC2paPreparationNote,
  serializeC2paReadyManifest,
  type C2paReadyAction,
  type C2paReadyAssetInput,
  type C2paReadyManifest,
  type C2paReadyManifestInput,
} from './c2pa-ready-manifest';

export {
  verifyC2paReadyRoundTrip,
  type C2paReadyVerifyInput,
  type C2paReadyVerifyIssue,
  type C2paReadyVerifyIssueReason,
  type C2paReadyVerifyResult,
} from './c2pa-ready-manifest-verify';

export {
  buildCurrentStandardsAudit,
  CURRENT_MARKET_STANDARDS,
  CURRENT_MARKET_STANDARDS_CHECKED_AT,
  CURRENT_MARKET_STANDARDS_EXPIRES_AT,
  FONT_LICENSE_PROFILES,
  getCurrentMarketStandard,
  isMarketStandardStale,
  listCurrentMarketStandards,
  TRADEMARK_SEARCH_PROFILES,
  type DatedSourceReference,
  type EpisodeLengthTarget,
  type FontLicenseProfile,
  type MarketStandardId,
  type MarketStandardProfile,
  type RegionId,
  type SourceCategory,
  type StandardEvidenceLevel,
  type StandardsAuditResult,
  type TextUnit,
  type TrademarkSearchProfile,
} from './current-market-standards';

export {
  buildWorkReceiptCoverageAudit,
  type WorkReceiptCoverageAudit,
  type WorkReceiptCoverageEvidence,
  type WorkReceiptCoverageExpectations,
  type WorkReceiptCoverageInput,
  type WorkReceiptCoverageItem,
  type WorkReceiptCoverageKey,
  type WorkReceiptCoverageOverallStatus,
  type WorkReceiptCoverageStatus,
} from './work-receipt-coverage';

// ── Provenance Analyzer (`_4`) ──
export {
  analyzeProvenance,
  PROVENANCE_AXIS_LABELS,
  type ProvenanceReport,
  type ProvenanceAxisScores,
  type ProvenanceActor,
  type ProvenanceChronologyDay,
  type ProvenanceLedgerRow,
  type AnalyzeProvenanceInput,
} from './provenance-analyzer';

// ── HCI Label Migration (`Verified` → `Strong` retroactive 안내) ──
export {
  scanHCILabelMigration,
  dispatchMigrationNotice,
  markNotified as markHCILabelMigrationNotified,
  MIGRATION_NOTICE_TEXT_4LANG,
  HCI_FORBIDDEN_EN_LABELS,
  type HCILabelMigrationResult,
} from './hci-label-migration';
