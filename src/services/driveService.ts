// ============================================================
// PART 0: GOOGLE DRIVE SERVICE — REST API v3 (fetch-based)
// ============================================================

import { Project } from '@/lib/studio-types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'NOA Studio';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

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
  const jsonContent = JSON.stringify(project);

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
  return await res.json();
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

  // Compare each local project
  for (let i = 0; i < merged.length; i++) {
    const local = merged[i];
    const remoteFile = remoteMap.get(local.id);

    if (!remoteFile) {
      // Local only — upload
      await saveProjectFile(token, folderId, local);
      uploaded++;
      continue;
    }

    processedRemoteIds.add(local.id);
    const remoteTime = new Date(remoteFile.modifiedTime).getTime();

    if (local.lastUpdate > remoteTime + 5000) {
      // Local is newer — upload
      await saveProjectFile(token, folderId, local, remoteFile.id);
      uploaded++;
    } else if (remoteTime > local.lastUpdate + 5000) {
      // Remote is newer — download
      const remote = await loadProjectFile(token, remoteFile.id);
      merged[i] = remote;
      downloaded++;
    } else if (Math.abs(local.lastUpdate - remoteTime) <= 5000 && local.lastUpdate !== remoteTime) {
      // Within tolerance but not identical — record as conflict for visibility
      conflicts.push({
        projectId: local.id,
        projectName: local.name,
        localUpdate: local.lastUpdate,
        remoteUpdate: remoteTime,
      });
    }
    // Exactly same — skip
  }

  // Remote-only projects — download
  for (const [projectId, file] of remoteMap) {
    if (!processedRemoteIds.has(projectId)) {
      try {
        const remote = await loadProjectFile(token, file.id);
        merged.push(remote);
        downloaded++;
      } catch (err) {
        console.warn(`[Drive Sync] Skipped corrupted remote file: ${file.name} (${file.id})`, err);
      }
    }
  }

  return { merged, uploaded, downloaded, conflicts };
}

// NOTE: API key sync to Drive has been intentionally removed.
// API keys are stored only in device-local localStorage (obfuscated).
// Syncing secrets to Drive (even obfuscated) is a security anti-pattern.
