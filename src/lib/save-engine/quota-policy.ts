// ============================================================
// PART 1 — Types
// ============================================================

export type StorageQuotaTier = 'ok' | 'warn' | 'evict-idb' | 'critical-export' | 'unknown';
export type StorageQuotaLevel = 'ok' | 'warning' | 'critical' | 'unknown';
export type StorageWriteMode = 'persist' | 'evict-then-persist' | 'memory-queue' | 'unknown';

export interface StorageQuotaThresholds {
  warningRatio: number;
  evictionRatio: number;
  criticalRatio: number;
}

export interface StorageQuotaDecision {
  usage: number;
  quota: number;
  ratioUsed: number | null;
  percentUsed: number | null;
  tier: StorageQuotaTier;
  level: StorageQuotaLevel;
  writeMode: StorageWriteMode;
  shouldEvictIndexedDb: boolean;
  shouldPromptExport: boolean;
  shouldUseMemoryQueue: boolean;
  message: string | null;
}

export const DEFAULT_STORAGE_QUOTA_THRESHOLDS: StorageQuotaThresholds = {
  warningRatio: 0.8,
  evictionRatio: 0.9,
  criticalRatio: 0.98,
};

// ============================================================
// PART 2 — Helpers
// ============================================================

function finiteNonNegative(value: number | null | undefined): number {
  return Number.isFinite(value) && typeof value === 'number' && value > 0 ? value : 0;
}

function roundPercent(ratio: number): number {
  return Math.min(100, Math.round(ratio * 10000) / 100);
}

function normalizeThresholds(thresholds?: Partial<StorageQuotaThresholds>): StorageQuotaThresholds {
  const warningRatio = thresholds?.warningRatio ?? DEFAULT_STORAGE_QUOTA_THRESHOLDS.warningRatio;
  const evictionRatio = thresholds?.evictionRatio ?? DEFAULT_STORAGE_QUOTA_THRESHOLDS.evictionRatio;
  const criticalRatio = thresholds?.criticalRatio ?? DEFAULT_STORAGE_QUOTA_THRESHOLDS.criticalRatio;

  if (
    warningRatio <= 0 ||
    evictionRatio < warningRatio ||
    criticalRatio < evictionRatio ||
    criticalRatio > 1
  ) {
    return DEFAULT_STORAGE_QUOTA_THRESHOLDS;
  }

  return { warningRatio, evictionRatio, criticalRatio };
}

function buildMessage(tier: StorageQuotaTier, percentUsed: number | null): string | null {
  if (percentUsed === null) return null;
  const percentLabel = `${percentUsed.toFixed(1)}%`;
  if (tier === 'critical-export') {
    return `브라우저 저장소 ${percentLabel} 사용 중. 입력은 메모리 큐로 보존하고 export 프롬프트를 표시해야 합니다.`;
  }
  if (tier === 'evict-idb') {
    return `브라우저 저장소 ${percentLabel} 사용 중. IndexedDB 정리 또는 오래된 스냅샷 eviction을 먼저 시도해야 합니다.`;
  }
  if (tier === 'warn') {
    return `브라우저 저장소 ${percentLabel} 사용 중. 백업 또는 export 준비가 필요합니다.`;
  }
  return null;
}

// ============================================================
// PART 3 — Policy
// ============================================================

export function classifyStorageQuota(
  usageInput: number | null | undefined,
  quotaInput: number | null | undefined,
  thresholdsInput?: Partial<StorageQuotaThresholds>,
): StorageQuotaDecision {
  const usage = finiteNonNegative(usageInput);
  const quota = finiteNonNegative(quotaInput);
  if (quota <= 0) {
    return {
      usage,
      quota,
      ratioUsed: null,
      percentUsed: null,
      tier: 'unknown',
      level: 'unknown',
      writeMode: 'unknown',
      shouldEvictIndexedDb: false,
      shouldPromptExport: false,
      shouldUseMemoryQueue: false,
      message: null,
    };
  }

  const thresholds = normalizeThresholds(thresholdsInput);
  const ratioUsed = Math.min(1, usage / quota);
  const percentUsed = roundPercent(ratioUsed);

  let tier: StorageQuotaTier = 'ok';
  if (ratioUsed >= thresholds.criticalRatio) tier = 'critical-export';
  else if (ratioUsed >= thresholds.evictionRatio) tier = 'evict-idb';
  else if (ratioUsed >= thresholds.warningRatio) tier = 'warn';

  const level: StorageQuotaLevel =
    tier === 'critical-export' ? 'critical' :
    tier === 'evict-idb' || tier === 'warn' ? 'warning' :
    'ok';

  const writeMode: StorageWriteMode =
    tier === 'critical-export' ? 'memory-queue' :
    tier === 'evict-idb' ? 'evict-then-persist' :
    'persist';

  return {
    usage,
    quota,
    ratioUsed,
    percentUsed,
    tier,
    level,
    writeMode,
    shouldEvictIndexedDb: tier === 'evict-idb',
    shouldPromptExport: tier === 'critical-export',
    shouldUseMemoryQueue: tier === 'critical-export',
    message: buildMessage(tier, percentUsed),
  };
}
