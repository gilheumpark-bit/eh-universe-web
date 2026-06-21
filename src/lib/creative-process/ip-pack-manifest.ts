// ============================================================
// IP Pack Manifest — 제출 패키지 공개/비공개 경계 매니페스트
// ============================================================
//
// 역할:
//   - 원고·출처 원문을 공개하지 않고, 제출 패키지의 구성과 검증 경계를 설명한다.
//   - Verify 화면에서 노출 가능한 필드와 비공개로 남겨야 할 필드를 분리한다.
//   - 권리/IP 판단이 아니라 과정기록·출고자료 준비 상태를 정리한다.
// ============================================================

import type {
  ArtifactDescriptor,
  ArtifactId,
  WorkReceiptJournalItem,
} from './submission-package';
import type { CreativeEvent, ProcessCertificate, SourceRecord } from './types';
import type {
  IpPackArtifactDisclosure,
  IpPackArtifactInventoryItem,
  IpPackAssetRightsSummaryItem,
  IpPackExternalMaterialCluster,
  IpPackManifest,
  IpPackManifestInput,
  IpPackMediaFormField,
  IpPackMediaFormGroup,
  IpPackMediaFormGroupInput,
  IpPackProjectLedgerScope,
  IpPackRightsReviewStatus,
  IpPackRiskItem,
} from './ip-pack-manifest.types';
import {
  artifactRoleLabel,
  assetRightsGroupLabel,
  manifestDisclosureLabel,
  reviewStatusLabel,
  severityLabel,
} from '@/lib/loreguard/output-localization';
import {
  IP_BIBLE_SECTION_KEYS,
  IP_BIBLE_SECTION_META,
  type IpBibleCluster,
} from '@/lib/creative/ip-bible-builder';
import { normalizePublicVerificationUrl } from './public-verification-url';

export type {
  IpPackArtifactDisclosure,
  IpPackArtifactInventoryItem,
  IpPackAssetRightsSummaryItem,
  IpPackExternalMaterialCluster,
  IpPackManifest,
  IpPackManifestInput,
  IpPackMediaFormField,
  IpPackMediaFormGroup,
  IpPackMediaFormGroupInput,
  IpPackProjectLedgerScope,
  IpPackRightsReviewStatus,
  IpPackRiskItem,
} from './ip-pack-manifest.types';

// ============================================================
// PART 2 — Artifact inventory
// ============================================================

const ARTIFACT_ROLES: Record<ArtifactId, string> = {
  'manuscript-md': 'legacy-manuscript-copy',
  'manuscript-final-md': 'working-final-with-process-reference',
  'manuscript-final-clean-md': 'submission-clean-copy',
  'final-clean-audit': 'submission-clean-mechanical-audit',
  'public-certificate-card': 'public-process-record-card',
  'process-certificate': 'creative-process-record',
  'source-bundle': 'source-metadata-evidence',
  'c2pa-ready-manifest': 'provenance-assertion-payload',
  'c2pa-preparation-note': 'provenance-preparation-note',
  'regulatory-readiness': 'submission-readiness-review',
  'jurisdiction-form-pack': 'localized-release-form-checklist',
  'release-credit-preview': 'release-credit-ledger-preview',
  'import-file-report': 'source-ingest-status-report',
  'work-receipt-journal': 'internal-review-receipts',
  'package-issuance-receipt': 'export-package-generation-receipt',
  'core-copyright-package': 'core-copyright-registration-prep',
  'ip-pack-manifest': 'package-disclosure-policy',
  'digital-signature': 'hash-manifest',
};

function disclosureForArtifact(id: ArtifactId): IpPackArtifactDisclosure {
  switch (id) {
    case 'public-certificate-card':
      return 'public-verify';
    case 'digital-signature':
    case 'process-certificate':
    case 'c2pa-ready-manifest':
    case 'c2pa-preparation-note':
    case 'regulatory-readiness':
    case 'jurisdiction-form-pack':
    case 'release-credit-preview':
    case 'import-file-report':
    case 'ip-pack-manifest':
    case 'final-clean-audit':
    case 'package-issuance-receipt':
      return 'recipient-package';
    case 'manuscript-final-clean-md':
      return 'recipient-package';
    case 'source-bundle':
    case 'manuscript-final-md':
      return 'private-evidence';
    case 'work-receipt-journal':
    case 'manuscript-md':
      return 'internal-evidence';
    default:
      return 'private-evidence';
  }
}

