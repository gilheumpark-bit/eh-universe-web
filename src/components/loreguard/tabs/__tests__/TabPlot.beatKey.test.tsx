// ============================================================
// [W2-plot #9] TabPlot — addBeat 충돌 방어 + 안정 고유 key 회귀 테스트
// ============================================================
//
// 대상 버그(high #9): addBeat 가 setConfig 안에서 nextEp=max+1 후 무조건 append.
//   - 빠른 2회 클릭/stale prev → 같은 episode 2건 → key=sheet.episode 중복
//     → React reconciliation 깨짐 → 편집/삭제 교차적용.
// 수정: ① EpisodeSceneSheet.id (crypto.randomUUID) = React key (episode 독립),
//       ② addBeat/adopt 충돌 방어(빈 episode 슬롯 보장),
//       ③ 구 데이터(id 없음) fallback key 고유성 보강.
//
// 본 테스트는 실제 TabPlot 을 렌더해 위 3개 invariant 를 검증한다(동시성/왕복).
// StudioContext 등 무거운 의존은 mock — 테스트 대상은 TabPlot 내부 로직.

import "@testing-library/jest-dom";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import type { StoryConfig, ChatSession, EpisodeSceneSheet } from "@/lib/studio-types";

// ----- 무거운/무관 의존 mock -----
// 채팅 도크: children 만 그대로 렌더(레이아웃 래퍼).
jest.mock("@/components/loreguard/ChatCanvasDock", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  extractJsonBlocks: () => [],
}));
// next/dynamic: 흐름 그래프(RelationGraph)는 본 테스트에서 진입하지 않음 → 빈 컴포넌트.
jest.mock("next/dynamic", () => () => () => null);
jest.mock("@/components/studio/LoadingSkeleton", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/lib/ai-providers", () => ({
  getActiveProvider: () => "anthropic",
  getApiKey: () => "",
}));
jest.mock("@/lib/browser/ai-cache", () => ({
  getCachedResponse: jest.fn().mockResolvedValue(null),
  cacheResponse: jest.fn(),
}));
jest.mock("@/lib/ai/writing-agent-registry", () => ({
  GUARDS: { ipBrand: "", jsonOnly: "" },
  STRUCTURED_PLOT_GUARD_IDS: { ipBrand: "ipBrand", jsonOnly: "jsonOnly" },
}));
jest.mock("@/lib/ai/noa-identity", () => ({
  buildNoaSystemHeader: () => "",
}));
jest.mock("@/lib/noa/block-notice", () => ({
  checkBlockedJson: () => null,
}));
jest.mock("@/lib/firebase", () => ({
  lazyFirebaseAuth: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/hooks/useCreativeProcessAutoTrigger", () => ({
  markExplicitCreativeLog: jest.fn(),
}));

// ----- StudioContext mock — stateful setConfig (실제 reducer 동작 재현) -----
let mockConfig: StoryConfig;
const setConfigImpl = jest.fn((next: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
  mockConfig = typeof next === "function" ? (next as (p: StoryConfig) => StoryConfig)(mockConfig) : next;
  // 세션 객체 참조 갱신 — 리렌더 트리거를 위해 useStudio 가 새 config 를 반환하게 함.
  mockSession = { ...mockSession, config: mockConfig } as ChatSession;
  // 등록된 리렌더 콜백 호출(테스트 하네스가 주입).
  rerenderHook?.();
});
let mockSession: ChatSession;
let rerenderHook: (() => void) | null = null;

jest.mock("@/app/studio/StudioContext", () => ({
  useStudio: () => ({
    currentSession: mockSession,
    currentProject: { name: "테스트 프로젝트" },
    setConfig: setConfigImpl,
    handleTabChange: jest.fn(),
    createNewSession: jest.fn(),
    openQuickStart: jest.fn(),
    hasAiAccess: true,
    setShowApiKeyModal: jest.fn(),
  }),
}));

// mock 선언 후 import (jest.mock 은 호이스팅되지만 명시적 순서 유지).
import TabPlot from "@/components/loreguard/tabs/TabPlot";

function makeConfig(sheets: EpisodeSceneSheet[]): StoryConfig {
  return { episodeSceneSheets: sheets } as unknown as StoryConfig;
}

function seed(sheets: EpisodeSceneSheet[]) {
  mockConfig = makeConfig(sheets);
  mockSession = { id: "s1", config: mockConfig } as unknown as ChatSession;
}

