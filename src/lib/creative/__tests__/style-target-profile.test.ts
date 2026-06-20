import type { StyleProfile } from "@/lib/studio-types";
import { emptyStyleTarget } from "@/lib/creative/style-profile";
import { styleTargetFromProfile } from "@/lib/creative/style-target-profile";

function profile(sliders: Record<string, number>): StyleProfile {
  return {
    selectedDNA: [],
    sliders,
    checkedSF: [],
    checkedWeb: [],
  };
}

describe("styleTargetFromProfile", () => {
  it("미설정: profile 없으면 빈 목표와 configured=false를 반환한다", () => {
    expect(styleTargetFromProfile(undefined)).toEqual({
      configured: false,
      target: emptyStyleTarget(),
    });
  });

  it("정상: 문체 슬라이더를 style-profile 4지표 목표로 환산한다", () => {
    expect(styleTargetFromProfile(profile({ s1: 1, s2: 2, s3: 4, s4: 5 }))).toEqual({
      configured: true,
      target: {
        sentenceLenAvg: 16,
        dialogueRatio: 40,
        tellTolerance: 16,
        rhythmVariety: 55,
      },
    });
  });

  it("경계: 슬라이더 값은 정수 반올림 후 1~5 범위로 clamp한다", () => {
    expect(styleTargetFromProfile(profile({ s1: -5, s2: 9, s3: 3.6, s4: 0 }))).toEqual({
      configured: true,
      target: {
        sentenceLenAvg: 16,
        dialogueRatio: 8,
        tellTolerance: 58,
        rhythmVariety: 55,
      },
    });
  });

  it("부분 설정: 없는 축은 균형값으로 폴백한다", () => {
    expect(styleTargetFromProfile(profile({ s1: 5 }))).toEqual({
      configured: true,
      target: {
        sentenceLenAvg: 52,
        dialogueRatio: 22,
        tellTolerance: 28,
        rhythmVariety: 40,
      },
    });
  });

  it("비정상: 숫자가 아닌 슬라이더만 있으면 미설정으로 취급한다", () => {
    expect(
      styleTargetFromProfile({
        selectedDNA: [1],
        sliders: { s1: Number.NaN },
        checkedSF: [],
        checkedWeb: [],
      }),
    ).toEqual({
      configured: false,
      target: emptyStyleTarget(),
    });
  });
});
