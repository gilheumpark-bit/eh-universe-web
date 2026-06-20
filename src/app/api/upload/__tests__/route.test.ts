import JSZip from 'jszip';

const mockLoggerError = jest.fn();
const mockPdfGetText = jest.fn(async () => ({ text: 'Loreguard PDF sample text\n\n-- 1 of 1 --\n\n' }));
const mockPdfDestroy = jest.fn(async () => undefined);

class UploadFakeResponse {
  private readonly responseBody: unknown;
  private readonly responseStatus: number;

  get status() {
    return this.responseStatus;
  }

  constructor(body: unknown, status: number) {
    this.responseBody = body;
    this.responseStatus = status;
  }

  async json() {
    return this.responseBody;
  }

  static json(body: unknown, options?: { status?: number }) {
    return new UploadFakeResponse(body, options?.status ?? 200);
  }
}

jest.mock('next/server', () => ({
  NextResponse: UploadFakeResponse,
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true, retryAfterMs: 0 })),
  getClientIp: jest.fn(() => '203.0.113.10'),
  RATE_LIMITS: { upload: { windowMs: 60_000, maxRequests: 20 } },
}));

jest.mock('@/lib/firebase-id-token', () => ({
  verifyFirebaseIdToken: jest.fn(async () => ({ uid: 'user-1', tier: 'pro' })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/creative-process/event-recorder', () => ({
  listCreativeEvents: jest.fn().mockResolvedValue([]),
  recordCreativeEvent: jest.fn(),
  countCreativeEvents: jest.fn().mockResolvedValue(0),
  CREATIVE_EVENT_CAPTURED: 'noa:creative-event-captured',
}));

jest.mock('@/lib/creative-process/source-recorder', () => ({
  listSources: jest.fn().mockResolvedValue([]),
  recordSource: jest.fn(),
  countSources: jest.fn().mockResolvedValue(0),
  getSource: jest.fn(),
  computeSha256Hex: async (text: string) => {
    let h = 0;
    for (let index = 0; index < text.length; index += 1) {
      h = ((h << 5) - h + text.charCodeAt(index)) | 0;
    }
    return Math.abs(h).toString(16).padStart(64, '0');
  },
}));

jest.mock('pdf-parse', () => ({
  PDFParse: class {
    async getText() {
      return mockPdfGetText();
    }

    async destroy() {
      return mockPdfDestroy();
    }
  },
}));

type UploadRequest = Parameters<(typeof import('../route'))['POST']>[0];
type UploadTestFile = {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

interface UploadChapter {
  title?: string;
  content: string;
}

interface UploadResponseBody {
  chapters: UploadChapter[];
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function makeUploadFile(name: string, bytes: Uint8Array): UploadTestFile {
  return {
    name,
    arrayBuffer: async () => toArrayBuffer(bytes),
  };
}

class UploadFakeRequest {
  headers: Headers;
  private readonly file: UploadTestFile;
  private readonly source: string;

  constructor(file: UploadTestFile, source = 'loreguard-project-start') {
    this.headers = new Headers({
      origin: 'https://app.example',
      host: 'app.example',
      authorization: 'Bearer token-1',
    });
    this.file = file;
    this.source = source;
  }

  async formData() {
    return {
      get: (key: string) => {
        if (key === 'file') return this.file;
        if (key === 'source') return this.source;
        return null;
      },
    };
  }
}

async function makeDocxFile() {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>세계관 배경과 역사 세력 국가 마법 기술 DOCX 샘플입니다.</w:t></w:r></w:p></w:body></w:document>',
  );
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return makeUploadFile('world.docx', buffer);
}

async function makeMultiChapterDocxFile() {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    'word/document.xml',
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>',
      '<w:p><w:r><w:t>제 1화</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>첫 회차는 세계관 배경과 주인공의 목표를 보여준다.</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>제 2화</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>두 번째 회차는 세력 갈등과 권리 IP 메모를 이어간다.</w:t></w:r></w:p>',
      '</w:body></w:document>',
    ].join(''),
  );
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return makeUploadFile('serialized.docx', buffer);
}

