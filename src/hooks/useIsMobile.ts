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
      const uaMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const narrowViewport = window.innerWidth < breakpoint;
      const touchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
      // UA가 모바일이면 무조건 true. 아니면 narrow + touch 조합.
      return uaMobile || (narrowViewport && touchDevice) || narrowViewport;
    };

    setIsMobile(detect());

    const onResize = () => setIsMobile(detect());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}

// IDENTITY_SEAL: useIsMobile | role=responsive-mobile-detect | inputs=breakpoint | outputs=boolean
