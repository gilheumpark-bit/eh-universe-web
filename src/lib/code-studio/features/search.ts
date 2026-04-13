// ============================================================
// PART 1 — Types & Constants
// ============================================================

import type { FileNode } from '../core/types';

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
  contextBefore: string[];
  contextAfter: string[];
}

/** Grouped search results by file */
export interface FileSearchGroup {
  filePath: string;
  fileName: string;
  matchCount: number;
  results: SearchResult[];
}

/** Replace preview entry showing before/after for a single line */
export interface ReplacePreviewEntry {
  lineNumber: number;
  before: string;
  after: string;
}

const DEFAULT_MAX_RESULTS = 100;
const CONTEXT_LINES = 3;

// IDENTITY_SEAL: PART-1 | role=TypeDefinitions | inputs=none | outputs=SearchOptions,SearchResult,FileSearchGroup,ReplacePreviewEntry

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
// PART 4 — Context Line Extraction
// ============================================================

/**
 * 매치 라인 주변의 컨텍스트 라인을 추출한다.
 * lineIndex는 0-based.
 */
function extractContextLines(
  lines: string[],
  lineIndex: number,
  count: number = CONTEXT_LINES,
): { before: string[]; after: string[] } {
  const startBefore = Math.max(0, lineIndex - count);
  const endAfter = Math.min(lines.length - 1, lineIndex + count);

  const before: string[] = [];
  for (let i = startBefore; i < lineIndex; i++) {
    before.push(lines[i]);
  }

  const after: string[] = [];
  for (let i = lineIndex + 1; i <= endAfter; i++) {
    after.push(lines[i]);
  }

  return { before, after };
}

// IDENTITY_SEAL: PART-4 | role=ContextLineExtraction | inputs=lines,lineIndex,count | outputs={before,after}

