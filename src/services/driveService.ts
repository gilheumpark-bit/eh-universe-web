// ============================================================
// PART 0: GOOGLE DRIVE SERVICE — REST API v3 (fetch-based)
// ============================================================

import { logger } from '@/lib/logger';
import { Project } from '@/lib/studio-types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'NOA Studio';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const ENCRYPTION_PREFIX = 'NOA_ENC:1:';

// ============================================================
// PART 0.5: CLIENT-SIDE ENCRYPTION (AES-GCM via Web Crypto)
// ============================================================

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('noa-studio-drive-v1'), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

async function encryptData(data: string, passphrase: string): Promise<string> {
  const key = await getCachedKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  // Format: PREFIX + base64(iv + ciphertext)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return ENCRYPTION_PREFIX + btoa(String.fromCharCode(...combined));
}

async function decryptData(stored: string, passphrase: string): Promise<string> {
  if (!stored.startsWith(ENCRYPTION_PREFIX)) return stored; // 미암호화 데이터 호환
  const raw = atob(stored.slice(ENCRYPTION_PREFIX.length));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const key = await getCachedKey(passphrase);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// Encryption passphrase = user UID (설정 가능)
let _encryptionPassphrase: string | null = null;

/** Cached derived CryptoKey to avoid re-running PBKDF2 on every call */
let _cachedDerivedKey: CryptoKey | null = null;
let _cachedPassphrase: string | null = null;

async function getCachedKey(passphrase: string): Promise<CryptoKey> {
  if (_cachedDerivedKey && _cachedPassphrase === passphrase) return _cachedDerivedKey;
  _cachedDerivedKey = await deriveKey(passphrase);
  _cachedPassphrase = passphrase;
  return _cachedDerivedKey;
}

export function setDriveEncryptionKey(uid: string): void {
  const next = `noa:${uid}`;
  if (_encryptionPassphrase !== next) {
    _cachedDerivedKey = null;
    _cachedPassphrase = null;
  }
  _encryptionPassphrase = next;
}

/** Returns the current encryption status */
export function getEncryptionStatus(): { active: boolean; method: 'AES-GCM-256' | 'none' } {
  if (_encryptionPassphrase) return { active: true, method: 'AES-GCM-256' };
  return { active: false, method: 'none' };
}

/** Checks if data starts with the NOA encryption prefix */
export function isDataEncrypted(data: string): boolean {
  return data.startsWith(ENCRYPTION_PREFIX);
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface SyncResult {
  merged: Project[];
  uploaded: number;
  downloaded: number;
  conflicts: ConflictInfo[];
  failedCount: number;
}

export interface ConflictInfo {
  projectId: string;
  projectName: string;
  localUpdate: number;
  remoteUpdate: number;
}

// ============================================================
// PART 1: FOLDER MANAGEMENT
// ============================================================

/** Optional token refresh callback — set by callers to enable auto-retry on 401. */
let _tokenRefresher: (() => Promise<string | null>) | null = null;

export function setTokenRefresher(fn: (() => Promise<string | null>) | null): void {
  _tokenRefresher = fn;
}

async function driveRequest(url: string, token: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  // Auto-retry on 401 with refreshed token
  if (res.status === 401 && _tokenRefresher) {
    const newToken = await _tokenRefresher();
    if (newToken && newToken !== token) {
      return fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newToken}`,
          ...(options.headers ?? {}),
        },
      });
    }
  }

  return res;
}

/**
 * Get or create the "NOA Studio" app folder in user's Drive.
 * Uses module-level cache to prevent TOCTOU race (concurrent calls creating duplicate folders).
 */
let _folderPromise: Promise<string> | null = null;

export async function getOrCreateAppFolder(token: string): Promise<string> {
  // Deduplicate concurrent calls — only the first call actually hits Drive API
  if (_folderPromise) return _folderPromise;

  _folderPromise = (async () => {
    try {
      // Search for existing folder
      const query = `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`;
      const searchRes = await driveRequest(
        `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
        token,
      );
      if (!searchRes.ok) throw new Error(`Drive search failed: ${searchRes.status}`);
      const searchData = await searchRes.json();

      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }

      // Create folder
      const createRes = await driveRequest(`${DRIVE_API}/files`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
      });
      if (!createRes.ok) throw new Error(`Drive folder creation failed: ${createRes.status}`);
      const created = await createRes.json();
      return created.id as string;
    } finally {
      // Clear cache after completion so next call with fresh token works
      _folderPromise = null;
    }
  })();

  return _folderPromise;
}

// ============================================================
// PART 2: FILE CRUD
// ============================================================

/**
 * List all JSON files in the NOA Studio folder.
 */
export async function listProjectFiles(token: string, folderId: string): Promise<DriveFile[]> {
  const query = `'${folderId}' in parents and trashed=false and mimeType='application/json'`;
  const res = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
    token,
  );
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json();
  return data.files || [];
}

/**
 * Save (create or update) a project as JSON file.
 */
