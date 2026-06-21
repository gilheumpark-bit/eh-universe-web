import {
  buildExportPackageProfilePlan,
  EXPORT_PACKAGE_PROFILES,
  labelExportArtifactKo,
  listExportPackageProfiles,
} from '../export-package-profile';

describe('export-package-profile', () => {
  it('공개용·제출용·IP 자산화·내부 보관용 4종을 제공한다', () => {
    expect(listExportPackageProfiles().map((profile) => profile.id)).toEqual([
      'public-reader',
      'external-submission',
      'ip-sale',
      'internal-archive',
    ]);
  });

  it('공개용은 본문·출처·작업영수증을 비공개 경계로 둔다', () => {
    const profile = EXPORT_PACKAGE_PROFILES['public-reader'];

    expect(profile.mappedDistributionProfile).toBe('platform');
    expect(profile.requiredArtifactIds).toEqual(['public-certificate-card', 'digital-signature']);
    expect(profile.privateArtifactIds).toEqual(
      expect.arrayContaining(['manuscript-md', 'process-certificate', 'source-bundle', 'work-receipt-journal']),
    );
  });

  it('IP 자산화는 권리/IP 구성표를 필수로 요구한다', () => {
    const plan = buildExportPackageProfilePlan({
      profileId: 'ip-sale',
      availableArtifactIds: ['process-certificate', 'digital-signature'],
    });

    expect(plan.status).toBe('hold');
    expect(plan.missingRequired).toEqual(['ip-pack-manifest']);
    expect(plan.summaryKo).toContain('필수 항목 1건');
  });

  it('제출용은 필수 항목이 있으면 권장 항목 누락만 review로 둔다', () => {
    const plan = buildExportPackageProfilePlan({
      profileId: 'external-submission',
      availableArtifactIds: [
        'manuscript-final-clean-md',
        'process-certificate',
        'digital-signature',
      ],
    });

    expect(plan.status).toBe('review');
    expect(plan.missingRequired).toHaveLength(0);
    expect(plan.missingRecommended).toEqual(
      expect.arrayContaining([
        'jurisdiction-form-pack',
        'final-clean-audit',
        'regulatory-readiness',
        'package-issuance-receipt',
      ]),
    );
  });

  it('출고 산출물 이름은 사용자 화면용 한글 라벨로 제공한다', () => {
    expect(labelExportArtifactKo('public-certificate-card')).toBe('공개용 과정기록 카드');
    expect(labelExportArtifactKo('jurisdiction-form-pack')).toBe('국가별 양식 패키지');
    expect(labelExportArtifactKo('ip-pack-manifest')).toBe('권리/IP 자산화 구성표');
    expect(labelExportArtifactKo('work-receipt-journal')).toBe('작업 영수증 기록');
  });

  it('내부 보관용은 전체 기록 보존 profile로 private-archive에 매핑된다', () => {
    const profile = EXPORT_PACKAGE_PROFILES['internal-archive'];

    expect(profile.mappedDistributionProfile).toBe('private-archive');
    expect(profile.requiredArtifactIds).toEqual(
      expect.arrayContaining(['manuscript-md', 'process-certificate', 'source-bundle', 'digital-signature']),
    );
    expect(profile.privateArtifactIds).toHaveLength(0);
  });
});
