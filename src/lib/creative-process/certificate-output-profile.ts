import type { ArtifactId } from './submission-package';
import type { CertificateView } from './types';
import type { ExportPackageProfileId } from './export-package-profile';
import { normalizePublicVerificationUrl } from './public-verification-url';

export type CertificateOutputProfileId =
  | 'reader-public-card'
  | 'submission-certificate';

export type CertificateQrPolicy = 'public-lookup' | 'recipient-review';
export type CertificateOutputStatus = 'ready' | 'review' | 'missing';
export type RightsLedgerAttachmentMode = 'summary-only' | 'detail-allowed';

export interface CertificateOutputProfile {
  id: CertificateOutputProfileId;
  labelKo: string;
  shortLabelKo: string;
  certificateView: CertificateView;
  packageProfileId: ExportPackageProfileId;
  qrPolicy: CertificateQrPolicy;
  visualMode: 'compact-card' | 'full-document';
  defaultArtifactIds: ArtifactId[];
  exposedFieldsKo: string[];
  privateFieldsKo: string[];
  purposeKo: string;
  boundaryKo: string;
}

export interface CertificateOutputPlan {
  profile: CertificateOutputProfile;
  status: CertificateOutputStatus;
  qrStatus: CertificateOutputStatus;
  verificationUrl: string | null;
  sealNumber: string | null;
  exposedFieldsKo: string[];
  privateFieldsKo: string[];
  missingKo: string[];
  includedArtifactIds: ArtifactId[];
  excludedArtifactIds: ArtifactId[];
  includedArtifactsKo: string[];
  excludedArtifactsKo: string[];
  rightsLedgerMode: RightsLedgerAttachmentMode;
  rightsLedgerPolicyKo: string;
  safetyPolicyKo: string;
  summaryKo: string;
}

const ARTIFACT_LABEL_KO: Record<ArtifactId, string> = {
  'manuscript-md': '본문 원고',
  'manuscript-final-md': '최종 원고 기록본',
  'manuscript-final-clean-md': '제출용 정리 원고',
  'public-certificate-card': '공개용 과정기록 카드',
  'process-certificate': '창작 과정 확인서',
  'source-bundle': '출처 자료 묶음',
  'c2pa-ready-manifest': 'C2PA 준비 구성표',
  'c2pa-preparation-note': 'C2PA 준비 메모',
  'regulatory-readiness': '출고 기준 점검',
  'jurisdiction-form-pack': '국가별 양식 패키지',
  'release-credit-preview': '패키지 조건 미리보기',
  'import-file-report': '가져온 파일 기록',
  'work-receipt-journal': '작업 영수증 기록',
  'final-clean-audit': '최종 정리 점검',
  'package-issuance-receipt': '출고 패키지 발급 기록',
  'core-copyright-package': '코어 저작권 등록 준비 패키지',
  'ip-pack-manifest': '권리/IP 자산화 구성표',
  'digital-signature': '디지털 서명',
};

const PUBLIC_CARD_FORBIDDEN_ARTIFACT_IDS: ArtifactId[] = [
  'manuscript-md',
  'manuscript-final-md',
  'manuscript-final-clean-md',
  'process-certificate',
  'source-bundle',
  'work-receipt-journal',
  'import-file-report',
  'final-clean-audit',
  'jurisdiction-form-pack',
  'release-credit-preview',
];

function uniqueArtifacts(ids: readonly ArtifactId[]): ArtifactId[] {
  return Array.from(new Set(ids));
}

function artifactLabelsKo(ids: readonly ArtifactId[]): string[] {
  return ids.map((id) => ARTIFACT_LABEL_KO[id]);
}

export const CERTIFICATE_OUTPUT_PROFILES: Record<CertificateOutputProfileId, CertificateOutputProfile> = {
  'reader-public-card': {
    id: 'reader-public-card',
    labelKo: '독자 공개 카드',
    shortLabelKo: '공개 카드',
    certificateView: 'public',
    packageProfileId: 'public-reader',
    qrPolicy: 'public-lookup',
    visualMode: 'compact-card',
    defaultArtifactIds: ['public-certificate-card', 'digital-signature'],
    exposedFieldsKo: [
      '확인서 ID',
      '봉인번호',
      '등록 시각',
      '공개 범위',
      '원고 해시 축약값',
      '과정기록 요약',
      'QR 조회 링크',
    ],
    privateFieldsKo: [
      '원고 전문',
      '프롬프트 전문',
      '출처 원문',
      '작업 영수증 원문',
      '비공개 플롯',
      '작가 개인 메모',
    ],
    purposeKo: '독자와 외부 열람자가 원고 본문 없이 과정기록 존재와 등록 메타만 확인하는 카드입니다.',
    boundaryKo: '공개 카드는 신뢰 신호용이며 제출 심사 자료를 대체하지 않습니다.',
  },
  'submission-certificate': {
    id: 'submission-certificate',
    labelKo: '제출용 확인서',
    shortLabelKo: '제출 문서',
    certificateView: 'publisher',
    packageProfileId: 'external-submission',
    qrPolicy: 'recipient-review',
    visualMode: 'full-document',
    defaultArtifactIds: ['manuscript-final-clean-md', 'process-certificate', 'digital-signature'],
    exposedFieldsKo: [
      '작품명',
      '작가명',
      '확인서 ID',
      '봉인번호',
      '등록 시각',
      '원고 해시',
      '세계관 기준선 요약',
      '캐릭터·설정 요약',
      '수정·승인 흐름',
      '출고 점검 요약',
    ],
    privateFieldsKo: [
      '비공개 폐기 아이디어',
      '개인 작업노트 전문',
      '민감 출처 원문',
      '계약 전용 메모',
    ],
    purposeKo: '심사·출판·플랫폼 담당자가 원고와 과정기록을 함께 검토하는 제출 문서입니다.',
    boundaryKo: '제출용 문서는 수신자 검토 자료이며 권리 귀속 판단은 계약·법무 검토와 분리합니다.',
  },
};

