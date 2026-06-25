import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { inflateRawSync } from 'zlib';
import mammoth from 'mammoth';
import { logger } from '@/lib/logger';
import { checkRateLimitAsync, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { scanZipDecompressed } from '@/lib/zip-bomb-guard';
import { checkSameOriginHeaders } from '@/lib/api-origin-guard';

export const dynamic = 'force-dynamic';

function normalizeNarrativeText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPdfPageMarkerLine(line: string) {
  return /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) ||
    /^-?\s*\d+\s*-?$/.test(line) ||
    /^page\s+\d+(?:\s+of\s+\d+)?$/i.test(line);
}

type PdfNormalizationWarning =
  | 'pdf-page-markers-normalized'
  | 'pdf-running-lines-normalized';

function canonicalPdfLine(line: string) {
  return line.replace(/\s+/g, ' ').trim().toLowerCase();
}

function isNarrativeHeadingLine(line: string) {
  return /^(chapter\s*\d+|chap\.?\s*\d+|episode\s*\d+|ep\.?\s*\d+|prologue|epilogue|interlude|side\s*story|제\s*\d+\s*(화|장)|\d+\s*(화|장)|#\s+.+|##\s+.+)$/i.test(line);
}

function isLikelyPdfRunningLine(line: string) {
  if (line.length > 80) return false;
  if (isNarrativeHeadingLine(line)) return false;
  if (/[.!?。！？…]$/.test(line)) return false;
  return true;
}

function collectRepeatedPdfRunningLines(lines: string[]) {
  const boundaryCounts = new Map<string, number>();

  const addCandidate = (line: string | undefined) => {
    if (!line || !isLikelyPdfRunningLine(line)) return;
    const key = canonicalPdfLine(line);
    if (!key) return;
    boundaryCounts.set(key, (boundaryCounts.get(key) ?? 0) + 1);
  };

  const findSiblingLine = (startIndex: number, direction: 1 | -1) => {
    for (let index = startIndex; index >= 0 && index < lines.length; index += direction) {
      const line = lines[index]?.trim() ?? '';
      if (line) return line;
    }
    return '';
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (!isPdfPageMarkerLine(line)) continue;
    addCandidate(findSiblingLine(index - 1, -1));
    addCandidate(findSiblingLine(index + 1, 1));
  }

  return new Set(
    Array.from(boundaryCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([key]) => key),
  );
}

function normalizePdfExtractedText(text: string) {
  const lines = normalizeNarrativeText(text)
    .split('\n')
    .map((line) => line.trim());
  const repeatedRunningLines = collectRepeatedPdfRunningLines(lines);
  const warnings = new Set<PdfNormalizationWarning>();

  const normalizedText = lines
    .filter((line) => {
      if (!line) return true;
      if (isPdfPageMarkerLine(line)) {
        warnings.add('pdf-page-markers-normalized');
        return false;
      }
      if (repeatedRunningLines.has(canonicalPdfLine(line))) {
        warnings.add('pdf-running-lines-normalized');
        return false;
      }
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text: normalizedText, warnings: Array.from(warnings) };
}

function splitByHeadings(content: string) {
  const headingPattern =
    /^(chapter\s*\d+|chap\.?\s*\d+|episode\s*\d+|ep\.?\s*\d+|prologue|epilogue|interlude|side\s*story|제\s*\d+\s*(화|장)|\d+\s*(화|장)|#\s+.+|##\s+.+)$/i;
  const sections: { title: string; content: string }[] = [];
  const lines = normalizeNarrativeText(content).split('\n');

  let currentTitle = '';
  let currentLines: string[] = [];
  let sawHeading = false;

  const pushSection = (fallbackTitle?: string) => {
    const sectionContent = currentLines.join('\n').trim();
    if (!sectionContent) return;

    sections.push({
      title: currentTitle || fallbackTitle || `Part ${sections.length + 1}`,
      content: sectionContent,
    });

    currentLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isHeading = headingPattern.test(line);

    if (isHeading) {
      if (currentTitle) {
        pushSection();
      }

      currentTitle = line.replace(/^#+\s*/, '').trim() || `Part ${sections.length + 1}`;
      sawHeading = true;
      continue;
    }

    currentLines.push(rawLine);
  }

  if (!sawHeading) {
    return [];
  }

  pushSection(currentTitle || `Part ${sections.length + 1}`);
  return sections;
}

function splitByInlineHeadings(content: string) {
  const normalized = normalizeNarrativeText(content).replace(/\n+/g, ' ');
  const markerPattern =
    /(?:^|\s)((?:chapter\s*\d+|chap\.?\s*\d+|episode\s*\d+|ep\.?\s*\d+|제\s*\d+\s*(?:화|장)|\d+\s*(?:화|장)))(?=\s+)/gi;
  const markers = Array.from(normalized.matchAll(markerPattern))
    .map((match) => {
      const title = match[1]?.trim() ?? '';
      const index = (match.index ?? 0) + match[0].indexOf(match[1] ?? '');
      return { title, index };
    })
    .filter((marker) => marker.title.length > 0);

  if (markers.length < 2) return [];

  return markers
    .map((marker, index) => {
      const start = marker.index + marker.title.length;
      const end = markers[index + 1]?.index ?? normalized.length;
      return {
        title: marker.title,
        content: normalized.slice(start, end).trim(),
      };
    })
    .filter((section) => section.content.length > 0);
}

function splitByParagraphBlocks(content: string, maxChunkChars: number) {
  const rawChunks = normalizeNarrativeText(content)
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const sections: { title: string; content: string }[] = [];
  let currentChunk = '';
  let index = 1;

  for (const paragraph of rawChunks) {
    if (currentChunk && currentChunk.length + paragraph.length > maxChunkChars) {
      sections.push({ title: `Split Part ${index++}`, content: currentChunk });
      currentChunk = paragraph;
      continue;
    }

    currentChunk += currentChunk ? `\n\n${paragraph}` : paragraph;
  }

  if (currentChunk) {
    sections.push({ title: `Split Part ${index}`, content: currentChunk });
  }

  return sections;
}

function splitNarrativeContent(content: string, maxChunkChars: number) {
  const headingSections = splitByHeadings(content);
  if (headingSections.length) {
    return headingSections;
  }

  const inlineSections = splitByInlineHeadings(content);
  if (inlineSections.length) {
    return inlineSections;
  }

  return splitByParagraphBlocks(content, maxChunkChars);
}

function decodeXmlText(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#(\d+);/g, (_, decimal: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(decimal, 10));
      } catch {
        return '';
      }
    })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeZipPath(value: string) {
  return value.replace(/\\/g, '/').replace(/^\/+/, '');
}

function joinZipPath(basePath: string, href: string) {
  const baseParts = normalizeZipPath(basePath).split('/').filter(Boolean);
  baseParts.pop();
  for (const part of normalizeZipPath(href).split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join('/');
}

function readZipEntries(buffer: Buffer) {
  const entries = new Map<string, Buffer>();
  const eocdSig = 0x06054b50;
  const cdSig = 0x02014b50;
  const lfhSig = 0x04034b50;
  let eocdOffset = -1;

  for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 65557); index -= 1) {
    if (buffer.readUInt32LE(index) === eocdSig) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) return entries;

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== cdSig) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = normalizeZipPath(buffer.slice(offset + 46, offset + 46 + nameLength).toString('utf8'));

    if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === lfhSig) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.slice(dataStart, dataStart + compressedSize);
      if (method === 0) entries.set(name.toLowerCase(), compressed);
      // [H1 fix] Cap inflate output so a crafted deflate stream cannot expand past
      // ZIP_DECOMPRESSED_CAP into OOM. scanZipDecompressed only trusts the Central
      // Directory's *declared* uncompressedSize, which an attacker can forge; this
      // enforces the limit on the *actual* output. inflateRawSync throws on overflow,
      // and every readZipEntries caller runs inside the POST try/catch (line 708).
      if (method === 8) {
        entries.set(name.toLowerCase(), inflateRawSync(compressed, { maxOutputLength: ZIP_DECOMPRESSED_CAP }));
      }
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function extractWordXmlText(xml: string) {
  return decodeXmlText(
    Array.from(xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi))
      .map((match) => match[1])
      .join(''),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDocxTableMarkdown(buffer: Buffer) {
  const documentXml = readZipEntries(buffer).get('word/document.xml')?.toString('utf8') ?? '';
  const tables: string[] = [];

  for (const tableMatch of documentXml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/gi)) {
    const rows = Array.from(tableMatch[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/gi))
      .map((rowMatch) => Array.from(rowMatch[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/gi))
        .map((cellMatch) => extractWordXmlText(cellMatch[0]))
        .filter(Boolean))
      .filter((row) => row.length > 0);

    if (rows.length === 0) continue;
    const columnCount = Math.max(...rows.map((row) => row.length));
    const normalizeRow = (row: string[]) => [
      ...row,
      ...Array.from({ length: Math.max(0, columnCount - row.length) }, () => ''),
    ];
    const [header, ...bodyRows] = rows.map(normalizeRow);
    const lines = [
      `| ${header.join(' | ')} |`,
      `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`,
      ...bodyRows.map((row) => `| ${row.join(' | ')} |`),
    ];
    tables.push(lines.join('\n'));
  }

  return tables.join('\n\n');
}

