// ============================================================
// 로컬 AI 연결 — 최대 3개 슬롯 구조 (OpenAI 호환 엔드포인트)
// 목표 지침: "로컬 ai는 최대 3개 연결 가능한 구조". vLLM·Ollama·llama.cpp·LM Studio 등.
// 격리: studio-types import 0. localStorage 영속(클라이언트). SSR 안전.
// ============================================================

// ============================================================
// PART 1 — 타입 + 상수
// ============================================================

export interface LocalAISlot {
  id: 1 | 2 | 3;
  label: string;
  /** OpenAI 호환 base. 예: http://localhost:11434/v1 (Ollama) · http://localhost:8001/v1 (vLLM) */
  baseUrl: string;
  /** served-model-name. 예: qwen2.5:14b · qwen36 */
  model: string;
  enabled: boolean;
}

export const MAX_LOCAL_AI_SLOTS = 3 as const;
const STORAGE_KEY = 'noa_local_ai_slots_v1';

// ============================================================
// PART 2 — 기본값 + 검증
// ============================================================

export function emptySlots(): LocalAISlot[] {
  return ([1, 2, 3] as const).map((id) => ({
    id,
    label: `로컬 AI ${id}`,
    baseUrl: '',
    model: '',
    enabled: false,
  }));
}

/** base URL 형식 검증 — http/https + 호스트 존재. (로컬/LAN 허용) */
export function isValidBaseUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.host;
  } catch {
    return false;
  }
}

/** 슬롯 유효성 — enabled 인데 base/model 누락 시 에러 list. */
export function validateSlot(slot: LocalAISlot): string[] {
  const errs: string[] = [];
  if (!slot.enabled) return errs;
  if (!isValidBaseUrl(slot.baseUrl)) errs.push('baseUrl 형식 오류 (http(s)://host[:port][/v1])');
  if (!slot.model.trim()) errs.push('model(served-model-name) 필요');
  return errs;
}

// ============================================================
// PART 3 — 영속 (localStorage · SSR 안전 · 항상 3슬롯 보장)
// ============================================================

function normalize(raw: unknown): LocalAISlot[] {
  const base = emptySlots();
  if (!Array.isArray(raw)) return base;
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Partial<LocalAISlot>;
    const id = Number(o.id);
    if (id !== 1 && id !== 2 && id !== 3) continue;
    base[id - 1] = {
      id: id as 1 | 2 | 3,
      label: typeof o.label === 'string' && o.label.trim() ? o.label : `로컬 AI ${id}`,
      baseUrl: typeof o.baseUrl === 'string' ? o.baseUrl : '',
      model: typeof o.model === 'string' ? o.model : '',
      enabled: Boolean(o.enabled),
    };
  }
  return base; // 항상 정확히 3개
}

export function loadLocalAISlots(): LocalAISlot[] {
  if (typeof window === 'undefined') return emptySlots();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySlots();
    return normalize(JSON.parse(raw));
  } catch {
    return emptySlots();
  }
}

export function saveLocalAISlots(slots: LocalAISlot[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalize(slots)));
  } catch {
    /* quota/serialization — best-effort */
  }
}

// ============================================================
// PART 4 — 해석 (활성 슬롯 / 폴백 체인)
// ============================================================

/** 활성+유효 슬롯만 (순서대로) — 폴백 체인 후보. 최대 3개. */
export function listEnabledLocalAI(slots: LocalAISlot[] = loadLocalAISlots()): LocalAISlot[] {
  return slots.filter((s) => s.enabled && validateSlot(s).length === 0).slice(0, MAX_LOCAL_AI_SLOTS);
}

/** 첫 활성 유효 슬롯 → AI 호출용 {baseUrl, model}. 없으면 null. */
export function resolveActiveLocalAI(slots?: LocalAISlot[]): { baseUrl: string; model: string } | null {
  const enabled = listEnabledLocalAI(slots);
  if (enabled.length === 0) return null;
  const s = enabled[0];
  return { baseUrl: s.baseUrl.trim().replace(/\/$/, ''), model: s.model.trim() };
}
