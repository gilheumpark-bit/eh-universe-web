// ============================================================
// Pipeline Cache — Content-hash based caching for pipeline
// team results
// ============================================================
// Uses a fast djb2 hash of file contents to create cache keys.
// Stores results with TTL, tracks hit/miss statistics, and
// maps files to teams for targeted invalidation.
// ============================================================

import type { PipelineStage, TeamResult } from "./types";

// ── Types ──

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalTimeSavedMs: number;
  entries: number;
  evictions: number;
}

interface CacheEntry {
  key: string;
  result: TeamResult;
  createdAt: number;
  ttl: number;
  contentHash: string;
  durationMs: number;
}

// ── Hash Utility ──

/**
 * Fast djb2 hash for file content.
 * Returns a hex string for use in cache keys.
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Compute a combined content hash for multiple files.
 * Sorts file entries by path for deterministic ordering.
 */
function computeContentHash(files: { path: string; content: string }[]): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  let combined = 0;
  for (const file of sorted) {
    const fileHash = djb2Hash(file.path + ":" + file.content);
    // Combine hashes with XOR-shift to avoid ordering issues
    combined = ((combined << 5) ^ (combined >>> 27) ^ fileHash) >>> 0;
  }
  return combined.toString(16).padStart(8, "0");
}

// ── File-to-Team Mapping ──

/**
 * Determine which pipeline teams are affected by a file change,
 * based on file extension and name patterns.
 */
const FILE_TEAM_RULES: {
  pattern: (path: string) => boolean;
  teams: PipelineStage[];
}[] = [
  {
    // TypeScript/JavaScript files affect validation, simulation, generation, stability
    pattern: (p) => /\.(ts|tsx|js|jsx)$/.test(p),
    teams: ["validation", "simulation", "generation", "stability"],
  },
  {
    // Package files affect asset-trace
    pattern: (p) => /(package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(p),
    teams: ["asset-trace", "release-ip"],
  },
  {
    // Config files affect governance
    pattern: (p) => /\.(json|yaml|yml|toml|ini|env)$/.test(p) && !p.includes("package"),
    teams: ["governance", "stability"],
  },
  {
    // CSS/style files affect size-density
    pattern: (p) => /\.(css|scss|sass|less|styl)$/.test(p),
    teams: ["size-density"],
  },
  {
    // License files affect release-ip
    pattern: (p) => /(license|licence|copying|notice)/i.test(p),
    teams: ["release-ip"],
  },
  {
    // All files can affect size-density
    pattern: () => true,
    teams: ["size-density"],
  },
];

function getAffectedTeams(filePath: string): Set<PipelineStage> {
  const teams = new Set<PipelineStage>();
  for (const rule of FILE_TEAM_RULES) {
    if (rule.pattern(filePath)) {
      for (const team of rule.teams) {
        teams.add(team);
      }
    }
  }
  return teams;
}

// ── PipelineCache Class ──

export class PipelineCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number;
  private maxEntries: number;

  // Statistics
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  private timeSavedMs = 0;

  /**
   * @param defaultTTL - Default time-to-live in ms (default: 5 minutes)
   * @param maxEntries - Maximum cache entries before LRU eviction (default: 100)
   */
  constructor(defaultTTL = 5 * 60 * 1000, maxEntries = 100) {
    this.defaultTTL = defaultTTL;
    this.maxEntries = maxEntries;
  }

  // ── Core API ──

  /**
   * Check cache for a team result given the input files.
   * Returns the cached TeamResult if valid, or null on miss.
   */
  getCached(
    team: PipelineStage,
    files: { path: string; content: string }[],
  ): TeamResult | null {
    const hash = computeContentHash(files);
    const key = this.makeKey(team, hash);
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    this.timeSavedMs += entry.durationMs;
    return entry.result;
  }

  /**
   * Store a team result in the cache.
   */
  setCached(
    team: PipelineStage,
    files: { path: string; content: string }[],
    result: TeamResult,
    ttl?: number,
  ): void {
    const hash = computeContentHash(files);
    const key = this.makeKey(team, hash);

    // Evict if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      key,
      result,
      createdAt: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      contentHash: hash,
      durationMs: result.durationMs,
    });
  }

  /**
   * Invalidate cache entries affected by changed files.
   * Uses file-to-team mapping to determine which teams to invalidate.
   */
  invalidate(changedFiles: string[]): PipelineStage[] {
    const invalidatedTeams = new Set<PipelineStage>();

    for (const filePath of changedFiles) {
      const affectedTeams = getAffectedTeams(filePath);
      for (const team of affectedTeams) {
        invalidatedTeams.add(team);
      }
    }

    // Remove all cache entries for affected teams
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      const teamPrefix = key.split(":")[0];
      if (invalidatedTeams.has(teamPrefix as PipelineStage)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.evictionCount++;
    }

    return Array.from(invalidatedTeams);
  }

  /**
   * Invalidate all entries for a specific team.
   */
  invalidateTeam(team: PipelineStage): number {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.startsWith(team + ":")) {
        keysToDelete.push(key);
        count++;
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.evictionCount++;
    }

    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Reset statistics counters.
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
    this.timeSavedMs = 0;
  }

  // ── Statistics ──

  /**
   * Get cache performance statistics.
   */
  getStats(): CacheStats {
    const total = this.hitCount + this.missCount;
    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? Math.round((this.hitCount / total) * 10000) / 100 : 0,
      totalTimeSavedMs: Math.round(this.timeSavedMs),
      entries: this.cache.size,
      evictions: this.evictionCount,
    };
  }

  // ── Internal ──

  private makeKey(team: PipelineStage, contentHash: string): string {
    return `${team}:${contentHash}`;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictionCount++;
    }
  }
}
