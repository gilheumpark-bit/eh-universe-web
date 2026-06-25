// ============================================================
// Submission Package — `_1` 제출 번들 메타데이터 + 발급 로직
// ============================================================
//
// stitch_lore_guard `_1` Certificate Vault — Submission Package 화면 backbone.
//
// 4 Artifact 구성:
//   1. manuscript-md           — 본문 markdown
//   2. process-certificate     — 창작 과정 확인서 (HTML/MD)
//   3. source-bundle           — SourceRecord 묶음 (JSON)
//   4. digital-signature       — manuscriptHash + sealNumber + 발급시각
//
// 4 Distribution Profile:
//   - legal-deposit  (저작권 등록·법적 보관)
//   - publisher      (출판사 제출)
//   - platform       (네이버·카카오·아마존 등)
//   - private-archive (작가 개인 보관; 내부 호환 ID)
//
// 사상 정합:
//   - Visual Charter v1.0 — Sharp 0px / Modern Institutionalism
//   - 4차 §1 "확답 X 기록 O"
//   - 13차 §5.2 "외부=확인서, 내부=영수증"
//
// [C] 안전성: 빈 episodes / 빈 events 방어, view 정책 준수
// [G] 성능: 단일 buildCertificate 호출 + 직렬화 1회
// [K] 간결성: 단일 export buildSubmissionPackage()
// ============================================================

import type {
  CreativeEvent,
  SourceRecord,
  CertificateLanguage,
  CertificateView,
  ProcessCertificate,
} from './types';
import { buildCertificate } from './report-builder';
import { renderCertificateHtml } from './html-renderer';
import { renderCertificateMarkdown } from './markdown-renderer';
import { listSources } from './source-recorder';
import { listCreativeEvents } from './event-recorder';
import {
  buildIpPackManifest,
  serializeIpPackManifest,
} from './ip-pack-manifest';
import type {
  IpPackExternalMaterialCluster,
  IpPackMediaFormGroupInput,
  IpPackProjectLedgerScope,
} from './ip-pack-manifest.types';
import {
  getJurisdictionFormPack,
  type LocalePackId,
} from './jurisdiction-form-pack';
// [배선 수정 2026-06-25] 규제 준비도(EU AI Act·한국 AI기본법·CA SB942 등)는 완성·테스트된
// evaluateRegulatoryProfiles 로 평가해야 한다. 기존엔 buildIpPackManifestArtifact 가
// regulatoryReports:[] 를 하드코딩해 출고물에서 항상 누락(법적 준비도 0)이었다.
import {
  evaluateRegulatoryProfiles,
  ALL_REGULATORY_PROFILE_IDS,
} from './regulatory-profile';
import {
  buildReleaseCreditPreview,
  RELEASE_CREDIT_POLICY_CHECKED_AT,
  type ReleaseCreditLedgerStatus,
} from '../billing/release-credit-ledger';
import {
  buildPublicCertificateCardPayload,
  serializePublicCertificateCardForUserKo,
} from './public-certificate-card';
import type {
  LoreguardPlanId,
  ReleaseEntitlementPlan,
} from '../billing/loreguard-plans';
import { importFileReportReasonLabel } from '../loreguard/import-file-report-reason';
import type {
  ArtifactDescriptor,
  ArtifactId,
  DistributionProfile,
  DistributionProfileId,
  ImportFileReportArtifact,
  SubmissionImportFileReportItem,
  SubmissionImportFileReportStatus,
  SubmissionPackage,
  SubmissionPackageInput,
} from './submission-package.types';

// ============================================================
// PART 1 — Distribution Profile + Recipient
// ============================================================

export type {
  ArtifactDescriptor,
  ArtifactId,
  DistributionProfile,
  DistributionProfileId,
  FinalCleanAuditReport,
  ImportFileReportArtifact,
  PackageIssuanceReceiptReport,
  SubmissionImportFileReportItem,
  SubmissionImportFileReportReasonCode,
  SubmissionImportFileReportStatus,
  SubmissionPackage,
  SubmissionPackageInput,
  WorkReceiptJournalItem,
} from './submission-package.types';

