// ============================================================
// WorldGraph IndexedDB 스키마 — 단일 SSOT 모듈
// N-01 교훈: 모듈별 스키마 복제 금지. 이름·버전·store·생성을 여기 일원화.
// (shadow-db-schema.ts 패턴 정합)
// ============================================================

import type { WorldFactEntry } from './types';
import { serializeWorldFact } from './worldfact-serializer';

export const WORLDGRAPH_DB_NAME = 'noa_worldgraph_v1';
export const WORLDGRAPH_DB_VERSION = 1;
export const WORLDFACT_STORE = 'world_facts';
export const WORLDGRAPH_STORES = [WORLDFACT_STORE] as const;

/** 멱등 store 생성 — onupgradeneeded 에서 호출. keyPath='id'(denormalized). */
export function ensureWorldgraphStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(WORLDFACT_STORE)) {
    const store = db.createObjectStore(WORLDFACT_STORE, { keyPath: 'id' });
    store.createIndex('by_workId', 'workId', { unique: false });
    store.createIndex('by_category', 'category', { unique: false });
    store.createIndex('by_tier', 'tier', { unique: false });
  }
}

/** 저장 레코드 — keyPath/index 용 핵심 필드를 top-level 로 비정규화 + 전체 entry 보존. */
export interface WorldFactRecord {
  id: string;
  workId: string;
  category: string;
  tier: number;
  entry: WorldFactEntry;
}

/** WorldFactEntry → 저장 레코드 (id/workId/category/tier 비정규화). */
export function toStoreRecord(entry: WorldFactEntry): WorldFactRecord {
  const fm = entry.frontMatter;
  return {
    id: String(fm.id ?? ''),
    workId: String(fm.workId ?? ''),
    category: String(fm.category ?? ''),
    tier: Number(fm.tier ?? 0),
    entry,
  };
}

// ============================================================
// [Z1c-mid-ports 2026-06-11] setConfig 경로 어댑터 — TabWorld 그래프 후속(Phase 2)용
// ============================================================
// setConfig 경로 저장 가능성 확인 결과 (확인만 — 실 배선·UI 변경 없음):
//   - setConfig 영속 = IndexedDB(structuredClone) + Firestore(JSON) + 전체 백업 JSON.
//   - WorldFactEntry.frontMatter 를 객체 그대로 박으면 gray-matter YAML 파싱이
//     만든 Date 등 비-JSON 값이 백업 JSON round-trip 에서 타입 손실될 수 있다.
//   - → 항목당 serializeWorldFact() .md 문자열(항상 JSON-safe·round-trip 무손실 —
//     worldfact-serializer roundTripStable 게이트)로 변환해 담으면 저장 가능. ✓
// 소비처: 아직 없음 (정직 보고). StoryConfig 에 슬라이스 필드 추가 + TabWorld
// 그래프 read 배선은 Phase 2 — 이 어댑터는 그 경계 변환 1함수만 선제 제공.

/** setConfig 로 영속 가능한 worldfact 슬라이스 (JSON-safe 문자열만). */
export interface WorldFactConfigSlice {
  worldFactsMd: Array<{ id: string; md: string }>;
}

/**
 * WorldFactEntry[] → StoryConfig 슬라이스 (추후 그래프용 어댑터 — UI 변경 없음).
 * id 없는 entry 는 드랍 (keyPath 계약과 동일 — 발명 금지), 빈 입력 → 빈 슬라이스.
 */
export function worldFactsToConfigSlice(entries: WorldFactEntry[]): WorldFactConfigSlice {
  const worldFactsMd: Array<{ id: string; md: string }> = [];
  for (const entry of entries ?? []) {
    const id = String(entry?.frontMatter?.id ?? '');
    if (!id) continue;
    worldFactsMd.push({ id, md: serializeWorldFact(entry) });
  }
  return { worldFactsMd };
}
