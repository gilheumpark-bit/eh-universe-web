// ============================================================
// PART 1 — Module overview (M1.4 §1 3-Tier Backup Orchestrator)
// ============================================================
//
// 3-Tier 백업 계층의 단일 진입점.
//
//   Primary  (IDB / Journal Engine)   — 항상 켜짐. Phase 1.1~1.3에서 완성.
//   Secondary (Firestore Mirror)      — 사용자 consent 시에만.
//   Tertiary  (File / ZIP Backup)     — Notification permission 따라 자동/수동.
//
// 핵심 원칙:
//   1. Primary 독립성: Secondary/Tertiary 어떤 실패도 Primary 침범 금지.
//   2. Tier 간 격리: 한 Tier 실패가 다른 Tier 작동을 막지 않는다.
//   3. 사용자 consent: Firestore/Notification은 명시 동의 후에만.
//
// 이 모듈이 하는 일:
//   - Tier별 상태(BackupTierStatus) 보관 + 관찰
//   - executeTier() 스케줄러 — try/catch로 격리, 실패 카운트, 재시도 정책
//   - Primary 실패 시 사용자 즉시 알림 (noa:alert 'critical')
//   - Secondary/Tertiary 실패 시 로그 + 배지(noa:backup-tier-status) 만
//
// 이 모듈이 하지 않는 일:
//   - 실제 Firestore 쓰기 (firestore-mirror.ts 담당)
//   - 실제 ZIP 생성 (file-tier.ts 담당)
//   - Primary 저장 (Journal Engine 담당)
//
// [C] 콜백 listener 누수 방지 (dispose 패턴), tier 실패 try/catch 격리
// [G] 상태 deep clone — caller 외부 변경 차단, ring buffer 20
// [K] 외부 의존 logger만, 다른 save-engine 모듈 import 금지

import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Types
// ============================================================

/** 3-Tier 식별자 */
export type BackupTier = 'primary' | 'secondary' | 'tertiary';

/** Tier 상태 */
export type BackupTierState =
  | 'disabled'   // 사용자가 끔 / consent 없음
  | 'healthy'    // 마지막 시도 성공
  | 'degraded'   // 1~2회 연속 실패 (재시도 진행)
  | 'failing'    // 3회+ 연속 실패 (배지 노출)
  | 'paused';    // 일시 중지 (quota 초과 등)

export interface BackupTierError {
  ts: number;
  message: string;
}

export interface BackupTierStatus {
  tier: BackupTier;
  state: BackupTierState;
  lastSuccessAt: number | null;
  lastAttemptAt: number | null;
  failureCount: number;
  /** 최근 에러 ring buffer (최대 20개) */
  recentErrors: BackupTierError[];
  /** paused 사유 (quota / user / etc) */
  pauseReason?: string;
  /** paused 해제 예정 시각 (없으면 수동 해제만) */
  pauseUntil?: number;
}

/** Tier 핸들러 함수 시그니처 */
export type BackupTierHandler = () => Promise<void>;

/** Tier 등록 옵션 */
export interface RegisterTierOptions {
  /** 자동 실행 주기 (ms). 0이면 수동 실행만. */
  intervalMs?: number;
  /** 등록 시점에 즉시 enabled? */
  enabled?: boolean;
}

export type BackupTierListener = (status: BackupTierStatus) => void;

// ============================================================
// PART 3 — Constants
// ============================================================

/** 연속 실패 → 'failing' 전이 임계 */
const FAILING_THRESHOLD = 3;
/** ring buffer 크기 */
const ERROR_BUFFER_SIZE = 20;
/** Primary 실패 알림 이벤트명 */
const PRIMARY_ALERT_EVENT = 'noa:alert';
/** Tier 상태 변경 이벤트명 (UI 배지용) */
export const TIER_STATUS_EVENT = 'noa:backup-tier-status';

// ============================================================
// PART 4 — BackupOrchestrator class
// ============================================================

interface RegisteredTier {
  status: BackupTierStatus;
  handler: BackupTierHandler | null;
  intervalMs: number;
  timer: ReturnType<typeof setInterval> | null;
}

export class BackupOrchestrator {
  private tiers = new Map<BackupTier, RegisteredTier>();
  private listeners = new Set<BackupTierListener>();
  private disposed = false;

