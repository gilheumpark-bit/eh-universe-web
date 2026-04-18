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

  // [C] Saga 단계 간 결과 공유용 클로저 스토리지.
  // ai-execute의 결과를 apply-result가 재사용해야 한다 (AI 재호출 금지).
  let snapshot = '';
  let aiResult = '';

  saga.addStep({
    name: 'snapshot',
    execute: async () => {
      snapshot = await config.takeSnapshot();
      return snapshot;
    },
    compensate: async () => {
      // 의도적 no-op: 스냅샷 찍기 자체는 되돌릴 대상 아님.
      // 스냅샷 복원은 ai-execute compensate에서 수행.
    },
  });

  saga.addStep({
    name: 'ai-execute',
    execute: async () => {
      aiResult = await config.executeAI();
      return aiResult;
    },
    compensate: async () => {
      // AI 실행 취소 — 스냅샷 복원
      if (snapshot) await config.restoreSnapshot(snapshot);
    },
  });

  saga.addStep({
    name: 'apply-result',
    execute: async () => {
      // [C] 이전 단계 aiResult 재사용 — executeAI 재호출 금지 (토큰 낭비 + 비결정적)
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

// ============================================================
// PART 4 — HSM Signer (암호학적 점화)
// ============================================================
// 사용자 승인 시 디지털 서명을 생성하여 부인 방지(Non-repudiation).
// 웹 환경: Web Crypto API 기반 HMAC-SHA256 서명.

export type OrbitType = 'STANDARD' | 'ACCELERATED' | 'WARP';

export interface OrbitPayload {
  orbit: OrbitType;
  queryHash: string;
  sviScore: number;
  parameters: Record<string, unknown>;
}

export interface SignedEnvelope {
  payloadHash: string;
  signature: string;
  keyId: string;
  timestampMs: number;
  sessionId: string;
}

/** Web Crypto API 기반 HMAC-SHA256 서명 */
async function hmacSign(data: string, key: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // 폴백: 단순 해시 (서버 환경)
    let hash = 0;
    const combined = key + data;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 해시 */
async function sha256(data: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export class HSMSigner {
  private keyId: string;

  constructor(deviceKeyId = 'eh-web-device') {
    this.keyId = deviceKeyId;
  }

  /** 궤도 페이로드 서명 */
  async sign(payload: OrbitPayload, sessionId: string): Promise<SignedEnvelope> {
    const serialized = this.serialize(payload);
    const payloadHash = await sha256(serialized);
    // NOTE: 프로덕션에서는 WebAuthn 또는 서버 HSM으로 교체
    const signature = await hmacSign(serialized, 'noa-hsm-dev-key');

    return {
      payloadHash,
      signature,
      keyId: this.keyId,
      timestampMs: Date.now(),
      sessionId,
    };
  }

  /** 서명 검증 (부인 방지) */
  async verify(envelope: SignedEnvelope, payload: OrbitPayload): Promise<boolean> {
    const expectedHash = await sha256(this.serialize(payload));
    if (expectedHash !== envelope.payloadHash) return false;
    const expectedSig = await hmacSign(this.serialize(payload), 'noa-hsm-dev-key');
    return expectedSig === envelope.signature;
  }

  private serialize(payload: OrbitPayload): string {
    return [
      payload.orbit,
      payload.queryHash,
      payload.sviScore.toFixed(6),
      JSON.stringify(Object.entries(payload.parameters).sort()),
    ].join('|');
  }
}

// IDENTITY_SEAL: PART-4 | role=hsm-signer | inputs=OrbitPayload | outputs=SignedEnvelope

// ============================================================
// PART 5 — Atomic HITL Gate (L4 진입점)
// ============================================================
// 사용자 궤도 선택 → HSM 서명 → Saga 실행 → 감사 로그.
// 3위상 궤도: STANDARD(전체검증) / ACCELERATED(일부생략) / WARP(캐시기반).

export interface HITLResult {
  approved: boolean;
  orbit: OrbitType;
  sessionId: string;
  sagaResult?: SagaResult;
  envelope?: SignedEnvelope;
  /** 기술 부채 텐서 (워프 궤도 시) */
  debtTensor?: {
    utility: number;
    epistemicDebt: number;
    securityDebt: number;
  };
  auditTrail: string[];
}

export class AtomicHITLGate {
  private signer: HSMSigner;
  private auditLog: string[] = [];

  constructor(signer?: HSMSigner) {
    this.signer = signer ?? new HSMSigner();
  }

  /**
   * 사용자 승인 수신 → 서명 → Saga 실행.
   * userConfirmed=false → 즉시 ABORTED.
   */
  async approveAndExecute(
    payload: OrbitPayload,
    userConfirmed: boolean,
    steps: SagaStep[],
  ): Promise<HITLResult> {
    const sessionId = `hitl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.auditLog = [];

    if (!userConfirmed) {
      this.audit('USER_REJECTED', { orbit: payload.orbit });
      return {
        approved: false,
        orbit: payload.orbit,
        sessionId,
        auditTrail: [...this.auditLog],
      };
    }

    // 워프 궤도 경고 + 기술 부채 텐서 계산
    let debtTensor: HITLResult['debtTensor'];
    if (payload.orbit === 'WARP') {
      debtTensor = {
        utility: 0.6,
        epistemicDebt: -0.25,
        securityDebt: -0.15,
      };
      this.audit('WARP_ORBIT_WARNING', debtTensor);
    }

    // HSM 서명
    const envelope = await this.signer.sign(payload, sessionId);
    this.audit('HSM_SIGNED', { keyId: envelope.keyId, hash: envelope.payloadHash.slice(0, 16) });

    // Saga 실행
    const saga = new SagaOrchestrator(`hitl-${payload.orbit}`);
    for (const step of steps) saga.addStep(step);

    const sagaResult = await saga.execute();
    this.audit('SAGA_COMPLETE', { status: sagaResult.status, steps: sagaResult.completedSteps.length });

    return {
      approved: true,
      orbit: payload.orbit,
      sessionId,
      sagaResult,
      envelope,
      debtTensor,
      auditTrail: [...this.auditLog, ...saga.getAuditLog().map(e => `[${e.timestamp}] ${e.status} ${e.steps.join(',')}`)]
    };
  }

  /** 서명 검증 (사후 감사용) */
  async verifySignature(envelope: SignedEnvelope, payload: OrbitPayload): Promise<boolean> {
    return this.signer.verify(envelope, payload);
  }

  private audit(event: string, meta?: Record<string, unknown>): void {
    this.auditLog.push(`[${Date.now()}] ${event} ${meta ? JSON.stringify(meta) : ''}`);
  }
}

// IDENTITY_SEAL: PART-5 | role=hitl-gate | inputs=OrbitPayload,userConfirmed,steps | outputs=HITLResult