export const DISTRIBUTION_PROFILES: Record<DistributionProfileId, DistributionProfile> = {
  'legal-deposit': {
    id: 'legal-deposit',
    defaultView: 'legal',
    forcedView: 'legal',
    includesSourceBundle: true,
    includesDigitalSignature: true,
    label: { ko: '저작권 등록·법적 보관', en: 'Legal Deposit', ja: '法的保管', zh: '法定保管' },
    recommendedRetentionYears: 70, // 저작권법 기본
  },
  publisher: {
    id: 'publisher',
    defaultView: 'publisher',
    includesSourceBundle: true,
    includesDigitalSignature: true,
    label: { ko: '출판사 제출', en: 'Publisher', ja: '出版社提出', zh: '出版社提交' },
    recommendedRetentionYears: 10,
  },
  platform: {
    id: 'platform',
    defaultView: 'public',
    includesSourceBundle: false,
    includesDigitalSignature: true,
    label: { ko: '플랫폼 게시', en: 'Platform', ja: 'プラットフォーム', zh: '平台发布' },
    recommendedRetentionYears: 5,
  },
  'private-archive': {
    id: 'private-archive',
    defaultView: 'private',
    includesSourceBundle: true,
    includesDigitalSignature: true,
    label: { ko: '작가 개인 보관', en: 'Private Records', ja: '個人保管', zh: '个人存档' },
    recommendedRetentionYears: 100,
  },
};

// ============================================================
// PART 4 — Manuscript markdown 직렬화 (간단 헤더 + 에피소드)
// ============================================================

function serializeManuscriptMarkdown(
  projectMeta: { name: string; authorName?: string },
  episodes: Array<{ episode: number; content: string }>,
  language: CertificateLanguage,
): string {
  const lines: string[] = [];
  lines.push(`# ${projectMeta.name}`);
  if (projectMeta.authorName) {
    const lbl = { ko: '작가', en: 'Author', ja: '作者', zh: '作者' }[language];
    lines.push(`> ${lbl}: ${projectMeta.authorName}`);
  }
  lines.push('');
  for (const ep of episodes) {
    lines.push(`## Episode ${ep.episode}`);
    lines.push('');
    lines.push(ep.content);
    lines.push('');
  }
  return lines.join('\n');
}

// ============================================================
// PART 5 — Source Bundle 직렬화 (JSON)
// ============================================================

function serializeSourceBundle(
  sources: SourceRecord[],
  events: CreativeEvent[],
): string {
  // [C] 민감 필드 제거 — note 는 작가 메모이므로 visibility 'private' 만 보존
  const sanitized = sources.map((s) => ({
    id: s.id,
    sourceType: s.sourceType,
    label: s.label,
    importedAt: s.importedAt,
    contentHash: s.contentHash,
    provider: s.provider,
    model: s.model,
    fileName: s.fileName,
    licenseNote: s.licenseNote,
    visibility: s.visibility,
  }));
  // events 는 sourceId 가 있는 것만 추림 — bundle 사이즈 절약
  const linked = events
    .filter((e) => !!e.sourceId)
    .map((e) => ({
      id: e.id,
      sourceId: e.sourceId,
      eventType: e.eventType,
      originType: e.originType,
      createdAt: e.createdAt,
    }));
  return JSON.stringify({ sources: sanitized, links: linked }, null, 2);
}

// ============================================================
// PART 6 — Digital Signature 직렬화
// ============================================================

function serializeDigitalSignature(input: {
  manuscriptHash: string;
  timelineHash: string;
  sourceSummaryHash: string;
  sealNumber?: string;
  generatedAt: string;
  reportVersion: string;
  certificateId: string;
}): string {
  return JSON.stringify(
    {
      kind: 'loreguard.digital-signature.v1',
      manuscriptHash: input.manuscriptHash,
      timelineHash: input.timelineHash,
      sourceSummaryHash: input.sourceSummaryHash,
      sealNumber: input.sealNumber || null,
      generatedAt: input.generatedAt,
      reportVersion: input.reportVersion,
      certificateId: input.certificateId,
    },
    null,
    2,
  );
}

