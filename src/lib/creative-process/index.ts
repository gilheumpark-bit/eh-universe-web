// ============================================================
// Creative Process — 외부 진입점 (단일 import path)
// ============================================================
//
// 사용처에서 `import { ... } from '@/lib/creative-process'` 형태로.
// 5앱 본체 코드 (Studio/Translator/Network/Code/Universe) 는 본 모듈을
// 통해서만 creative-process 기능에 접근. 격리 강도 ↑.
// ============================================================

// ── Types ──
export type {
  CreativeOriginType,
  CreativeEventTarget,
  CreativeEventType,
  CreativeActorType,
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
