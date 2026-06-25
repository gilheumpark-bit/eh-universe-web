// ============================================================
// PART 1 — 타입·상수
// Loreguard IDE 레이아웃 프로필. 패널 폭/접힘/도크 상태를 하나의
// portable profile 로 저장·적용한다. React 의존 0, localStorage 가드 포함.
// ============================================================

import { loadCollapse, saveCollapse, type CollapseMap } from "@/lib/writing-workspace/collapse-state";
import { KEY_PREFIX as PANEL_WIDTH_KEY_PREFIX, saveWidth } from "@/lib/writing-workspace/panel-resize";

export const LAYOUT_PROFILE_STORE_KEY = "noa_loreguard_layout_profiles_v1";
export const ACTIVE_LAYOUT_PROFILE_KEY = "noa_loreguard_active_layout_profile_v1";
export const LAYOUT_PROFILE_APPLIED_EVENT = "loreguard:layout-profile-applied";

export const LOREGUARD_LAYOUT_PANEL_IDS = [
  "project-canvas",
  "world-tools",
  "world-board",
  "character-roster",
  "plot-outline",
  "direction-episodes",
  "direction-review",
  "writing-draft-controls",
  "translate-rail",
  "translate-review-empty",
] as const;

const CHAT_DOCK_KEY = "noa-lg-chatdock";
const TRANSLATE_PANEL_KEY = "noa-lg-tx-panel";
const WORLD_SECTIONS_KEY = "noa-lg-world-sections";

export interface LoreguardLayoutProfile {
  schema: "loreguard-layout-profile/v1";
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  layoutProfileId: string;
  collapsed: CollapseMap;
  panelWidths: Record<string, number>;
  chatDockOpen: Record<string, boolean>;
  translatePanelOpen: boolean | null;
  worldSectionsCollapsed: Record<string, boolean>;
}

export interface LayoutProfileStore {
  schema: "loreguard-layout-profiles/v1";
  profiles: LoreguardLayoutProfile[];
}

// ============================================================
// PART 2 — 내부 가드·정규화
// ============================================================

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function nowId(now: number): string {
  return `lg-layout-${Math.round(now).toString(36)}`;
}

function isFinitePositive(input: unknown): input is number {
  return typeof input === "number" && Number.isFinite(input) && input >= 0;
}

function normalizeBoolMap(input: unknown): Record<string, boolean> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (key && typeof value === "boolean") out[key] = value;
  }
  return out;
}

function normalizeCollapseMap(input: unknown): CollapseMap {
  return normalizeBoolMap(input);
}

function normalizeWidths(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!key) continue;
    const num = typeof value === "string" ? Number(value) : value;
    if (isFinitePositive(num)) out[key] = Math.round(num);
  }
  return out;
}

function normalizeProfile(input: unknown): LoreguardLayoutProfile | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const src = input as Record<string, unknown>;
  const updatedAt = isFinitePositive(src.updatedAt) ? Math.round(src.updatedAt) : Date.now();
  const createdAt = isFinitePositive(src.createdAt) ? Math.round(src.createdAt) : updatedAt;
  const id = typeof src.id === "string" && src.id.trim() ? src.id.trim() : nowId(updatedAt);
  const name = typeof src.name === "string" && src.name.trim() ? src.name.trim().slice(0, 80) : "레이아웃 프리셋";
  const layoutProfileId =
    typeof src.layoutProfileId === "string" && src.layoutProfileId.trim()
      ? src.layoutProfileId.trim()
      : id;
  const translatePanelOpen =
    typeof src.translatePanelOpen === "boolean" ? src.translatePanelOpen : null;

  return {
    schema: "loreguard-layout-profile/v1",
    id,
    name,
    createdAt,
    updatedAt,
    layoutProfileId,
    collapsed: normalizeCollapseMap(src.collapsed),
    panelWidths: normalizeWidths(src.panelWidths),
    chatDockOpen: normalizeBoolMap(src.chatDockOpen),
    translatePanelOpen,
    worldSectionsCollapsed: normalizeBoolMap(src.worldSectionsCollapsed),
  };
}

function readJson(key: string): unknown {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota/private mode */
  }
}

function readStoredWidth(panelId: string): number | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(PANEL_WIDTH_KEY_PREFIX + `loreguard-${panelId}`);
    if (raw === null || raw === "") return null;
    const parsed = Number(raw);
    return isFinitePositive(parsed) ? Math.round(parsed) : null;
  } catch {
    return null;
  }
}

function createFullCollapseSnapshot(): CollapseMap {
  const base = loadCollapse();
  const collapsed: CollapseMap = { ...base };
  for (const panelId of LOREGUARD_LAYOUT_PANEL_IDS) {
    const key = `loreguard:${panelId}`;
    collapsed[key] = base[key] === true;
  }
  return collapsed;
}

