// ============================================================
// Code Studio — IndexedDB Persistence Layer
// ============================================================

import type { FileNode, CodeStudioSettings } from './code-studio-types';
import { DEFAULT_SETTINGS } from './code-studio-types';

const DB_NAME = 'eh-code-studio';
const DB_VERSION = 2;
const STORE_FILES = 'files';
const STORE_SETTINGS = 'settings';
const STORE_CHAT = 'chat';
const STORE_VERSIONS = 'versions';
const STORE_PROJECTS = 'projects';
const STORE_RECENT = 'recent';

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
      if (!db.objectStoreNames.contains(STORE_VERSIONS)) db.createObjectStore(STORE_VERSIONS);
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) db.createObjectStore(STORE_PROJECTS);
      if (!db.objectStoreNames.contains(STORE_RECENT)) db.createObjectStore(STORE_RECENT);
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

// ============================================================
// PART 5 — Version History (max 30 per file)
// ============================================================

export interface FileVersion {
  id: string;
  fileId: string;
  content: string;
  timestamp: number;
}

const MAX_VERSIONS_PER_FILE = 30;

export async function saveFileVersion(fileId: string, content: string): Promise<void> {
  try {
    const versions = await getFileVersions(fileId);
    const newVersion: FileVersion = {
      id: `${fileId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileId,
      content,
      timestamp: Date.now(),
    };
    versions.push(newVersion);
    // 오래된 버전 제거 (최대 30개 유지)
    const trimmed = versions.length > MAX_VERSIONS_PER_FILE
      ? versions.slice(versions.length - MAX_VERSIONS_PER_FILE)
      : versions;
    await dbPut(STORE_VERSIONS, fileId, trimmed);
  } catch { /* quota or unavailable */ }
}

export async function getFileVersions(fileId: string): Promise<FileVersion[]> {
  try {
    return (await dbGet<FileVersion[]>(STORE_VERSIONS, fileId)) ?? [];
  } catch { return []; }
}

export async function restoreFileVersion(fileId: string, versionId: string): Promise<string | null> {
  try {
    const versions = await getFileVersions(fileId);
    const target = versions.find(v => v.id === versionId);
    return target?.content ?? null;
  } catch { return null; }
}

// IDENTITY_SEAL: PART-5 | role=VersionHistory | inputs=fileId,content | outputs=FileVersion[]/string

// ============================================================
// PART 6 — Multi-Project Support
// ============================================================

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  fileCount: number;
}

async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listProjects(): Promise<ProjectMetadata[]> {
  try {
    const all = await dbGetAll<ProjectMetadata>(STORE_PROJECTS);
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch { return []; }
}

export async function createProject(name: string): Promise<ProjectMetadata> {
  const project: ProjectMetadata = {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fileCount: 0,
  };
  await dbPut(STORE_PROJECTS, project.id, project);
  // 새 프로젝트용 빈 파일 트리 생성
  await dbPut(STORE_FILES, `tree-${project.id}`, []);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await dbDelete(STORE_PROJECTS, id);
    await dbDelete(STORE_FILES, `tree-${id}`);
  } catch { /* */ }
}

export async function switchProject(id: string): Promise<FileNode[] | null> {
  try {
    const project = await dbGet<ProjectMetadata>(STORE_PROJECTS, id);
    if (!project) return null;
    // 프로젝트별 파일 트리 로드
    const tree = await dbGet<FileNode[]>(STORE_FILES, `tree-${id}`);
    return tree ?? [];
  } catch { return null; }
}

export async function saveProjectFileTree(projectId: string, tree: FileNode[]): Promise<void> {
  try {
    await dbPut(STORE_FILES, `tree-${projectId}`, tree);
    // 프로젝트 메타데이터 업데이트
    const project = await dbGet<ProjectMetadata>(STORE_PROJECTS, projectId);
    if (project) {
      project.updatedAt = Date.now();
      project.fileCount = countFiles(tree);
      await dbPut(STORE_PROJECTS, projectId, project);
    }
  } catch { /* */ }
}

function countFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'file') count++;
    if (node.children) count += countFiles(node.children);
  }
  return count;
}

// IDENTITY_SEAL: PART-6 | role=MultiProject | inputs=projectId,name | outputs=ProjectMetadata[]/FileNode[]

// ============================================================
// PART 7 — Recent Files (max 20)
// ============================================================

interface RecentFileEntry {
  fileId: string;
  fileName: string;
  timestamp: number;
}

const MAX_RECENT_FILES = 20;
const RECENT_KEY = 'recent-files';

export async function trackRecentFile(fileId: string, fileName: string): Promise<void> {
  try {
    const recents = await getRecentFiles();
    // 중복 제거
    const filtered = recents.filter(r => r.fileId !== fileId);
    filtered.unshift({ fileId, fileName, timestamp: Date.now() });
    const trimmed = filtered.slice(0, MAX_RECENT_FILES);
    await dbPut(STORE_RECENT, RECENT_KEY, trimmed);
  } catch { /* */ }
}

export async function getRecentFiles(): Promise<{ fileId: string; fileName: string; timestamp: number }[]> {
  try {
    return (await dbGet<RecentFileEntry[]>(STORE_RECENT, RECENT_KEY)) ?? [];
  } catch { return []; }
}

// IDENTITY_SEAL: PART-7 | role=RecentFiles | inputs=fileId,fileName | outputs=RecentFileEntry[]

// IDENTITY_SEAL: PART-1 | role=DBConnection | inputs=none | outputs=IDBDatabase
// IDENTITY_SEAL: PART-2 | role=FilePersist | inputs=FileNode[] | outputs=void/FileNode[]
// IDENTITY_SEAL: PART-3 | role=SettingsPersist | inputs=settings | outputs=void/settings
// IDENTITY_SEAL: PART-4 | role=ChatPersist | inputs=session | outputs=void/sessions