function defaultLocalePackIdForLanguage(language: CertificateLanguage): LocalePackId {
  switch (language) {
    case 'en':
      return 'en-US';
    case 'ja':
      return 'ja-JP';
    case 'zh':
      return 'zh-CN';
    case 'ko':
    default:
      return 'ko-KR';
  }
}

function buildJurisdictionFormPackArtifact(input: {
  packId: LocalePackId | string;
  certId: string;
  generatedAt: string;
}): ArtifactDescriptor {
  const pack = getJurisdictionFormPack(input.packId);
  const payload = {
    kind: 'loreguard.jurisdiction-form-pack.v1',
    packId: pack.id,
    jurisdiction: pack.jurisdiction,
    language: pack.language,
    label: pack.label,
    generatedAt: input.generatedAt,
    sourceReferences: pack.sourceReferences,
    forms: pack.forms,
    limitation: pack.limitation,
  };
  const content = JSON.stringify(payload, null, 2);
  return {
    id: 'jurisdiction-form-pack',
    filename: `jurisdiction-form-pack-${pack.id}-${shortId(input.certId)}.json`,
    mimeType: 'application/json;charset=utf-8',
    size: byteLength(content),
    content,
  };
}

function buildReleaseCreditPreviewArtifact(input: {
  planId: LoreguardPlanId;
  packageProfileId: ReleaseEntitlementPlan['packageProfileId'];
  projectId: string;
  projectName: string;
  certId: string;
  generatedAt: string;
  availableCreditsOverride?: number | null;
}): ArtifactDescriptor {
  const preview = buildReleaseCreditPreview({
    planId: input.planId,
    packageProfileId: input.packageProfileId,
    projectId: input.projectId,
    workTitle: input.projectName,
    certificateId: input.certId,
    availableCreditsOverride: input.availableCreditsOverride,
  });
  const payload = {
    kind: 'loreguard.release-credit-preview.v1',
    generatedAt: input.generatedAt,
    policyCheckedAt: RELEASE_CREDIT_POLICY_CHECKED_AT,
    packageProfileId: input.packageProfileId,
    planId: input.planId,
    status: preview.status,
    product: {
      id: preview.entitlement.productId,
      labelKo: preview.entitlement.productLabelKo,
      priceKrw: preview.entitlement.productPriceKrw,
      requiredCredits: preview.requiredCredits,
    },
    creditPreview: {
      availableCredits: preview.availableCredits,
      remainingCredits: preview.remainingCredits,
      canUseIncludedCredits: preview.canUseIncludedCredits,
      purchaseRequired: preview.purchaseRequired,
      upgradeRecommended: preview.upgradeRecommended,
      debitPreviewKo: preview.debitPreviewKo,
      receiptDraftKo: preview.receiptDraftKo,
      ledgerNoteKo: preview.ledgerNoteKo,
      projectScopeNoteKo: preview.projectScopeNoteKo,
    },
    uiContract: {
      gateLabelKo: releaseCreditGateLabelKo(preview.status),
      reviewCtaKo: releaseCreditReviewCtaKo(preview.status),
      paymentExecutionKo: '검토만 진행',
      submissionActionKo: '작가 승인 전 검토용 산출물',
    },
    ledgerEventDraft: preview.eventDraft,
    limitation: '이 파일은 출고 전 패키지 조건 미리보기입니다. 실제 결제, 차감, 환불, 권한 변경은 서버 원장 승인 이후에만 처리됩니다.',
  };
  const content = JSON.stringify(payload, null, 2);
  return {
    id: 'release-credit-preview',
    filename: `release-credit-preview-${input.packageProfileId}-${shortId(input.certId)}.json`,
    mimeType: 'application/json;charset=utf-8',
    size: byteLength(content),
    content,
  };
}

