// ============================================================
// PART 1 — Imports & Constants
// ============================================================
//
// origin-migration — V1 SceneDirectionData ↔ V2 SceneDirectionDataV2 변환.
//
// V1 → V2: 모든 필드를 TaggedValue로 감싸고 origin='USER' 기본 적용
//          (V1 데이터는 작가 직접 입력으로 간주 — 안전한 기본값)
// V2 → V1: TaggedValue 언래핑, 메타데이터는 폐기 (역방향 호환)
//
// 핵심 원칙:
//   [C] 데이터 손실 0 — value 필드는 무조건 보존
//   [C] null/undefined 안전 — 모든 헬퍼가 입력 검증
//   [G] 새 객체 할당 최소화 — 기존 V2 객체는 그대로 통과
//   [K] 14필드 반복 — Object.entries 기반 순회
//
// 14필드 매핑(V1 SceneDirectionData 키 → 변환 전략):
//   array fields (12): goguma, hooks, emotionTargets, dialogueTones,
//                      dopamineDevices, foreshadows, pacings, tensionCurve,
//                      canonRules, sceneTransitions,
//                      activeCharacters, activeItems, activeSkills
//   single fields (3): cliffhanger, plotStructure, writerNotes
//
// ============================================================

import type {
  SceneDirectionData,
  SceneDirectionDataV2,
  EntryOrigin,
  OriginMetadata,
  TaggedField,
  TaggedValue,
  OriginEditEvent,
} from './studio-types';

// 편집 이력 메모리 절약 상한
const MAX_EDIT_HISTORY = 20;

/** 14개 array 필드 키 — Object.entries 순회 시 분기용 */
const ARRAY_FIELDS = new Set<keyof SceneDirectionData>([
  'goguma', 'hooks', 'emotionTargets', 'dialogueTones', 'dopamineDevices',
  'foreshadows', 'pacings', 'tensionCurve', 'canonRules', 'sceneTransitions',
  'activeCharacters', 'activeItems', 'activeSkills',
]);

/** 3개 single 필드 키 */
const SINGLE_FIELDS = new Set<keyof SceneDirectionData>([
  'cliffhanger', 'plotStructure', 'writerNotes',
]);

// ============================================================
// PART 2 — Type guards & primitives
// ============================================================

/**
 * 입력값이 TaggedValue 형태인지 검사.
 * { value, meta: { origin, createdAt } } 형식만 인정.
 * [C] null/배열/원시값/Date 등 false 처리
 */
