// ============================================================
// Code Studio — File Drag-Drop
// ============================================================
// 드롭 이벤트 핸들링, 파일 내용 읽기, FileNode 생성, 폴더 재귀 처리.

import type { FileNode } from './code-studio-types';
import { detectLanguage } from './code-studio-types';
import { isBinaryFile } from './code-studio-file-icons';

// ============================================================
// PART 1 — Types & Helpers
// ============================================================

export interface DropResult {
  files: FileNode[];
  skippedBinary: string[];
  errors: string[];
}

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Read a File object as text */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

// IDENTITY_SEAL: PART-1 | role=TypesHelpers | inputs=File | outputs=string

// ============================================================
// PART 2 — Drop Event Processing
// ============================================================

/** Process a browser DragEvent and extract FileNode entries */
export async function processFileDrop(event: DragEvent): Promise<DropResult> {
  const result: DropResult = { files: [], skippedBinary: [], errors: [] };
  const dt = event.dataTransfer;
  if (!dt) return result;

  // Try using DataTransferItem API for folder support
  if (dt.items && dt.items.length > 0) {
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      // webkitGetAsEntry is available in modern browsers
      const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    if (entries.length > 0) {
      for (const entry of entries) {
        try {
          const node = await processEntry(entry, result);
          if (node) result.files.push(node);
        } catch (e) {
          result.errors.push(`Failed to process ${entry.name}: ${e instanceof Error ? e.message : 'unknown'}`);
        }
      }
      return result;
    }
  }

  // Fallback: flat file list (no folder structure)
  for (const file of Array.from(dt.files)) {
    if (isBinaryFile(file.name)) {
      result.skippedBinary.push(file.name);
      continue;
    }
    try {
      const content = await readFileAsText(file);
      result.files.push({
        id: generateId(),
        name: file.name,
        type: 'file',
        content,
        language: detectLanguage(file.name),
      });
    } catch (e) {
      result.errors.push(`Failed to read ${file.name}: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  return result;
}

/** Process a FileSystemEntry recursively */
async function processEntry(entry: FileSystemEntry, result: DropResult): Promise<FileNode | null> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });

    if (isBinaryFile(file.name)) {
      result.skippedBinary.push(file.name);
      return null;
    }

    const content = await readFileAsText(file);
    return {
      id: generateId(),
      name: file.name,
      type: 'file',
      content,
      language: detectLanguage(file.name),
    };
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const dirReader = dirEntry.createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      dirReader.readEntries(resolve, reject);
    });

    const children: FileNode[] = [];
    for (const child of entries) {
      // Skip hidden files and node_modules
      if (child.name.startsWith('.') || child.name === 'node_modules') continue;
      const node = await processEntry(child, result);
      if (node) children.push(node);
    }

    return {
      id: generateId(),
      name: entry.name,
      type: 'folder',
      children,
    };
  }

  return null;
}

// IDENTITY_SEAL: PART-2 | role=DropProcessing | inputs=DragEvent | outputs=DropResult

// ============================================================
// PART 3 — Drop Zone Helpers
// ============================================================

/** Prevent default on drag events (required for drop to work) */
export function handleDragOver(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

/** Check if a drag event contains files */
export function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false;
}

// IDENTITY_SEAL: PART-3 | role=DropZoneHelpers | inputs=DragEvent | outputs=void,boolean
