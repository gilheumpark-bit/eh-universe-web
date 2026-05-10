// ============================================================
// HTML Renderer — 3 view × 4언어 self-contained HTML 생성
// ============================================================
//
// 출력: <!doctype html> 단일 파일. external CSS link 0건.
// XSS escape 강제 (모든 user-controlled 데이터 통과).
// 디스클레이머 첫 줄 H1 위에 강제.
//
// 사상 정합:
//   - 14차 §3 엄밀성 시장 — 첫 줄 디스클레이머로 책임 명시
//   - 4차 §3 "조회 가능한 시스템" — self-contained 다운로드용
// ============================================================

import type { CertificateLanguage, CertificateView, ProcessCertificate } from './types';
import type { SectionPayload } from './report-builder';
import { CERTIFICATE_LABELS } from './types';
import { LIMITATION_TEXT_4LANG } from './limitation-text';
// [Visual Charter v1.0 — 2026-05-10] 시각 헌법 통합
import { buildCSSVarsString, buildCertificateBaseCSS } from './visual-tokens';
import { buildWitnessSealSVG, buildOriginDonutSVG } from './seal-issuer';
import { ATTESTATION_LABELS, SIGNATURE_DISCLAIMER_4LANG } from './attestation-text';
import { HCI_DISCLAIMER_4LANG, HCI_AXIS_LABELS, ORIGIN_CATEGORY_LABELS } from './hci-calculator';

// ============================================================
// PART 1 — XSS escape
// ============================================================

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * 모든 user-controlled 데이터 통과 의무.
 * label / note / fileName / url / project name / character name 등.
 */
export function escapeHtml(s: string): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPE[c] || c);
}

// ============================================================
// PART 2 — CJK 폰트 inline (외부 link 0건)
// ============================================================

function fontFamilyFor(language: CertificateLanguage): string {
  switch (language) {
    case 'ko':
      return "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif";
    case 'ja':
      return "'Noto Sans JP', 'Hiragino Sans', -apple-system, sans-serif";
    case 'zh':
      return "'Noto Sans SC', 'PingFang SC', -apple-system, sans-serif";
    case 'en':
    default:
      return "-apple-system, 'Segoe UI', Roboto, sans-serif";
  }
}

// ============================================================
// PART 3 — view 별 섹션 화이트리스트
// ============================================================

// [Round 2-3 — 2026-05-07] legal view 추가 (분쟁 대응 자료)
const VIEW_SECTIONS: Record<CertificateView, ReadonlyArray<SectionPayload['id']>> = {
  public: [
    'overview',
    'manuscript-info',
    'ai-usage-summary',
    'external-import',
    'hash-and-export-time',
    'limitation-statement',
  ],
  publisher: [
    'overview',
    'manuscript-info',
    'world-baseline',
    'character-baseline',
    'ai-usage-summary',
    'external-import',
    'version-timeline',
    'author-choice-summary',
    'hash-and-export-time',
    'limitation-statement',
  ],
  private: [
    'overview',
    'manuscript-info',
    'world-baseline',
    'character-baseline',
    'ai-usage-summary',
    'external-import',
    'version-timeline',
    'author-choice-summary',
    'hash-and-export-time',
    'limitation-statement',
  ],
  // legal: private 와 동일 섹션 (분쟁 대응 자료 — UI 별도 강조)
  legal: [
    'overview',
    'manuscript-info',
    'world-baseline',
    'character-baseline',
    'ai-usage-summary',
    'external-import',
    'version-timeline',
    'author-choice-summary',
    'hash-and-export-time',
    'limitation-statement',
  ],
};

// ============================================================
// PART 4 — CSS inline (외부 link 0건)
// ============================================================

