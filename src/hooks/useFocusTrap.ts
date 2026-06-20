// ============================================================
// PART 1 — Imports & Types
// ============================================================
//
// useFocusTrap — WCAG 2.1 AA 준수용 모달 focus trap.
// 활성화 시: (1) Tab/Shift+Tab 순환, (2) 첫 focusable 자동 포커스,
// (3) Escape 콜백, (4) 비활성화 시 이전 focus 복원.
//
// 사용 예:
//   const ref = useRef<HTMLDivElement>(null);
//   useFocusTrap(ref, isOpen, () => setOpen(false));
//
// [C] SSR 가드 (document 존재 체크)
// [G] keydown 리스너만 등록 (레이아웃 변동 없음)
// [K] 공통 focusable 셀렉터 상수화

import { useEffect, useRef } from 'react';

/**
 * 모달/다이얼로그 내부에 포커스를 가두는 훅.
 *
 * @param ref  포커스를 가둘 컨테이너 엘리먼트 ref
 * @param active  활성화 여부 (모달 open 상태)
 * @param onEscape  Escape 키 눌렀을 때 호출 (옵션)
 */
export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
): void {
  // 활성화 직전의 focus를 기억해서, 비활성화 시 복원.
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    // SSR 가드: document 미존재 환경에서는 아무것도 하지 않음.
    if (typeof document === 'undefined') return;

    const container = ref.current;
    if (!container) return;

    // --- 1. 이전 focus 저장 + 첫 focusable로 자동 이동 ---
    prevFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const getFocusable = (): HTMLElement[] => {
      const sel =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
      );
    };

    // 렌더 직후 첫 focusable로 이동 (rAF로 레이아웃 확정 이후 실행).
    const raf =
      typeof requestAnimationFrame !== 'undefined'
        ? requestAnimationFrame(() => {
            const focusable = getFocusable();
            if (focusable.length > 0) focusable[0].focus();
          })
        : 0;

    // --- 2. 키보드 핸들러: Tab 순환 + Escape ---
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      // Shift+Tab on first → wrap to last
      if (e.shiftKey && (activeEl === first || !container.contains(activeEl))) {
        e.preventDefault();
        last.focus();
        return;
      }
      // Tab on last → wrap to first
      if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // --- 3. cleanup: 이전 focus 복원 + 리스너 제거 ---
    return () => {
      if (raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      // 이전 focus 복원 (존재하고 DOM에 붙어 있는 경우만).
      const prev = prevFocusRef.current;
      if (prev && document.body.contains(prev)) {
        try {
          prev.focus();
        } catch {
          /* intentional silent — focus can fail on detached/invisible nodes */
        }
      }
    };
  }, [ref, active, onEscape]);
}

// IDENTITY_SEAL: PART-1 | role=focus-trap-hook | inputs=ref,active,onEscape | outputs=void-side-effect