function buildArtifactInventory(
  artifacts: readonly ArtifactDescriptor[],
): IpPackArtifactInventoryItem[] {
  return artifacts.map((artifact) => ({
    id: artifact.id,
    filename: artifact.filename,
    mimeType: artifact.mimeType,
    size: artifact.size,
    role: ARTIFACT_ROLES[artifact.id],
    disclosure: disclosureForArtifact(artifact.id),
  }));
}

// ============================================================
// PART 3 — Summaries
// ============================================================

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

function collectModels(
  cert: ProcessCertificate,
  sources: readonly SourceRecord[],
  events: readonly CreativeEvent[],
): string[] {
  return uniqueSorted([
    ...(cert.summaryStats.aiModelsUsed ?? []),
    ...sources
      .filter((source) => source.sourceType === 'ai_output')
      .map((source) => [source.provider, source.model].filter(Boolean).join('/')),
    ...events
      .filter((event) => event.actorType === 'ai')
      .map((event) => event.actorId),
  ]);
}

function summarizeWorkReceipts(
  entries: readonly WorkReceiptJournalItem[] | undefined,
): IpPackManifest['workReceiptSummary'] {
  const safeEntries = Array.isArray(entries) ? entries : [];
  return {
    count: safeEntries.length,
    approved: safeEntries.filter((entry) => entry.decision === 'approved').length,
    rejected: safeEntries.filter((entry) => entry.decision === 'rejected').length,
    contentPolicy: 'counts-only-no-reasons-or-receipts',
  };
}

function summarizeSources(sources: readonly SourceRecord[]): IpPackManifest['sourceRightsSummary'] {
  return {
    totalSources: sources.length,
    aiOutputCount: sources.filter((source) => source.sourceType === 'ai_output').length,
    externalDocumentCount: sources.filter((source) => source.sourceType === 'external_doc').length,
    previsualAssetSourceCount: sources.filter((source) => source.sourceType === 'image_caption').length,
    privateSourceCount: sources.filter((source) => source.visibility === 'private').length,
    publisherSourceCount: sources.filter((source) => source.visibility === 'publisher').length,
    publicSourceCount: sources.filter((source) => source.visibility === 'public').length,
    missingLicenseNoteCount: sources.filter((source) => !source.licenseNote?.trim()).length,
  };
}

const EXTERNAL_MATERIAL_CLUSTER_ORDER: readonly IpBibleCluster[] = Object.freeze([
  'entry',
  'story',
  'setting',
  'business',
]);

const EXTERNAL_MATERIAL_CLUSTER_LABEL_KO: Record<IpBibleCluster, string> = {
  entry: '진입 자료',
  story: '스토리 자료',
  setting: '설정 자료',
  business: '제작·사업 자료',
};

const EXTERNAL_MATERIAL_CLUSTER_PURPOSE_KO: Record<IpBibleCluster, string> = {
  entry: '첫 검토자가 작품의 정체와 매력을 빠르게 파악하는 자료입니다.',
  story: '시놉시스, 플롯, 핵심 장면처럼 서사의 뼈대를 설명하는 자료입니다.',
  setting: '세계관, 인물, 용어처럼 매체 확장 때 흔들리면 안 되는 기준 자료입니다.',
  business: '비주얼, 시장 포지션, 에피소드, 확장 가능성을 검토하는 자료입니다.',
};

function materialClusterStatus(filledCount: number, totalCount: number): IpPackExternalMaterialCluster['statusKo'] {
  if (totalCount > 0 && filledCount >= totalCount) return '준비';
  if (filledCount > 0) return '보강 필요';
  return '대기';
}

