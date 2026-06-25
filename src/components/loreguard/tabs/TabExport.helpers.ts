import { formatKoreanKrw } from "@/lib/creative/media-ip-pack-markdown";
import {
  evaluateFormCompletion,
  type ReleaseFormDefinition,
} from "@/lib/creative-process/jurisdiction-form-pack";

const PUBLIC_PRICE_DISCLOSURE = process.env.NEXT_PUBLIC_SHOW_PUBLIC_PRICES === "on";

export function formatKrw(value: number): string {
  return PUBLIC_PRICE_DISCLOSURE ? formatKoreanKrw(value) : "오디션 기간 비공개";
}

export function formatProductConditionKo(priceKrw: number, creditsKo: string): string {
  const creditLabel = creditsKo.trim() || "크레딧 조건 확인";
  if (PUBLIC_PRICE_DISCLOSURE) return `${formatKoreanKrw(priceKrw)} · ${creditLabel}`;
  return `${creditLabel} · 금액 비공개`;
}

export function formatReleaseCredits(value: number): string {
  if (value < 0) return "무제한 협의";
  return `${value}개`;
}

export function safeDownloadName(value: string | null | undefined): string {
  const normalized = (value?.trim() || "Loreguard_권리_IP_자산화").replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
  return normalized.slice(0, 80);
}

function escapePreviewHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildJurisdictionPackPreviewHtml(input: {
  packLabelKo: string;
  sourceReferences: readonly { title: string; url: string; checkedAt: string }[];
  formRows: readonly {
    form: ReleaseFormDefinition;
    completion: ReturnType<typeof evaluateFormCompletion>;
  }[];
}): string {
  const sourceRows = input.sourceReferences.length > 0
    ? input.sourceReferences.map((sourceItem) => `
      <tr>
        <td>${escapePreviewHtml(sourceItem.title)}</td>
        <td><a href="${escapePreviewHtml(sourceItem.url)}" target="_blank" rel="noopener noreferrer">${escapePreviewHtml(sourceItem.url)}</a></td>
        <td>${escapePreviewHtml(sourceItem.checkedAt)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="3">공통 기준 Pack입니다. 실제 제출 전 플랫폼·기관 기준을 다시 확인해 주세요.</td></tr>`;
  const formSections = input.formRows.map(({ form, completion }) => {
    const missingFieldIds = new Set(completion.missingRequiredFieldIds);
    const sectionHtml = form.sections.map((sectionItem) => `
      <section>
        <h3>${escapePreviewHtml(sectionItem.title.ko)}</h3>
        <table>
          <thead>
            <tr><th>항목</th><th>상태</th><th>설명</th></tr>
          </thead>
          <tbody>
            ${sectionItem.fields.map((fieldItem) => {
              const statusKo = fieldItem.required
                ? missingFieldIds.has(fieldItem.id) ? "보강 필요" : "채움"
                : "선택";
              return `
                <tr>
                  <td>${escapePreviewHtml(fieldItem.label.ko)}</td>
                  <td>${escapePreviewHtml(statusKo)}</td>
                  <td>${escapePreviewHtml(fieldItem.help.ko)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </section>
    `).join("");

    return `
      <article>
        <h2>${escapePreviewHtml(form.title.ko)} <small>${completion.requiredPresent}/${completion.requiredTotal}</small></h2>
        <p>${escapePreviewHtml(form.purpose.ko)}</p>
        ${sectionHtml}
      </article>
    `;
  }).join("");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapePreviewHtml(input.packLabelKo)} · Loreguard 출고 양식</title>
  <style>
    :root { color-scheme: light; font-family: "Pretendard", "Noto Sans KR", system-ui, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #172033; }
    main { max-width: 1080px; margin: 0 auto; padding: 32px; }
    header { border-bottom: 1px solid #d8dee8; padding-bottom: 18px; margin-bottom: 18px; }
    h1 { font-size: 26px; margin: 0 0 8px; }
    h2 { font-size: 19px; margin: 28px 0 8px; }
    h3 { font-size: 15px; margin: 18px 0 8px; }
    p { line-height: 1.65; color: #475569; }
    small { color: #64748b; font-weight: 600; margin-left: 8px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d8dee8; margin: 8px 0 16px; }
    th, td { border-bottom: 1px solid #e6ebf2; padding: 10px 12px; text-align: left; vertical-align: top; font-size: 13px; line-height: 1.55; }
    th { background: #edf2f7; color: #334155; font-weight: 700; }
    a { color: #1d4ed8; }
    .note { background: #fff; border: 1px solid #d8dee8; padding: 14px 16px; color: #475569; }
    .print-note { font-size: 12px; color: #64748b; margin-top: 20px; }
    @page { size: A4; margin: 16mm; }
    @media print {
      body { background: #fff; color: #111827; }
      main { max-width: none; padding: 0; }
      header, section, article, table, .note { break-inside: avoid; page-break-inside: avoid; }
      article { break-before: page; page-break-before: always; }
      article:first-of-type { break-before: auto; page-break-before: auto; }
      th { background: #f3f4f6 !important; color: #111827; }
      a { color: #111827; text-decoration: underline; }
      .note { background: #fff; border-color: #9ca3af; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapePreviewHtml(input.packLabelKo)} · 출고 양식 미리보기</h1>
      <p>이 화면은 제출 전 검토용입니다. 실제 플랫폼 약관, 등록기관, 계약서 제출 기준은 출고 직전에 다시 확인해 주세요.</p>
    </header>
    <section>
      <h2>확인 출처</h2>
      <table>
        <thead><tr><th>출처</th><th>주소</th><th>기준일</th></tr></thead>
        <tbody>${sourceRows}</tbody>
      </table>
    </section>
    <div class="note">노아는 양식을 채우는 후보를 제안하고, 작가는 채택·수정·보류를 결정합니다. Loreguard는 그 과정을 기록합니다.</div>
    ${formSections}
    <p class="print-note">PDF 또는 인쇄본으로 보관할 때는 확인 출처, 확인일, 보강 필요 항목을 함께 보관하세요.</p>
  </main>
</body>
</html>`;
}

export function downloadTextDocument(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