function inlineStyles(language: CertificateLanguage): string {
  return `
    body {
      font-family: ${fontFamilyFor(language)};
      max-width: 800px;
      margin: 2rem auto;
      padding: 1rem;
      color: #1a1a1a;
      line-height: 1.6;
      background: #ffffff;
    }
    .disclaimer-first-line {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 0.75rem 1rem;
      margin: 0 0 1.5rem 0;
      font-size: 0.95rem;
      color: #856404;
    }
    h1 {
      font-size: 1.75rem;
      margin: 0 0 0.5rem 0;
      color: #1a1a1a;
    }
    h2 {
      font-size: 1.25rem;
      margin: 2rem 0 0.75rem 0;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid #ddd;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.5rem 0 1rem 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5rem 0.75rem;
      text-align: left;
      vertical-align: top;
      word-break: break-all;
    }
    th {
      background: #f5f5f5;
      width: 30%;
      font-weight: 600;
    }
    .meta {
      font-size: 0.85rem;
      color: #666;
      margin: 0.25rem 0;
    }
    .footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid #ddd;
      font-size: 0.8rem;
      color: #999;
    }
  `.trim();
}

// ============================================================
// PART 5 — 메인 export — renderCertificateHtml
// ============================================================

/**
 * 창작 과정 확인서 HTML 1장 생성.
 *
 * 보장:
 *   1. self-contained (<!doctype html> + inline <style>)
 *   2. external CSS link 0건
 *   3. <body> 첫 child = .disclaimer-first-line (H1 위)
 *   4. 모든 user-controlled 데이터 escape
 */
export function renderCertificateHtml(
  cert: ProcessCertificate,
  sections: Record<SectionPayload['id'], SectionPayload | null>,
  view: CertificateView,
  language: CertificateLanguage,
): string {
  // [Round 2-3 — 2026-05-07] legal view 지원
  const allowedIds = VIEW_SECTIONS[view];
  const visibleSections = allowedIds
    .map((id) => sections[id])
    .filter((s): s is SectionPayload => s !== null && s !== undefined);

  const title = CERTIFICATE_LABELS[language];
  const disclaimer = LIMITATION_TEXT_4LANG[language];
  const labels = ATTESTATION_LABELS[language];

  // 섹션 HTML 빌드 (publisher/private/legal view 의 추가 정보)
  const sectionsHtml = visibleSections
    .map((section) => {
      const rowsHtml = section.rows
        .map(
          (row) =>
            `      <tr><th>${escapeHtml(row.key)}</th><td>${escapeHtml(row.value)}</td></tr>`,
        )
        .join('\n');
      return `    <h2>${escapeHtml(section.title)}</h2>
    <table>
      <tbody>
${rowsHtml}
      </tbody>
    </table>`;
    })
    .join('\n\n');

  // [Visual Charter v1.0 — 2026-05-10] 시각 헌법 영역
  const headerBlock = buildHeaderBlock(cert, view, language, labels, title);
  const attestationBlock = cert.attestationStatement
    ? buildAttestationBlock(cert.attestationStatement, labels)
    : '';
  const sealBlock = cert.sealNumber ? buildSealBlock(cert.sealNumber) : '';
  const hciBlock = cert.hciPayload
    ? buildHCIBlock(cert.hciPayload, language, labels)
    : '';
  const originBlock = cert.originSummary
    ? buildOriginSummaryBlock(cert.originSummary, language, labels)
    : '';
  const sessionsBlock = cert.workSessions && cert.workSessions.length > 0
    ? buildWorkSessionsBlock(cert.workSessions, labels)
    : '';
  const signatureBlock = buildSignatureBlock(cert, language, labels);

  return `<!doctype html>
<html lang="${escapeHtml(language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} ${escapeHtml(cert.sealNumber ?? cert.id.slice(0, 12))}</title>
  <style>${buildCSSVarsString()}\n${buildCertificateBaseCSS()}\n${inlineStyles(language)}</style>
</head>
<body>
  <p class="disclaimer-first-line">${escapeHtml(disclaimer)}</p>
  <main class="cert-container">
${headerBlock}
${attestationBlock}
${sealBlock}
${hciBlock}
${originBlock}
${sessionsBlock}
${sectionsHtml}
${signatureBlock}
    <div class="cert-footer">
      <a href="/legal/terms">LEGAL TERMS</a> ·
      <a href="/legal/privacy">PRIVACY POLICY</a> ·
      <a href="/legal/chain-of-custody">CHAIN OF CUSTODY</a>
      <p>© ${new Date(cert.generatedAt).getUTCFullYear()} LORE GUARD ARCHIVAL SYSTEMS. ALL RIGHTS RESERVED.</p>
      <p>Loreguard ${escapeHtml(cert.generatedBy)} · Report v${escapeHtml(cert.reportVersion)} · Limitation v${escapeHtml(cert.limitationTextVersion)}</p>
    </div>
  </main>
</body>
</html>`;
}

