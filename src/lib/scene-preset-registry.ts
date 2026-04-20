// ============================================================
// PART 1 — Imports & Types (Scene Preset Registry)
// ============================================================
//
// 작가 개인 씬시트 프리셋 라이브러리.
// IndexedDB(noa_scene_preset_v1) 영속화. 외부 의존성 없음(IDB 네이티브).
//
// 디자인 원칙:
//   - GENRE_PRESETS(10장르) 위에 사용자 정의 계층
//   - applyPreset 병합: preset 우선, 없는 필드는 current 유지
//   - 배열은 명시적 교체(concat 아님) — 작가 의도 보존
//   - 사용 횟수 추적 → Top-3 자주 쓰는 프리셋 우선 노출
//   - private/community/market 가시성 — 향후 Network 연동 대비
//
// [C] 외부 입력 검증, IDB 실패 시 graceful degradation
// [G] 배치 트랜잭션, 인덱스 활용
// [K] 단일 책임 — 프리셋 CRUD + 사용 로그만

import type { SceneDirectionData } from './studio-types';
import { ulid } from './save-engine/hlc';
import { logger } from './logger';

export const SCENE_PRESET_DB_NAME = 'noa_scene_preset_v1';
export const SCENE_PRESET_DB_VERSION = 1;
export const STORE_PRESETS = 'presets';
export const STORE_USAGE_LOG = 'preset_usage_log';

export type PresetVisibility = 'private' | 'community' | 'market';

export interface ScenePreset {
  id: string;              // ULID
  name: string;
  description: string;
  authorId: string;        // 작가 식별 (없으면 'local')
  createdAt: number;
  updatedAt: number;
  usageCount: number;

  // 실제 씬시트 데이터 (Partial — 모든 필드 채울 필요 없음)
  sceneDirection: Partial<SceneDirectionData>;

  // 메타데이터
  genre?: string;
  tags?: string[];
  visibility: PresetVisibility;

  // 소스 정보
  sourceEpisode?: number;
  sourceProject?: string;
}

export interface PresetUsageLogEntry {
  id: string;             // ULID
  presetId: string;
  usedAt: number;
}

export interface PresetFilter {
  genre?: string;
  authorId?: string;
  visibility?: PresetVisibility;
  searchText?: string;
}

// ============================================================
// PART 2 — IDB Open / Availability
// ============================================================

export function isPresetIDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch (err) {
    logger.warn('scene-preset-registry', 'isPresetIDBAvailable threw', err);
    return false;
  }
}

let cachedDb: IDBDatabase | null = null;
let openPromise: Promise<IDBDatabase | null> | null = null;

/**
 * presets DB open. 첫 호출 시 upgradeneeded에서 2 stores 생성.
 * 실패 시 null 반환(IDB 차단/private 모드 등). 호출부는 graceful degradation.
 */
export async function openPresetDB(): Promise<IDBDatabase | null> {
  if (cachedDb) return cachedDb;
  if (openPromise) return openPromise;
  if (!isPresetIDBAvailable()) return null;

  openPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(SCENE_PRESET_DB_NAME, SCENE_PRESET_DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_PRESETS)) {
          const store = db.createObjectStore(STORE_PRESETS, { keyPath: 'id' });
          store.createIndex('by-genre', 'genre', { unique: false });
          store.createIndex('by-author', 'authorId', { unique: false });
          store.createIndex('by-visibility', 'visibility', { unique: false });
          store.createIndex('by-usage', 'usageCount', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_USAGE_LOG)) {
          const store = db.createObjectStore(STORE_USAGE_LOG, { keyPath: 'id' });
          store.createIndex('by-preset', 'presetId', { unique: false });
        }
      };

      req.onsuccess = () => {
        cachedDb = req.result;
        cachedDb.onversionchange = () => {
          cachedDb?.close();
          cachedDb = null;
        };
        resolve(cachedDb);
      };
      req.onerror = () => {
        logger.warn('scene-preset-registry', 'openPresetDB onerror', req.error);
        resolve(null);
      };
    } catch (err) {
      logger.warn('scene-preset-registry', 'openPresetDB threw', err);
      resolve(null);
    } finally {
      openPromise = null;
    }
  });

  return openPromise;
}

