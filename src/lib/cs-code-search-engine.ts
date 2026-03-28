// ============================================================
// Code Search Engine — Search the web for latest code patterns,
// implementations, and best practices.
// ============================================================

import { streamChat } from '@/lib/ai-providers';

/* ── Types ─────────────────────────────────────────────────── */

export interface CodeSearchResult {
  title: string;
  source: string; // 'npm' | 'github' | 'stackoverflow' | 'mdn' | 'docs'
  url: string;
  snippet: string;
  language: string;
  relevance: number; // 0-100
  stars?: number;
  lastUpdated?: string;
  license?: string;
}

export interface CodeSearchOptions {
  query: string;
  language?: string;
  source?: string[];
  maxResults?: number; // default 10
  sortBy?: 'relevance' | 'recent' | 'popular';
  signal?: AbortSignal;
}

/* ── Helpers ───────────────────────────────────────────────── */

/** Normalize and cap a relevance score to 0-100. */
function clampRelevance(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/* ── Result Caching ───────────────────────────────────────── */

interface CachedResult {
  results: CodeSearchResult[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, CachedResult>();

function getCacheKey(opts: CodeSearchOptions): string {
  return JSON.stringify({
    q: opts.query,
    lang: opts.language ?? '',
    src: opts.source?.sort() ?? [],
    max: opts.maxResults ?? 10,
    sort: opts.sortBy ?? 'relevance',
  });
}

function getCachedResults(key: string): CodeSearchResult[] | null {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return cached.results;
}

function setCachedResults(key: string, results: CodeSearchResult[]): void {
  // Evict old entries if cache grows too large
  if (searchCache.size > 100) {
    const oldest = Array.from(searchCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 20);
    for (const [k] of oldest) searchCache.delete(k);
  }
  searchCache.set(key, { results, timestamp: Date.now() });
}

/** Clear the search results cache. */
export function clearSearchCache(): void {
  searchCache.clear();
}

/* ── Code Snippet Extraction ──────────────────────────────── */

export interface ExtractedSnippet {
  code: string;
  language: string;
  startLine?: number;
  endLine?: number;
}

/**
 * Extract code blocks from a search result snippet.
 * Detects fenced code blocks (```), indented blocks, and inline code.
 */
export function extractCodeSnippets(snippet: string): ExtractedSnippet[] {
  const snippets: ExtractedSnippet[] = [];

  // Fenced code blocks: ```lang\ncode\n```
  const fencedRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fencedRegex.exec(snippet)) !== null) {
    snippets.push({
      code: match[2].trim(),
      language: match[1] || 'text',
    });
  }

  // Indented code blocks (4+ spaces or tab at line start, 2+ consecutive lines)
  if (snippets.length === 0) {
    const lines = snippet.split('\n');
    let block: string[] = [];
    for (const line of lines) {
      if (/^(?:\s{4,}|\t)/.test(line)) {
        block.push(line.replace(/^\s{4}|\t/, ''));
      } else {
        if (block.length >= 2) {
          snippets.push({ code: block.join('\n').trim(), language: 'text' });
        }
        block = [];
      }
    }
    if (block.length >= 2) {
      snippets.push({ code: block.join('\n').trim(), language: 'text' });
    }
  }

  // Inline code: `code here`
  if (snippets.length === 0) {
    const inlineRegex = /`([^`]{3,})`/g;
    while ((match = inlineRegex.exec(snippet)) !== null) {
      snippets.push({ code: match[1], language: 'text' });
    }
  }

  return snippets;
}

/* ── Version Compatibility Check ──────────────────────────── */

export interface VersionCompatibility {
  packageName: string;
  compatible: boolean;
  requiredNode?: string;
  requiredReact?: string;
  projectNode?: string;
  projectReact?: string;
  reason: string;
}

/**
 * Check if a package is compatible with the project's Node/React version.
 * Fetches the package's engines field from npm and compares with project versions.
 */
export async function checkVersionCompatibility(
  packageName: string,
  projectNodeVersion?: string,
  projectReactVersion?: string,
): Promise<VersionCompatibility> {
  const result: VersionCompatibility = {
    packageName,
    compatible: true,
    projectNode: projectNodeVersion,
    projectReact: projectReactVersion,
    reason: 'No version constraints detected',
  };

  try {
    const res = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`,
    );
    if (!res.ok) {
      result.reason = 'Could not fetch package metadata';
      return result;
    }

    const data = await res.json();

    // Check Node.js engine requirement
    if (data.engines?.node) {
      result.requiredNode = data.engines.node;
      if (projectNodeVersion) {
        const required = parseMinVersion(data.engines.node);
        const project = parseMinVersion(projectNodeVersion);
        if (required && project && project < required) {
          result.compatible = false;
          result.reason = `Requires Node.js ${data.engines.node}, but project uses ${projectNodeVersion}`;
          return result;
        }
      }
    }

    // Check React peer dependency
    const reactPeer = data.peerDependencies?.react;
    if (reactPeer) {
      result.requiredReact = reactPeer;
      if (projectReactVersion) {
        const required = parseMinVersion(reactPeer);
        const project = parseMinVersion(projectReactVersion);
        if (required && project && project < required) {
          result.compatible = false;
          result.reason = `Requires React ${reactPeer}, but project uses ${projectReactVersion}`;
          return result;
        }
      }
    }

    result.reason = 'Version constraints satisfied';
  } catch {
    result.reason = 'Version compatibility check failed';
  }

  return result;
}

