"use client";

// ============================================================
// useKeystrokeHeatmap — 에디터 KPM 수집 + 주기적 스냅샷
// ============================================================
// 에디터 포커스 상태에서 발생한 keydown만 ergonomics/keystroke-heatmap의
// recordKeystroke에 기록한다. 10초 간격으로 getSnapshot() 호출 결과를
// state로 노출 → 위젯 렌더에 사용.
//
// 에디터 포커스 판별:
//   document.activeElement.closest('[data-role="editor"]')
//   또는 contentEditable(ProseMirror/Tiptap) 요소 내부
//
// 설계 원칙:
//  - 비활성 시 리스너 미부착 → 토글 OFF에서 프라이버시/성능 완전 중립
//  - 스냅샷 state 갱신은 10s throttled — UI 렌더 부담 최소
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSnapshot,
  recordKeystroke,
  resetHeatmap,
  type KeystrokeSnapshot,
} from "@/lib/ergonomics/keystroke-heatmap";

// ============================================================
// PART 1 — 타입 + 상수
// ============================================================

const SNAPSHOT_TICK_MS = 10 * 1000;

const EMPTY_SNAPSHOT: KeystrokeSnapshot = {
  kpmCurrent: 0,
  kpmPeak: 0,
  kpmAvg: 0,
  sessionStart: 0,
  totalInWindow: 0,
};

export interface UseKeystrokeHeatmapOptions {
  /** false이면 리스너 미부착 — 토글 OFF 상태 */
  enabled: boolean;
}

export interface UseKeystrokeHeatmapReturn {
  snapshot: KeystrokeSnapshot;
  reset: () => void;
}

// ============================================================
// PART 2 — 포커스 판별
// ============================================================

function isEditorFocused(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  // 명시적 data-role="editor" 마커
  if (el.closest('[data-role="editor"]')) return true;
  // Tiptap/ProseMirror — contentEditable
  if (el.isContentEditable) return true;
  // 원고 textarea(레거시)
  if (el.tagName === "TEXTAREA" && el.closest('[data-studio-editor]')) return true;
  return false;
}

// ============================================================
// PART 3 — 메인 훅
// ============================================================

export function useKeystrokeHeatmap({
  enabled,
}: UseKeystrokeHeatmapOptions): UseKeystrokeHeatmapReturn {
  const [snapshot, setSnapshot] = useState<KeystrokeSnapshot>(EMPTY_SNAPSHOT);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(EMPTY_SNAPSHOT);
      return;
    }
    if (typeof window === "undefined") return;

    const onKeydown = () => {
      if (!enabledRef.current) return;
      if (!isEditorFocused()) return;
      recordKeystroke();
    };

    const tick = () => {
      if (!enabledRef.current) return;
      setSnapshot(getSnapshot());
    };

    window.addEventListener("keydown", onKeydown);
    const id = window.setInterval(tick, SNAPSHOT_TICK_MS);
    // 초기 1회
    tick();
    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.clearInterval(id);
    };
  }, [enabled]);

  const reset = useCallback(() => {
    resetHeatmap();
    setSnapshot(EMPTY_SNAPSHOT);
  }, []);

  return { snapshot, reset };
}

// IDENTITY_SEAL: useKeystrokeHeatmap | role=kpm-telemetry | inputs=enabled | outputs=snapshot+reset
