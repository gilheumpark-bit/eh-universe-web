import {
  ACTIVE_LAYOUT_PROFILE_KEY,
  LAYOUT_PROFILE_APPLIED_EVENT,
  LAYOUT_PROFILE_STORE_KEY,
  applyLayoutProfile,
  createLayoutProfileSnapshot,
  deleteLayoutProfile,
  listLayoutProfiles,
  parseLayoutProfile,
  saveLayoutProfile,
  serializeLayoutProfile,
} from "../layout-profile";
import { KEY as COLLAPSE_KEY } from "@/lib/writing-workspace/collapse-state";
import { KEY_PREFIX as PANEL_WIDTH_KEY_PREFIX } from "@/lib/writing-workspace/panel-resize";

beforeEach(() => {
  window.localStorage.clear();
});

describe("loreguard layout profile", () => {
  it("captures current panel state into a portable profile", () => {
    window.localStorage.setItem(
      COLLAPSE_KEY,
      JSON.stringify({ "loreguard:project-canvas": true, unrelated: true }),
    );
    window.localStorage.setItem(`${PANEL_WIDTH_KEY_PREFIX}loreguard-project-canvas`, "456");
    window.localStorage.setItem("noa-lg-chatdock", JSON.stringify({ plot: true }));
    window.localStorage.setItem("noa-lg-tx-panel", "0");
    window.localStorage.setItem("noa-lg-world-sections", JSON.stringify({ 1: true }));

    const profile = createLayoutProfileSnapshot("집필 집중", 1000);

    expect(profile.name).toBe("집필 집중");
    expect(profile.layoutProfileId).toBe(profile.id);
    expect(profile.collapsed["loreguard:project-canvas"]).toBe(true);
    expect(profile.collapsed["loreguard:world-board"]).toBe(false);
    expect(profile.panelWidths["project-canvas"]).toBe(456);
    expect(profile.chatDockOpen.plot).toBe(true);
    expect(profile.translatePanelOpen).toBe(false);
    expect(profile.worldSectionsCollapsed["1"]).toBe(true);
  });

  it("saves, lists, applies, and deletes profiles", () => {
    const eventSpy = jest.fn();
    window.addEventListener(LAYOUT_PROFILE_APPLIED_EVENT, eventSpy);
    const profile = saveLayoutProfile({
      ...createLayoutProfileSnapshot("검수 배치", 2000),
      collapsed: { "loreguard:world-board": true },
      panelWidths: { "world-board": 520 },
      chatDockOpen: { direction: true },
      translatePanelOpen: true,
      worldSectionsCollapsed: { 2: true },
    });

    expect(listLayoutProfiles()).toHaveLength(1);
    applyLayoutProfile(profile);

    expect(window.localStorage.getItem(ACTIVE_LAYOUT_PROFILE_KEY)).toBe(profile.id);
    expect(window.localStorage.getItem(`${PANEL_WIDTH_KEY_PREFIX}loreguard-world-board`)).toBe("520");
    expect(JSON.parse(window.localStorage.getItem(COLLAPSE_KEY) ?? "{}")["loreguard:world-board"]).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("noa-lg-chatdock") ?? "{}").direction).toBe(true);
    expect(window.localStorage.getItem("noa-lg-tx-panel")).toBe("1");
    expect(eventSpy).toHaveBeenCalledTimes(1);

    deleteLayoutProfile(profile.id);
    expect(listLayoutProfiles()).toHaveLength(0);
    expect(window.localStorage.getItem(ACTIVE_LAYOUT_PROFILE_KEY)).toBeNull();
    window.removeEventListener(LAYOUT_PROFILE_APPLIED_EVENT, eventSpy);
  });

  it("restores explicitly open panels over a currently collapsed state", () => {
    const profile = saveLayoutProfile({
      ...createLayoutProfileSnapshot("열림 복원", 2500),
      collapsed: { "loreguard:project-canvas": false },
    });

    window.localStorage.setItem(
      COLLAPSE_KEY,
      JSON.stringify({ "loreguard:project-canvas": true }),
    );

    applyLayoutProfile(profile);

    expect(JSON.parse(window.localStorage.getItem(COLLAPSE_KEY) ?? "{}")["loreguard:project-canvas"]).toBe(false);
  });

  it("serializes and parses a profile safely", () => {
    const profile = createLayoutProfileSnapshot("내보내기", 3000);
    const parsed = parseLayoutProfile(serializeLayoutProfile(profile));

    expect(parsed.name).toBe("내보내기");
    expect(() => parseLayoutProfile("{broken")).toThrow("Invalid layout profile");
    expect(window.localStorage.getItem(LAYOUT_PROFILE_STORE_KEY)).toBeNull();
  });
});
