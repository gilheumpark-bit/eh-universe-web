// @ts-nocheck
/**
 * Minimal saga / compensation helper for AgentPanel apply flow (desktop).
 */

type SagaStep<T = unknown> = {
  name: string;
  execute: () => Promise<T>;
  compensate?: () => Promise<void>;
};

export class SagaOrchestrator {
  private readonly steps: SagaStep[] = [];

  constructor(private readonly _name: string) {}

  addStep<T>(step: SagaStep<T>): void {
    this.steps.push(step as SagaStep);
  }

  async execute(): Promise<{ status: string; error?: string }> {
    const completed: SagaStep[] = [];
    try {
      for (const s of this.steps) {
        await s.execute();
        completed.push(s);
      }
      return { status: "COMPLETED" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const s of [...completed].reverse()) {
        try {
          await s.compensate?.();
        } catch {
          /* best-effort rollback */
        }
      }
      return { status: "FAILED", error: msg };
    }
  }
}
