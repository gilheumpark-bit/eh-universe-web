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

  // ── Theme Effects ──
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    // 기존 훅 호환: noa_theme_level도 동기화
    localStorage.setItem("noa_theme_level", theme === "dark" ? "0" : "1");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
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

// ── Legacy Sync ──
/** 기존 ai-providers.ts가 읽는 noa_*_key에 슬롯 데이터 동기화 */
function syncToLegacyKeys(slots: APIKeySlot[]): void {
  const providers = ["gemini", "openai", "claude", "groq", "mistral", "ollama", "lmstudio"];
  for (const pid of providers) {
    const activeSlot = slots.find((s) => s.provider === pid && s.enabled && s.apiKey.trim());
    if (activeSlot) {
      localStorage.setItem(`noa_${pid}_key`, activeSlot.apiKey);
    }
  }
}
