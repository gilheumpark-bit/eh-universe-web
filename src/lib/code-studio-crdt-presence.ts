// ============================================================
// Code Studio — CRDT Presence
// Cursor position sharing, selection sharing, user colors,
// heartbeat, stale detection. Uses BroadcastChannel for
// cross-tab communication within the same origin.
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

export interface CursorPosition {
  line: number;
  column: number;
}

export interface SelectionRange {
  start: CursorPosition;
  end: CursorPosition;
}

export interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  fileId: string | null;
  cursor: CursorPosition | null;
  selection: SelectionRange | null;
  lastSeen: number;
  isStale: boolean;
}

type PresenceMessageType = 'cursor' | 'selection' | 'heartbeat' | 'join' | 'leave' | 'file-switch';

interface PresenceMessage {
  type: PresenceMessageType;
  userId: string;
  displayName: string;
  color: string;
  fileId: string | null;
  cursor: CursorPosition | null;
  selection: SelectionRange | null;
  timestamp: number;
}

export interface PresenceOptions {
  channelName?: string;
  heartbeatInterval?: number;
  staleThreshold?: number;
  onUpdate?: (users: Map<string, PresenceUser>) => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=PresenceUser,PresenceMessage

// ============================================================
// PART 2 — Color Assignment
// ============================================================

const PRESENCE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#e879f9', '#84cc16',
];

let colorIndex = 0;

function assignColor(): string {
  const color = PRESENCE_COLORS[colorIndex % PRESENCE_COLORS.length];
  colorIndex++;
  return color;
}

// IDENTITY_SEAL: PART-2 | role=ColorAssignment | inputs=none | outputs=string

// ============================================================
// PART 3 — Presence Manager
// ============================================================

export class PresenceManager {
  private channel: BroadcastChannel | null = null;
  private users = new Map<string, PresenceUser>();
  private userId: string;
  private displayName: string;
  private color: string;
  private fileId: string | null = null;
  private cursor: CursorPosition | null = null;
  private selection: SelectionRange | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: number;
  private staleThreshold: number;
  private onUpdate: ((users: Map<string, PresenceUser>) => void) | null;

  constructor(userId: string, displayName: string, options: PresenceOptions = {}) {
    this.userId = userId;
    this.displayName = displayName;
    this.color = assignColor();
    this.heartbeatInterval = options.heartbeatInterval ?? 3000;
    this.staleThreshold = options.staleThreshold ?? 10000;
    this.onUpdate = options.onUpdate ?? null;

    if (typeof BroadcastChannel === 'undefined') return;

    const channelName = options.channelName ?? 'eh-code-studio-presence';
    this.channel = new BroadcastChannel(channelName);
    this.channel.onmessage = (e: MessageEvent<PresenceMessage>) => {
      this.handleMessage(e.data);
    };

    this.broadcast('join');
    this.startHeartbeat();
    this.startStaleCheck();
  }

  private broadcast(type: PresenceMessageType): void {
    if (!this.channel) return;
    const msg: PresenceMessage = {
      type,
      userId: this.userId,
      displayName: this.displayName,
      color: this.color,
      fileId: this.fileId,
      cursor: this.cursor,
      selection: this.selection,
      timestamp: Date.now(),
    };
    try {
      this.channel.postMessage(msg);
    } catch { /* channel closed */ }
  }

  private handleMessage(msg: PresenceMessage): void {
    if (msg.userId === this.userId) return;

    if (msg.type === 'leave') {
      this.users.delete(msg.userId);
    } else {
      this.users.set(msg.userId, {
        userId: msg.userId,
        displayName: msg.displayName,
        color: msg.color,
        fileId: msg.fileId,
        cursor: msg.cursor,
        selection: msg.selection,
        lastSeen: msg.timestamp,
        isStale: false,
      });
    }

    this.notifyUpdate();
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.broadcast('heartbeat');
    }, this.heartbeatInterval);
  }

  private startStaleCheck(): void {
    this.staleCheckTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const [id, user] of this.users) {
        const wasStale = user.isStale;
        const isStale = now - user.lastSeen > this.staleThreshold;

        if (isStale !== wasStale) {
          user.isStale = isStale;
          changed = true;
        }

        // Remove users not seen for 3x stale threshold
        if (now - user.lastSeen > this.staleThreshold * 3) {
          this.users.delete(id);
          changed = true;
        }
      }

      if (changed) this.notifyUpdate();
    }, this.staleThreshold / 2);
  }

  private notifyUpdate(): void {
    this.onUpdate?.(new Map(this.users));
  }

  // Public API

  updateCursor(cursor: CursorPosition): void {
    this.cursor = cursor;
    this.broadcast('cursor');
  }

  updateSelection(selection: SelectionRange | null): void {
    this.selection = selection;
    this.broadcast('selection');
  }

  switchFile(fileId: string | null): void {
    this.fileId = fileId;
    this.cursor = null;
    this.selection = null;
    this.broadcast('file-switch');
  }

  getActiveUsers(): PresenceUser[] {
    return Array.from(this.users.values()).filter((u) => !u.isStale);
  }

  getUsersInFile(fileId: string): PresenceUser[] {
    return this.getActiveUsers().filter((u) => u.fileId === fileId);
  }

  setOnUpdate(cb: (users: Map<string, PresenceUser>) => void): void {
    this.onUpdate = cb;
  }

  destroy(): void {
    this.broadcast('leave');
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.staleCheckTimer) clearInterval(this.staleCheckTimer);
    this.channel?.close();
    this.channel = null;
    this.users.clear();
  }
}

// IDENTITY_SEAL: PART-3 | role=PresenceManager | inputs=userId,displayName | outputs=PresenceUser[]
