// ============================================================
// PART 1 — Types & Constants
// ============================================================

import { logger } from '@/lib/logger';

/**
 * Single glossary entry with metadata.
 *
 * [2026-05-08 — 시장 분석 4차] Dual 매핑 지원:
 *   target          — legacy 단일 매핑 (default mode 사용)
 *   targetFaithful  — Source-faithful Translation 매핑 (원어 음차 / 고유명사 보존)
 *   targetMarket    — Market-ready Localization 매핑 (시장 친화 변형 / 영어식 의역)
 *
 * 정책:
 *   - targetFaithful 미지정 시 target 사용 (호환성)
 *   - targetMarket 미지정 시 target 사용 (호환성)
 *   - outputMode 별로 적절한 매핑이 buildPrompt 의 glossary 영역에 주입됨
 *
 * 예시:
 *   {
 *     source: '게이트',
 *     target: 'Gate',                    // legacy
 *     targetFaithful: 'Gate (게이트)',    // 음차 + 영문 보존
 *     targetMarket: 'Gate',              // 영어 독자 친화
 *     category: 'concept',
 *     locked: true,
 *   }
 */
export interface GlossaryEntry {
  source: string;
  target: string;
  /** [Dual] Source-faithful 매핑. 미지정 시 target 사용. */
  targetFaithful?: string;
  /** [Dual] Market-ready 매핑. 미지정 시 target 사용. */
  targetMarket?: string;
  /** 카테고리 — Faithful/Market 분기 우선순위 결정 (proper noun 은 보통 Faithful 보존). */
  category?: 'name' | 'place' | 'skill' | 'item' | 'concept' | 'term';
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
// PART 1.5 — Dual outputMode 헬퍼 (2026-05-08)
// ============================================================

/**
 * outputMode 에 맞는 target 추출.
 * faithful → targetFaithful 우선, fallback target.
 * market   → targetMarket 우선, fallback target.
 * default  → target.
 */
export function pickGlossaryTarget(
  entry: GlossaryEntry,
  outputMode: 'faithful' | 'market' | 'default' | 'dual',
): string {
  if (outputMode === 'faithful') return entry.targetFaithful ?? entry.target;
  if (outputMode === 'market') return entry.targetMarket ?? entry.target;
  return entry.target;
}

/**
 * GlossaryEntry[] → "source → target" 줄 리스트 (buildPrompt 의 glossary 영역 형식).
 * outputMode 별로 다른 target 사용.
 */
export function buildGlossaryText(
  entries: GlossaryEntry[],
  outputMode: 'faithful' | 'market' | 'default' | 'dual' = 'default',
): string {
  return entries
    .map((e) => `${e.source} → ${pickGlossaryTarget(e, outputMode)}`)
    .join('\n');
}

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
  /**
   * [3 — 2026-05-09] Dual 매핑 보관 — Source-faithful + Market-ready 분리.
   * 기존 terms (단일 Map) 와 병행 — 호환성 유지. dual 매핑 미지정 시 terms 사용.
   * UI 입력은 다음 사이클 (GlossaryManagerDialog 확장).
   */
  private termsDual: Map<string, { faithful?: string; market?: string }> = new Map();
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
      // [3 — 2026-05-09] dual 매핑 자동 결합 — termsDual 에 entry 가 있으면 faithful/market 채움.
      const dual = this.termsDual.get(source);
      result.push({
        source,
        target,
        targetFaithful: dual?.faithful,
        targetMarket: dual?.market,
        locked: allLocked,
      });
    });
    return result;
  }

  /**
   * [3 — 2026-05-09] Dual 매핑 추가/갱신.
   * faithful 또는 market 한쪽만 갱신 가능 (다른 쪽은 기존 보존).
   */
  setDualTerm(source: string, dual: { faithful?: string; market?: string }): void {
    if (!source) return;
    const existing = this.termsDual.get(source) ?? {};
    this.termsDual.set(source, { ...existing, ...dual });
    // terms (단일) 도 동기화 — market 우선, 없으면 faithful
    const synonym = dual.market ?? dual.faithful ?? this.terms.get(source);
    if (synonym !== undefined) this.terms.set(source, synonym);
    this.bump();
  }

  /** Dual 매핑 단일 항목 조회. */
  getDualTerm(source: string): { faithful?: string; market?: string } | null {
    return this.termsDual.get(source) ?? null;
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
