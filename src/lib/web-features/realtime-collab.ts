// ============================================================
// Real-time Collaboration — 멀티유저 실시간 편집
// ============================================================
// 웹소켓 기반 공동 편집. 소설 공동 집필, 번역 공동 검토,
// 코드 페어 리뷰. 설치형에선 매우 어렵지만 웹에선 자연스러움.
//
// 구현: BroadcastChannel (같은 기기) + 서버 SSE (원격 유저)
// CRDT 구현 시 별도 모듈 추가 예정

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; ch: number };
  selection?: { from: number; to: number };
  lastActive: number;
}

export interface CollabEdit {
  userId: string;
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content: string;
  timestamp: number;
}

export interface CollabRoom {
  id: string;
  type: 'novel' | 'code' | 'translation';
  users: CollabUser[];
  /** 현재 문서 버전 */
  version: number;
}

// [C] 다크 accent 토큰 동기화 (globals.css 다크 시리즈와 일치)
const USER_COLORS = ['#6aaa90', '#a08573', '#8898ad', '#c4786d', '#caa572', '#7e6abf'];

/** 협업 룸 ID 생성 */
export function createRoomId(): string {
  return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 협업 초대 URL 생성 */
export function getCollabInviteUrl(roomId: string, type: CollabRoom['type']): string {
  return `${window.location.origin}/collab/${type}/${roomId}`;
}

/** 초대 URL을 클립보드에 복사 */
export async function copyCollabInvite(roomId: string, type: CollabRoom['type']): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getCollabInviteUrl(roomId, type));
    return true;
  } catch {
    return false;
  }
}

/** 로컬 유저 정보 생성 */
export function createLocalUser(name?: string): CollabUser {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('eh-collab-user') : null;
  if (stored) {
    try {
      return { ...JSON.parse(stored), lastActive: Date.now() };
    } catch { /* */ }
  }

  const user: CollabUser = {
    id: crypto.randomUUID(),
    name: name || `User ${Math.floor(Math.random() * 1000)}`,
    color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
    lastActive: Date.now(),
  };
  localStorage.setItem('eh-collab-user', JSON.stringify(user));
  return user;
}

// ── BroadcastChannel (같은 기기 멀티탭) ──

export function createLocalChannel(roomId: string): BroadcastChannel {
  return new BroadcastChannel(`eh-collab-${roomId}`);
}

/** 로컬 채널에 편집 브로드캐스트 */
export function broadcastEdit(channel: BroadcastChannel, edit: CollabEdit): void {
  channel.postMessage({ type: 'edit', payload: edit });
}

/** 로컬 채널에 커서 위치 브로드캐스트 */
export function broadcastCursor(channel: BroadcastChannel, user: CollabUser): void {
  channel.postMessage({ type: 'cursor', payload: user });
}

/** 로컬 채널 리스너 등록 */
export function onLocalMessage(
  channel: BroadcastChannel,
  handlers: {
    onEdit?: (edit: CollabEdit) => void;
    onCursor?: (user: CollabUser) => void;
    onJoin?: (user: CollabUser) => void;
    onLeave?: (userId: string) => void;
  },
): () => void {
  const handler = (e: MessageEvent) => {
    const { type, payload } = e.data;
    switch (type) {
      case 'edit': handlers.onEdit?.(payload); break;
      case 'cursor': handlers.onCursor?.(payload); break;
      case 'join': handlers.onJoin?.(payload); break;
      case 'leave': handlers.onLeave?.(payload); break;
    }
  };
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}

// ── 원격 협업 (SSE 기반 — 서버 필요 시 활성화) ──

export interface RemoteCollabConnection {
  send: (data: CollabEdit | CollabUser) => void;
  close: () => void;
}

/** 내부 원격 연결 상태 */
let _remoteConnection: EventSource | null = null;

/** 원격 CRDT op 적용 (SSE crdt-op 이벤트 핸들러) */
function applyRemoteOperation(op: CollabEdit): void {
  // CRDT 모듈 연동 시 여기에 실제 적용 로직 추가
  void op;
}

/** 원격 커서 업데이트 (SSE cursor 이벤트 핸들러) */
function updateRemoteCursor(cursor: CollabUser): void {
  void cursor;
}

/** 원격 프레젠스 업데이트 (SSE presence 이벤트 핸들러) */
function updatePresence(presence: { userId: string; status: string }): void {
  void presence;
}

/**
 * 원격 협업 SSE 연결.
 * 서버가 /api/collab/:roomId SSE 엔드포인트를 제공해야 함.
 * crdt-op / cursor / presence 이벤트를 수신하며, 오류 시 5초 후 재연결.
 */
export async function connectRemote(serverUrl: string): Promise<EventSource | null> {
  if (typeof EventSource === 'undefined') return null;
  try {
    const es = new EventSource(serverUrl, { withCredentials: true });
    es.addEventListener('crdt-op', (event) => {
      try {
        const op: CollabEdit = JSON.parse((event as MessageEvent).data);
        applyRemoteOperation(op);
      } catch { /* 파싱 실패 무시 */ }
    });
    es.addEventListener('cursor', (event) => {
      try {
        const cursor: CollabUser = JSON.parse((event as MessageEvent).data);
        updateRemoteCursor(cursor);
      } catch { /* 파싱 실패 무시 */ }
    });
    es.addEventListener('presence', (event) => {
      try {
        const presence = JSON.parse((event as MessageEvent).data) as { userId: string; status: string };
        updatePresence(presence);
      } catch { /* 파싱 실패 무시 */ }
    });
    es.onerror = () => {
      setTimeout(() => { void connectRemote(serverUrl); }, 5000);
    };
    _remoteConnection = es;
    return es;
  } catch {
    return null;
  }
}

/** 원격 SSE 연결 종료 */
export function disconnectRemote(): void {
  if (_remoteConnection) {
    _remoteConnection.close();
    _remoteConnection = null;
  }
}
