// ============================================================
// creative-logger-global.d.ts — window.__creativeLogger 타입 정의
// ============================================================
//
// Phase 1.2-4 Loop 1 fix — 2026-05-07
// Scene/Character handler 직접 trigger 시 inline cast 중복 제거.
// StudioShell.tsx 가 mount, 자식 컴포넌트는 window.__creativeLogger 호출.
//
// 사용 예:
//   const cl = window.__creativeLogger;
//   if (cl?.logHumanEdit) {
//     void cl.logHumanEdit({ targetType: 'scene', ... });
//   }
// ============================================================

import type { CreativeEventLogger } from '@/hooks/useCreativeEventLogger';

declare global {
  interface Window {
    /**
     * Creative event logger — StudioShell mount 시점에 노출.
     * 자식 컴포넌트가 props drilling 없이 호출 가능.
     * Studio 외 라우트(Settings, Codex 등)에서는 undefined.
     */
    __creativeLogger?: CreativeEventLogger;
  }
}

export {};
