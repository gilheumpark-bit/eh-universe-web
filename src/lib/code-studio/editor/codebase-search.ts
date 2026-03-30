// ============================================================
// Code Studio — Full Codebase Search with TF-IDF Ranking
// ============================================================

import type { FileNode } from '../../code-studio-types';

// ============================================================
// PART 1 — Types
// ============================================================

export interface CodeSearchResult {
  fileName: string;
  filePath: string;
  matchType: 'filename' | 'content' | 'function' | 'class' | 'export';
  line?: number;
  snippet: string;
  score: number;
}

export interface SearchIndex {
  files: IndexedFile[];
  trigramMap: Map<string, Set<number>>;
  idfCache: Map<string, number>;
}

interface IndexedFile {
  idx: number;
  path: string;
  name: string;
  content: string;
  terms: Map<string, number>;
  lineCount: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CodeSearchResult,SearchIndex

// ============================================================
// PART 2 — Indexing
// ============================================================

function flattenFiles(nodes: FileNode[], prefix = ''): Array<{ path: string; name: string; content: string }> {
  const out: Array<{ path: string; name: string; content: string }> = [];
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === 'file' && n.content != null) out.push({ path: p, name: n.name, content: n.content });
    if (n.children) out.push(...flattenFiles(n.children, p));
  }
  return out;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 1);
}

function extractTrigrams(text: string): string[] {
  const lower = text.toLowerCase();
  const trigrams: string[] = [];
  for (let i = 0; i <= lower.length - 3; i++) {
    trigrams.push(lower.slice(i, i + 3));
  }
  return trigrams;
}

export function buildSearchIndex(files: FileNode[]): SearchIndex {
  const flat = flattenFiles(files);
  const indexedFiles: IndexedFile[] = [];
  const trigramMap = new Map<string, Set<number>>();

  for (let idx = 0; idx < flat.length; idx++) {
    const f = flat[idx];
    const terms = new Map<string, number>();
    for (const token of tokenize(f.content)) {
      terms.set(token, (terms.get(token) ?? 0) + 1);
    }

    indexedFiles.push({ idx, path: f.path, name: f.name, content: f.content, terms, lineCount: f.content.split('\n').length });

    for (const tri of extractTrigrams(f.name + ' ' + f.content.slice(0, 1000))) {
      if (!trigramMap.has(tri)) trigramMap.set(tri, new Set());
      trigramMap.get(tri)!.add(idx);
    }
  }

  // IDF cache
  const idfCache = new Map<string, number>();
  const N = indexedFiles.length;
  const allTerms = new Set<string>();
  for (const f of indexedFiles) {
    for (const t of f.terms.keys()) allTerms.add(t);
  }
  for (const term of allTerms) {
    const df = indexedFiles.filter((f) => f.terms.has(term)).length;
    idfCache.set(term, Math.log((N + 1) / (df + 1)));
  }

  return { files: indexedFiles, trigramMap, idfCache };
}

// IDENTITY_SEAL: PART-2 | role=indexing | inputs=FileNode[] | outputs=SearchIndex

// ============================================================
// PART 3 — Search
// ============================================================

export function searchCodebase(
  query: string,
  index: SearchIndex,
  maxResults = 20,
): CodeSearchResult[] {
  const queryTokens = tokenize(query);
  const queryLower = query.toLowerCase();
  const results: CodeSearchResult[] = [];

  // Trigram pre-filter for fast candidate selection
  const queryTrigrams = extractTrigrams(queryLower);
  const candidateScores = new Map<number, number>();
  for (const tri of queryTrigrams) {
    const fileIdxs = index.trigramMap.get(tri);
    if (fileIdxs) {
      for (const idx of fileIdxs) {
        candidateScores.set(idx, (candidateScores.get(idx) ?? 0) + 1);
      }
    }
  }

  // Sort candidates by trigram hits, take top 100
  const candidates = [...candidateScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([idx]) => index.files[idx]);

  for (const file of candidates) {
    // Filename match
    if (file.name.toLowerCase().includes(queryLower)) {
      results.push({
        fileName: file.name, filePath: file.path, matchType: 'filename',
        snippet: `${file.path} (${file.lineCount} lines)`, score: 100,
      });
    }

    // TF-IDF content scoring
    let tfidfScore = 0;
    for (const token of queryTokens) {
      const tf = file.terms.get(token) ?? 0;
      const idf = index.idfCache.get(token) ?? 1;
      tfidfScore += tf * idf;
    }

    if (tfidfScore > 0) {
      // Find best matching line
      const lines = file.content.split('\n');
      let bestLine = 0;
      let bestLineScore = 0;
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        const score = queryTokens.filter((t) => lower.includes(t)).length;
        if (score > bestLineScore) {
          bestLineScore = score;
          bestLine = i;
        }
      }

      // Detect match type
      const line = lines[bestLine]?.trim() ?? '';
      let matchType: CodeSearchResult['matchType'] = 'content';
      if (/^(export\s+)?(function|const|let|var)\s/.test(line)) matchType = 'function';
      else if (/^(export\s+)?(class|interface|type|enum)\s/.test(line)) matchType = 'class';
      else if (/^export\s/.test(line)) matchType = 'export';

      results.push({
        fileName: file.name, filePath: file.path, matchType,
        line: bestLine + 1, snippet: line.slice(0, 120), score: Math.round(tfidfScore * 10),
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/** Simple non-indexed search fallback */
export function quickSearch(query: string, files: FileNode[], maxResults = 10): CodeSearchResult[] {
  const flat = flattenFiles(files);
  const lower = query.toLowerCase();
  const results: CodeSearchResult[] = [];

  for (const f of flat) {
    if (f.name.toLowerCase().includes(lower)) {
      results.push({ fileName: f.name, filePath: f.path, matchType: 'filename', snippet: f.path, score: 100 });
    }
    const lines = f.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lower)) {
        results.push({ fileName: f.name, filePath: f.path, matchType: 'content', line: i + 1, snippet: lines[i].trim().slice(0, 120), score: 50 });
        break;
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

// IDENTITY_SEAL: PART-3 | role=search | inputs=query,SearchIndex | outputs=CodeSearchResult[]
