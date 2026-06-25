import {
  buildCertificateOutputPlan,
  CERTIFICATE_OUTPUT_PROFILES,
  selectCertificateOutputProfile,
} from '../certificate-output-profile';

describe('certificate-output-profile', () => {
  it('독자 공개 카드는 public view와 공개용 출고 구성에 연결된다', () => {
    const profile = CERTIFICATE_OUTPUT_PROFILES['reader-public-card'];

    expect(profile.certificateView).toBe('public');
    expect(profile.packageProfileId).toBe('public-reader');
    expect(profile.visualMode).toBe('compact-card');
    expect(profile.privateFieldsKo).toEqual(expect.arrayContaining(['원고 전문', '작가 개인 메모']));
  });

  it('제출용 확인서는 publisher view와 제출용 출고 구성에 연결된다', () => {
    const profile = CERTIFICATE_OUTPUT_PROFILES['submission-certificate'];

    expect(profile.certificateView).toBe('publisher');
    expect(profile.packageProfileId).toBe('external-submission');
    expect(profile.visualMode).toBe('full-document');
    expect(profile.exposedFieldsKo).toEqual(expect.arrayContaining(['세계관 기준선 요약', '수정·승인 흐름']));
  });

  it('출고 구성에서 확인 문서 profile을 선택한다', () => {
    expect(selectCertificateOutputProfile('public-reader')).toBe('reader-public-card');
    expect(selectCertificateOutputProfile('ip-sale')).toBe('submission-certificate');
    expect(selectCertificateOutputProfile('internal-archive')).toBe('submission-certificate');
  });

  it('공개 카드는 QR 링크가 없어도 review로 두고 본문 공개는 하지 않는다', () => {
    const plan = buildCertificateOutputPlan({
      profileId: 'reader-public-card',
      hasVerificationUrl: false,
      hasSealNumber: true,
      availableArtifactIds: [
        'manuscript-final-clean-md',
        'public-certificate-card',
        'process-certificate',
        'source-bundle',
        'work-receipt-journal',
        'digital-signature',
      ],
    });

    expect(plan.status).toBe('review');
    expect(plan.qrStatus).toBe('missing');
    expect(plan.missingKo).toEqual(['QR 조회 링크']);
    expect(plan.privateFieldsKo).toContain('원고 전문');
    expect(plan.includedArtifactIds).toEqual(['public-certificate-card', 'digital-signature']);
    expect(plan.excludedArtifactIds).toEqual(expect.arrayContaining([
      'manuscript-final-clean-md',
      'process-certificate',
      'source-bundle',
      'work-receipt-journal',
    ]));
    expect(plan.rightsLedgerMode).toBe('summary-only');
    expect(plan.safetyPolicyKo).toContain('구조적으로 제외');
  });

  it('제출용 확인서는 QR 링크와 봉인번호가 모두 없으면 missing으로 둔다', () => {
    const plan = buildCertificateOutputPlan({
      profileId: 'submission-certificate',
      hasVerificationUrl: false,
      hasSealNumber: false,
    });

    expect(plan.status).toBe('missing');
    expect(plan.missingKo).toEqual(['QR 조회 링크', '봉인번호']);
  });

  it('제출용 확인서는 권리 원장 상세를 선택 첨부할 수 있다', () => {
    const plan = buildCertificateOutputPlan({
      profileId: 'submission-certificate',
      verificationUrl: 'https://example.test/api/cp/verify/cert-1',
      sealNumber: 'LG-2606-0001-ABCD',
      includeRightsLedgerDetail: true,
      rightsLedgerAttachmentCreditKo: '권리/IP 자산화 Pack Pro · 필요 30개',
      availableArtifactIds: [
        'manuscript-final-clean-md',
        'process-certificate',
        'source-bundle',
        'work-receipt-journal',
        'digital-signature',
      ],
    });

    expect(plan.status).toBe('ready');
    expect(plan.verificationUrl).toBe('https://example.test/verify/cert-1');
    expect(plan.sealNumber).toBe('LG-2606-0001-ABCD');
    expect(plan.missingKo).toEqual([]);
    expect(plan.rightsLedgerMode).toBe('detail-allowed');
    expect(plan.rightsLedgerPolicyKo).toContain('상세를 선택 첨부');
    expect(plan.rightsLedgerPolicyKo).toContain('권리/IP 자산화 Pack Pro · 필요 30개');
    expect(plan.includedArtifactIds).toEqual([
      'manuscript-final-clean-md',
      'process-certificate',
      'digital-signature',
    ]);
    expect(plan.excludedArtifactIds).toEqual(['source-bundle', 'work-receipt-journal', 'manuscript-final-md']);
  });
});
