// ============================================================
// Code Studio — Auto Import
// ============================================================
// 누락된 import 감지, import 문 제안, 경로 해석, named/default import 처리.

import type { FileNode } from '../core/types';

// ============================================================
// PART 1 — Types & Patterns
// ============================================================

export interface ImportSuggestion {
  symbol: string;
  importStatement: string;
  source: string;
  isDefault: boolean;
  priority: number; // lower = higher priority
}

export interface ExportInfo {
  symbol: string;
  isDefault: boolean;
  filePath: string;
}

/** Common patterns for detecting unresolved symbols in TS/JS */
const IMPORT_REGEX = /^import\s+(?:type\s+)?(?:\{[^}]*\}|[\w*]+(?:\s*,\s*\{[^}]*\})?)\s+from\s+['"]([^'"]+)['"]/gm;
const USAGE_REGEX = /\b([A-Z][\w]*)\b/g;
const BUILTIN_GLOBALS = new Set([
  'Array', 'Boolean', 'Date', 'Error', 'Function', 'JSON', 'Map', 'Math',
  'Number', 'Object', 'Promise', 'RegExp', 'Set', 'String', 'Symbol',
  'console', 'document', 'window', 'fetch', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'URL', 'URLSearchParams', 'Headers',
  'Request', 'Response', 'FormData', 'Blob', 'File', 'Event', 'HTMLElement',
  'React', 'Component', 'Fragment', 'Suspense', 'JSX', 'FC',
  'HTMLDivElement', 'HTMLInputElement', 'HTMLButtonElement',
  'MouseEvent', 'KeyboardEvent', 'ChangeEvent', 'FormEvent',
  'Ref', 'RefObject', 'MutableRefObject',
  'Record', 'Partial', 'Required', 'Pick', 'Omit', 'Readonly',
  'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters',
  'Awaited', 'InstanceType', 'ThisType',
]);

// IDENTITY_SEAL: PART-1 | role=TypesPatterns | inputs=none | outputs=ImportSuggestion,ExportInfo

// ============================================================
// PART 2 — Export Scanner
// ============================================================

/** Scan a file's content for exported symbols */
export function scanExports(content: string, filePath: string): ExportInfo[] {
  const exports: ExportInfo[] = [];

  // named exports: export { Foo }, export const Foo, export function Foo, export class Foo, export type Foo, export interface Foo
  const namedPatterns = [
    /export\s+(?:const|let|var|function|class|type|interface|enum)\s+(\w+)/g,
    /export\s+\{([^}]+)\}/g,
  ];

  for (const pattern of namedPatterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(content)) !== null) {
      if (m[1].includes(',')) {
        // export { A, B, C }
        for (const sym of m[1].split(',')) {
          const cleaned = sym.trim().split(/\s+as\s+/).pop()?.trim();
          if (cleaned) exports.push({ symbol: cleaned, isDefault: false, filePath });
        }
      } else {
        exports.push({ symbol: m[1], isDefault: false, filePath });
      }
    }
  }

  // default export
  if (/export\s+default\s+(?:class|function)\s+(\w+)/.test(content)) {
    const match = content.match(/export\s+default\s+(?:class|function)\s+(\w+)/);
    if (match) exports.push({ symbol: match[1], isDefault: true, filePath });
  } else if (/export\s+default\s/.test(content)) {
    const baseName = filePath.split('/').pop()?.replace(/\.\w+$/, '') ?? 'default';
    exports.push({ symbol: baseName, isDefault: true, filePath });
  }

  return exports;
}

// IDENTITY_SEAL: PART-2 | role=ExportScanner | inputs=content,filePath | outputs=ExportInfo[]

// ============================================================
// PART 3 — Missing Import Detection
// ============================================================

/** Extract already imported symbols from file content */
function getImportedSymbols(content: string): Set<string> {
  const imported = new Set<string>();
  let m: RegExpExecArray | null;
  const importPattern = /import\s+(?:type\s+)?(?:\{([^}]*)\}|(\w+)(?:\s*,\s*\{([^}]*)\})?)\s+from/g;

  while ((m = importPattern.exec(content)) !== null) {
    const namedBlock = m[1] || m[3];
    if (namedBlock) {
      for (const sym of namedBlock.split(',')) {
        const name = sym.trim().split(/\s+as\s+/).pop()?.trim();
        if (name) imported.add(name);
      }
    }
    if (m[2]) imported.add(m[2]);
  }

  return imported;
}

