import type { ArtifactId, DistributionProfileId } from './submission-package';

export type ExportPackageProfileId =
  | 'public-reader'
  | 'external-submission'
  | 'ip-sale'
  | 'internal-archive';

export type ExportPackageAudience =
  | 'reader'
  | 'judge-or-publisher'
  | 'media-buyer'
  | 'author-internal';

export type ExportPackagePlanStatus = 'ready' | 'review' | 'hold';

export interface ExportPackageProfile {
  id: ExportPackageProfileId;
  labelKo: string;
  shortLabelKo: string;
  audience: ExportPackageAudience;
  audienceKo: string;
  purposeKo: string;
  mappedDistributionProfile: DistributionProfileId;
  requiredArtifactIds: ArtifactId[];
  recommendedArtifactIds: ArtifactId[];
  privateArtifactIds: ArtifactId[];
  publicSummaryKo: string;
  boundaryKo: string;
}

export interface ExportPackageProfilePlanItem {
  id: ArtifactId;
  required: boolean;
  available: boolean;
  roleKo: string;
}

export interface ExportPackageProfilePlan {
  profile: ExportPackageProfile;
  status: ExportPackagePlanStatus;
  requiredItems: ExportPackageProfilePlanItem[];
  recommendedItems: ExportPackageProfilePlanItem[];
  privateItems: ExportPackageProfilePlanItem[];
  missingRequired: ArtifactId[];
  missingRecommended: ArtifactId[];
  summaryKo: string;
}

export const EXPORT_PACKAGE_PROFILES: Record<ExportPackageProfileId, ExportPackageProfile> = {
  'public-reader': {
    id: 'public-reader',
    labelKo: '공개용',
    shortLabelKo: '공개',
    audience: 'reader',
    audienceKo: '독자·외부 열람자',
    purposeKo: '작품 본문을 공개하지 않고 과정기록의 존재와 검증 링크만 보여줍니다.',
    mappedDistributionProfile: 'platform',
    requiredArtifactIds: ['public-certificate-card', 'digital-signature'],
    recommendedArtifactIds: ['ip-pack-manifest'],
    privateArtifactIds: ['manuscript-md', 'manuscript-final-md', 'process-certificate', 'source-bundle', 'work-receipt-journal'],
    publicSummaryKo: '독자에게 보여줄 최소 공개 카드와 QR 확인용 패키지입니다.',
    boundaryKo: '본문 전문, 프롬프트, 출처 원문, 작업노트 원문은 공개하지 않습니다.',
  },
  'external-submission': {
    id: 'external-submission',
    labelKo: '제출용',
    shortLabelKo: '제출',
    audience: 'judge-or-publisher',
    audienceKo: '심사·출판·플랫폼 담당자',
    purposeKo: '정리 원고와 과정기록, 출고 점검 결과를 함께 제출합니다.',
    mappedDistributionProfile: 'publisher',
    requiredArtifactIds: ['manuscript-final-clean-md', 'process-certificate', 'digital-signature'],
    recommendedArtifactIds: [
      'jurisdiction-form-pack',
      'final-clean-audit',
      'regulatory-readiness',
      'release-credit-preview',
      'package-issuance-receipt',
    ],
    privateArtifactIds: ['source-bundle', 'work-receipt-journal', 'manuscript-final-md'],
    publicSummaryKo: '심사자가 읽을 원고와 제출 근거를 묶는 기본 출고 패키지입니다.',
    boundaryKo: '출처 자료와 내부 작업 영수증은 요청 또는 계약 조건이 있을 때만 별도 첨부합니다.',
  },
  'ip-sale': {
    id: 'ip-sale',
    labelKo: 'IP 자산화',
    shortLabelKo: 'IP',
    audience: 'media-buyer',
    audienceKo: '웹툰·영상·게임·해외화 검토자',
    purposeKo: '원고 전문보다 권리/IP 요약, 매체전환성, 리스크 점검을 우선 제공합니다.',
    mappedDistributionProfile: 'publisher',
    requiredArtifactIds: ['ip-pack-manifest', 'process-certificate', 'digital-signature'],
    recommendedArtifactIds: ['jurisdiction-form-pack', 'regulatory-readiness', 'release-credit-preview', 'final-clean-audit'],
    privateArtifactIds: ['source-bundle', 'work-receipt-journal', 'manuscript-md'],
    publicSummaryKo: '매체 전환과 라이선스 협상을 위한 권리/IP 중심 패키지입니다.',
    boundaryKo: '원고 전문과 내부 작업노트는 거래 단계와 비밀유지 조건에 맞춰 분리합니다.',
  },
  'internal-archive': {
    id: 'internal-archive',
    labelKo: '내부 보관용',
    shortLabelKo: '보관',
    audience: 'author-internal',
    audienceKo: '작가·팀 내부',
    purposeKo: '나중에 분쟁, 재출고, IP 판매를 다시 열 수 있도록 전체 기록을 보관합니다.',
    mappedDistributionProfile: 'private-archive',
    requiredArtifactIds: ['manuscript-md', 'process-certificate', 'source-bundle', 'digital-signature'],
    recommendedArtifactIds: [
      'manuscript-final-md',
      'manuscript-final-clean-md',
      'work-receipt-journal',
      'ip-pack-manifest',
      'final-clean-audit',
      'release-credit-preview',
      'package-issuance-receipt',
    ],
    privateArtifactIds: [],
    publicSummaryKo: '작가 계정 또는 팀 저장소에 남기는 전체 보관 패키지입니다.',
    boundaryKo: '외부 공유용이 아니라 내부 복구와 증빙 재생성을 위한 보관본입니다.',
  },
};

