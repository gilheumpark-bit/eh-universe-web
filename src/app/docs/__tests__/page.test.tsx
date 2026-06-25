import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/Header", () => ({
  __esModule: true,
  default: () => <header data-testid="header-mock" />,
}));

jest.mock("@/lib/LangContext", () => ({
  useLang: () => ({ lang: "ko" }),
  L2A: (map: { ko: unknown; en: unknown }, lang: string) => (lang === "en" ? map.en : map.ko),
}));

jest.mock("@/lib/i18n", () => ({
  L4: (_lang: string, value: { ko: string; en: string }) => value.ko,
}));

class IntersectionObserverMock {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

describe("DocsPage", () => {
  beforeAll(() => {
    Object.defineProperty(global, "IntersectionObserver", {
      writable: true,
      value: IntersectionObserverMock,
    });
  });

  it("현재 제품 기준의 공개 문구로 렌더링한다", () => {
    const DocsPage = require("../page").default;
    const { container } = render(<DocsPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("기준일: 2026-06-15");
    expect(text).toContain("질문형 기준 잡기");
    expect(text).toContain("연결 키");
    expect(text).toContain("출고 패키지");
    expect(text).not.toMatch(/노아 설정 가이드|작품 기준판|방향키|BYOK|API 키|AI 생성|AI 채팅|Gemini|Code Studio|Network|Archive/);
  });
});