function buildPublicCertificateCardArtifact(input: {
  cert: ProcessCertificate;
  projectName: string;
  authorName?: string;
}): ArtifactDescriptor {
  const payload = buildPublicCertificateCardPayload({
    cert: input.cert,
    workTitle: input.projectName,
    authorName: input.authorName,
  });
  const content = serializePublicCertificateCardForUserKo(payload);
  return {
    id: 'public-certificate-card',
    filename: `public-process-card-${shortId(input.cert.id)}.md`,
    mimeType: 'text/markdown;charset=utf-8',
    size: byteLength(content),
    content,
  };
}

function releaseCreditGateLabelKo(status: ReleaseCreditLedgerStatus): string {
  if (status === 'included') return '발급 전 검토 가능';
  if (status === 'unlimited') return '조직 원장 협의';
  if (status === 'upgrade') return '상위 권한 확인 필요';
  return '크레딧 충전 또는 별도 구매 필요';
}

function releaseCreditReviewCtaKo(status: ReleaseCreditLedgerStatus): string {
  if (status === 'included') return '출고 묶음 검토 생성';
  if (status === 'unlimited') return '조직 제출 묶음 검토 생성';
  if (status === 'upgrade') return '상위 권한 검토용 미리보기';
  return '구매 전 묶음 미리보기';
}

function buildIpPackManifestArtifact(input: {
  cert: ProcessCertificate;
  profileId: DistributionProfileId;
  view: CertificateView;
  language: 'ko' | 'en';
  artifacts: readonly ArtifactDescriptor[];
  sources: readonly SourceRecord[];
  events: readonly CreativeEvent[];
  generatedBy?: string;
  manifestStoreUri?: string;
  externalMaterialClusters?: readonly IpPackExternalMaterialCluster[];
  mediaFormGroups?: readonly IpPackMediaFormGroupInput[];
  projectLedgerScope?: Partial<IpPackProjectLedgerScope>;
}): ArtifactDescriptor {
  const filename = `ip-pack-manifest-${shortId(input.cert.id)}.json`;
  let artifact: ArtifactDescriptor = {
    id: 'ip-pack-manifest',
    filename,
    mimeType: 'application/json;charset=utf-8',
    size: 0,
    content: '',
  };

  // [배선 수정 2026-06-25] 규제 준비도 평가 1회 (반복 무관 — 입력 고정).
  // artifactIds 로 c2pa-ready-manifest 등 산출물 존재를 hasC2paReady 가 검출한다.
  const regulatoryReports = evaluateRegulatoryProfiles(
    ALL_REGULATORY_PROFILE_IDS,
    {
      cert: input.cert,
      sources: [...input.sources],
      events: [...input.events],
      artifactIds: input.artifacts.map((descriptor) => descriptor.id),
    },
    input.language,
  );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const manifest = buildIpPackManifest({
      cert: input.cert,
      profileId: input.profileId,
      view: input.view,
      artifacts: [...input.artifacts, artifact],
      sources: input.sources,
      events: input.events,
      regulatoryReports,
      generatedBy: input.generatedBy,
      manifestStoreUri: input.manifestStoreUri,
      externalMaterialClusters: input.externalMaterialClusters,
      mediaFormGroups: input.mediaFormGroups,
      projectLedgerScope: input.projectLedgerScope,
    });
    const content = serializeIpPackManifest(manifest);
    const size = byteLength(content);
    if (artifact.content === content && artifact.size === size) return artifact;
    artifact = { ...artifact, content, size };
  }

  return artifact;
}

function buildCoreCopyrightPackageArtifact(input: {
  content: string;
  filename?: string;
  certId: string;
}): ArtifactDescriptor {
  const content = input.content;
  return {
    id: 'core-copyright-package',
    filename: input.filename?.trim() || `core-copyright-package-${shortId(input.certId)}.md`,
    mimeType: 'text/markdown;charset=utf-8',
    size: byteLength(content),
    content,
  };
}

