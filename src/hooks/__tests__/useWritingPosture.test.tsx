/**
 * useWritingPosture — 30분 타이핑 → noa:alert 1회 발행, 5분 idle → 리셋.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react";

import { useWritingPosture, __POSTURE_CONSTANTS } from "@/hooks/useWritingPosture";

// ============================================================
// PART 1 — Test harness
// ============================================================

function Harness({ enabled = true }: { enabled?: boolean }) {
  useWritingPosture({ enabled, language: "KO" });
  return React.createElement("div", { "data-testid": "posture-harness" });
}

function mount(enabled: boolean = true) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(Harness, { enabled }));
  });
  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
}

function dispatchKeydown() {
  const ev = new KeyboardEvent("keydown", { key: "a", bubbles: true });
  act(() => {
    window.dispatchEvent(ev);
  });
}

// ============================================================
// PART 2 — Tests
// ============================================================

describe("useWritingPosture", () => {
  let alerts: Array<{ title?: string; message?: string }>;
  let listener: (e: Event) => void;
  let nowMs: number;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    nowMs = 1_700_000_000_000;
    dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => nowMs);

    alerts = [];
    listener = (e: Event) => {
      const c = e as CustomEvent<{ title?: string; message?: string }>;
      alerts.push({ title: c.detail?.title, message: c.detail?.message });
    };
    window.addEventListener("noa:alert", listener);
  });

  afterEach(() => {
    window.removeEventListener("noa:alert", listener);
    dateNowSpy.mockRestore();
    jest.useRealTimers();
  });

  it("fires noa:alert after 30 minutes of continuous typing", () => {
    const h = mount(true);

    // 연속 타이핑 시뮬: 2분 간격으로 keydown (idle 리셋 5분보다 짧음)
    dispatchKeydown();
    for (let i = 0; i < 15; i++) {
      nowMs += 2 * 60 * 1000;
      dispatchKeydown();
    }
    // 총 30분 경과
    act(() => {
      jest.advanceTimersByTime(__POSTURE_CONSTANTS.CHECK_TICK_MS * 2);
    });
    expect(alerts.length).toBeGreaterThanOrEqual(1);

    h.cleanup();
  });

  it("resets session after 5+ minute idle", () => {
    const h = mount(true);
    dispatchKeydown();

    // 10분 지나고 idle (키 입력 없음) — 리셋 트리거
    nowMs += 10 * 60 * 1000;
    act(() => {
      jest.advanceTimersByTime(__POSTURE_CONSTANTS.CHECK_TICK_MS * 20);
    });
    // 5분 이상 idle → 세션 리셋 + 다시 입력 시작
    dispatchKeydown();

    // 이 시점부터 30분이 지나야 발행. 20분 경과 시점에는 미발행.
    nowMs += 20 * 60 * 1000;
    act(() => {
      jest.advanceTimersByTime(__POSTURE_CONSTANTS.CHECK_TICK_MS * 40);
    });
    expect(alerts.length).toBe(0);

    h.cleanup();
  });

  it("respects enabled=false (no events)", () => {
    const h = mount(false);
    dispatchKeydown();
    nowMs += 40 * 60 * 1000;
    act(() => {
      jest.advanceTimersByTime(__POSTURE_CONSTANTS.CHECK_TICK_MS * 80);
    });
    expect(alerts.length).toBe(0);
    h.cleanup();
  });
});
