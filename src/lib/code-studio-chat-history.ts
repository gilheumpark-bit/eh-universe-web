// ============================================================
// Code Studio — Chat History (IndexedDB)
// ============================================================
// 채팅 세션 저장/로드, 세션 목록, 삭제, 내보내기.

// ============================================================
// PART 1 — Types
// ============================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    provider?: string;
    tokenCount?: number;
    attachedFiles?: string[];
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  projectId?: string;
  tags?: string[];
}

export interface ChatExport {
  version: 1;
  exportedAt: number;
  sessions: ChatSession[];
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ChatMessage,ChatSession,ChatExport

// ============================================================
// PART 2 — IndexedDB Operations
// ============================================================

const DB_NAME = 'eh-code-studio';
const STORE_CHAT = 'chat';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No IndexedDB in SSR'));
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHAT)) db.createObjectStore(STORE_CHAT);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveChatSession(session: ChatSession): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAT, 'readwrite');
      tx.objectStore(STORE_CHAT).put(session, session.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable
  }
}

export async function loadChatSession(id: string): Promise<ChatSession | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAT, 'readonly');
      const req = tx.objectStore(STORE_CHAT).get(id);
      req.onsuccess = () => resolve((req.result as ChatSession) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function listChatSessions(): Promise<ChatSession[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAT, 'readonly');
      const req = tx.objectStore(STORE_CHAT).getAll();
      req.onsuccess = () => {
        const sessions = (req.result as ChatSession[])
          .sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(sessions);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteChatSession(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAT, 'readwrite');
      tx.objectStore(STORE_CHAT).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

// IDENTITY_SEAL: PART-2 | role=IndexedDBOps | inputs=ChatSession,id | outputs=ChatSession|null,ChatSession[]

// ============================================================
// PART 3 — Session Management
// ============================================================

/** Create a new chat session */
export function createChatSession(projectId?: string): ChatSession {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectId,
  };
}

/** Generate title from first user message */
export function autoTitle(session: ChatSession): string {
  const firstUser = session.messages.find(m => m.role === 'user');
  if (!firstUser) return 'New Chat';
  const text = firstUser.content.slice(0, 60).trim();
  return text.length < firstUser.content.length ? text + '...' : text;
}

/** Delete sessions older than N days */
export async function deleteOldSessions(maxAgeDays = 90): Promise<number> {
  const sessions = await listChatSessions();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let count = 0;
  for (const s of sessions) {
    if (s.updatedAt < cutoff) {
      await deleteChatSession(s.id);
      count++;
    }
  }
  return count;
}

/** Export sessions as JSON */
export async function exportChatHistory(): Promise<ChatExport> {
  const sessions = await listChatSessions();
  return {
    version: 1,
    exportedAt: Date.now(),
    sessions,
  };
}

/** Import sessions from JSON export */
export async function importChatHistory(data: ChatExport): Promise<number> {
  if (data.version !== 1) throw new Error('Unsupported export version');
  let count = 0;
  for (const session of data.sessions) {
    await saveChatSession(session);
    count++;
  }
  return count;
}

// IDENTITY_SEAL: PART-3 | role=SessionMgmt | inputs=ChatSession,data | outputs=ChatSession,ChatExport,number
