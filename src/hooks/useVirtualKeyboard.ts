"use client";

// ============================================================
// useVirtualKeyboard — 모바일 가상 키보드 감지 + 레이아웃 보정
// ============================================================
// visualViewport API 기반. iOS Safari / Android Chrome 대응.
// 키보드 올라올 때 window.innerHeight 대비 visualViewport.height 차이로 감지.
// ============================================================

import { useEffect, useState } from "react";

export interface VirtualKeyboardState {
  /** 키보드가 열려 있는지 (보수적: 높이 차이 150px+) */
  isOpen: boolean;
  /** 키보드 높이 (px). 닫혀있으면 0 */
  height: number;
  /** 현재 visualViewport 높이 */
  viewportHeight: number;
  /** window.innerHeight (전체 높이) */
  windowHeight: number;
  /** visualViewport API 지원 여부 */
  supported: boolean;
}

const INITIAL_STATE: VirtualKeyboardState = {
  isOpen: false,
  height: 0,
  viewportHeight: 0,
  windowHeight: 0,
  supported: false,
};

/** 키보드 감지 임계값 — 이보다 큰 변화만 "키보드 열림"으로 간주 */
const KEYBOARD_THRESHOLD_PX = 150;

/**
 * 가상 키보드 상태 추적. 키보드 올라올 때 layout shift 대응 용.
 *
 * 사용 예:
 * ```tsx
 * const kb = useVirtualKeyboard();
 * <div style={{ paddingBottom: kb.isOpen ? kb.height : 0 }} />
 * ```
 */
export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>(INITIAL_STATE);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) {
      // 폴백: visualViewport 미지원 (IE, 일부 브라우저) — 상태 업데이트 없음
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((s) => ({ ...s, supported: false }));
      return;
    }

    const updateState = () => {
      const viewportHeight = vv.height;
      const windowHeight = window.innerHeight;
      const diff = Math.max(0, windowHeight - viewportHeight);
      const isOpen = diff >= KEYBOARD_THRESHOLD_PX;
      setState({
        isOpen,
        height: isOpen ? Math.round(diff) : 0,
        viewportHeight: Math.round(viewportHeight),
        windowHeight: Math.round(windowHeight),
        supported: true,
      });
    };

    // 초기 상태
    updateState();

    // visualViewport 이벤트 구독
    vv.addEventListener("resize", updateState);
    vv.addEventListener("scroll", updateState);

    // window resize도 백업 (orientation change 등)
    window.addEventListener("resize", updateState);

    return () => {
      vv.removeEventListener("resize", updateState);
      vv.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, []);

  return state;
}

/**
 * 간결한 boolean 훅 — 키보드 열림 여부만 필요할 때.
 */
export function useKeyboardOpen(): boolean {
  return useVirtualKeyboard().isOpen;
}

// IDENTITY_SEAL: useVirtualKeyboard | role=virtual keyboard detection | inputs=none | outputs=VirtualKeyboardState