/** Extract minimum version number from a semver range (e.g., ">=16.0.0" -> 16). */
function parseMinVersion(versionRange: string): number | null {
  const m = versionRange.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/* ── Popularity Scoring ───────────────────────────────────── */

export interface PopularityScore {
  packageName: string;
  weeklyDownloads: number;
  score: number; // 0-100 normalized score
}

/**
 * Fetch npm weekly download count and compute a popularity score.
 * Score is log-scaled: 100 = 10M+ downloads/week, 0 = <10 downloads.
 */
export async function getPopularityScore(packageName: string): Promise<PopularityScore> {
  const result: PopularityScore = { packageName, weeklyDownloads: 0, score: 0 };

  try {
    const res = await fetch(
      `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`,
    );
    if (!res.ok) return result;

    const data = await res.json();
    const downloads = data.downloads ?? 0;
    result.weeklyDownloads = downloads;
    // Log-scale scoring: log10(downloads) mapped to 0-100
    // 10 downloads = ~14, 1K = ~43, 100K = ~71, 1M = ~86, 10M = 100
    result.score = downloads > 0
      ? clampRelevance(Math.log10(downloads) * 14.3)
      : 0;
  } catch {
    // Network error — return zero
  }

  return result;
}

/**
 * Weight search results by npm weekly downloads.
 * Merges popularity data into relevance scores (blended 60% relevance + 40% popularity).
 */
export async function weightByPopularity(
  results: CodeSearchResult[],
): Promise<CodeSearchResult[]> {
  const npmResults = results.filter((r) => r.source === 'npm');
  if (npmResults.length === 0) return results;

  const scores = await Promise.allSettled(
    npmResults.map((r) => {
      const pkgName = r.title.split('@')[0];
      return getPopularityScore(pkgName);
    }),
  );

  const scoreMap = new Map<string, number>();
  scores.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      scoreMap.set(npmResults[i].title, s.value.score);
    }
  });

  return results.map((r) => {
    const popScore = scoreMap.get(r.title);
    if (popScore !== undefined) {
      return {
        ...r,
        relevance: clampRelevance(r.relevance * 0.6 + popScore * 0.4),
        stars: r.stars ?? Math.round(popScore * 10), // approximate star equiv
      };
    }
    return r;
  });
}

/* ── npm Registry Search ──────────────────────────────────── */

interface NpmSearchObject {
  package: {
    name: string;
    version: string;
    description?: string;
    links?: { npm?: string; homepage?: string; repository?: string };
    date?: string;
    keywords?: string[];
  };
  score?: { final?: number };
}

/**
 * Search npm registry for packages.
 */
export async function searchNpmPackages(
  query: string,
  limit = 10,
): Promise<CodeSearchResult[]> {
  if (!query.trim()) return [];

  try {
    const params = new URLSearchParams({ text: query, size: String(limit) });
    const res = await fetch(`https://registry.npmjs.org/-/v1/search?${params}`);
    if (!res.ok) return [];

    const data = await res.json();
    const objects: NpmSearchObject[] = data.objects ?? [];

    return objects.map((obj) => {
      const pkg = obj.package;
      return {
        title: `${pkg.name}@${pkg.version}`,
        source: 'npm',
        url: pkg.links?.npm ?? `https://www.npmjs.com/package/${pkg.name}`,
        snippet: pkg.description ?? '',
        language: 'javascript',
        relevance: clampRelevance((obj.score?.final ?? 0.5) * 100),
        lastUpdated: pkg.date,
        license: undefined, // npm search API doesn't include license in v1 search
      };
    });
  } catch (err) {
    console.error('[code-search] npm search failed:', err);
    return [];
  }
}

/* ── Web / General Code Search (via proxy) ────────────────── */

