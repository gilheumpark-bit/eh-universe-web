// ============================================================
// PART 1 — Imports & Types
// ============================================================
//
// useOriginTracker — 씬시트 필드의 origin 변경/승격을 관리하는 훅.
//
// 책임:
//   1. AI 초안(ENGINE_DRAFT) → 작가 수락 시 USER 승격
//   2. 엔진 제안(ENGINE_SUGGEST) 적용 + 작가 편집 시 USER 자동 승격
//   3. 편집 이력(editedBy) 기록
//
// 입력: V2 SceneDirectionData (또는 자동 마이그레이션될 V1)
// 출력: setter API + 변경된 V2 데이터
//
// 비즈니스 규칙:
//   - markAsUser: 명시적 USER 태그 (편집 시 호출)
//   - acceptEngineContent: ENGINE_DRAFT/ENGINE_SUGGEST → USER 승격 (1-step)
//   - getEditHistory: 메타.editedBy 반환 (UI 호버 표시용)
//
// [C] 모든 setter는 새로운 V2 객체 반환 (immutable)
// [G] 필드 단위 메모이즈 — 전체 트리 재렌더 방지
// [K] 외부 스토리지 의존 0 — props로 받고 props로 반환

import { useCallback } from 'react';
import type {
  SceneDirectionData,
  SceneDirectionDataV2,
  EntryOrigin,
  TaggedField,
  OriginEditEvent,
  TaggedValue,
} from '@/lib/studio-types';
import {
  migrateToV2,
  wrap,
  recordEdit,
  isTaggedField,
  getOrigin,
} from '@/lib/origin-migration';

// ============================================================
// PART 2 — Public types
// ============================================================

/** 14필드 키 union (V2 array/single 모두 포함) */
export type SceneFieldKey = keyof Omit<SceneDirectionDataV2, '_originVersion'>;

export interface OriginTrackerAPI {
  /** 명시적 USER 태깅 (작가 직접 편집 시) */
  markAsUser: (
    data: SceneDirectionData | SceneDirectionDataV2,
    field: SceneFieldKey,
    indexOrValue?: number,
  ) => SceneDirectionDataV2;

  /** TEMPLATE 태깅 (프리셋 적용) */
  markAsTemplate: (
    data: SceneDirectionData | SceneDirectionDataV2,
    field: SceneFieldKey,
    indexOrValue?: number,
    referenceId?: string,
  ) => SceneDirectionDataV2;

  /** ENGINE_SUGGEST 태깅 (엔진 제안 수락) */
  markAsEngineSuggest: (
    data: SceneDirectionData | SceneDirectionDataV2,
    field: SceneFieldKey,
    indexOrValue?: number,
    referenceId?: string,
  ) => SceneDirectionDataV2;

  /** ENGINE_DRAFT 태깅 (AI 초안 — 미확정) */
  markAsEngineDraft: (
    data: SceneDirectionData | SceneDirectionDataV2,
    field: SceneFieldKey,
    indexOrValue?: number,
  ) => SceneDirectionDataV2;

  /** 작가 수락 — ENGINE_DRAFT/SUGGEST → USER 승격 (편집 이력 기록) */
  acceptEngineContent: (
    data: SceneDirectionData | SceneDirectionDataV2,
    field: SceneFieldKey,
    indexOrValue?: number,
  ) => SceneDirectionDataV2;

  /** 편집 이력 조회 — UI 호버에서 사용 */
  getEditHistory: (
    data: SceneDirectionData | SceneDirectionDataV2,
    field: SceneFieldKey,
    indexOrValue?: number,
  ) => OriginEditEvent[];
}

// ============================================================
// PART 3 — Internal helpers (single field reader/writer)
// ============================================================

/**
 * V2 데이터에서 특정 필드의 TaggedField 또는 array 원소를 가져옴.
 * indexOrValue가 number면 array index로 해석, undefined면 단일 필드로 해석.
 * [C] 잘못된 인덱스/필드 → undefined 반환
 */
function readField(
  data: SceneDirectionDataV2,
  field: SceneFieldKey,
  indexOrValue?: number,
): TaggedField<unknown> | undefined {
  const raw = (data as Record<string, unknown>)[field as string];
  if (raw === undefined || raw === null) return undefined;
  if (typeof indexOrValue === 'number') {
    if (!Array.isArray(raw)) return undefined;
    return raw[indexOrValue] as TaggedField<unknown> | undefined;
  }
  // 단일 필드 (e.g. cliffhanger / plotStructure / writerNotes)
  if (Array.isArray(raw)) return undefined;
  return raw as TaggedField<unknown>;
}

