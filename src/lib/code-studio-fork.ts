// ============================================================
// Code Studio — Project Forking
// ============================================================
// 프로젝트 복제 (새 ID), 전체 파일 복사, 이름 변경.

import type { FileNode } from './code-studio-types';

export interface ForkResult {
  projectId: string;
  name: string;
  files: FileNode[];
  forkedFrom: string;
  timestamp: number;
}

/** Generate a new unique ID */
function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Deep clone file tree with new IDs */
function cloneTree(nodes: FileNode[]): FileNode[] {
  return nodes.map(node => {
    const clone: FileNode = {
      ...node,
      id: newId('file'),
    };
    if (node.children) {
      clone.children = cloneTree(node.children);
    }
    return clone;
  });
}

/** Fork a project: duplicate all files with new IDs */
export function forkProject(
  originalProjectId: string,
  originalName: string,
  files: FileNode[],
  newName?: string,
): ForkResult {
  const name = newName ?? `${originalName} (fork)`;
  const forkedFiles = cloneTree(files);

  return {
    projectId: newId('proj'),
    name,
    files: forkedFiles,
    forkedFrom: originalProjectId,
    timestamp: Date.now(),
  };
}

/** Rename all files matching a pattern */
export function renameInTree(
  nodes: FileNode[],
  searchPattern: string | RegExp,
  replacement: string,
): FileNode[] {
  const regex = typeof searchPattern === 'string' ? new RegExp(searchPattern, 'g') : searchPattern;

  return nodes.map(node => {
    const renamed: FileNode = {
      ...node,
      name: node.name.replace(regex, replacement),
    };
    if (node.content) {
      renamed.content = node.content.replace(regex, replacement);
    }
    if (node.children) {
      renamed.children = renameInTree(node.children, searchPattern, replacement);
    }
    return renamed;
  });
}

// IDENTITY_SEAL: role=Fork | inputs=originalProjectId,files | outputs=ForkResult
