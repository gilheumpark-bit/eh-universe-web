// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { logger } from '@/lib/logger';

/** Single glossary entry with metadata */
export interface GlossaryEntry {
  source: string;
  target: string;
  locked?: boolean;
  context?: string;
}

/** Snapshot of glossary state at a point in time */
export interface GlossarySnapshot {
  version: number;
  terms: ReadonlyMap<string, string>;
  timestamp: number;
}

type GlossaryListener = (version: number) => void;

// ============================================================
// PART 2 — GlossaryManager Implementation
// ============================================================

/**
 * Reactive glossary manager with version tracking and change notification.
 *
 * During batch translation, the manager emits change events so that
 * subsequent (not yet started) chunks pick up the latest terms.
 * Already-completed chunks are never re-translated.
 */
export class GlossaryManager {
  private terms: Map<string, string> = new Map();
  private _version = 0;
  private listeners: Set<GlossaryListener> = new Set();

  // ── Accessors ──

  get version(): number {
    return this._version;
  }

  get size(): number {
    return this.terms.size;
  }

  /** Return a plain object copy (for React state / serialisation) */
  toRecord(): Record<string, string> {
    const out: Record<string, string> = {};
    this.terms.forEach((v, k) => { out[k] = v; });
    return out;
  }

  /** Return entries array compatible with engine GlossaryEntry[] */
  toEntries(allLocked = false): GlossaryEntry[] {
    const result: GlossaryEntry[] = [];
    this.terms.forEach((target, source) => {
      result.push({ source, target, locked: allLocked });
    });
    return result;
  }

  /** Snapshot for comparing whether glossary changed between chunks */
  snapshot(): GlossarySnapshot {
    return {
      version: this._version,
      terms: new Map(this.terms),
      timestamp: Date.now(),
    };
  }

  // ── Mutations (all bump version + notify) ──

  addTerm(source: string, target: string): void {
    if (!source) return;
    this.terms.set(source, target);
    this.bump();
  }

  removeTerm(source: string): void {
    if (this.terms.delete(source)) {
      this.bump();
    }
  }

  /** Bulk-replace the entire glossary (e.g. loading from project) */
  setAll(record: Record<string, string>): void {
    this.terms.clear();
    for (const [k, v] of Object.entries(record)) {
      if (k) this.terms.set(k, v);
    }
    this.bump();
  }

  /** Merge new terms into existing (does not remove existing terms) */
  merge(record: Record<string, string>): void {
    let changed = false;
    for (const [k, v] of Object.entries(record)) {
      if (!k) continue;
      if (this.terms.get(k) !== v) {
        this.terms.set(k, v);
        changed = true;
      }
    }
    if (changed) this.bump();
  }

  clear(): void {
    if (this.terms.size === 0) return;
    this.terms.clear();
    this.bump();
  }

  // ── Prompt Injection ──

  /**
   * Build the glossary string to inject into a translation prompt.
   * Format: `[GLOSSARY v{version}]: term1=translation1, term2=translation2`
   * Returns empty string when glossary is empty.
   */
  getPromptInjection(): string {
    if (this.terms.size === 0) return '';
    const pairs: string[] = [];
    this.terms.forEach((v, k) => {
      if (v) pairs.push(`${k}=${v}`);
    });
    if (pairs.length === 0) return '';
    return `[GLOSSARY v${this._version}]: ${pairs.join(', ')}`;
  }

  // ── Subscription ──

  /**
   * Register a listener that fires whenever the glossary changes.
   * Returns an unsubscribe function.
   */
  onChange(cb: GlossaryListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  // ── Internal ──

  private bump(): void {
    this._version += 1;
    const v = this._version;
    this.listeners.forEach((cb) => {
      try {
        cb(v);
      } catch (err) {
        // listener errors must not break the manager — warn only
        logger.warn('GlossaryManager', 'listener callback threw', err);
      }
    });
  }
}

// ============================================================
// PART 3 — Singleton Factory
// ============================================================

let _instance: GlossaryManager | null = null;

/** Get (or create) the singleton GlossaryManager instance. */
export function getGlossaryManager(): GlossaryManager {
  if (!_instance) {
    _instance = new GlossaryManager();
  }
  return _instance;
}
