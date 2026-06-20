// ============================================================
// markdown-renderer.test.ts — 디스클레이머 첫 줄 + escape
// ============================================================

import { renderCertificateMarkdown, escapeMarkdown } from '../markdown-renderer';
import { LIMITATION_TEXT_4LANG } from '../limitation-text';
import type { ProcessCertificate, CertificateLanguage } from '../types';
import type { SectionPayload } from '../report-builder';

function makeCert(): ProcessCertificate {
  return {
    id: 'TEST01ULID',
    projectId: 'prj-test',
    manuscriptHash: 'a'.repeat(64),
    generatedAt: '2026-05-07T13:00:00.000Z',
    generatedBy: 'loreguard@test',
    reportVersion: '1.0.0',
    visibility: 'private',
    includedSections: ['overview', 'limitation-statement'],
    summaryStats: {
      totalEpisodes: 0,
      totalUnits: 0,
      unitLabel: 'chars',
      aiAssistUsed: false,
      externalImportCount: 0,
      humanRevisionCount: 0,
      externalStatus: '확인 가능',
    },
    timelineHash: 'b'.repeat(64),
    sourceSummaryHash: 'c'.repeat(64),
    limitationTextVersion: '1.0.0',
  };
}

function makeSections(language: CertificateLanguage): Record<SectionPayload['id'], SectionPayload | null> {
  return {
    'overview': { id: 'overview', title: 'Overview', rows: [{ key: 'name', value: 'Test' }] },
    'manuscript-info': null,
    'world-baseline': null,
    'character-baseline': null,
    'ai-usage-summary': null,
    'external-import': null,
    'version-timeline': null,
    'author-choice-summary': null,
    'hash-and-export-time': null,
    'limitation-statement': { id: 'limitation-statement', title: 'Limit', rows: [{ key: '', value: LIMITATION_TEXT_4LANG[language] }] },
  };
}

describe('markdown-renderer — 첫 줄 디스클레이머 (4언어)', () => {
  const languages: CertificateLanguage[] = ['ko', 'en', 'ja', 'zh'];

  it('4언어 모두 첫 줄 = "> ${LIMITATION_TEXT}"', () => {
    const cert = makeCert();
    for (const lang of languages) {
      const md = renderCertificateMarkdown(cert, makeSections(lang), 'private', lang);
      const firstLine = md.split('\n')[0];
      expect(firstLine).toBe(`> ${LIMITATION_TEXT_4LANG[lang]}`);
    }
  });

  it('legal view → 정상 렌더 (Round 2-3)', () => {
    const cert = makeCert();
    const md = renderCertificateMarkdown(cert, makeSections('ko'), 'legal', 'ko');
    expect(md.split('\n')[0]).toMatch(/^> /); // 첫 줄 디스클레이머 blockquote
    expect(md).toContain('# ');
  });

  it('확인서 공개 조회 주소는 사용자용 /verify 경로로 출력한다', () => {
    const cert = {
      ...makeCert(),
      verificationUrl: 'https://example.test/api/cp/verify/TEST01ULID?lookup=true',
    };
    const md = renderCertificateMarkdown(cert, makeSections('ko'), 'private', 'ko');

    expect(md).toContain('https://example.test/verify/TEST01ULID');
    expect(md).not.toContain('/api/cp/verify');
  });

  it('한국어 확인서의 주요 양식 라벨은 영어 제목을 기본 노출하지 않는다', () => {
    const cert = {
      ...makeCert(),
      sealNumber: 'LG-2606-0001-TEST',
      hciPayload: {
        hci: 88,
        intent: 'verified',
        density: 'high',
        logic: 'validated',
        totalEvents: 4,
      },
      attestationStatement: '본 작품은 작가의 결정과 수정 과정을 기준으로 기록되었습니다.',
      verificationUrl: 'https://example.test/api/cp/verify/TEST01ULID',
    } satisfies ProcessCertificate;
    const md = renderCertificateMarkdown(cert, makeSections('ko'), 'private', 'ko');

    expect(md).toContain('## 창작 과정 진술');
    expect(md).toContain('## 과정기록 씰');
    expect(md).toContain('## 작가 통제 지수(HCI)');
    expect(md).toContain('**조회 링크**: https://example.test/verify/TEST01ULID');
    expect(md).toContain('**보기 범위**: private');
    expect(md).toContain('| 항목 | 내용 |');
    expect(md).not.toContain('ATTESTATION OF GENESIS');
    expect(md).not.toContain('Witness Seal');
    expect(md).not.toContain('Human Control Index');
    expect(md).not.toContain('Verify URL');
    expect(md).not.toContain('| Key | Value |');
    expect(md).not.toContain('**Generated**');
  });
});

describe('markdown-renderer — escapeMarkdown', () => {
  it('백틱 escape: ` → \\`', () => {
    expect(escapeMarkdown('`code`')).toBe('\\`code\\`');
  });

  it('파이프 escape: | → \\|', () => {
    expect(escapeMarkdown('a | b')).toBe('a \\| b');
  });

  it('별표·언더스코어 escape', () => {
    expect(escapeMarkdown('*bold*')).toBe('\\*bold\\*');
    expect(escapeMarkdown('_italic_')).toBe('\\_italic\\_');
  });

  it('줄바꿈 → 공백 (table cell 안전)', () => {
    expect(escapeMarkdown('line1\nline2')).toBe('line1 line2');
  });

  it('null/undefined → 빈 문자열', () => {
    expect(escapeMarkdown(null as unknown as string)).toBe('');
    expect(escapeMarkdown(undefined as unknown as string)).toBe('');
  });
});
