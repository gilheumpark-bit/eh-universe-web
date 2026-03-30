// ============================================================
// PART 1 — Types & Interfaces
// ============================================================
// Real-time collaboration for EH Universe Code Studio.
// Combines CRDT document, cursor trails, activity feed, typing
// indicators, and BroadcastChannel-based sync into one module.

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { file: string; line: number; column: number };
  selection?: { file: string; startLine: number; endLine: number };
  isOnline: boolean;
  lastSeen: number;
  activeFile?: string;
  avatar?: string;
}

export interface CollabState {
  roomId: string;
  users: CollabUser[];
  localUser: CollabUser;
  isConnected: boolean;
  connectionType: "local" | "network";
}

export interface CollabMessage {
  type: "cursor" | "selection" | "edit" | "file-open" | "chat" | "join" | "leave" | "typing" | "activity";
  userId: string;
  payload: unknown;
  timestamp: number;
}

// IDENTITY_SEAL: PART-1 | role=타입 정의 | inputs=none | outputs=CollabUser, CollabState, CollabMessage

// ============================================================
// PART 2 — CRDT Document (Operation-based)
// ============================================================

export interface CRDTId {
  site: string;
  clock: number;
  position: number[];
}

export interface CRDTChar {
  id: CRDTId;
  value: string;
  deleted: boolean;
}

export interface CRDTOperation {
  type: "insert" | "delete";
  id: CRDTId;
  value?: string;
  after?: CRDTId | null;
  origin: string;
  timestamp: number;
}

export interface VectorClock {
  [siteId: string]: number;
}

export class CRDTDocument {
  private chars: CRDTChar[] = [];
  private clock = 0;
  private vectorClock: VectorClock = {};
  private operationLog: CRDTOperation[] = [];
  readonly siteId: string;

  constructor(siteId: string) {
    this.siteId = siteId;
    this.vectorClock[siteId] = 0;
  }

  insert(index: number, value: string): CRDTOperation[] {
    const ops: CRDTOperation[] = [];
    for (let i = 0; i < value.length; i++) {
      this.clock++;
      this.vectorClock[this.siteId] = this.clock;
      const position = this.generatePosition(index + i);
      const id: CRDTId = { site: this.siteId, clock: this.clock, position };
      const afterId = index + i > 0 ? this.getVisibleCharAt(index + i - 1)?.id ?? null : null;
      const op: CRDTOperation = { type: "insert", id, value: value[i], after: afterId, origin: this.siteId, timestamp: this.clock };
      this.applyInsert(op);
      ops.push(op);
      this.operationLog.push(op);
    }
    return ops;
  }

  delete(index: number, length: number): CRDTOperation[] {
    const ops: CRDTOperation[] = [];
    for (let i = 0; i < length; i++) {
      const char = this.getVisibleCharAt(index);
      if (!char) break;
      this.clock++;
      this.vectorClock[this.siteId] = this.clock;
      const op: CRDTOperation = { type: "delete", id: char.id, origin: this.siteId, timestamp: this.clock };
      this.applyDelete(op);
      ops.push(op);
      this.operationLog.push(op);
    }
    return ops;
  }

  applyRemote(op: CRDTOperation): boolean {
    this.vectorClock[op.origin] = Math.max(this.vectorClock[op.origin] ?? 0, op.timestamp);
    this.clock = Math.max(this.clock, op.timestamp);
    return op.type === "insert" ? this.applyInsert(op) : this.applyDelete(op);
  }

  getText(): string {
    return this.chars.filter((c) => !c.deleted).map((c) => c.value).join("");
  }

  visibleLength(): number {
    return this.chars.filter((c) => !c.deleted).length;
  }

  getVectorClock(): VectorClock { return { ...this.vectorClock }; }

  getOperationsSince(remoteClock: VectorClock): CRDTOperation[] {
    return this.operationLog.filter((op) => op.timestamp > (remoteClock[op.origin] ?? 0));
  }

  serialize(): { chars: CRDTChar[]; clock: number; vectorClock: VectorClock } {
    return { chars: this.chars.map((c) => ({ ...c })), clock: this.clock, vectorClock: { ...this.vectorClock } };
  }

  static deserialize(siteId: string, data: { chars: CRDTChar[]; clock: number; vectorClock: VectorClock }): CRDTDocument {
    const doc = new CRDTDocument(siteId);
    doc.chars = data.chars.map((c) => ({ ...c }));
    doc.clock = Math.max(doc.clock, data.clock);
    for (const [site, clock] of Object.entries(data.vectorClock)) {
      doc.vectorClock[site] = Math.max(doc.vectorClock[site] ?? 0, clock);
    }
    return doc;
  }

