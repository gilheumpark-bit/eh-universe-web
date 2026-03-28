// ============================================================
// Code Studio — IndexedDB Persistence Layer
// ============================================================

import type { FileNode, CodeStudioSettings } from './code-studio-types';
import { DEFAULT_SETTINGS } from './code-studio-types';

const DB_NAME = 'eh-code-studio';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_SETTINGS = 'settings';
const STORE_CHAT = 'chat';

// ============================================================
// PART 1 — DB Connection
// ============================================================

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No IndexedDB in SSR'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES);
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS);
      if (!db.objectStoreNames.contains(STORE_CHAT)) db.createObjectStore(STORE_CHAT);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store: string, key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================
// PART 2 — File Tree Persistence
// ============================================================

export async function saveFileTree(tree: FileNode[]): Promise<void> {
  try { await dbPut(STORE_FILES, 'tree', tree); } catch { /* quota or unavailable */ }
}

export async function loadFileTree(): Promise<FileNode[] | null> {
  try { return (await dbGet<FileNode[]>(STORE_FILES, 'tree')) ?? null; } catch { return null; }
}

// ============================================================
// PART 3 — Settings Persistence
// ============================================================

export async function saveSettings(settings: CodeStudioSettings): Promise<void> {
  try { await dbPut(STORE_SETTINGS, 'config', settings); } catch { /* */ }
}

export async function loadSettings(): Promise<CodeStudioSettings> {
  try { return (await dbGet<CodeStudioSettings>(STORE_SETTINGS, 'config')) ?? DEFAULT_SETTINGS; } catch { return DEFAULT_SETTINGS; }
}

// ============================================================
// PART 4 — Chat History Persistence
// ============================================================

export interface StoredChatSession {
  id: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  createdAt: number;
  updatedAt: number;
}

export async function saveChatSession(session: StoredChatSession): Promise<void> {
  try { await dbPut(STORE_CHAT, session.id, session); } catch { /* */ }
}

export async function loadChatSession(id: string): Promise<StoredChatSession | null> {
  try { return (await dbGet<StoredChatSession>(STORE_CHAT, id)) ?? null; } catch { return null; }
}

export async function listChatSessions(): Promise<StoredChatSession[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAT, 'readonly');
      const req = tx.objectStore(STORE_CHAT).getAll();
      req.onsuccess = () => resolve((req.result as StoredChatSession[]).sort((a, b) => b.updatedAt - a.updatedAt));
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

// IDENTITY_SEAL: PART-1 | role=DBConnection | inputs=none | outputs=IDBDatabase
// IDENTITY_SEAL: PART-2 | role=FilePersist | inputs=FileNode[] | outputs=void/FileNode[]
// IDENTITY_SEAL: PART-3 | role=SettingsPersist | inputs=settings | outputs=void/settings
// IDENTITY_SEAL: PART-4 | role=ChatPersist | inputs=session | outputs=void/sessions
