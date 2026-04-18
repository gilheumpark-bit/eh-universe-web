import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import mammoth from 'mammoth';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
// For multipart form body parsing, we do not need body parser false in Next.js App Router.

function normalizeNarrativeText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

  return splitByParagraphBlocks(content, maxChunkChars);
}

// Magic bytes validation — ensures file content matches declared MIME type
const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],           // %PDF
  'application/epub+zip': [0x50, 0x4B, 0x03, 0x04],      // PK (ZIP)
  'application/vnd.openxmlformats-officedocument': [0x50, 0x4B, 0x03, 0x04], // PK (ZIP for docx/xlsx)
  'text/plain': [], // no magic bytes check for text
  'text/markdown': [], // no magic bytes check for markdown
};

function validateMagicBytes(buffer: Buffer, expectedMime: string): boolean {
  const magic = MAGIC_BYTES[expectedMime];
  if (!magic || magic.length === 0) return true; // no check needed
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

function getMimeForExtension(fileName: string): string | null {
  if (fileName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument';
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.endsWith('.epub')) return 'application/epub+zip';
  if (fileName.endsWith('.txt')) return 'text/plain';
  if (fileName.endsWith('.md')) return 'text/markdown';
  return null;
}

const DEFAULT_PARAGRAPH_CHUNK = 4000;
/** EH Translator 클라이언트가 보낼 때만 — 번역 스튜디오 업로드 한정 */
const TRANSLATOR_PARAGRAPH_CHUNK = 9500;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (!origin) {
      return NextResponse.json({ error: 'Forbidden: Origin header required' }, { status: 403 });
    }
    try {
      if (host && new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(ip, 'upload', RATE_LIMITS.upload);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: '업로드 요청이 너무 많습니다.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    // [C] 인증 게이트 — 익명 20MB 업로드 → CPU/메모리/디스크 고갈 방어
    const authHeader = req.headers.get('authorization');
    let verified = false;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyFirebaseIdToken } = await import('@/lib/firebase-id-token');
        const token = authHeader.slice(7).trim();
        verified = Boolean(await verifyFirebaseIdToken(token));
      } catch { /* verification failed */ }
    }
    if (!verified) {
      return NextResponse.json(
        { error: 'Authentication required for file upload' },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const clientSource = formData.get('source');
    const maxChunkChars =
      clientSource === 'eh-translator' ? TRANSLATOR_PARAGRAPH_CHUNK : DEFAULT_PARAGRAPH_CHUNK;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }
    const fileName = file.name.toLowerCase();

    // Validate magic bytes to prevent extension spoofing
    const expectedMime = getMimeForExtension(fileName);
    if (expectedMime && !validateMagicBytes(buffer, expectedMime)) {
      return NextResponse.json({ error: 'File content does not match declared type' }, { status: 400 });
    }

    let content = '';

    // DOCX PARSING
    if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } 
    // PDF PARSING
    else if (fileName.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-parse module shape varies across CJS/ESM
      const pdfParse = await import('pdf-parse').then((m: any) => m.default || m);
      // Create a blob/buffer for pdf-parse
      const data = await pdfParse(buffer);
      content = data.text;
    } 
    // EPUB PARSING
    else if (fileName.endsWith('.epub')) {
      const EPubModule = await import('epub2');
      const EPub = EPubModule.default || EPubModule;
      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      // [G] randomUUID — Date.now() 충돌 race condition 방지
      const tempPath = path.join(os.tmpdir(), `temp-${crypto.randomUUID()}.epub`);
      try {
        fs.writeFileSync(tempPath, buffer);

        const epubData = await new Promise<{ title: string; content: string }[]>((resolve) => {
          const epub = new EPub(tempPath, '/images/', '/links/');
          epub.on('end', () => {
            const chaptersData: { title: string; content: string }[] = [];
            const flow = ((epub as unknown as { flow?: { id?: string; title?: string }[] }).flow) || [];
            let processed = 0;
            if (flow.length === 0) return resolve([]);
            flow.forEach((chapter: { id?: string; title?: string }, index: number) => {
              epub.getChapter(chapter.id || '', (err: Error | null, text?: string) => {
                if (!err && text) {
                  const plain = text.replace(/<[^>]+>/g, '\n').trim();
                  if (plain.length > 50) chaptersData[index] = { title: chapter.title || `Chapter ${index+1}`, content: plain };
                }
                processed++;
                if (processed === flow.length) resolve(chaptersData.filter(Boolean));
              });
            });
          });
          epub.parse();
        });
        return NextResponse.json({ chapters: epubData });
      } finally {
        try { fs.unlinkSync(tempPath); } catch { /* already cleaned */ }
      }
    } 
    // TXT/MD
    else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      content = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: '지원하지 않는 문서 형식입니다.' }, { status: 400 });
    }

    const chapters = splitNarrativeContent(content, maxChunkChars);

    return NextResponse.json({ chapters });
  } catch (err: unknown) {
    logger.error('EH Translator upload', err);
    return NextResponse.json({ error: '문서 파싱 중 오류가 발생했습니다. 파일 형식을 확인해주세요.' }, { status: 400 });
  }
}