/** 테스트용 캐시 리셋. */
export function _resetPresetDBCache(): void {
  cachedDb?.close();
  cachedDb = null;
  openPromise = null;
}

// ============================================================
// PART 3 — CRUD: save / load / delete
// ============================================================

/**
 * 프리셋 저장(insert or update). id 미지정 시 신규.
 * 개인정보(원고 본문 등) 포함 시 호출부에서 sanitize 책임.
 */
export async function savePreset(preset: ScenePreset): Promise<boolean> {
  if (!preset || !preset.id || !preset.name) {
    logger.warn('scene-preset-registry', 'savePreset: invalid preset');
    return false;
  }
  const db = await openPresetDB();
  if (!db) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(STORE_PRESETS, 'readwrite');
      tx.objectStore(STORE_PRESETS).put(preset);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        logger.warn('scene-preset-registry', 'savePreset tx.onerror', tx.error);
        resolve(false);
      };
    } catch (err) {
      logger.warn('scene-preset-registry', 'savePreset threw', err);
      resolve(false);
    }
  });
}

export async function loadPreset(id: string): Promise<ScenePreset | null> {
  if (!id) return null;
  const db = await openPresetDB();
  if (!db) return null;

  return new Promise<ScenePreset | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_PRESETS, 'readonly');
      const req = tx.objectStore(STORE_PRESETS).get(id);
      req.onsuccess = () => resolve((req.result as ScenePreset | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch (err) {
      logger.warn('scene-preset-registry', 'loadPreset threw', err);
      resolve(null);
    }
  });
}

export async function deletePreset(id: string): Promise<boolean> {
  if (!id) return false;
  const db = await openPresetDB();
  if (!db) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(STORE_PRESETS, 'readwrite');
      tx.objectStore(STORE_PRESETS).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        logger.warn('scene-preset-registry', 'deletePreset tx.onerror', tx.error);
        resolve(false);
      };
    } catch (err) {
      logger.warn('scene-preset-registry', 'deletePreset threw', err);
      resolve(false);
    }
  });
}

// ============================================================
// PART 4 — List / Filter / Search
// ============================================================

/**
 * 프리셋 목록 조회. filter 미지정 시 전체.
 * 검색 텍스트는 name + description + tags 부분일치(대소문자 무시).
 */
export async function listPresets(filter?: PresetFilter): Promise<ScenePreset[]> {
  const db = await openPresetDB();
  if (!db) return [];

  return new Promise<ScenePreset[]>((resolve) => {
    try {
      const tx = db.transaction(STORE_PRESETS, 'readonly');
      const store = tx.objectStore(STORE_PRESETS);
      const results: ScenePreset[] = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        if (cursor) {
          const p = cursor.value as ScenePreset;
          if (matchesFilter(p, filter)) results.push(p);
          cursor.continue();
        } else {
          // 최신순 정렬
          results.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(results);
        }
      };
      req.onerror = () => resolve([]);
    } catch (err) {
      logger.warn('scene-preset-registry', 'listPresets threw', err);
      resolve([]);
    }
  });
}

