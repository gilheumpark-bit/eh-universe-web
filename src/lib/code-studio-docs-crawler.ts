// ============================================================
// Code Studio — Documentation Crawler & Indexer
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

export interface DocPage {
  url: string;
  title: string;
  content: string;
  headings: string[];
  fetchedAt: number;
}

export interface DocIndex {
  pages: DocPage[];
  totalWords: number;
  lastUpdated: number;
}

export interface DocSearchResult {
  url: string;
  title: string;
  snippet: string;
  score: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DocPage,DocIndex,DocSearchResult

// ============================================================
// PART 2 — Fetching & Parsing
// ============================================================

const STORAGE_KEY = 'eh_doc_index';

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : 'Untitled';
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    headings.push(match[1].replace(/<[^>]+>/g, '').trim());
  }
  return headings;
}

export async function fetchDocPage(url: string): Promise<DocPage | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const html = await response.text();
    return {
      url,
      title: extractTitle(html),
      content: stripHtml(html),
      headings: extractHeadings(html),
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-2 | role=fetching | inputs=url | outputs=DocPage

// ============================================================
// PART 3 — Index Management
// ============================================================

function loadIndex(): DocIndex {
  if (typeof window === 'undefined') return { pages: [], totalWords: 0, lastUpdated: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DocIndex) : { pages: [], totalWords: 0, lastUpdated: 0 };
  } catch {
    return { pages: [], totalWords: 0, lastUpdated: 0 };
  }
}

function saveIndex(index: DocIndex): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
}

export async function crawlAndIndex(urls: string[]): Promise<DocIndex> {
  const index = loadIndex();
  for (const url of urls) {
    const existing = index.pages.find((p) => p.url === url);
    if (existing && Date.now() - existing.fetchedAt < 24 * 60 * 60 * 1000) continue;

    const page = await fetchDocPage(url);
    if (page) {
      const idx = index.pages.findIndex((p) => p.url === url);
      if (idx >= 0) index.pages[idx] = page;
      else index.pages.push(page);
    }
  }

  index.totalWords = index.pages.reduce((s, p) => s + p.content.split(/\s+/).length, 0);
  index.lastUpdated = Date.now();
  saveIndex(index);
  return index;
}

export function getDocIndex(): DocIndex {
  return loadIndex();
}

export function clearDocIndex(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}

// IDENTITY_SEAL: PART-3 | role=index management | inputs=urls[] | outputs=DocIndex

// ============================================================
// PART 4 — Search
// ============================================================

export function searchDocs(query: string, maxResults = 10): DocSearchResult[] {
  const index = loadIndex();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: DocSearchResult[] = [];

  for (const page of index.pages) {
    const lower = page.content.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const idx = lower.indexOf(term);
      if (idx >= 0) score += 10;
      if (page.title.toLowerCase().includes(term)) score += 20;
      if (page.headings.some((h) => h.toLowerCase().includes(term))) score += 15;
    }

    if (score > 0) {
      const snippetIdx = lower.indexOf(terms[0]);
      const start = Math.max(0, snippetIdx - 50);
      const snippet = page.content.slice(start, start + 200).trim();
      results.push({ url: page.url, title: page.title, snippet, score });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

// IDENTITY_SEAL: PART-4 | role=search | inputs=query | outputs=DocSearchResult[]
