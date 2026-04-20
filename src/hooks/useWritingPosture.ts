"use client";

// ============================================================
// useWritingPosture — 자세 nudge 훅
// ============================================================
// 연속 집필 30분마다 noa:alert 토스트를 1회 발행.
// 5분 이상 idle이면 자세 타이머 리셋 (이미 쉰 것으로 간주).
//
// useSessionTimer의 포모도로/휴식과 orthogonal:
//   - 포모도로: 25분 작업→5분 휴식 주기 (옵트인)
//   - 자세 nudge: 30분 연속 타이핑 감지 시 1회 알림 (가벼움, default on)
//
// 설계 원칙:
//  - keydown listener 하나 + setInterval 하나
//  - 가장 마지막 keystroke → 30분 경과 & 토스트 미발행 시 1회 dispatch
//  - 5분 idle 감지 시 lastFiredAt 리셋 → 다시 30분 타이머 시작
//  - 언어별 메시지 4종 (ko/en/ja/zh)
// ============================================================

import { useEffect, useRef } from "react";
import { loadErgonomicsSettings } from "@/lib/ergonomics/ergonomics-settings";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 1 — 상수
// ============================================================

const POSTURE_INTERVAL_MS = 30 * 60 * 1000; // 30분
const IDLE_RESET_MS = 5 * 60 * 1000; // 5분 이상 idle → 리셋
const CHECK_TICK_MS = 30 * 1000; // 30초마다 상태 점검

// ============================================================
// PART 2 — 훅 (optional language prop)
// ============================================================

export interface UseWritingPostureOptions {
  /** 메시지 언어 — 기본 KO */
  language?: AppLanguage;
  /** true이면 활성화, false이면 no-op. 기본은 설정에서 자동 조회 */
  enabled?: boolean;
}

export function useWritingPosture({
  language = "KO",
  enabled,
}: UseWritingPostureOptions = {}): void {
  const lastKeystrokeRef = useRef<number>(0);
  const lastFiredRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(0);
  const enabledRef = useRef<boolean>(true);

  useEffect(() => {
    enabledRef.current = enabled ?? loadErgonomicsSettings().postureNudgeEnabled;
  }, [enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isEnabled = enabled ?? loadErgonomicsSettings().postureNudgeEnabled;
    if (!isEnabled) return;

    const onKeydown = () => {
      const now = Date.now();
      // idle 리셋 — 5분 이상 간격이면 세션 재시작
      if (
        lastKeystrokeRef.current > 0 &&
        now - lastKeystrokeRef.current >= IDLE_RESET_MS
      ) {
        sessionStartRef.current = now;
        lastFiredRef.current = 0;
      }
      if (sessionStartRef.current === 0) sessionStartRef.current = now;
      lastKeystrokeRef.current = now;
    };

    const tick = () => {
      const now = Date.now();
      if (!enabledRef.current) return;
      if (sessionStartRef.current === 0) return;
      // 최근 idle이 5분 넘으면 세션 리셋 (타이머 tick에서도 감지)
      if (
        lastKeystrokeRef.current > 0 &&
        now - lastKeystrokeRef.current >= IDLE_RESET_MS
      ) {
        sessionStartRef.current = now;
        lastFiredRef.current = 0;
        return;
      }
      // 30분 경과 & 최소 30분 간격 → 1회 fire
      const sinceFire =
        lastFiredRef.current === 0
          ? now - sessionStartRef.current
          : now - lastFiredRef.current;
      if (sinceFire < POSTURE_INTERVAL_MS) return;

      lastFiredRef.current = now;
      try {
        window.dispatchEvent(
          new CustomEvent("noa:alert", {
            detail: {
              variant: "info",
              title: L4(language, {
                ko: "잠깐 자세 체크",
                en: "Posture check",
                ja: "姿勢チェック",
                zh: "姿势检查",
              }),
              message: L4(language, {
                ko: "잠깐 허리 펴고 어깨 돌려볼까요?",
                en: "Stretch your back and roll your shoulders?",
                ja: "背筋を伸ばして肩を回してみませんか?",
                zh: "要不要挺直腰背转一转肩膀?",
              }),
            },
          }),
        );
      } catch {
        /* dispatch failure — silent */
      }
    };

    window.addEventListener("keydown", onKeydown);
    const id = window.setInterval(tick, CHECK_TICK_MS);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.clearInterval(id);
    };
  }, [enabled, language]);
}

// ============================================================
// PART 3 — 상수 export (테스트용)
// ============================================================

export const __POSTURE_CONSTANTS = {
  POSTURE_INTERVAL_MS,
  IDLE_RESET_MS,
  CHECK_TICK_MS,
};

// IDENTITY_SEAL: useWritingPosture | role=posture-nudge | inputs=keydown | outputs=noa:alert