async function makeStructuredDocxFile() {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    'word/styles.xml',
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/></w:style>',
      '</w:styles>',
    ].join(''),
  );
  zip.file(
    'word/document.xml',
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>',
      '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>IP Pack 제출용 표</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>세계관 배경과 국가, 마법, 역사 메모도 첨부되어 있습니다.</w:t></w:r></w:p>',
      '<w:tbl>',
      '<w:tr><w:tc><w:p><w:r><w:t>구분</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>각색권</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>정산</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>독점</w:t></w:r></w:p></w:tc></w:tr>',
      '<w:tr><w:tc><w:p><w:r><w:t>웹툰화</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>가능</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>별도 협의</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>비독점</w:t></w:r></w:p></w:tc></w:tr>',
      '</w:tbl>',
      '</w:body></w:document>',
    ].join(''),
  );
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return makeUploadFile('ip-pack-structured.docx', buffer);
}

async function makeDocxWithOversizedCentralDirectory() {
  const source = await makeDocxFile();
  const buffer = Buffer.from(await source.arrayBuffer());
  const centralDirectorySignature = 0x02014b50;
  let patched = false;

  for (let index = 0; index + 46 <= buffer.length; index += 1) {
    if (buffer.readUInt32LE(index) !== centralDirectorySignature) continue;
    buffer.writeUInt32LE((100 * 1024 * 1024) + 1, index + 24);
    patched = true;
    break;
  }

  if (!patched) {
    throw new Error('central directory header not found in DOCX fixture');
  }

  return makeUploadFile('oversized.docx', buffer);
}

function makePdfFile() {
  const text = 'Loreguard PDF sample text';
  const stream = `BT\n/F1 18 Tf\n72 720 Td\n(${text}) Tj\nET`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += object;
  }
  const xref = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return makeUploadFile('chapter.pdf', Buffer.from(body, 'utf8'));
}

async function makeEpubFile() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  zip.file(
    'OEBPS/content.opf',
    '<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Sample</dc:title><dc:identifier id="BookId">sample</dc:identifier><dc:language>ko</dc:language></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="chap1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="chap1" linear="yes"/></spine></package>',
  );
  zip.file(
    'OEBPS/toc.ncx',
    '<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="sample"/></head><docTitle><text>Sample</text></docTitle><navMap><navPoint id="navPoint-1" playOrder="1"><navLabel><text>프롤로그</text></navLabel><content src="chapter1.xhtml"/></navPoint></navMap></ncx>',
  );
  zip.file(
    'OEBPS/chapter1.xhtml',
    '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>프롤로그</title></head><body><h1>프롤로그</h1><p>세계관 배경과 역사 세력 국가 마법 기술을 정리한 EPUB 샘플입니다.</p></body></html>',
  );
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return makeUploadFile('novel.epub', buffer);
}

async function makeMultiChapterEpubFile() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  zip.file(
    'OEBPS/content.opf',
    '<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Multi Sample</dc:title><dc:identifier id="BookId">multi-sample</dc:identifier><dc:language>ko</dc:language></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="chap1" href="chapter1.xhtml" media-type="application/xhtml+xml"/><item id="chap2" href="chapter2.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="chap1" linear="yes"/><itemref idref="chap2" linear="yes"/></spine></package>',
  );
  zip.file(
    'OEBPS/toc.ncx',
    '<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="multi-sample"/></head><docTitle><text>Multi Sample</text></docTitle><navMap><navPoint id="navPoint-1" playOrder="1"><navLabel><text>제 1화</text></navLabel><content src="chapter1.xhtml"/></navPoint><navPoint id="navPoint-2" playOrder="2"><navLabel><text>제 2화</text></navLabel><content src="chapter2.xhtml"/></navPoint></navMap></ncx>',
  );
  zip.file(
    'OEBPS/chapter1.xhtml',
    '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>제 1화</title></head><body><h1>제 1화</h1><p>첫 EPUB 회차는 세계관 배경과 세력 구도를 설명한다. 주인공의 목표, 금기, 도시의 규칙, 다음 회차로 이어지는 사건 단서를 함께 남긴다.</p></body></html>',
  );
  zip.file(
    'OEBPS/chapter2.xhtml',
    '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>제 2화</title></head><body><h1>제 2화</h1><p>두 번째 EPUB 회차는 캐릭터 선택과 사건 전환을 보여준다. 동맹의 흔들림, 권리 IP 메모, 출고 전 점검해야 할 설정 충돌까지 기록한다.</p></body></html>',
  );
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return makeUploadFile('serialized.epub', buffer);
}