export function isTaggedField<T>(x: unknown): x is TaggedValue<T> {
  if (x === null || typeof x !== 'object') return false;
  if (Array.isArray(x)) return false;
  const obj = x as Record<string, unknown>;
  if (!('value' in obj) || !('meta' in obj)) return false;
  const meta = obj.meta;
  if (meta === null || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  if (typeof m.origin !== 'string') return false;
  if (typeof m.createdAt !== 'number') return false;
  // origin enum 검증
  const valid: EntryOrigin[] = ['USER', 'TEMPLATE', 'ENGINE_SUGGEST', 'ENGINE_DRAFT'];
  return valid.includes(m.origin as EntryOrigin);
}

/**
 * TaggedField → 원본 값 추출. 래핑 안 됐으면 그대로 반환.
 * [C] 어떤 입력이든 throw 안 함
 */
export function unwrap<T>(field: TaggedField<T>): T {
  if (isTaggedField<T>(field)) return field.value;
  return field as T;
}

/**
 * 원본 값을 TaggedValue로 래핑. 이미 래핑되어 있으면 origin만 갱신.
 * [G] 이미 같은 origin이면 객체 재생성 안 함
 */
export function wrap<T>(
  value: T,
  origin: EntryOrigin,
  sourceReferenceId?: string,
): TaggedValue<T> {
  // 이미 래핑된 경우: 메타 갱신
  if (isTaggedField<T>(value)) {
    const tagged = value as unknown as TaggedValue<T>;
    if (tagged.meta.origin === origin && !sourceReferenceId) return tagged;
    return {
      value: tagged.value,
      meta: {
        ...tagged.meta,
        origin,
        sourceReferenceId: sourceReferenceId ?? tagged.meta.sourceReferenceId,
      },
    };
  }
  const meta: OriginMetadata = {
    origin,
    createdAt: Date.now(),
  };
  if (sourceReferenceId) meta.sourceReferenceId = sourceReferenceId;
  return { value, meta };
}

/**
 * TaggedField의 origin 메타에 편집 이력 1건 추가 + origin 자체 갱신.
 * 기존 메타가 없으면 fallback으로 USER 기본 메타 생성.
 * [C] history 길이 상한 적용 (FIFO drop)
 */
export function recordEdit<T>(
  field: TaggedField<T>,
  newOrigin: EntryOrigin,
): TaggedValue<T> {
  const tagged: TaggedValue<T> = isTaggedField<T>(field)
    ? (field as unknown as TaggedValue<T>)
    : { value: field as T, meta: { origin: 'USER', createdAt: Date.now() } };

  const history = tagged.meta.editedBy ?? [];
  const event: OriginEditEvent = { origin: newOrigin, at: Date.now() };
  const next = [...history, event];
  if (next.length > MAX_EDIT_HISTORY) next.splice(0, next.length - MAX_EDIT_HISTORY);

  return {
    value: tagged.value,
    meta: {
      ...tagged.meta,
      origin: newOrigin,
      editedBy: next,
    },
  };
}

/**
 * 메타데이터만 추출 (UI 뱃지/통계용). 래핑 안 됐으면 USER fallback.
 */
export function getOrigin<T>(field: TaggedField<T>): OriginMetadata {
  if (isTaggedField<T>(field)) return field.meta;
  return { origin: 'USER', createdAt: 0 };
}

// ============================================================
// PART 3 — V1 → V2 migration (forward)
// ============================================================

/**
 * V1 SceneDirectionData → V2 SceneDirectionDataV2.
 * - 이미 V2 (_originVersion === 2)면 그대로 반환 (idempotent)
 * - 모든 필드를 USER로 래핑 (V1 데이터는 작가가 직접 만든 것으로 간주)
 *
 * [C] null/undefined 입력 → 빈 V2 반환
 * [G] _originVersion 검사로 이미 마이그레이션된 경우 단락
 */
export function migrateToV2(
  data: SceneDirectionData | SceneDirectionDataV2 | null | undefined,
  defaultOrigin: EntryOrigin = 'USER',
): SceneDirectionDataV2 {
  if (!data) return { _originVersion: 2 };
  // 이미 V2면 그대로
  if ((data as SceneDirectionDataV2)._originVersion === 2) {
    return data as SceneDirectionDataV2;
  }

  const v1 = data as SceneDirectionData;
  const v2: SceneDirectionDataV2 = { _originVersion: 2 };

  // array 필드 — 원소 단위 wrap
  for (const key of ARRAY_FIELDS) {
    const arr = v1[key];
    if (!arr || !Array.isArray(arr)) continue;
    const wrapped = arr.map((item) => wrap(item as unknown, defaultOrigin));
    // TS: V2 동적 인덱싱은 unknown 캐스팅이 필요
    (v2 as Record<string, unknown>)[key as string] = wrapped;
  }

  // single 필드 — 객체/문자열 단위 wrap
  for (const key of SINGLE_FIELDS) {
    const val = v1[key];
    if (val === undefined || val === null) continue;
    if (typeof val === 'string' && val.length === 0) continue;
    (v2 as Record<string, unknown>)[key as string] = wrap(val as unknown, defaultOrigin);
  }

  return v2;
}

// ============================================================
// PART 4 — V2 → V1 migration (reverse, lossy on metadata)
// ============================================================

/**
 * V2 → V1 역방향. TaggedValue를 unwrap해서 원본 V1 형태로 복원.
 * 메타데이터(origin/createdAt/editedBy)는 폐기되지만 value는 100% 보존.
 *
 * 사용 시점:
 *  - 외부 V1 툴에 export
 *  - V2 롤백 (사용자가 origin 시스템을 끔)
 *  - V1 전용 export 포맷 (e.g. legacy GitHub 동기화)
 *
 * [C] V1 입력이면 그대로 반환 (idempotent)
 */
export function migrateFromV2(
  data: SceneDirectionDataV2 | SceneDirectionData | null | undefined,
): SceneDirectionData {
  if (!data) return {};

  // 이미 V1면 그대로 (V2 식별자 없음)
  if ((data as SceneDirectionDataV2)._originVersion !== 2) {
    return data as SceneDirectionData;
  }

  const v2 = data as SceneDirectionDataV2;
  const v1: SceneDirectionData = {};

  for (const key of ARRAY_FIELDS) {
    const arr = (v2 as Record<string, unknown>)[key as string];
    if (!Array.isArray(arr)) continue;
    const unwrapped = arr.map((item) => unwrap(item as TaggedField<unknown>));
    (v1 as Record<string, unknown>)[key as string] = unwrapped;
  }

  for (const key of SINGLE_FIELDS) {
    const val = (v2 as Record<string, unknown>)[key as string];
    if (val === undefined || val === null) continue;
    (v1 as Record<string, unknown>)[key as string] = unwrap(val as TaggedField<unknown>);
  }

  return v1;
}

// ============================================================
// PART 5 — Origin statistics (for AI disclosure)
// ============================================================

/** 14필드 누계 origin 통계 */
export interface OriginStats {
  totalEntries: number;
  userCount: number;
  templateCount: number;
  engineSuggestCount: number;
  engineDraftCount: number;
  /** 0-100 — 작가 직접 입력 비율 */
  userPct: number;
  /** 0-100 — 시스템 기본값 비율 */
  templatePct: number;
  /** 0-100 — 엔진 수락 제안 비율 */
  engineSuggestPct: number;
  /** 0-100 — 엔진 미확정 초안 비율 */
  engineDraftPct: number;
}

const EMPTY_STATS: OriginStats = {
  totalEntries: 0,
  userCount: 0,
  templateCount: 0,
  engineSuggestCount: 0,
  engineDraftCount: 0,
  userPct: 0,
  templatePct: 0,
  engineSuggestPct: 0,
  engineDraftPct: 0,
};

/** 단일 origin 카운트 증가 */
function bumpOriginCount(stats: OriginStats, origin: EntryOrigin): void {
  stats.totalEntries += 1;
  if (origin === 'USER') stats.userCount += 1;
  else if (origin === 'TEMPLATE') stats.templateCount += 1;
  else if (origin === 'ENGINE_SUGGEST') stats.engineSuggestCount += 1;
  else if (origin === 'ENGINE_DRAFT') stats.engineDraftCount += 1;
}

/**
 * SceneDirectionData (V1 또는 V2) 전체를 훑어 origin 통계 산출.
 * V1 데이터(래핑 없음)는 모두 USER로 카운트.
 * 빈 데이터는 EMPTY_STATS 반환 (전체 0%).
 *
 * [C] null/undefined 입력 안전 처리
 * [G] 단일 패스 순회
 */
export function calculateOriginStats(
  data: SceneDirectionData | SceneDirectionDataV2 | null | undefined,
): OriginStats {
  if (!data) return { ...EMPTY_STATS };

  const stats: OriginStats = { ...EMPTY_STATS };

  for (const key of ARRAY_FIELDS) {
    const arr = (data as Record<string, unknown>)[key as string];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const meta = getOrigin(item as TaggedField<unknown>);
      bumpOriginCount(stats, meta.origin);
    }
  }

  for (const key of SINGLE_FIELDS) {
    const val = (data as Record<string, unknown>)[key as string];
    if (val === undefined || val === null) continue;
    if (typeof val === 'string' && val.length === 0) continue;
    const meta = getOrigin(val as TaggedField<unknown>);
    bumpOriginCount(stats, meta.origin);
  }

  if (stats.totalEntries === 0) return stats;
  // 백분율 산출 — 합계 100%로 반올림 보정
  stats.userPct = Math.round((stats.userCount / stats.totalEntries) * 100);
  stats.templatePct = Math.round((stats.templateCount / stats.totalEntries) * 100);
  stats.engineSuggestPct = Math.round((stats.engineSuggestCount / stats.totalEntries) * 100);
  stats.engineDraftPct = Math.round((stats.engineDraftCount / stats.totalEntries) * 100);

  return stats;
}
