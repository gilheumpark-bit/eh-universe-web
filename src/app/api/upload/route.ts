import { NextRequest, NextResponse } from 'next/server';
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
    
    let content = '';

    // DOCX PARSING
    if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } 
    // PDF PARSING
    else if (fileName.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = await import('pdf-parse').then((m: any) => m.default || m);
      // Create a blob/buffer for pdf-parse
      const data = await pdfParse(buffer);
      content = data.text;
    } 
    // EPUB PARSING
    else if (fileName.endsWith('.epub')) {
      const EPubModule = await import('epub2');
      const EPub = EPubModule.default || EPubModule;
      // epub2 usually expects a file path, to use buffer, we might need a temp file or memfs.
      // But let's fallback to rudimentary regex extraction if epub2 requires file path.
      // Actually epub2 supports parsing from buffer via EPub constructor if we hack the prototype, but the easiest way in a NextJS edge/serverless is using a tmp directory or just basic AdmZip parsing.
      // For now, let's write the buffer to /tmp (Vercel allows write to /tmp)
      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      const tempPath = path.join(os.tmpdir(), `temp-${Date.now()}.epub`);
      fs.writeFileSync(tempPath, buffer);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const epubData = await new Promise<any[]>((resolve) => {
        const epub = new EPub(tempPath, '/images/', '/links/');
        epub.on('end', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const chaptersData: any[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const flow = (epub as any).flow || [];
          let processed = 0;
          if (flow.length === 0) return resolve([]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          flow.forEach((chapter: any, index: number) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            epub.getChapter(chapter.id || '', (err: any, text?: string) => {
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
      fs.unlinkSync(tempPath);
      return NextResponse.json({ chapters: epubData });
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
    return NextResponse.json({ error: '문서 파싱 중 오류가 발생했습니다. 파일 형식을 확인해주세요.' }, { status: 500 });
  }
}
