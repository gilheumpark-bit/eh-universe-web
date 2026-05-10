// ============================================================
// Markdown Renderer — 3 view × 4언어 자족 markdown 생성
// ============================================================
//
// 출력: front-matter X. 첫 줄 디스클레이머 (> blockquote).
// table escape (백틱·파이프 등 4자).
//
// 사상 정합:
//   - 작가 친숙도 ↑ (Markdown은 작가가 자주 쓰는 포맷)
//   - 5차 §1 "사용자가 편집 가능한 경량 산출물"
//   - GitHub README 친화 = 작가가 그대로 GitHub repo 에 올림
// ============================================================

import type { CertificateLanguage, CertificateView, ProcessCertificate } from './types';
import type { SectionPayload } from './report-builder';
import { CERTIFICATE_LABELS } from './types';
import { LIMITATION_TEXT_4LANG } from './limitation-text';
// [Visual Charter v1.0 — 2026-05-10] markdown HCI / sealNumber / Origin / ATTESTATION 표기
import { ATTESTATION_LABELS, SIGNATURE_DISCLAIMER_4LANG } from './attestation-text';
import { HCI_DISCLAIMER_4LANG, HCI_AXIS_LABELS, ORIGIN_CATEGORY_LABELS } from './hci-calculator';

// ============================================================
// PART 1 — Markdown escape (table cell 안전)
// ============================================================

/**
 * Markdown table cell 안의 위험 문자 escape.
 * 4자: 백틱·별표·언더스코어·파이프.
 */
export function escapeMarkdown(s: string): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' '); // 줄바꿈 제거 (table cell 내부)
}

// ============================================================
// PART 2 — view 별 섹션 화이트리스트 (html-renderer 와 동일)
// ============================================================

// [Round 2-3 — 2026-05-07] legal view 추가
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
// PART 3 — 메인 export — renderCertificateMarkdown
// ============================================================

/**
 * 창작 과정 확인서 Markdown 1장 생성.
 *
 * 보장:
 *   1. 첫 줄 = `> ${LIMITATION_TEXT_4LANG[language]}` (blockquote)
 *   2. 두 번째 줄부터 H1 (`# title`)
 *   3. 모든 user-controlled 데이터 escapeMarkdown 통과
 *   4. front-matter 없음 (자족 문서)
 */
export function renderCertificateMarkdown(
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

  // 섹션 빌드
  const sectionsMd = visibleSections
    .map((section) => {
      const tableHeader = '| Key | Value |\n| --- | --- |';
      const rowsMd = section.rows
        .map((row) => `| ${escapeMarkdown(row.key)} | ${escapeMarkdown(row.value)} |`)
        .join('\n');
      return `## ${escapeMarkdown(section.title)}\n\n${tableHeader}\n${rowsMd}`;
    })
    .join('\n\n');

  // [Visual Charter v1.0 — 2026-05-10] HCI / sealNumber / Origin / ATTESTATION 블록
  const visualBlocks: string[] = [];

  if (cert.attestationStatement) {
    visualBlocks.push(
      `## ${escapeMarkdown(labels.headerLabel)}\n\n> ${escapeMarkdown(cert.attestationStatement)}`,
    );
  }

  if (cert.sealNumber) {
    visualBlocks.push(`## Witness Seal\n\n\`${escapeMarkdown(cert.sealNumber)}\``);
  }

  if (cert.hciPayload) {
    const intentLabel = HCI_AXIS_LABELS.intent[language];
    const densityLabel = HCI_AXIS_LABELS.density[language];
    const logicLabel = HCI_AXIS_LABELS.logic[language];
    const hciDisclaimer = HCI_DISCLAIMER_4LANG[language];
    visualBlocks.push(
      `## ${escapeMarkdown(labels.humanControlIndex)}\n\n**${cert.hciPayload.hci}%**\n\n` +
      `- **${escapeMarkdown(intentLabel.label)}**: ${escapeMarkdown(intentLabel[cert.hciPayload.intent])}\n` +
      `- **${escapeMarkdown(densityLabel.label)}**: ${escapeMarkdown(densityLabel[cert.hciPayload.density])}\n` +
      `- **${escapeMarkdown(logicLabel.label)}**: ${escapeMarkdown(logicLabel[cert.hciPayload.logic])}\n\n` +
      `> ${escapeMarkdown(hciDisclaimer)}`,
    );
  }

  if (cert.originSummary) {
    const catLabels = ORIGIN_CATEGORY_LABELS[language];
    visualBlocks.push(
      `## ${escapeMarkdown(labels.originSummary)}\n\n` +
      `| Category | % |\n| --- | --- |\n` +
      `| ${escapeMarkdown(catLabels.human_input)} | ${cert.originSummary.human_input}% |\n` +
      `| ${escapeMarkdown(catLabels.refinement)} | ${cert.originSummary.refinement}% |\n` +
      `| ${escapeMarkdown(catLabels.ai_suggestion)} | ${cert.originSummary.ai_suggestion}% |`,
    );
  }

  if (cert.workSessions && cert.workSessions.length > 0) {
    const rows = cert.workSessions
      .map((s) => `| ${escapeMarkdown(s.date.slice(0, 10))} | ${escapeMarkdown(s.title)} |`)
      .join('\n');
    visualBlocks.push(
      `## ${escapeMarkdown(labels.workSessions)}\n\n| Date | Title |\n| --- | --- |\n${rows}`,
    );
  }

  // Digital Signature 블록 — sealNumber / verifyUrl 있으면 강화
  const sigDisclaimer = SIGNATURE_DISCLAIMER_4LANG[language];
  const signatureMd = `## ${escapeMarkdown(labels.digitalSignature)}\n\n` +
    `\`${escapeMarkdown(cert.manuscriptHash)}\`\n\n` +
    `> ${escapeMarkdown(sigDisclaimer)}` +
    (cert.verificationUrl ? `\n\n**Verify URL**: ${escapeMarkdown(cert.verificationUrl)}` : '');
  visualBlocks.push(signatureMd);

  const visualMd = visualBlocks.join('\n\n');

  // 헤더 블록
  const serial = cert.sealNumber ?? cert.id.slice(0, 12).toUpperCase();
  const dateIssued = cert.issuedAtLocal ?? cert.generatedAt.slice(0, 10);

  // 첫 줄: > disclaimer
  // 두 번째 줄: 빈 줄
  // 세 번째 줄: # title
  return `> ${disclaimer}

# ${escapeMarkdown(title)}

- **${escapeMarkdown(labels.serialNo)}**: \`${escapeMarkdown(serial)}\`
- **${escapeMarkdown(labels.dateIssued)}**: ${escapeMarkdown(dateIssued)}
- **View**: ${escapeMarkdown(view)}
- **Generated**: ${escapeMarkdown(cert.generatedAt)}
- **Loreguard**: ${escapeMarkdown(cert.generatedBy)}
- **Report v**: ${escapeMarkdown(cert.reportVersion)}
- **Limitation v**: ${escapeMarkdown(cert.limitationTextVersion)}

${visualMd}

${sectionsMd}
`;
}
