/**
 * Global event-based notification system.
 *
 * Any module can call `notify(...)` without prop drilling.
 * UI components subscribe via `onNotification(...)`.
 */

export type NotificationType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "ai-complete"
  | "pipeline-result";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration: number; // ms, 0 = persistent
  action?: NotificationAction;
  timestamp: number;
}

// ── Internal State ──

const notifications: Notification[] = [];
const listeners: Set<(n: Notification) => void> = new Set();
const dismissListeners: Set<(id: string) => void> = new Set();
const clearListeners: Set<() => void> = new Set();

// Default durations by type (ms)
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 3000,
  error: 6000,
  warning: 5000,
  info: 4000,
  "ai-complete": 5000,
  "pipeline-result": 0, // persistent — user must dismiss
};

// ── Deduplication ──

const DEDUP_WINDOW_MS = 5000;
const recentKeys: Map<string, number> = new Map(); // key → timestamp

function isDuplicate(type: NotificationType, title: string): boolean {
  const key = `${type}::${title}`;
  const prev = recentKeys.get(key);
  if (prev && Date.now() - prev < DEDUP_WINDOW_MS) return true;
  recentKeys.set(key, Date.now());
  // Lazy cleanup
  if (recentKeys.size > 200) {
    const now = Date.now();
    for (const [k, ts] of recentKeys) {
      if (now - ts > DEDUP_WINDOW_MS) recentKeys.delete(k);
    }
  }
  return false;
}

// ── Priority ordering ──

const PRIORITY: Record<NotificationType, number> = {
  error: 5,
  warning: 4,
  "ai-complete": 3,
  info: 2,
  success: 1,
  "pipeline-result": 0,
};

// ── Max visible / queue ──

const MAX_VISIBLE = 5;
const visibleIds: Set<string> = new Set();
const pendingQueue: Notification[] = [];

function scheduleAutoDismiss(n: Notification): void {
  if (n.duration > 0) {
    setTimeout(() => {
      dismissNotification(n.id);
    }, n.duration);
  }
}

function promoteFromQueue(): void {
  if (pendingQueue.length === 0 || visibleIds.size >= MAX_VISIBLE) return;
  // Sort pending queue by priority descending
  pendingQueue.sort((a, b) => (PRIORITY[b.type] ?? 0) - (PRIORITY[a.type] ?? 0));
  const next = pendingQueue.shift()!;
  visibleIds.add(next.id);
  scheduleAutoDismiss(next);
  for (const cb of listeners) {
    try { cb(next); } catch { /* ignore */ }
  }
}

// ── Public API ──

/**
 * Show a notification. Returns the notification ID.
 *
 * - Deduplication: same title+type within 5 s is skipped
 * - Max 5 visible concurrently; overflow is queued by priority
 * - Auto-dismiss based on type default duration
 */
export function notify(
  type: NotificationType,
  title: string,
  message?: string,
  options?: {
    duration?: number;
    action?: NotificationAction;
  },
): string {
  // Dedup check
  if (isDuplicate(type, title)) {
    return ""; // silently skip
  }

  const id = crypto.randomUUID();
  const n: Notification = {
    id,
    type,
    title,
    message: message ?? "",
    duration: options?.duration ?? DEFAULT_DURATIONS[type],
    action: options?.action,
    timestamp: Date.now(),
  };
  notifications.push(n);

  // Keep only last 50 notifications in memory
  if (notifications.length > 50) {
    notifications.splice(0, notifications.length - 50);
  }

  // Enforce max visible limit with priority queueing
  if (visibleIds.size >= MAX_VISIBLE) {
    pendingQueue.push(n);
    return id;
  }

  visibleIds.add(id);
  scheduleAutoDismiss(n);

  // Notify listeners
  for (const cb of listeners) {
    try {
      cb(n);
    } catch {
      // never let a bad listener break the system
    }
  }

  return id;
}

/**
 * Dismiss a notification by ID.
 */
export function dismissNotification(id: string): void {
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx !== -1) notifications.splice(idx, 1);
  visibleIds.delete(id);
  for (const cb of dismissListeners) {
    try {
      cb(id);
    } catch {
      // ignore
    }
  }
  // Promote next queued notification
  promoteFromQueue();
}

/**
 * Get a snapshot of all current notifications.
 */
export function getNotifications(): Notification[] {
  return [...notifications];
}

/**
 * Subscribe to new notifications. Returns unsubscribe function.
 */
export function onNotification(callback: (n: Notification) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Subscribe to notification dismissals. Returns unsubscribe function.
 */
export function onDismiss(callback: (id: string) => void): () => void {
  dismissListeners.add(callback);
  return () => {
    dismissListeners.delete(callback);
  };
}

/**
 * Subscribe to clear-all events. Returns unsubscribe function.
 */
export function onClear(callback: () => void): () => void {
  clearListeners.add(callback);
  return () => {
    clearListeners.delete(callback);
  };
}

/**
 * Clear all notifications.
 */
export function clearAll(): void {
  notifications.length = 0;
  visibleIds.clear();
  pendingQueue.length = 0;
  for (const cb of clearListeners) {
    try {
      cb();
    } catch {
      // ignore
    }
  }
}

// ── Convenience Helpers ──

export function notifySuccess(title: string, message?: string) {
  return notify("success", title, message);
}

export function notifyError(title: string, message?: string) {
  return notify("error", title, message);
}

export function notifyWarning(title: string, message?: string) {
  return notify("warning", title, message);
}

export function notifyInfo(title: string, message?: string) {
  return notify("info", title, message);
}

export function notifyAIComplete(title: string, message?: string, action?: NotificationAction) {
  return notify("ai-complete", title, message, { action });
}

export function notifyPipelineResult(title: string, message?: string, action?: NotificationAction) {
  return notify("pipeline-result", title, message, { action });
}
