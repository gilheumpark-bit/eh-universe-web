// ============================================================
// PART 1 — Atomic envelope (Spec 5.1 + 5.2)
// ============================================================
//
// IDB 경로: durability:'strict' tx 안에서 journal + meta.tip put 완료 보장 (adapter가 처리).
// LS 경로: write-then-swap (adapter가 처리).
// 이 모듈은 두 경로를 감싸는 단일 API + 재시도 정책 담당.

import { logger } from '@/lib/logger';
import type { JournalEntry, AppendResult, SaveMeta } from './types';
import { routerAppendEntry, type StorageTier, type RouterOptions } from './storage-router';
import { canonicalJson } from './hash';

// ============================================================
// PART 2 — Retry config
// ============================================================
//
// [확인 필요] 재시도 횟수/딜레이는 Spec에 명시 없음. NOA 규칙 "3회 + 지터 백오프" 재사용.

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 50;
const JITTER_MS = 50;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(): number {
  return Math.floor(Math.random() * JITTER_MS);
}

// ============================================================
// PART 3 — performAtomicAppend
// ============================================================

export interface AtomicWriteOptions extends RouterOptions {
  /** 재시도 횟수 초기값 — 기본 3. */
  maxRetries?: number;
}

/**
 * 엔트리를 원자적으로 저장. 재시도 포함.
 * 반환: tier / 성공 여부 / 에러 / duration.
 */
export async function performAtomicAppend(
  entry: JournalEntry,
  options: AtomicWriteOptions = {},
): Promise<AppendResult> {
  const started = performance.now();
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  let lastError: Error | undefined;
  let tierUsed: StorageTier | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const outcome = await routerAppendEntry(entry, options);
      tierUsed = outcome.tier;
      if (outcome.ok) {
        return {
          ok: true,
          entry,
          tier: outcome.tier,
          durationMs: performance.now() - started,
        };
      }
      lastError = outcome.error;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < maxRetries - 1) {
      await delay(BASE_DELAY_MS * (attempt + 1) + jitter());
    }
  }

  logger.warn('save-engine:atomic', 'performAtomicAppend 최종 실패', {
    entryId: entry.id,
    error: lastError?.message,
  });
  return {
    ok: false,
    tier: tierUsed,
    error: lastError ?? new Error('unknown append failure'),
    durationMs: performance.now() - started,
  };
}

// ============================================================
// PART 4 — Byte size estimate (SaveMeta 계산 지원)
// ============================================================

/** canonical JSON 기준 uncompressed byte 크기. */
export function estimateEntrySize(entry: JournalEntry): number {
  return new TextEncoder().encode(canonicalJson(entry)).length;
}

/** AppendResult → SaveMeta 변환 헬퍼. */
export function toSaveMeta(result: AppendResult, entry: JournalEntry): SaveMeta {
  return {
    entryId: entry.id,
    clock: entry.clock,
    tier: result.tier ?? 'memory',
    bytes: estimateEntrySize(entry),
    durationMs: result.durationMs,
  };
}
