import { CERTIFICATE_OUTPUT_PROFILES } from './certificate-output-profile';
import { normalizePublicVerificationUrl } from './public-verification-url';
import type { CertRegistryEntry } from './registry-contract';
import type { ProcessCertificate } from './types';

export interface PublicCertificateCardPayload {
  kind: 'loreguard.public-certificate-card.v1';
  certificateId: string;
  projectId: string | null;
  generatedAt: string;
  display: {
    workTitle: string | null;
    authorName: string | null;
    sealNumber: string | null;
    verificationUrl: string | null;
    shortManuscriptHash: string | null;
    shortRecordHash: string | null;
    authorControlScore: number | null;
    recordLevelKo: string;
  };
  publicPolicy: {
    exposedFieldsKo: string[];
    excludedFieldsKo: string[];
    noManuscriptText: true;
    noPromptText: true;
    noSourceBodyText: true;
    noWorkReceiptText: true;
  };
  summaryKo: string;
}

function cleanOptionalText(value?: string | null, maxLength = 120): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function shortenHash(hash?: string | null): string | null {
  const cleaned = hash?.replace(/^0x/i, '').trim();
  if (!cleaned) return null;
  return `${cleaned.slice(0, 16)}...`;
}

function normalizeScore(score?: number | null): number | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Number(score.toFixed(1))));
}

export function getPublicRecordLevelKo(score?: number | null): string {
  const normalized = normalizeScore(score);
  if (normalized === null) return '과정기록 확인 필요';
  if (normalized >= 80) return '작가 주도 기록 높음';
  if (normalized >= 50) return '노아 보조 사용 기록';
  return '추가 검토 필요';
}

export function buildPublicCertificateCardPayload(input: {
  cert: ProcessCertificate;
  workTitle?: string | null;
  authorName?: string | null;
}): PublicCertificateCardPayload {
  const profile = CERTIFICATE_OUTPUT_PROFILES['reader-public-card'];
  const authorControlScore = normalizeScore(input.cert.hciPayload?.hci);

  return {
    kind: 'loreguard.public-certificate-card.v1',
    certificateId: input.cert.id,
    projectId: input.cert.projectId,
    generatedAt: input.cert.generatedAt,
    display: {
      workTitle: cleanOptionalText(input.workTitle),
      authorName: cleanOptionalText(input.authorName),
      sealNumber: cleanOptionalText(input.cert.sealNumber, 80),
      verificationUrl: cleanOptionalText(normalizePublicVerificationUrl(input.cert.verificationUrl), 240),
      shortManuscriptHash: shortenHash(input.cert.manuscriptHash),
      shortRecordHash: null,
      authorControlScore,
      recordLevelKo: getPublicRecordLevelKo(authorControlScore),
    },
    publicPolicy: {
      exposedFieldsKo: profile.exposedFieldsKo,
      excludedFieldsKo: profile.privateFieldsKo,
      noManuscriptText: true,
      noPromptText: true,
      noSourceBodyText: true,
      noWorkReceiptText: true,
    },
    summaryKo:
      '공개용 과정기록 카드는 작품 본문 없이 등록 메타, 축약 해시, 조회 링크만 보여주는 독자용 카드입니다.',
  };
}

export function buildPublicCertificateLookupCardPayload(input: {
  entry: CertRegistryEntry;
  verificationUrl?: string | null;
}): PublicCertificateCardPayload {
  const profile = CERTIFICATE_OUTPUT_PROFILES['reader-public-card'];

  return {
    kind: 'loreguard.public-certificate-card.v1',
    certificateId: input.entry.certId,
    projectId: null,
    generatedAt: input.entry.registeredAt,
    display: {
      workTitle: null,
      authorName: null,
      sealNumber: cleanOptionalText(input.entry.sealNumber, 80),
      verificationUrl: cleanOptionalText(normalizePublicVerificationUrl(input.verificationUrl), 240),
      shortManuscriptHash: null,
      shortRecordHash: shortenHash(input.entry.certHash),
      authorControlScore: null,
      recordLevelKo: getPublicRecordLevelKo(null),
    },
    publicPolicy: {
      exposedFieldsKo: profile.exposedFieldsKo,
      excludedFieldsKo: profile.privateFieldsKo,
      noManuscriptText: true,
      noPromptText: true,
      noSourceBodyText: true,
      noWorkReceiptText: true,
    },
    summaryKo:
      '공개 조회 카드는 레지스트리에 남은 등록 메타만 보여주며 원고 본문과 작업 원문은 표시하지 않습니다.',
  };
}

export function serializePublicCertificateCardForUserKo(payload: PublicCertificateCardPayload): string {
  const score =
    payload.display.authorControlScore === null
      ? '기록 없음'
      : `${payload.display.authorControlScore.toFixed(1)}%`;

  return [
    '# 공개용 과정기록 카드',
    '',
    `- 작품: ${payload.display.workTitle ?? '비공개'}`,
    `- 작가명: ${payload.display.authorName ?? '비공개'}`,
    `- 확인서 ID: ${payload.certificateId}`,
    `- 봉인번호: ${payload.display.sealNumber ?? '미발급'}`,
    `- 기록 시각: ${payload.generatedAt}`,
    `- 작가 결정 지수: ${score}`,
    `- 기록 단계: ${payload.display.recordLevelKo}`,
    `- 원고 해시 축약값: ${payload.display.shortManuscriptHash ?? '없음'}`,
    `- 과정기록 해시 축약값: ${payload.display.shortRecordHash ?? '없음'}`,
    `- 조회 링크: ${payload.display.verificationUrl ?? '없음'}`,
    '',
    '## 공개 항목',
    ...payload.publicPolicy.exposedFieldsKo.map((item) => `- ${item}`),
    '',
    '## 공개하지 않는 항목',
    ...payload.publicPolicy.excludedFieldsKo.map((item) => `- ${item}`),
    '',
    payload.summaryKo,
  ].join('\n');
}
