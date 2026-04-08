/**
 * Desktop / web share helpers: share, print, deep links. Safe no-ops on failure.
 */

export interface SharePayload {
  type: string;
  title: string;
  content: string;
}

export async function createShareLink(payload: SharePayload): Promise<{ url: string }> {
  const blob = new Blob([payload.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  return { url };
}

export async function copyShareLink(url: string): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("clipboard unavailable");
  }
  await navigator.clipboard.writeText(url);
}

export function printContent(elementId: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(elementId);
  if (el) {
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
  window.print();
  window.getSelection()?.removeAllRanges();
}

export async function copyDeepLink(path: string): Promise<void> {
  if (typeof window === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("clipboard unavailable");
  }
  const full = path.startsWith("http")
    ? path
    : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  await navigator.clipboard.writeText(full);
}
