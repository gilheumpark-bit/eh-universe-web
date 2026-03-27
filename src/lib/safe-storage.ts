// ============================================================
// safe-storage.ts — localStorage 안전 래퍼
// ============================================================

const QUOTA_ESTIMATE_BYTES = 5 * 1024 * 1024; // 5MB 기본 추정

/**
 * localStorage.setItem의 안전 래퍼.
 * QuotaExceededError 시 false 반환, 성공 시 true.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`[safe-storage] setItem failed for "${key}":`, e);
    return false;
  }
}

/**
 * localStorage.getItem의 안전 래퍼.
 * 예외 시 null 반환.
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`[safe-storage] getItem failed for "${key}":`, e);
    return null;
  }
}

/**
 * localStorage.removeItem의 안전 래퍼.
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * 현재 localStorage 사용량(바이트) 추정.
 * 정확한 값은 아니지만 근사치.
 */
export function getStorageUsageBytes(): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key);
        // UTF-16: 각 문자 2바이트
        total += (key.length + (val?.length ?? 0)) * 2;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * 저장 공간 사용 비율 (0~100).
 */
export function getStorageQuotaPercent(): number {
  const used = getStorageUsageBytes();
  return Math.round((used / QUOTA_ESTIMATE_BYTES) * 100);
}

/**
 * 저장 공간이 임계값에 도달했는지 확인.
 */
export function isStorageNearFull(thresholdPercent = 90): boolean {
  return getStorageQuotaPercent() >= thresholdPercent;
}

/**
 * 값을 JSON으로 직렬화하여 안전하게 저장.
 */
export function safeSetJSON<T>(key: string, value: T): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

/**
 * JSON으로 저장된 값을 안전하게 파싱.
 * 파싱 실패 시 fallback 반환.
 */
export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
