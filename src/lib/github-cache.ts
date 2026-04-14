// ============================================================
// PART 1 — Types
// ============================================================

export interface CacheEntry<T = unknown> {
  etag: string;
  data: T;
  cachedAt: number;
  lastAccessedAt: number;
}

export interface RateLimitState {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  resource: string;
}

export interface GitHubCacheConfig {
  maxEntries: number;
  ttlMs: number;
  warningThreshold: number;
}

export interface CachedResponse<T = unknown> {
  data: T;
  fromCache: boolean;
  rateLimit: RateLimitState;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

// ============================================================
// PART 2 — LRU Cache
// ============================================================

const DEFAULT_CONFIG: GitHubCacheConfig = {
  maxEntries: 200,
  ttlMs: 300_000,
  warningThreshold: 0.8,
};

const cache = new Map<string, CacheEntry>();
let stats = { hits: 0, misses: 0 };

const STABLE_ENDPOINT_PATTERNS: RegExp[] = [
  /^\/repos\/[^/]+\/[^/]+$/,
  /^\/user$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\//,
  /^\/repos\/[^/]+\/[^/]+\/branches$/,
  /^\/repos\/[^/]+\/[^/]+\/git\/trees\//,
];

function getCacheKey(url: string, method: string): string {
  return `${method}:${url}`;
}

function isStableEndpoint(url: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url.startsWith('/') ? url : `/${url}`;
  }
  return STABLE_ENDPOINT_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isCacheableRequest(url: string, method: string): boolean {
  return method.toUpperCase() === 'GET' && isStableEndpoint(url);
}

function evictLRU(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  cache.forEach((entry, key) => {
    if (entry.lastAccessedAt < oldestTime) {
      oldestTime = entry.lastAccessedAt;
      oldestKey = key;
    }
  });

  if (oldestKey !== null) {
    cache.delete(oldestKey);
  }
}

function evictExpired(ttlMs: number): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  cache.forEach((entry, key) => {
    if (now - entry.cachedAt > ttlMs) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => cache.delete(key));
}

// ============================================================
// PART 3 — Rate Limit Tracker
// ============================================================

let rateLimitState: RateLimitState = {
  limit: 5000,
  remaining: 5000,
  reset: 0,
  used: 0,
  resource: 'core',
};

function parseRateLimitHeaders(headers: Headers): RateLimitState {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const resource = headers.get('x-ratelimit-resource');

  if (limit !== null) {
    rateLimitState = {
      limit: parseInt(limit, 10) || rateLimitState.limit,
      remaining: remaining !== null ? parseInt(remaining, 10) : rateLimitState.remaining,
      reset: reset !== null ? parseInt(reset, 10) : rateLimitState.reset,
      used: rateLimitState.limit - (remaining !== null ? parseInt(remaining, 10) : rateLimitState.remaining),
      resource: resource ?? rateLimitState.resource,
    };
  }

  return rateLimitState;
}

function checkRateLimitWarning(state: RateLimitState, threshold: number): void {
  if (state.limit <= 0) return;

  const usedRatio = 1 - state.remaining / state.limit;
  if (usedRatio >= threshold && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('noa:github-rate-warning', {
        detail: state,
      }),
    );
  }
}

// ============================================================
// PART 4 — Retry Engine
// ============================================================

const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 503]);

function calculateBackoff(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt), 8000);
  const jitter = Math.random() * 500;
  return base + jitter;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit & { headers?: Record<string, string> },
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);

      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_RETRIES) {
        return response;
      }

      const retryAfterHeader = response.headers.get('retry-after');
      let delayMs: number;

      if (response.status === 429 && retryAfterHeader !== null) {
        const parsed = parseInt(retryAfterHeader, 10);
        delayMs = isNaN(parsed) ? calculateBackoff(attempt) : parsed * 1000;
      } else {
        delayMs = calculateBackoff(attempt);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === MAX_RETRIES) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, calculateBackoff(attempt)));
    }
  }

  throw lastError ?? new Error(`GitHub API request failed after ${MAX_RETRIES} retries: ${url}`);
}

// ============================================================
// PART 5 — Public API
// ============================================================

export async function cachedFetch<T = unknown>(
  url: string,
  init: RequestInit & { headers?: Record<string, string> },
  config?: Partial<GitHubCacheConfig>,
): Promise<CachedResponse<T>> {
  const merged: GitHubCacheConfig = { ...DEFAULT_CONFIG, ...config };
  const method = (init.method ?? 'GET').toUpperCase();
  const cacheable = isCacheableRequest(url, method);
  const cacheKey = getCacheKey(url, method);

  evictExpired(merged.ttlMs);

  const headers: Record<string, string> = { ...(init.headers ?? {}) };

  if (cacheable) {
    const existing = cache.get(cacheKey);
    if (existing !== undefined) {
      const age = Date.now() - existing.cachedAt;
      if (age <= merged.ttlMs) {
        headers['If-None-Match'] = existing.etag;
      }
    }
  }

  const response = await fetchWithRetry(url, { ...init, headers });
  const currentRateLimit = parseRateLimitHeaders(response.headers);
  checkRateLimitWarning(currentRateLimit, merged.warningThreshold);

  if (response.status === 304 && cacheable) {
    const existing = cache.get(cacheKey);
    if (existing !== undefined) {
      existing.lastAccessedAt = Date.now();
      stats.hits++;
      return {
        data: existing.data as T,
        fromCache: true,
        rateLimit: currentRateLimit,
      };
    }
  }

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${url}`);
  }

  const data: T = await response.json();

  if (cacheable) {
    const etag = response.headers.get('etag');
    if (etag !== null) {
      if (cache.size >= merged.maxEntries) {
        evictLRU();
      }

      const now = Date.now();
      cache.set(cacheKey, {
        etag,
        data,
        cachedAt: now,
        lastAccessedAt: now,
      });
    }
  }

  stats.misses++;

  return {
    data,
    fromCache: false,
    rateLimit: currentRateLimit,
  };
}

export function invalidateCache(urlPattern: string): void {
  const keysToDelete: string[] = [];

  cache.forEach((_entry, key) => {
    if (key.includes(urlPattern)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => cache.delete(key));
}

export function clearCache(): void {
  cache.clear();
  stats = { hits: 0, misses: 0 };
}

export function getRateLimitState(): RateLimitState {
  return { ...rateLimitState };
}

export function getCacheStats(): CacheStats {
  const total = stats.hits + stats.misses;
  return {
    size: cache.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: total > 0 ? stats.hits / total : 0,
  };
}

// IDENTITY_SEAL: github-cache | role=etag-lru-cache | inputs=url,init | outputs=CachedResponse