export function selectCertificateOutputProfile(
  packageProfileId: ExportPackageProfileId,
): CertificateOutputProfileId {
  if (packageProfileId === 'public-reader') return 'reader-public-card';
  return 'submission-certificate';
}

export function buildCertificateOutputPlan(input: {
  profileId: CertificateOutputProfileId;
  hasVerificationUrl?: boolean;
  hasSealNumber?: boolean;
  verificationUrl?: string | null;
  sealNumber?: string | null;
  availableArtifactIds?: readonly ArtifactId[];
  includeRightsLedgerDetail?: boolean;
  rightsLedgerAttachmentCreditKo?: string;
}): CertificateOutputPlan {
  const profile = CERTIFICATE_OUTPUT_PROFILES[input.profileId];
  const missingKo: string[] = [];
  const verificationUrl = normalizePublicVerificationUrl(input.verificationUrl);
  const sealNumber = input.sealNumber?.trim() || null;
  const hasVerificationUrl = Boolean(verificationUrl) || Boolean(input.hasVerificationUrl);
  const hasSealNumber = Boolean(sealNumber) || Boolean(input.hasSealNumber);
  if (!hasVerificationUrl) missingKo.push('QR 조회 링크');
  if (!hasSealNumber) missingKo.push('봉인번호');
  const availableArtifacts = input.availableArtifactIds ? new Set(input.availableArtifactIds) : null;
  const defaultIncluded = availableArtifacts
    ? profile.defaultArtifactIds.filter((id) => availableArtifacts.has(id))
    : profile.defaultArtifactIds;
  const includedArtifactIds =
    profile.id === 'reader-public-card'
      ? defaultIncluded.filter((id) => !PUBLIC_CARD_FORBIDDEN_ARTIFACT_IDS.includes(id))
      : defaultIncluded;
  const excludedArtifactIds: ArtifactId[] =
    profile.id === 'reader-public-card'
      ? PUBLIC_CARD_FORBIDDEN_ARTIFACT_IDS
      : profile.privateFieldsKo.includes('민감 출처 원문')
        ? ['source-bundle', 'work-receipt-journal', 'manuscript-final-md']
        : [];
  const rightsLedgerMode: RightsLedgerAttachmentMode =
    profile.id === 'reader-public-card' ? 'summary-only' : 'detail-allowed';
  const rightsLedgerCreditKo = input.rightsLedgerAttachmentCreditKo?.trim();
  const rightsLedgerPolicyKo =
    rightsLedgerMode === 'summary-only'
      ? '권리 원장은 항목 수와 상태 요약만 공개하고 상세 메모는 공개 카드에서 제외합니다.'
      : input.includeRightsLedgerDetail
        ? `제출용 문서에 권리 원장 상세를 선택 첨부합니다.${rightsLedgerCreditKo ? ` ${rightsLedgerCreditKo} 기준으로 출고 전 확인합니다.` : ''}`
        : `권리 원장 상세는 제출용 문서에서만 선택 첨부할 수 있습니다.${rightsLedgerCreditKo ? ` ${rightsLedgerCreditKo} 기준으로 출고 전 확인합니다.` : ''}`;
  const safetyPolicyKo =
    profile.id === 'reader-public-card'
      ? '공개 카드 빌더는 본문, 출처 원문, 작업 영수증 원문, 제출용 정리 원고를 구조적으로 제외합니다.'
      : '제출용 문서는 수신자 검토 범위에 맞춰 정리 원고와 과정기록을 묶고 민감 출처 원문은 별도 조건으로 분리합니다.';

  const qrStatus: CertificateOutputStatus = hasVerificationUrl ? 'ready' : 'missing';
  const status: CertificateOutputStatus =
    missingKo.length === 0 ? 'ready' : profile.id === 'reader-public-card' ? 'review' : 'missing';

  return {
    profile,
    status,
    qrStatus,
    verificationUrl,
    sealNumber,
    exposedFieldsKo: profile.exposedFieldsKo,
    privateFieldsKo: profile.privateFieldsKo,
    missingKo,
    includedArtifactIds: uniqueArtifacts(includedArtifactIds),
    excludedArtifactIds: uniqueArtifacts(excludedArtifactIds),
    includedArtifactsKo: artifactLabelsKo(uniqueArtifacts(includedArtifactIds)),
    excludedArtifactsKo: artifactLabelsKo(uniqueArtifacts(excludedArtifactIds)),
    rightsLedgerMode,
    rightsLedgerPolicyKo,
    safetyPolicyKo,
    summaryKo:
      status === 'ready'
        ? `${profile.labelKo} 출력 준비가 완료되었습니다.`
        : `${profile.labelKo} 출력 전 ${missingKo.join('·')} 항목을 확인해 주세요.`,
  };
}
