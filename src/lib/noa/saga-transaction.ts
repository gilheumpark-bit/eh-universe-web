// ============================================================
// PART 1 — Saga Transaction Engine (L4 원자적 승인)
// ============================================================
// AI 작업 중 오류 발생 시 보상 트랜잭션으로 안전 롤백.
// 각 단계에 execute + compensate 쌍을 정의하여
// 실패 시 역순으로 보상 실행.

// ── Types ──

export interface SagaStep<T = unknown> {
  /** 단계 이름 (디버깅용) */
  name: string;
  /** 실행 함수 — 성공 시 결과 반환 */
  execute: () => Promise<T>;
  /** 보상 함수 — execute 성공 후 후속 단계 실패 시 호출 */
  compensate: (result: T) => Promise<void>;
}

export type SagaStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'COMPENSATING' | 'FAILED' | 'ROLLED_BACK';

export interface SagaResult {
  status: SagaStatus;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
  /** 각 단계별 결과 */
  stepResults: Map<string, unknown>;
  /** 전체 소요 시간 (ms) */
  durationMs: number;
}

export interface SagaAuditEntry {
  timestamp: number;
  sagaId: string;
  status: SagaStatus;
  steps: string[];
  failedStep?: string;
  error?: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=types

// ============================================================
// PART 2 — Saga Orchestrator
// ============================================================

let _sagaCounter = 0;

export class SagaOrchestrator {
  private steps: SagaStep[] = [];
  private auditLog: SagaAuditEntry[] = [];
  private readonly sagaId: string;

  constructor(name = 'unnamed') {
    this.sagaId = `saga-${name}-${++_sagaCounter}-${Date.now()}`;
  }

  /** 단계 추가 (execute + compensate 쌍) */
  addStep<T>(step: SagaStep<T>): this {
    this.steps.push(step as SagaStep);
    return this;
  }

  /** Saga 실행 — 실패 시 역순 보상 */
  async execute(): Promise<SagaResult> {
    const start = Date.now();
    const completedSteps: string[] = [];
    const stepResults = new Map<string, unknown>();
    const compensations: Array<() => Promise<void>> = [];

    // Forward execution
    for (const step of this.steps) {
      try {
        const result = await step.execute();
        completedSteps.push(step.name);
        stepResults.set(step.name, result);
        // 보상 함수를 스택에 push (역순 실행용)
        compensations.push(() => step.compensate(result));
      } catch (err) {
        // 실패 → 역순 보상 시작
        const failedStep = step.name;
        const errorMsg = err instanceof Error ? err.message : String(err);

        this.recordAudit('COMPENSATING', completedSteps, failedStep, errorMsg);

        // Compensate in reverse order
        for (let i = compensations.length - 1; i >= 0; i--) {
          try {
            await compensations[i]();
          } catch (compErr) {
            // 보상 실패 — 치명적, 로그만 남김
            console.error(`[SAGA] Compensation failed for step ${completedSteps[i]}:`, compErr);
          }
        }

        const result: SagaResult = {
          status: 'ROLLED_BACK',
          completedSteps,
          failedStep,
          error: errorMsg,
          stepResults,
          durationMs: Date.now() - start,
        };
        this.recordAudit('ROLLED_BACK', completedSteps, failedStep, errorMsg);
        return result;
      }
    }

    // 전체 성공
    const result: SagaResult = {
      status: 'COMPLETED',
      completedSteps,
      stepResults,
      durationMs: Date.now() - start,
    };
    this.recordAudit('COMPLETED', completedSteps);
    return result;
  }

  /** 감사 로그 기록 */
  private recordAudit(status: SagaStatus, steps: string[], failedStep?: string, error?: string): void {
    this.auditLog.push({
      timestamp: Date.now(),
      sagaId: this.sagaId,
      status,
      steps: [...steps],
      failedStep,
      error,
    });
  }

  /** 감사 로그 조회 */
  getAuditLog(): readonly SagaAuditEntry[] {
    return this.auditLog;
  }

  /** Saga ID 조회 */
  getId(): string {
    return this.sagaId;
  }
}

// IDENTITY_SEAL: PART-2 | role=orchestrator | inputs=SagaStep[] | outputs=SagaResult

// ============================================================
// PART 3 — 편의 빌더 + 프리셋
// ============================================================

/** AI 작업용 Saga 빌더 — 스냅샷 저장 → AI 실행 → 적용 → 검증 */
export function createAIWorkSaga(config: {
  /** 현재 상태 스냅샷 함수 */
  takeSnapshot: () => Promise<string>;
  /** 스냅샷 복원 함수 */
  restoreSnapshot: (snapshot: string) => Promise<void>;
  /** AI 작업 실행 */
  executeAI: () => Promise<string>;
  /** AI 결과 적용 */
  applyResult: (result: string) => Promise<void>;
  /** 적용 후 검증 */
  verify: () => Promise<boolean>;
  /** 적용 취소 */
  revertResult: () => Promise<void>;
}): SagaOrchestrator {
  const saga = new SagaOrchestrator('ai-work');

  let snapshot = '';

  saga.addStep({
    name: 'snapshot',
    execute: async () => {
      snapshot = await config.takeSnapshot();
      return snapshot;
    },
    compensate: async () => {
      // 스냅샷 단계는 보상 불필요
    },
  });

  saga.addStep({
    name: 'ai-execute',
    execute: async () => {
      return await config.executeAI();
    },
    compensate: async () => {
      // AI 실행 취소 — 스냅샷 복원
      if (snapshot) await config.restoreSnapshot(snapshot);
    },
  });

  saga.addStep({
    name: 'apply-result',
    execute: async () => {
      const aiResult = await config.executeAI(); // 이전 단계 결과 재사용 필요
      await config.applyResult(aiResult);
      return aiResult;
    },
    compensate: async () => {
      await config.revertResult();
    },
  });

  saga.addStep({
    name: 'verify',
    execute: async () => {
      const valid = await config.verify();
      if (!valid) throw new Error('검증 실패 — AI 결과가 품질 기준 미달');
      return valid;
    },
    compensate: async () => {
      await config.revertResult();
    },
  });

  return saga;
}

// IDENTITY_SEAL: PART-3 | role=builder | inputs=config | outputs=SagaOrchestrator
