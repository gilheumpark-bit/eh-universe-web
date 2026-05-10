// ============================================================
// Source Recorder — SourceRecord IndexedDB append + SHA-256 helper
// ============================================================
//
// EXTERNAL_IMPORT, AI_DRAFT, AI_REWRITE 등 외부 소스 기반
// CreativeEvent 발생 시 별도 SourceRecord 1건 함께 기록.
// CreativeEvent.sourceId 로 역참조됨.
//
// 사상 정합:
//   - 4차 §5 "외부 AI 출력물·붙여넣기·읽어오기" 분류 명시
//   - 11차 §7 사고 영수증 — 외부 자료 출처 자동 보존
//   - 보증 X / 정보 자료 O — visibility 필드로 노출 범위 제어
// ============================================================

import type { SourceRecord } from './types';
import { getStore, promisifyRequest, promisifyTransaction, STORE_SOURCES } from './idb-store';

// ============================================================
// PART 1 — ULID 생성 (event-recorder 와 동일)
// ============================================================

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateUlid(): string {
  const time = Date.now();
  let timeStr = '';
  let t = time;
  for (let i = 0; i < 10; i++) {
    timeStr = CROCKFORD[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }
  let randStr = '';
  for (let i = 0; i < 16; i++) {
    randStr += CROCKFORD[Math.floor(Math.random() * 32)];
  }
  return timeStr + randStr;
}

// ============================================================
// PART 2 — SHA-256 헬퍼 (Web Crypto API)
// ============================================================

/**
 * 텍스트 SHA-256 hex 해시.
 *
 * @param text 해싱 대상
 * @returns 64자 lowercase hex
 *
 * [C] SubtleCrypto 미지원 환경 (구 브라우저·SSR) → throw
 */
export async function computeSha256Hex(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('SubtleCrypto not available');
  }
  const buffer = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================
// PART 3 — 메인 export — recordSource
// ============================================================

/**
 * SourceRecord 1건 IndexedDB 기록.
 *
 * @param input id/importedAt 제외 모든 필드 (contentHash 호출자 제공)
 * @returns 생성된 ULID
 *
 * 호출자가 contentHash 미리 계산해서 전달 (대용량 텍스트 스트림 가능).
 * 짧은 텍스트는 computeSha256Hex 헬퍼 그대로 사용.
 */
export async function recordSource(
  input: Omit<SourceRecord, 'id' | 'importedAt'>,
): Promise<string> {
  const source: SourceRecord = {
    ...input,
    id: generateUlid(),
    importedAt: new Date().toISOString(),
  };

  const store = await getStore(STORE_SOURCES, 'readwrite');
  await promisifyRequest(store.add(source));
  await promisifyTransaction(store.transaction);

  return source.id;
}

// ============================================================
// PART 4 — 조회 헬퍼
// ============================================================

/**
 * 단일 SourceRecord 조회.
 */
export async function getSource(id: string): Promise<SourceRecord | null> {
  const store = await getStore(STORE_SOURCES, 'readonly');
  const result = (await promisifyRequest(store.get(id))) as SourceRecord | undefined;
  return result ?? null;
}

/**
 * 프로젝트 단위 SourceRecord 전체 조회.
 *
 * [G] importedAt asc 정렬.
 */
export async function listSources(projectId: string): Promise<SourceRecord[]> {
  const store = await getStore(STORE_SOURCES, 'readonly');
  const idx = store.index('by_projectId');
  const sources = (await promisifyRequest(idx.getAll(projectId))) as SourceRecord[];
  sources.sort((a, b) => a.importedAt.localeCompare(b.importedAt));
  return sources;
}

/**
 * 카운트 헬퍼.
 */
export async function countSources(projectId: string): Promise<number> {
  const store = await getStore(STORE_SOURCES, 'readonly');
  const idx = store.index('by_projectId');
  return promisifyRequest(idx.count(projectId));
}
