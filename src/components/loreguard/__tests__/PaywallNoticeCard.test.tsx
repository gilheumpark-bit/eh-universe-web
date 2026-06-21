import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";

import PaywallNoticeCard from "../PaywallNoticeCard";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";

describe("PaywallNoticeCard", () => {
  it("공통 paywall 응답을 이유·해제 방법·이용 범위 안내로 보여준다", () => {
    render(<PaywallNoticeCard language="KO" durationMs={60_000} />);

    act(() => {
      const message = checkPaywallJson({
        error: "login_or_byok_required",
        message: "노아 대화를 사용하려면 로그인하거나 연결 키를 등록해야 합니다.",
        paywall: {
          reason: "로그인 상태나 연결 키가 확인되지 않았습니다.",
          feature: "노아 대화",
          currentTier: "none",
          requiredTier: "free",
          unlocksWith: ["로그인 후 기본 제공량 사용", "연결 키 등록", "Pro 플랜"],
          pricingUrl: "/pricing",
          settingsTarget: "환경 설정 > 노아 운영",
        },
      });
      expect(message).toContain("로그인하거나 연결 키");
    });

    expect(screen.getByRole("status")).toHaveTextContent("로그인하거나 연결 키를 등록해 주세요");
    expect(screen.getByText("노아 대화")).toBeInTheDocument();
    expect(screen.getByText("미연결 → Free")).toBeInTheDocument();
    expect(screen.getByText("로그인 후 기본 제공량 사용")).toBeInTheDocument();
    expect(screen.getAllByText("연결 키 등록").length).toBeGreaterThan(0);
    expect(screen.getByText("설정 위치:")).toBeInTheDocument();
    expect(screen.getByText("환경 설정 > 노아 운영")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "이용 범위 보기" })).toHaveAttribute("href", "/docs#redeem");
    expect(screen.getByRole("button", { name: "연결 키 등록" })).toBeInTheDocument();
  });

  it("하루 제공량 초과 응답은 제공량·남은 횟수·초기화 정보를 보여준다", () => {
    render(<PaywallNoticeCard language="KO" durationMs={60_000} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("noa:paywall-notice", {
        detail: {
          message: "번역·현지화의 오늘 기본 제공량을 모두 사용했습니다.",
          reason: "현재 플랜의 하루 제공량 5회를 모두 사용했습니다.",
          feature: "번역·현지화",
          currentTier: "free",
          requiredTier: "pro",
          reset: "daily",
          limit: 5,
          remaining: 0,
          unlocksWith: ["Pro 플랜", "연결 키 등록"],
          pricingUrl: "/pricing",
          settingsTarget: "환경 설정 > 노아 운영",
        },
      }));
    });

    expect(screen.getByRole("status")).toHaveTextContent("사용 범위에 도달했습니다");
    expect(screen.getByText("Free → Pro")).toBeInTheDocument();
    expect(screen.getByText("하루 제공량 5")).toBeInTheDocument();
    expect(screen.getByText("남은 횟수 0")).toBeInTheDocument();
    expect(screen.getByText("매일 초기화")).toBeInTheDocument();
    expect(screen.getByText("다음 선택:")).toBeInTheDocument();
  });

  it("연결 키 등록 버튼은 환경 설정 열기 이벤트를 발생시킨다", () => {
    const listener = jest.fn();
    window.addEventListener("loreguard:open-settings", listener);
    render(<PaywallNoticeCard language="KO" durationMs={60_000} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("noa:paywall-notice", {
        detail: {
          message: "사용 범위 안내",
          reason: "현재 플랜에서 사용할 수 있는 범위를 넘었습니다.",
          feature: "번역·현지화",
          currentTier: "free",
          requiredTier: "pro",
          unlocksWith: ["Pro 플랜", "연결 키 등록"],
          pricingUrl: "/pricing",
          settingsTarget: "환경 설정 > 노아 운영",
        },
      }));
    });

    fireEvent.click(screen.getByRole("button", { name: "연결 키 등록" }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).toBeNull();
    window.removeEventListener("loreguard:open-settings", listener);
  });
});
