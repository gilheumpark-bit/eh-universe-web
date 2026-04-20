/**
 * ergonomics/eye-strain — 레벨 계산 + DOM 속성 적용.
 */

import {
  applyEyeStrainLevel,
  computeEyeStrainLevel,
  EYE_STRAIN_L1_MS,
  EYE_STRAIN_L2_MS,
  resolveEyeStrainLevel,
} from "@/lib/ergonomics/eye-strain";

describe("ergonomics/eye-strain", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-eye-strain-level");
  });

  it("returns 0 below 90 minutes", () => {
    expect(computeEyeStrainLevel(0)).toBe(0);
    expect(computeEyeStrainLevel(30 * 60 * 1000)).toBe(0);
    expect(computeEyeStrainLevel(EYE_STRAIN_L1_MS - 1)).toBe(0);
  });

  it("returns 1 at 90 minutes", () => {
    expect(computeEyeStrainLevel(EYE_STRAIN_L1_MS)).toBe(1);
    expect(computeEyeStrainLevel(EYE_STRAIN_L1_MS + 60_000)).toBe(1);
  });

  it("returns 2 at 180 minutes", () => {
    expect(computeEyeStrainLevel(EYE_STRAIN_L2_MS)).toBe(2);
    expect(computeEyeStrainLevel(EYE_STRAIN_L2_MS * 2)).toBe(2);
  });

  it("returns 0 for invalid input", () => {
    expect(computeEyeStrainLevel(-100)).toBe(0);
    expect(computeEyeStrainLevel(NaN)).toBe(0);
    expect(computeEyeStrainLevel(Infinity)).toBe(0);
  });

  it("resolveEyeStrainLevel respects manual override", () => {
    expect(resolveEyeStrainLevel(EYE_STRAIN_L2_MS, 0)).toBe(0);
    expect(resolveEyeStrainLevel(0, 2)).toBe(2);
    expect(resolveEyeStrainLevel(EYE_STRAIN_L1_MS, null)).toBe(1);
  });

  it("applyEyeStrainLevel sets data-eye-strain-level attribute", () => {
    applyEyeStrainLevel(1);
    expect(document.documentElement.getAttribute("data-eye-strain-level")).toBe("1");
    applyEyeStrainLevel(2);
    expect(document.documentElement.getAttribute("data-eye-strain-level")).toBe("2");
  });

  it("applyEyeStrainLevel(0) removes attribute", () => {
    document.documentElement.setAttribute("data-eye-strain-level", "1");
    applyEyeStrainLevel(0);
    expect(document.documentElement.getAttribute("data-eye-strain-level")).toBeNull();
  });
});
