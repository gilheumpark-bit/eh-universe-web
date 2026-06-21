import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import RecoveryMounts from "../RecoveryMounts";
import type { UseMultiTabResult } from "@/hooks/useMultiTab";

const baseMultiTab = (
  overrides: Partial<UseMultiTabResult> = {},
): UseMultiTabResult => ({
  isLeader: false,
  leaderTabId: "leader-tab-123456",
  tabId: "follower-tab-000001",
  followerCount: -1,
  lastLeaderChange: 0,
  transport: "broadcast",
  conflicts: [],
  requestPromotion: jest.fn().mockResolvedValue(true),
  clearConflicts: jest.fn(),
  ...overrides,
});

describe("RecoveryMounts — Loreguard 멀티탭 노출 계약", () => {
  it("평상시 follower 상태에서는 저장 동기화 대기 배너를 노출하지 않는다", () => {
    render(<RecoveryMounts multiTab={baseMultiTab()} language="KO" />);

    expect(screen.getByTestId("loreguard-recovery-mounts")).toBeInTheDocument();
    expect(screen.queryByTestId("multi-tab-banner")).toBeNull();
    expect(screen.queryByText("저장 동기화 대기")).toBeNull();
    expect(screen.queryByText(/이 창에서 계속/)).toBeNull();
  });

  it("동시 편집 충돌이 있을 때만 상단 충돌 배너를 표시한다", () => {
    render(
      <RecoveryMounts
        language="KO"
        multiTab={baseMultiTab({
          isLeader: true,
          followerCount: 0,
          conflicts: [
            {
              id: "conflict-1",
              detectedAt: 0,
              reason: "hlc-concurrent-save",
              localClock: { physical: 1, logical: 0, nodeId: "local" },
              remoteClock: { physical: 1, logical: 0, nodeId: "remote" },
              detectorTabId: "local",
              remoteTabId: "remote",
              projectId: "project-1",
            },
          ],
        })}
      />,
    );

    const banner = screen.getByTestId("multi-tab-banner");
    expect(banner).toHaveAttribute("data-variant", "conflict-only");
    expect(banner.textContent).toMatch(/동시 편집 1건 감지/);
  });
});
