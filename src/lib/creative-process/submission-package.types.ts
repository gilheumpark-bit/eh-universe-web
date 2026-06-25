import type {
  CertificateLanguage,
  CertificateView,
  ProcessCertificate,
} from './types';
import type {
  IpPackExternalMaterialCluster,
  IpPackMediaFormGroupInput,
  IpPackProjectLedgerScope,
} from './ip-pack-manifest.types';
import type { CoreCopyrightPackage } from './core-copyright-package';
import type { LocalePackId } from './jurisdiction-form-pack';
import type {
  LoreguardPlanId,
  ReleaseEntitlementPlan,
} from '../billing/loreguard-plans';
import type { ReceiptMetrics, WorkReceiptContext } from '../creative/work-receipt';

export type DistributionProfileId =
  | 'legal-deposit'
  | 'publisher'
  | 'platform'
  | 'private-archive';

export interface DistributionProfile {
  id: DistributionProfileId;
  defaultView: CertificateView;
  forcedView?: CertificateView;
  includesSourceBundle: boolean;
  includesDigitalSignature: boolean;
  label: { ko: string; en: string; ja: string; zh: string };
  recommendedRetentionYears: number;
}

export type ArtifactId =
  | 'manuscript-md'
  | 'manuscript-final-md'
  | 'manuscript-final-clean-md'
  | 'public-certificate-card'
  | 'process-certificate'
  | 'source-bundle'
  | 'c2pa-ready-manifest'
  | 'c2pa-preparation-note'
  | 'regulatory-readiness'
  | 'jurisdiction-form-pack'
  | 'release-credit-preview'
  | 'import-file-report'
  | 'work-receipt-journal'
  | 'final-clean-audit'
  | 'package-issuance-receipt'
  | 'core-copyright-package'
  | 'ip-pack-manifest'
  | 'digital-signature';

export interface ArtifactDescriptor {
  id: ArtifactId;
  filename: string;
  mimeType: string;
  size: number;
  content: string;
}

export interface SubmissionPackageInput {
  projectId: string;
  language: CertificateLanguage;
  profileId: DistributionProfileId;
  recipientLabel?: string;
  certificateFormat?: 'html' | 'md';
  projectMeta: { name: string; authorName?: string; createdAt?: string };
  episodes: Array<{ episode: number; content: string }>;
  worldSummary?: { genre?: string; era?: string; ruleCount?: number };
  characters?: Array<{ id: string; name: string }>;
  importFileReports?: readonly SubmissionImportFileReportItem[];
  ipPack?: {
    externalMaterialClusters?: readonly IpPackExternalMaterialCluster[];
    mediaFormGroups?: readonly IpPackMediaFormGroupInput[];
    projectLedgerScope?: Partial<IpPackProjectLedgerScope>;
    manifestStoreUri?: string;
  };
  coreCopyrightPackage?: {
    filename?: string;
    content: string;
    package?: CoreCopyrightPackage;
  };
  jurisdictionPackId?: LocalePackId | string;
  releaseCredit?: {
    planId: LoreguardPlanId;
    packageProfileId: ReleaseEntitlementPlan['packageProfileId'];
    availableCreditsOverride?: number | null;
  };
  generatedBy?: string;
}

export interface SubmissionPackage {
  id: string;
  projectId: string;
  projectName?: string;
  language: CertificateLanguage;
  profile: DistributionProfile;
  view: CertificateView;
  recipientLabel: string;
  generatedAt: string;
  artifacts: ArtifactDescriptor[];
  manuscriptHash: string;
  sealNumber?: string;
  verificationUrl?: string;
  verificationQrDataUrl?: string;
  totalSize: number;
  certificateId: string;
  regulatoryReports?: unknown[];
  finalCleanAudit?: FinalCleanAuditReport;
  packageIssuanceReceipt?: PackageIssuanceReceiptReport;
}

export interface WorkReceiptJournalItem {
  id: string;
  at: number;
  fixId: string;
  decision: 'approved' | 'rejected';
  reason: string;
  receiptText: string;
  receiptContext?: WorkReceiptContext;
  receiptMetrics?: ReceiptMetrics;
}

export interface FinalCleanAuditReport {
  kind: 'loreguard.final-clean-audit.v1';
  targetArtifactId: Extract<ArtifactId, 'manuscript-final-clean-md'>;
  verdict: 'PASS' | 'HOLD';
  generatedAt: string;
  checkedTextHash: string;
  findingCount: number;
  severityCounts: Record<'high' | 'medium' | 'low', number>;
  byType: Record<string, number>;
  findings: Array<Record<string, unknown>>;
  limitation: string;
}

export interface PackageIssuanceReceiptReport {
  kind: 'loreguard.package-issuance-receipt.v1';
  generatedAt: string;
  packageProfile: DistributionProfileId;
  view: CertificateView;
  recipientLabel: string;
  certificateId: string;
  generatedBy: string;
  artifactIds: ArtifactId[];
  finalCleanAuditVerdict?: FinalCleanAuditReport['verdict'];
  regulatoryStatusCounts?: Record<string, number>;
  jurisdictionPackId?: string;
  releaseCreditPreviewId?: string;
  holdReasons: string[];
  receiptText: string;
  limitation: string;
}

export type SubmissionImportFileReportStatus = 'success' | 'failed' | 'unsupported' | 'empty';
export type SubmissionImportFileReportReasonCode =
  | 'unsupported-format'
  | 'requires-login'
  | 'server-extraction-failed'
  | 'empty-extraction'
  | 'magic-byte-mismatch'
  | 'file-too-large'
  | 'zip-bomb-risk'
  | 'password-protected'
  | 'image-only-source'
  | 'drm-or-corrupt-epub'
  | 'missing-epub-navigation'
  | 'pdf-page-markers-normalized'
  | 'pdf-running-lines-normalized'
  | 'unknown';

export interface SubmissionImportFileReportItem {
  id: string;
  fileName: string;
  status: SubmissionImportFileReportStatus;
  detail: string;
  candidateCount: number;
  importedAt: string;
  reasonCode?: SubmissionImportFileReportReasonCode;
  reasonLabel?: string;
}

export interface ImportFileReportArtifact {
  kind: 'loreguard.import-file-report.v1';
  scope: 'source-ingest-readiness';
  generatedAt: string;
  count: number;
  statusCounts: Record<SubmissionImportFileReportStatus, number>;
  totalCandidateCount: number;
  files: SubmissionImportFileReportItem[];
  limitation: string;
}

export interface BuildPackageCertificateResult {
  cert: ProcessCertificate;
}
