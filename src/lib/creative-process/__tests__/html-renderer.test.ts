// ============================================================
// html-renderer.test.ts — 3 view × 4 lang + XSS + external CSS
// ============================================================

import { renderCertificateHtml, escapeHtml } from '../html-renderer';
import { LIMITATION_TEXT_4LANG } from '../limitation-text';
import type { ProcessCertificate, CertificateLanguage, CertificateView } from '../types';
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
      totalEpisodes: 1,
      totalUnits: 100,
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
    'manuscript-info': { id: 'manuscript-info', title: 'Manuscript', rows: [{ key: 'eps', value: '1' }] },
    'world-baseline': null,
    'character-baseline': null,
    'ai-usage-summary': { id: 'ai-usage-summary', title: 'AI Usage', rows: [{ key: 'used', value: 'No' }] },
    'external-import': { id: 'external-import', title: 'Imports', rows: [{ key: 'count', value: '0' }] },
    'version-timeline': null,
    'author-choice-summary': null,
    'hash-and-export-time': { id: 'hash-and-export-time', title: 'Hash', rows: [{ key: 'h', value: 'abc' }] },
    'limitation-statement': { id: 'limitation-statement', title: 'Limit', rows: [{ key: '', value: LIMITATION_TEXT_4LANG[language] }] },
  };
}

describe('html-renderer — 3 view × 4 lang = 12 cases', () => {
  const views: Exclude<CertificateView, 'legal'>[] = ['public', 'publisher', 'private'];
  const languages: CertificateLanguage[] = ['ko', 'en', 'ja', 'zh'];

  it('모든 12 케이스에서 디스클레이머가 첫 줄 (H1 위)', () => {
    const cert = makeCert();
    for (const view of views) {
      for (const lang of languages) {
        const sections = makeSections(lang);
        const html = renderCertificateHtml(cert, sections, view, lang);
        const disclaimerIdx = html.indexOf(LIMITATION_TEXT_4LANG[lang]);
        const h1Idx = html.indexOf('<h1');
        expect(disclaimerIdx).toBeGreaterThan(-1);
        expect(h1Idx).toBeGreaterThan(-1);
        expect(disclaimerIdx).toBeLessThan(h1Idx);
      }
    }
  });

  it('모든 12 케이스에서 external CSS link 0건', () => {
    const cert = makeCert();
    for (const view of views) {
      for (const lang of languages) {
        const sections = makeSections(lang);
        const html = renderCertificateHtml(cert, sections, view, lang);
        expect(html).not.toContain('<link rel="stylesheet"');
        expect(html).not.toContain('@import url(');
      }
    }
  });

  it('legal view → 정상 렌더 (Round 2-3)', () => {
    const cert = makeCert();
    const html = renderCertificateHtml(cert, makeSections('ko'), 'legal', 'ko');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('disclaimer-first-line');
  });

  it('한국어 HTML 확인서의 씰 라벨은 한국어로 출력한다', () => {
    const cert = {
      ...makeCert(),
      sealNumber: 'LG-2606-0001-TEST',
    };
    const html = renderCertificateHtml(cert, makeSections('ko'), 'private', 'ko');

    expect(html).toContain('과정기록 씰 #LG-2606-0001-TEST');
    expect(html).not.toContain('Witness Seal #LG-2606-0001-TEST');
  });

  it('HTML 확인서 겉면은 원본 64자 해시 대신 축약 해시를 출력한다', () => {
    const cert = {
      ...makeCert(),
      verificationUrl: 'https://example.test/verify/TEST01ULID',
      verificationQrDataUrl: 'data:image/png;base64,TEST',
    };
    const html = renderCertificateHtml(cert, makeSections('ko'), 'private', 'ko');

    expect(html).toContain('원고 해시 축약값');
    expect(html).toContain('aaaaaaaaaaaaaaaa...aaaaaaaa');
    expect(html).not.toContain(`>${'a'.repeat(64)}<`);
    expect(html).toContain('QR for verification');
  });
});

describe('html-renderer — escapeHtml XSS 방어', () => {
  it('<script> 태그 → &lt;script&gt; escape', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('5종 escape (&, <, >, ", \')', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('XSS 입력이 렌더 결과에서 안전하게 escape', () => {
    const cert = makeCert();
    const sections = makeSections('ko');
    sections.overview!.rows.push({ key: 'evil', value: '<script>alert("xss")</script>' });
    const html = renderCertificateHtml(cert, sections, 'private', 'ko');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert');
  });

  it('null/undefined → 빈 문자열', () => {
    expect(escapeHtml(null as unknown as string)).toBe('');
    expect(escapeHtml(undefined as unknown as string)).toBe('');
  });
});
