'use client';

import { useEffect } from 'react';

const ATTR = 'data-eh-translator-studio';

/**
 * 과거 전역 body::before 노이즈와의 z-index 충돌 방지용 훅.
 * 아카이브 리디자인 후 노이즈 레이어는 제거됨 — 속성은 다른 오버레이 대비용으로 유지 가능.
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