function defaultExternalMaterialClusters(): IpPackExternalMaterialCluster[] {
  return EXTERNAL_MATERIAL_CLUSTER_ORDER.map((cluster) => {
    const totalCount = IP_BIBLE_SECTION_KEYS.filter(
      (key) => IP_BIBLE_SECTION_META[key].cluster === cluster,
    ).length;
    return {
      id: cluster,
      labelKo: EXTERNAL_MATERIAL_CLUSTER_LABEL_KO[cluster],
      purposeKo: EXTERNAL_MATERIAL_CLUSTER_PURPOSE_KO[cluster],
      filledCount: 0,
      totalCount,
      statusKo: materialClusterStatus(0, totalCount),
    };
  });
}

function normalizeExternalMaterialClusters(
  clusters: readonly IpPackExternalMaterialCluster[] | undefined,
): IpPackExternalMaterialCluster[] {
  if (!Array.isArray(clusters) || clusters.length === 0) return defaultExternalMaterialClusters();
  const byId = new Map<IpBibleCluster, IpPackExternalMaterialCluster>();
  for (const cluster of clusters as readonly IpPackExternalMaterialCluster[]) {
    const clusterId: IpBibleCluster = cluster.id;
    byId.set(clusterId, {
      id: clusterId,
      labelKo: cluster.labelKo || EXTERNAL_MATERIAL_CLUSTER_LABEL_KO[clusterId],
      purposeKo: cluster.purposeKo || EXTERNAL_MATERIAL_CLUSTER_PURPOSE_KO[clusterId],
      filledCount: Math.max(0, cluster.filledCount),
      totalCount: Math.max(0, cluster.totalCount),
      statusKo: cluster.statusKo || materialClusterStatus(cluster.filledCount, cluster.totalCount),
    });
  }
  return EXTERNAL_MATERIAL_CLUSTER_ORDER.map((cluster) => byId.get(cluster)).filter(
    (cluster): cluster is IpPackExternalMaterialCluster => Boolean(cluster),
  );
}

function mediaFormGroupStatus(filledCount: number, totalCount: number): IpPackMediaFormGroup['statusKo'] {
  if (totalCount > 0 && filledCount >= totalCount) return '준비';
  if (filledCount > 0) return '보강 필요';
  return '대기';
}

function normalizeMediaFormGroups(
  groups: readonly IpPackMediaFormGroupInput[] | undefined,
): IpPackMediaFormGroup[] {
  if (!Array.isArray(groups) || groups.length === 0) return [];

  return groups.map((group) => {
    const rawFields: readonly IpPackMediaFormField[] = Array.isArray(group.fields) ? group.fields : [];
    const fields: IpPackMediaFormField[] = rawFields.map((field) => ({
        labelKo: field.labelKo?.trim() || '이름 없는 항목',
        filled: Boolean(field.filled),
        sourceKo: field.sourceKo?.trim() || (field.filled ? '프로젝트 입력' : '입력 대기'),
      }));
    const totalCount = Math.max(0, group.totalCount || fields.length);
    const filledCount = Math.max(0, Math.min(group.filledCount || fields.filter((field) => field.filled).length, totalCount));

    return {
      titleKo: group.titleKo?.trim() || '매체별 작성 양식',
      purposeKo: group.purposeKo?.trim() || '매체별 제출 준비 상태를 기록합니다.',
      filledCount,
      totalCount,
      fields,
      statusKo: group.statusKo || mediaFormGroupStatus(filledCount, totalCount),
    };
  });
}

function buildProjectLedgerScope(input: IpPackManifestInput): IpPackProjectLedgerScope {
  const projectId = input.projectLedgerScope?.projectId?.trim() || input.cert.projectId || 'project-draft';
  const projectScoped = input.projectLedgerScope?.projectScoped ?? Boolean(input.cert.projectId?.trim());
  return {
    projectId,
    projectScoped,
    projectScopeNoteKo:
      input.projectLedgerScope?.projectScopeNoteKo ??
      (projectScoped
        ? `프로젝트 ${projectId} 기준으로 구성표와 원장 키를 분리합니다.`
        : '프로젝트가 확정되기 전에는 실제 차감 원장을 만들지 않습니다.'),
    packageLedgerNoteKo:
      input.projectLedgerScope?.packageLedgerNoteKo ??
      '출고 패키지 원장 처리는 작가 승인과 발급 처리 이후 서버 원장에서 분리 기록합니다.',
  };
}

