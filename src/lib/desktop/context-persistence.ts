// ============================================================
// context-persistence — contextItems + 탭별 messages 영속화
// 작가가 confirmed한 세계~연출 + 탭별 인터뷰 히스토리를 localStorage에 저장.
// 새로고침/탭 전환에도 손실 0 보장 (Blocker #1, #2 수리).
// ============================================================

const CTX_KEY = 'noa_desktop_contextitems_v1';
const MSG_KEY = 'noa_desktop_tab_messages_v1';

export interface PersistedContextItem {
  tab: string;
  label: string;
  fact: string;
  details: string;
}
export interface PersistedMessage { role: 'user' | 'ai'; text: string }

// ============================================================
// PART 1 — contextItems
// ============================================================

export function loadContextItems(): PersistedContextItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CTX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is PersistedContextItem =>
        x && typeof x === 'object'
        && typeof x.tab === 'string' && typeof x.label === 'string'
        && typeof x.fact === 'string' && typeof x.details === 'string',
      );
  } catch { return []; }
}

export function saveContextItems(items: PersistedContextItem[]): boolean {
  if (typeof window === 'undefined') return false;
  if (!Array.isArray(items)) return false;
  try { window.localStorage.setItem(CTX_KEY, JSON.stringify(items)); return true; }
  catch { return false; }
}

// ============================================================
// PART 2 — 탭별 messages
// ============================================================

export type TabMessagesMap = Record<string, PersistedMessage[]>;

export function loadTabMessages(): TabMessagesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(MSG_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const out: TabMessagesMap = {};
    for (const k of Object.keys(obj as Record<string, unknown>)) {
      const v = (obj as Record<string, unknown>)[k];
      if (Array.isArray(v)) {
        out[k] = v.filter((m): m is PersistedMessage =>
          m && typeof m === 'object'
          && (m.role === 'user' || m.role === 'ai')
          && typeof m.text === 'string',
        );
      }
    }
    return out;
  } catch { return {}; }
}

export function saveTabMessages(map: TabMessagesMap): boolean {
  if (typeof window === 'undefined') return false;
  if (!map || typeof map !== 'object') return false;
  try { window.localStorage.setItem(MSG_KEY, JSON.stringify(map)); return true; }
  catch { return false; }
}

/** 탭별 메시지 N개 한도 (오래된 것 절단). */
export function trimTabMessages(map: TabMessagesMap, maxPerTab = 60): TabMessagesMap {
  const out: TabMessagesMap = {};
  for (const k of Object.keys(map)) {
    const arr = map[k];
    out[k] = arr.length > maxPerTab ? arr.slice(arr.length - maxPerTab) : arr;
  }
  return out;
}
