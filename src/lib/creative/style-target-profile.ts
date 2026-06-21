import type { StyleProfile } from "@/lib/studio-types";
import { emptyStyleTarget, type StyleTarget } from "@/lib/creative/style-profile";

export interface StyleTargetFromProfileResult {
  configured: boolean;
  target: StyleTarget;
}

const SENTENCE_LEN_BY_SLIDER = [16, 22, 30, 40, 52] as const;
const DIALOGUE_RATIO_BY_SLIDER = [8, 14, 22, 30, 40] as const;
const TELL_TOLERANCE_BY_SLIDER = [8, 16, 28, 42, 58] as const;
const RHYTHM_VARIETY_BY_SLIDER = [18, 28, 40, 55, 70] as const;

function sliderIndex(rawValue: unknown): number | null {
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) return null;
  return Math.max(0, Math.min(4, Math.round(rawValue) - 1));
}

function hasConfiguredSlider(profile: StyleProfile | null | undefined): boolean {
  if (!profile?.sliders) return false;
  return ["s1", "s2", "s3", "s4"].some((key) => sliderIndex(profile.sliders[key]) != null);
}

function pickBySlider(values: readonly number[], rawValue: unknown, fallbackIndex: number): number {
  const index = sliderIndex(rawValue) ?? fallbackIndex;
  return values[index] ?? values[fallbackIndex] ?? 0;
}

export function styleTargetFromProfile(
  profile: StyleProfile | null | undefined,
): StyleTargetFromProfileResult {
  if (!hasConfiguredSlider(profile)) {
    return { configured: false, target: emptyStyleTarget() };
  }

  const sliders = profile?.sliders ?? {};
  return {
    configured: true,
    target: {
      sentenceLenAvg: pickBySlider(SENTENCE_LEN_BY_SLIDER, sliders.s1, 2),
      dialogueRatio: pickBySlider(DIALOGUE_RATIO_BY_SLIDER, sliders.s4, 2),
      tellTolerance: pickBySlider(TELL_TOLERANCE_BY_SLIDER, sliders.s2, 2),
      rhythmVariety: pickBySlider(RHYTHM_VARIETY_BY_SLIDER, sliders.s3, 2),
    },
  };
}
