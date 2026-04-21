"use client";

// ============================================================
// UnifiedSettingsContext — 전체 스튜디오 공통 설정 통합 Provider
// 테마(밤/낮), 언어, API 키 슬롯을 한 곳에서 관리
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ── 테마 ──
export type ThemeMode = "dark" | "light";

// ── API 키 슬롯 (코드 스튜디오 기반) ──
export type SlotRole = "default" | "coder" | "reviewer" | "tester" | "security" | "architect" | "debugger" | "documenter" | "custom";

export interface APIKeySlot {
  id: string;
  provider: string;
  apiKey: string;
  model: string;
  role: SlotRole;
  customPerspective?: string;
  label: string;
  enabled: boolean;
}

// ── Context Type ──
interface UnifiedSettingsContextType {
  // Theme
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;

  // Blue-light filter (시각 편의 — 눈 피로 감소용 세피아/밝기 저감)
  blueLightFilter: boolean;
  toggleBlueLightFilter: () => void;
  setBlueLightFilter: (on: boolean) => void;

  // API Key Slots
  slots: APIKeySlot[];
  addSlot: (slot: Omit<APIKeySlot, "id">) => void;
  updateSlot: (id: string, updates: Partial<APIKeySlot>) => void;
  removeSlot: (id: string) => void;
  toggleSlot: (id: string) => void;

  // Helpers
  /** 특정 provider의 활성 슬롯에서 키 가져오기 (소설/번역용 호환) */
  getKeyForProvider: (provider: string) => string;
  /** 특정 provider의 활성 슬롯에서 모델 가져오기 */
  getModelForProvider: (provider: string) => string;
  /** 활성 슬롯 목록 */
  enabledSlots: APIKeySlot[];
}

const UnifiedSettingsContext = createContext<UnifiedSettingsContextType | null>(null);

// ── Storage Keys ──
const THEME_KEY = "eh-theme";
const SLOTS_KEY = "eh-api-key-slots";
const BLUE_LIGHT_KEY = "noa_blue_light_filter";

// ── Storage Helpers ──
function loadTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  // 마이그레이션: 기존 noa_theme_level
  const legacy = localStorage.getItem("noa_theme_level");
  if (legacy === "0" || legacy === "1") return "dark";
  if (legacy === "2" || legacy === "3") return "light";
  return "light";
}

/** [C] SSR 안전 블루라이트 로드 — window 미정의 시 기본 false */
function loadBlueLightFilter(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(BLUE_LIGHT_KEY) === "1";
  } catch {
    return false;
  }
}