// ============================================================
// PART 3 — 프로필 생성·저장·조회
// ============================================================

export function createLayoutProfileSnapshot(name: string, now: number = Date.now()): LoreguardLayoutProfile {
  const panelWidths: Record<string, number> = {};
  for (const panelId of LOREGUARD_LAYOUT_PANEL_IDS) {
    const width = readStoredWidth(panelId);
    if (width !== null) panelWidths[panelId] = width;
  }

  const translateRaw = hasStorage() ? window.localStorage.getItem(TRANSLATE_PANEL_KEY) : null;
  const profileId = nowId(now);

  return {
    schema: "loreguard-layout-profile/v1",
    id: profileId,
    name: name.trim().slice(0, 80) || "레이아웃 프리셋",
    createdAt: now,
    updatedAt: now,
    layoutProfileId: profileId,
    collapsed: createFullCollapseSnapshot(),
    panelWidths,
    chatDockOpen: normalizeBoolMap(readJson(CHAT_DOCK_KEY)),
    translatePanelOpen: translateRaw === null ? null : translateRaw !== "0",
    worldSectionsCollapsed: normalizeBoolMap(readJson(WORLD_SECTIONS_KEY)),
  };
}

export function listLayoutProfiles(): LoreguardLayoutProfile[] {
  const raw = readJson(LAYOUT_PROFILE_STORE_KEY);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const profiles = (raw as { profiles?: unknown }).profiles;
  if (!Array.isArray(profiles)) return [];
  return profiles
    .map(normalizeProfile)
    .filter((profile): profile is LoreguardLayoutProfile => profile !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveLayoutProfile(profile: LoreguardLayoutProfile): LoreguardLayoutProfile {
  const safe = normalizeProfile(profile) ?? createLayoutProfileSnapshot(profile.name);
  const profiles = listLayoutProfiles();
  const next = [safe, ...profiles.filter((item) => item.id !== safe.id)].slice(0, 12);
  writeJson(LAYOUT_PROFILE_STORE_KEY, {
    schema: "loreguard-layout-profiles/v1",
    profiles: next,
  } satisfies LayoutProfileStore);
  return safe;
}

export function deleteLayoutProfile(id: string): void {
  const next = listLayoutProfiles().filter((profile) => profile.id !== id);
  writeJson(LAYOUT_PROFILE_STORE_KEY, {
    schema: "loreguard-layout-profiles/v1",
    profiles: next,
  } satisfies LayoutProfileStore);
  if (getActiveLayoutProfileId() === id) setActiveLayoutProfileId(null);
}

export function getActiveLayoutProfileId(): string | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_LAYOUT_PROFILE_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function setActiveLayoutProfileId(id: string | null): void {
  if (!hasStorage()) return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_LAYOUT_PROFILE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_LAYOUT_PROFILE_KEY);
  } catch {
    /* noop */
  }
}

// ============================================================
// PART 4 — 적용·내보내기·가져오기
// ============================================================

export function applyLayoutProfile(profile: LoreguardLayoutProfile): LoreguardLayoutProfile {
  const safe = normalizeProfile(profile);
  if (!safe) throw new Error("Invalid layout profile");

  saveCollapse({ ...loadCollapse(), ...safe.collapsed });
  for (const [panelId, width] of Object.entries(safe.panelWidths)) {
    saveWidth(`loreguard-${panelId}`, width);
  }
  writeJson(CHAT_DOCK_KEY, safe.chatDockOpen);
  writeJson(WORLD_SECTIONS_KEY, safe.worldSectionsCollapsed);
  if (safe.translatePanelOpen !== null && hasStorage()) {
    try {
      window.localStorage.setItem(TRANSLATE_PANEL_KEY, safe.translatePanelOpen ? "1" : "0");
    } catch {
      /* noop */
    }
  }
  setActiveLayoutProfileId(safe.id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LAYOUT_PROFILE_APPLIED_EVENT, { detail: safe }));
  }
  return safe;
}

export function serializeLayoutProfile(profile: LoreguardLayoutProfile): string {
  const safe = normalizeProfile(profile);
  if (!safe) throw new Error("Invalid layout profile");
  return JSON.stringify(safe, null, 2);
}

export function parseLayoutProfile(text: string): LoreguardLayoutProfile {
  try {
    const parsed = JSON.parse(text);
    const safe = normalizeProfile(parsed);
    if (!safe) throw new Error("Invalid layout profile");
    return safe;
  } catch {
    throw new Error("Invalid layout profile");
  }
}