function rightsStatusForSources(sources: readonly SourceRecord[]): IpPackRightsReviewStatus {
  if (sources.length === 0) return 'recorded';
  return sources.some((source) => !source.licenseNote?.trim()) ? 'needs-review' : 'recorded';
}

function summarizeSourceSubset(sources: readonly SourceRecord[]): IpPackAssetRightsSummaryItem {
  return {
    sourceCount: sources.length,
    aiOutputCount: sources.filter((source) => source.sourceType === 'ai_output').length,
    externalSourceCount: sources.filter((source) => source.sourceType !== 'ai_output').length,
    missingLicenseNoteCount: sources.filter((source) => !source.licenseNote?.trim()).length,
    privateSourceCount: sources.filter((source) => source.visibility === 'private').length,
    publisherSourceCount: sources.filter((source) => source.visibility === 'publisher').length,
    publicSourceCount: sources.filter((source) => source.visibility === 'public').length,
    reviewStatus: rightsStatusForSources(sources),
  };
}

function buildAssetRightsSummary(input: {
  artifacts: readonly ArtifactDescriptor[];
  sources: readonly SourceRecord[];
  events: readonly CreativeEvent[];
}): IpPackManifest['assetRightsSummary'] {
  const manuscriptSources = input.sources.filter((source) =>
    input.events.some((event) => event.targetType === 'manuscript' && event.sourceId === source.id),
  );
  const previsualSources = input.sources.filter((source) => source.sourceType === 'image_caption');
  const aiOutputSources = input.sources.filter((source) => source.sourceType === 'ai_output');
  const externalReferenceSources = input.sources.filter((source) =>
    source.sourceType === 'external_doc' ||
    source.sourceType === 'web_clip' ||
    source.sourceType === 'reference' ||
    source.sourceType === 'collaborator_text',
  );
  const manuscriptArtifacts = input.artifacts
    .filter((artifact): artifact is ArtifactDescriptor & { id: 'manuscript-final-md' | 'manuscript-final-clean-md' } =>
      artifact.id === 'manuscript-final-md' || artifact.id === 'manuscript-final-clean-md',
    )
    .map((artifact) => artifact.id);

  return {
    manuscriptText: {
      ...summarizeSourceSubset(manuscriptSources),
      artifactIds: manuscriptArtifacts,
      humanEventCount: input.events.filter((event) => event.targetType === 'manuscript' && event.actorType === 'human').length,
      aiEventCount: input.events.filter((event) => event.targetType === 'manuscript' && event.actorType === 'ai').length,
      externalImportEventCount: input.events.filter((event) => event.targetType === 'manuscript' && event.eventType === 'import').length,
    },
    previsualAssets: summarizeSourceSubset(previsualSources),
    aiOutputs: summarizeSourceSubset(aiOutputSources),
    externalReferenceMaterials: summarizeSourceSubset(externalReferenceSources),
  };
}

// ============================================================
// PART 4 — Risk register
// ============================================================

