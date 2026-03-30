// ============================================================
// Code Studio — Codebase Indexer
// Extracts symbols from all files, builds a symbol map and
// dependency graph, supports incremental updates on file change.
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

import type { FileNode } from '../../code-studio-types';

export type SymbolKind = 'function' | 'class' | 'variable' | 'interface' | 'type' | 'enum' | 'const' | 'import' | 'export';

export interface IndexedSymbol {
  name: string;
  kind: SymbolKind;
  fileId: string;
  fileName: string;
  line: number;
  exported: boolean;
}

export interface FileDependency {
  from: string; // fileId
  to: string;   // import path (resolved to fileId when possible)
  specifiers: string[];
}

export interface CodeIndex {
  symbols: Map<string, IndexedSymbol[]>; // symbol name -> occurrences
  fileSymbols: Map<string, IndexedSymbol[]>; // fileId -> symbols in file
  dependencies: FileDependency[];
  fileHashes: Map<string, string>; // fileId -> content hash for incremental
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=IndexedSymbol,FileDependency,CodeIndex

// ============================================================
// PART 2 — Symbol Extraction (Regex-based)
// ============================================================

const SYMBOL_PATTERNS: Array<{ kind: SymbolKind; pattern: RegExp; nameGroup: number; exported?: boolean }> = [
  // export function / function
  { kind: 'function', pattern: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm, nameGroup: 1 },
  // export const / const
  { kind: 'const', pattern: /^(?:export\s+)?const\s+(\w+)/gm, nameGroup: 1 },
  // export let / let
  { kind: 'variable', pattern: /^(?:export\s+)?let\s+(\w+)/gm, nameGroup: 1 },
  // export class / class
  { kind: 'class', pattern: /^(?:export\s+)?class\s+(\w+)/gm, nameGroup: 1 },
  // export interface / interface
  { kind: 'interface', pattern: /^(?:export\s+)?interface\s+(\w+)/gm, nameGroup: 1 },
  // export type / type
  { kind: 'type', pattern: /^(?:export\s+)?type\s+(\w+)\s*[=<]/gm, nameGroup: 1 },
  // export enum / enum
  { kind: 'enum', pattern: /^(?:export\s+)?enum\s+(\w+)/gm, nameGroup: 1 },
  // Arrow functions assigned to const
  { kind: 'function', pattern: /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/gm, nameGroup: 1 },
];

const IMPORT_PATTERN = /import\s+(?:(?:type\s+)?(?:\{([^}]*)\}|(\w+))(?:\s*,\s*(?:\{([^}]*)\}|(\w+)))?\s+from\s+)?['"]([^'"]+)['"]/gm;

