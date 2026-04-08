// @ts-nocheck
/**
 * IDE “coding mode” preference (desktop stub — persists in localStorage).
 */

export type CodingMode = "easy" | "normal" | "pro";

const KEY = "eh-code-studio-coding-mode";

export function getCodingMode(): CodingMode {
  if (typeof window === "undefined") return "normal";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "easy" || v === "normal" || v === "pro") return v;
  } catch {
    /* ignore */
  }
  return "normal";
}

export function setCodingMode(mode: CodingMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}
