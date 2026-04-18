// ============================================================
// useMediaQuery — CSS 미디어 쿼리 매칭 React 훅
// ============================================================
// matchMedia API 기반. SSR 안전(초기값 false), 마운트 후 실제 값 반영,
// change 이벤트 리스너로 실시간 업데이트, 언마운트 시 cleanup.
// ============================================================

import { useState, useEffect } from 'react';

/**
 * CSS 미디어 쿼리 매칭 여부 반환.
 * - SSR/초기 렌더: false
 * - 클라이언트 마운트: matchMedia 결과 동기화
 * - 브레이크포인트 변경(뷰포트 리사이즈, DevTools 토글 등) 실시간 반영
 *
 * @param query CSS media query string (예: '(max-width: 767px)')
 * @returns matches 여부
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(query);
    } catch {
      // 잘못된 쿼리 문자열일 경우 조용히 종료
      return;
    }

    // 마운트 직후 현재 값으로 동기화
    setMatches(mql.matches);

    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    // 최신 addEventListener 우선, 구형 addListener 폴백
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }
    // Safari <14 호환 (레거시 API)
    const legacyListener = (e: MediaQueryListEvent) => handleChange(e);
    mql.addListener(legacyListener);
    return () => mql.removeListener(legacyListener);
  }, [query]);

  return matches;
}

// ============================================================
// 편의 훅 — Tailwind 기본 브레이크포인트(md=768, lg=1024)와 정렬
// ============================================================

/** 모바일: max-width 767px (Tailwind md 미만) */
export function useIsMobileQuery(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** 태블릿: 768 ~ 1023px (Tailwind md 이상, lg 미만) */
export function useIsTabletQuery(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/** 데스크톱: 1024px+ (Tailwind lg 이상) */
export function useIsDesktopQuery(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

// IDENTITY_SEAL: useMediaQuery | role=responsive-media-query | inputs=query | outputs=boolean
