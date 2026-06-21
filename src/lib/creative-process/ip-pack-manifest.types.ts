import type { RegulatoryProfileReport } from './regulatory-profile';
import type {
  ArtifactDescriptor,
  ArtifactId,
  DistributionProfileId,
  FinalCleanAuditReport,
  WorkReceiptJournalItem,
} from './submission-package.types';
import type { CertificateView, CreativeEvent, ProcessCertificate, SourceRecord } from './types';
import type { IpBibleCluster } from '@/lib/creative/ip-bible-builder';

export type IpPackArtifactDisclosure =
  | 'public-verify'
  | 'recipient-package'
  | 'private-evidence'
  | 'internal-evidence';

export interface IpPackArtifactInventoryItem {
  id: ArtifactId;
  filename: string;
  mimeType: string;
  size: number;
  role: string;
  disclosure: IpPackArtifactDisclosure;
}

export interface IpPackRiskItem {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'recorded' | 'needs-review' | 'hold';
  message: string;
}

export type IpPackRightsReviewStatus = 'recorded' | 'needs-review' | 'hold';

export interface IpPackAssetRightsSummaryItem {
  sourceCount: number;
  aiOutputCount: number;
  externalSourceCount: number;
  missingLicenseNoteCount: number;
  privateSourceCount: number;
  publisherSourceCount: number;
  publicSourceCount: number;
  reviewStatus: IpPackRightsReviewStatus;
}

export interface IpPackExternalMaterialCluster {
  id: IpBibleCluster;
  labelKo: string;
  purposeKo: string;
  filledCount: number;
  totalCount: number;
  statusKo: '대기' | '보강 필요' | '준비';
}

export interface IpPackMediaFormField {
  labelKo: string;
  filled: boolean;
  sourceKo: string;
}

export interface IpPackMediaFormGroup {
  titleKo: string;
  purposeKo: string;
  filledCount: number;
  totalCount: number;
  fields: IpPackMediaFormField[];
  statusKo: '대기' | '보강 필요' | '준비';
}

export interface IpPackMediaFormGroupInput {
  titleKo: string;
  purposeKo: string;
  filledCount: number;
  totalCount: number;
  fields: readonly IpPackMediaFormField[];
  statusKo?: IpPackMediaFormGroup['statusKo'];
}

export interface IpPackProjectLedgerScope {
  projectId: string;
  projectScoped: boolean;
  projectScopeNoteKo: string;
  packageLedgerNoteKo: string;
}

export interface IpPackManifest {
  kind: 'loreguard.ip-pack-manifest.v1';
  packageProfile: DistributionProfileId;
  certificateId: string;
  generatedAt: string;
  generatedBy: string;
  verification: {
    publicEndpoint: string | null;
    sealNumber: string | null;
    githubCommitSha: string | null;
    manifestStoreUri: string | null;
  };
  artifacts: IpPackArtifactInventoryItem[];
  publicVerifyPolicy: {
    exposedFields: string[];
    privateFields: string[];
    noManuscriptContent: true;
    noPromptText: true;
    noSourceBodyText: true;
  };
  creativeProcess: {
    view: CertificateView;
    reportVersion: string;
    manuscriptHash: string;
    timelineHash: string;
    sourceSummaryHash: string;
    chainTipHash: string | null;
    eventCount: number;
    sourceCount: number;
    limitationTextVersion: string;
  };
  humanContributionSummary: {
    humanEventCount: number;
    humanRevisionCount: number;
    manualTypingChars: number | null;
    humanControlIndex: number | null;
    humanControlStatus: string | null;
  };
  aiUsageSummary: {
    aiAssisted: boolean;
    aiEventCount: number;
    aiRequestCount: number;
    aiAcceptCount: number;
    aiUnusedCount: number;
    modelsUsed: string[];
    aiSourceCount: number;
  };
  workReceiptSummary: {
    count: number;
    approved: number;
    rejected: number;
    contentPolicy: 'counts-only-no-reasons-or-receipts';
  };
  sourceRightsSummary: {
    totalSources: number;
    aiOutputCount: number;
    externalDocumentCount: number;
    previsualAssetSourceCount: number;
    privateSourceCount: number;
    publisherSourceCount: number;
    publicSourceCount: number;
    missingLicenseNoteCount: number;
  };
  externalMaterialClusters: IpPackExternalMaterialCluster[];
  mediaFormGroups: IpPackMediaFormGroup[];
  projectLedgerScope: IpPackProjectLedgerScope;
  assetRightsSummary: {
    manuscriptText: IpPackAssetRightsSummaryItem & {
      artifactIds: Extract<ArtifactId, 'manuscript-final-md' | 'manuscript-final-clean-md'>[];
      humanEventCount: number;
      aiEventCount: number;
      externalImportEventCount: number;
    };
    previsualAssets: IpPackAssetRightsSummaryItem;
    aiOutputs: IpPackAssetRightsSummaryItem;
    externalReferenceMaterials: IpPackAssetRightsSummaryItem;
  };
  regulatorySummary: Array<{
    id: string;
    status: string;
    score: number;
    missingRequiredCount: number;
  }>;
  riskRegister: IpPackRiskItem[];
  riskSeveritySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  limitation: string;
}

export interface IpPackManifestInput {
  cert: ProcessCertificate;
  profileId: DistributionProfileId;
  view: CertificateView;
  artifacts: readonly ArtifactDescriptor[];
  sources: readonly SourceRecord[];
  events: readonly CreativeEvent[];
  regulatoryReports: readonly RegulatoryProfileReport[];
  workReceiptJournal?: readonly WorkReceiptJournalItem[];
  finalCleanAudit?: FinalCleanAuditReport;
  generatedBy?: string;
  manifestStoreUri?: string;
  externalMaterialClusters?: readonly IpPackExternalMaterialCluster[];
  mediaFormGroups?: readonly IpPackMediaFormGroupInput[];
  projectLedgerScope?: Partial<IpPackProjectLedgerScope>;
}
