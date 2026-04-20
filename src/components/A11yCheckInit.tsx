"use client";

// ============================================================
// A11yCheckInit — axe-core dev 런타임 활성화 (layout 1회 마운트)
// ============================================================
// 프로덕션 빌드에서는 `initA11yCheck` 내부에서 조기 반환 → 번들 영향 0.
// dev 환경에서만 1초 디바운스로 접근성 경고를 콘솔에 출력.

import { useEffect } from "react";

export default function A11yCheckInit() {
  useEffect(() => {
    // dynamic import — 프로덕션 번들에 axe 코드가 포함되지 않도록 격리.
    import("@/lib/a11y-check")
      .then(({ initA11yCheck }) => initA11yCheck())
      .catch(() => {
        // dev 전용 기능 실패는 무시.
      });
  }, []);

  return null;
}