export async function saveProjectFile(
  token: string,
  folderId: string,
  project: Project,
  existingFileId?: string,
): Promise<string> {
  const fileName = `${project.name}_${project.id}.json`;
  const plainJson = JSON.stringify(project);
  // 암호화 키가 설정되어 있으면 AES-GCM 암호화, 아니면 평문
  const jsonContent = _encryptionPassphrase
    ? await encryptData(plainJson, _encryptionPassphrase)
    : plainJson;

  if (existingFileId) {
    // Update existing file
    const boundary = '---noa-boundary-' + Date.now();
    const metadata = JSON.stringify({ name: fileName });
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${jsonContent}\r\n` +
      `--${boundary}--`;

    const res = await driveRequest(
      `${UPLOAD_API}/files/${existingFileId}?uploadType=multipart`,
      token,
      {
        method: 'PATCH',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      },
    );
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`);
    const data = await res.json();
    return data.id;
  }

  // Create new file
  const boundary = '---noa-boundary-' + Date.now();
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${jsonContent}\r\n` +
    `--${boundary}--`;

  const res = await driveRequest(
    `${UPLOAD_API}/files?uploadType=multipart`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

/**
 * Load a project from a Drive file.
 */
export async function loadProjectFile(token: string, fileId: string): Promise<Project> {
  const res = await driveRequest(`${DRIVE_API}/files/${fileId}?alt=media`, token);
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
  const rawText = await res.text();
  // 암호화된 데이터면 복호화, 아니면 그대로 파싱
  const jsonText = (_encryptionPassphrase && rawText.startsWith(ENCRYPTION_PREFIX))
    ? await decryptData(rawText, _encryptionPassphrase)
    : rawText;
  return JSON.parse(jsonText) as Project;
}

/**
 * Delete a project file from Drive.
 */
export async function deleteProjectFile(token: string, fileId: string): Promise<void> {
  const res = await driveRequest(`${DRIVE_API}/files/${fileId}`, token, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Drive delete failed: ${res.status}`);
}

// ============================================================
// PART 3: SYNC ENGINE
// ============================================================

/**
 * Sync local projects with Google Drive.
 * Strategy: last-write-wins with conflict detection.
 */
export async function syncAllProjects(
  token: string,
  localProjects: Project[],
): Promise<SyncResult> {
  const folderId = await getOrCreateAppFolder(token);
  const remoteFiles = await listProjectFiles(token, folderId);

  const merged: Project[] = [...localProjects];
  const conflicts: ConflictInfo[] = [];
  let uploaded = 0;
  let downloaded = 0;
  let failedCount = 0;

  // Map remote files by project ID (extracted from filename: name_projectId.json)
  const remoteMap = new Map<string, DriveFile>();
  for (const file of remoteFiles) {
    const match = file.name.match(/_([^_]+)\.json$/);
    if (match) {
      remoteMap.set(match[1], file);
    }
  }

  // Track which remote files we've processed
  const processedRemoteIds = new Set<string>();

  // Compare each local project — build tasks first, then execute in parallel
  type SyncTask = { type: 'upload'; index: number; fileId?: string } | { type: 'download'; index: number; fileId: string } | { type: 'conflict'; info: ConflictInfo };
  const tasks: SyncTask[] = [];

  for (let i = 0; i < merged.length; i++) {
    const local = merged[i];
    const remoteFile = remoteMap.get(local.id);

    if (!remoteFile) {
      tasks.push({ type: 'upload', index: i });
      continue;
    }

    processedRemoteIds.add(local.id);
    const remoteTime = new Date(remoteFile.modifiedTime).getTime();

    if (local.lastUpdate > remoteTime + 5000) {
      tasks.push({ type: 'upload', index: i, fileId: remoteFile.id });
    } else if (remoteTime > local.lastUpdate + 5000) {
      tasks.push({ type: 'download', index: i, fileId: remoteFile.id });
    } else if (Math.abs(local.lastUpdate - remoteTime) <= 5000 && local.lastUpdate !== remoteTime) {
      tasks.push({ type: 'conflict', info: { projectId: local.id, projectName: local.name, localUpdate: local.lastUpdate, remoteUpdate: remoteTime } });
    }
  }

  // Execute uploads/downloads in parallel (batched by 5 to respect rate limits)
  const BATCH_SIZE = 5;
  for (let b = 0; b < tasks.length; b += BATCH_SIZE) {
    const batch = tasks.slice(b, b + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(async (task) => {
      if (task.type === 'upload') {
        await saveProjectFile(token, folderId, merged[task.index], task.fileId);
        uploaded++;
      } else if (task.type === 'download') {
        const remote = await loadProjectFile(token, task.fileId);
        merged[task.index] = remote;
        downloaded++;
      } else {
        conflicts.push(task.info);
      }
    }));
    for (const r of results) {
      if (r.status === 'rejected') {
        failedCount++;
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Drive Sync', 'Batch task failed:', r.reason);
        }
      }
    }
  }

  // Remote-only projects — download in parallel
  const remoteOnly = [...remoteMap.entries()].filter(([pid]) => !processedRemoteIds.has(pid));
  if (remoteOnly.length > 0) {
    const dlResults = await Promise.allSettled(remoteOnly.map(async ([, file]) => {
      const remote = await loadProjectFile(token, file.id);
      merged.push(remote);
      downloaded++;
    }));
    for (const r of dlResults) {
      if (r.status === 'rejected') {
        failedCount++;
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Drive Sync', 'Remote download failed:', r.reason);
        }
      }
    }
  }

  return { merged, uploaded, downloaded, conflicts, failedCount };
}

// NOTE: API key sync to Drive has been intentionally removed.
// API keys are stored only in device-local localStorage (obfuscated).
// Syncing secrets to Drive (even obfuscated) is a security anti-pattern.
