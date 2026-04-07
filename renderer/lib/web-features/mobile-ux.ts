// ============================================================
// Mobile UX Utilities — 모바일 환경 최적화
// ============================================================
// 터치 제스처, 가상 키보드 감지, 뷰포트 적응

/** 모바일 기기 감지 */
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 768);
}

/** 터치 기기 감지 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/** 가상 키보드 열림 감지 (iOS/Android) */
export function onVirtualKeyboard(callback: (open: boolean) => void): () => void {
  if (typeof visualViewport === 'undefined') return () => {};

  const threshold = 150; // px
  let wasOpen = false;

  const handler = () => {
    const viewportHeight = visualViewport!.height;
    const windowHeight = window.innerHeight;
    const isOpen = windowHeight - viewportHeight > threshold;
    if (isOpen !== wasOpen) {
      wasOpen = isOpen;
      callback(isOpen);
    }
  };

  visualViewport!.addEventListener('resize', handler);
  return () => visualViewport!.removeEventListener('resize', handler);
}

/** 안전 영역 (노치/홈바) CSS 변수 설정 */
export function applySafeArea(): void {
  if (typeof document === 'undefined') return;
  const style = document.documentElement.style;
  style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)');
  style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
  style.setProperty('--safe-left', 'env(safe-area-inset-left, 0px)');
  style.setProperty('--safe-right', 'env(safe-area-inset-right, 0px)');
}

/** 스와이프 제스처 감지 */
export function onSwipe(
  element: HTMLElement,
  handler: (direction: 'left' | 'right' | 'up' | 'down') => void,
  threshold: number = 50,
): () => void {
  let startX = 0;
  let startY = 0;

  const onStart = (e: TouchEvent) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };

  const onEnd = (e: TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX;
    const dy = endY - startY;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      handler(dx > 0 ? 'right' : 'left');
    } else {
      handler(dy > 0 ? 'down' : 'up');
    }
  };

  element.addEventListener('touchstart', onStart, { passive: true });
  element.addEventListener('touchend', onEnd, { passive: true });
  return () => {
    element.removeEventListener('touchstart', onStart);
    element.removeEventListener('touchend', onEnd);
  };
}

/** Pull-to-refresh 제스처 */
export function onPullToRefresh(
  element: HTMLElement,
  onRefresh: () => Promise<void>,
  threshold: number = 80,
): () => void {
  let startY = 0;
  let pulling = false;

  const onStart = (e: TouchEvent) => {
    if (element.scrollTop === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  };

  const onMove = (e: TouchEvent) => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0 && dy < threshold * 2) {
      element.style.transform = `translateY(${Math.min(dy * 0.4, threshold)}px)`;
    }
  };

  const onEnd = async (e: TouchEvent) => {
    if (!pulling) return;
    pulling = false;
    const dy = e.changedTouches[0].clientY - startY;
    element.style.transition = 'transform 0.3s ease';
    element.style.transform = '';
    setTimeout(() => { element.style.transition = ''; }, 300);
    if (dy > threshold) await onRefresh();
  };

  element.addEventListener('touchstart', onStart, { passive: true });
  element.addEventListener('touchmove', onMove, { passive: true });
  element.addEventListener('touchend', onEnd, { passive: true });
  return () => {
    element.removeEventListener('touchstart', onStart);
    element.removeEventListener('touchmove', onMove);
    element.removeEventListener('touchend', onEnd);
  };
}

/** 모바일에서 텍스트 선택 후 컨텍스트 메뉴 (번역/검색/공유) */
export function getSelectedText(): string {
  return window.getSelection()?.toString()?.trim() || '';
}
