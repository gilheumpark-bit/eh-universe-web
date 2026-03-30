// ============================================================
// Code Studio — Semantic Search
// ============================================================
// TF-IDF 키워드 검색 + AI 리랭킹, 하이브리드 스코어링.

import type { FileNode } from '../../code-studio-types';

// ============================================================
// PART 1 — Types & Config
// ============================================================

export interface SemanticSearchResult {
  fileId: string;
  filePath: string;
  snippet: string;
  keywordScore: number;
  semanticScore: number;
  combinedScore: number;
  line: number;
}

export interface SemanticSearchOptions {
  keywordWeight?: number;   // default 0.3
  semanticWeight?: number;  // default 0.7
  maxResults?: number;      // default 20
  minScore?: number;        // default 0.1
}

const DEFAULT_OPTIONS: Required<SemanticSearchOptions> = {
  keywordWeight: 0.3,
  semanticWeight: 0.7,
  maxResults: 20,
  minScore: 0.1,
};

// IDENTITY_SEAL: PART-1 | role=TypesConfig | inputs=none | outputs=SemanticSearchResult,SemanticSearchOptions

// ============================================================
// PART 2 — TF-IDF Engine
// ============================================================

interface TFIDFDocument {
  fileId: string;
  filePath: string;
  terms: Map<string, number>;
  totalTerms: number;
  lines: string[];
}

/** Tokenize text into lowercase terms */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_$]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

/** Compute term frequency map */
function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

/** Build TF-IDF index from file tree */
function buildIndex(nodes: FileNode[], prefix = ''): TFIDFDocument[] {
  const docs: TFIDFDocument[] = [];

  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'file' && node.content) {
      const tokens = tokenize(node.content);
      docs.push({
        fileId: node.id,
        filePath: path,
        terms: computeTF(tokens),
        totalTerms: tokens.length,
        lines: node.content.split('\n'),
      });
    }
    if (node.children) {
      docs.push(...buildIndex(node.children, path));
    }
  }

  return docs;
}

/** Compute IDF for terms across documents */
function computeIDF(docs: TFIDFDocument[], terms: string[]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = docs.length;

  for (const term of terms) {
    let df = 0;
    for (const doc of docs) {
      if (doc.terms.has(term)) df++;
    }
    idf.set(term, df > 0 ? Math.log(N / df) + 1 : 0);
  }

  return idf;
}

/** Score documents using TF-IDF */
function tfidfSearch(docs: TFIDFDocument[], query: string): Array<{ doc: TFIDFDocument; score: number; bestLine: number }> {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const idf = computeIDF(docs, queryTerms);
  const results: Array<{ doc: TFIDFDocument; score: number; bestLine: number }> = [];

  for (const doc of docs) {
    let score = 0;
    for (const term of queryTerms) {
      const tf = (doc.terms.get(term) ?? 0) / Math.max(doc.totalTerms, 1);
      score += tf * (idf.get(term) ?? 0);
    }

    if (score > 0) {
      // Find best matching line
      let bestLine = 0;
      let bestLineScore = 0;
      const queryLower = query.toLowerCase();

      for (let i = 0; i < doc.lines.length; i++) {
        const lineLower = doc.lines[i].toLowerCase();
        let lineScore = 0;
        for (const term of queryTerms) {
          if (lineLower.includes(term)) lineScore++;
        }
        if (lineLower.includes(queryLower)) lineScore += queryTerms.length;
        if (lineScore > bestLineScore) {
          bestLineScore = lineScore;
          bestLine = i + 1;
        }
      }

      results.push({ doc, score, bestLine: bestLine || 1 });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// IDENTITY_SEAL: PART-2 | role=TFIDFEngine | inputs=FileNode[],query | outputs=scored docs

// ============================================================
// PART 3 — Hybrid Search API
// ============================================================

/**
 * Perform keyword-only search (no AI).
 * Use this when AI is unavailable.
 */
export function keywordSearch(
  fileTree: FileNode[],
  query: string,
  options: SemanticSearchOptions = {},
): SemanticSearchResult[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const docs = buildIndex(fileTree);
  const results = tfidfSearch(docs, query);

  return results
    .slice(0, opts.maxResults)
    .map(r => {
      const snippet = r.doc.lines[r.bestLine - 1]?.trim() ?? '';
      return {
        fileId: r.doc.fileId,
        filePath: r.doc.filePath,
        snippet,
        keywordScore: r.score,
        semanticScore: 0,
        combinedScore: r.score,
        line: r.bestLine,
      };
    })
    .filter(r => r.combinedScore >= opts.minScore);
}

/**
 * Perform hybrid search: TF-IDF + AI reranking.
 * Accepts a reranker function for the AI portion.
 */
export async function hybridSearch(
  fileTree: FileNode[],
  query: string,
  reranker: (query: string, snippets: string[]) => Promise<number[]>,
  options: SemanticSearchOptions = {},
): Promise<SemanticSearchResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const docs = buildIndex(fileTree);
  const keywordResults = tfidfSearch(docs, query);

  // Take top candidates for reranking (limit to save tokens)
  const candidates = keywordResults.slice(0, Math.min(50, keywordResults.length));

  if (candidates.length === 0) return [];

  const snippets = candidates.map(r => {
    const start = Math.max(0, r.bestLine - 3);
    const end = Math.min(r.doc.lines.length, r.bestLine + 3);
    return r.doc.lines.slice(start, end).join('\n');
  });

  let semanticScores: number[];
  try {
    semanticScores = await reranker(query, snippets);
  } catch {
    // Fallback to keyword-only on AI failure
    semanticScores = candidates.map(() => 0);
  }

  return candidates
    .map((r, i) => {
      const kw = r.score;
      const sem = semanticScores[i] ?? 0;
      const combined = opts.keywordWeight * kw + opts.semanticWeight * sem;
      const snippet = r.doc.lines[r.bestLine - 1]?.trim() ?? '';

      return {
        fileId: r.doc.fileId,
        filePath: r.doc.filePath,
        snippet,
        keywordScore: kw,
        semanticScore: sem,
        combinedScore: combined,
        line: r.bestLine,
      };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, opts.maxResults)
    .filter(r => r.combinedScore >= opts.minScore);
}

// IDENTITY_SEAL: PART-3 | role=HybridSearchAPI | inputs=fileTree,query,reranker | outputs=SemanticSearchResult[]