// ============================================================
// PART 5.1 — Visual Charter v1.0 블록 빌더
// ============================================================

function buildHeaderBlock(
  cert: ProcessCertificate,
  view: CertificateView,
  language: CertificateLanguage,
  labels: typeof ATTESTATION_LABELS[CertificateLanguage],
  title: string,
): string {
  const dateIssued = cert.issuedAtLocal ?? cert.generatedAt.slice(0, 10);
  const serial = cert.sealNumber ?? cert.id.slice(0, 12).toUpperCase();
  // 작품명은 sections 의 overview 에서 노출 — 헤더는 brand + serial 만.
  return `    <header class="cert-header" style="margin-bottom: 32px;">
      <div class="cert-brand label-caps" style="color: var(--cert-color-deep-charcoal); font-size: 14px; margin-bottom: 8px;">LORE GUARD</div>
      <h1 class="cert-title">${escapeHtml(title)}</h1>
      <p class="cert-subtitle" style="color: var(--cert-color-outline-mid); font-size: 14px; margin-top: 4px;">${escapeHtml(language)} · ${escapeHtml(view)}</p>
      <div class="cert-meta" style="display: flex; gap: 32px; margin-top: 16px; font-family: 'Inter', monospace; font-size: 13px;">
        <div><span class="label-caps">${escapeHtml(labels.serialNo)}</span> ${escapeHtml(serial)}</div>
        <div><span class="label-caps">${escapeHtml(labels.dateIssued)}</span> ${escapeHtml(dateIssued)}</div>
      </div>
    </header>`;
}

function buildAttestationBlock(
  statement: string,
  labels: typeof ATTESTATION_LABELS[CertificateLanguage],
): string {
  return `    <section class="cert-attestation cert-section">
      <p class="label-caps">${escapeHtml(labels.headerLabel)}</p>
      <blockquote>${escapeHtml(statement)}</blockquote>
    </section>`;
}

function buildSealBlock(sealNumber: string): string {
  return `    <aside class="cert-seal cert-section" style="text-align: center;">
      ${buildWitnessSealSVG()}
      <p class="label-caps" style="margin-top: 8px; color: var(--cert-color-accent-gold);">Witness Seal #${escapeHtml(sealNumber)}</p>
    </aside>`;
}

function buildHCIBlock(
  hci: NonNullable<ProcessCertificate['hciPayload']>,
  language: CertificateLanguage,
  labels: typeof ATTESTATION_LABELS[CertificateLanguage],
): string {
  const intentLabel = HCI_AXIS_LABELS.intent[language];
  const densityLabel = HCI_AXIS_LABELS.density[language];
  const logicLabel = HCI_AXIS_LABELS.logic[language];
  const disclaimer = HCI_DISCLAIMER_4LANG[language];
  return `    <section class="cert-hci cert-section">
      <p class="label-caps">${escapeHtml(labels.humanControlIndex)}</p>
      <div class="hci-value">${hci.hci}%</div>
      <ul class="hci-axes" style="display: flex; gap: 24px; list-style: none; margin-top: 16px; font-size: 13px; padding: 0;">
        <li><strong>${escapeHtml(intentLabel.label)}:</strong> ${escapeHtml(intentLabel[hci.intent])}</li>
        <li><strong>${escapeHtml(densityLabel.label)}:</strong> ${escapeHtml(densityLabel[hci.density])}</li>
        <li><strong>${escapeHtml(logicLabel.label)}:</strong> ${escapeHtml(logicLabel[hci.logic])}</li>
      </ul>
      <p class="hci-disclaimer">${escapeHtml(disclaimer)}</p>
    </section>`;
}