async function searchWebCode(
  query: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<CodeSearchResult[]> {
  try {
    const params = new URLSearchParams({ q: query, max: String(maxResults) });
    const res = await fetch(`/api/web-search?${params}`, { signal });
    if (!res.ok) return [];

    const data = await res.json();
    const results: Array<{ title: string; url: string; snippet: string }> =
      data.results ?? [];

    return results.map((r, i) => {
      let source = 'docs';
      const urlLower = r.url.toLowerCase();
      if (urlLower.includes('github.com')) source = 'github';
      else if (urlLower.includes('stackoverflow.com')) source = 'stackoverflow';
      else if (urlLower.includes('developer.mozilla.org')) source = 'mdn';
      else if (urlLower.includes('npmjs.com')) source = 'npm';

      return {
        title: r.title,
        source,
        url: r.url,
        snippet: r.snippet,
        language: '',
        relevance: clampRelevance(90 - i * 8),
      };
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    console.error('[code-search] web search failed:', err);
    return [];
  }
}

/* ── Proxy-based code search (server-side) ────────────────── */

async function searchViaProxy(
  query: string,
  source: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<CodeSearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      source,
      max: String(maxResults),
    });
    const res = await fetch(`/api/code-search?${params}`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []) as CodeSearchResult[];
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    console.error(`[code-search] proxy search (${source}) failed:`, err);
    return [];
  }
}

/* ── Main Search Function ─────────────────────────────────── */

/**
 * Search for code across multiple sources (npm, GitHub, web).
 * Combines and ranks results by relevance.
 */
