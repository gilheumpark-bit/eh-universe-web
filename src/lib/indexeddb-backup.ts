// ============================================================
// PART 1 — Core IndexedDB Backup (existing)
// ============================================================

import type { Project } from '@/lib/studio-types';

const DB_NAME = 'noa_backup';
const DB_VERSION = 2;
const STORE_NAME = 'projects';
const VERSIONED_STORE = 'versioned_backups';
const MAX_VERSIONED_BACKUPS = 5;

/** @returns True if IndexedDB API is available in the current environment */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(VERSIONED_STORE)) {
          db.createObjectStore(VERSIONED_STORE, { keyPath: 'timestamp' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Write all projects to IndexedDB as a full backup. @returns True on success */
export async function backupToIndexedDB(projects: Project[]): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.clear();
      for (const project of projects) {
        store.put(project);
      }

      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

/** Restore all projects from the IndexedDB backup store. @returns Project array or null if unavailable */
export async function restoreFromIndexedDB(): Promise<Project[] | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        const results = request.result as Project[];
        resolve(results.length > 0 ? results : null);
      };
      request.onerror = () => { db.close(); resolve(null); };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

// IDENTITY_SEAL: PART-1 | role=core backup | inputs=Project[] | outputs=boolean

// ============================================================
// PART 2 — Versioned Backup (timestamped, max 5 rotations)
// ============================================================

export interface VersionedBackup {
  timestamp: number;
  label: string;
  projects: Project[];
}

/** Save a timestamped backup, rotating oldest if over MAX_VERSIONED_BACKUPS */
export async function saveVersionedBackup(projects: Project[]): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(VERSIONED_STORE, 'readwrite');
      const store = tx.objectStore(VERSIONED_STORE);

      const now = Date.now();
      const label = new Date(now).toLocaleString();

      // Get all existing backups to enforce rotation
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const existing = (getAllReq.result as VersionedBackup[])
          .sort((a, b) => a.timestamp - b.timestamp);

        // Remove oldest if at capacity
        const toRemove = existing.length >= MAX_VERSIONED_BACKUPS
          ? existing.slice(0, existing.length - MAX_VERSIONED_BACKUPS + 1)
          : [];

        for (const old of toRemove) {
          store.delete(old.timestamp);
        }

        store.put({ timestamp: now, label, projects });
      };

      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

/** List all versioned backups (newest first) */
export async function listVersionedBackups(): Promise<VersionedBackup[]> {
  const db = await openDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(VERSIONED_STORE, 'readonly');
      const store = tx.objectStore(VERSIONED_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        const results = (request.result as VersionedBackup[])
          .sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => { db.close(); resolve([]); };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

/** Restore from a specific versioned backup by timestamp */
export async function restoreVersionedBackup(timestamp: number): Promise<Project[] | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(VERSIONED_STORE, 'readonly');
      const store = tx.objectStore(VERSIONED_STORE);
      const request = store.get(timestamp);

      request.onsuccess = () => {
        db.close();
        const backup = request.result as VersionedBackup | undefined;
        resolve(backup?.projects ?? null);
      };
      request.onerror = () => { db.close(); resolve(null); };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

// IDENTITY_SEAL: PART-2 | role=versioned backup | inputs=Project[],timestamp | outputs=VersionedBackup[]