function getLineNumber(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

function extractSymbols(fileId: string, fileName: string, content: string): IndexedSymbol[] {
  const symbols: IndexedSymbol[] = [];
  const seen = new Set<string>();

  for (const { kind, pattern, nameGroup } of SYMBOL_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const name = match[nameGroup];
      if (!name || name.length < 2) continue;
      const key = `${kind}:${name}:${match.index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const exported = match[0].trimStart().startsWith('export');
      symbols.push({
        name,
        kind,
        fileId,
        fileName,
        line: getLineNumber(content, match.index),
        exported,
      });
    }
  }

  return symbols;
}

function extractDependencies(fileId: string, content: string): FileDependency[] {
  const deps: FileDependency[] = [];
  const re = new RegExp(IMPORT_PATTERN.source, IMPORT_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    const namedImports = (match[1] || match[3] || '').split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    const defaultImport = match[2] || match[4] || '';
    const specifiers = defaultImport ? [defaultImport, ...namedImports] : namedImports;
    const importPath = match[5];
    if (importPath) {
      deps.push({ from: fileId, to: importPath, specifiers });
    }
  }

  return deps;
}

// IDENTITY_SEAL: PART-2 | role=SymbolExtraction | inputs=fileId,content | outputs=IndexedSymbol[],FileDependency[]

// ============================================================
// PART 3 — Content Hashing
// ============================================================

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// IDENTITY_SEAL: PART-3 | role=Hashing | inputs=string | outputs=string

// ============================================================
// PART 4 — Index Builder
// ============================================================

function flattenFilesWithContent(nodes: FileNode[], prefix = ''): Array<{ id: string; name: string; path: string; content: string }> {
  const result: Array<{ id: string; name: string; path: string; content: string }> = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'file' && node.content != null) {
      result.push({ id: node.id, name: node.name, path, content: node.content });
    }
    if (node.children) {
      result.push(...flattenFilesWithContent(node.children, path));
    }
  }
  return result;
}

export function buildCodeIndex(files: FileNode[]): CodeIndex {
  const index: CodeIndex = {
    symbols: new Map(),
    fileSymbols: new Map(),
    dependencies: [],
    fileHashes: new Map(),
  };

  const flatFiles = flattenFilesWithContent(files);

  for (const file of flatFiles) {
    const hash = simpleHash(file.content);
    index.fileHashes.set(file.id, hash);

    const syms = extractSymbols(file.id, file.path, file.content);
    index.fileSymbols.set(file.id, syms);

    for (const sym of syms) {
      const existing = index.symbols.get(sym.name) ?? [];
      existing.push(sym);
      index.symbols.set(sym.name, existing);
    }

    const deps = extractDependencies(file.id, file.content);
    index.dependencies.push(...deps);
  }

  return index;
}

// IDENTITY_SEAL: PART-4 | role=IndexBuilder | inputs=FileNode[] | outputs=CodeIndex

// ============================================================
// PART 5 — Incremental Update
// ============================================================

export function updateFileInIndex(
  index: CodeIndex,
  fileId: string,
  fileName: string,
  newContent: string,
): CodeIndex {
  const newHash = simpleHash(newContent);
  const oldHash = index.fileHashes.get(fileId);

  if (oldHash === newHash) return index;

  // Remove old symbols for this file
  const oldSymbols = index.fileSymbols.get(fileId) ?? [];
  for (const sym of oldSymbols) {
    const list = index.symbols.get(sym.name);
    if (list) {
      const filtered = list.filter((s) => s.fileId !== fileId);
      if (filtered.length > 0) {
        index.symbols.set(sym.name, filtered);
      } else {
        index.symbols.delete(sym.name);
      }
    }
  }

  // Remove old dependencies for this file
  index.dependencies = index.dependencies.filter((d) => d.from !== fileId);

  // Re-extract
  const newSymbols = extractSymbols(fileId, fileName, newContent);
  index.fileSymbols.set(fileId, newSymbols);
  index.fileHashes.set(fileId, newHash);

  for (const sym of newSymbols) {
    const existing = index.symbols.get(sym.name) ?? [];
    existing.push(sym);
    index.symbols.set(sym.name, existing);
  }

  const newDeps = extractDependencies(fileId, newContent);
  index.dependencies.push(...newDeps);

  return index;
}

// IDENTITY_SEAL: PART-5 | role=IncrementalUpdate | inputs=CodeIndex,fileId,content | outputs=CodeIndex

// ============================================================
// PART 6 — Query Utilities
// ============================================================

export function searchSymbols(index: CodeIndex, query: string, limit = 50): IndexedSymbol[] {
  if (!query) return [];
  const q = query.toLowerCase();
  const results: IndexedSymbol[] = [];

  for (const [name, syms] of index.symbols) {
    if (name.toLowerCase().includes(q)) {
      results.push(...syms);
      if (results.length >= limit) break;
    }
  }

  return results.slice(0, limit);
}

export function getExportsForFile(index: CodeIndex, fileId: string): IndexedSymbol[] {
  return (index.fileSymbols.get(fileId) ?? []).filter((s) => s.exported);
}

export function getDependentsOf(index: CodeIndex, fileId: string): string[] {
  return [...new Set(
    index.dependencies.filter((d) => d.to.includes(fileId) || d.to.endsWith(fileId)).map((d) => d.from)
  )];
}

export function getDependenciesOf(index: CodeIndex, fileId: string): string[] {
  return [...new Set(
    index.dependencies.filter((d) => d.from === fileId).map((d) => d.to)
  )];
}

export function getSymbolCount(index: CodeIndex): number {
  let count = 0;
  for (const syms of index.symbols.values()) count += syms.length;
  return count;
}

// IDENTITY_SEAL: PART-6 | role=QueryUtils | inputs=CodeIndex,query | outputs=IndexedSymbol[]/string[]
