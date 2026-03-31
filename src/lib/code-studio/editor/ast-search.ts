// ============================================================
// Code Studio — AST-based Code Search
// Pattern-based search: find all functions returning Promise,
// find all useState calls, find all imports from a module, etc.
// Uses regex heuristics (no actual TS compiler API in browser).
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

import type { FileNode } from '../core/types';

export type SearchPatternKind =
  | 'function-returning'
  | 'hook-call'
  | 'import-from'
  | 'class-extending'
  | 'type-usage'
  | 'assignment-pattern'
  | 'custom-regex';

export interface ASTSearchPattern {
  kind: SearchPatternKind;
  value: string; // e.g., "Promise" for function-returning, "useState" for hook-call
}

export interface ASTSearchResult {
  fileId: string;
  fileName: string;
  line: number;
  column: number;
  matchText: string;
  context: string; // surrounding lines
  kind: SearchPatternKind;
}

export interface ASTSearchOptions {
  maxResults?: number;
  fileFilter?: (fileName: string) => boolean;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ASTSearchPattern,ASTSearchResult

// ============================================================
// PART 2 — Pattern Compilers
// ============================================================

function buildPatternRegex(pattern: ASTSearchPattern): RegExp {
  const v = escapeRegex(pattern.value);
  switch (pattern.kind) {
    case 'function-returning':
      // Match: function foo(...): Promise<...> or (): Promise<...> =>
      return new RegExp(`(?:function\\s+\\w+|\\w+\\s*=\\s*(?:async\\s+)?(?:function)?\\s*)\\([^)]*\\)\\s*:\\s*${v}`, 'gm');
    case 'hook-call':
      // Match: useState(...), useEffect(...), custom hook calls
      return new RegExp(`\\b${v}\\s*\\(`, 'gm');
    case 'import-from':
      // Match: import ... from 'value' or import ... from "value"
      return new RegExp(`import\\s+.*?from\\s+['"]${v}['"]`, 'gm');
    case 'class-extending':
      // Match: class Foo extends Value
      return new RegExp(`class\\s+\\w+\\s+extends\\s+${v}`, 'gm');
    case 'type-usage':
      // Match: : Type, <Type>, Type[] etc.
      return new RegExp(`[:<,\\s]${v}[>\\[\\],;\\s]`, 'gm');
    case 'assignment-pattern':
      // Match: const/let/var x = value(
      return new RegExp(`(?:const|let|var)\\s+\\w+\\s*=\\s*${v}`, 'gm');
    case 'custom-regex':
      return new RegExp(pattern.value, 'gm');
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// IDENTITY_SEAL: PART-2 | role=PatternCompilers | inputs=ASTSearchPattern | outputs=RegExp

// ============================================================
// PART 3 — File Traversal
// ============================================================

interface FlatFile {
  id: string;
  path: string;
  content: string;
}

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'kt',
  'c', 'cpp', 'h', 'hpp', 'swift', 'cs', 'rb', 'vue', 'svelte',
]);

function flattenToCodeFiles(nodes: FileNode[], prefix = ''): FlatFile[] {
  const result: FlatFile[] = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'file' && node.content != null) {
      const ext = node.name.split('.').pop()?.toLowerCase() ?? '';
      if (CODE_EXTENSIONS.has(ext)) {
        result.push({ id: node.id, path, content: node.content });
      }
    }
    if (node.children) {
      result.push(...flattenToCodeFiles(node.children, path));
    }
  }
  return result;
}

function getLineAndColumn(content: string, index: number): { line: number; column: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }
  return { line, column: index - lastNewline };
}

function getContextLines(content: string, line: number, radius = 1): string {
  const lines = content.split('\n');
  const start = Math.max(0, line - 1 - radius);
  const end = Math.min(lines.length, line + radius);
  return lines.slice(start, end).join('\n');
}

// IDENTITY_SEAL: PART-3 | role=FileTraversal | inputs=FileNode[] | outputs=FlatFile[]

// ============================================================
// PART 4 — Search Engine
// ============================================================

export function astSearch(
  files: FileNode[],
  pattern: ASTSearchPattern,
  options: ASTSearchOptions = {},
): ASTSearchResult[] {
  const { maxResults = 200, fileFilter } = options;
  const regex = buildPatternRegex(pattern);
  const flatFiles = flattenToCodeFiles(files);
  const results: ASTSearchResult[] = [];

  for (const file of flatFiles) {
    if (fileFilter && !fileFilter(file.path)) continue;

    const re = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;

    while ((match = re.exec(file.content)) !== null) {
      const { line, column } = getLineAndColumn(file.content, match.index);
      results.push({
        fileId: file.id,
        fileName: file.path,
        line,
        column,
        matchText: match[0].slice(0, 200),
        context: getContextLines(file.content, line),
        kind: pattern.kind,
      });

      if (results.length >= maxResults) return results;
    }
  }

  return results;
}

/** Convenience: search for all calls to a specific hook */
export function findHookCalls(files: FileNode[], hookName: string): ASTSearchResult[] {
  return astSearch(files, { kind: 'hook-call', value: hookName });
}

/** Convenience: search for all imports from a module */
export function findImportsFrom(files: FileNode[], modulePath: string): ASTSearchResult[] {
  return astSearch(files, { kind: 'import-from', value: modulePath });
}

/** Convenience: search for all functions returning a specific type */
export function findFunctionsReturning(files: FileNode[], returnType: string): ASTSearchResult[] {
  return astSearch(files, { kind: 'function-returning', value: returnType });
}

/** Convenience: search for all classes extending a base class */
export function findClassesExtending(files: FileNode[], baseClass: string): ASTSearchResult[] {
  return astSearch(files, { kind: 'class-extending', value: baseClass });
}

/** Multi-pattern search: run several patterns and merge results */
export function astSearchMulti(
  files: FileNode[],
  patterns: ASTSearchPattern[],
  options: ASTSearchOptions = {},
): ASTSearchResult[] {
  const allResults: ASTSearchResult[] = [];
  const maxPer = Math.ceil((options.maxResults ?? 200) / patterns.length);

  for (const pattern of patterns) {
    const results = astSearch(files, pattern, { ...options, maxResults: maxPer });
    allResults.push(...results);
  }

  return allResults.slice(0, options.maxResults ?? 200);
}

// IDENTITY_SEAL: PART-4 | role=SearchEngine | inputs=FileNode[],ASTSearchPattern | outputs=ASTSearchResult[]