function buildRiskRegister(input: IpPackManifestInput): IpPackRiskItem[] {
  const publicEndpoint = normalizePublicVerificationUrl(input.cert.verificationUrl);
  const risks: IpPackRiskItem[] = [
    {
      id: 'scope-limitation',
      severity: 'info',
      status: 'recorded',
      message:
        '권리/IP 구성표는 과정 증빙과 패키지 경계를 기록합니다. 수신자 검토와 법률 검토는 별도 단계입니다.',
    },
  ];

  if (!publicEndpoint) {
    risks.push({
      id: 'missing-public-verification-url',
      severity: 'medium',
      status: 'needs-review',
      message:
        '공개 검증 주소가 연결되지 않았습니다. 해시와 확인서 기록은 패키지 내부에서 검토할 수 있지만 외부 조회 고정점은 없습니다.',
    });
  }

  if (!input.cert.sealNumber) {
    risks.push({
      id: 'missing-witness-seal',
      severity: 'low',
      status: 'needs-review',
      message: '이 확인서 기록에 증인 씰 번호가 연결되지 않았습니다.',
    });
  }

  if (input.events.length === 0) {
    risks.push({
      id: 'process-log-density-review',
      severity: 'medium',
      status: 'needs-review',
      message:
        '상세 창작 이벤트가 포함되지 않았습니다. 확인서 해시는 존재하지만 외부 제출 전 과정기록 밀도를 검토해야 합니다.',
    });
  }

  const missingLicenseNoteCount = input.sources.filter((source) => !source.licenseNote?.trim()).length;
  if (missingLicenseNoteCount > 0) {
    const externalMissingCount = input.sources.filter(
      (source) => source.sourceType !== 'ai_output' && !source.licenseNote?.trim(),
    ).length;
    risks.push({
      id: 'source-license-review',
      severity: externalMissingCount > 0 ? 'high' : 'medium',
      status: 'needs-review',
      message: `${missingLicenseNoteCount}개 출처 기록에 라이선스 또는 권리 메모가 없습니다.`,
    });
  }

  const missingRequiredCount = input.regulatoryReports.reduce(
    (total, report) => total + report.missingRequired.length,
    0,
  );
  if (missingRequiredCount > 0 || input.regulatoryReports.some((report) => report.status !== 'ready')) {
    risks.push({
      id: 'regulatory-readiness-review',
      severity: 'medium',
      status: 'needs-review',
      message:
        '하나 이상의 규정/프로필 준비 항목에 검토 또는 추가 증빙이 필요합니다.',
    });
  }

  if (input.finalCleanAudit?.verdict === 'HOLD') {
    risks.push({
      id: 'final-clean-audit-hold',
      severity: input.finalCleanAudit.severityCounts.high > 0 ? 'high' : 'medium',
      status: 'hold',
      message:
        `제출 전 기계 점검에서 작가 검토가 필요한 항목이 ${input.finalCleanAudit.findingCount}개 남아 있습니다.`,
    });
  }

  if (!input.manifestStoreUri) {
    risks.push({
      id: 'c2pa-round-trip-hold',
      severity: 'medium',
      status: 'hold',
      message:
        'C2PA 준비 자료는 생성되었지만 서명된 매니페스트 저장 주소가 연결되지 않았습니다.',
    });
  }

  return risks;
}

