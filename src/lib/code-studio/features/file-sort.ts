// ============================================================
// Code Studio — File Sorting
// ============================================================
// 이름순 (폴더 우선), 타입순 (확장자), 크기순, 수정일순 정렬.

import type { FileNode } from '../../code-studio-types';

export type SortMode = 'name' | 'type' | 'size' | 'modified';

/** Sort file nodes: folders always come first, then by chosen mode */
export function sortFileNodes(nodes: FileNode[], mode: SortMode = 'name'): FileNode[] {
  const sorted = [...nodes].sort((a, b) => {
    // Folders always first
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;

    switch (mode) {
      case 'name':
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

      case 'type': {
        const extA = a.name.includes('.') ? a.name.split('.').pop()!.toLowerCase() : '';
        const extB = b.name.includes('.') ? b.name.split('.').pop()!.toLowerCase() : '';
        const extCmp = extA.localeCompare(extB);
        return extCmp !== 0 ? extCmp : a.name.localeCompare(b.name, undefined, { numeric: true });
      }

      case 'size': {
        const sizeA = a.content?.length ?? 0;
        const sizeB = b.content?.length ?? 0;
        return sizeB - sizeA; // larger first
      }

      case 'modified':
        // FileNode doesn't carry a timestamp; fallback to name
        return a.name.localeCompare(b.name, undefined, { numeric: true });

      default:
        return 0;
    }
  });

  // Recursively sort children
  return sorted.map(node => {
    if (node.children) {
      return { ...node, children: sortFileNodes(node.children, mode) };
    }
    return node;
  });
}

/** Sort strings like file paths: directories first, then name */
export function sortPaths(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    const partsA = a.split('/');
    const partsB = b.split('/');
    const minLen = Math.min(partsA.length, partsB.length);

    for (let i = 0; i < minLen; i++) {
      const isLastA = i === partsA.length - 1;
      const isLastB = i === partsB.length - 1;

      // Directories (non-last segments) come before files
      if (isLastA !== isLastB) return isLastA ? 1 : -1;

      const cmp = partsA[i].localeCompare(partsB[i], undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }

    return partsA.length - partsB.length;
  });
}

// IDENTITY_SEAL: role=FileSort | inputs=FileNode[],SortMode | outputs=FileNode[],string[]
