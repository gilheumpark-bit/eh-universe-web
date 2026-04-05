"use client";

import { useEffect } from "react";

/**
 * #19: Pre-loads v4 AES-GCM keys into memory cache on app start.
 * ai-providers는 동적 import로 분리해 루트 번들에 큰 동기 청크를 붙이지 않음.
 */
export default function ApiKeyHydrator() {
  useEffect(() => {
    const hydrate = () => {
      void import("@/lib/ai-providers")
        .then((m) => m.hydrateAllApiKeys())
        .then(() => import("@/lib/multi-key-manager"))
        .then((m) => m.hydrateMultiKeyManager())
        .then(() => {
          // 키 로드 완료 후 UI에 알림 — BYOK 키 인식 트리거
          window.dispatchEvent(new Event('noa-keys-changed'));
        })
        .catch(() => {
          /* keys load lazily on first use */
        });
    };
    // 즉시 실행 — v4 키 복호화를 지연하면 AI 기능이 빈 키로 실패함
    const t = window.setTimeout(hydrate, 0);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
