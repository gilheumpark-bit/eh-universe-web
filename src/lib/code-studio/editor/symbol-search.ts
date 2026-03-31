// ============================================================
// Code Studio — Symbol Search
// ============================================================
// 코드에서 심볼 추출, 퍼지 매치, 타입별 랭킹 (function > class > variable).

import type { FileNode } from '../core/types';
import { fuzzyMatch, type FuzzyMatchResult } from './fuzzy-match';

// ============================================================
// PART 1 — Types
// ============================================================

export type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'constant' | 'method' | 'property';

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  filePath: string;
  fileId: string;
  line: number;
  exported: boolean;
}

export interface SymbolSearchResult extends CodeSymbol {
  score: number;
  highlights: number[];
}

/** Priority: lower = higher rank */
const KIND_PRIORITY: Record<SymbolKind, number> = {
  function: 0,
  class: 1,
  interface: 2,
  type: 3,
  enum: 4,
  method: 5,
  constant: 6,
  variable: 7,
  property: 8,
};

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=CodeSymbol,SymbolSearchResult

// ============================================================
// PART 2 — Symbol Extraction
// ============================================================

/** Extract symbols from TypeScript/JavaScript content */
export function extractSymbols(content: string, filePath: string, fileId: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const lines = content.split('\n');

  const patterns: Array<{ regex: RegExp; kind: SymbolKind }> = [
    { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/, kind: 'function' },
    { regex: /(?:export\s+)?class\s+(\w+)/, kind: 'class' },
    { regex: /(?:export\s+)?interface\s+(\w+)/, kind: 'interface' },
    { regex: /(?:export\s+)?type\s+(\w+)\s*=/, kind: 'type' },
    { regex: /(?:export\s+)?enum\s+(\w+)/, kind: 'enum' },
    { regex: /(?:export\s+)?const\s+([A-Z_][A-Z0-9_]+)\s*=/, kind: 'constant' },
    { regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[:=]/, kind: 'variable' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const exported = /^\s*export\s/.test(line);

    for (const { regex, kind } of patterns) {
      const match = line.match(regex);
      if (match) {
        symbols.push({
          name: match[1],
          kind,
          filePath,
          fileId,
          line: i + 1,
          exported,
        });
        break; // one match per line
      }
    }
  }

  return symbols;
}

// IDENTITY_SEAL: PART-2 | role=SymbolExtraction | inputs=content,filePath | outputs=CodeSymbol[]

// ============================================================
// PART 3 — Index & Search
// ============================================================

/** Build symbol index from entire file tree */
export function buildSymbolIndex(nodes: FileNode[], prefix = ''): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];

  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'file' && node.content && /\.(ts|tsx|js|jsx)$/.test(node.name)) {
      symbols.push(...extractSymbols(node.content, path, node.id));
    }
    if (node.children) {
      symbols.push(...buildSymbolIndex(node.children, path));
    }
  }

  return symbols;
}

/** Search symbols with fuzzy matching and type-based ranking */
export function searchSymbols(
  symbols: CodeSymbol[],
  query: string,
  maxResults = 30,
): SymbolSearchResult[] {
  if (!query.trim()) return [];

  const results: SymbolSearchResult[] = [];

  for (const sym of symbols) {
    const match: FuzzyMatchResult = fuzzyMatch(query, sym.name);
    if (match.score <= 0) continue;

    // Boost exported symbols and prioritize by kind
    const kindBoost = (8 - KIND_PRIORITY[sym.kind]) * 5;
    const exportBoost = sym.exported ? 10 : 0;
    const finalScore = match.score + kindBoost + exportBoost;

    results.push({
      ...sym,
      score: finalScore,
      highlights: match.positions,
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// IDENTITY_SEAL: PART-3 | role=IndexSearch | inputs=symbols,query | outputs=SymbolSearchResult[]
