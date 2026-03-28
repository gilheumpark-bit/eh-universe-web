// ============================================================
// Chat History Persistence (IndexedDB)
// Save and restore chat sessions, following the fs-store.ts pattern
// ============================================================

import type { ChatMessage } from '@/lib/types';

export interface ChatSession {
  id: string;
  title: string;           // auto-generated from first message
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'csl-ide-chat';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const store = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save or update a chat session.
 */
export async function saveChatSession(session: ChatSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    tx.objectStore(SESSIONS_STORE).put({
      ...session,
      updatedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load a single chat session by ID.
 */
export async function loadChatSession(id: string): Promise<ChatSession | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readonly');
    const req = tx.objectStore(SESSIONS_STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * List all chat sessions, sorted by most recently updated first.
 */
export async function listChatSessions(): Promise<ChatSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readonly');
    const index = tx.objectStore(SESSIONS_STORE).index('updatedAt');
    const req = index.getAll();
    req.onsuccess = () => {
      // IndexedDB index returns ascending; reverse for newest-first
      const sessions: ChatSession[] = req.result ?? [];
      sessions.reverse();
      resolve(sessions);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a chat session by ID.
 */
export async function deleteChatSession(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    tx.objectStore(SESSIONS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Rename a chat session by ID.
 */
export async function renameChatSession(id: string, title: string): Promise<void> {
  const session = await loadChatSession(id);
  if (!session) return;
  return saveChatSession({ ...session, title });
}

/**
 * Format a timestamp into a relative time string (Korean).
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Generate a short title from the first user message in a session.
 * Truncates to a reasonable length for display in a sidebar.
 */
export function generateSessionTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New Chat';

  const content = firstUserMsg.content.trim();
  if (!content) return 'New Chat';

  // Strip markdown formatting for a cleaner title
  const cleaned = content
    .replace(/```[\s\S]*?```/g, 'code')  // code blocks -> "code"
    .replace(/`[^`]+`/g, 'code')          // inline code -> "code"
    .replace(/[#*_~>\[\]]/g, '')          // markdown symbols
    .replace(/\n+/g, ' ')                 // newlines -> spaces
    .trim();

  const MAX_TITLE_LENGTH = 50;
  if (cleaned.length <= MAX_TITLE_LENGTH) return cleaned;
  return cleaned.slice(0, MAX_TITLE_LENGTH).trimEnd() + '...';
}
