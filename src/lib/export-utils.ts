// ============================================================
// PART 1 — EPUB Export (ZIP + XHTML + OPF, no external deps)
// ============================================================

import { ChatSession, AppLanguage } from './studio-types';
import { stripEngineArtifacts } from '@/engine/pipeline';
import { showAlert } from './show-alert';
import {
  getAIUsageForProject,
  isDisclosureEnabled,
  buildAIDisclosure,
  buildEpubAIMetaTags,
} from './ai-usage-tracker';
import {
  getRating,
  buildAdultWarning,
  filenamePrefix,
  epubAudience,
} from './content-rating';

/** Export 옵션 — 시그니처는 유지하고 선택 필드만 추가 */
export interface ExportOptions {
  /** AI 사용 고지문 자동 삽입 (기본: 사용자 설정 노아_ai_disclosure_enabled 값) */
  includeAIDisclosure?: boolean;
  /** 커스텀 고지문으로 기본 4언어 문구 덮어쓰기 */
  aiDisclosureText?: string;
  /** 고지문 언어. 지정 없으면 session.config.language → 'KO' */
  disclosureLang?: AppLanguage;
}

/** session.config.language → AppLanguage (cast + default) */
function resolveLang(session: ChatSession, opts?: ExportOptions): AppLanguage {
  if (opts?.disclosureLang) return opts.disclosureLang;
  const fromConfig = (session.config as unknown as Record<string, string>).language;
  const v = String(fromConfig ?? 'KO').toUpperCase();
  if (v === 'EN' || v === 'JP' || v === 'CN' || v === 'KO') return v as AppLanguage;
  return 'KO';
}

/** AI 고지 + 성인 경고 문자열 결합 — null 시 빈 문자열 */
function buildDisclosureFooter(session: ChatSession, opts?: ExportOptions): string {
  // opt-out 우선순위: 명시 false → 글로벌 토글 off → 기본 on
  const override = opts?.includeAIDisclosure;
  const enabled = override === undefined ? isDisclosureEnabled() : override;
  if (!enabled) return '';

  const lang = resolveLang(session, opts);
  const custom = opts?.aiDisclosureText?.trim();
  let text = '';
  if (custom) {
    text = `\n---\n${custom}\n`;
  } else {
    const usage = getAIUsageForProject(session.id);
    if (usage.hasAIAssist || usage.hasAITranslation) {
      text = buildAIDisclosure(usage, lang);
    }
  }

  // 19+ 성인 경고 (자가 선언 기준) — AI 고지와 별개로 삽입
  const rating = getRating(session.id);
  const adult = buildAdultWarning(rating, lang);
  if (adult) text += (text ? '\n' : '\n---\n') + adult + '\n';

  return text;
}

/** Simple CRC32 + ZIP builder — minimal spec-compliant for EPUB containers */
function crc32(buf: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function buildZip(files: { name: string; data: Uint8Array; store?: boolean }[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    // Local file header (30 + name + data)
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);   // signature
    lv.setUint16(4, 20, true);            // version needed
    lv.setUint16(6, 0, true);             // flags
    lv.setUint16(8, 0, true);             // compression: store
    lv.setUint16(10, 0, true);            // mod time
    lv.setUint16(12, 0, true);            // mod date
    lv.setUint32(14, crc, true);          // crc32
    lv.setUint32(18, size, true);         // compressed
    lv.setUint32(22, size, true);         // uncompressed
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);           // extra length
    local.set(nameBytes, 30);

    parts.push(local);
    parts.push(file.data);

    // Central directory entry
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralDir.push(central);

    offset += local.length + file.data.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const c of centralDir) centralDirSize += c.length;

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, centralDirOffset, true);
  ev.setUint16(20, 0, true);

  const all = [...parts, ...centralDir, eocd];
  let totalLen = 0;
  for (const a of all) totalLen += a.length;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const a of all) {
    result.set(a, pos);
    pos += a.length;
  }
  return result;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function textToXhtmlParagraphs(text: string): string {
  return text.split('\n').filter(l => l.trim()).map(l => `    <p>${escapeXml(l)}</p>`).join('\n');
}

