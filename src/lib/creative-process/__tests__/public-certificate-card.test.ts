import {
  buildPublicCertificateCardPayload,
  buildPublicCertificateLookupCardPayload,
  getPublicRecordLevelKo,
  serializePublicCertificateCardForUserKo,
} from '../public-certificate-card';
import type { ProcessCertificate } from '../types';

const fullHash = '1234567890abcdef'.repeat(4);

function makeCertificate(): ProcessCertificate {
  return {
    id: 'cert-public-card-1',
    projectId: 'project-public-card',
    manuscriptHash: fullHash,
    generatedAt: '2026-06-14T04:00:00.000Z',
    generatedBy: 'loreguard@test',
    reportVersion: '1.1.0',
    visibility: 'public',
    includedSections: [],
    summaryStats: {
      totalEpisodes: 1,
      totalUnits: 6400,
      unitLabel: 'chars',
      aiAssistUsed: false,
      externalImportCount: 0,
      humanRevisionCount: 7,
      externalStatus: '확인 가능',
    },
    timelineHash: 'a'.repeat(64),
    sourceSummaryHash: 'b'.repeat(64),
    limitationTextVersion: 'test',
    verificationUrl: 'https://example.test/verify/cert-public-card-1',
    sealNumber: 'LG-2606-0001-ABCD',
    hciPayload: {
      hci: 88.456,
      intent: 'verified',
      density: 'high',
      logic: 'validated',
      totalEvents: 42,
    },
  };
}

describe('public-certificate-card', () => {
  it('공개 카드 payload는 민감 본문 대신 공개 메타만 담는다', () => {
    const payload = buildPublicCertificateCardPayload({
      cert: makeCertificate(),
      workTitle: '  테스트 작품\n비공개 결말은 넘기지 않는다  ',
      authorName: '테스트 작가',
    });

    expect(payload.kind).toBe('loreguard.public-certificate-card.v1');
    expect(payload.display.authorControlScore).toBe(88.5);
    expect(payload.display.recordLevelKo).toBe('작가 주도 기록 높음');
    expect(payload.display.shortManuscriptHash).toBe('1234567890abcdef...');
    expect(JSON.stringify(payload)).not.toContain(fullHash);
    expect(payload.publicPolicy.noManuscriptText).toBe(true);
    expect(payload.publicPolicy.noPromptText).toBe(true);
    expect(payload.publicPolicy.noSourceBodyText).toBe(true);
    expect(payload.publicPolicy.noWorkReceiptText).toBe(true);
    expect(payload.publicPolicy.excludedFieldsKo).toEqual(
      expect.arrayContaining(['원고 전문', '출처 원문', '작업 영수증 원문']),
    );
  });

  it('공개 카드 문서는 한국어 라벨과 제외 항목을 분리해 출력한다', () => {
    const payload = buildPublicCertificateCardPayload({
      cert: makeCertificate(),
      workTitle: '테스트 작품',
      authorName: '테스트 작가',
    });

    const markdown = serializePublicCertificateCardForUserKo(payload);

    expect(markdown).toContain('# 공개용 과정기록 카드');
    expect(markdown).toContain('- 작품: 테스트 작품');
    expect(markdown).toContain('- 작가 결정 지수: 88.5%');
    expect(markdown).toContain('## 공개하지 않는 항목');
    expect(markdown).not.toContain(fullHash);
    expect(markdown).not.toMatch(/AI 생성|AI 채팅|인증|보증|완전 방어|WABI|WABI-R/);
  });

  it('레지스트리 조회용 공개 카드는 확인서 본문 없이 등록 메타만 담는다', () => {
    const payload = buildPublicCertificateLookupCardPayload({
      entry: {
        certId: 'cert-lookup-1',
        sealNumber: 'LG-2606-LOOKUP-ABCD',
        certHash: fullHash,
        registeredAt: '2026-06-14T05:00:00.000Z',
        visibility: 'public',
        issuerType: 'self',
      },
      verificationUrl: 'https://example.test/verify/cert-lookup-1',
    });

    const serialized = JSON.stringify(payload);
    expect(payload.projectId).toBeNull();
    expect(payload.display.shortManuscriptHash).toBeNull();
    expect(payload.display.shortRecordHash).toBe('1234567890abcdef...');
    expect(serialized).not.toContain(fullHash);
    expect(serialized).not.toMatch(/manuscriptText|promptText|sourceBodyText|workReceiptText/);
    expect(payload.summaryKo).toContain('등록 메타');
  });

  it('점수 경계값을 공개용 문구로 낮춰 표현한다', () => {
    expect(getPublicRecordLevelKo(null)).toBe('과정기록 확인 필요');
    expect(getPublicRecordLevelKo(81)).toBe('작가 주도 기록 높음');
    expect(getPublicRecordLevelKo(62)).toBe('노아 보조 사용 기록');
    expect(getPublicRecordLevelKo(10)).toBe('추가 검토 필요');
  });
});