export async function searchCode(opts: CodeSearchOptions): Promise<CodeSearchResult[]> {
  const {
    query,
    language,
    source: sources,
    maxResults = 10,
    sortBy = 'relevance',
    signal,
  } = opts;

  if (!query.trim()) return [];

  // Check cache first
  const cacheKey = getCacheKey(opts);
  const cached = getCachedResults(cacheKey);
  if (cached) return cached;

  const languageSuffix = language ? ` ${language}` : '';
  const codeQuery = `${query}${languageSuffix} code`;

  // Determine which sources to search
  const searchNpm = !sources || sources.includes('npm');
  const searchGitHub = !sources || sources.includes('github');
  const searchWeb = !sources || sources.length === 0;

  // Fire searches in parallel
  const promises: Promise<CodeSearchResult[]>[] = [];

  if (searchNpm) {
    promises.push(searchNpmPackages(query, maxResults));
  }
  if (searchGitHub) {
    promises.push(searchViaProxy(query + languageSuffix, 'github', maxResults, signal));
  }
  if (searchWeb) {
    promises.push(searchWebCode(codeQuery, maxResults, signal));
  }

  const settled = await Promise.allSettled(promises);
  let combined: CodeSearchResult[] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      combined.push(...result.value);
    }
  }

  // De-duplicate by URL
  const seen = new Set<string>();
  combined = combined.filter((r) => {
    const key = r.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter by source if specified
  if (sources && sources.length > 0) {
    combined = combined.filter((r) => sources.includes(r.source));
  }

  // Sort
  if (sortBy === 'relevance') {
    combined.sort((a, b) => b.relevance - a.relevance);
  } else if (sortBy === 'recent') {
    combined.sort((a, b) => {
      const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return db - da;
    });
  } else if (sortBy === 'popular') {
    combined.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
  }

  const finalResults = combined.slice(0, maxResults);

  // Store in cache
  setCachedResults(cacheKey, finalResults);

  return finalResults;
}

/* ── Best Practices (AI-powered) ──────────────────────────── */

/**
 * Search for code patterns and best practices via AI.
 */
export async function searchBestPractices(
  topic: string,
  language: string,
  signal?: AbortSignal,
): Promise<{
  practices: Array<{
    title: string;
    description: string;
    code: string;
    source: string;
  }>;
  summary: string;
}> {
  const systemPrompt = `You are a senior software engineering advisor. Provide the latest best practices for the given topic and language. Include concrete code examples.

Respond ONLY with a JSON object:
{
  "practices": [
    {
      "title": "<practice title>",
      "description": "<why this is a best practice>",
      "code": "<code example>",
      "source": "<where this practice comes from, e.g. official docs, community standard>"
    }
  ],
  "summary": "<brief summary>"
}

Provide 3-5 practices. Do NOT include markdown or explanation outside the JSON.`;

  let result = '';
  try {
    result = await streamChat({
      systemInstruction: systemPrompt,
      messages: [
        { role: 'user', content: `Topic: ${topic}\nLanguage: ${language}` },
      ],
      onChunk: () => {},
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    console.error('[code-search] best practices AI failed:', err);
    return { practices: [], summary: 'AI analysis failed.' };
  }

  try {
    const jsonStr = result.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return {
      practices: Array.isArray(parsed.practices)
        ? parsed.practices.map((p: any) => ({
            title: String(p.title ?? ''),
            description: String(p.description ?? ''),
            code: String(p.code ?? ''),
            source: String(p.source ?? ''),
          }))
        : [],
      summary: String(parsed.summary ?? ''),
    };
  } catch {
    console.warn('[code-search] Failed to parse best practices response');
    return { practices: [], summary: 'Could not parse AI response.' };
  }
}

/* ── Latest Updates (npm + AI) ────────────────────────────── */

/**
 * Search for latest API/library updates for a given package.
 */
export async function searchLatestUpdates(
  packageName: string,
  signal?: AbortSignal,
): Promise<{
  currentVersion: string;
  latestVersion: string;
  changelog: string[];
  breakingChanges: string[];
  migrationGuide?: string;
}> {
  const defaultResult = {
    currentVersion: 'unknown',
    latestVersion: 'unknown',
    changelog: [],
    breakingChanges: [],
    migrationGuide: undefined,
  };

  // Fetch package info from npm registry
  let latestVersion = 'unknown';
  let description = '';
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      latestVersion = data['dist-tags']?.latest ?? 'unknown';
      description = data.description ?? '';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    console.error('[code-search] npm registry fetch failed:', err);
  }

  if (latestVersion === 'unknown') {
    return { ...defaultResult, latestVersion };
  }

  // Use AI to summarize changelog / breaking changes
  const systemPrompt = `You are a package update advisor. Given a package name and its latest version, provide a summary of recent changes.

Respond ONLY with a JSON object:
{
  "changelog": ["<change 1>", "<change 2>", ...],
  "breakingChanges": ["<breaking change 1>", ...],
  "migrationGuide": "<brief migration guide or null>"
}

Base your answer on your knowledge of the package. If unsure, say so.
Do NOT include markdown — only valid JSON.`;

  let result = '';
  try {
    result = await streamChat({
      systemInstruction: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Package: ${packageName}\nLatest version: ${latestVersion}\nDescription: ${description}\n\nWhat are the recent notable changes, breaking changes, and migration tips?`,
        },
      ],
      onChunk: () => {},
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return { ...defaultResult, latestVersion };
  }

  try {
    const jsonStr = result.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return {
      currentVersion: 'unknown',
      latestVersion,
      changelog: Array.isArray(parsed.changelog) ? parsed.changelog.map(String) : [],
      breakingChanges: Array.isArray(parsed.breakingChanges) ? parsed.breakingChanges.map(String) : [],
      migrationGuide: parsed.migrationGuide ? String(parsed.migrationGuide) : undefined,
    };
  } catch {
    return { ...defaultResult, latestVersion };
  }
}

/* ── Modern Alternatives (AI-powered) ─────────────────────── */

/**
 * "이 코드의 더 좋은 방법?" — AI suggests modern alternatives.
 * e.g., var -> const, callback -> async/await, moment -> dayjs
 */
export async function suggestModernAlternatives(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<
  Array<{
    original: string;
    modern: string;
    reason: string;
    source: string;
  }>
> {
  if (!code.trim()) return [];

  const systemPrompt = `You are a code modernization expert. Analyze the given code and suggest modern alternatives and improvements.

Look for:
- Deprecated APIs or patterns (var -> const/let, callbacks -> async/await)
- Outdated libraries (moment -> dayjs/date-fns, request -> fetch/got)
- Older syntax (CommonJS -> ESM, class components -> hooks)
- Performance improvements using modern APIs
- Security improvements

Respond ONLY with a JSON array:
[
  {
    "original": "<the old pattern/code>",
    "modern": "<the modern replacement>",
    "reason": "<why the modern version is better>",
    "source": "<reference, e.g. MDN, official docs, TC39>"
  }
]

If no improvements found, return []. Do NOT include markdown — only valid JSON.`;

  const truncatedCode =
    code.length > 6000 ? code.slice(0, 6000) + '\n// ... (truncated)' : code;

  let result = '';
  try {
    result = await streamChat({
      systemInstruction: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Language: ${language}\n\n\`\`\`${language}\n${truncatedCode}\n\`\`\``,
        },
      ],
      onChunk: () => {},
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    console.error('[code-search] modern alternatives AI failed:', err);
    return [];
  }

  try {
    const jsonStr = result.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any) => ({
      original: String(item.original ?? ''),
      modern: String(item.modern ?? ''),
      reason: String(item.reason ?? ''),
      source: String(item.source ?? ''),
    }));
  } catch {
    console.warn('[code-search] Failed to parse modern alternatives response');
    return [];
  }
}

/* ── Format Results ───────────────────────────────────────── */

/**
 * Format search results into a human-readable string for display or AI context.
 */
export function formatSearchResults(results: CodeSearchResult[]): string {
  if (results.length === 0) return '[코드 검색 결과 없음 / No code search results]';

  return results
    .map(
      (r, i) =>
        `${i + 1}. **${r.title}** (${r.source})` +
        `\n   ${r.url}` +
        `\n   ${r.snippet}` +
        (r.stars != null ? `\n   ⭐ ${r.stars}` : '') +
        (r.license ? `\n   License: ${r.license}` : '') +
        `\n   Relevance: ${r.relevance}/100`,
    )
    .join('\n\n');
}
