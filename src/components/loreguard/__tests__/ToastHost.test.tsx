/**
 * ToastHost (F2) — Sonner식 capped 토스트 스택 회귀 테스트
 *  - noa:toast / noa:alert(레거시 detail 이형) 수신 계약
 *  - 최대 3개 표시 + 초과 큐 승격
 *  - auto-dismiss (success·info 4s / error 8s / duration override)
 *  - hover 일시정지 · 수동 close
 *  - a11y: error = role alert(assertive) / 그 외 role status(polite)
 */
import "@testing-library/jest-dom";
import { render, screen, act, fireEvent } from "@testing-library/react";
import ToastHost from "../ToastHost";

const dispatchToast = (detail: Record<string, unknown>) =>
  act(() => {
    window.dispatchEvent(new CustomEvent("noa:toast", { detail }));
  });

const dispatchAlert = (detail: Record<string, unknown>) =>
  act(() => {
    window.dispatchEvent(new CustomEvent("noa:alert", { detail }));
  });

const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ToastHost — noa:toast 계약", () => {
  it("success 토스트: role=status polite, 4s 후 자동 dismiss", () => {
    render(<ToastHost />);
    dispatchToast({ message: "저장되었습니다", variant: "success" });

    const el = screen.getByText("저장되었습니다").closest(".noa-toast");
    expect(el).not.toBeNull();
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-live", "polite");
    expect(el).toHaveClass("success");

    advance(3999);
    expect(screen.getByText("저장되었습니다")).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText("저장되었습니다")).toBeNull();
  });

  it("error 토스트: role=alert assertive, 8s 유지", () => {
    render(<ToastHost />);
    dispatchToast({ message: "실패했습니다", variant: "error" });

    const el = screen.getByText("실패했습니다").closest(".noa-toast");
    expect(el).toHaveAttribute("role", "alert");
    expect(el).toHaveAttribute("aria-live", "assertive");

    advance(7999);
    expect(screen.getByText("실패했습니다")).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText("실패했습니다")).toBeNull();
  });

  it("detail.duration override + variant 미지정 시 info", () => {
    render(<ToastHost />);
    dispatchToast({ message: "커스텀", duration: 1000 });

    const el = screen.getByText("커스텀").closest(".noa-toast");
    expect(el).toHaveClass("info");
    advance(1000);
    expect(screen.queryByText("커스텀")).toBeNull();
  });

  it("빈 message 는 무시", () => {
    const { container } = render(<ToastHost />);
    dispatchToast({ message: "   " });
    dispatchToast({});
    expect(container.querySelectorAll(".noa-toast")).toHaveLength(0);
  });
});

describe("ToastHost — 최대 3개 + 큐 승격", () => {
  it("4번째는 큐 대기, 자리가 나면 승격", () => {
    const { container } = render(<ToastHost />);
    dispatchToast({ message: "t1", variant: "info" });
    dispatchToast({ message: "t2", variant: "info" });
    dispatchToast({ message: "t3", variant: "info" });
    dispatchToast({ message: "t4", variant: "info" });

    expect(container.querySelectorAll(".noa-toast")).toHaveLength(3);
    expect(screen.queryByText("t4")).toBeNull();

    advance(4000); // t1~t3 동시 만료 → t4 승격
    expect(screen.getByText("t4")).toBeInTheDocument();
    expect(container.querySelectorAll(".noa-toast")).toHaveLength(1);
  });
});

describe("ToastHost — noa:alert 레거시 수신 (발신부 불변)", () => {
  it("detail.message → error 토스트 (스펙 기본)", () => {
    render(<ToastHost />);
    dispatchAlert({ message: "저장 실패", variant: "warning" });
    const el = screen.getByText("저장 실패").closest(".noa-toast");
    expect(el).toHaveClass("error");
    expect(el).toHaveAttribute("role", "alert");
  });

  it("{ msg, kind } 이형도 흡수", () => {
    render(<ToastHost />);
    dispatchAlert({ msg: "활성 세션이 없습니다.", kind: "warning" });
    expect(screen.getByText("활성 세션이 없습니다.")).toBeInTheDocument();
  });

  it("variant info/success 는 보존 (성공 알림이 error 로 둔갑 금지)", () => {
    render(<ToastHost />);
    dispatchAlert({ message: "저장 완료", variant: "info" });
    const el = screen.getByText("저장 완료").closest(".noa-toast");
    expect(el).toHaveClass("info");
    expect(el).toHaveAttribute("role", "status");
  });
});

describe("ToastHost — 상호작용", () => {
  it("close 버튼 즉시 dismiss", () => {
    render(<ToastHost language="KO" />);
    dispatchToast({ message: "닫기 테스트", variant: "info" });
    fireEvent.click(screen.getByRole("button", { name: "알림 닫기" }));
    expect(screen.queryByText("닫기 테스트")).toBeNull();
  });

  it("hover 중 auto-dismiss 일시정지, 이탈 후 잔여 시간으로 재개", () => {
    const { container } = render(<ToastHost />);
    dispatchToast({ message: "호버 유지", variant: "info" }); // 4s

    const host = container.querySelector(".noa-toast-host")!;
    fireEvent.mouseEnter(host);
    advance(10000); // 정지 상태 — 만료되지 않아야 함
    expect(screen.getByText("호버 유지")).toBeInTheDocument();

    fireEvent.mouseLeave(host);
    advance(4000); // 잔여 시간(≈4s) 경과 → dismiss
    expect(screen.queryByText("호버 유지")).toBeNull();
  });

  it("언마운트 시 타이머 cleanup (act 경고·leak 없음)", () => {
    const { unmount } = render(<ToastHost />);
    dispatchToast({ message: "cleanup", variant: "error" });
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