  // ── Private ──

  private applyInsert(op: CRDTOperation): boolean {
    if (this.findCharById(op.id) !== -1) return false;
    const char: CRDTChar = { id: op.id, value: op.value!, deleted: false };
    if (!op.after) {
      const idx = this.findInsertPosition(0, op.id);
      this.chars.splice(idx, 0, char);
    } else {
      const afterIdx = this.findCharById(op.after);
      if (afterIdx === -1) { this.chars.push(char); }
      else { this.chars.splice(this.findInsertPosition(afterIdx + 1, op.id), 0, char); }
    }
    return true;
  }

  private applyDelete(op: CRDTOperation): boolean {
    const idx = this.findCharById(op.id);
    if (idx === -1) return false;
    this.chars[idx].deleted = true;
    return true;
  }

  private generatePosition(visibleIndex: number): number[] {
    const left = visibleIndex > 0
      ? this.getVisibleCharAt(visibleIndex - 1)?.id.position ?? [0]
      : [0];
    const right = visibleIndex < this.visibleLength()
      ? this.getVisibleCharAt(visibleIndex)?.id.position ?? [Number.MAX_SAFE_INTEGER]
      : [Number.MAX_SAFE_INTEGER];
    return this.allocateBetween(left, right);
  }

  private allocateBetween(left: number[], right: number[]): number[] {
    const result: number[] = [];
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen + 1; i++) {
      const l = left[i] ?? 0;
      const r = right[i] ?? Number.MAX_SAFE_INTEGER;
      if (l + 1 < r) {
        result.push(l + 1 + Math.floor(Math.random() * Math.min(r - l - 1, 10)));
        return result;
      }
      result.push(l);
    }
    result.push(1 + Math.floor(Math.random() * 100));
    return result;
  }

  private findCharById(id: CRDTId): number {
    for (let i = 0; i < this.chars.length; i++) {
      if (this.chars[i].id.site === id.site && this.chars[i].id.clock === id.clock) return i;
    }
    return -1;
  }

  private findInsertPosition(startIdx: number, newId: CRDTId): number {
    let idx = startIdx;
    while (idx < this.chars.length) {
      if (this.compareIds(newId, this.chars[idx].id) < 0) break;
      idx++;
    }
    return idx;
  }

  private compareIds(a: CRDTId, b: CRDTId): number {
    const minLen = Math.min(a.position.length, b.position.length);
    for (let i = 0; i < minLen; i++) {
      if (a.position[i] !== b.position[i]) return a.position[i] - b.position[i];
    }
    if (a.position.length !== b.position.length) return a.position.length - b.position.length;
    return a.site < b.site ? -1 : a.site > b.site ? 1 : a.clock - b.clock;
  }

  private getVisibleCharAt(index: number): CRDTChar | null {
    let count = 0;
    for (const char of this.chars) {
      if (!char.deleted) {
        if (count === index) return char;
        count++;
      }
    }
    return null;
  }
}

// IDENTITY_SEAL: PART-2 | role=CRDT 문서 엔진 | inputs=siteId | outputs=insert, delete, applyRemote, getText

// ============================================================
// PART 3 — Cursor Trail & Typing Indicator
// ============================================================

export interface CursorTrailPoint {
  file: string;
  line: number;
  column: number;
  timestamp: number;
  opacity: number;
}

export class CursorTrailManager {
  private trails = new Map<string, CursorTrailPoint[]>();
  private readonly maxTrailLength = 20;
  private readonly fadeDurationMs = 3000;

  addPoint(userId: string, file: string, line: number, column: number): void {
    if (!this.trails.has(userId)) this.trails.set(userId, []);
    const trail = this.trails.get(userId)!;
    trail.push({ file, line, column, timestamp: Date.now(), opacity: 1.0 });
    if (trail.length > this.maxTrailLength) trail.splice(0, trail.length - this.maxTrailLength);
  }

  getTrail(userId: string): CursorTrailPoint[] {
    const trail = this.trails.get(userId);
    if (!trail) return [];
    const now = Date.now();
    const active = trail.filter((pt) => now - pt.timestamp < this.fadeDurationMs)
      .map((pt) => ({ ...pt, opacity: 1.0 - (now - pt.timestamp) / this.fadeDurationMs }));
    this.trails.set(userId, active);
    return active;
  }

  getAllTrails(): Map<string, CursorTrailPoint[]> {
    const result = new Map<string, CursorTrailPoint[]>();
    for (const [userId] of this.trails) {
      const trail = this.getTrail(userId);
      if (trail.length > 0) result.set(userId, trail);
    }
    return result;
  }

