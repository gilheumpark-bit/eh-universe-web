"use client";
// ============================================================
// PART 1 — Module Header
// ============================================================
// sw-register — Service worker registration for PWA offline support.
//
// [P9 루프3/senior-architect, 2026-06-08] 수리:
//   public/sw.js 존재하나 register 코드 부재 → SW 가 install 안 됨.
//   layout.tsx 마운트되어 navigator.serviceWorker.register('/sw.js') 실행.
//
// 정책:
//   - prod only (NODE_ENV !== 'development') — dev 에서 SW 캐싱 = HMR 방해.
//   - 'serviceWorker' in navigator 가드.
//   - 새 버전 감지 시 console.log (자동 reload 안 함 — 사용자 흐름 보호).
//   - register 실패 → silent (production 사용자 영향 0).
// ============================================================

import { useEffect } from 'react';

// ============================================================
// PART 2 — Component
// ============================================================

export default function SwRegister(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // dev 에서 SW = HMR 방해. NODE_ENV development 면 skip.
    if (process.env.NODE_ENV === 'development') return;

    let cancelled = false;

    // 페이지 load 이후 register — initial JS budget 보호.
    const register = async (): Promise<void> => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (cancelled) return;

        // 업데이트 감지 — 자동 reload 안 함 (사용자 작업 중일 수 있음).
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // 새 버전이 대기 중. 사용자는 다음 새로고침 때 적용됨.
              // eslint-disable-next-line no-console
              console.info('[sw] new version available — reload to apply');
            }
          });
        });
      } catch {
        // Silent — SW 실패가 사용자 영향 0 (그냥 캐싱만 없음).
      }
    };

    // requestIdleCallback 가능하면 idle 시점, 아니면 setTimeout.
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(() => { void register(); }, { timeout: 3000 });
      return () => {
        cancelled = true;
        if (typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(id);
      };
    }
    const timeoutId = window.setTimeout(() => { void register(); }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  return null;
}

// IDENTITY_SEAL: PART-1..2 | role=sw-register-client | inputs=none | outputs=service-worker-registered
