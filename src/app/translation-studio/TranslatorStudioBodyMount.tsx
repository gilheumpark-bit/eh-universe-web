'use client';

import { useEffect } from 'react';

const ATTR = 'data-eh-translator-studio';

/**
 * globals.css 의 body::before/::after(z~90) 노이즈·스캔라인이 고정 UI(z-50)보다 위에 쌓여
 * 클릭이 막히는 경우가 있어, 이 라우트에 있을 때만 레이어를 끈다.
 */
export function TranslatorStudioBodyMount() {
  useEffect(() => {
    document.body.setAttribute(ATTR, '1');
    return () => {
      document.body.removeAttribute(ATTR);
    };
  }, []);
  return null;
}