function normalizeImportFileReports(
  reports: readonly SubmissionImportFileReportItem[] | undefined,
  language: CertificateLanguage,
): SubmissionImportFileReportItem[] {
  return (reports ?? []).map((report) => ({
    id: String(report.id),
    fileName: String(report.fileName),
    status: report.status,
    detail: String(report.detail),
    candidateCount: Number.isFinite(report.candidateCount) ? Math.max(0, report.candidateCount) : 0,
    importedAt: String(report.importedAt),
    ...(report.reasonCode ? {
      reasonCode: report.reasonCode,
      reasonLabel: report.reasonLabel ?? importFileReportReasonLabel(report.reasonCode, language),
    } : {}),
  }));
}

function buildImportFileReportArtifact(
  files: SubmissionImportFileReportItem[],
  generatedAt: string,
): ImportFileReportArtifact {
  const statusCounts: Record<SubmissionImportFileReportStatus, number> = {
    success: 0,
    failed: 0,
    unsupported: 0,
    empty: 0,
  };

  for (const file of files) {
    statusCounts[file.status] += 1;
  }

  return {
    kind: 'loreguard.import-file-report.v1',
    scope: 'source-ingest-readiness',
    generatedAt,
    count: files.length,
    statusCounts,
    totalCandidateCount: files.reduce((sum, file) => sum + file.candidateCount, 0),
    files,
    limitation: '파일별 불러오기 처리 상태와 후보 수만 기록하며, 원문 본문과 민감한 작업노트는 포함하지 않습니다.',
  };
}

// ============================================================
// PART 7 — 메인 export
// ============================================================

/**
 * Submission Package 생성 — 4 artifact bundle.
 *
 * @throws Error('UNKNOWN_PROFILE') 잘못된 profileId
 * @throws Error('EMPTY_MANUSCRIPT') 원고 본문 0
 */
