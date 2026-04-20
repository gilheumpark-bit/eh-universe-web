"use client";

// ============================================================
// useFocusDrift — 탭 이탈 → 장시간 후 복귀 감지 nudge
// ============================================================
// 작가가 다른 탭/앱으로 갔다가 15분+ 후 돌아오면 부드러운 토스트로
// "여기까지 쓰셨어요" 위치 복귀 버튼을 보여준다.
//
// 설계 원칙:
//  - document.visibilitychange 단일 리스너
//  - 이탈 시각 ref 기록 → 복귀 시점에서 diff 계산
//  - opt-in 기본 (default off) — 과한 개입 방지
//  - onResume 콜백으로 호출 측이 실제 scroll/복귀 액션 주입
// ============================================================

import { useEffect, useRef } from "react";
import { loadErgonomicsSettings } from "@/lib/ergonomics/ergonomics-settings";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 1 — 상수
// ============================================================

const DRIFT_THRESHOLD_MS = 15 * 60 * 1000; // 15분

// ============================================================
// PART 2 — 타입
// ============================================================

export interface UseFocusDriftOptions {
  /** true로 활성화. 미지정 시 설정 파일 기본값 조회 (default off) */
  enabled?: boolean;
  language?: AppLanguage;
  /** 사용자가 "복귀" 버튼 클릭 시 호출할 콜백 — 호출 측이 실제 scroll/selection 주입 */
  onResume?: () => void;
}

// ============================================================
// PART 3 — 훅
// ============================================================

export function useFocusDrift({
  enabled,
  language = "KO",
  onResume,
}: UseFocusDriftOptions = {}): void {
  const hiddenAtRef = useRef<number>(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const isEnabled = enabled ?? loadErgonomicsSettings().focusDriftEnabled;
    if (!isEnabled) return;

    const handler = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      // 복귀
      if (hiddenAtRef.current === 0) return;
      const awayMs = Date.now() - hiddenAtRef.current;
      hiddenAtRef.current = 0;
      if (awayMs < DRIFT_THRESHOLD_MS) return;

      // 복귀 토스트 발행
      try {
        window.dispatchEvent(
          new CustomEvent("noa:alert", {
            detail: {
              variant: "info",
              title: L4(language, {
                ko: "돌아오신 걸 환영합니다",
                en: "Welcome back",
                ja: "おかえりなさい",
                zh: "欢迎回来",
              }),
              message: L4(language, {
                ko: "어디까지 썼는지 보여드릴까요?",
                en: "Jump to where you left off?",
                ja: "前回の続きに戻りますか?",
                zh: "要跳回上次的位置吗?",
              }),
            },
          }),
        );
      } catch {
        /* dispatch failure — silent */
      }
      onResume?.();
    };

    document.addEventListener("visibilitychange", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
    };
  }, [enabled, language, onResume]);
}

export const __FOCUS_DRIFT_CONSTANTS = { DRIFT_THRESHOLD_MS };

// IDENTITY_SEAL: useFocusDrift | role=return-nudge | inputs=visibility-change | outputs=noa:alert