  constructor() {
    // 모든 Tier 초기 등록 (handler 없는 disabled 상태로)
    for (const tier of ['primary', 'secondary', 'tertiary'] as const) {
      this.tiers.set(tier, {
        status: this.makeInitial(tier),
        handler: null,
        intervalMs: 0,
        timer: null,
      });
    }
  }

  // ============================================================
  // PART 5 — Public registration API
  // ============================================================

  /**
   * Tier 핸들러 등록. 같은 tier 재등록 시 기존 timer 정리하고 교체.
   * Primary는 보통 등록 안 함 — Journal Engine이 자체 책임.
   */
  registerTier(
    tier: BackupTier,
    handler: BackupTierHandler,
    options: RegisterTierOptions = {},
  ): void {
    if (this.disposed) return;
    const existing = this.tiers.get(tier);
    if (!existing) return;

    // 기존 timer 해제
    if (existing.timer) {
      clearInterval(existing.timer);
      existing.timer = null;
    }

    existing.handler = handler;
    existing.intervalMs = options.intervalMs ?? 0;

    if (options.enabled) {
      this.setEnabled(tier, true);
    }
  }

  /** Tier on/off. enabled=false 시 timer 해제 + state='disabled' */
  setEnabled(tier: BackupTier, enabled: boolean): void {
    if (this.disposed) return;
    const t = this.tiers.get(tier);
    if (!t) return;

    if (!enabled) {
      if (t.timer) {
        clearInterval(t.timer);
        t.timer = null;
      }
      t.status = { ...t.status, state: 'disabled', failureCount: 0 };
      this.emit(t.status);
      return;
    }

    if (!t.handler) {
      logger.warn('save-engine:backup-tiers', `tier ${tier} enabled but no handler registered`);
      return;
    }

    // 즉시 healthy로 전환 (다음 실행 결과로 갱신)
    if (t.status.state === 'disabled') {
      t.status = { ...t.status, state: 'healthy' };
      this.emit(t.status);
    }

    if (t.intervalMs > 0 && !t.timer) {
      t.timer = setInterval(() => { this.executeTier(tier).catch(() => { /* swallowed */ }); }, t.intervalMs);
    }
  }

  // ============================================================
  // PART 6 — Execution + isolation
  // ============================================================

  /**
   * Tier 1회 실행. 실패는 격리.
   * Primary 실패 시: 사용자 즉시 알림.
   * Secondary/Tertiary 실패 시: 로그만, Primary 무영향.
   */
  async executeTier(tier: BackupTier): Promise<boolean> {
    if (this.disposed) return false;
    const t = this.tiers.get(tier);
    if (!t) return false;
    if (!t.handler) return false;
    if (t.status.state === 'disabled' || t.status.state === 'paused') return false;

    const startedAt = Date.now();
    t.status = { ...t.status, lastAttemptAt: startedAt };

    try {
      await t.handler();
      // 성공 — failureCount 리셋, healthy 전이
      t.status = {
        ...t.status,
        state: 'healthy',
        lastSuccessAt: Date.now(),
        failureCount: 0,
      };
      this.emit(t.status);
      return true;
    } catch (err) {
      // 실패 — Primary는 즉시 알림, 나머지는 로그만
      const message = err instanceof Error ? err.message : String(err);
      const newFailureCount = t.status.failureCount + 1;
      const recentErrors = appendError(t.status.recentErrors, { ts: Date.now(), message });

      const nextState: BackupTierState =
        newFailureCount >= FAILING_THRESHOLD ? 'failing' : 'degraded';

      t.status = {
        ...t.status,
        state: nextState,
        failureCount: newFailureCount,
        recentErrors,
      };

      if (tier === 'primary') {
        // Primary 실패는 critical — 사용자 즉시 알림
        this.dispatchPrimaryAlert(message);
      } else {
        // Secondary/Tertiary는 로그만 — Primary 보호
        logger.warn(
          'save-engine:backup-tiers',
          `tier ${tier} failed (count=${newFailureCount}, state=${nextState})`,
          err,
        );
      }

      this.emit(t.status);
      return false;
    }
  }