export async function buildSubmissionPackage(
  input: SubmissionPackageInput,
): Promise<SubmissionPackage> {
  const profile = DISTRIBUTION_PROFILES[input.profileId];
  if (!profile) throw new Error(`UNKNOWN_PROFILE: ${input.profileId}`);

  const view: CertificateView = profile.forcedView ?? profile.defaultView;
  const fmt = input.certificateFormat ?? 'html';

  // 1) buildCertificate — manuscript hash + seal number + sections
  const result = await buildCertificate({
    projectId: input.projectId,
    view,
    language: input.language,
    projectMeta: input.projectMeta,
    episodes: input.episodes,
    worldSummary: input.worldSummary,
    characters: input.characters,
    generatedBy: input.generatedBy,
  });

  // 2) Sources / events list (private bundle 일 때만)
  const [sources, events] = profile.includesSourceBundle
    ? await Promise.all([listSources(input.projectId), listCreativeEvents({ projectId: input.projectId })])
    : [[] as SourceRecord[], [] as CreativeEvent[]];

  const generatedAt = result.cert.generatedAt;
  const manuscriptHash = result.cert.manuscriptHash;
  const sealNumber = result.cert.sealNumber;
  const certId = result.cert.id;

  const artifacts: ArtifactDescriptor[] = [];

  // 3) Artifact 1 — manuscript-md
  const manuscriptContent = serializeManuscriptMarkdown(input.projectMeta, input.episodes, input.language);
  artifacts.push({
    id: 'manuscript-md',
    filename: `manuscript-${shortId(input.projectId)}.md`,
    mimeType: 'text/markdown;charset=utf-8',
    size: byteLength(manuscriptContent),
    content: manuscriptContent,
  });

  // 4) Artifact 2 — process-certificate
  const certContent =
    fmt === 'html'
      ? renderCertificateHtml(result.cert, result.sections, view, input.language)
      : renderCertificateMarkdown(result.cert, result.sections, view, input.language);
  artifacts.push({
    id: 'process-certificate',
    filename: `authorship-journal-${shortId(certId)}.${fmt}`,
    mimeType: fmt === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8',
    size: byteLength(certContent),
    content: certContent,
  });

  artifacts.push(buildPublicCertificateCardArtifact({
    cert: result.cert,
    projectName: input.projectMeta.name,
    authorName: input.projectMeta.authorName,
  }));

  // 5) Artifact 3 — source-bundle (선택)
  if (profile.includesSourceBundle) {
    const bundleJson = serializeSourceBundle(sources, events);
    artifacts.push({
      id: 'source-bundle',
      filename: `source-bundle-${shortId(certId)}.json`,
      mimeType: 'application/json;charset=utf-8',
      size: byteLength(bundleJson),
      content: bundleJson,
    });
  }

  const importFileReports = normalizeImportFileReports(input.importFileReports, input.language);
  if (importFileReports.length > 0) {
    const importReportJson = JSON.stringify(
      buildImportFileReportArtifact(importFileReports, generatedAt),
      null,
      2,
    );
    artifacts.push({
      id: 'import-file-report',
      filename: `import-file-report-${shortId(certId)}.json`,
      mimeType: 'application/json;charset=utf-8',
      size: byteLength(importReportJson),
      content: importReportJson,
    });
  }

  // 6) Artifact 4 — digital-signature
  if (profile.includesDigitalSignature) {
    const sigJson = serializeDigitalSignature({
      manuscriptHash,
      timelineHash: result.cert.timelineHash,
      sourceSummaryHash: result.cert.sourceSummaryHash,
      sealNumber,
      generatedAt,
      reportVersion: result.cert.reportVersion,
      certificateId: certId,
    });
    artifacts.push({
      id: 'digital-signature',
      filename: `signature-${shortId(certId)}.json`,
      mimeType: 'application/json;charset=utf-8',
      size: byteLength(sigJson),
      content: sigJson,
    });
  }

  artifacts.push(buildJurisdictionFormPackArtifact({
    packId: input.jurisdictionPackId ?? defaultLocalePackIdForLanguage(input.language),
    certId,
    generatedAt,
  }));

  if (input.releaseCredit) {
    artifacts.push(buildReleaseCreditPreviewArtifact({
      planId: input.releaseCredit.planId,
      packageProfileId: input.releaseCredit.packageProfileId,
      projectId: input.projectId,
      projectName: input.projectMeta.name,
      certId,
      generatedAt,
      availableCreditsOverride: input.releaseCredit.availableCreditsOverride,
    }));
  }

  if (input.coreCopyrightPackage?.content) {
    artifacts.push(buildCoreCopyrightPackageArtifact({
      content: input.coreCopyrightPackage.content,
      filename: input.coreCopyrightPackage.filename,
      certId,
    }));
  }

  artifacts.push(buildIpPackManifestArtifact({
    cert: result.cert,
    profileId: input.profileId,
    view,
    // regulatory-profile 은 ko/en 만 — CertificateLanguage(ja/zh) 는 en 으로 폴백(평가 로직은 언어 무관, 라벨만).
    language: input.language === 'ko' ? 'ko' : 'en',
    artifacts,
    sources,
    events,
    generatedBy: input.generatedBy,
    manifestStoreUri: input.ipPack?.manifestStoreUri,
    externalMaterialClusters: input.ipPack?.externalMaterialClusters,
    mediaFormGroups: input.ipPack?.mediaFormGroups,
    projectLedgerScope: input.ipPack?.projectLedgerScope ?? {
      projectId: input.projectId,
      projectScoped: true,
    },
  }));

  const totalSize = artifacts.reduce((acc, a) => acc + a.size, 0);

  return {
    id: `pkg_${certId}`,
    projectId: input.projectId,
    projectName: input.projectMeta.name,
    language: input.language,
    profile,
    view,
    recipientLabel: input.recipientLabel?.trim() || profile.label[input.language],
    generatedAt,
    artifacts,
    manuscriptHash,
    sealNumber,
    verificationUrl: result.cert.verificationUrl,
    verificationQrDataUrl: result.cert.verificationQrDataUrl,
    totalSize,
    certificateId: certId,
  };
}

