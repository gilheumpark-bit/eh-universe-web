/**
 * ergonomics/typography — 프리셋 값 + CSS 변수 적용 + localStorage 영속화.
 */

import {
  applyTypography,
  DEFAULT_TYPOGRAPHY_PRESET,
  loadTypographyPreset,
  saveTypographyPreset,
  TYPOGRAPHY_LS_KEY,
  TYPOGRAPHY_PRESETS,
} from "@/lib/ergonomics/typography";

describe("ergonomics/typography", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // reset inline style
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-typography-preset");
  });

  it("has three presets with required tokens", () => {
    for (const preset of ["comfort", "compact", "large"] as const) {
      const tok = TYPOGRAPHY_PRESETS[preset];
      expect(typeof tok.fontSize).toBe("number");
      expect(typeof tok.lineHeight).toBe("number");
      expect(typeof tok.letterSpacing).toBe("number");
      expect(tok.fontSize).toBeGreaterThanOrEqual(12);
      expect(tok.lineHeight).toBeGreaterThanOrEqual(1.3);
    }
  });

  it("comfort is default and geared for long sessions (lh 1.75)", () => {
    expect(DEFAULT_TYPOGRAPHY_PRESET).toBe("comfort");
    expect(TYPOGRAPHY_PRESETS.comfort.lineHeight).toBe(1.75);
  });

  it("applyTypography writes 3 CSS variables on documentElement", () => {
    applyTypography("large");
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--editor-font-size")).toBe("20px");
    expect(root.style.getPropertyValue("--editor-line-height")).toBe("1.8");
    expect(root.style.getPropertyValue("--editor-letter-spacing")).toBe("0.015em");
    expect(root.getAttribute("data-typography-preset")).toBe("large");
  });

  it("applyTypography switches presets idempotently", () => {
    applyTypography("compact");
    expect(document.documentElement.style.getPropertyValue("--editor-font-size")).toBe("14px");
    applyTypography("comfort");
    expect(document.documentElement.style.getPropertyValue("--editor-font-size")).toBe("17px");
  });

  it("saveTypographyPreset persists to localStorage", () => {
    saveTypographyPreset("large");
    expect(window.localStorage.getItem(TYPOGRAPHY_LS_KEY)).toBe("large");
  });

  it("loadTypographyPreset returns saved value", () => {
    saveTypographyPreset("compact");
    expect(loadTypographyPreset()).toBe("compact");
  });

  it("loadTypographyPreset falls back to default on corrupt value", () => {
    window.localStorage.setItem(TYPOGRAPHY_LS_KEY, "bogus-value");
    expect(loadTypographyPreset()).toBe(DEFAULT_TYPOGRAPHY_PRESET);
  });

  it("loadTypographyPreset returns default when nothing saved", () => {
    expect(loadTypographyPreset()).toBe(DEFAULT_TYPOGRAPHY_PRESET);
  });
});
