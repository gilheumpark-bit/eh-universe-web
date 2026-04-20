"use client";

// ============================================================
// useEyeStrainDimmer — 장시간 세션 자동 다이머 훅
// ============================================================
// 세션 시작(마운트 시각)부터의 경과를 주기적으로 체크하고,
// 임계값을 넘으면 documentElement에 data-eye-strain-level을 기록.
// 사용자가 manualOverride를 지정하면 자동 레벨을 무시하고 그 값을 유지.
//
// 설계 원칙:
//  - 60초 interval 하나만 → 과다 render 방지
//  - 언마운트 시 레벨 0으로 복귀 (attribute 제거)
//  - enabled=false → 자동 오버라이드 무효화 + 레벨 0 유지
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyEyeStrainLevel,
  MAX_EYE_STRAIN_LEVEL,
  resolveEyeStrainLevel,
  type EyeStrainLevel,
} from "@/lib/ergonomics/eye-strain";

// ============================================================
// PART 1 — 타입
// ============================================================

const CHECK_TICK_MS = 60 * 1000;

export interface UseEyeStrainDimmerOptions {
  /** false면 자동 감쇄 비활성, 레벨 0 유지 */
  enabled: boolean;
  /** 사용자 수동 레벨 — null이면 자동 계산 */
  manualOverride?: EyeStrainLevel | null;
}

export interface UseEyeStrainDimmerReturn {
  /** 현재 실제 적용된 레벨 */
  level: EyeStrainLevel;
  /** 사용자 수동 레벨 조정 — 일시적 override, null로 해제 */
  setManualLevel: (next: EyeStrainLevel | null) => void;
}

// ============================================================
// PART 2 — 메인 훅
// ============================================================

export function useEyeStrainDimmer({
  enabled,
  manualOverride = null,
}: UseEyeStrainDimmerOptions): UseEyeStrainDimmerReturn {
  const sessionStartRef = useRef<number>(0);
  const [override, setOverrideState] = useState<EyeStrainLevel | null>(manualOverride);
  const [level, setLevel] = useState<EyeStrainLevel>(0);

  // prop override 반영
  useEffect(() => {
    setOverrideState(manualOverride);
  }, [manualOverride]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStartRef.current = Date.now();

    const compute = () => {
      if (!enabled) {
        setLevel(0);
        applyEyeStrainLevel(0);
        return;
      }
      const elapsed = Date.now() - sessionStartRef.current;
      const resolved = resolveEyeStrainLevel(elapsed, override);
      const capped: EyeStrainLevel = (
        resolved > MAX_EYE_STRAIN_LEVEL ? MAX_EYE_STRAIN_LEVEL : resolved
      ) as EyeStrainLevel;
      setLevel(capped);
      applyEyeStrainLevel(capped);
    };

    compute();
    const id = window.setInterval(compute, CHECK_TICK_MS);
    return () => {
      window.clearInterval(id);
      // 언마운트 시 레벨 제거
      applyEyeStrainLevel(0);
    };
  }, [enabled, override]);

  const setManualLevel = useCallback((next: EyeStrainLevel | null) => {
    setOverrideState(next);
  }, []);

  return { level, setManualLevel };
}

// IDENTITY_SEAL: useEyeStrainDimmer | role=auto-dimmer | inputs=enabled+override | outputs=level
