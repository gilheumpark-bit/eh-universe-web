/**
 * 액티비티 바 핵심 아이콘 순서 — localStorage 영속화 및 마이그레이션
 */

const STORAGE_KEY = "eh-code-studio-activity-bar-order-v2";

export const ACTIVITY_BAR_DEFAULT_ORDER = [
  "files",
  "chat",
  "action-demo",
  "action-new-file",
  "project-spec",
  "pipeline",
  "search",
  "git",
  "review",
  "composer",
  "canvas",
  "preview",
] as const;

export type ActivityBarItemId = (typeof ACTIVITY_BAR_DEFAULT_ORDER)[number];

const ALLOWED = new Set<string>(ACTIVITY_BAR_DEFAULT_ORDER);

export function normalizeActivityBarOrder(order: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of order) {
    if (ALLOWED.has(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of ACTIVITY_BAR_DEFAULT_ORDER) {
    if (!seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  return out;
}

export function loadActivityBarOrder(): string[] {
  if (typeof window === "undefined") {
    return [...ACTIVITY_BAR_DEFAULT_ORDER];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...ACTIVITY_BAR_DEFAULT_ORDER];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...ACTIVITY_BAR_DEFAULT_ORDER];
    return normalizeActivityBarOrder(parsed.map((x) => String(x)));
  } catch {
    return [...ACTIVITY_BAR_DEFAULT_ORDER];
  }
}

export function saveActivityBarOrder(order: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* quota / private mode */
  }
}
