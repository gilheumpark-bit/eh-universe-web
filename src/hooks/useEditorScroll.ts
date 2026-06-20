'use client';

// ============================================================
// useEditorScroll — 스크롤 가능한 HTMLElement(= 에디터 wrapper)의
//   스크롤 진행도와 뷰포트 비율을 추적하는 훅.
//
// 핵심 설계:
//   - scroll 이벤트는 passive 리스너 + RAF 스로틀로 60fps 유지
//   - ResizeObserver 로 높이 변경(콘텐츠 증감, 창 리사이즈) 감지
//   - SSR 안전: typeof window 체크 + ResizeObserver 존재 여부 가드
//   - seek(progress) 호출 시 scrollTo 로 원소를 즉시 이동시킴
//
// 반환: [state, seek]
//   - state.scrollProgress: 0~1, 0 = 최상단, 1 = 최하단
//   - state.viewportRatio:  0~1, 뷰포트 높이 / 전체 스크롤 높이
//   - seek(progress): 0~1 값을 받아 scrollTo({top: progress * maxScroll})
// ============================================================

// ============================================================
// PART 1 — Types & Constants
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

export interface EditorScrollState {
  /** 스크롤 진행도 (0~1). scrollTop / (scrollHeight - clientHeight). */
  scrollProgress: number;
  /** 뷰포트 비율 (0~1). clientHeight / scrollHeight. */
  viewportRatio: number;
}

/** 초기 상태 — 마운트 직후 측정 전에 반환되는 안전 기본값. */
const INITIAL_STATE: EditorScrollState = {
  scrollProgress: 0,
  viewportRatio: 1,
};

/** seek 시 허용되는 최소/최대 값. */
const MIN_PROGRESS = 0;
const MAX_PROGRESS = 1;

// ============================================================
// PART 2 — Helpers
// ============================================================

/**
 * 주어진 HTMLElement 의 scrollTop/clientHeight/scrollHeight 를 바탕으로
 * EditorScrollState 를 계산한다. maxScroll 이 0 이면 컨텐츠가
 * 뷰포트보다 작거나 같다는 뜻이므로 progress=0, ratio=1.
 */
function computeState(el: HTMLElement): EditorScrollState {
  const scrollHeight = el.scrollHeight || 0;
  const clientHeight = el.clientHeight || 0;
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  if (maxScroll <= 0 || scrollHeight <= 0) {
    return { scrollProgress: 0, viewportRatio: 1 };
  }
  const progress = Math.max(0, Math.min(1, el.scrollTop / maxScroll));
  const ratio = Math.max(0, Math.min(1, clientHeight / scrollHeight));
  return { scrollProgress: progress, viewportRatio: ratio };
}

/**
 * 두 상태가 의미 있게 다른지 검사 — 0.001 미만의 차이는 무시한다.
 * RAF 스로틀과 결합하여 불필요한 리렌더를 억제한다.
 */
function stateEquals(a: EditorScrollState, b: EditorScrollState): boolean {
  return (
    Math.abs(a.scrollProgress - b.scrollProgress) < 0.001 &&
    Math.abs(a.viewportRatio - b.viewportRatio) < 0.001
  );
}

// ============================================================
// PART 3 — Hook
// ============================================================

/**
 * useEditorScroll — 타겟 엘리먼트의 스크롤 진행도를 추적한다.
 *
 * @param targetRef 스크롤 가능한 엘리먼트의 ref (일반적으로 novel-editor-wrapper)
 * @returns [state, seek]
 */
export function useEditorScroll(
  targetRef: React.RefObject<HTMLElement | null>,
): [EditorScrollState, (progress: number) => void] {
  const [state, setState] = useState<EditorScrollState>(INITIAL_STATE);
  const rafRef = useRef<number | null>(null);
  const lastStateRef = useRef<EditorScrollState>(INITIAL_STATE);

  // ---- RAF 스로틀 업데이트 ----
  const scheduleUpdate = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    if (typeof requestAnimationFrame === 'undefined') {
      // SSR/jsdom 환경 — 즉시 계산
      const next = computeState(el);
      if (!stateEquals(next, lastStateRef.current)) {
        lastStateRef.current = next;
        setState(next);
      }
      return;
    }
    if (rafRef.current != null) return; // 이미 예약됨 → 중복 방지
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const current = targetRef.current;
      if (!current) return;
      const next = computeState(current);
      if (!stateEquals(next, lastStateRef.current)) {
        lastStateRef.current = next;
        setState(next);
      }
    });
  }, [targetRef]);

  // ---- scroll 리스너 + ResizeObserver ----
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    if (typeof window === 'undefined') return;

    // 초기 1회 동기 계산
    try {
      const initial = computeState(el);
      lastStateRef.current = initial;
      setState(initial);
    } catch (err) {
      logger.warn('useEditorScroll', 'initial computeState failed', err);
    }

    // scroll 이벤트 (passive)
    const onScroll = () => scheduleUpdate();
    el.addEventListener('scroll', onScroll, { passive: true });

    // ResizeObserver — 컨텐츠 높이/뷰포트 크기 변경 감지
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      try {
        ro = new ResizeObserver(() => scheduleUpdate());
        ro.observe(el);
      } catch (err) {
        logger.warn('useEditorScroll', 'ResizeObserver init failed', err);
        ro = null;
      }
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (ro) {
        try {
          ro.disconnect();
        } catch {
          // 무시 — 이미 해제된 상태
        }
      }
      if (rafRef.current != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [targetRef, scheduleUpdate]);

  // ---- seek 함수 ----
  const seek = useCallback(
    (progress: number) => {
      const el = targetRef.current;
      if (!el) return;
      if (typeof progress !== 'number' || Number.isNaN(progress)) return;
      const clamped = Math.max(MIN_PROGRESS, Math.min(MAX_PROGRESS, progress));
      const scrollHeight = el.scrollHeight || 0;
      const clientHeight = el.clientHeight || 0;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      const top = clamped * maxScroll;
      try {
        if (typeof el.scrollTo === 'function') {
          el.scrollTo({ top, behavior: 'auto' });
        } else {
          // fallback — 구형 브라우저/테스트 환경
          el.scrollTop = top;
        }
      } catch (err) {
        logger.warn('useEditorScroll', 'seek failed', err);
      }
      // 즉시 상태 업데이트 — scroll 이벤트 대기 없이
      scheduleUpdate();
    },
    [targetRef, scheduleUpdate],
  );

  return [state, seek];
}

// ============================================================
// PART 4 — Exports
// ============================================================
export default useEditorScroll;
