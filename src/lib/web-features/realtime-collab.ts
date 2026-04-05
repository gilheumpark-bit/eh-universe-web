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

const USER_COLORS = ['#4a8f78', '#8b6f56', '#6d7d8f', '#a85c52', '#b8955c', '#6b5ba3'];

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

/**
 * 웹소켓/SSE 원격 연결 (로컬 BroadcastChannel 폴백).
 * 서버리스 모드에서는 동일 기기/브라우저 내 다중 탭 간의 릴레이 모드로 자동 대체됩니다.
 */
export function connectRemote(
  roomId: string,
  user: CollabUser,
  handlers: {
    onEdit?: (edit: CollabEdit) => void;
    onCursor?: (user: CollabUser) => void;
    onJoin?: (user: CollabUser) => void;
    onLeave?: (userId: string) => void;
  },
): RemoteCollabConnection {
  // 현재 서버형 SSE 노드가 없으므로, 로컬 릴레이(BroadcastChannel) 모드로 강제 동작합니다.
  const localRelay = new BroadcastChannel(`eh-collab-relay-${roomId}`);

  const messageHandler = (e: MessageEvent) => {
    const { type, payload } = e.data;
    switch (type) {
      case 'edit': handlers.onEdit?.(payload); break;
      case 'cursor': handlers.onCursor?.(payload); break;
      case 'join': handlers.onJoin?.(payload); break;
      case 'leave': handlers.onLeave?.(payload); break;
    }
  };

  localRelay.addEventListener('message', messageHandler);
  
  // 입장 신호 릴레이 전송
  localRelay.postMessage({ type: 'join', payload: user });

  return {
    send: (data: CollabEdit | CollabUser) => {
      // type guard based on data shape
      if ('position' in data) {
        localRelay.postMessage({ type: 'edit', payload: data as CollabEdit });
      } else {
        localRelay.postMessage({ type: 'cursor', payload: data as CollabUser });
      }
    },
    close: () => {
      localRelay.postMessage({ type: 'leave', payload: user.id });
      localRelay.removeEventListener('message', messageHandler);
      localRelay.close();
    }
  };
}