  clearUser(userId: string): void { this.trails.delete(userId); }
}

export type ActivityAction = "opened-file" | "made-edit" | "ran-pipeline" | "joined" | "left" | "chat-message";

export interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action: ActivityAction;
  detail: string;
  timestamp: number;
}

export class ActivityFeed {
  private entries: ActivityEntry[] = [];
  private readonly maxEntries = 200;
  private listeners: Array<(entries: ActivityEntry[]) => void> = [];

  log(userId: string, userName: string, action: ActivityAction, detail: string): void {
    this.entries.push({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId, userName, action, detail, timestamp: Date.now(),
    });
    if (this.entries.length > this.maxEntries) this.entries.splice(0, this.entries.length - this.maxEntries);
    this.notifyListeners();
  }

  getEntries(filter?: { action?: ActivityAction; userId?: string; limit?: number }): ActivityEntry[] {
    let result: ActivityEntry[] = this.entries;
    if (filter?.action) result = result.filter((e) => e.action === filter.action);
    if (filter?.userId) result = result.filter((e) => e.userId === filter.userId);
    if (filter?.limit) result = result.slice(-filter.limit);
    return [...result];
  }

  subscribe(listener: (entries: ActivityEntry[]) => void): () => void {
    this.listeners.push(listener);
    return () => { const idx = this.listeners.indexOf(listener); if (idx >= 0) this.listeners.splice(idx, 1); };
  }

  clear(): void { this.entries = []; this.notifyListeners(); }

  private notifyListeners(): void {
    const entries = [...this.entries];
    for (const fn of this.listeners) fn(entries);
  }
}

export interface TypingStatus {
  userId: string;
  userName: string;
  file: string;
  isTyping: boolean;
  lastTypedAt: number;
}

export class TypingIndicatorManager {
  private typingUsers = new Map<string, TypingStatus>();
  private readonly typingTimeoutMs = 2000;
  private listeners: Array<(typingUsers: TypingStatus[]) => void> = [];

  setTyping(userId: string, userName: string, file: string): void {
    this.typingUsers.set(userId, { userId, userName, file, isTyping: true, lastTypedAt: Date.now() });
    this.notifyListeners();
  }

  clearTyping(userId: string): void {
    this.typingUsers.delete(userId);
    this.notifyListeners();
  }

  getTypingUsers(): TypingStatus[] {
    const now = Date.now();
    const stale: string[] = [];
    for (const [id, status] of this.typingUsers) {
      if (now - status.lastTypedAt > this.typingTimeoutMs) stale.push(id);
    }
    for (const id of stale) this.typingUsers.delete(id);
    if (stale.length > 0) this.notifyListeners();
    return Array.from(this.typingUsers.values()).filter((s) => s.isTyping);
  }

  subscribe(listener: (typingUsers: TypingStatus[]) => void): () => void {
    this.listeners.push(listener);
    return () => { const idx = this.listeners.indexOf(listener); if (idx >= 0) this.listeners.splice(idx, 1); };
  }

  private notifyListeners(): void {
    const users = this.getTypingUsers();
    for (const fn of this.listeners) fn(users);
  }
}

// IDENTITY_SEAL: PART-3 | role=커서 트레일, 액티비티 피드, 타이핑 인디케이터 | inputs=userId | outputs=trails, entries, typingUsers

// ============================================================
// PART 4 — Collaboration Manager (BroadcastChannel)
// ============================================================

const USER_COLORS = [
  "#58a6ff", "#3fb950", "#f85149", "#d29922",
  "#bc8cff", "#f778ba", "#79c0ff", "#7ee787",
];
const HEARTBEAT_INTERVAL = 2_000;
const STALE_TIMEOUT = 10_000;
const STALE_CHECK_INTERVAL = 5_000;

export class CollaborationManager {
  private channel: BroadcastChannel | null = null;
  private localUser: CollabUser;
  private remoteUsers = new Map<string, CollabUser>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  readonly cursorTrails = new CursorTrailManager();
  readonly activityFeed = new ActivityFeed();
  readonly typingIndicator = new TypingIndicatorManager();

  private onJoinCallbacks: Array<(user: CollabUser) => void> = [];
  private onLeaveCallbacks: Array<(userId: string) => void> = [];
  private onCursorCallbacks: Array<(userId: string, cursor: CollabUser["cursor"]) => void> = [];
  private onEditCallbacks: Array<(userId: string, file: string, content: string) => void> = [];
  private onChatCallbacks: Array<(userId: string, message: string) => void> = [];
  private onTypingCallbacks: Array<(userId: string, file: string) => void> = [];
  private readonly roomId: string;

