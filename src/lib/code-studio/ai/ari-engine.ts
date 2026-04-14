// ============================================================
// ARI Engine — Adaptive Reliability Index + Circuit Breaker
// Standalone module for AI provider health tracking & routing
// ============================================================

import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types
// ============================================================

export interface ARIState {
  provider: string;
  score: number;           // 0-100
  errorCount: number;
  successCount: number;
  lastErrorAt: number;
  circuitState: 'closed' | 'open' | 'half-open';
  circuitOpenedAt: number;
  halfOpenSuccessStreak: number;
  emaHistory: number[];    // last 10 scores
}

export interface ARIReport {
  providers: Array<{
    provider: string;
    score: number;
    circuitState: string;
    errorCount: number;
    successCount: number;
    available: boolean;
  }>;
  bestProvider: string | null;
  timestamp: number;
}

export interface ModelARIState {
  provider: string;
  model: string;
  score: number;
  circuitState: 'closed' | 'open' | 'half-open';
  errorCount: number;
  successCount: number;
}

export interface ARIDashboardExport {
  providers: ARIReport['providers'];
  models: ModelARIState[];
  timestamp: number;
  uptimeMs: number;
}

// ============================================================
// PART 2 — Constants
// ============================================================

/** ARI drops below this -> circuit opens */
const CIRCUIT_OPEN_THRESHOLD = 30;
/** Cooldown before half-open probe (ms) */
const CIRCUIT_COOLDOWN_MS = 60_000;
/** Consecutive successes in half-open to close circuit */
const HALF_OPEN_SUCCESS_REQUIRED = 2;
/** Max EMA history entries */
const EMA_HISTORY_SIZE = 10;
/** EMA smoothing factor (higher = more weight on recent) */
const EMA_ALPHA = 0.3;
/** Latency penalty: above this threshold (ms) starts reducing score */
const LATENCY_GOOD_MS = 2_000;
/** Latency at which penalty is maximal */
const LATENCY_BAD_MS = 15_000;

// ============================================================
// PART 3 — ARI Manager
// ============================================================