function loadSlots(): APIKeySlot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (!raw) {
      // 마이그레이션: 기존 noa_*_key → 슬롯으로 변환
      return migrateOldKeys();
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** 기존 소설/번역 스튜디오의 개별 키를 슬롯 형식으로 마이그레이션 */
function migrateOldKeys(): APIKeySlot[] {
  const slots: APIKeySlot[] = [];
  const providerMap: Record<string, { name: string; model: string }> = {
    gemini: { name: "Gemini", model: "gemini-2.5-flash" },
    openai: { name: "OpenAI", model: "gpt-4.1" },
    claude: { name: "Claude", model: "claude-sonnet-4-6" },
    groq: { name: "Groq", model: "llama-3.3-70b-versatile" },
    mistral: { name: "Mistral", model: "mistral-large-latest" },
  };

  for (const [pid, info] of Object.entries(providerMap)) {
    const key = localStorage.getItem(`noa_${pid}_key`) || localStorage.getItem(`noa_api_key_${pid}`);
    if (key && key.trim()) {
      slots.push({
        id: crypto.randomUUID(),
        provider: pid,
        apiKey: key.trim(),
        model: info.model,
        role: "default",
        label: `${info.name} (마이그레이션)`,
        enabled: true,
      });
    }
  }

  if (slots.length > 0) {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  }
  return slots;
}

function saveSlots(slots: APIKeySlot[]): void {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

// ── Provider ──
export function UnifiedSettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(loadTheme);
  const [slots, setSlots] = useState<APIKeySlot[]>(loadSlots);
  const [blueLightFilter, setBlueLightFilterState] = useState<boolean>(loadBlueLightFilter);

  // ── Theme Effects ──
  // Tailwind CSS 4 inlines oklch colors from @theme, ignoring CSS variable overrides.
  // Must set variables via JS inline style to guarantee correct light-mode colors.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem("noa_theme_level", theme === "dark" ? "0" : "1");
    const root = document.documentElement;
    if (theme === "light") {
      const vars: Record<string, string> = {
        "--color-bg-primary": "#FAFAF8",
        "--color-bg-secondary": "#F0F0EC",
        "--color-bg-tertiary": "#E4E4E0",
        "--color-text-primary": "#111111",
        "--color-text-secondary": "#333333",
        "--color-text-tertiary": "#555550",
        "--color-border": "#CDCDC5",
        // [C] 라이트 accent — globals.css와 동기화 (AA 5+ 확보)
        "--color-accent-purple": "#4a3d7a",
        "--color-accent-amber": "#6f5318",
        "--color-accent-red": "#a04938",
        "--color-accent-green": "#1a6e58",
        "--color-accent-blue": "#3e5c7e",
        "--color-surface-strong": "rgba(250,250,248,0.97)",
        "--color-surface-soft": "rgba(240,240,236,0.88)",
      };
      for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    } else {
      // 다크 모드: @theme 기본값이 다크이지만, Tailwind CSS 4 @layer theme specificity 문제로
      // StudioShell의 data-theme wrapper가 라이트 CSS를 잡을 수 있으므로 JS inline으로 강제 설정
      const darkVars: Record<string, string> = {
        "--color-bg-primary": "#1c1a17",
        "--color-bg-secondary": "#252320",
        "--color-bg-tertiary": "#2e2b26",
        "--color-text-primary": "#f2ede4",
        "--color-text-secondary": "#aca292",
        "--color-text-tertiary": "#7b7367",
        "--color-border": "#3d3830",
        // [C] 다크 accent — globals.css @theme와 동기화 (axe 1.79~2.49 → 3.0+)
        "--color-accent-purple": "#a08573",
        "--color-accent-amber": "#caa572",
        "--color-accent-red": "#c4786d",
        "--color-accent-green": "#6aaa90",
        "--color-accent-blue": "#8898ad",
        "--color-surface-strong": "rgba(37,35,32,0.94)",
        "--color-surface-soft": "rgba(28,26,23,0.78)",
      };
      for (const [k, v] of Object.entries(darkVars)) root.style.setProperty(k, v);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  // ── Blue-Light Filter Effect ──
  // [C] SSR 가드 + localStorage quota 예외 처리
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (blueLightFilter) {
      root.setAttribute("data-blue-light", "on");
    } else {
      root.removeAttribute("data-blue-light");
    }
    try {
      localStorage.setItem(BLUE_LIGHT_KEY, blueLightFilter ? "1" : "0");
    } catch {
      // quota or disabled storage — silent
    }
  }, [blueLightFilter]);

  const toggleBlueLightFilter = useCallback(() => {
    setBlueLightFilterState((prev) => !prev);
  }, []);

  const setBlueLightFilter = useCallback((on: boolean) => {
    setBlueLightFilterState(on);
  }, []);

  // ── 초기 로드 시 슬롯 → ai-providers 동기화 ──
  useEffect(() => {
    if (slots.length > 0) syncToLegacyKeys(slots);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 초기 1회만
  }, []);

  // ── Slot CRUD ──
  const persist = useCallback((next: APIKeySlot[]) => {
    setSlots(next);
    saveSlots(next);
    // 기존 ai-providers.ts 호환: provider별 첫 번째 활성 키를 noa_*_key에도 동기화
    syncToLegacyKeys(next);
  }, []);

  const addSlot = useCallback((slot: Omit<APIKeySlot, "id">) => {
    persist([...slots, { ...slot, id: crypto.randomUUID() }]);
  }, [slots, persist]);

  const updateSlot = useCallback((id: string, updates: Partial<APIKeySlot>) => {
    persist(slots.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, [slots, persist]);

  const removeSlot = useCallback((id: string) => {
    persist(slots.filter((s) => s.id !== id));
  }, [slots, persist]);

  const toggleSlot = useCallback((id: string) => {
    persist(slots.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }, [slots, persist]);

  // ── Helpers ──
  const enabledSlots = slots.filter((s) => s.enabled && s.apiKey.trim().length > 0);

  const getKeyForProvider = useCallback(
    (provider: string) => {
      const slot = enabledSlots.find((s) => s.provider === provider);
      return slot?.apiKey || "";
    },
    [enabledSlots],
  );

  const getModelForProvider = useCallback(
    (provider: string) => {
      const slot = enabledSlots.find((s) => s.provider === provider);
      return slot?.model || "";
    },
    [enabledSlots],
  );

  return (
    <UnifiedSettingsContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        blueLightFilter,
        toggleBlueLightFilter,
        setBlueLightFilter,
        slots,
        addSlot,
        updateSlot,
        removeSlot,
        toggleSlot,
        getKeyForProvider,
        getModelForProvider,
        enabledSlots,
      }}
    >
      {children}
    </UnifiedSettingsContext.Provider>
  );
}

export function useUnifiedSettings() {
  const ctx = useContext(UnifiedSettingsContext);
  if (!ctx) throw new Error("useUnifiedSettings must be used within UnifiedSettingsProvider");
  return ctx;
}

// ── Legacy Sync (동기) ──
/** ai-providers.ts의 setApiKey/setActiveProvider를 동기 호출하여 키 즉시 반영 */
function syncToLegacyKeys(slots: APIKeySlot[]): void {
  if (typeof window === 'undefined') return;
  try {
    // 동기 import — 이미 같은 번들에 포함되어 있으므로 circular dependency 아님
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setApiKey, setActiveProvider, setActiveModel } = require('@/lib/ai-providers');
    const providers = ["gemini", "openai", "claude", "groq", "mistral", "ollama", "lmstudio"] as const;
    let firstActiveProvider: string | null = null;
    let firstActiveModel: string | null = null;
    for (const pid of providers) {
      const activeSlot = slots.find((s) => s.provider === pid && s.enabled && s.apiKey.trim());
      if (activeSlot) {
        setApiKey(pid, activeSlot.apiKey);
        if (!firstActiveProvider) {
          firstActiveProvider = pid;
          firstActiveModel = activeSlot.model;
        }
      } else {
        setApiKey(pid, '');
      }
    }
    if (firstActiveProvider) {
      setActiveProvider(firstActiveProvider as typeof providers[number]);
      if (firstActiveModel) setActiveModel(firstActiveModel);
    }
  } catch {
    // 번들링 문제 시 폴백 — 비동기 import
    import('@/lib/ai-providers').then(({ setApiKey, setActiveProvider, setActiveModel }) => {
      const providers = ["gemini", "openai", "claude", "groq", "mistral", "ollama", "lmstudio"] as const;
      let first: string | null = null;
      let firstModel: string | null = null;
      for (const pid of providers) {
        const s = slots.find((sl) => sl.provider === pid && sl.enabled && sl.apiKey.trim());
        if (s) { setApiKey(pid, s.apiKey); if (!first) { first = pid; firstModel = s.model; } }
        else { setApiKey(pid, ''); }
      }
      if (first) {
        setActiveProvider(first as typeof providers[number]);
        if (firstModel) setActiveModel(firstModel);
      }
    }).catch(() => {});
  }
}
