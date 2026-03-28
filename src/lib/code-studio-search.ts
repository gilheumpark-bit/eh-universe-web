// ============================================================
// PART 1 — Types & Constants
// ============================================================

import type { FileNode } from './code-studio-types';

/** Search configuration options */
export interface SearchOptions {
  regex?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  maxResults?: number;
  fileExtension?: string;  // e.g. "ts", "tsx", "json"
  searchFileNames?: boolean; // true = search file names, not content
}

/** A single search match */
export interface SearchResult {
  fileId: string;
  fileName: string;
  line: number;
  column: number;
  lineContent: string;
  matchLength: number;
}

const DEFAULT_MAX_RESULTS = 100;

// IDENTITY_SEAL: PART-1 | role=TypeDefinitions | inputs=none | outputs=SearchOptions,SearchResult

// ============================================================
// PART 2 — Tree Flattening
// ============================================================

interface FlatFile {
  id: string;
  name: string;
  content: string;
}

/**
 * Recursively flattens a FileNode tree into a list of files
 * that have content (skips folders and empty nodes).
 */
function flattenFiles(nodes: FileNode[]): FlatFile[] {
  const result: FlatFile[] = [];

  function walk(list: FileNode[]): void {
    for (const node of list) {
      if (node.type === 'file' && node.content != null) {
        result.push({ id: node.id, name: node.name, content: node.content });
      }
      if (node.children) {
        walk(node.children);
      }
    }
  }

  walk(nodes);
  return result;
}

// IDENTITY_SEAL: PART-2 | role=TreeFlattening | inputs=FileNode[] | outputs=FlatFile[]

// ============================================================
// PART 3 — Pattern Builder
// ============================================================

/**
 * Builds a RegExp from the query string and options.
 * Returns null if the regex is invalid.
 */
function buildPattern(query: string, options: SearchOptions): RegExp | null {
  if (!query) return null;

  const flags = options.caseSensitive ? 'g' : 'gi';

  if (options.regex) {
    try {
      const source = options.wholeWord ? `\\b(?:${query})\\b` : query;
      return new RegExp(source, flags);
    } catch {
      return null;
    }
  }

  // Plain text mode — escape regex metacharacters
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const source = options.wholeWord ? `\\b${escaped}\\b` : escaped;
  return new RegExp(source, flags);
}

// IDENTITY_SEAL: PART-3 | role=PatternBuilder | inputs=query,SearchOptions | outputs=RegExp|null

// ============================================================
// PART 4 — Core Search
// ============================================================

/**
 * Full-text and regex search across a FileNode tree.
 *
 * @param query   - The search string (plain text or regex pattern)
 * @param files   - Root-level FileNode array to search through
 * @param options - Search behaviour toggles
 * @returns Array of SearchResult, capped at maxResults
 */
export function searchCode(
  query: string,
  files: FileNode[],
  options: SearchOptions = {},
): SearchResult[] {
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const pattern = buildPattern(query, options);
  if (!pattern) return [];

  const allFiles = flattenFiles(files);
  // 파일 확장자 필터
  const flatFiles = options.fileExtension
    ? allFiles.filter(f => f.name.endsWith('.' + options.fileExtension))
    : allFiles;
  const results: SearchResult[] = [];

  // 파일명 검색 모드
  if (options.searchFileNames) {
    for (const file of flatFiles) {
      if (results.length >= maxResults) break;
      pattern.lastIndex = 0;
      if (pattern.test(file.name)) {
        results.push({ fileId: file.id, fileName: file.name, line: 0, column: 0, lineContent: file.name, matchLength: query.length });
      }
    }
    return results;
  }

  for (const file of flatFiles) {
    if (results.length >= maxResults) break;

    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (results.length >= maxResults) break;

      const line = lines[i];
      // Reset lastIndex for each line since we reuse the global pattern
      pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.exec(line)) !== null) {
        results.push({
          fileId: file.id,
          fileName: file.name,
          line: i + 1,
          column: match.index + 1,
          lineContent: line,
          matchLength: match[0].length,
        });

        if (results.length >= maxResults) break;

        // Prevent infinite loops on zero-length matches
        if (match[0].length === 0) {
          pattern.lastIndex++;
        }
      }
    }
  }

  return results;
}

// IDENTITY_SEAL: PART-4 | role=CoreSearch | inputs=query,FileNode[],SearchOptions | outputs=SearchResult[]

// ============================================================
// PART 5 — Replace All
// ============================================================

/**
 * Deep-clones a FileNode tree and replaces all occurrences
 * of `query` with `replacement` in every file's content.
 *
 * @returns A new FileNode[] with replacements applied (original tree is untouched)
 */
export function replaceAll(
  query: string,
  replacement: string,
  files: FileNode[],
  options: SearchOptions = {},
): FileNode[] {
  const pat = buildPattern(query, options);
  if (!pat) return JSON.parse(JSON.stringify(files));
  const pattern: RegExp = pat;

  function cloneAndReplace(nodes: FileNode[]): FileNode[] {
    return nodes.map((node): FileNode => {
      const cloned: FileNode = { ...node };

      if (cloned.type === 'file' && cloned.content != null) {
        pattern.lastIndex = 0;
        cloned.content = cloned.content.replace(pattern, replacement);
      }

      if (cloned.children) {
        cloned.children = cloneAndReplace(cloned.children);
      }

      return cloned;
    });
  }

  return cloneAndReplace(files);
}

// IDENTITY_SEAL: PART-5 | role=ReplaceAll | inputs=query,replacement,FileNode[],SearchOptions | outputs=FileNode[]
