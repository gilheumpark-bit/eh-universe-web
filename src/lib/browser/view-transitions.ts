// ============================================================
// View Transitions API — 부드러운 패널/탭 전환 애니메이션
// ============================================================
// 브라우저 내장 모핑 애니메이션 (서버 비용 0원)
// Chrome 111+, Safari 18+ 지원. 미지원 브라우저는 즉시 전환.

/* eslint-disable @typescript-eslint/no-explicit-any -- document.startViewTransition() lacks TS declarations in older lib targets */

/** View Transitions 지원 여부 */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/**
 * View Transition으로 DOM 업데이트 래핑.
 * 지원하면 부드러운 크로스페이드, 미지원이면 즉시 실행.
 */
export function withViewTransition(updateFn: () => void | Promise<void>): void {
  if (supportsViewTransitions()) {
        (document as any).startViewTransition(updateFn);
  } else {
    updateFn();
  }
}

/**
 * 특정 요소에 view-transition-name을 설정하고 전환 후 제거.
 * 요소 간 모핑 애니메이션을 만든다.
 */
export function morphTransition(
  element: HTMLElement,
  transitionName: string,
  updateFn: () => void,
): void {
  if (supportsViewTransitions()) {
    element.style.viewTransitionName = transitionName;
        const transition = (document as any).startViewTransition(updateFn);
    transition.finished.then(() => {
      element.style.viewTransitionName = '';
    }).catch(() => {
      element.style.viewTransitionName = '';
    });
  } else {
    updateFn();
  }
}

/**
 * 스튜디오 탭 전환에 사용.
 * 좌→우 / 우→좌 방향 감지 후 적절한 슬라이드 트랜지션.
 */
export function tabTransition(
  currentIndex: number,
  nextIndex: number,
  updateFn: () => void,
): void {
  if (!supportsViewTransitions()) {
    updateFn();
    return;
  }

  const direction = nextIndex > currentIndex ? 'forward' : 'backward';
  document.documentElement.dataset.transitionDirection = direction;

    const transition = (document as any).startViewTransition(updateFn);
  transition.finished.then(() => {
    delete document.documentElement.dataset.transitionDirection;
  }).catch(() => {
    delete document.documentElement.dataset.transitionDirection;
  });
}