function buildChapterXhtml(chTitle: string, content: string, styleHref: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(chTitle)}</title>
  <link rel="stylesheet" href="${styleHref}"/>
</head>
<body>
  <h1>${escapeXml(chTitle)}</h1>
${textToXhtmlParagraphs(content)}
</body>
</html>`;
}

/** Generate and download a valid EPUB 3.0 file from a chat session's manuscript content
 * @param coverImageDataUrl 표지 이미지 (data:image/jpeg;base64,... 또는 data:image/png;base64,...)
 * @param opts Export 옵션 — AI 고지문 on/off, 커스텀 문구, 고지 언어 */
export function exportEPUB(session: ChatSession, coverImageDataUrl?: string, opts?: ExportOptions): void {
  // Guard: prevent exporting empty manuscripts
  const hasContent = (session.config.manuscripts?.some(m => m.content?.trim()) ||
    session.messages?.some(m => m.role === 'assistant' && m.content?.trim()));
  if (!hasContent) {
    showAlert('내보낼 원고가 없습니다. / No manuscript content to export. / 書き出す原稿がありません。 / 没有可导出的稿件。', 'warning');
    return;
  }

  const encoder = new TextEncoder();
  const title = session.config.title || session.title || 'NOA Story';
  const safeTitle = escapeXml(title);
  const uid = `noa-${session.id}`;
  const genre = session.config.genre || '';
  const platform = session.config.publishPlatform || '';

  // Build chapters: prefer manuscripts, fallback to assistant messages
  const manuscripts = session.config.manuscripts ?? [];
  interface Chapter { id: string; title: string; content: string }
  let chapters: Chapter[];

  if (manuscripts.length > 0) {
    chapters = manuscripts
      .filter(m => m.content.trim())
      .sort((a, b) => a.episode - b.episode)
      .map(m => ({ id: `ch${m.episode}`, title: m.title || `EP.${m.episode}`, content: m.content }));
  } else {
    const assistantMsgs = session.messages.filter(m => m.role === 'assistant' && m.content.trim());
    if (assistantMsgs.length <= 1) {
      const combined = assistantMsgs.map(m => m.content.replace(/```json[\s\S]*?```/g, '').trim()).join('\n\n');
      chapters = [{ id: 'ch1', title: title, content: combined }];
    } else {
      chapters = assistantMsgs.map((m, i) => ({
        id: `ch${i + 1}`,
        title: `EP.${i + 1}`,
        content: m.content.replace(/```json[\s\S]*?```/g, '').trim(),
      }));
    }
  }

  if (chapters.length === 0) return;

  const mimetype = encoder.encode('application/epub+zip');
  const container = encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 표지 이미지 처리
  const hasCover = !!coverImageDataUrl;
  const coverMimeType = coverImageDataUrl?.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const coverExt = coverMimeType === 'image/png' ? 'png' : 'jpg';

  const coverManifest = hasCover ? [
    `    <item id="cover-image" href="cover.${coverExt}" media-type="${coverMimeType}" properties="cover-image"/>`,
    `    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
  ].join('\n') + '\n' : '';
  const coverSpine = hasCover ? `    <itemref idref="cover"/>\n` : '';

  // ============================================================
  // AI 사용 고지 + 성인 경고 → 별도 "disclosure" 챕터로 편입
  // 기본 on, 사용자 설정(noa_ai_disclosure_enabled=false)에서만 끔
  // ============================================================
  const disclosureText = buildDisclosureFooter(session, opts);
  if (disclosureText.trim()) {
    chapters.push({ id: 'ai-disclosure', title: 'AI & Content Notice', content: disclosureText });
  }

  const manifestItems = chapters.map(ch => `    <item id="${ch.id}" href="${ch.id}.xhtml" media-type="application/xhtml+xml"/>`).join('\n');
  const spineItems = chapters.map(ch => `    <itemref idref="${ch.id}"/>`).join('\n');
  const descParts = [genre, platform].filter(Boolean);
  const descMeta = descParts.length > 0 ? `\n    <dc:description>${escapeXml(descParts.join(' | '))}</dc:description>` : '';

  // 콘텐츠 등급 → EPUB 메타 (dc:audience) + AI meta tags
  const rating = getRating(session.id);
  const audience = epubAudience(rating.rating);
  const audienceMeta = audience ? `\n    <dc:audience>${audience}</dc:audience>` : '';
  const aiMetaTags = buildEpubAIMetaTags(getAIUsageForProject(session.id));
  const aiMetaBlock = aiMetaTags.length > 0 ? `\n${aiMetaTags.join('\n')}` : '';

  const contentOpf = encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uid}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    <dc:language>${escapeXml(({ KO: 'ko', EN: 'en', JP: 'ja', CN: 'zh' } as Record<string, string>)[(session.config as unknown as Record<string, string>).language ?? 'KO'] ?? 'ko')}</dc:language>
    <dc:creator>NOA Studio</dc:creator>${descMeta}${audienceMeta}${aiMetaBlock}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z/, 'Z')}</meta>
  </metadata>
  <manifest>
