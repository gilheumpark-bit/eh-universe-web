/**
 * ARI (Adaptive Routing Intelligence) — in-memory circuit breaker for AI providers.
 * Mirrors logic in apps/desktop/main/ipc/ai.ts; used by streamChat in ai-providers.
 */

const EMA_ALPHA = 0.3;
const FAILURE_THRESHOLD = 0.4;
const RECOVERY_THRESHOLD = 0.7;

export type CircuitState = "closed" | "open" | "half-open";

interface ARIState {
  ema: number;
  consecutiveFailures: number;
  state: CircuitState;
}

export class ARIManager {
  private readonly state = new Map<string, ARIState>();

  private getOrInit(id: string): ARIState {
    let s = this.state.get(id);
    if (!s) {
      // Start below 1.0 so a successful call increases EMA (tests + ipc behavior)
      s = { ema: 0.8, consecutiveFailures: 0, state: "closed" };
      this.state.set(id, s);
    }
    return s;
  }

  getScore(id: string): number {
    return this.getOrInit(id).ema;
  }

  getCircuitState(id: string): CircuitState {
    return this.getOrInit(id).state;
  }

  isAvailable(id: string): boolean {
    return this.getCircuitState(id) !== "open";
  }

  updateAfterCall(id: string, success: boolean, _latencyMs: number): void {
    const s = this.getOrInit(id);
    if (success) {
      s.ema = EMA_ALPHA * 1.0 + (1 - EMA_ALPHA) * s.ema;
      s.consecutiveFailures = 0;
      if (s.state === "half-open" && s.ema >= RECOVERY_THRESHOLD) {
        s.state = "closed";
      }
    } else {
      s.ema = EMA_ALPHA * 0.0 + (1 - EMA_ALPHA) * s.ema;
      s.consecutiveFailures += 1;
      if (s.state === "closed" && s.ema < FAILURE_THRESHOLD) {
        s.state = "open";
      }
    }
  }

  getBestProvider(ids: string[]): string {
    if (ids.length === 0) return "";
    return ids.reduce((a, b) => (this.getScore(a) >= this.getScore(b) ? a : b));
  }
}

export const ariManager = new ARIManager();
