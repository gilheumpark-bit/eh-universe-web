// ============================================================
// Code Studio — Notifications
// ============================================================
// 토스트 큐, 우선순위 레벨, 자동 닫기, 액션 버튼, 알림 센터.

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration: number; // ms, 0 = persistent
  actions?: NotificationAction[];
  timestamp: number;
  dismissed: boolean;
}

type NotificationListener = (notifications: Notification[]) => void;

// ============================================================
// State
// ============================================================

const queue: Notification[] = [];
const history: Notification[] = [];
const listeners: Set<NotificationListener> = new Set();
const MAX_VISIBLE = 5;
const MAX_HISTORY = 50;

const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  info: 4000,
  success: 3000,
  warning: 6000,
  error: 0, // persistent until dismissed
};

function emit(): void {
  const visible = queue.filter(n => !n.dismissed).slice(0, MAX_VISIBLE);
  for (const listener of listeners) listener(visible);
}

function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ============================================================
// Public API
// ============================================================

/** Subscribe to notification changes */
export function subscribe(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Push a new notification */
export function notify(
  type: NotificationType,
  title: string,
  options: { message?: string; duration?: number; actions?: NotificationAction[] } = {},
): string {
  const id = generateId();
  const notification: Notification = {
    id,
    type,
    title,
    message: options.message,
    duration: options.duration ?? DEFAULT_DURATIONS[type],
    actions: options.actions,
    timestamp: Date.now(),
    dismissed: false,
  };

  queue.push(notification);
  history.push(notification);
  if (history.length > MAX_HISTORY) history.shift();

  emit();

  // Auto-dismiss
  if (notification.duration > 0) {
    setTimeout(() => dismiss(id), notification.duration);
  }

  return id;
}

/** Dismiss a notification */
export function dismiss(id: string): void {
  const notif = queue.find(n => n.id === id);
  if (notif) {
    notif.dismissed = true;
    emit();
  }
}

/** Dismiss all notifications */
export function dismissAll(): void {
  for (const n of queue) n.dismissed = true;
  emit();
}

/** Get notification history */
export function getHistory(): Notification[] {
  return [...history];
}

/** Clear history */
export function clearHistory(): void {
  history.length = 0;
}

// Shorthand helpers
export const notifyInfo = (title: string, message?: string) => notify('info', title, { message });
export const notifySuccess = (title: string, message?: string) => notify('success', title, { message });
export const notifyWarning = (title: string, message?: string) => notify('warning', title, { message });
export const notifyError = (title: string, message?: string) => notify('error', title, { message });

// IDENTITY_SEAL: role=Notifications | inputs=type,title,options | outputs=string,Notification[]
