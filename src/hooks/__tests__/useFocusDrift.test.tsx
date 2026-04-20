/**
 * useFocusDrift — 탭 이탈 후 15분+ 복귀 감지.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react";

import { useFocusDrift, __FOCUS_DRIFT_CONSTANTS } from "@/hooks/useFocusDrift";

// ============================================================
// PART 1 — Harness
// ============================================================

interface Props {
  enabled?: boolean;
  onResume?: () => void;
}

function Harness({ enabled = true, onResume }: Props) {
  useFocusDrift({ enabled, language: "KO", onResume });
  return React.createElement("div");
}

function mount(props: Props = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(Harness, props));
  });
  return {
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

// ============================================================
// PART 2 — Tests
// ============================================================

describe("useFocusDrift", () => {
  let alerts: Array<{ title?: string }>;
  let listener: (e: Event) => void;
  let nowMs: number;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    nowMs = 1_700_000_000_000;
    dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => nowMs);
    alerts = [];
    listener = (e: Event) => {
      const c = e as CustomEvent<{ title?: string }>;
      alerts.push({ title: c.detail?.title });
    };
    window.addEventListener("noa:alert", listener);
  });

  afterEach(() => {
    window.removeEventListener("noa:alert", listener);
    dateNowSpy.mockRestore();
  });

  it("fires alert + onResume when returning after 15+ minutes", () => {
    const onResume = jest.fn();
    const h = mount({ enabled: true, onResume });

    // hidden
    setVisibility("hidden");

    // 20분 후 복귀
    nowMs += 20 * 60 * 1000;
    setVisibility("visible");

    expect(alerts.length).toBe(1);
    expect(onResume).toHaveBeenCalledTimes(1);
    h.cleanup();
  });

  it("does not fire when returning under 15 minutes", () => {
    const onResume = jest.fn();
    const h = mount({ enabled: true, onResume });

    setVisibility("hidden");
    nowMs += 10 * 60 * 1000;
    setVisibility("visible");

    expect(alerts.length).toBe(0);
    expect(onResume).not.toHaveBeenCalled();
    h.cleanup();
  });

  it("does nothing when disabled", () => {
    const onResume = jest.fn();
    const h = mount({ enabled: false, onResume });
    setVisibility("hidden");
    nowMs += 30 * 60 * 1000;
    setVisibility("visible");
    expect(alerts.length).toBe(0);
    expect(onResume).not.toHaveBeenCalled();
    h.cleanup();
  });

  it("exposes threshold constant (15 min)", () => {
    expect(__FOCUS_DRIFT_CONSTANTS.DRIFT_THRESHOLD_MS).toBe(15 * 60 * 1000);
  });
});
