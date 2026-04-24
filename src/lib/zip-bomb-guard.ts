// ============================================================
// zip-bomb-guard — Minimal ZIP decompressed-size estimator
// ============================================================
// 목적: EPUB/ZIP 업로드 파싱 전 압축해제 총 크기 검증.
// Node Buffer 만 사용 — 외부 의존 0. ZIP64 는 "hostile"로 즉시 차단 (EPUB 표준 아님).
// ============================================================
//
// ZIP 파일 구조:
//   [Local File Header][File Data] × N
//   [Central Directory Header] × N       ← 여기서 각 엔트리의 uncompressedSize 읽음
//   [End of Central Directory (EOCD)]    ← 중앙 디렉토리 오프셋 저장
//
// EOCD signature: 0x06054b50 (PK\005\006) — 파일 끝에서 역탐색
// CDFH signature: 0x02014b50 (PK\001\002)
// ============================================================

// ============================================================
// PART 1 — Constants
// ============================================================

const EOCD_SIG = 0x06054b50;
const CDFH_SIG = 0x02014b50;
const EOCD_MIN_SIZE = 22;
const EOCD_MAX_COMMENT = 65535;
const EOCD_SEARCH_MAX = EOCD_MIN_SIZE + EOCD_MAX_COMMENT;
const CDFH_FIXED_SIZE = 46;
const ZIP64_MARKER = 0xffffffff;

// ============================================================
// PART 2 — Result type
// ============================================================

export type ZipScanResult =
  | { ok: true; totalUncompressed: number; entries: number }
  | { ok: false; reason: string; totalUncompressed: number };

// ============================================================
// PART 3 — Scanner
// ============================================================

/**
 * ZIP 중앙 디렉토리를 파싱해 압축해제 총합을 산정.
 *
 * @param buffer ZIP 파일 바이트
 * @param capBytes 허용 상한 (초과 시 즉시 false 반환)
 * @returns ok=true 면 합법 · ok=false 면 이유 + 누적값
 *
 * [C] ZIP64 마커(0xFFFFFFFF) 감지 시 hostile 판정 — EPUB 에선 거의 없음.
 * [C] CDFH signature 불일치 시 malformed 판정.
 * [G] 선형 스캔(O(entries)) — 실제 압축해제 없이 헤더만 읽음.
 */
export function scanZipDecompressed(buffer: Buffer, capBytes: number): ZipScanResult {
  if (buffer.length < EOCD_MIN_SIZE) {
    return { ok: false, reason: 'ZIP too small (< EOCD minimum)', totalUncompressed: 0 };
  }

  // 1. EOCD 탐색 (파일 끝에서 역방향)
  const searchStart = Math.max(0, buffer.length - EOCD_SEARCH_MAX);
  let eocdOffset = -1;
  for (let i = buffer.length - EOCD_MIN_SIZE; i >= searchStart; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    return { ok: false, reason: 'EOCD signature not found', totalUncompressed: 0 };
  }

  // 2. EOCD 에서 Central Directory 위치 + 엔트리 수 추출
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  // ZIP64 차단 — EPUB 에서 이 경로 정상 사용 사례 없음, zip bomb 우회 시도 가능성
  if (cdOffset === ZIP64_MARKER) {
    return { ok: false, reason: 'ZIP64 marker detected (hostile)', totalUncompressed: 0 };
  }
  if (cdOffset >= buffer.length) {
    return { ok: false, reason: 'Central Directory offset out of bounds', totalUncompressed: 0 };
  }

  // 3. Central Directory 순회 — 각 엔트리의 uncompressedSize 합산
  let offset = cdOffset;
  let total = 0;
  for (let i = 0; i < totalEntries; i++) {
    if (offset + CDFH_FIXED_SIZE > buffer.length) {
      return { ok: false, reason: `CDFH truncated at entry ${i}`, totalUncompressed: total };
    }
    if (buffer.readUInt32LE(offset) !== CDFH_SIG) {
      return { ok: false, reason: `CDFH signature invalid at entry ${i}`, totalUncompressed: total };
    }

    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    if (uncompressedSize === ZIP64_MARKER) {
      return {
        ok: false,
        reason: `ZIP64 size marker at entry ${i} (hostile)`,
        totalUncompressed: total,
      };
    }
    total += uncompressedSize;
    if (total > capBytes) {
      return {
        ok: false,
        reason: `Decompressed total ${total} exceeds cap ${capBytes}`,
        totalUncompressed: total,
      };
    }

    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    offset += CDFH_FIXED_SIZE + nameLen + extraLen + commentLen;
  }

  return { ok: true, totalUncompressed: total, entries: totalEntries };
}

// IDENTITY_SEAL: PART-1~3 | role=zip-bomb-precheck | inputs=Buffer,capBytes | outputs=ok|reason+size
