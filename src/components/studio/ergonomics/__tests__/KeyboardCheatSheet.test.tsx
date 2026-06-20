/**
 * KeyboardCheatSheet — '?' opens, ESC closes, aria-modal + focus trap.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react";

// rAF 즉시 실행 (focus trap이 rAF로 첫 focusable에 focus)
(
  global as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }
).requestAnimationFrame = ((cb: FrameRequestCallback) => {
  cb(0);
  return 1;
}) as unknown as typeof requestAnimationFrame;
(global as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame =
  (() => {
    /* no-op */
  }) as unknown as typeof cancelAnimationFrame;

// jsdom offsetParent polyfill
Object.defineProperty(HTMLElement.prototype, "offsetParent", {
  get() {
    return this.parentNode;
  },
  configurable: true,
});

import KeyboardCheatSheet from "@/components/studio/ergonomics/KeyboardCheatSheet";

function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(React.createElement(KeyboardCheatSheet, { language: "KO" }));
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

function dispatchKey(key: string, opts: { shiftKey?: boolean } = {}) {
  const ev = new KeyboardEvent("keydown", {
    key,
    shiftKey: Boolean(opts.shiftKey),
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    window.dispatchEvent(ev);
  });
  return ev;
}

function dispatchDocKey(key: string) {
  const ev = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    document.dispatchEvent(ev);
  });
  return ev;
}

describe("KeyboardCheatSheet", () => {
  let h: ReturnType<typeof mount>;

  afterEach(() => {
    if (h) h.cleanup();
  });

  it("does not render content initially", () => {
    h = mount();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens when "?" key pressed outside inputs', () => {
    h = mount();
    dispatchKey("?");
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
  });

  it("closes when Escape pressed", () => {
    h = mount();
    dispatchKey("?");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    dispatchDocKey("Escape");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("closes when pressing ? again", () => {
    h = mount();
    dispatchKey("?");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    dispatchKey("?");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('does not open when focus is in an INPUT', () => {
    h = mount();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    dispatchKey("?");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    document.body.removeChild(input);
  });

  it("lists at least 15 shortcut entries", () => {
    h = mount();
    dispatchKey("?");
    const items = document.querySelectorAll('[role="dialog"] li');
    expect(items.length).toBeGreaterThanOrEqual(15);
  });

  it("has a labelled close button", () => {
    h = mount();
    dispatchKey("?");
    const close = document.querySelector('[role="dialog"] button[aria-label]');
    expect(close).not.toBeNull();
  });
});
