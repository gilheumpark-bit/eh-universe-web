// ============================================================
// Code Studio — File System Hook
// CRUD operations on FileNode tree, undo/redo file changes,
// watch for changes, persist to IndexedDB.
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { FileNode } from '@/lib/code-studio-types';
import { detectLanguage } from '@/lib/code-studio-types';
import { saveFileTree, loadFileTree } from '@/lib/code-studio-store';

interface UseCodeStudioFileSystemReturn {
  tree: FileNode[];
  setTree: (tree: FileNode[]) => void;
  createFile: (parentId: string | null, name: string, content?: string) => FileNode;
  createFolder: (parentId: string | null, name: string) => FileNode;
  deleteNode: (id: string) => void;
  renameNode: (id: string, newName: string) => void;
  updateContent: (id: string, content: string) => void;
  moveNode: (id: string, newParentId: string | null) => void;
  findNode: (id: string) => FileNode | null;
  findByPath: (path: string) => FileNode | null;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  persist: () => Promise<void>;
  load: () => Promise<void>;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=UseCodeStudioFileSystemReturn

// ============================================================
// PART 2 — Tree Utilities
// ============================================================

function generateId(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findInTree(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findByPathInTree(nodes: FileNode[], path: string): FileNode | null {
  const parts = path.split('/');
  let current = nodes;
  for (let i = 0; i < parts.length; i++) {
    const match = current.find((n) => n.name === parts[i]);
    if (!match) return null;
    if (i === parts.length - 1) return match;
    if (!match.children) return null;
    current = match.children;
  }
  return null;
}

function removeFromTree(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: n.children ? removeFromTree(n.children, id) : undefined,
    }));
}

function insertIntoTree(nodes: FileNode[], parentId: string | null, newNode: FileNode): FileNode[] {
  if (parentId === null) return [...nodes, newNode];
  return nodes.map((n) => {
    if (n.id === parentId && n.type === 'folder') {
      return { ...n, children: [...(n.children ?? []), newNode] };
    }
    return {
      ...n,
      children: n.children ? insertIntoTree(n.children, parentId, newNode) : undefined,
    };
  });
}

function updateInTree(nodes: FileNode[], id: string, updater: (node: FileNode) => FileNode): FileNode[] {
  return nodes.map((n) => {
    if (n.id === id) return updater(n);
    return {
      ...n,
      children: n.children ? updateInTree(n.children, id, updater) : undefined,
    };
  });
}

// IDENTITY_SEAL: PART-2 | role=TreeUtils | inputs=FileNode[],id | outputs=FileNode[]

// ============================================================
// PART 3 — Hook
// ============================================================

const MAX_UNDO = 50;

export function useCodeStudioFileSystem(initialTree: FileNode[] = []): UseCodeStudioFileSystemReturn {
  const [tree, setTreeState] = useState<FileNode[]>(initialTree);
  const undoStack = useRef<FileNode[][]>([]);
  const redoStack = useRef<FileNode[][]>([]);

  const pushUndo = useCallback((current: FileNode[]) => {
    undoStack.current.push(JSON.parse(JSON.stringify(current)));
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const setTree = useCallback((newTree: FileNode[]) => {
    pushUndo(tree);
    setTreeState(newTree);
  }, [tree, pushUndo]);

  const createFile = useCallback((parentId: string | null, name: string, content = ''): FileNode => {
    const node: FileNode = {
      id: generateId(),
      name,
      type: 'file',
      content,
      language: detectLanguage(name),
    };
    pushUndo(tree);
    setTreeState((prev) => insertIntoTree(prev, parentId, node));
    return node;
  }, [tree, pushUndo]);

  const createFolder = useCallback((parentId: string | null, name: string): FileNode => {
    const node: FileNode = {
      id: generateId(),
      name,
      type: 'folder',
      children: [],
    };
    pushUndo(tree);
    setTreeState((prev) => insertIntoTree(prev, parentId, node));
    return node;
  }, [tree, pushUndo]);

  const deleteNode = useCallback((id: string) => {
    pushUndo(tree);
    setTreeState((prev) => removeFromTree(prev, id));
  }, [tree, pushUndo]);

  const renameNode = useCallback((id: string, newName: string) => {
    pushUndo(tree);
    setTreeState((prev) =>
      updateInTree(prev, id, (n) => ({
        ...n,
        name: newName,
        language: n.type === 'file' ? detectLanguage(newName) : n.language,
      })),
    );
  }, [tree, pushUndo]);

  const updateContent = useCallback((id: string, content: string) => {
    // Content updates don't push undo (too frequent). Use file-level version history instead.
    setTreeState((prev) =>
      updateInTree(prev, id, (n) => ({ ...n, content })),
    );
  }, []);

  const moveNode = useCallback((id: string, newParentId: string | null) => {
    const node = findInTree(tree, id);
    if (!node) return;
    pushUndo(tree);
    const cleaned = removeFromTree(tree, id);
    setTreeState(insertIntoTree(cleaned, newParentId, node));
  }, [tree, pushUndo]);

  const findNode = useCallback((id: string): FileNode | null => {
    return findInTree(tree, id);
  }, [tree]);

  const findByPath = useCallback((path: string): FileNode | null => {
    return findByPathInTree(tree, path);
  }, [tree]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    redoStack.current.push(JSON.parse(JSON.stringify(tree)));
    const prev = undoStack.current.pop()!;
    setTreeState(prev);
  }, [tree]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    undoStack.current.push(JSON.parse(JSON.stringify(tree)));
    const next = redoStack.current.pop()!;
    setTreeState(next);
  }, [tree]);

  const persist = useCallback(async () => {
    await saveFileTree(tree);
  }, [tree]);

  const load = useCallback(async () => {
    const loaded = await loadFileTree();
    if (loaded) setTreeState(loaded);
  }, []);

  return {
    tree,
    setTree,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    updateContent,
    moveNode,
    findNode,
    findByPath,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    persist,
    load,
  };
}

// IDENTITY_SEAL: PART-3 | role=FileSystemHook | inputs=initialTree | outputs=CRUD+undo/redo