function buildOriginSummaryBlock(
  origin: NonNullable<ProcessCertificate['originSummary']>,
  language: CertificateLanguage,
  labels: typeof ATTESTATION_LABELS[CertificateLanguage],
): string {
  const catLabels = ORIGIN_CATEGORY_LABELS[language];
  const donut = buildOriginDonutSVG(origin.human_input, origin.refinement, origin.ai_suggestion);
  return `    <section class="cert-origin-summary cert-section">
      <p class="label-caps">${escapeHtml(labels.originSummary)}</p>
      <div style="display: flex; gap: 24px; align-items: center; margin-top: 12px;">
        ${donut}
        <ul class="legend" style="list-style: none; padding: 0; font-size: 13px; line-height: 1.8;">
          <li><span style="display: inline-block; width: 12px; height: 12px; background: #1A1A1A; margin-right: 8px; vertical-align: middle;"></span> ${origin.human_input}% ${escapeHtml(catLabels.human_input)}</li>
          <li><span style="display: inline-block; width: 12px; height: 12px; background: #D4AF37; margin-right: 8px; vertical-align: middle;"></span> ${origin.refinement}% ${escapeHtml(catLabels.refinement)}</li>
          <li><span style="display: inline-block; width: 12px; height: 12px; background: #C4C7C7; margin-right: 8px; vertical-align: middle;"></span> ${origin.ai_suggestion}% ${escapeHtml(catLabels.ai_suggestion)}</li>
        </ul>
      </div>
    </section>`;
}

function buildWorkSessionsBlock(
  sessions: NonNullable<ProcessCertificate['workSessions']>,
  labels: typeof ATTESTATION_LABELS[CertificateLanguage],
): string {
  const rows = sessions
    .map((s) => `        <tr><td>${escapeHtml(s.date.slice(0, 10))}</td><td>${escapeHtml(s.title)}</td></tr>`)
    .join('\n');
  return `    <section class="cert-sessions cert-section">
      <p class="label-caps">${escapeHtml(labels.workSessions)}</p>
      <table>
        <tbody>
${rows}
        </tbody>
      </table>
    </section>`;
}

function buildSignatureBlock(
  cert: ProcessCertificate,
  language: CertificateLanguage,
  labels: typeof ATTESTATION_LABELS[CertificateLanguage],
): string {
  const sigDisclaimer = SIGNATURE_DISCLAIMER_4LANG[language];
  const qrImg = cert.verificationQrDataUrl
    ? `<img class="qr-img" src="${escapeHtml(cert.verificationQrDataUrl)}" alt="QR for verification">`
    : '';
  return `    <section class="cert-signature cert-section">
      <p class="label-caps">${escapeHtml(labels.digitalSignature)}</p>
      <code class="data-mono" style="display: block; word-break: break-all; padding: 12px; background: var(--cert-color-surface); border: var(--cert-border-hairline); margin-top: 8px;">${escapeHtml(cert.manuscriptHash)}</code>
      <p style="font-size: 11px; color: var(--cert-color-outline-mid); margin-top: 8px;">${escapeHtml(sigDisclaimer)}</p>
      <div style="text-align: right; margin-top: 12px;">
        ${qrImg}
        ${cert.verificationQrDataUrl ? `<p class="label-caps" style="margin-top: 4px;">${escapeHtml(labels.scanForProof)}</p>` : ''}
      </div>
    </section>`;
}

// ============================================================
// PART 6 — 다운로드 파일명 헬퍼
// ============================================================

/**
 * 다운로드 파일명 생성. 영문 slug 일관 (파일 시스템 호환).
 *
 * 예: loreguard-authorship-journal-prj4f1a-2026-05-07T13-22-45-000Z.html
 */
export function buildCertificateFilename(
  cert: ProcessCertificate,
  ext: 'html' | 'md',
): string {
  const slug = 'authorship-journal';
  const idShort = cert.projectId.slice(0, 8).replace(/[^a-zA-Z0-9]/g, '');
  const isoSafe = cert.generatedAt.replace(/[:.]/g, '-');
  return `loreguard-${slug}-${idShort}-${isoSafe}.${ext}`;
}
