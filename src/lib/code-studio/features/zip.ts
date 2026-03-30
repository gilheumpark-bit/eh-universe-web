// ============================================================
// Code Studio — ZIP/JSON Export & Import (Browser-native)
// ============================================================
// Uses Compression Streams API for DEFLATE. No external libraries.

import type { FileNode } from '../../code-studio-types';

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export interface ZipProgress {
  phase: 'reading' | 'compressing' | 'writing' | 'extracting' | 'validating';
  current: number;
  total: number;
  fileName?: string;
  percentComplete: number;
}

type ProgressCallback = (progress: ZipProgress) => void;

const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_COUNT = 10000;

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ZipProgress,ProgressCallback

// ============================================================
// PART 2 — CRC32
// ============================================================

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// IDENTITY_SEAL: PART-2 | role=CRC32 | inputs=Uint8Array | outputs=number

// ============================================================
// PART 3 — ZIP Format Builders
// ============================================================

function buildLocalFileHeader(
  nameBytes: Uint8Array,
  compressedSize: number,
  uncompressedSize: number,
  crcVal: number,
  method: number,
): Uint8Array {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, method, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crcVal, true);
  view.setUint32(18, compressedSize, true);
  view.setUint32(22, uncompressedSize, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function buildCentralDirectoryEntry(
  nameBytes: Uint8Array,
  compressedSize: number,
  uncompressedSize: number,
  crcVal: number,
  method: number,
  localHeaderOffset: number,
): Uint8Array {
  const entry = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(entry.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, method, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crcVal, true);
  view.setUint32(20, compressedSize, true);
  view.setUint32(24, uncompressedSize, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  entry.set(nameBytes, 46);
  return entry;
}

function buildEndOfCentralDirectory(
  entryCount: number,
  cdSize: number,
  cdOffset: number,
): Uint8Array {
  const eocd = new Uint8Array(22);
  const view = new DataView(eocd.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, cdSize, true);
  view.setUint32(16, cdOffset, true);
  view.setUint16(20, 0, true);
  return eocd;
}

function findEOCD(bytes: Uint8Array): number {
  for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 65557; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      return i;
    }
  }
  return -1;
}

// IDENTITY_SEAL: PART-3 | role=ZIPFormat | inputs=header params | outputs=Uint8Array

// ============================================================
// PART 4 — Compression Streams Wrappers
// ============================================================

async function compressDeflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  void writer.write(data as unknown as BufferSource);
  void writer.close();
  return collectStream(cs.readable);
}

async function decompressDeflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  void writer.write(data as unknown as BufferSource);
  void writer.close();
  return collectStream(ds.readable);
}

async function collectStream(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// IDENTITY_SEAL: PART-4 | role=Compression | inputs=Uint8Array | outputs=Uint8Array

// ============================================================
// PART 5 — Tree Flattening & Rebuilding
// ============================================================

interface ZipEntry {
  path: string;
  content?: string;
}

function flattenToEntries(nodes: FileNode[], prefix = ''): ZipEntry[] {
  const entries: ZipEntry[] = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'folder') {
      entries.push({ path: path + '/' });
      if (node.children) {
        entries.push(...flattenToEntries(node.children, path));
      }
    } else {
      entries.push({ path, content: node.content ?? '' });
    }
  }
  return entries;
}

function buildTreeFromPaths(
  fileMap: Map<string, { content: string }>,
): FileNode[] {
  const root: FileNode[] = [];
  const dirMap = new Map<string, FileNode>();
  let idCounter = 1;

  const ensureDir = (dirPath: string): FileNode => {
    if (dirMap.has(dirPath)) return dirMap.get(dirPath)!;

    const parts = dirPath.split('/');
    const name = parts[parts.length - 1];
    const node: FileNode = {
      id: `zip_${idCounter++}`,
      name,
      type: 'folder',
      children: [],
    };
    dirMap.set(dirPath, node);

    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = ensureDir(parentPath);
      parent.children!.push(node);
    } else {
      root.push(node);
    }

    return node;
  };

  for (const [path, data] of fileMap) {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    const fileNode: FileNode = {
      id: `zip_${idCounter++}`,
      name: fileName,
      type: 'file',
      content: data.content,
    };

    if (parts.length > 1) {
      const dirPath = parts.slice(0, -1).join('/');
      const parent = ensureDir(dirPath);
      parent.children!.push(fileNode);
    } else {
      root.push(fileNode);
    }
  }

  return root;
}

// IDENTITY_SEAL: PART-5 | role=TreeFlatten | inputs=FileNode[]/Map | outputs=ZipEntry[]/FileNode[]

// ============================================================
// PART 6 — Export / Import Functions
// ============================================================