function createDefaultState(provider: string): ARIState {
  return {
    provider,
    score: 70,
    errorCount: 0,
    successCount: 0,
    lastErrorAt: 0,
    circuitState: 'closed',
    circuitOpenedAt: 0,
    halfOpenSuccessStreak: 0,
    emaHistory: [70],
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export class ARIManager {
  private states: Map<string, ARIState> = new Map();
  private modelStates: Map<string, ARIState> = new Map();
  private readonly startedAt = Date.now();

  // ── State access ──

  private getState(provider: string): ARIState {
    let s = this.states.get(provider);
    if (!s) {
      s = createDefaultState(provider);
      this.states.set(provider, s);
    }
    return s;
  }

  // ── Core API ──

  /**
   * Update ARI after an AI call completes (success or failure).
   * Handles score recalculation, EMA, and circuit breaker transitions.
   * @param model - Optional model identifier for per-model tracking (ARI_ENHANCED)
   */
  updateAfterCall(provider: string, success: boolean, latencyMs: number, model?: string): void {
    const s = this.getState(provider);
    const prevState = s.circuitState;

    if (success) {
      s.successCount++;
      const latencyPenalty = this.calcLatencyPenalty(latencyMs);
      const rawDelta = 10 - latencyPenalty; // +10 base, minus latency penalty
      const newRaw = clamp(s.score + rawDelta, 0, 100);
      s.score = this.applyEMA(s, newRaw);

      // Circuit breaker: half-open success tracking
      if (s.circuitState === 'half-open') {
        s.halfOpenSuccessStreak++;
        if (s.halfOpenSuccessStreak >= HALF_OPEN_SUCCESS_REQUIRED) {
          s.circuitState = 'closed';
          s.halfOpenSuccessStreak = 0;
          logger.info('ari', `Circuit CLOSED for ${provider} after ${HALF_OPEN_SUCCESS_REQUIRED} consecutive successes`);
        }
      }
    } else {
      s.errorCount++;
      s.lastErrorAt = Date.now();
      const newRaw = clamp(s.score - 20, 0, 100);
      s.score = this.applyEMA(s, newRaw);

      // Circuit breaker: half-open failure -> reopen
      if (s.circuitState === 'half-open') {
        s.circuitState = 'open';
        s.circuitOpenedAt = Date.now();
        s.halfOpenSuccessStreak = 0;
        logger.warn('ari', `Circuit re-OPENED for ${provider} (half-open probe failed)`);
      }

      // Circuit breaker: closed -> open when ARI < threshold
      if (s.circuitState === 'closed' && s.score < CIRCUIT_OPEN_THRESHOLD) {
        s.circuitState = 'open';
        s.circuitOpenedAt = Date.now();
        logger.warn('ari', `Circuit OPENED for ${provider} (ARI=${s.score.toFixed(1)} < ${CIRCUIT_OPEN_THRESHOLD})`);
      }
    }

    // Dispatch circuit state change event
    if (s.circuitState !== prevState && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('noa:circuit-state-changed', {
        detail: { provider, model, previousState: prevState, newState: s.circuitState, score: s.score },
      }));
    }

    // Per-model tracking (lightweight mirror)
    if (model) {
      this.updateModelState(provider, model, success, latencyMs);
    }
  }

  /**
   * Select the healthiest available provider from candidates.
   * Returns the candidate with the highest ARI score that has a closed/half-open circuit.
   * If all candidates are unavailable, returns the first candidate as last resort.
   */
  getBestProvider(candidates: string[]): string {
    if (candidates.length === 0) {
      throw new Error('No provider candidates supplied to getBestProvider');
    }

    // Tick circuit breakers (open -> half-open after cooldown)
    for (const c of candidates) {
      this.tickCircuitBreaker(c);
    }

    const available = candidates
      .filter((c) => this.isAvailable(c))
      .sort((a, b) => this.getState(b).score - this.getState(a).score);

    if (available.length > 0) {
      return available[0];
    }

    // All unavailable — return highest-score candidate as last resort
    const sorted = [...candidates].sort(
      (a, b) => this.getState(b).score - this.getState(a).score,
    );
    logger.warn('ari', `All candidates unavailable, last-resort pick: ${sorted[0]}`);
    return sorted[0];
  }

  /**
   * Check if a provider is available for requests.
   * Open circuit = unavailable (unless cooldown elapsed, which promotes to half-open).
   */
  isAvailable(provider: string): boolean {
    this.tickCircuitBreaker(provider);
    const s = this.getState(provider);
    return s.circuitState !== 'open';
  }

  /**
   * Get a full diagnostic report of all tracked providers.
   */
  getReport(): ARIReport {
    const entries = Array.from(this.states.values()).map((s) => ({
      provider: s.provider,
      score: Math.round(s.score * 10) / 10,
      circuitState: s.circuitState,
      errorCount: s.errorCount,
      successCount: s.successCount,
      available: s.circuitState !== 'open',
    }));

    const available = entries.filter((e) => e.available);
    const best = available.length > 0
      ? available.reduce((a, b) => (a.score >= b.score ? a : b)).provider
      : null;

    return {
      providers: entries,
      bestProvider: best,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset a provider's ARI state to defaults. Useful after config changes.
   */
  reset(provider: string): void {
    this.states.set(provider, createDefaultState(provider));
    logger.info('ari', `Reset ARI state for ${provider}`);
  }

  /**
   * Get the current ARI score for a provider (0-100).
   */
  getScore(provider: string): number {
    return this.getState(provider).score;
  }

  /**
   * Get the circuit state for a provider.
   */
  getCircuitState(provider: string): 'closed' | 'open' | 'half-open' {
    this.tickCircuitBreaker(provider);
    return this.getState(provider).circuitState;
  }

  // ── Per-Model API (ARI_ENHANCED) ──

  /** Get ARI score for a specific model under a provider. */
  getModelScore(provider: string, model: string): number {
    const key = `${provider}:${model}`;
    const ms = this.modelStates.get(key);
    return ms ? ms.score : this.getScore(provider);
  }

  /** Get circuit state for a specific model. */
  getModelCircuitState(provider: string, model: string): 'closed' | 'open' | 'half-open' {
    const key = `${provider}:${model}`;
    const ms = this.modelStates.get(key);
    return ms ? ms.circuitState : this.getCircuitState(provider);
  }

  /** Export full dashboard data for monitoring UI. */
  exportDashboard(): ARIDashboardExport {
    const report = this.getReport();
    const models: ModelARIState[] = Array.from(this.modelStates.values()).map(s => ({
      provider: s.provider,
      model: s.provider, // overwritten below
      score: Math.round(s.score * 10) / 10,
      circuitState: s.circuitState,
      errorCount: s.errorCount,
      successCount: s.successCount,
    }));
    // Fix model field from composite key
    for (const [key, state] of this.modelStates) {
      const [prov, mod] = key.split(':');
      const entry = models.find(m => m.provider === state.provider && m.score === Math.round(state.score * 10) / 10);
      if (entry) {
        entry.provider = prov;
        entry.model = mod;
      }
    }
    return {
      providers: report.providers,
      models,
      timestamp: Date.now(),
      uptimeMs: Date.now() - this.startedAt,
    };
  }

  // ── Internal helpers ──

  /** Track per-model health (lightweight — no circuit breaker logic, score tracking only) */
  private updateModelState(provider: string, model: string, success: boolean, latencyMs: number): void {
    const key = `${provider}:${model}`;
    let ms = this.modelStates.get(key);
    if (!ms) {
      ms = createDefaultState(key);
      ms.provider = provider;
      this.modelStates.set(key, ms);
    }
    if (success) {
      ms.successCount++;
      const penalty = this.calcLatencyPenalty(latencyMs);
      const raw = clamp(ms.score + 10 - penalty, 0, 100);
      ms.score = this.applyEMA(ms, raw);
    } else {
      ms.errorCount++;
      ms.lastErrorAt = Date.now();
      const raw = clamp(ms.score - 20, 0, 100);
      ms.score = this.applyEMA(ms, raw);
      if (ms.score < CIRCUIT_OPEN_THRESHOLD) ms.circuitState = 'open';
    }
  }

  private calcLatencyPenalty(latencyMs: number): number {
    if (latencyMs <= LATENCY_GOOD_MS) return 0;
    if (latencyMs >= LATENCY_BAD_MS) return 8;
    // Linear interpolation: 0 at GOOD, 8 at BAD
    const ratio = (latencyMs - LATENCY_GOOD_MS) / (LATENCY_BAD_MS - LATENCY_GOOD_MS);
    return ratio * 8;
  }

  private applyEMA(state: ARIState, newRaw: number): number {
    const history = state.emaHistory;
    const prev = history.length > 0 ? history[history.length - 1] : newRaw;
    const ema = EMA_ALPHA * newRaw + (1 - EMA_ALPHA) * prev;
    const clamped = clamp(ema, 0, 100);

    history.push(clamped);
    if (history.length > EMA_HISTORY_SIZE) {
      history.shift();
    }

    return clamped;
  }

  /**
   * Tick circuit breaker: promote open -> half-open after cooldown expires.
   */
  private tickCircuitBreaker(provider: string): void {
    const s = this.getState(provider);
    if (s.circuitState === 'open') {
      const elapsed = Date.now() - s.circuitOpenedAt;
      if (elapsed >= CIRCUIT_COOLDOWN_MS) {
        s.circuitState = 'half-open';
        s.halfOpenSuccessStreak = 0;
        logger.info('ari', `Circuit HALF-OPEN for ${provider} (cooldown elapsed: ${Math.round(elapsed / 1000)}s)`);
      }
    }
  }
}

// ============================================================
// PART 4 — Singleton & Dynamic Router
// ============================================================

/** Module-level singleton — shared across the web app */
export const ariManager = new ARIManager();

/**
 * Dynamic router: selects the healthiest provider for a given task.
 * Uses ARI scores to pick the best candidate from the supplied list.
 *
 * @param task - Task identifier (for future per-task weighting)
 * @param providers - List of candidate provider IDs
 * @returns The provider ID with the highest availability and health
 */
export function routeToHealthiest(task: string, providers: string[]): string {
  if (providers.length === 0) {
    throw new Error(`routeToHealthiest: no providers for task "${task}"`);
  }
  if (providers.length === 1) {
    return providers[0];
  }

  return ariManager.getBestProvider(providers);
}