function summarizeRiskSeverities(risks: readonly IpPackRiskItem[]): IpPackManifest['riskSeveritySummary'] {
  return risks.reduce<IpPackManifest['riskSeveritySummary']>(
    (summary, risk) => {
      if (risk.severity === 'critical') summary.critical += 1;
      if (risk.severity === 'high') summary.high += 1;
      if (risk.severity === 'medium') summary.medium += 1;
      if (risk.severity === 'low') summary.low += 1;
      return summary;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
}

// ============================================================
// PART 5 — Public builder
// ============================================================

export function buildIpPackManifest(input: IpPackManifestInput): IpPackManifest {
  const humanEventCount = input.events.filter((event) => event.actorType === 'human').length;
  const aiEventCount = input.events.filter((event) => event.actorType === 'ai').length;
  const aiSourceCount = input.sources.filter((source) => source.sourceType === 'ai_output').length;
  const riskRegister = buildRiskRegister(input);
  const publicEndpoint = normalizePublicVerificationUrl(input.cert.verificationUrl);

  return {
    kind: 'loreguard.ip-pack-manifest.v1',
    packageProfile: input.profileId,
    certificateId: input.cert.id,
    generatedAt: input.cert.generatedAt,
    generatedBy: input.generatedBy ?? input.cert.generatedBy,
    verification: {
      publicEndpoint,
      sealNumber: input.cert.sealNumber ?? null,
      githubCommitSha: input.cert.githubCommitSha ?? null,
      manifestStoreUri: input.manifestStoreUri ?? null,
    },
    artifacts: buildArtifactInventory(input.artifacts),
    publicVerifyPolicy: {
      exposedFields: [
        '확인서 식별자',
        '씰 번호',
        '발급 일시',
        '공개 범위',
        '발급 주체',
        '원고 해시',
        '타임라인 해시',
        '출처 요약 해시',
        '체인 마지막 해시',
        'GitHub 커밋',
      ],
      privateFields: [
        '원고 전문',
        '회차 본문',
        '노아 요청 원문',
        '출처 본문',
        '비공개 출처 이름과 주소',
        '작업 영수증 사유',
        '작업 영수증 원문',
        '제출 전 점검 발췌',
        '작가 개인 메모',
      ],
      noManuscriptContent: true,
      noPromptText: true,
      noSourceBodyText: true,
    },
    creativeProcess: {
      view: input.view,
      reportVersion: input.cert.reportVersion,
      manuscriptHash: input.cert.manuscriptHash,
      timelineHash: input.cert.timelineHash,
      sourceSummaryHash: input.cert.sourceSummaryHash,
      chainTipHash: input.cert.chainTipHash ?? null,
      eventCount: input.events.length,
      sourceCount: input.sources.length,
      limitationTextVersion: input.cert.limitationTextVersion,
    },
    humanContributionSummary: {
      humanEventCount,
      humanRevisionCount: input.cert.summaryStats.humanRevisionCount,
      manualTypingChars: input.cert.summaryStats.manualTypingChars ?? null,
      humanControlIndex: input.cert.hciPayload?.hci ?? null,
      humanControlStatus: input.cert.hciPayload?.intent ?? null,
    },
    aiUsageSummary: {
      aiAssisted: input.cert.summaryStats.aiAssistUsed || aiEventCount > 0 || aiSourceCount > 0,
      aiEventCount,
      aiRequestCount: input.cert.summaryStats.aiRequestCount ?? 0,
      aiAcceptCount: input.cert.summaryStats.aiAcceptCount ?? 0,
      aiUnusedCount: input.cert.summaryStats.aiUnusedCount ?? 0,
      modelsUsed: collectModels(input.cert, input.sources, input.events),
      aiSourceCount,
    },
    workReceiptSummary: summarizeWorkReceipts(input.workReceiptJournal),
    sourceRightsSummary: summarizeSources(input.sources),
    externalMaterialClusters: normalizeExternalMaterialClusters(input.externalMaterialClusters),
    mediaFormGroups: normalizeMediaFormGroups(input.mediaFormGroups),
    projectLedgerScope: buildProjectLedgerScope(input),
    assetRightsSummary: buildAssetRightsSummary({
      artifacts: input.artifacts,
      sources: input.sources,
      events: input.events,
    }),
    regulatorySummary: input.regulatoryReports.map((report) => ({
      id: report.id,
      status: report.status,
      score: report.score,
      missingRequiredCount: report.missingRequired.length,
    })),
    riskRegister,
    riskSeveritySummary: summarizeRiskSeverities(riskRegister),
    limitation:
      '이 구성표는 패키지 구성, 공개 경계, 검토 항목을 기록합니다. 저작권 귀속, 직접 저작 여부, 독창성, 법률 준수를 확정하지 않습니다.',
  };
}

export function serializeIpPackManifest(manifest: IpPackManifest): string {
  return JSON.stringify(manifest, null, 2);
}

function riskStatusLabelKo(status: IpPackRiskItem['status']): string {
  return reviewStatusLabel('KO', status);
}

function riskMessageKo(risk: IpPackRiskItem): string {
  switch (risk.id) {
    case 'scope-limitation':
      return '이 구성표는 과정 증빙과 패키지 경계를 기록합니다. 수신자 검토와 법률 검토는 별도 단계입니다.';
    case 'missing-public-verification-url':
      return '공개 검증 주소가 연결되지 않았습니다. 해시와 확인서 기록은 패키지 내부에서 검토할 수 있지만 외부 조회 고정점은 없습니다.';
    case 'missing-witness-seal':
      return '이 확인서 기록에 증인 씰 번호가 연결되지 않았습니다.';
    case 'process-log-density-review':
      return '상세 창작 이벤트가 포함되지 않았습니다. 확인서 해시는 존재하지만 외부 제출 전 과정기록 밀도를 검토해야 합니다.';
    case 'source-license-review':
      return '일부 출처 기록에 라이선스 또는 권리 메모가 없습니다.';
    case 'regulatory-readiness-review':
      return '하나 이상의 규정/프로필 준비 항목에 검토 또는 추가 증빙이 필요합니다.';
    case 'final-clean-audit-hold':
      return '제출 전 기계 점검에서 작가 검토가 필요한 항목이 남아 있습니다.';
    case 'c2pa-round-trip-hold':
      return 'C2PA 준비 자료는 생성되었지만 서명된 매니페스트 저장 주소가 연결되지 않았습니다.';
    default:
      return risk.message;
  }
}

function assetRightsLine(label: string, item: IpPackAssetRightsSummaryItem): string {
  return [
    `- ${label}`,
    `  - 출처 ${item.sourceCount}`,
    `  - 노아 보조 산출물 ${item.aiOutputCount}`,
    `  - 외부 출처 ${item.externalSourceCount}`,
    `  - 권리 메모 누락 ${item.missingLicenseNoteCount}`,
    `  - 검토 상태 ${reviewStatusLabel('KO', item.reviewStatus)}`,
  ].join('\n');
}

function packageProfileLabelKo(profile: IpPackManifest['packageProfile']): string {
  switch (profile) {
    case 'legal-deposit':
      return '저작권 등록·법적 보관';
    case 'publisher':
      return '제출 패키지';
    case 'platform':
      return '플랫폼 게시용';
    case 'private-archive':
      return '내부 보관용';
    default:
      return profile;
  }
}

export function serializeIpPackManifestForUserKo(manifest: IpPackManifest): string {
  const lines: string[] = [
    '# 권리/IP 자산화 구성표',
    '',
    '## 기본 정보',
    `- 패키지 유형: ${packageProfileLabelKo(manifest.packageProfile)}`,
    `- 확인서 식별자: ${manifest.certificateId}`,
    `- 생성 일시: ${manifest.generatedAt}`,
    `- 생성 주체: ${manifest.generatedBy}`,
    '',
    '## 검증 연결',
    `- 공개 검증 주소: ${manifest.verification.publicEndpoint ?? '없음'}`,
    `- 씰 번호: ${manifest.verification.sealNumber ?? '없음'}`,
    `- 저장 위치: ${manifest.verification.manifestStoreUri ?? '없음'}`,
    '',
    '## 산출물 목록',
  ];

  for (const item of manifest.artifacts) {
    lines.push(
      `- ${item.filename} · ${artifactRoleLabel('KO', item.role)} · ${manifestDisclosureLabel('KO', item.disclosure)}`,
    );
  }

  lines.push(
    '',
    '## 공개 범위',
    `- 공개 검증에 노출되는 항목: ${manifest.publicVerifyPolicy.exposedFields.length}개`,
    `- 비공개로 유지되는 항목: ${manifest.publicVerifyPolicy.privateFields.length}개`,
    '- 원고 본문: 비공개',
    '- 프롬프트 원문: 비공개',
    '- 출처 본문: 비공개',
    '',
    '## 과정기록 요약',
    `- 보기 범위: ${manifest.creativeProcess.view}`,
    `- 원고 해시: ${manifest.creativeProcess.manuscriptHash}`,
    `- 타임라인 해시: ${manifest.creativeProcess.timelineHash}`,
    `- 이벤트 수: ${manifest.creativeProcess.eventCount}`,
    `- 출처 수: ${manifest.creativeProcess.sourceCount}`,
    '',
    '## 작가 기여 요약',
    `- 사람 이벤트: ${manifest.humanContributionSummary.humanEventCount}`,
    `- 사람 수정: ${manifest.humanContributionSummary.humanRevisionCount}`,
    `- 직접 입력 글자 수: ${manifest.humanContributionSummary.manualTypingChars ?? '미기록'}`,
    `- 작가 통제 지수: ${manifest.humanContributionSummary.humanControlIndex ?? '미기록'}`,
    '',
    '## 노아 사용 요약',
    `- 노아 보조 사용: ${manifest.aiUsageSummary.aiAssisted ? '예' : '아니오'}`,
    `- 노아 관련 이벤트: ${manifest.aiUsageSummary.aiEventCount}`,
    `- 요청 수: ${manifest.aiUsageSummary.aiRequestCount}`,
    `- 채택 수: ${manifest.aiUsageSummary.aiAcceptCount}`,
    `- 미사용 수: ${manifest.aiUsageSummary.aiUnusedCount}`,
    '',
    '## 외부 제시 자료 4군집',
  );

  for (const cluster of manifest.externalMaterialClusters) {
    lines.push(
      `- ${cluster.labelKo}: ${cluster.filledCount}/${cluster.totalCount} · ${cluster.statusKo} · ${cluster.purposeKo}`,
    );
  }

  lines.push(
    '',
    '## 매체별 작성 양식',
  );

  if (manifest.mediaFormGroups.length === 0) {
    lines.push('- 매체별 작성 양식 기록이 없습니다.');
  } else {
    for (const group of manifest.mediaFormGroups) {
      lines.push(
        `- ${group.titleKo}: ${group.filledCount}/${group.totalCount} · ${group.statusKo} · ${group.purposeKo}`,
      );
      lines.push(
        `  - 항목: ${group.fields.map((field) => `${field.labelKo}(${field.filled ? '채움' : '대기'})`).join(' · ') || '없음'}`,
      );
    }
  }

  lines.push(
    '',
    '## 프로젝트 격리·원장 처리',
    `- 프로젝트 기준: ${manifest.projectLedgerScope.projectId}`,
    `- 격리 상태: ${manifest.projectLedgerScope.projectScoped ? '프로젝트별 분리' : '프로젝트 확정 전 대기'}`,
    `- 격리 메모: ${manifest.projectLedgerScope.projectScopeNoteKo}`,
    `- 원장 메모: ${manifest.projectLedgerScope.packageLedgerNoteKo}`,
    '',
    '## 자산 권리 요약',
    assetRightsLine(
      assetRightsGroupLabel('KO', 'manuscriptText'),
      manifest.assetRightsSummary.manuscriptText,
    ),
    assetRightsLine(
      assetRightsGroupLabel('KO', 'previsualAssets'),
      manifest.assetRightsSummary.previsualAssets,
    ),
    assetRightsLine(
      assetRightsGroupLabel('KO', 'aiOutputs'),
      manifest.assetRightsSummary.aiOutputs,
    ),
    assetRightsLine(
      assetRightsGroupLabel('KO', 'externalReferenceMaterials'),
      manifest.assetRightsSummary.externalReferenceMaterials,
    ),
    '',
    '## 위험 등록부',
  );

  for (const risk of manifest.riskRegister) {
    lines.push(
      `- ${severityLabel('KO', risk.severity)} · ${riskStatusLabelKo(risk.status)}: ${riskMessageKo(risk)}`,
    );
  }

  lines.push(
    '',
    '## 위험 심각도 요약',
    `- 치명: ${manifest.riskSeveritySummary.critical}`,
    `- 높음: ${manifest.riskSeveritySummary.high}`,
    `- 중간: ${manifest.riskSeveritySummary.medium}`,
    `- 낮음: ${manifest.riskSeveritySummary.low}`,
    '',
    '## 한계',
    '이 구성표는 패키지 구성, 공개 경계, 검토 항목을 기록합니다. 저작권 소유, 직접 저작, 독창성, 법률 준수를 확정하지 않습니다.',
  );

  return lines.join('\n');
}
