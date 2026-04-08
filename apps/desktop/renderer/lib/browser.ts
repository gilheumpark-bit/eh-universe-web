/**
 * Browser / Electron helpers for AgentPanel: wake lock, notifications, badge, cache.
 * Desktop: no-ops where APIs are missing.
 */

let wakeLock: WakeLockSentinel | null = null;

export async function acquireWakeLock(): Promise<void> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    /* user denied or unsupported */
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await wakeLock?.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

export async function requestNotificationPermission(): Promise<void> {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

export function notifyCodeVerifyComplete(messageCount: number, confidencePct: number): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification("EH Code Studio", {
      body: `Verify complete — ${messageCount} messages, ${confidencePct}% confidence`,
    });
  } catch {
    /* quota / blocked */
  }
}

export function incrementBadge(): void {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void> };
  if (typeof nav.setAppBadge === "function") {
    void nav.setAppBadge(1).catch(() => {});
  }
}

export async function cacheResponse(
  _kind: string,
  _op: string,
  _messages: unknown[],
  _ttlHours: number,
  _body: string,
): Promise<void> {
  /* Optional Cache API — not used in desktop renderer */
}
