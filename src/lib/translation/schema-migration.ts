// ============================================================
// PART 1 — Module Header
// ============================================================
//
// schema-migration.ts — ChapterEntry 스키마 v1 → v2 migration helper.
//
// 시장 분석 4차 dual track 도입에 따라 데이터 모델 확장:
//   v1: { name, content, result, isDone, stageProgress, ... }
//   v2: { ...v1, resultFaithful?, resultMarket?, stageProgressFaithful?, stageProgressMarket?,
//         faithfulApproved?, marketApproved?, approvedAt? }
//
// 호환성 정책:
//   - 모든 신규 필드 optional → v1 데이터는 자동으로 v2 타입에 부합 (강제 migration 불필요)
//   - migrate() 는 명시적 호출 시 v1 → v2 한 번만 적용 (legacy result → resultMarket fallback)
//   - 이미 v2 인 경우 no-op
//
// [C] 결정론적 — 입력 그대로면 출력 그대로
// [G] map 1회 — O(n)
// [K] 단일 함수 export
// ============================================================

import type { ChapterEntry } from '@/types/translator';

// ============================================================
// PART 2 — Types
// ============================================================

export type ChapterSchemaVersion = 1 | 2;

export interface MigrationResult {
  /** 변경된 chapter 개수. 0 이면 이미 v2. */
  migratedCount: number;
  /** 다음 chapter 들 (v2 형태). */
  chapters: ChapterEntry[];
  /** 적용된 schema 버전. */
  version: ChapterSchemaVersion;
}

// ============================================================
// PART 3 — 검출
// ============================================================

/** v2 표시 — resultFaithful 또는 resultMarket 또는 stageProgressFaithful 등 신규 필드 존재. */
export function detectSchemaVersion(chapters: ChapterEntry[]): ChapterSchemaVersion {
  for (const ch of chapters) {
    if (
      ch.resultFaithful !== undefined ||
      ch.resultMarket !== undefined ||
      ch.stageProgressFaithful !== undefined ||
      ch.stageProgressMarket !== undefined ||
      ch.faithfulApproved !== undefined ||
      ch.marketApproved !== undefined
    ) {
      return 2;
    }
  }
  return 1;
}

// ============================================================
// PART 4 — Migration
// ============================================================

/**
 * v1 → v2 migration.
 *
 * 정책:
 *   - 이미 v2 → no-op (count=0)
 *   - v1 → resultMarket = result (legacy 단일 결과를 Market 으로 취급)
 *   - resultFaithful 은 비어둠 (사용자가 듀얼 모드로 재번역 권장)
 *   - stageProgress > 0 시 stageProgressMarket = stageProgress (Faithful 은 0)
 *   - 승인 필드 모두 false 기본
 */
export function migrateChaptersToV2(chapters: ChapterEntry[]): MigrationResult {
  const version = detectSchemaVersion(chapters);
  if (version === 2) {
    return { migratedCount: 0, chapters, version: 2 };
  }

  let migratedCount = 0;
  const next = chapters.map((ch) => {
    if (
      ch.resultFaithful !== undefined ||
      ch.resultMarket !== undefined ||
      ch.stageProgressFaithful !== undefined
    ) {
      return ch;
    }
    migratedCount++;
    return {
      ...ch,
      resultMarket: ch.result ?? '',
      resultFaithful: undefined,
      stageProgressFaithful: undefined,
      stageProgressMarket: ch.stageProgress > 0 ? ch.stageProgress : undefined,
      faithfulApproved: false,
      marketApproved: false,
      approvedAt: undefined,
    };
  });

  return { migratedCount, chapters: next, version: 2 };
}

// ============================================================
// PART 5 — localStorage adapter
// ============================================================

/**
 * localStorage 의 단일 ProjectSnapshot 또는 chapter array 를 자동 migration.
 *
 * 호출:
 *   const result = autoMigrateLocalStorage('noa_translator_chapters');
 *   if (result.migratedCount > 0) console.log('migrated', result.migratedCount, 'chapters');
 *
 * [C] 실패 silent — quota / private mode 에서 throw 안 함
 */
export function autoMigrateLocalStorage(key: string): MigrationResult {
  if (typeof window === 'undefined') {
    return { migratedCount: 0, chapters: [], version: 2 };
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { migratedCount: 0, chapters: [], version: 2 };
    const parsed: unknown = JSON.parse(raw);
    let chapters: ChapterEntry[] = [];
    if (Array.isArray(parsed)) {
      chapters = parsed as ChapterEntry[];
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { chapters?: unknown }).chapters)) {
      chapters = (parsed as { chapters: ChapterEntry[] }).chapters;
    } else {
      return { migratedCount: 0, chapters: [], version: 2 };
    }

    const result = migrateChaptersToV2(chapters);
    if (result.migratedCount > 0) {
      // 동일 형식으로 다시 저장 (배열 또는 객체)
      try {
        if (Array.isArray(parsed)) {
          localStorage.setItem(key, JSON.stringify(result.chapters));
        } else {
          localStorage.setItem(
            key,
            JSON.stringify({ ...(parsed as object), chapters: result.chapters }),
          );
        }
      } catch { /* quota */ }
    }
    return result;
  } catch {
    return { migratedCount: 0, chapters: [], version: 2 };
  }
}