// ============================================================
// PART 5 — Core Search
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
        results.push({
          fileId: file.id,
          fileName: file.name,
          line: 0,
          column: 0,
          lineContent: file.name,
          matchLength: query.length,
          contextBefore: [],
          contextAfter: [],
        });
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
        const ctx = extractContextLines(lines, i);
        results.push({
          fileId: file.id,
          fileName: file.name,
          line: i + 1,
          column: match.index + 1,
          lineContent: line,
          matchLength: match[0].length,
          contextBefore: ctx.before,
          contextAfter: ctx.after,
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

// IDENTITY_SEAL: PART-5 | role=CoreSearch | inputs=query,FileNode[],SearchOptions | outputs=SearchResult[]

// ============================================================
// PART 6 — File Grouping
// ============================================================

/**
 * 검색 결과를 파일별로 그룹화한다.
 * 매치 수가 많은 파일이 먼저 온다.
 */
export function groupResultsByFile(results: SearchResult[]): FileSearchGroup[] {
  const map = new Map<string, FileSearchGroup>();

  for (const r of results) {
    let group = map.get(r.fileId);
    if (!group) {
      group = {
        filePath: r.fileId,
        fileName: r.fileName,
        matchCount: 0,
        results: [],
      };
      map.set(r.fileId, group);
    }
    group.matchCount++;
    group.results.push(r);
  }

  return Array.from(map.values()).sort((a, b) => b.matchCount - a.matchCount);
}

// IDENTITY_SEAL: PART-6 | role=FileGrouping | inputs=SearchResult[] | outputs=FileSearchGroup[]

// ============================================================
// PART 7 — Replace Preview
// ============================================================

/**
 * 코드 문자열에서 find/replace를 수행했을 때
 * 변경되는 각 라인의 before/after를 미리 보여준다.
 *
 * @param code      원본 코드
 * @param find      찾을 문자열 또는 정규식 패턴
 * @param replace   대체 문자열
 * @param isRegex   true면 find를 정규식으로 처리
 * @returns 변경이 일어나는 라인별 diff 배열
 */
export function previewReplace(
  code: string,
  find: string,
  replace: string,
  isRegex: boolean,
): ReplacePreviewEntry[] {
  if (!find) return [];

  let pattern: RegExp;
  try {
    pattern = isRegex
      ? new RegExp(find, 'g')
      : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  } catch {
    return [];
  }

  const lines = code.split('\n');
  const entries: ReplacePreviewEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const before = lines[i];
    pattern.lastIndex = 0;

    if (pattern.test(before)) {
      pattern.lastIndex = 0;
      const after = before.replace(pattern, replace);
      if (after !== before) {
        entries.push({
          lineNumber: i + 1,
          before,
          after,
        });
      }
    }
  }

  return entries;
}

// IDENTITY_SEAL: PART-7 | role=ReplacePreview | inputs=code,find,replace,isRegex | outputs=ReplacePreviewEntry[]

// ============================================================
// PART 8 — Replace All
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

// IDENTITY_SEAL: PART-8 | role=ReplaceAll | inputs=query,replacement,FileNode[],SearchOptions | outputs=FileNode[]

// ============================================================
// PART 9 — Web Code Search (AI-simulated)
// ============================================================

import { streamChat } from '@/lib/ai-providers';

/** Web code search result */
export interface WebSearchResult {
  title: string;
  source: 'npm' | 'github' | 'stackoverflow' | 'docs';
  url: string;
  snippet: string;
  relevance: number;
  stars?: number;
  license?: string;
  isAIEstimate: boolean;
  disclaimer: string;
}

const WEB_SEARCH_SYSTEM = `You are a code search engine. Given a query, return relevant results from npm, GitHub, StackOverflow, and documentation sites.
Respond ONLY with a JSON array of results. Each result must have:
- title: string (package/repo/question name)
- source: "npm" | "github" | "stackoverflow" | "docs"
- url: string (realistic URL)
- snippet: string (brief code snippet or description, max 200 chars)
- relevance: number (0.0 to 1.0)
- stars: number (optional, for github/npm)
- license: string (optional, e.g. "MIT", "Apache-2.0")

Return 5-10 results sorted by relevance. No markdown, no explanation, just the JSON array.`;

const AI_ESTIMATE_DISCLAIMER = 'AI-estimated results — may not reflect actual web content';

/**
 * AI-simulated web code search.
 * Uses streamChat to generate search results based on the AI's training data.
 *
 * 모든 결과에 isAIEstimate: true 플래그와 disclaimer가 자동 부착된다.
 */
export async function searchWeb(
  query: string,
  sources?: string[],
  signal?: AbortSignal,
): Promise<WebSearchResult[]> {
  if (!query.trim()) return [];

  const sourceFilter = sources?.length
    ? `\nOnly return results from these sources: ${sources.join(', ')}.`
    : '';

  let raw = '';
  try {
    raw = await streamChat({
      systemInstruction: WEB_SEARCH_SYSTEM + sourceFilter,
      messages: [{ role: 'user', content: `Search: ${query}` }],
      temperature: 0.3,
      signal,
      onChunk: () => { /* collect via return value */ },
    });
  } catch {
    return [];
  }

  // JSON 배열 파싱
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as unknown[];
    return parsed
      .filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null &&
        'title' in item && 'source' in item && 'url' in item &&
        'snippet' in item && 'relevance' in item
      )
      .map(item => ({
        title: String(item.title),
        source: item.source as WebSearchResult['source'],
        url: String(item.url),
        snippet: String(item.snippet),
        relevance: Math.max(0, Math.min(1, Number(item.relevance) || 0)),
        stars: typeof item.stars === 'number' ? item.stars : undefined,
        license: typeof item.license === 'string' ? item.license : undefined,
        isAIEstimate: true,
        disclaimer: AI_ESTIMATE_DISCLAIMER,
      }))
      .sort((a, b) => b.relevance - a.relevance);
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-9 | role=WebCodeSearch | inputs=query,sources,signal | outputs=WebSearchResult[]
