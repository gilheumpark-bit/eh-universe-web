// ============================================================
// PART 1 — useIsComposing (React hook wrapper)
// ============================================================
//
// ime-guard 의 모듈 레벨 플래그를 React 상태로 구독한다. 조합 진입/
// 종료 시 리렌더가 필요한 UI (예: placeholder 숨김, 제안 오버레이)에서
// 사용한다. setTimeout/async 콜백에서는 isIMEComposing() plain 함수를
// 직접 쓰는 편이 리렌더 없어 저렴.
//
// R11 (IME 침묵) 참조.
// ============================================================

import { useEffect, useState } from 'react';

export function useIsComposing(): boolean {
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return; // [C] SSR 가드
    const handleStart = () => setIsComposing(true);
    const handleEnd = () => setIsComposing(false);
    window.addEventListener('compositionstart', handleStart, true);
    window.addEventListener('compositionend', handleEnd, true);
    return () => {
      window.removeEventListener('compositionstart', handleStart, true);
      window.removeEventListener('compositionend', handleEnd, true);
    };
  }, []);

  return isComposing;
}
