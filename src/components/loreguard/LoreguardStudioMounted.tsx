"use client";

// ============================================================
// [Phase 2 브리지 — 2026-06-10] LoreguardStudioMounted
// 새 6탭 셸(LoreguardStudio)을 real 엔진 provider(StudioShell children-slot)
// 안에 마운트한다. StudioShell 이 useProjectManager/useStudioAI/useStudioSession
// 등 모든 real 훅을 실행하고 StudioProvider value 를 제공 → 6탭이 useStudio() 로
// 진짜 session/config/AI/translate/export 에 접근한다.
//
// 전체 트리는 ssr:false 로 page.tsx 에서 dynamic import (훅이 localStorage/
// IndexedDB 등 브라우저 API 의존).
// ============================================================

import StudioShell from "@/app/studio/StudioShell";
import LoreguardStudio from "./LoreguardStudio";

export default function LoreguardStudioMounted() {
  return (
    <StudioShell>
      <LoreguardStudio />
    </StudioShell>
  );
}
