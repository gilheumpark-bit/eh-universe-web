// ============================================================
// IndexedDB-based Virtual File System — Multi-Project with Versioning
// ============================================================

import type { FileNode } from "./types";

const DB_NAME = "csl-ide-fs";
const DB_VERSION = 2;
const FILES_STORE = "files";
const PROJECTS_STORE = "projects";
const VERSIONS_STORE = "versions";
const RECENT_STORE = "recent";

const MAX_VERSIONS_PER_FILE = 30;
const MAX_RECENT_FILES = 20;

let dbInstance: IDBDatabase | null = null;
let currentProjectId: string = "default";

// ── Types ──

export interface StoredFile {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  type: "file" | "folder";
  content: string;
  binaryData?: ArrayBuffer;
  isBinary: boolean;
  language: string;
  updatedAt: number;
}

export interface FileVersion {
  id: string;
  fileId: string;
  projectId: string;
  content: string;
  binaryData?: ArrayBuffer;
  isBinary: boolean;
  timestamp: number;
  author: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  fileCount: number;
}

export interface RecentFileEntry {
  id: string;          // compound: projectId + fileId
  projectId: string;
  fileId: string;
  fileName: string;
  filePath: string;
  openedAt: number;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  warning: boolean;
}

// ── Database ──

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const store = db.createObjectStore(FILES_STORE, { keyPath: "id" });
          store.createIndex("projectId", "projectId", { unique: false });
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(VERSIONS_STORE)) {
          const vStore = db.createObjectStore(VERSIONS_STORE, { keyPath: "id" });
          vStore.createIndex("fileId", "fileId", { unique: false });
          vStore.createIndex("projectId", "projectId", { unique: false });
          vStore.createIndex("timestamp", "timestamp", { unique: false });
        }
        if (!db.objectStoreNames.contains(RECENT_STORE)) {
          const rStore = db.createObjectStore(RECENT_STORE, { keyPath: "id" });
          rStore.createIndex("projectId", "projectId", { unique: false });
          rStore.createIndex("openedAt", "openedAt", { unique: false });
        }
      }
    };

    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── IDB Helpers ──

