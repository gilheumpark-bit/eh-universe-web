/**
 * a11y-check — dev-only axe-core 통합.
 *
 * `NODE_ENV !== 'production'` 일 때만 `@axe-core/react` 를 동적 import 해
 * 콘솔에 접근성 경고를 출력한다. 프로덕션 번들에는 포함되지 않는다.
 *
 * 호출 지점: `src/app/layout.tsx` 의 마운트 1회.
 *
 * @module a11y-check
 */

/**
 * dev 환경에서만 axe-core 를 활성화. 이미 초기화되었으면 no-op.
 *
 * [C] SSR / 프로덕션 빌드에서 조기 반환 — 번들 영향 0.
 * [G] Promise.all 로 3개 모듈 병렬 로드.
 * [K] 중복 초기화 가드 — `window.__axeCoreInitialized__` 플래그.
 */
export async function initA11yCheck(): Promise<void> {
  // 서버 사이드에서는 실행 안 함 (axe-core 는 브라우저 전용).
  if (typeof window === 'undefined') return;

  // 프로덕션 빌드에서는 절대 실행하지 않음 — 번들·성능 영향 차단.
  if (process.env.NODE_ENV === 'production') return;

  // 중복 초기화 방지 — HMR / StrictMode 더블 마운트 대응.
  const w = window as unknown as { __axeCoreInitialized__?: boolean };
  if (w.__axeCoreInitialized__) return;
  w.__axeCoreInitialized__ = true;

  try {
    // dynamic import — 프로덕션 번들에 포함되지 않도록 분리.
    const [ReactMod, ReactDOMMod, axeMod] = await Promise.all([
      import('react'),
      import('react-dom'),
      import('@axe-core/react'),
    ]);

    // ESM/CJS interop — `default` 가 있으면 그것, 없으면 모듈 자체.
    const React = (ReactMod as { default?: unknown }).default ?? ReactMod;
    const ReactDOM = (ReactDOMMod as { default?: unknown }).default ?? ReactDOMMod;
    const axe = (axeMod as { default?: unknown }).default ?? axeMod;

    if (typeof axe === 'function') {
      (axe as (r: unknown, rd: unknown, timeout: number) => void)(React, ReactDOM, 1000);
    }
  } catch {
    // axe 초기화 실패는 조용히 무시 — dev 편의 기능이므로 본 앱에 영향 주지 않음.
  }
}

// IDENTITY_SEAL: role=a11y-dev-check | env=development-only | import=dynamic | bundle-impact=0
