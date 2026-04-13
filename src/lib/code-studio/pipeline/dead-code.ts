// ============================================================
// Code Studio — Dead Code Scanner
// ============================================================
// 미사용 exports, return 이후 도달 불가 코드, 미사용 변수 탐지.

import type { FileNode } from '../core/types';

// ============================================================
// PART 1 — Types
// ============================================================

export type DeadCodeKind = 'unused-export' | 'unreachable' | 'unused-variable' | 'unused-import' | 'empty-block';

export interface DeadCodeFinding {
  kind: DeadCodeKind;
  filePath: string;
  fileId: string;
  line: number;
  symbol: string;
  message: string;
  severity: 'warning' | 'info';
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=DeadCodeFinding

// ============================================================
// PART 2 — Single-File Analysis
// ============================================================

/** Detect unreachable code after return/throw/break/continue */
function findUnreachableCode(content: string, filePath: string, fileId: string): DeadCodeFinding[] {
  const findings: DeadCodeFinding[] = [];
  const lines = content.split('\n');
  let inFunction = false;
  let braceDepth = 0;
  let afterReturn = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track brace depth
    for (const ch of line) {
      if (ch === '{') { braceDepth++; inFunction = true; }
      if (ch === '}') { braceDepth--; afterReturn = false; }
    }

    if (afterReturn && inFunction && line.length > 0 && line !== '}' && !line.startsWith('//') && !line.startsWith('*')) {
      findings.push({
        kind: 'unreachable',
        filePath, fileId,
        line: i + 1,
        symbol: line.slice(0, 40),
        message: `Unreachable code after return/throw`,
        severity: 'warning',
      });
    }

    if (/^\s*(return|throw)\b/.test(lines[i]) && !line.endsWith('{')) {
      afterReturn = true;
    }
    if (line === '}' || line.startsWith('case ') || line.startsWith('default:')) {
      afterReturn = false;
    }
  }

  return findings;
}

/** Detect unused variables (declared but never referenced again) */
function findUnusedVariables(content: string, filePath: string, fileId: string): DeadCodeFinding[] {
  const findings: DeadCodeFinding[] = [];
  const lines = content.split('\n');
  const declPattern = /(?:const|let|var)\s+(\w+)\s*[:=]/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(declPattern);
    if (!match) continue;

    const varName = match[1];
    if (varName.startsWith('_')) continue; // underscore prefix = intentionally unused

    // Count occurrences in rest of file
    const rest = lines.slice(i + 1).join('\n');
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const usageCount = (rest.match(new RegExp(`\\b${escaped}\\b`, 'g')) ?? []).length;

    if (usageCount === 0) {
      findings.push({
        kind: 'unused-variable',
        filePath, fileId,
        line: i + 1,
        symbol: varName,
        message: `Variable '${varName}' is declared but never used`,
        severity: 'info',
      });
    }
  }

  return findings;
}

/** Detect unused imports */
function findUnusedImports(content: string, filePath: string, fileId: string): DeadCodeFinding[] {
  const findings: DeadCodeFinding[] = [];
  const lines = content.split('\n');
  const importPattern = /import\s+(?:type\s+)?(?:\{([^}]*)\}|(\w+)(?:\s*,\s*\{([^}]*)\})?)\s+from/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(importPattern);
    if (!match) continue;

    const symbols: string[] = [];
    const namedBlock = match[1] || match[3];
    if (namedBlock) {
      for (const s of namedBlock.split(',')) {
        const name = s.trim().split(/\s+as\s+/).pop()?.trim();
        if (name) symbols.push(name);
      }
    }
    if (match[2]) symbols.push(match[2]);

    const restContent = lines.slice(i + 1).join('\n');

    for (const sym of symbols) {
      const escaped = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const usageCount = (restContent.match(new RegExp(`\\b${escaped}\\b`, 'g')) ?? []).length;
      if (usageCount === 0) {
        findings.push({
          kind: 'unused-import',
          filePath, fileId,
          line: i + 1,
          symbol: sym,
          message: `Import '${sym}' is never used`,
          severity: 'warning',
        });
      }
    }
  }

  return findings;
}

// IDENTITY_SEAL: PART-2 | role=SingleFileAnalysis | inputs=content,filePath | outputs=DeadCodeFinding[]

// ============================================================
// PART 3 — Cross-File Analysis & Public API
// ============================================================

/** Find exports that are never imported by any other file */
function findUnusedExports(
  allFiles: Array<{ path: string; id: string; content: string }>,
): DeadCodeFinding[] {
  const findings: DeadCodeFinding[] = [];

  // Collect all imported symbols across all files
  const allImportedSymbols = new Set<string>();
  for (const file of allFiles) {
    const importRe = /import\s+(?:type\s+)?(?:\{([^}]*)\}|\w+)\s+from/g;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(file.content)) !== null) {
      if (m[1]) {
        for (const s of m[1].split(',')) {
          const name = s.trim().split(/\s+as\s+/)[0]?.trim();
          if (name) allImportedSymbols.add(name);
        }
      }
    }
  }

  // Check each file's exports
  for (const file of allFiles) {
    const exportRe = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let m: RegExpExecArray | null;
    const lines = file.content.split('\n');
    while ((m = exportRe.exec(file.content)) !== null) {
      const sym = m[1];
      if (!allImportedSymbols.has(sym) && sym !== 'default') {
        const lineNum = file.content.slice(0, m.index).split('\n').length;
        findings.push({
          kind: 'unused-export',
          filePath: file.path,
          fileId: file.id,
          line: lineNum,
          symbol: sym,
          message: `Export '${sym}' is not imported by any other file`,
          severity: 'info',
        });
      }
    }
  }

  return findings;
}

/** Scan file tree for all dead code findings */
export function scanDeadCode(
  nodes: FileNode[],
  prefix = '',
): DeadCodeFinding[] {
  const allFiles: Array<{ path: string; id: string; content: string }> = [];

  function flatten(nodeList: FileNode[], pfx: string): void {
    for (const node of nodeList) {
      const path = pfx ? `${pfx}/${node.name}` : node.name;
      if (node.type === 'file' && node.content && /\.(ts|tsx|js|jsx)$/.test(node.name)) {
        allFiles.push({ path, id: node.id, content: node.content });
      }
      if (node.children) flatten(node.children, path);
    }
  }
  flatten(nodes, prefix);

  const findings: DeadCodeFinding[] = [];

  for (const file of allFiles) {
    findings.push(...findUnreachableCode(file.content, file.path, file.id));
    findings.push(...findUnusedVariables(file.content, file.path, file.id));
    findings.push(...findUnusedImports(file.content, file.path, file.id));
  }

  findings.push(...findUnusedExports(allFiles));

  return findings.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line);
}

// IDENTITY_SEAL: PART-3 | role=CrossFileAPI | inputs=FileNode[] | outputs=DeadCodeFinding[]