export const EXPORT_ARTIFACT_ROLE_KO: Record<ArtifactId, string> = {
  'manuscript-md': '본문 원고',
  'manuscript-final-md': '최종 원고 기록본',
  'manuscript-final-clean-md': '제출용 정리 원고',
  'public-certificate-card': '공개용 과정기록 카드',
  'process-certificate': '창작 과정 확인서',
  'source-bundle': '출처 자료',
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

export function labelExportArtifactKo(id: ArtifactId): string {
  return EXPORT_ARTIFACT_ROLE_KO[id] ?? id;
}

function buildItems(
  ids: readonly ArtifactId[],
  available: ReadonlySet<ArtifactId>,
  required: boolean,
): ExportPackageProfilePlanItem[] {
  return ids.map((id) => ({
    id,
    required,
    available: available.has(id),
    roleKo: labelExportArtifactKo(id),
  }));
}

export function listExportPackageProfiles(): ExportPackageProfile[] {
  return (Object.keys(EXPORT_PACKAGE_PROFILES) as ExportPackageProfileId[]).map(
    (id) => EXPORT_PACKAGE_PROFILES[id],
  );
}

export function buildExportPackageProfilePlan(input: {
  profileId: ExportPackageProfileId;
  availableArtifactIds?: readonly ArtifactId[];
}): ExportPackageProfilePlan {
  const profile = EXPORT_PACKAGE_PROFILES[input.profileId];
  const available = new Set(input.availableArtifactIds ?? []);
  const missingRequired = profile.requiredArtifactIds.filter((id) => !available.has(id));
  const missingRecommended = profile.recommendedArtifactIds.filter((id) => !available.has(id));
  const status: ExportPackagePlanStatus =
    missingRequired.length > 0 ? 'hold' : missingRecommended.length > 0 ? 'review' : 'ready';

  return {
    profile,
    status,
    requiredItems: buildItems(profile.requiredArtifactIds, available, true),
    recommendedItems: buildItems(profile.recommendedArtifactIds, available, false),
    privateItems: buildItems(profile.privateArtifactIds, available, false),
    missingRequired,
    missingRecommended,
    summaryKo:
      status === 'ready'
        ? `${profile.labelKo} 패키지 필수·권장 항목이 준비되었습니다.`
        : status === 'review'
          ? `${profile.labelKo} 패키지 필수 항목은 준비되었고 권장 항목 ${missingRecommended.length}건이 남았습니다.`
          : `${profile.labelKo} 패키지 필수 항목 ${missingRequired.length}건이 남았습니다.`,
  };
}
