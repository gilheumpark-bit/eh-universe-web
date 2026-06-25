// ============================================================
// PART 1 — Imports & module-level lock counter
// ============================================================
//
// useBodyScrollLock — 모달/슬라이드오버 open 동안 배경(body) 스크롤 차단.
// 활성화 시 document.body.style.overflow='hidden', 비활성화/언마운트 시 복원.
//
// 다중 패널 동시 open 안전: 모듈 레벨 ref-count 로 마지막 lock 해제 시에만
// 원래 overflow 값을 복원한다 (중첩 패널이 서로의 복원을 덮어쓰지 않음).
// 최초 lock 시점의 인라인 overflow 값을 보존했다가 그대로 되돌린다.
//
// 사용 예:
//   useBodyScrollLock(isOpen);
//
// [C] SSR 가드 (document 존재 체크)
// [K] 기존 인라인 overflow 값 보존 (CSS 클래스 스타일은 건드리지 않음)

import { useEffect } from 'react';

// 동시에 lock 을 건 패널 수. 0 → 1 전이에서만 적용, 1 → 0 전이에서만 복원.
let lockCount = 0;
// 최초 lock 직전의 body 인라인 overflow 값 — 마지막 unlock 시 그대로 복원.
let prevBodyOverflow = '';

/**
 * 활성 동안 배경 스크롤을 잠그는 훅.
 *
 * @param active  활성화 여부 (패널 open 상태)
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    // SSR 가드: document 미존재 환경에서는 아무것도 하지 않음.
    if (typeof document === 'undefined') return;

    // 0 → 1 전이에서만 원래 값 기억 + hidden 적용 (중첩 패널은 값 유지).
    if (lockCount === 0) {
      prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      // 마지막 lock 해제 시에만 원래 인라인 overflow 값으로 복원.
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = prevBodyOverflow;
      }
    };
  }, [active]);
}

// IDENTITY_SEAL: PART-1 | role=body-scroll-lock-hook | inputs=active | outputs=void-side-effect