export async function exportProjectAsZip(
  files: FileNode[],
  _projectName: string = 'eh-project',
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const entries = flattenToEntries(files);

  if (entries.length > MAX_FILE_COUNT) {
    throw new Error(`Too many files (${entries.length}). Maximum is ${MAX_FILE_COUNT}.`);
  }

  const zipParts: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;
  const encoder = new TextEncoder();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    onProgress?.({
      phase: 'compressing',
      current: i + 1,
      total: entries.length,
      fileName: entry.path,
      percentComplete: Math.round(((i + 1) / entries.length) * 100),
    });

    const nameBytes = encoder.encode(entry.path);
    const contentBytes = encoder.encode(entry.content ?? '');

    let compressedBytes: Uint8Array;
    let compressionMethod = 0;

    if (typeof CompressionStream !== 'undefined' && contentBytes.length > 0) {
      try {
        compressedBytes = await compressDeflateRaw(contentBytes);
        compressionMethod = 8;
      } catch {
        compressedBytes = contentBytes;
        compressionMethod = 0;
      }
    } else {
      compressedBytes = contentBytes;
    }

    const crcVal = crc32(contentBytes);
    const localHeader = buildLocalFileHeader(
      nameBytes, compressedBytes.length, contentBytes.length, crcVal, compressionMethod,
    );

    const cdEntry = buildCentralDirectoryEntry(
      nameBytes, compressedBytes.length, contentBytes.length, crcVal, compressionMethod, offset,
    );
    centralDirectory.push(cdEntry);

    zipParts.push(localHeader);
    zipParts.push(compressedBytes);
    offset += localHeader.length + compressedBytes.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDirectory) {
    zipParts.push(cd);
    cdSize += cd.length;
  }

  const eocd = buildEndOfCentralDirectory(entries.length, cdSize, cdOffset);
  zipParts.push(eocd);

  onProgress?.({
    phase: 'writing', current: entries.length, total: entries.length, percentComplete: 100,
  });

  return new Blob(zipParts as BlobPart[], { type: 'application/zip' });
}

export async function importProjectFromZip(
  file: File,
  onProgress?: ProgressCallback,
): Promise<FileNode[]> {
  if (file.size > MAX_ZIP_SIZE) {
    throw new Error(
      `ZIP file too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 100 MB.`,
    );
  }

  onProgress?.({ phase: 'validating', current: 0, total: 1, percentComplete: 0 });

  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const eocdPos = findEOCD(bytes);
  if (eocdPos < 0) {
    throw new Error('Invalid ZIP file: cannot find end of central directory');
  }

  const entryCount = view.getUint16(eocdPos + 10, true);
  const cdOffset = view.getUint32(eocdPos + 16, true);

  if (entryCount > MAX_FILE_COUNT) {
    throw new Error(`Too many files in ZIP (${entryCount}). Maximum is ${MAX_FILE_COUNT}.`);
  }

  const parsedEntries: Array<{
    path: string;
    compressedSize: number;
    method: number;
    localHeaderOffset: number;
  }> = [];

  let pos = cdOffset;
  const decoder = new TextDecoder();

  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) {
      throw new Error('Invalid central directory entry');
    }
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.slice(pos + 46, pos + 46 + nameLen));

    parsedEntries.push({ path: name, compressedSize, method, localHeaderOffset });
    pos += 46 + nameLen + extraLen + commentLen;
  }

  const fileMap = new Map<string, { content: string }>();

  for (let i = 0; i < parsedEntries.length; i++) {
    const entry = parsedEntries[i];
    onProgress?.({
      phase: 'extracting',
      current: i + 1,
      total: parsedEntries.length,
      fileName: entry.path,
      percentComplete: Math.round(((i + 1) / parsedEntries.length) * 100),
    });

    if (entry.path.endsWith('/')) continue;
    if (entry.path.includes('__MACOSX/')) continue;

    const lhPos = entry.localHeaderOffset;
    const lhNameLen = view.getUint16(lhPos + 26, true);
    const lhExtraLen = view.getUint16(lhPos + 28, true);
    const dataStart = lhPos + 30 + lhNameLen + lhExtraLen;
    const compressedData = bytes.slice(dataStart, dataStart + entry.compressedSize);

    let rawData: Uint8Array;
    if (entry.method === 8) {
      try {
        rawData = await decompressDeflateRaw(compressedData);
      } catch {
        rawData = compressedData;
      }
    } else {
      rawData = compressedData;
    }

    try {
      const text = decoder.decode(rawData);
      fileMap.set(entry.path, { content: text });
    } catch {
      fileMap.set(entry.path, { content: `[binary: ${entry.path.split('/').pop()}]` });
    }
  }

  return buildTreeFromPaths(fileMap);
}

// ============================================================
// PART 7 — JSON Export / Import & Single File Export
// ============================================================

export async function exportProjectAsJSON(
  files: FileNode[],
  projectName = 'eh-project',
): Promise<void> {
  const data = JSON.stringify(
    { name: projectName, version: '1.0', exportedAt: new Date().toISOString(), files },
    null,
    2,
  );
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}.eh.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProjectFromJSON(file: File): Promise<FileNode[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data.files || !Array.isArray(data.files)) {
    throw new Error('Invalid EH project file');
  }
  return data.files;
}

export function exportSingleFile(name: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// IDENTITY_SEAL: PART-7 | role=JSONExport | inputs=FileNode[],name | outputs=void/FileNode[]