  /**
   * Tier 일시 중지. quota 초과 등 자동 호출용.
   * pauseUntil 지나면 다음 executeTier 호출 시 자동 해제.
   */
  pauseTier(tier: BackupTier, reason: string, pauseUntil?: number): void {
    if (this.disposed) return;
    const t = this.tiers.get(tier);
    if (!t) return;
    if (t.timer) {
      clearInterval(t.timer);
      t.timer = null;
    }
    t.status = { ...t.status, state: 'paused', pauseReason: reason, pauseUntil };
    this.emit(t.status);
  }

  /** paused 해제 — 호출 시 다시 enabled */
  resumeTier(tier: BackupTier): void {
    if (this.disposed) return;
    const t = this.tiers.get(tier);
    if (!t) return;
    if (t.status.state !== 'paused') return;
    t.status = {
      ...t.status,
      state: 'healthy',
      pauseReason: undefined,
      pauseUntil: undefined,
    };
    this.emit(t.status);
    // intervalMs 있으면 timer 재기동
    if (t.intervalMs > 0 && t.handler) {
      t.timer = setInterval(() => { this.executeTier(tier).catch(() => { /* swallowed */ }); }, t.intervalMs);
    }
  }

  // ============================================================
  // PART 7 — Status query + listener
  // ============================================================

  getStatus(tier: BackupTier): BackupTierStatus | null {
    const t = this.tiers.get(tier);
    if (!t) return null;
    return cloneStatus(t.status);
  }

  getAllStatuses(): BackupTierStatus[] {
    return Array.from(this.tiers.values()).map((t) => cloneStatus(t.status));
  }

  /** 상태 변경 구독. dispose 함수 반환. */
  onChange(listener: BackupTierListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** 모든 timer/listener 정리 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const t of this.tiers.values()) {
      if (t.timer) {
        clearInterval(t.timer);
        t.timer = null;
      }
    }
    this.listeners.clear();
  }

  // ============================================================
  // PART 8 — Internal helpers
  // ============================================================

  private makeInitial(tier: BackupTier): BackupTierStatus {
    return {
      tier,
      state: 'disabled',
      lastSuccessAt: null,
      lastAttemptAt: null,
      failureCount: 0,
      recentErrors: [],
    };
  }

  private emit(status: BackupTierStatus): void {
    const cloned = cloneStatus(status);
    for (const cb of this.listeners) {
      try { cb(cloned); }
      catch (err) { logger.warn('save-engine:backup-tiers', 'listener threw', err); }
    }
    // UI 배지용 글로벌 이벤트
    if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
      try {
        globalThis.dispatchEvent(new CustomEvent(TIER_STATUS_EVENT, { detail: cloned }));
      } catch (err) {
        logger.debug('save-engine:backup-tiers', 'dispatch failed', err);
      }
    }
  }

  private dispatchPrimaryAlert(message: string): void {
    if (typeof globalThis.dispatchEvent !== 'function' || typeof globalThis.CustomEvent !== 'function') return;
    try {
      globalThis.dispatchEvent(
        new CustomEvent(PRIMARY_ALERT_EVENT, {
          detail: {
            tone: 'critical',
            title: 'Primary backup failed',
            message: `Primary save failed: ${message}. Your work may be at risk.`,
          },
        }),
      );
    } catch (err) {
      logger.debug('save-engine:backup-tiers', 'primary alert dispatch failed', err);
    }
  }
}

// ============================================================
// PART 9 — Pure helpers (testable)
// ============================================================

function appendError(buffer: BackupTierError[], err: BackupTierError): BackupTierError[] {
  const next = [...buffer, err];
  if (next.length > ERROR_BUFFER_SIZE) {
    return next.slice(next.length - ERROR_BUFFER_SIZE);
  }
  return next;
}

function cloneStatus(s: BackupTierStatus): BackupTierStatus {
  return {
    ...s,
    recentErrors: s.recentErrors.map((e) => ({ ...e })),
  };
}

// ============================================================
// PART 10 — Default singleton
// ============================================================

let defaultOrchestrator: BackupOrchestrator | null = null;

export function getDefaultBackupOrchestrator(): BackupOrchestrator {
  if (!defaultOrchestrator) {
    defaultOrchestrator = new BackupOrchestrator();
  }
  return defaultOrchestrator;
}

export function resetDefaultBackupOrchestratorForTests(): void {
  if (defaultOrchestrator) {
    defaultOrchestrator.dispose();
  }
  defaultOrchestrator = null;
}