${coverManifest}${manifestItems}
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
  </manifest>
  <spine>
${coverSpine}${spineItems}
  </spine>
</package>`);

  const tocItems = chapters.map(ch => `      <li><a href="${ch.id}.xhtml">${escapeXml(ch.title)}</a></li>`).join('\n');
  const nav = encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
  <nav epub:type="toc">
    <ol>
${tocItems}
    </ol>
  </nav>
</body>
</html>`);

  const style = encoder.encode(`body { font-family: serif; line-height: 1.8; margin: 1em; color: #222; }
p { text-indent: 1em; margin: 0.5em 0; }
hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
h1 { font-size: 1.4em; margin-bottom: 0.5em; }
h2 { font-size: 1.2em; margin-top: 1.5em; margin-bottom: 0.5em; }`);

  const chapterFiles = chapters.map(ch => ({
    name: `OEBPS/${ch.id}.xhtml`,
    data: encoder.encode(buildChapterXhtml(ch.title, ch.content, 'style.css')),
  }));

  // 표지 파일 생성
  const coverFiles: { name: string; data: Uint8Array; store?: boolean }[] = [];
  if (hasCover && coverImageDataUrl) {
    // data URL → binary
    const base64 = coverImageDataUrl.split(',')[1];
    if (base64) {
      const binaryStr = atob(base64);
      const coverBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) coverBytes[i] = binaryStr.charCodeAt(i);
      coverFiles.push({ name: `OEBPS/cover.${coverExt}`, data: coverBytes, store: true });
    }
    const coverXhtml = encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title></head>
<body style="margin:0;padding:0;text-align:center">
  <img src="cover.${coverExt}" alt="Cover" style="max-width:100%;max-height:100vh"/>
</body>
</html>`);
    coverFiles.push({ name: 'OEBPS/cover.xhtml', data: coverXhtml });
  }

  const zipData = buildZip([
    { name: 'mimetype', data: mimetype, store: true },
    { name: 'META-INF/container.xml', data: container },
    { name: 'OEBPS/content.opf', data: contentOpf },
    { name: 'OEBPS/nav.xhtml', data: nav },
    { name: 'OEBPS/style.css', data: style },
    ...coverFiles,
    ...chapterFiles,
  ]);

  const prefix = filenamePrefix(rating.rating);
  downloadBlob(zipData, `${prefix}${title}.epub`, 'application/epub+zip');
}

// ============================================================
// PART 2 — DOCX Export (Office Open XML, store-mode ZIP)
// ============================================================

/** Detect whether a trimmed line is dialogue (starts with " or 「) */
function isDialogueLine(line: string): boolean {
  return /^[\u201C\u201D"\u300C\u300E"]/.test(line);
}

/** Detect chapter title lines (e.g. "제1장 ...", "Chapter 1 ...", "EP.1", "# Title") */
function isChapterTitle(line: string): boolean {
  return /^(제?\d+장|Chapter\s+\d+|EP\.\d+|#\s+)/i.test(line);
}

/** Build a DOCX paragraph XML string with proper styles */
function buildDocxParagraph(trimmed: string): string {
  if (!trimmed) {
    return '<w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>';
  }

  // Chapter title → Heading2 (18pt, bold)
  if (isChapterTitle(trimmed)) {
    return `<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="360" w:after="200" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Batang" w:eastAsia="Batang" w:hAnsi="Batang"/><w:b/><w:sz w:val="36"/></w:rPr><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r></w:p>`;
  }

  // Dialogue line → hanging indent (left 600, hanging 300)
  if (isDialogueLine(trimmed)) {
    return `<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:ind w:left="600" w:hanging="300"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Batang" w:eastAsia="Batang" w:hAnsi="Batang"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r></w:p>`;
  }

  // Normal paragraph
  return `<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:ind w:firstLine="400"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Batang" w:eastAsia="Batang" w:hAnsi="Batang"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r></w:p>`;
}

