"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * 경로가 바뀔 때마다 React 트리를 분리해, 스튜디오 간 이동 시
 * 이전 페이지(또는 캐시된 홈)가 한 프레임 보이는 현상을 줄입니다.
 */
export function MainContentRegion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div id="main-content" key={pathname}>
      {children}
    </div>
  );
}
