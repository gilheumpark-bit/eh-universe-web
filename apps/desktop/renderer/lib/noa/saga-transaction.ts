// ============================================================
// NOA — Saga Transaction Orchestrator
// ============================================================
// Implements the Saga pattern for multi-step operations
// that need atomic semantics with compensation (rollback).
//
// Used by AgentPanel to apply code changes atomically:
//   snapshot → apply → verify
//   On failure at any step, compensations run in reverse order.

import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types
// ============================================================

export type SagaStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'COMPENSATING' | 'FAILED';

export interface SagaStep<T = unknown> {
  /** Human-readable step name */
  name: string;
  /** Forward execution — returns step result */
  execute: () => Promise<T>;
  /** Compensation (reverse) — called on failure of a later step */
  compensate?: () => Promise<void>;
}

export interface SagaResult {
  status: 'COMPLETED' | 'FAILED';
  /** The step that caused the failure, if any */
  failedStep?: string;
  /** Error message from the failing step */
  error?: string;
  /** Results from each completed step */
  stepResults: Array<{ name: string; result: unknown }>;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SagaStep,SagaResult

// ============================================================
// PART 2 — SagaOrchestrator
// ============================================================

export class SagaOrchestrator {
  private readonly name: string;
  private readonly steps: SagaStep[] = [];
  private status: SagaStatus = 'PENDING';

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Add a step to the saga. Steps execute in insertion order.
   * Compensations run in reverse order on failure.
   */
  addStep<T = unknown>(step: SagaStep<T>): void {
    if (this.status !== 'PENDING') {
      throw new Error(`[Saga:${this.name}] Cannot add steps after execution has started`);
    }
    this.steps.push(step as SagaStep);
  }

  /**
   * Execute all steps in order.
   * If any step fails, run compensations for all previously completed steps (reverse).
   */
  async execute(): Promise<SagaResult> {
    this.status = 'RUNNING';
    const completedSteps: Array<{ step: SagaStep; result: unknown }> = [];

    logger.info(`[Saga:${this.name}] Starting ${this.steps.length} step(s)`);

    for (const step of this.steps) {
      try {
        const result = await step.execute();
        completedSteps.push({ step, result });
        logger.info(`[Saga:${this.name}] Step "${step.name}" completed`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`[Saga:${this.name}] Step "${step.name}" failed: ${errorMessage}`);

        // Run compensations in reverse order
        this.status = 'COMPENSATING';
        await this.compensate(completedSteps);

        this.status = 'FAILED';
        return {
          status: 'FAILED',
          failedStep: step.name,
          error: errorMessage,
          stepResults: completedSteps.map(({ step: s, result }) => ({
            name: s.name,
            result,
          })),
        };
      }
    }

    this.status = 'COMPLETED';
    logger.info(`[Saga:${this.name}] All steps completed successfully`);

    return {
      status: 'COMPLETED',
      stepResults: completedSteps.map(({ step: s, result }) => ({
        name: s.name,
        result,
      })),
    };
  }

  /**
   * Run compensations for completed steps in reverse order.
   * Compensation errors are logged but do not halt the compensation chain.
   */
  private async compensate(
    completedSteps: Array<{ step: SagaStep; result: unknown }>,
  ): Promise<void> {
    logger.info(`[Saga:${this.name}] Running ${completedSteps.length} compensation(s)`);

    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const { step } = completedSteps[i];
      if (!step.compensate) continue;

      try {
        await step.compensate();
        logger.info(`[Saga:${this.name}] Compensated "${step.name}"`);
      } catch (compErr: unknown) {
        // Compensation failures are critical but must not stop the chain
        const msg = compErr instanceof Error ? compErr.message : String(compErr);
        logger.error(`[Saga:${this.name}] Compensation for "${step.name}" failed: ${msg}`);
      }
    }
  }

  /** Get current saga status */
  getStatus(): SagaStatus {
    return this.status;
  }

  /** Get saga name */
  getName(): string {
    return this.name;
  }
}

// IDENTITY_SEAL: PART-2 | role=orchestrator | inputs=SagaStep[] | outputs=SagaResult