async function makeEpubWithoutNavigationFile() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  zip.file(
    'OEBPS/content.opf',
    '<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>No Nav Sample</dc:title><dc:identifier id="BookId">sample-no-nav</dc:identifier><dc:language>ko</dc:language></metadata><manifest><item id="chap1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chap1" linear="yes"/></spine></package>',
  );
  zip.file(
    'OEBPS/chapter1.xhtml',
    '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>본문</title></head><body><h1>본문</h1><p>목차 파일은 없지만 본문은 추출 가능한 EPUB 샘플입니다. 세계관 배경과 세력 정보를 포함합니다.</p></body></html>',
  );
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return makeUploadFile('novel-without-nav.epub', buffer);
}

async function upload(file: UploadTestFile) {
  const { POST } = await import('../route');
  return POST(new UploadFakeRequest(file) as unknown as UploadRequest);
}

async function uploadChapters(file: UploadTestFile): Promise<UploadResponseBody> {
  const res = await upload(file);
  expect(res.status).toBe(200);
  return res.json() as Promise<UploadResponseBody>;
}

function reportFromUpload(fileName: string, body: UploadResponseBody, importedAt: string) {
  return {
    id: `sample-${fileName}`,
    fileName,
    status: 'success' as const,
    detail: `${body.chapters.length}개 챕터 추출`,
    candidateCount: body.chapters.length,
    importedAt,
  };
}

