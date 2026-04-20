// ============================================================
// PART 1 — CompressionStream ('gzip') + fallback (Spec Part 4.2)
// ============================================================
//
// 브라우저 네이티브 gzip. Chrome 80+, Safari 16.4+, Firefox 113+.
// 미지원 환경(구형 Safari, Node 이전 버전 일부)은 'none' 폴백.
// NFR-4 (snapshot 생성 < 100ms) 주요 경로.

// ============================================================
// PART 2 — Support detection
// ============================================================

export function isCompressionStreamSupported(): boolean {
  const g = globalThis as unknown as { CompressionStream?: unknown };
  return typeof g.CompressionStream === 'function';
}

export function isDecompressionStreamSupported(): boolean {
  const g = globalThis as unknown as { DecompressionStream?: unknown };
  return typeof g.DecompressionStream === 'function';
}

// ============================================================
// PART 3 — Compress / decompress
// ============================================================

export interface CompressOutcome {
  bytes: Uint8Array;
  compression: 'gzip' | 'none';
}

/**
 * Uint8Array → gzip 압축 또는 원본 그대로.
 * 미지원 환경이면 compression:'none' 반환.
 */
export async function compressToBytes(input: Uint8Array): Promise<CompressOutcome> {
  if (!isCompressionStreamSupported()) {
    return { bytes: input, compression: 'none' };
  }
  try {
    const g = globalThis as unknown as { CompressionStream: new (format: string) => TransformStream };
    const cs = new g.CompressionStream('gzip');
    const stream = toStream(input).pipeThrough(cs);
    const out = await readAllBytes(stream);
    return { bytes: out, compression: 'gzip' };
  } catch {
    return { bytes: input, compression: 'none' };
  }
}

/**
 * compression 형식에 맞춰 원본 바이트 복원.
 */
export async function decompressFromBytes(
  input: Uint8Array,
  compression: 'gzip' | 'none',
): Promise<Uint8Array> {
  if (compression === 'none') return input;
  if (!isDecompressionStreamSupported()) {
    throw new Error('DecompressionStream unsupported — cannot restore gzip payload');
  }
  const g = globalThis as unknown as { DecompressionStream: new (format: string) => TransformStream };
  const ds = new g.DecompressionStream('gzip');
  const stream = toStream(input).pipeThrough(ds);
  return readAllBytes(stream);
}

// ============================================================
// PART 4 — Stream helpers
// ============================================================

function toStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function readAllBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