function idbPut<T>(storeName: string, value: T): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbDelete(storeName: string, key: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function idbGetAll<T>(storeName: string): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbGetAllByIndex<T>(
  storeName: string,
  indexName: string,
  key: IDBValidKey,
): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const index = tx.objectStore(storeName).index(indexName);
        const req = index.getAll(key);
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

// ── Current Project ──

export function getCurrentProjectId(): string {
  return currentProjectId;
}

// ── Project CRUD ──

export async function createProject(
  name: string,
  opts: { description?: string; tags?: string[] } = {},
): Promise<ProjectMetadata> {
  const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const meta: ProjectMetadata = {
    id,
    name,
    description: opts.description ?? "",
    tags: opts.tags ?? [],
    createdAt: now,
    updatedAt: now,
    fileCount: 0,
  };
  await idbPut(PROJECTS_STORE, meta);
  return meta;
}

export async function listProjects(): Promise<ProjectMetadata[]> {
  const all = await idbGetAll<ProjectMetadata>(PROJECTS_STORE);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(
  projectId: string,
): Promise<ProjectMetadata | undefined> {
  return idbGet<ProjectMetadata>(PROJECTS_STORE, projectId);
}

export async function updateProjectMetadata(
  projectId: string,
  updates: Partial<Pick<ProjectMetadata, "name" | "description" | "tags">>,
): Promise<void> {
  const existing = await idbGet<ProjectMetadata>(PROJECTS_STORE, projectId);
  if (!existing) throw new Error(`Project ${projectId} not found`);
  await idbPut(PROJECTS_STORE, {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await openDB();

  // Delete all files for the project
  const files = await idbGetAllByIndex<StoredFile>(
    FILES_STORE,
    "projectId",
    projectId,
  );
  // Delete all versions for the project
  const versions = await idbGetAllByIndex<FileVersion>(
    VERSIONS_STORE,
    "projectId",
    projectId,
  );
  // Delete all recent entries for the project
  const recent = await idbGetAllByIndex<RecentFileEntry>(
    RECENT_STORE,
    "projectId",
    projectId,
  );

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [FILES_STORE, VERSIONS_STORE, RECENT_STORE, PROJECTS_STORE],
      "readwrite",
    );
    const fileStore = tx.objectStore(FILES_STORE);
    const versionStore = tx.objectStore(VERSIONS_STORE);
    const recentStore = tx.objectStore(RECENT_STORE);
    const projectStore = tx.objectStore(PROJECTS_STORE);

    for (const f of files) fileStore.delete(f.id);
    for (const v of versions) versionStore.delete(v.id);
    for (const r of recent) recentStore.delete(r.id);
    projectStore.delete(projectId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function switchProject(projectId: string): Promise<void> {
  const meta = await idbGet<ProjectMetadata>(PROJECTS_STORE, projectId);
  if (!meta) throw new Error(`Project ${projectId} not found`);
  currentProjectId = projectId;
}

// ── File Operations ──

export async function saveFile(file: StoredFile): Promise<void> {
  const updated: StoredFile = {
    ...file,
    isBinary: file.isBinary ?? false,
    updatedAt: Date.now(),
  };
  await idbPut(FILES_STORE, updated);

  // Update project metadata
  await touchProject(file.projectId);
}

export async function deleteFile(id: string): Promise<void> {
  await idbDelete(FILES_STORE, id);
}

export async function loadProjectFiles(
  projectId: string,
): Promise<StoredFile[]> {
  return idbGetAllByIndex<StoredFile>(FILES_STORE, "projectId", projectId);
}

async function touchProject(projectId: string): Promise<void> {
  const meta = await idbGet<ProjectMetadata>(PROJECTS_STORE, projectId);
  if (meta) {
    const files = await loadProjectFiles(projectId);
    await idbPut(PROJECTS_STORE, {
      ...meta,
      updatedAt: Date.now(),
      fileCount: files.length,
    });
  }
}

// ── File Version History ──

export async function saveFileVersion(
  fileId: string,
  projectId: string,
  content: string,
  author: string = "user",
  binaryData?: ArrayBuffer,
): Promise<void> {
  const versionId = `ver_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const version: FileVersion = {
    id: versionId,
    fileId,
    projectId,
    content,
    binaryData,
    isBinary: !!binaryData,
    timestamp: Date.now(),
    author,
  };
  await idbPut(VERSIONS_STORE, version);

  // Prune old versions beyond the limit
  const all = await idbGetAllByIndex<FileVersion>(
    VERSIONS_STORE,
    "fileId",
    fileId,
  );
  if (all.length > MAX_VERSIONS_PER_FILE) {
    const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
    const toDelete = sorted.slice(MAX_VERSIONS_PER_FILE);
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(VERSIONS_STORE, "readwrite");
      const store = tx.objectStore(VERSIONS_STORE);
      for (const v of toDelete) store.delete(v.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export async function getFileVersions(fileId: string): Promise<FileVersion[]> {
  const all = await idbGetAllByIndex<FileVersion>(
    VERSIONS_STORE,
    "fileId",
    fileId,
  );
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function restoreFileVersion(
  fileId: string,
  versionId: string,
): Promise<string> {
  const version = await idbGet<FileVersion>(VERSIONS_STORE, versionId);
  if (!version || version.fileId !== fileId) {
    throw new Error("Version not found");
  }

  // Load the current file and update its content
  const file = await idbGet<StoredFile>(FILES_STORE, fileId);
  if (file) {
    await saveFile({
      ...file,
      content: version.content,
      binaryData: version.binaryData,
      isBinary: version.isBinary,
    });
  }

  return version.content;
}

// ── Recent Files ──

export async function trackRecentFile(
  projectId: string,
  fileId: string,
  fileName: string,
  filePath: string,
): Promise<void> {
  const entryId = `${projectId}:${fileId}`;
  const entry: RecentFileEntry = {
    id: entryId,
    projectId,
    fileId,
    fileName,
    filePath,
    openedAt: Date.now(),
  };
  await idbPut(RECENT_STORE, entry);

  // Prune to MAX_RECENT_FILES per project
  const all = await idbGetAllByIndex<RecentFileEntry>(
    RECENT_STORE,
    "projectId",
    projectId,
  );
  if (all.length > MAX_RECENT_FILES) {
    const sorted = all.sort((a, b) => b.openedAt - a.openedAt);
    const toDelete = sorted.slice(MAX_RECENT_FILES);
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RECENT_STORE, "readwrite");
      const store = tx.objectStore(RECENT_STORE);
      for (const r of toDelete) store.delete(r.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export async function getRecentFiles(
  projectId: string,
): Promise<RecentFileEntry[]> {
  const all = await idbGetAllByIndex<RecentFileEntry>(
    RECENT_STORE,
    "projectId",
    projectId,
  );
  return all.sort((a, b) => b.openedAt - a.openedAt);
}

// ── Tree Builder ──

export function buildFileTree(files: StoredFile[]): FileNode[] {
  const nodeMap = new Map<string, FileNode>();

  for (const f of files) {
    nodeMap.set(f.id, {
      id: f.id,
      name: f.name,
      type: f.type,
      content: f.type === "file" ? (f.isBinary ? `[binary: ${f.name}]` : f.content) : undefined,
      children: f.type === "folder" ? [] : undefined,
    });
  }

  const roots: FileNode[] = [];
  for (const f of files) {
    const node = nodeMap.get(f.id)!;
    if (f.parentId && nodeMap.has(f.parentId)) {
      nodeMap.get(f.parentId)!.children?.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ── Flatten tree to StoredFile[] ──

export function flattenTree(
  nodes: FileNode[],
  projectId: string,
  parentId: string | null = null,
): StoredFile[] {
  const result: StoredFile[] = [];

  for (const node of nodes) {
    result.push({
      id: node.id,
      projectId,
      parentId,
      name: node.name,
      type: node.type,
      content: node.content ?? "",
      isBinary: false,
      language: node.type === "file" ? detectLanguage(node.name) : "",
      updatedAt: Date.now(),
    });

    if (node.children) {
      result.push(...flattenTree(node.children, projectId, node.id));
    }
  }

  return result;
}

// ── Binary File Helpers ──

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "bmp", "ico", "webp", "svg",
  "woff", "woff2", "ttf", "otf", "eot",
  "pdf", "zip", "gz", "tar",
  "mp3", "wav", "ogg", "mp4", "webm",
]);

export function isBinaryFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_EXTENSIONS.has(ext);
}

export async function saveBinaryFile(
  projectId: string,
  parentId: string | null,
  name: string,
  data: ArrayBuffer,
): Promise<StoredFile> {
  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const file: StoredFile = {
    id,
    projectId,
    parentId,
    name,
    type: "file",
    content: "",
    binaryData: data,
    isBinary: true,
    language: detectLanguage(name),
    updatedAt: Date.now(),
  };
  await idbPut(FILES_STORE, file);
  await touchProject(projectId);
  return file;
}

export async function getBinaryData(
  fileId: string,
): Promise<ArrayBuffer | undefined> {
  const file = await idbGet<StoredFile>(FILES_STORE, fileId);
  return file?.binaryData;
}

// ── Language Detection ──

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", java: "java", html: "html",
    css: "css", json: "json", md: "markdown", yaml: "yaml", yml: "yaml",
    sql: "sql", sh: "shell", bash: "shell", xml: "xml", svg: "xml",
    scss: "scss", less: "less", vue: "vue", svelte: "svelte",
    c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp",
    rb: "ruby", php: "php", swift: "swift", kt: "kotlin",
    toml: "toml", ini: "ini", env: "plaintext",
  };
  return map[ext] ?? "plaintext";
}

// ── Check if project exists ──

export async function hasProject(projectId: string): Promise<boolean> {
  const files = await loadProjectFiles(projectId);
  return files.length > 0;
}

// ── Save entire tree ──

export async function saveProjectTree(
  projectId: string,
  tree: FileNode[],
): Promise<void> {
  const files = flattenTree(tree, projectId);
  const db = await openDB();

  // Ensure project metadata exists
  const meta = await idbGet<ProjectMetadata>(PROJECTS_STORE, projectId);
  if (!meta) {
    await idbPut(PROJECTS_STORE, {
      id: projectId,
      name: projectId === "default" ? "Default Project" : projectId,
      description: "",
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileCount: files.length,
    } satisfies ProjectMetadata);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readwrite");
    const store = tx.objectStore(FILES_STORE);
    for (const f of files) store.put(f);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Storage Quota Management ──

export async function getStorageUsage(): Promise<StorageUsage> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const percent = quota > 0 ? (used / quota) * 100 : 0;
    return {
      usedBytes: used,
      quotaBytes: quota,
      percentUsed: Math.round(percent * 100) / 100,
      warning: percent > 80,
    };
  }
  // Fallback if Storage API is not available
  return {
    usedBytes: 0,
    quotaBytes: 0,
    percentUsed: 0,
    warning: false,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