describe('/api/upload POST — document extraction samples', () => {
  beforeEach(() => {
    mockLoggerError.mockClear();
    mockPdfGetText.mockReset();
    mockPdfGetText.mockResolvedValue({ text: 'Loreguard PDF sample text\n\n-- 1 of 1 --\n\n' });
    mockPdfDestroy.mockClear();
  });

  it('extracts text from a DOCX sample', async () => {
    const res = await upload(await makeDocxFile());
    const body = await res.json() as { chapters: Array<{ content: string }> };
    expect(res.status).toBe(200);
    expect(body.chapters[0].content).toContain('세계관 배경과 역사 세력 국가 마법 기술 DOCX 샘플');
  });

  it('DOCX 회차 제목을 기준으로 한글 원고를 여러 챕터로 분리한다', async () => {
    const res = await upload(await makeMultiChapterDocxFile());
    const body = await res.json() as { chapters: Array<{ title: string; content: string }> };

    expect(res.status).toBe(200);
    expect(body.chapters).toHaveLength(2);
    expect(body.chapters.map((chapter) => chapter.title)).toEqual(['제 1화', '제 2화']);
    expect(body.chapters[0].content).toContain('첫 회차는 세계관 배경');
    expect(body.chapters[1].content).toContain('두 번째 회차는 세력 갈등');
  });

  it('DOCX 제목 스타일과 표를 불러오기 분류 가능한 구조로 보존한다', async () => {
    const res = await upload(await makeStructuredDocxFile());
    const body = await res.json() as { chapters: Array<{ title: string; content: string }> };

    expect(res.status).toBe(200);
    expect(body.chapters[0]).toMatchObject({
      title: 'IP Pack 제출용 표',
    });
    expect(body.chapters[0].content).toContain('| 구분 | 각색권 | 정산 | 독점 |');

    const { classifyImportedText } = await import('@/lib/loreguard/import-classifier');
    const candidates = classifyImportedText(
      'ip-pack-structured.docx',
      `# ${body.chapters[0].title}\n${body.chapters[0].content}`,
    );

    expect(candidates[0]).toMatchObject({
      bucket: 'rightsIp',
      title: 'IP Pack 제출용 표',
    });
    expect(candidates[0].reason).toContain('양식 구조');
  });

  it('DOCX 압축해제 총량이 상한을 넘으면 파싱 전에 거절한다', async () => {
    const res = await upload(await makeDocxWithOversizedCentralDirectory());
    const body = await res.json() as { error: string };

    expect(res.status).toBe(413);
    expect(body.error).toContain('DOCX 검증 실패');
  });

  it('extracts text from a PDF sample with the installed pdf-parse API shape', async () => {
    const res = await upload(makePdfFile());
    const body = await res.json() as { chapters: Array<{ content: string }>; warnings?: string[] };
    expect(res.status).toBe(200);
    expect(body.chapters[0].content).toContain('Loreguard PDF sample text');
    expect(body.chapters[0].content).not.toContain('-- 1 of 1 --');
    expect(body.warnings).toContain('pdf-page-markers-normalized');
  });

  it('PDF 페이지 표식과 단독 페이지 번호를 후보 본문에서 제거한다', async () => {
    mockPdfGetText.mockResolvedValueOnce({
      text: [
        'Loreguard PDF sample text',
        '-- 1 of 3 --',
        '1',
        'Page 2 of 3',
        '본문 안의 숫자 404와 100화 목표는 유지한다.',
      ].join('\n'),
    });

    const res = await upload(makePdfFile());
    const body = await res.json() as { chapters: Array<{ content: string }>; warnings?: string[] };

    expect(res.status).toBe(200);
    expect(body.chapters[0].content).toContain('Loreguard PDF sample text');
    expect(body.chapters[0].content).toContain('숫자 404와 100화 목표');
    expect(body.chapters[0].content).not.toContain('-- 1 of 3 --');
    expect(body.chapters[0].content).not.toMatch(/\n1\n/);
    expect(body.chapters[0].content).not.toContain('Page 2 of 3');
    expect(body.warnings).toContain('pdf-page-markers-normalized');
  });

  it('PDF 페이지 경계에 반복되는 머리말과 꼬리말을 후보 본문에서 제거한다', async () => {
    mockPdfGetText.mockResolvedValueOnce({
      text: [
        'LOREGUARD DRAFT',
        '제 1화',
        '첫 장면은 세계관의 금기와 주인공의 선택을 보여준다.',
        'CONFIDENTIAL REVIEW COPY',
        '-- 1 of 3 --',
        'LOREGUARD DRAFT',
        '두 번째 장면은 권력 구조와 동맹의 흔들림을 보여준다.',
        'CONFIDENTIAL REVIEW COPY',
        '-- 2 of 3 --',
        'LOREGUARD DRAFT',
        '마지막 장면은 다음 회차의 사건 단서를 남긴다.',
        'CONFIDENTIAL REVIEW COPY',
        '-- 3 of 3 --',
      ].join('\n'),
    });

    const res = await upload(makePdfFile());
    const body = await res.json() as { chapters: Array<{ title: string; content: string }>; warnings?: string[] };

    expect(res.status).toBe(200);
    expect(body.chapters[0].title).toBe('제 1화');
    expect(body.chapters[0].content).toContain('세계관의 금기');
    expect(body.chapters[0].content).toContain('권력 구조');
    expect(body.chapters[0].content).toContain('다음 회차');
    expect(body.chapters[0].content).not.toContain('LOREGUARD DRAFT');
    expect(body.chapters[0].content).not.toContain('CONFIDENTIAL REVIEW COPY');
    expect(body.warnings).toEqual(
      expect.arrayContaining(['pdf-page-markers-normalized', 'pdf-running-lines-normalized']),
    );
  });

  it('PDF 본문에서 반복된 문장은 페이지 경계 잡음으로 오인하지 않는다', async () => {
    mockPdfGetText.mockResolvedValueOnce({
      text: [
        '제 1화',
        '나는 아직 돌아갈 수 없다.',
        '나는 아직 돌아갈 수 없다.',
        '나는 아직 돌아갈 수 없다.',
        '-- 1 of 2 --',
        '두 번째 장면은 선택의 대가를 설명한다.',
        '-- 2 of 2 --',
      ].join('\n'),
    });

    const res = await upload(makePdfFile());
    const body = await res.json() as { chapters: Array<{ content: string }> };

    expect(res.status).toBe(200);
    expect(body.chapters[0].content.match(/나는 아직 돌아갈 수 없다\./g)).toHaveLength(3);
    expect(body.chapters[0].content).toContain('선택의 대가');
  });

  it('PDF 추출 텍스트도 한글 회차 제목을 기준으로 여러 챕터로 분리한다', async () => {
    mockPdfGetText.mockResolvedValueOnce({
      text: [
        '제 1화',
        '첫 PDF 회차는 세계관 배경과 주인공 목표를 정리한다.',
        '',
        '제 2화',
        '두 번째 PDF 회차는 세력 갈등과 사건 전환을 정리한다.',
      ].join('\n'),
    });

    const res = await upload(makePdfFile());
    const body = await res.json() as { chapters: Array<{ title: string; content: string }> };

    expect(res.status).toBe(200);
    expect(body.chapters).toHaveLength(2);
    expect(body.chapters.map((chapter) => chapter.title)).toEqual(['제 1화', '제 2화']);
    expect(body.chapters[0].content).toContain('첫 PDF 회차');
    expect(body.chapters[1].content).toContain('두 번째 PDF 회차');
  });

  it('PDF 추출 줄바꿈이 사라진 경우에도 인라인 회차 제목을 기준으로 분리한다', async () => {
    mockPdfGetText.mockResolvedValueOnce({
      text: '제 1화 첫 PDF 회차는 세계관 배경과 주인공 목표를 정리한다. 제 2화 두 번째 PDF 회차는 세력 갈등과 사건 전환을 정리한다.',
    });

    const res = await upload(makePdfFile());
    const body = await res.json() as { chapters: Array<{ title: string; content: string }> };

    expect(res.status).toBe(200);
    expect(body.chapters).toHaveLength(2);
    expect(body.chapters.map((chapter) => chapter.title)).toEqual(['제 1화', '제 2화']);
    expect(body.chapters[0].content).toContain('첫 PDF 회차');
    expect(body.chapters[1].content).toContain('두 번째 PDF 회차');
  });

  it('PDF 본문 문장 안의 회차 언급은 인라인 제목으로 오인하지 않는다', async () => {
    mockPdfGetText.mockResolvedValueOnce({
      text: '작가는 제 1화처럼 초반 후킹을 살리되 실제 제목 줄은 아직 정하지 않았다.',
    });

    const res = await upload(makePdfFile());
    const body = await res.json() as { chapters: Array<{ title: string; content: string }> };

    expect(res.status).toBe(200);
    expect(body.chapters).toHaveLength(1);
    expect(body.chapters[0].title).toBe('Split Part 1');
    expect(body.chapters[0].content).toContain('제 1화처럼');
  });

  it('extracts text from an EPUB sample', async () => {
    const res = await upload(await makeEpubFile());
    const body = await res.json() as { chapters: Array<{ title: string; content: string }> };
    expect(res.status).toBe(200);
    expect(body.chapters[0]).toMatchObject({
      title: '프롤로그',
    });
    expect(body.chapters[0].content).toContain('세계관 배경과 역사 세력 국가 마법 기술');
  });

  it('EPUB spine 순서와 NCX 제목을 유지해 여러 회차를 추출한다', async () => {
    const res = await upload(await makeMultiChapterEpubFile());
    const body = await res.json() as { chapters: Array<{ title: string; content: string }> };

    expect(res.status).toBe(200);
    expect(body.chapters).toHaveLength(2);
    expect(body.chapters.map((chapter) => chapter.title)).toEqual(['제 1화', '제 2화']);
    expect(body.chapters[0].content).toContain('첫 EPUB 회차');
    expect(body.chapters[1].content).toContain('두 번째 EPUB 회차');
  });

  it('목차 정보가 없는 EPUB은 본문을 추출하되 warning으로 남긴다', async () => {
    const res = await upload(await makeEpubWithoutNavigationFile());
    const body = await res.json() as {
      chapters: Array<{ title: string; content: string }>;
      warnings?: string[];
    };

    expect(res.status).toBe(200);
    expect(body.chapters[0]).toMatchObject({
      title: 'Chapter 1',
    });
    expect(body.chapters[0].content).toContain('목차 파일은 없지만 본문은 추출 가능한 EPUB 샘플');
    expect(body.warnings).toContain('missing-epub-navigation');
  });

  it('확장자와 실제 내용이 맞지 않는 파일은 파싱 전에 거절한다', async () => {
    const res = await upload(makeUploadFile('spoofed.pdf', new Uint8Array([1, 2, 3, 4])));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('File content does not match declared type');
  });

  it('암호 PDF 파서 오류를 사용자에게 구분 가능한 메시지로 돌려준다', async () => {
    mockPdfGetText.mockRejectedValueOnce(new Error('PasswordException: No password given'));

    const res = await upload(makePdfFile());
    const body = await res.json() as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('암호가 걸린 PDF입니다. 잠금 해제 후 다시 불러오세요.');
    expect(mockPdfDestroy).toHaveBeenCalled();
  });

  it('DOCX/PDF/EPUB 추출 결과를 출고 패키지 ZIP의 import-file-report 로 보존한다', async () => {
    const docx = await makeDocxFile();
    const pdf = makePdfFile();
    const epub = await makeEpubFile();

    const docxBody = await uploadChapters(docx);
    const pdfBody = await uploadChapters(pdf);
    const epubBody = await uploadChapters(epub);

    const { buildSubmissionPackage } = await import('@/lib/creative-process/submission-package');
    const { buildSubmissionPackageZipBlob } = await import('@/lib/creative-process/submission-package-zip');

    const pkg = await buildSubmissionPackage({
      projectId: 'upload-sample-project',
      language: 'ko',
      profileId: 'publisher',
      projectMeta: { name: '업로드 샘플 출고 패키지', authorName: '테스트 작가' },
      episodes: [
        {
          episode: 1,
          content: [
            docxBody.chapters[0].content,
            pdfBody.chapters[0].content,
            epubBody.chapters[0].content,
          ].join('\n\n'),
        },
      ],
      importFileReports: [
        reportFromUpload(docx.name, docxBody, '2026-06-13T00:00:00.000Z'),
        reportFromUpload(pdf.name, pdfBody, '2026-06-13T00:00:01.000Z'),
        reportFromUpload(epub.name, epubBody, '2026-06-13T00:00:02.000Z'),
      ],
      generatedBy: 'upload-sample-test',
    });

    const importReport = pkg.artifacts.find((artifact) => artifact.id === 'import-file-report');
    expect(importReport).toBeDefined();

    const parsedReport = JSON.parse(importReport!.content);
    expect(parsedReport).toMatchObject({
      kind: 'loreguard.import-file-report.v1',
      count: 3,
      statusCounts: { success: 3, failed: 0, unsupported: 0, empty: 0 },
      totalCandidateCount: 3,
    });
    expect(parsedReport.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileName: 'world.docx', status: 'success', candidateCount: 1 }),
        expect.objectContaining({ fileName: 'chapter.pdf', status: 'success', candidateCount: 1 }),
        expect.objectContaining({ fileName: 'novel.epub', status: 'success', candidateCount: 1 }),
      ]),
    );
    expect(importReport!.content).not.toContain('세계관 배경과 역사 세력 국가 마법 기술 DOCX 샘플');
    expect(importReport!.content).not.toContain('Loreguard PDF sample text');

    const zipBlob = await buildSubmissionPackageZipBlob(pkg);
    expect(zipBlob).toBeInstanceOf(Blob);

    const zip = await JSZip.loadAsync(await blobToArrayBuffer(zipBlob!));
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    const importReportEntry = manifest.artifacts.find((artifact: { id: string }) => artifact.id === 'import-file-report');
    expect(importReportEntry).toBeDefined();
    expect(importReportEntry.path).toMatch(/^artifacts\/import-file-report-/);

    const zippedImportReport = JSON.parse(await zip.file(importReportEntry.path)!.async('string'));
    expect(zippedImportReport.files.map((file: { fileName: string }) => file.fileName)).toEqual([
      'world.docx',
      'chapter.pdf',
      'novel.epub',
    ]);
    expect(zippedImportReport.files.map((file: { candidateCount: number }) => file.candidateCount)).toEqual([1, 1, 1]);
    expect(JSON.stringify(zippedImportReport)).not.toContain('프롤로그. 회차 본문처럼 이어지는 긴 서술');
  });
});