// 외부에서 강제 리렌더할 수 있는 wrapper — setConfig 후 UI 동기화.
function renderTabPlot() {
  let force: () => void = () => {};
  function Harness() {
    const [, setTick] = (jest.requireActual("react") as typeof import("react")).useState(0);
    force = () => setTick((t) => t + 1);
    rerenderHook = force;
    return <TabPlot />;
  }
  const utils = render(<Harness />);
  return { ...utils, force };
}

describe("[W2-plot #9] TabPlot addBeat 충돌 방어 + 안정 key", () => {
  beforeEach(() => {
    setConfigImpl.mockClear();
    rerenderHook = null;
  });

  it("빈 보드에서 비트 추가 1회 — episode=1, stable id 부여", () => {
    seed([]);
    renderTabPlot();
    const addBtns = screen.getAllByRole("button", { name: "비트 추가" });
    act(() => {
      fireEvent.click(addBtns[0]);
    });
    expect(mockConfig.episodeSceneSheets).toHaveLength(1);
    const s = mockConfig.episodeSceneSheets![0];
    expect(s.episode).toBe(1);
    expect(typeof s.id).toBe("string");
    expect(s.id!.length).toBeGreaterThan(0);
  });

  it("동시성: 같은 prev 기준 연속 2회 클릭 — episode 중복 없음 + id 모두 고유", () => {
    seed([]);
    renderTabPlot();
    const addBtns = screen.getAllByRole("button", { name: "비트 추가" });
    // 2회 클릭. setConfig 가 prev 기준이므로 reducer 가 매번 최신 list 를 본다.
    act(() => {
      fireEvent.click(addBtns[0]);
      fireEvent.click(addBtns[0]);
    });
    const list = mockConfig.episodeSceneSheets!;
    expect(list).toHaveLength(2);
    const episodes = list.map((s) => s.episode);
    expect(new Set(episodes).size).toBe(2); // 중복 episode 없음
    const ids = list.map((s) => s.id);
    expect(new Set(ids).size).toBe(2); // 모든 id 고유
    expect(ids.every((id) => typeof id === "string" && id!.length > 0)).toBe(true);
  });

  it("충돌 방어: 잔존 중복 episode 데이터에서도 addBeat 가 빈 슬롯으로 bump", () => {
    // 버그 #9 잔존 상태 모사 — episode=2 가 2건 (id 없음, 구 데이터).
    seed([
      { episode: 1, title: "A", lastUpdate: 1 },
      { episode: 2, title: "B", lastUpdate: 2 },
      { episode: 2, title: "C(중복)", lastUpdate: 3 },
    ]);
    renderTabPlot();
    const addBtns = screen.getAllByRole("button", { name: "비트 추가" });
    act(() => {
      fireEvent.click(addBtns[0]);
    });
    const list = mockConfig.episodeSceneSheets!;
    expect(list).toHaveLength(4);
    const added = list[list.length - 1];
    // max(1,2,2)=2 → nextEp 시작 3, taken{1,2} → 3 사용. 중복 미생성.
    expect(added.episode).toBe(3);
    expect(typeof added.id).toBe("string");
  });

  it("왕복/구 데이터: id 없는 중복 episode 도 React key 충돌 없이 렌더(2개 카드)", () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    seed([
      { episode: 5, title: "구비트-1", lastUpdate: 1 },
      { episode: 5, title: "구비트-2", lastUpdate: 2 },
    ]);
    renderTabPlot();
    // 두 비트 모두 렌더 (제목 표시)
    expect(screen.getByText("구비트-1")).toBeInTheDocument();
    expect(screen.getByText("구비트-2")).toBeInTheDocument();
    // React 중복 key 경고가 발생하지 않아야 함.
    const dupKeyWarning = errSpy.mock.calls.some((args) =>
      args.some((a) => typeof a === "string" && a.includes("same key")),
    );
    expect(dupKeyWarning).toBe(false);
    errSpy.mockRestore();
  });

  it("편집/삭제가 정확한 비트에 적용 — 첫 비트 삭제 시 그 episode 만 제거", () => {
    seed([
      { episode: 1, title: "첫째", lastUpdate: 1 },
      { episode: 2, title: "둘째", lastUpdate: 2 },
    ]);
    renderTabPlot();
    // "첫째" 카드의 삭제 버튼 클릭.
    const firstCard = screen.getByText("첫째").closest(".pl-beat") as HTMLElement;
    const delBtn = within(firstCard).getByRole("button", { name: "비트 삭제" });
    act(() => {
      fireEvent.click(delBtn);
    });
    const list = mockConfig.episodeSceneSheets!;
    expect(list).toHaveLength(1);
    expect(list[0].episode).toBe(2);
    expect(list[0].title).toBe("둘째");
  });
});