/** Detect symbols used but not imported */
export function detectMissingImports(content: string): string[] {
  const imported = getImportedSymbols(content);
  const used = new Set<string>();

  let m: RegExpExecArray | null;
  const usagePattern = new RegExp(USAGE_REGEX.source, 'g');
  while ((m = usagePattern.exec(content)) !== null) {
    const sym = m[1];
    if (!BUILTIN_GLOBALS.has(sym) && !imported.has(sym)) {
      used.add(sym);
    }
  }

  // Filter out symbols defined locally (const/let/var/function/class/type/interface)
  const localDefs = /(?:const|let|var|function|class|type|interface|enum)\s+(\w+)/g;
  while ((m = localDefs.exec(content)) !== null) {
    used.delete(m[1]);
  }

  return [...used];
}

// IDENTITY_SEAL: PART-3 | role=MissingDetection | inputs=content | outputs=string[]

// ============================================================
// PART 4 — Suggestion Engine
// ============================================================

/** Resolve a relative import path from source file to target file */
function resolveImportPath(fromPath: string, toPath: string): string {
  // Use @/ alias for src-relative paths
  if (toPath.startsWith('src/')) {
    return '@/' + toPath.slice(4).replace(/\.\w+$/, '');
  }

  const fromParts = fromPath.split('/').slice(0, -1);
  const toParts = toPath.replace(/\.\w+$/, '').split('/');

  let commonLen = 0;
  while (commonLen < fromParts.length && commonLen < toParts.length && fromParts[commonLen] === toParts[commonLen]) {
    commonLen++;
  }

  const upCount = fromParts.length - commonLen;
  const prefix = upCount === 0 ? './' : '../'.repeat(upCount);
  return prefix + toParts.slice(commonLen).join('/');
}

/** Build file path index from file tree */
function flattenPaths(nodes: FileNode[], prefix = ''): Array<{ path: string; content: string }> {
  const result: Array<{ path: string; content: string }> = [];
  for (const node of nodes) {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'file' && node.content) {
      result.push({ path: fullPath, content: node.content });
    }
    if (node.children) {
      result.push(...flattenPaths(node.children, fullPath));
    }
  }
  return result;
}

/** Generate import suggestions for missing symbols */
export function suggestImports(
  currentFile: string,
  currentContent: string,
  fileTree: FileNode[],
): ImportSuggestion[] {
  const missing = detectMissingImports(currentContent);
  if (missing.length === 0) return [];

  // Build export index
  const allFiles = flattenPaths(fileTree);
  const exportIndex = new Map<string, ExportInfo[]>();

  for (const file of allFiles) {
    if (file.path === currentFile) continue;
    if (!/\.(ts|tsx|js|jsx)$/.test(file.path)) continue;
    const exports = scanExports(file.content, file.path);
    for (const exp of exports) {
      const list = exportIndex.get(exp.symbol) ?? [];
      list.push(exp);
      exportIndex.set(exp.symbol, list);
    }
  }

  const suggestions: ImportSuggestion[] = [];

  for (const symbol of missing) {
    const sources = exportIndex.get(symbol);
    if (!sources) continue;

    for (const source of sources) {
      const importPath = resolveImportPath(currentFile, source.filePath);
      const importStatement = source.isDefault
        ? `import ${symbol} from '${importPath}';`
        : `import { ${symbol} } from '${importPath}';`;

      // Priority: shorter paths and non-index files rank higher
      const depth = importPath.split('/').length;
      const isIndex = importPath.endsWith('/index');

      suggestions.push({
        symbol,
        importStatement,
        source: importPath,
        isDefault: source.isDefault,
        priority: depth + (isIndex ? 5 : 0),
      });
    }
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}

// IDENTITY_SEAL: PART-4 | role=SuggestionEngine | inputs=currentFile,content,fileTree | outputs=ImportSuggestion[]
