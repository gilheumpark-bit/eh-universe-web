// ============================================================
// Code Studio — Web Search
// ============================================================
// AI를 통한 문서 검색, 가져오기 및 요약, 결과 캐싱.

import { streamChat, type ChatMsg } from '@/lib/ai-providers';

// ============================================================
// PART 1 — Types & Cache
// ============================================================

export interface WebSearchResult {
  query: string;
  summary: string;
  sources: string[];
  timestamp: number;
  cached: boolean;
}

interface CacheEntry {
  result: WebSearchResult;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCacheKey(query: string): string {
  return query.toLowerCase().trim();
}

// IDENTITY_SEAL: PART-1 | role=TypesCache | inputs=query | outputs=WebSearchResult

// ============================================================
// PART 2 — Search via AI
// ============================================================

/** Search documentation/web content via AI model */
export async function searchDocumentation(
  query: string,
  context?: string,
  signal?: AbortSignal,
): Promise<WebSearchResult> {
  const cacheKey = getCacheKey(query);

  // Check cache
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, cached: true };
  }

  const systemPrompt = `You are a technical documentation search assistant. Answer the user's query concisely with code examples when relevant. If you include sources or references, list them at the end.`;

  const messages: ChatMsg[] = [];
  if (context) {
    messages.push({ role: 'user', content: `Context:\n${context}` });
    messages.push({ role: 'assistant', content: 'I have the context. What would you like to know?' });
  }
  messages.push({ role: 'user', content: query });

  let fullResponse = '';
  const result = await streamChat({
    systemInstruction: systemPrompt,
    messages,
    temperature: 0.3,
    signal,
    onChunk: (text) => { fullResponse += text; },
  });

  const sources = extractSources(result || fullResponse);

  const searchResult: WebSearchResult = {
    query,
    summary: result || fullResponse,
    sources,
    timestamp: Date.now(),
    cached: false,
  };

  // Cache result
  searchCache.set(cacheKey, { result: searchResult, expiresAt: Date.now() + CACHE_TTL });

  return searchResult;
}

/** Extract URLs/sources from AI response */
function extractSources(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s)>\]]+/g) ?? [];
  return [...new Set(urls)];
}

// IDENTITY_SEAL: PART-2 | role=SearchViaAI | inputs=query,context | outputs=WebSearchResult

// ============================================================
// PART 3 — Cache Management
// ============================================================

/** Clear expired cache entries */
export function cleanCache(): number {
  let removed = 0;
  const now = Date.now();
  for (const [key, entry] of searchCache) {
    if (entry.expiresAt < now) {
      searchCache.delete(key);
      removed++;
    }
  }
  return removed;
}

/** Clear all cached results */
export function clearSearchCache(): void {
  searchCache.clear();
}

/** Get cache stats */
export function getCacheStats(): { size: number; oldestAge: number } {
  let oldest = Date.now();
  for (const entry of searchCache.values()) {
    if (entry.result.timestamp < oldest) oldest = entry.result.timestamp;
  }
  return {
    size: searchCache.size,
    oldestAge: searchCache.size > 0 ? Date.now() - oldest : 0,
  };
}

// IDENTITY_SEAL: PART-3 | role=CacheManagement | inputs=none | outputs=number,stats
