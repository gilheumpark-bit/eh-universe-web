"use client";

// ============================================================
// useTypographyPreset — 에디터 타이포 프리셋 훅
// ============================================================
// 선택된 프리셋을 상태로 들고, 변경 시 documentElement의 CSS 변수를
// 재작성한 뒤 localStorage에 영속화한다.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import {
  applyTypography,
  DEFAULT_TYPOGRAPHY_PRESET,
  loadTypographyPreset,
  saveTypographyPreset,
  type TypographyPreset,
} from "@/lib/ergonomics/typography";
import { updateErgonomicsSettings } from "@/lib/ergonomics/ergonomics-settings";

export interface UseTypographyPresetReturn {
  preset: TypographyPreset;
  setPreset: (next: TypographyPreset) => void;
}

export function useTypographyPreset(): UseTypographyPresetReturn {
  // SSR 안전 — 서버에서는 기본값으로 시작
  const [preset, setPresetState] = useState<TypographyPreset>(DEFAULT_TYPOGRAPHY_PRESET);

  // 마운트 시 localStorage 로드 + CSS 적용
  useEffect(() => {
    const loaded = loadTypographyPreset();
    setPresetState(loaded);
    applyTypography(loaded);
  }, []);

  const setPreset = useCallback((next: TypographyPreset) => {
    setPresetState(next);
    applyTypography(next);
    saveTypographyPreset(next);
    // ergonomics-settings에도 동기화 — Settings UI가 단일 소스로 읽기 위함
    updateErgonomicsSettings({ typographyPreset: next });
  }, []);

  return { preset, setPreset };
}

// IDENTITY_SEAL: useTypographyPreset | role=preset-hook | inputs=none | outputs=preset+setter