async function extractDocxText(buffer: Buffer) {
  const mammothMarkdown = mammoth as typeof mammoth & {
    convertToMarkdown?: (input: { buffer: Buffer }) => Promise<{ value?: string }>;
  };
  const markdownResult = typeof mammothMarkdown.convertToMarkdown === 'function'
    ? await mammothMarkdown.convertToMarkdown({ buffer })
    : await mammoth.extractRawText({ buffer });
  const markdownText = markdownResult.value ?? '';
  const tableText = extractDocxTableMarkdown(buffer);
  return normalizeNarrativeText([markdownText, tableText].filter((part) => part.trim()).join('\n\n'));
}

async function extractPdfText(buffer: Buffer) {
  const pdfModule = await import('pdf-parse') as unknown as {
    default?: unknown;
    PDFParse?: new (params: { data: Buffer }) => {
      getText: () => Promise<{ text?: string }>;
      destroy?: () => Promise<void>;
    };
  };
  const legacyParser = typeof pdfModule.default === 'function' ? pdfModule.default : null;
  if (legacyParser) {
    const data = await (legacyParser as (input: Buffer) => Promise<{ text?: string }>)(buffer);
    return data.text ?? '';
  }

  const Parser = pdfModule.PDFParse;
  if (!Parser) {
    throw new Error('PDF parser unavailable');
  }

  const parser = new Parser({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? '';
  } finally {
    await parser.destroy?.();
  }
}

function extractEpubChaptersFromZip(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  const container = entries.get('meta-inf/container.xml')?.toString('utf8') ?? '';
  const rootFile = container.match(/full-path=["']([^"']+)["']/i)?.[1];
  if (!rootFile) return { chapters: [], warnings: ['missing-epub-navigation'] };

  const opfPath = normalizeZipPath(rootFile);
  const opf = entries.get(opfPath.toLowerCase())?.toString('utf8') ?? '';
  if (!opf) return { chapters: [], warnings: ['missing-epub-navigation'] };

  const manifest = new Map<string, { href: string; mediaType: string }>();
  for (const match of opf.matchAll(/<item\b[^>]*>/gi)) {
    const tag = match[0];
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const mediaType = tag.match(/\bmedia-type=["']([^"']+)["']/i)?.[1] ?? '';
    if (id && href) manifest.set(id, { href, mediaType });
  }

  const spineIds = Array.from(opf.matchAll(/<itemref\b[^>]*idref=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]);
  const ncxItem = Array.from(manifest.values()).find((item) => item.mediaType === 'application/x-dtbncx+xml');
  const navItem = Array.from(manifest.values()).find((item) => item.mediaType === 'application/xhtml+xml' && /(?:^|\/)nav\.(?:xhtml|html)$/i.test(item.href));
  const warnings = !ncxItem && !navItem ? ['missing-epub-navigation'] : [];
  const ncx = ncxItem ? entries.get(joinZipPath(opfPath, ncxItem.href).toLowerCase())?.toString('utf8') ?? '' : '';
  const titlesByHref = new Map<string, string>();

  for (const match of ncx.matchAll(/<navPoint\b[\s\S]*?<navLabel>\s*<text>([\s\S]*?)<\/text>\s*<\/navLabel>[\s\S]*?<content\s+src=["']([^"']+)["'][^>]*>/gi)) {
    titlesByHref.set(normalizeZipPath(match[2].split('#')[0]).toLowerCase(), decodeXmlText(match[1].replace(/<[^>]+>/g, '')).trim());
  }

  const ids = spineIds.length > 0 ? spineIds : Array.from(manifest.keys());
  const chapters = ids
    .map((id, index) => {
      const item = manifest.get(id);
      if (!item || item.mediaType !== 'application/xhtml+xml') return null;
      const chapterPath = joinZipPath(opfPath, item.href);
      const html = entries.get(chapterPath.toLowerCase())?.toString('utf8') ?? '';
      const plain = decodeXmlText(html.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n')).trim();
      if (plain.length <= 50) return null;
      const title = titlesByHref.get(normalizeZipPath(item.href).toLowerCase()) || `Chapter ${index + 1}`;
      return { title, content: plain };
    })
    .filter((chapter): chapter is { title: string; content: string } => Boolean(chapter));

  return { chapters, warnings };
}

function extractHwpxParagraphText(paragraphXml: string) {
  const withLineBreaks = paragraphXml.replace(/<hp:lineBreak\b[^>]*\/?>/gi, '\n');
  return decodeXmlText(
    Array.from(withLineBreaks.matchAll(/<hp:t\b[^>]*>([\s\S]*?)<\/hp:t>/gi))
      .map((match) => match[1])
      .join(''),
  ).trimEnd();
}

function sectionNumberFromPath(path: string) {
  const match = path.match(/section(\d+)\.xml$/i);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function extractHwpxSectionText(xml: string) {
  const paragraphs = Array.from(xml.matchAll(/<hp:p\b[\s\S]*?<\/hp:p>/gi))
    .map((match) => extractHwpxParagraphText(match[0]))
    .filter((line) => line.trim().length > 0);

  if (paragraphs.length > 0) {
    return paragraphs.join('\n');
  }

  return decodeXmlText(
    Array.from(xml.matchAll(/<hp:t\b[^>]*>([\s\S]*?)<\/hp:t>/gi))
      .map((match) => match[1])
      .join('\n'),
  ).trim();
}

function extractHwpxText(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  const sectionEntries = Array.from(entries.entries())
    .filter(([path]) => /^contents\/section\d+\.xml$/i.test(path))
    .sort(([left], [right]) => sectionNumberFromPath(left) - sectionNumberFromPath(right));

  return normalizeNarrativeText(
    sectionEntries
      .map(([, data]) => extractHwpxSectionText(data.toString('utf8')))
      .filter((part) => part.trim().length > 0)
      .join('\n\n'),
  );
}

const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'application/epub+zip': [0x50, 0x4B, 0x03, 0x04],
  'application/hwp+zip': [0x50, 0x4B, 0x03, 0x04],
  'application/vnd.openxmlformats-officedocument': [0x50, 0x4B, 0x03, 0x04],
  'text/plain': [],
  'text/markdown': [],
};

function validateMagicBytes(buffer: Buffer, expectedMime: string): boolean {
  const magic = MAGIC_BYTES[expectedMime];
  if (!magic || magic.length === 0) return true;
  if (buffer.length < magic.length) return false;
  return magic.every((byte, index) => buffer[index] === byte);
}

function getMimeForExtension(fileName: string): string | null {
  if (fileName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument';
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.endsWith('.epub')) return 'application/epub+zip';
  if (fileName.endsWith('.hwpx')) return 'application/hwp+zip';
  if (fileName.endsWith('.txt')) return 'text/plain';
  if (fileName.endsWith('.md')) return 'text/markdown';
  return null;
}

const DEFAULT_PARAGRAPH_CHUNK = 4000;
const TRANSLATOR_PARAGRAPH_CHUNK = 9500;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ZIP_DECOMPRESSED_CAP = 100 * 1024 * 1024;

function classifyUploadParseError(err: unknown, fileName: string) {
  const reason = err instanceof Error ? err.message : String(err ?? '');
  const normalized = `${fileName} ${reason}`.toLowerCase();
  if (
    fileName.endsWith('.pdf') &&
    (normalized.includes('password') || normalized.includes('encrypted') || reason.includes('암호'))
  ) {
    return '암호가 걸린 PDF입니다. 잠금 해제 후 다시 불러오세요.';
  }
  if (
    fileName.endsWith('.epub') &&
    (normalized.includes('drm') ||
      normalized.includes('encrypted') ||
      normalized.includes('corrupt') ||
      normalized.includes('invalid') ||
      normalized.includes('end of central directory'))
  ) {
    return 'DRM 또는 손상된 EPUB일 수 있습니다. DRM 없는 원본 파일을 확인해 주세요.';
  }
  if (
    fileName.endsWith('.hwpx') &&
    (normalized.includes('encrypted') ||
      normalized.includes('corrupt') ||
      normalized.includes('invalid') ||
      normalized.includes('end of central directory'))
  ) {
    return '암호화되었거나 손상된 HWPX일 수 있습니다. 한글에서 HWPX로 다시 저장한 뒤 불러오세요.';
  }
  return '문서 파싱 중 오류가 발생했습니다. 파일 형식을 확인해주세요.';
}

export async function POST(req: NextRequest) {
  let activeFileName = '';
  try {
    const originCheck = checkSameOriginHeaders(req.headers);
    if (!originCheck.ok) {
      return NextResponse.json({ error: originCheck.error }, { status: 403 });
    }

    const ip = getClientIp(req.headers);
    const rl = await checkRateLimitAsync(ip, 'upload', RATE_LIMITS.upload);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: '업로드 요청이 너무 많습니다.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const authHeader = req.headers.get('authorization');
    let verified = false;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyFirebaseIdToken } = await import('@/lib/firebase-id-token');
        const token = authHeader.slice(7).trim();
        verified = Boolean(await verifyFirebaseIdToken(token));
      } catch {
        // Verification failure is handled by the gate below.
      }
    }
    if (!verified) {
      return NextResponse.json(
        { error: 'Authentication required for file upload' },
        { status: 401 },
      );
    }

    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const clientSource = formData.get('source');
    const maxChunkChars =
      clientSource === 'eh-translator' ? TRANSLATOR_PARAGRAPH_CHUNK : DEFAULT_PARAGRAPH_CHUNK;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }
    const fileName = file.name.toLowerCase();
    activeFileName = fileName;

    const expectedMime = getMimeForExtension(fileName);
    if (expectedMime && !validateMagicBytes(buffer, expectedMime)) {
      return NextResponse.json({ error: 'File content does not match declared type' }, { status: 400 });
    }

    let content = '';
    let warnings: string[] = [];

    if (fileName.endsWith('.docx')) {
      const zipCheck = scanZipDecompressed(buffer, ZIP_DECOMPRESSED_CAP);
      if (!zipCheck.ok) {
        logger.warn('upload/docx', `zip-bomb guard rejected: ${zipCheck.reason}`, {
          totalUncompressed: zipCheck.totalUncompressed,
        });
        return NextResponse.json(
          { error: `DOCX 검증 실패: ${zipCheck.reason}` },
          { status: 413 },
        );
      }

      content = await extractDocxText(buffer);
    } else if (fileName.endsWith('.hwpx')) {
      const zipCheck = scanZipDecompressed(buffer, ZIP_DECOMPRESSED_CAP);
      if (!zipCheck.ok) {
        logger.warn('upload/hwpx', `zip-bomb guard rejected: ${zipCheck.reason}`, {
          totalUncompressed: zipCheck.totalUncompressed,
        });
        return NextResponse.json(
          { error: `HWPX 검증 실패: ${zipCheck.reason}` },
          { status: 413 },
        );
      }

      content = extractHwpxText(buffer);
    } else if (fileName.endsWith('.pdf')) {
      const normalizedPdf = normalizePdfExtractedText(await extractPdfText(buffer));
      content = normalizedPdf.text;
      warnings = normalizedPdf.warnings;
    } else if (fileName.endsWith('.epub')) {
      const zipCheck = scanZipDecompressed(buffer, ZIP_DECOMPRESSED_CAP);
      if (!zipCheck.ok) {
        logger.warn('upload/epub', `zip-bomb guard rejected: ${zipCheck.reason}`, {
          totalUncompressed: zipCheck.totalUncompressed,
        });
        return NextResponse.json(
          { error: `EPUB 검증 실패: ${zipCheck.reason}` },
          { status: 413 },
        );
      }

      const EPubModule = await import('epub2');
      const EPub = EPubModule.default || EPubModule;
      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      const tempPath = path.join(os.tmpdir(), `temp-${crypto.randomUUID()}.epub`);
      try {
        fs.writeFileSync(tempPath, buffer);

        let epubData: { title: string; content: string }[];
        const zipFallback = extractEpubChaptersFromZip(buffer);
        const epubWarnings = zipFallback.warnings;
        try {
          epubData = await new Promise<{ title: string; content: string }[]>((resolve, reject) => {
            const epub = new EPub(tempPath, '/images/', '/links/');
            epub.on('error', reject);
            epub.on('end', () => {
              const chaptersData: { title: string; content: string }[] = [];
              const flow = ((epub as unknown as { flow?: { id?: string; title?: string }[] }).flow) || [];
              let processed = 0;
              if (flow.length === 0) return resolve([]);
              flow.forEach((chapter: { id?: string; title?: string }, index: number) => {
                epub.getChapter(chapter.id || '', (err: Error | null, text?: string) => {
                  if (!err && text) {
                    const plain = text.replace(/<[^>]+>/g, '\n').trim();
                    if (plain.length > 50) chaptersData[index] = { title: chapter.title || `Chapter ${index + 1}`, content: plain };
                  }
                  processed += 1;
                  if (processed === flow.length) resolve(chaptersData.filter(Boolean));
                });
              });
            });
            epub.parse();
          });
          if (epubData.length === 0 && zipFallback.chapters.length > 0) {
            logger.warn('upload/epub', 'epub2 parser returned no chapters; using zip fallback', {
              fileName,
            });
            epubData = zipFallback.chapters;
          }
        } catch (error) {
          logger.warn('upload/epub', 'epub2 parser failed; using zip fallback', {
            reason: error instanceof Error ? error.message : String(error),
          });
          epubData = zipFallback.chapters;
        }
        return NextResponse.json({ chapters: epubData, warnings: epubWarnings });
      } finally {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Temporary file may already be gone.
        }
      }
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      content = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: '지원하지 않는 문서 형식입니다.' }, { status: 400 });
    }

    const chapters = splitNarrativeContent(content, maxChunkChars);

    return NextResponse.json({
      chapters,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch (err: unknown) {
    logger.error('EH Translator upload', err);
    return NextResponse.json({ error: classifyUploadParseError(err, activeFileName) }, { status: 400 });
  }
}
