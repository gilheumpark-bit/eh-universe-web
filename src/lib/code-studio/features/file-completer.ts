// ============================================================
// Code Studio — File Path Completion
// ============================================================
// 부분 경로 입력 시 매칭 파일 제안, @/ 별칭 처리.

import type { FileNode } from '../core/types';
import { fuzzyMatch } from '../editor/fuzzy-match';

export interface PathCompletion {
  fullPath: string;
  displayPath: string;
  relativePath: string;
  isFolder: boolean;
  score: number;
}

/** Flatten file tree into path list */
function flattenPaths(nodes: FileNode[], prefix = ''): Array<{ path: string; isFolder: boolean }> {
  const result: Array<{ path: string; isFolder: boolean }> = [];
  for (const node of nodes) {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    result.push({ path: fullPath, isFolder: node.type === 'folder' });
    if (node.children) {
      result.push(...flattenPaths(node.children, fullPath));
    }
  }
  return result;
}

/** Suggest matching file paths for a partial input */
export function completeFilePath(
  partial: string,
  fileTree: FileNode[],
  maxResults = 15,
): PathCompletion[] {
  if (!partial) return [];

  const allPaths = flattenPaths(fileTree);
  let query = partial;

  // Handle @/ alias — treat as root-relative
  if (query.startsWith('@/')) {
    query = query.slice(2);
  }
  // Handle ./ and ../ — just use the base name for matching
  if (query.startsWith('./') || query.startsWith('../')) {
    query = query.split('/').pop() ?? query;
  }

  const results: PathCompletion[] = [];

  for (const { path, isFolder } of allPaths) {
    // Try matching against full path and just filename
    const fileName = path.split('/').pop() ?? '';
    const pathMatch = fuzzyMatch(query, path);
    const nameMatch = fuzzyMatch(query, fileName);
    const bestScore = Math.max(pathMatch.score, nameMatch.score * 1.2); // Boost filename matches

    if (bestScore > 0) {
      results.push({
        fullPath: path,
        displayPath: path,
        relativePath: `./${path}`,
        isFolder,
        score: bestScore,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/** Convert a full path to @/ alias form */
export function toAliasPath(fullPath: string, srcPrefix = 'src'): string {
  if (fullPath.startsWith(srcPrefix + '/')) {
    return '@/' + fullPath.slice(srcPrefix.length + 1);
  }
  return './' + fullPath;
}

// IDENTITY_SEAL: role=FileCompleter | inputs=partial,FileNode[] | outputs=PathCompletion[]