// ============================================================
// PART 8 — Artifact 사이즈 계산 helpers
// ============================================================

function byteLength(s: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(s).length;
  }
  // SSR fallback — 약간의 부정확
  return s.length;
}

function shortId(id: string): string {
  return (id || 'unknown').slice(-8).replace(/[^a-zA-Z0-9_-]/g, '');
}

// ============================================================
// PART 9 — Artifact 4언어 라벨 (UI용)
// ============================================================

export const ARTIFACT_LABELS: Record<ArtifactId, Record<CertificateLanguage, string>> = {
  'manuscript-md': {
    ko: '본문 원고', en: 'Manuscript', ja: '本文原稿', zh: '正文原稿',
  },
  'manuscript-final-md': {
    ko: '최종 원고 기록본', en: 'Final Manuscript Record', ja: '最終原稿記録版', zh: '最终稿记录版',
  },
  'manuscript-final-clean-md': {
    ko: '제출용 정리 원고', en: 'Clean Submission Manuscript', ja: '提出用整理原稿', zh: '提交用清理稿',
  },
  'public-certificate-card': {
    ko: '공개용 과정기록 카드', en: 'Public Process Record Card', ja: '公開用過程記録カード', zh: '公开过程记录卡',
  },
  'process-certificate': {
    ko: '창작 과정 확인서', en: 'Authorship Journal', ja: '制作過程確認書', zh: '创作过程确认书',
  },
  'source-bundle': {
    ko: '출처 자료', en: 'Source Bundle', ja: '出典資料', zh: '来源资料',
  },
  'c2pa-ready-manifest': {
    ko: 'C2PA 준비 구성표', en: 'C2PA Ready Manifest', ja: 'C2PA準備構成表', zh: 'C2PA准备表',
  },
  'c2pa-preparation-note': {
    ko: 'C2PA 준비 메모', en: 'C2PA Preparation Note', ja: 'C2PA準備メモ', zh: 'C2PA准备备注',
  },
  'regulatory-readiness': {
    ko: '출고 기준 점검', en: 'Release Readiness Review', ja: '出荷基準点検', zh: '出库基准检查',
  },
  'jurisdiction-form-pack': {
    ko: '국가별 양식 패키지', en: 'Jurisdiction Form Pack', ja: '地域別フォームパック', zh: '地区表单包',
  },
  'release-credit-preview': {
    ko: '패키지 조건 미리보기', en: 'Package Condition Preview', ja: 'パッケージ条件プレビュー', zh: '包条件预览',
  },
  'import-file-report': {
    ko: '가져온 파일 기록', en: 'Imported File Report', ja: '読み込みファイル記録', zh: '导入文件记录',
  },
  'work-receipt-journal': {
    ko: '작업 영수증 기록', en: 'Work Receipt Journal', ja: '作業レシート記録', zh: '工作回执记录',
  },
  'final-clean-audit': {
    ko: '최종 정리 점검', en: 'Final Clean Audit', ja: '最終整理点検', zh: '最终清理检查',
  },
  'package-issuance-receipt': {
    ko: '출고 패키지 발급 기록', en: 'Package Issuance Receipt', ja: '出荷パッケージ発行記録', zh: '出库包签发记录',
  },
  'core-copyright-package': {
    ko: '코어 저작권 등록 준비 패키지', en: 'Core Copyright Prep Package', ja: '中核著作権登録準備パッケージ', zh: '核心版权登记准备包',
  },
  'ip-pack-manifest': {
    ko: '권리/IP 자산화 구성표', en: 'Rights/IP Pack Manifest', ja: '権利/IPパックマニフェスト', zh: '权利/IP包清单',
  },
  'digital-signature': {
    ko: '디지털 서명', en: 'Digital Signature', ja: 'デジタル署名', zh: '数字签名',
  },
};
