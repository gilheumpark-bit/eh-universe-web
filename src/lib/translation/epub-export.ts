// ============================================================
// EPUB Export for Translated Manuscripts
// ============================================================
// 번역 완료된 원고를 EPUB 파일로 내보내기.
// 기존 소설 스튜디오의 export-utils.ts를 오염시키지 않는 독립 모듈.

import type { PublishMetadata } from './publish-metadata';

export interface EpubChapter {
  title: string;
  content: string;
  /** 에피소드 번호 */
  episode: number;
}

/** 간단한 EPUB XHTML 챕터 생성 */
function chapterToXhtml(chapter: EpubChapter, lang: string): string {
  const paragraphs = chapter.content
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `    <p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}" lang="${lang}">
<head>
  <title>${escapeHtml(chapter.title)}</title>
  <style>
    body { font-family: serif; line-height: 1.8; margin: 1em; }
    p { text-indent: 1em; margin: 0.5em 0; }
    h1 { font-size: 1.4em; margin: 2em 0 1em; text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(chapter.title)}</h1>
${paragraphs}
</body>
</html>`;
}

/** EPUB OPF (패키지 메타데이터) 생성 */
function buildOpf(meta: PublishMetadata, chapters: EpubChapter[]): string {
  const items = chapters.map((_, i) =>
    `    <item id="ch${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
  ).join('\n');

  const spine = chapters.map((_, i) =>
    `    <itemref idref="ch${i + 1}"/>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">eh-${Date.now()}</dc:identifier>
    <dc:title>${escapeHtml(meta.titleTranslated || meta.title)}</dc:title>
    <dc:creator>${escapeHtml(meta.authorRomanized || meta.author)}</dc:creator>
    <dc:language>${meta.targetLang.toLowerCase()}</dc:language>
    <dc:description>${escapeHtml(meta.synopsisTranslated || meta.synopsis)}</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${items}
  </manifest>
  <spine>
${spine}
  </spine>
</package>`;
}

/** EPUB 네비게이션 파일 */
function buildNav(chapters: EpubChapter[], lang: string): string {
  const items = chapters.map((ch, i) =>
    `      <li><a href="chapter${i + 1}.xhtml">${escapeHtml(ch.title)}</a></li>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc">
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>`;
}

/**
 * 번역된 챕터들을 EPUB용 파일 맵으로 변환.
 * 실제 ZIP 압축은 클라이언트에서 JSZip 등으로 수행.
 * 이 함수는 파일 구조만 생성.
 */
export function buildEpubFiles(
  chapters: EpubChapter[],
  meta: PublishMetadata,
): Record<string, string> {
  const lang = meta.targetLang.toLowerCase();
  const files: Record<string, string> = {};

  // mimetype
  files['mimetype'] = 'application/epub+zip';

  // META-INF/container.xml
  files['META-INF/container.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // OEBPS/content.opf
  files['OEBPS/content.opf'] = buildOpf(meta, chapters);

  // OEBPS/nav.xhtml
  files['OEBPS/nav.xhtml'] = buildNav(chapters, lang);

  // Chapters
  for (let i = 0; i < chapters.length; i++) {
    files[`OEBPS/chapter${i + 1}.xhtml`] = chapterToXhtml(chapters[i], lang);
  }

  return files;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
