// ============================================================
// Screen Wake Lock — 장시간 작업 중 화면 꺼짐 방지
// ============================================================
// 배치 번역, 에이전트 파이프라인, 오토파일럿 실행 중 사용

let wakeLock: WakeLockSentinel | null = null;

/** Wake Lock 지원 여부 */
export function canWakeLock(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

/** 화면 꺼짐 방지 시작 */
export async function acquireWakeLock(): Promise<boolean> {
  if (!canWakeLock()) return false;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    // 탭 다시 활성화되면 자동 재요청
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return true;
  } catch {
    return false;
  }
}

/** 화면 꺼짐 방지 해제 */
export async function releaseWakeLock(): Promise<void> {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (wakeLock) {
    try {
      await wakeLock.release();
    } catch { /* already released */ }
    wakeLock = null;
  }
}

/** Wake Lock 활성 여부 */
export function isWakeLockActive(): boolean {
  return wakeLock !== null && !wakeLock.released;
}

// 탭 다시 활성화 시 재요청
async function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && !wakeLock) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch { /* */ }
  }
}

/**
 * 작업 실행 중 Wake Lock 자동 관리.
 * 작업 시작 시 lock, 완료/실패 시 release.
 */
export async function withWakeLock<T>(fn: () => Promise<T>): Promise<T> {
  const acquired = await acquireWakeLock();
  try {
    return await fn();
  } finally {
    if (acquired) await releaseWakeLock();
  }
}
