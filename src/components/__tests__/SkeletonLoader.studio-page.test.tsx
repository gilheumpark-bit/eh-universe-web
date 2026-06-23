import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StudioPageSkeleton } from "../SkeletonLoader";

describe("StudioPageSkeleton", () => {
  it("uses the current Loreguard shell shape during refresh", () => {
    const { container } = render(<StudioPageSkeleton />);

    expect(screen.getByText("Loreguard")).toBeInTheDocument();
    expect(screen.getByText("작품을 정리하고")).toBeInTheDocument();
    expect(screen.getByText("출고까지 이어갑니다")).toBeInTheDocument();
    expect(screen.queryByText("스튜디오 초기화 중...")).not.toBeInTheDocument();
    expect(container.querySelector(".border-r")).toBeNull();
  });
});
