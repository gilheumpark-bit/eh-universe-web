import { act, renderHook } from "@testing-library/react";
import { useCreativeProcessTrackingPreference } from "@/hooks/useCreativeProcessTrackingPreference";
import { CREATIVE_PROCESS_TRACKING_STORAGE_KEY } from "@/lib/creative-process/tracking-consent";

describe("useCreativeProcessTrackingPreference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("기본값은 꺼짐이다", () => {
    const { result } = renderHook(() => useCreativeProcessTrackingPreference());

    expect(result.current[0]).toBe(false);
  });

  it("사용자가 켜면 localStorage와 구독 상태가 함께 바뀐다", () => {
    const { result } = renderHook(() => useCreativeProcessTrackingPreference());

    act(() => {
      result.current[1](true);
    });

    expect(localStorage.getItem(CREATIVE_PROCESS_TRACKING_STORAGE_KEY)).toBe("on");
    expect(result.current[0]).toBe(true);
  });
});