function matchesFilter(p: ScenePreset, filter?: PresetFilter): boolean {
  if (!filter) return true;
  if (filter.genre && p.genre !== filter.genre) return false;
  if (filter.authorId && p.authorId !== filter.authorId) return false;
  if (filter.visibility && p.visibility !== filter.visibility) return false;
  if (filter.searchText) {
    const needle = filter.searchText.toLowerCase();
    const hay = `${p.name} ${p.description} ${(p.tags ?? []).join(' ')}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

// ============================================================
// PART 5 — Apply (병합 규칙)
// ============================================================

/**
 * 프리셋을 현재 씬시트에 적용.
 * 병합 규칙:
 *   - preset 값이 truthy → preset 우선
 *   - preset 값 없음/undefined → current 유지
 *   - 배열은 명시적 교체(concat 아님) — 작가 의도 보존
 *   - 객체(예: cliffhanger)도 통째로 교체
 */
export function applyPreset(
  preset: ScenePreset,
  currentDirection: SceneDirectionData
): SceneDirectionData {
  const presetDir = preset.sceneDirection ?? {};
  const result: SceneDirectionData = { ...currentDirection };

  // 모든 SceneDirectionData 키를 순회하며 preset 우선 병합.
  // [C] preset 값이 undefined인 경우 current 유지(덮어쓰기 방지).
  const keys = new Set([
    ...Object.keys(presetDir),
    ...Object.keys(currentDirection),
  ]) as Set<keyof SceneDirectionData>;

  for (const key of keys) {
    const presetVal = presetDir[key];
    const currentVal = currentDirection[key];
    if (presetVal !== undefined && presetVal !== null) {
      // 빈 배열도 의도적 교체로 간주
      (result as Record<string, unknown>)[key] = presetVal;
    } else if (currentVal !== undefined) {
      (result as Record<string, unknown>)[key] = currentVal;
    }
  }

  return result;
}

/**
 * 부분 적용: 사용자가 선택한 필드만 적용.
 * 고급 다이얼로그용.
 */
export function applyPresetPartial(
  preset: ScenePreset,
  currentDirection: SceneDirectionData,
  fields: (keyof SceneDirectionData)[]
): SceneDirectionData {
  const presetDir = preset.sceneDirection ?? {};
  const result: SceneDirectionData = { ...currentDirection };
  for (const key of fields) {
    const presetVal = presetDir[key];
    if (presetVal !== undefined && presetVal !== null) {
      (result as Record<string, unknown>)[key] = presetVal;
    }
  }
  return result;
}

// ============================================================
// PART 6 — Usage Tracking
// ============================================================

/**
 * 사용 기록 + usageCount 증가. 실패해도 무시(메인 플로우 차단 금지).
 */
export async function recordUsage(presetId: string): Promise<void> {
  if (!presetId) return;
  const db = await openPresetDB();
  if (!db) return;

  try {
    // 1. usage_log에 엔트리 추가
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_USAGE_LOG, 'readwrite');
      const entry: PresetUsageLogEntry = {
        id: ulid(),
        presetId,
        usedAt: Date.now(),
      };
      tx.objectStore(STORE_USAGE_LOG).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });

    // 2. preset.usageCount 증가
    const preset = await loadPreset(presetId);
    if (preset) {
      preset.usageCount = (preset.usageCount ?? 0) + 1;
      preset.updatedAt = Date.now();
      await savePreset(preset);
    }
  } catch (err) {
    logger.warn('scene-preset-registry', 'recordUsage threw', err);
  }
}

/**
 * 자주 쓰는 프리셋 Top-N. usageCount desc, 동률 시 updatedAt desc.
 */
export async function getTopUsedPresets(limit: number = 3): Promise<ScenePreset[]> {
  const all = await listPresets();
  return [...all]
    .sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, Math.max(0, limit));
}

// ============================================================
// PART 7 — Helpers
// ============================================================

/**
 * 신규 프리셋 생성 헬퍼. id/시간/카운트 자동.
 * sceneDirection은 호출부에서 sanitize(원고 본문 제거 등) 책임.
 */
export function buildPreset(input: {
  name: string;
  description?: string;
  sceneDirection: Partial<SceneDirectionData>;
  genre?: string;
  tags?: string[];
  visibility?: PresetVisibility;
  authorId?: string;
  sourceEpisode?: number;
  sourceProject?: string;
}): ScenePreset {
  const now = Date.now();
  return {
    id: ulid(),
    name: (input.name ?? '').slice(0, 100).trim() || 'Untitled Preset',
    description: (input.description ?? '').slice(0, 500),
    authorId: input.authorId ?? 'local',
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
    sceneDirection: input.sceneDirection ?? {},
    genre: input.genre,
    tags: (input.tags ?? []).slice(0, 10).map(t => t.slice(0, 30)),
    visibility: input.visibility ?? 'private',
    sourceEpisode: input.sourceEpisode,
    sourceProject: input.sourceProject,
  };
}

/**
 * 미리보기용 — 프리셋이 채우는 필드 개수.
 */
export function countPresetFields(preset: ScenePreset): number {
  const dir = preset.sceneDirection ?? {};
  let count = 0;
  for (const key of Object.keys(dir) as (keyof SceneDirectionData)[]) {
    const v = dir[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    count++;
  }
  return count;
}

// IDENTITY_SEAL: scene-preset-registry | role=preset CRUD + apply + usage | inputs=ScenePreset|filter | outputs=Promise<*>