/**
 * V2 데이터의 특정 필드를 새 TaggedValue로 교체. immutable 새 객체 반환.
 * [G] 한 번의 spread + 한 번의 array slice
 */
function writeField(
  data: SceneDirectionDataV2,
  field: SceneFieldKey,
  newValue: TaggedValue<unknown>,
  indexOrValue?: number,
): SceneDirectionDataV2 {
  const next = { ...data, _originVersion: 2 as const };
  const raw = (next as Record<string, unknown>)[field as string];
  if (typeof indexOrValue === 'number') {
    const arr = Array.isArray(raw) ? [...raw] : [];
    arr[indexOrValue] = newValue;
    (next as Record<string, unknown>)[field as string] = arr;
  } else {
    (next as Record<string, unknown>)[field as string] = newValue;
  }
  return next;
}

/**
 * 임의 origin으로 필드 태깅 — 4종 mark 함수의 공통 구현체.
 * 데이터가 V1이면 자동 V2 마이그레이션. 필드가 비어있으면 변경 없이 반환.
 */
function tagField(
  data: SceneDirectionData | SceneDirectionDataV2,
  field: SceneFieldKey,
  origin: EntryOrigin,
  indexOrValue?: number,
  referenceId?: string,
): SceneDirectionDataV2 {
  const v2 = migrateToV2(data);
  const existing = readField(v2, field, indexOrValue);
  if (existing === undefined) return v2;
  // unwrap → wrap with new origin
  const value = isTaggedField(existing) ? (existing as TaggedValue<unknown>).value : existing;
  const tagged = wrap(value, origin, referenceId);
  return writeField(v2, field, tagged, indexOrValue);
}

// ============================================================
// PART 4 — Hook implementation
// ============================================================

export function useOriginTracker(): OriginTrackerAPI {
  // [G] useCallback으로 reference 안정화 — 자식 컴포넌트 재렌더 방지
  const markAsUser = useCallback(
    (data: SceneDirectionData | SceneDirectionDataV2, field: SceneFieldKey, indexOrValue?: number) =>
      tagField(data, field, 'USER', indexOrValue),
    [],
  );

  const markAsTemplate = useCallback(
    (data: SceneDirectionData | SceneDirectionDataV2, field: SceneFieldKey, indexOrValue?: number, referenceId?: string) =>
      tagField(data, field, 'TEMPLATE', indexOrValue, referenceId),
    [],
  );

  const markAsEngineSuggest = useCallback(
    (data: SceneDirectionData | SceneDirectionDataV2, field: SceneFieldKey, indexOrValue?: number, referenceId?: string) =>
      tagField(data, field, 'ENGINE_SUGGEST', indexOrValue, referenceId),
    [],
  );

  const markAsEngineDraft = useCallback(
    (data: SceneDirectionData | SceneDirectionDataV2, field: SceneFieldKey, indexOrValue?: number) =>
      tagField(data, field, 'ENGINE_DRAFT', indexOrValue),
    [],
  );

  /**
   * 엔진 콘텐츠를 작가가 수락 — origin USER로 승격하고 편집 이력에 기록.
   * - ENGINE_DRAFT → USER + history append
   * - ENGINE_SUGGEST → USER + history append
   * - 이미 USER → no-op (history 오염 방지)
   */
  const acceptEngineContent = useCallback(
    (data: SceneDirectionData | SceneDirectionDataV2, field: SceneFieldKey, indexOrValue?: number) => {
      const v2 = migrateToV2(data);
      const existing = readField(v2, field, indexOrValue);
      if (existing === undefined) return v2;
      const meta = getOrigin(existing);
      if (meta.origin === 'USER') return v2; // already user — no churn
      const promoted = recordEdit(existing, 'USER');
      return writeField(v2, field, promoted, indexOrValue);
    },
    [],
  );

  const getEditHistory = useCallback(
    (data: SceneDirectionData | SceneDirectionDataV2, field: SceneFieldKey, indexOrValue?: number) => {
      const v2 = migrateToV2(data);
      const existing = readField(v2, field, indexOrValue);
      if (existing === undefined) return [];
      const meta = getOrigin(existing);
      return meta.editedBy ?? [];
    },
    [],
  );

  return {
    markAsUser,
    markAsTemplate,
    markAsEngineSuggest,
    markAsEngineDraft,
    acceptEngineContent,
    getEditHistory,
  };
}
