// ============================================================
// PWA Badging API — 앱 아이콘에 알림 뱃지
// ============================================================
// 완료된 작업 수, 미확인 결과 등을 PWA 아이콘에 표시

/** Badging API 지원 여부 */
export function canBadge(): boolean {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
}

/** 뱃지 설정 (숫자) */
export async function setBadge(count: number): Promise<void> {
  if (!canBadge()) return;
  try {
    if (count <= 0) {
      // @ts-expect-error
      await navigator.clearAppBadge();
    } else {
      // @ts-expect-error
      await navigator.setAppBadge(count);
    }
  } catch { /* */ }
}

/** 뱃지 초기화 */
export async function clearBadge(): Promise<void> {
  if (!canBadge()) return;
  try {
    // @ts-expect-error
    await navigator.clearAppBadge();
  } catch { /* */ }
}

// ── 스튜디오별 편의 함수 ──

let pendingCount = 0;

/** 완료 작업 뱃지 증가 */
export function incrementBadge(): void {
  pendingCount++;
  setBadge(pendingCount);
}

/** 사용자가 확인 후 뱃지 리셋 */
export function resetBadge(): void {
  pendingCount = 0;
  clearBadge();
}

/** 특정 값으로 뱃지 설정 */
export function setBadgeCount(count: number): void {
  pendingCount = count;
  setBadge(count);
}