  constructor(roomId: string, userName: string) {
    this.roomId = roomId;
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    const parts = userName.trim().split(/\s+/);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : userName.slice(0, 2).toUpperCase();
    this.localUser = {
      id: crypto.randomUUID(), name: userName, color, isOnline: true, lastSeen: Date.now(), avatar: initials,
    };
  }

  join(): void {
    if (this.connected) return;
    if (typeof BroadcastChannel === "undefined") return;
    this.channel = new BroadcastChannel(`eh-code-studio-collab-${this.roomId}`);
    this.channel.onmessage = (event) => this.handleMessage(event.data as CollabMessage);
    this.connected = true;
    this.broadcast({ type: "join", userId: this.localUser.id, payload: { name: this.localUser.name, color: this.localUser.color }, timestamp: Date.now() });
    this.heartbeatTimer = setInterval(() => {
      this.localUser.lastSeen = Date.now();
      this.broadcast({ type: "join", userId: this.localUser.id, payload: { name: this.localUser.name, color: this.localUser.color, cursor: this.localUser.cursor, selection: this.localUser.selection }, timestamp: Date.now() });
    }, HEARTBEAT_INTERVAL);
    this.staleCheckTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, user] of this.remoteUsers) {
        if (now - user.lastSeen > STALE_TIMEOUT) { this.remoteUsers.delete(id); this.onLeaveCallbacks.forEach((cb) => cb(id)); }
      }
    }, STALE_CHECK_INTERVAL);
  }

  leave(): void {
    if (!this.connected) return;
    this.broadcast({ type: "leave", userId: this.localUser.id, payload: null, timestamp: Date.now() });
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.staleCheckTimer) clearInterval(this.staleCheckTimer);
    this.heartbeatTimer = null;
    this.staleCheckTimer = null;
    this.channel?.close();
    this.channel = null;
    this.connected = false;
    this.remoteUsers.clear();
  }

  broadcastCursor(file: string, line: number, column: number): void {
    this.localUser.cursor = { file, line, column };
    this.broadcast({ type: "cursor", userId: this.localUser.id, payload: { file, line, column }, timestamp: Date.now() });
  }

  broadcastEdit(file: string, content: string): void {
    this.broadcast({ type: "edit", userId: this.localUser.id, payload: { file, content }, timestamp: Date.now() });
    this.activityFeed.log(this.localUser.id, this.localUser.name, "made-edit", `Edited ${file}`);
  }

  broadcastChat(message: string): void {
    this.broadcast({ type: "chat", userId: this.localUser.id, payload: { message }, timestamp: Date.now() });
  }

  broadcastTyping(file: string): void {
    this.typingIndicator.setTyping(this.localUser.id, this.localUser.name, file);
    this.broadcast({ type: "typing", userId: this.localUser.id, payload: { file }, timestamp: Date.now() });
  }

  broadcastFileOpen(file: string): void {
    this.localUser.activeFile = file;
    this.broadcast({ type: "file-open", userId: this.localUser.id, payload: { file }, timestamp: Date.now() });
    this.activityFeed.log(this.localUser.id, this.localUser.name, "opened-file", `Opened ${file}`);
  }

  broadcastActivity(action: ActivityAction, detail: string): void {
    this.activityFeed.log(this.localUser.id, this.localUser.name, action, detail);
    this.broadcast({ type: "activity", userId: this.localUser.id, payload: { action, detail, userName: this.localUser.name }, timestamp: Date.now() });
  }

  onUserJoin(cb: (user: CollabUser) => void): void { this.onJoinCallbacks.push(cb); }
  onUserLeave(cb: (userId: string) => void): void { this.onLeaveCallbacks.push(cb); }
  onCursorUpdate(cb: (userId: string, cursor: CollabUser["cursor"]) => void): void { this.onCursorCallbacks.push(cb); }
  onEditReceived(cb: (userId: string, file: string, content: string) => void): void { this.onEditCallbacks.push(cb); }
  onChatReceived(cb: (userId: string, message: string) => void): void { this.onChatCallbacks.push(cb); }
  onTypingReceived(cb: (userId: string, file: string) => void): void { this.onTypingCallbacks.push(cb); }

  getState(): CollabState {
    return { roomId: this.roomId, users: Array.from(this.remoteUsers.values()), localUser: { ...this.localUser }, isConnected: this.connected, connectionType: "local" };
  }

  getRoomUrl(): string {
    const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
    return `${base}#collab=${this.roomId}`;
  }

  private broadcast(message: CollabMessage): void {
    if (!this.channel || !this.connected) return;
    try { this.channel.postMessage(message); } catch { /* channel closed */ }
  }

  private handleMessage(msg: CollabMessage): void {
    if (msg.userId === this.localUser.id) return;
    switch (msg.type) {
      case "join": {
        const p = msg.payload as { name: string; color: string; cursor?: CollabUser["cursor"]; selection?: CollabUser["selection"] };
        const isNew = !this.remoteUsers.has(msg.userId);
        const user: CollabUser = { id: msg.userId, name: p.name, color: p.color, cursor: p.cursor, selection: p.selection, isOnline: true, lastSeen: msg.timestamp };
        this.remoteUsers.set(msg.userId, user);
        if (isNew) this.onJoinCallbacks.forEach((cb) => cb(user));
        break;
      }
      case "leave":
        this.remoteUsers.delete(msg.userId);
        this.onLeaveCallbacks.forEach((cb) => cb(msg.userId));
        break;
      case "cursor": {
        const c = msg.payload as { file: string; line: number; column: number };
        const u = this.remoteUsers.get(msg.userId);
        if (u) { u.cursor = c; u.lastSeen = msg.timestamp; }
        this.cursorTrails.addPoint(msg.userId, c.file, c.line, c.column);
        this.onCursorCallbacks.forEach((cb) => cb(msg.userId, c));
        break;
      }
      case "edit": {
        const e = msg.payload as { file: string; content: string };
        const u2 = this.remoteUsers.get(msg.userId);
        if (u2) u2.lastSeen = msg.timestamp;
        this.activityFeed.log(msg.userId, u2?.name ?? msg.userId, "made-edit", `Edited ${e.file}`);
        this.onEditCallbacks.forEach((cb) => cb(msg.userId, e.file, e.content));
        break;
      }
      case "file-open": {
        const fo = msg.payload as { file: string };
        const u3 = this.remoteUsers.get(msg.userId);
        if (u3) { u3.activeFile = fo.file; u3.lastSeen = msg.timestamp; }
        this.activityFeed.log(msg.userId, u3?.name ?? msg.userId, "opened-file", `Opened ${fo.file}`);
        break;
      }
      case "chat": {
        const ch = msg.payload as { message: string };
        const u4 = this.remoteUsers.get(msg.userId);
        if (u4) u4.lastSeen = msg.timestamp;
        this.onChatCallbacks.forEach((cb) => cb(msg.userId, ch.message));
        break;
      }
      case "typing": {
        const t = msg.payload as { file: string };
        const u5 = this.remoteUsers.get(msg.userId);
        if (u5) u5.lastSeen = msg.timestamp;
        this.typingIndicator.setTyping(msg.userId, u5?.name ?? msg.userId, t.file);
        this.onTypingCallbacks.forEach((cb) => cb(msg.userId, t.file));
        break;
      }
      case "activity": {
        const a = msg.payload as { action: ActivityAction; detail: string; userName: string };
        const u6 = this.remoteUsers.get(msg.userId);
        if (u6) u6.lastSeen = msg.timestamp;
        this.activityFeed.log(msg.userId, a.userName, a.action, a.detail);
        break;
      }
    }
  }
}