/** Generate and download a DOCX (Office Open XML) file from a chat session's manuscript content
 * @param opts Export 옵션 — AI 고지문 on/off, 커스텀 문구, 고지 언어 */
export function exportDOCX(session: ChatSession, opts?: ExportOptions): void {
  // Guard: prevent exporting empty manuscripts
  const hasContent = (session.config.manuscripts?.some(m => m.content?.trim()) ||
    session.messages?.some(m => m.role === 'assistant' && m.content?.trim()));
  if (!hasContent) {
    showAlert('내보낼 원고가 없습니다. / No manuscript content to export. / 書き出す原稿がありません。 / 没有可导出的稿件。', 'warning');
    return;
  }

  const encoder = new TextEncoder();
  const title = session.config.title || session.title || 'NOA Story';

  // A4 page size in twips: 210mm=11906tw, 297mm=16838tw
  // Margins: top/bottom 2.5cm=1418tw, left/right 2cm=1134tw
  const sectionProps = `<w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1418" w:right="1134" w:bottom="1418" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/>
      <w:footerReference w:type="default" r:id="rId2"/>
    </w:sectPr>`;

  const contentTypes = encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`);

  const rels = encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const wordRels = encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`);

  // Footer with page numbers
  const footer = encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r>
      <w:rPr><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr>
      <w:fldChar w:fldCharType="begin"/>
    </w:r>
    <w:r>
      <w:rPr><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr>
      <w:instrText xml:space="preserve"> PAGE </w:instrText>
    </w:r>
    <w:r>
      <w:rPr><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr>
      <w:fldChar w:fldCharType="end"/>
    </w:r>
  </w:p>
</w:ftr>`);

  // manuscripts 우선 → 수동 편집 반영. 없으면 messages로 fallback.
  const manuscripts = session.config?.manuscripts ?? [];
  const sourceLines: string[] = manuscripts.length > 0
    ? [...manuscripts]
        .sort((a, b) => a.episode - b.episode)
        .flatMap(m => (m.content ?? '').split('\n'))
    : session.messages
        .filter(m => m.role === 'assistant')
        .flatMap(m => stripEngineArtifacts(m.content).split('\n'));

  const paragraphs = sourceLines
    .map(line => buildDocxParagraph(line.trim()))
    .join('\n');

  // Title → Heading1 (28pt, bold, center)
  const titlePara = `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:after="400"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Batang" w:eastAsia="Batang" w:hAnsi="Batang"/><w:b/><w:sz w:val="56"/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>`;

  // AI 고지 + 성인 경고 — 본문 뒤, 섹션 종료 앞 줄바꿈 문단으로 추가
  const disclosureText = buildDisclosureFooter(session, opts);
  const disclosureParas = disclosureText
    ? disclosureText.split('\n').map(l => buildDocxParagraph(l.trim())).join('\n')
    : '';

  const document = encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${titlePara}
    ${paragraphs}
    ${disclosureParas}
    ${sectionProps}
  </w:body>
</w:document>`);

  const zipData = buildZip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'word/_rels/document.xml.rels', data: wordRels },
    { name: 'word/footer1.xml', data: footer },
    { name: 'word/document.xml', data: document },
  ]);

  const rating = getRating(session.id);
  const prefix = filenamePrefix(rating.rating);
  downloadBlob(zipData, `${prefix}${title}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}

// ============================================================
// PART 3 — Download Helper
// ============================================================

function downloadBlob(data: Uint8Array, filename: string, mimeType: string): void {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
