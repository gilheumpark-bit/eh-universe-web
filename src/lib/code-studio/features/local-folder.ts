// ============================================================
// Code Studio — Local Folder (File System Access API)
// ============================================================

import type { FileNode } from '../core/types';
import { detectLanguage } from '../core/types';

// ============================================================
// PART 1 — Types
// ============================================================

export interface LocalFolderHandle {
  name: string;
  handle: FileSystemDirectoryHandle;
  files: FileNode[];
  lastSyncAt: number;
}

export interface SyncChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=LocalFolderHandle,SyncChange

// ============================================================
// PART 2 — Directory Opening
// ============================================================

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function openLocalFolder(): Promise<LocalFolderHandle | null> {
  if (!isFileSystemAccessSupported()) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    const files = await readDirectory(handle);
    return { name: handle.name, handle, files, lastSyncAt: Date.now() };
  } catch {
    return null; // User cancelled or permission denied
  }
}

// IDENTITY_SEAL: PART-2 | role=directory opening | inputs=user action | outputs=LocalFolderHandle

// ============================================================
// PART 3 — Directory Reading
// ============================================================

const IGNORE_PATTERNS = [
  'node_modules', '.git', '.next', 'dist', 'build', '.cache',
  '.DS_Store', 'thumbs.db', '.env.local', '.env',
];

function shouldIgnore(name: string): boolean {
  return IGNORE_PATTERNS.includes(name) || name.startsWith('.');
}

async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  prefix = '',
  maxDepth = 5,
): Promise<FileNode[]> {
  if (maxDepth <= 0) return [];
  const nodes: FileNode[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (shouldIgnore(name)) continue;

    if (handle.kind === 'file') {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        if (file.size > 1024 * 1024) continue; // Skip files > 1MB
        const content = await file.text();
        nodes.push({
          id: `local_${prefix}${name}`,
          name,
          type: 'file',
          content,
          language: detectLanguage(name),
        });
      } catch {
        // Skip unreadable files
      }
    } else if (handle.kind === 'directory') {
      const children = await readDirectory(
        handle as FileSystemDirectoryHandle,
        `${prefix}${name}/`,
        maxDepth - 1,
      );
      nodes.push({
        id: `local_${prefix}${name}`,
        name,
        type: 'folder',
        children,
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// IDENTITY_SEAL: PART-3 | role=reading | inputs=FileSystemDirectoryHandle | outputs=FileNode[]

// ============================================================
// PART 4 — Write Back & Sync
// ============================================================

export async function writeFileToLocal(
  dirHandle: FileSystemDirectoryHandle,
  path: string,
  content: string,
): Promise<boolean> {
  try {
    const parts = path.split('/');
    let current = dirHandle;

    // Navigate to parent directory, creating dirs if needed
    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i], { create: true });
    }

    const fileName = parts[parts.length - 1];
    const fileHandle = await current.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function syncFromLocal(
  folder: LocalFolderHandle,
): Promise<{ files: FileNode[]; changes: SyncChange[] }> {
  const newFiles = await readDirectory(folder.handle);
  const changes = detectChanges(folder.files, newFiles);
  return { files: newFiles, changes };
}

function detectChanges(oldFiles: FileNode[], newFiles: FileNode[], prefix = ''): SyncChange[] {
  const changes: SyncChange[] = [];
  const oldMap = new Map(oldFiles.map((f) => [f.name, f]));
  const newMap = new Map(newFiles.map((f) => [f.name, f]));

  for (const [name, newNode] of newMap) {
    const path = prefix ? `${prefix}/${name}` : name;
    const oldNode = oldMap.get(name);
    if (!oldNode) {
      changes.push({ path, type: 'added' });
    } else if (newNode.type === 'file' && oldNode.type === 'file' && newNode.content !== oldNode.content) {
      changes.push({ path, type: 'modified' });
    }
    if (newNode.children && oldNode?.children) {
      changes.push(...detectChanges(oldNode.children, newNode.children, path));
    }
  }

  for (const name of oldMap.keys()) {
    if (!newMap.has(name)) {
      changes.push({ path: prefix ? `${prefix}/${name}` : name, type: 'deleted' });
    }
  }

  return changes;
}

// IDENTITY_SEAL: PART-4 | role=write & sync | inputs=LocalFolderHandle | outputs=FileNode[],SyncChange[]