// IDENTITY_SEAL: PART-4 | role=협업 매니저 | inputs=roomId, userName | outputs=CollabState, BroadcastChannel 동기화

// ============================================================
// PART 5 — Factory & Utilities
// ============================================================

const SESSION_ROOM_KEY = "eh-collab-room-id";
const SESSION_USER_KEY = "eh-collab-user-name";

export function persistSession(roomId: string, userName: string): void {
  try { sessionStorage.setItem(SESSION_ROOM_KEY, roomId); sessionStorage.setItem(SESSION_USER_KEY, userName); } catch { /* */ }
}

export function restoreSession(): { roomId: string; userName: string } | null {
  try {
    const roomId = sessionStorage.getItem(SESSION_ROOM_KEY);
    const userName = sessionStorage.getItem(SESSION_USER_KEY);
    if (roomId && userName) return { roomId, userName };
  } catch { /* */ }
  return null;
}

export function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_ROOM_KEY); sessionStorage.removeItem(SESSION_USER_KEY); } catch { /* */ }
}

export function createCollaborationManager(roomId: string, userName: string): CollaborationManager {
  persistSession(roomId, userName);
  return new CollaborationManager(roomId, userName);
}

export function generateUserAvatar(name: string, color: string): { initials: string; bgColor: string; textColor: string } {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return { initials, bgColor: color + "33", textColor: color };
}

// IDENTITY_SEAL: PART-5 | role=팩토리 및 유틸리티 | inputs=roomId, userName | outputs=CollaborationManager
