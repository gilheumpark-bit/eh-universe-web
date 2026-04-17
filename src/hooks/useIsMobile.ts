// ============================================================
// useIsMobile — 반응형 모바일 감지 훅
// ============================================================
// window resize와 userAgent 모두 고려. SSR 안전 (초기값 false).
// ============================================================

import { useState, useEffect } from 'react';

/**
 * 모바일 기기 감지 훅.
 * - 초기: SSR 안전하게 false
 * - 마운트 후: userAgent + width 조합으로 판정
 * - resize 이벤트로 실시간 업데이트
 *
 * @param breakpoint - 모바일로 간주할 최대 width (기본 768px, Tailwind md)
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const detect = (): boolean => {
      if (typeof window === 'undefined') return false;
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      // 진짜 모바일 UA만 감지 — iPad는 최근에 desktop-class UA 쓰므로 별도 처리
      const uaMobile = /Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      // iPad 신형: UA에는 Mac처럼 나오지만 touch 지원 + 좁은 화면
      const isIPad = /iPad/i.test(ua) || (ua.includes('Macintosh') && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
      const narrowViewport = window.innerWidth < breakpoint;
      const touchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
      // 모바일 기기 UA → 무조건 모바일
      // iPad (태블릿) → narrow일 때만 모바일 취급
      // 그 외 데스크톱 + narrow 창 → 데스크톱 (콘텐츠 보이게)
      // 데스크톱 + touch (터치스크린 노트북) → 데스크톱
      if (uaMobile) return true;
      if (isIPad && narrowViewport) return true;
      if (narrowViewport && touchDevice && ua.toLowerCase().includes('mobile')) return true;
      return false;
    };

    setIsMobile(detect());

    const onResize = () => setIsMobile(detect());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}

// IDENTITY_SEAL: useIsMobile | role=responsive-mobile-detect | inputs=breakpoint | outputs=boolean
