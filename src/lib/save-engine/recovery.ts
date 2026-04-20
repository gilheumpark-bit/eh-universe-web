// ============================================================
// PART 1 — Module overview (Spec Part 7 + M1.2)
// ============================================================
//
// 부팅 시 복구 플로우 9단계 (Spec Part 7.1):
//   Step 1. 환경 감지
//   Step 2. Beacon 확인
//   Step 3. Tip 확인
//   Step 4. 정상 종료 경로 (snapshot + tip 이후 delta 재생)
//   Step 5. 크래시 추정 경로
//   Step 6. Degraded 모드 (체인 손상)
//   Step 7. React state 주입 (호출자 책임)
//   Step 8. recovery-marker complete
//   Step 9. UI 통지
//
// M1.2 확장 — 3 Recovery Strategy (Spec Part 7.2 degraded 진행):
//   1. full           : snapshot + 이후 delta 전수 재생 (이상적)
//   2. journal-only   : snapshot 손상 → 저널 전수 재생
//   3. degraded       : 일부 손상 → 가능한 부분만 + 손실 고지
//   4. none           : 완전 복구 불가 → 빈 상태
//
// 손실 추정 (estimatedLossMs) 규칙:
//   - degraded: 가장 이른 격리 엔트리의 clock 이후 전부 손실로 간주
//   - journal-only: snapshot 기준 시각 이후 엔트리 0건이면 0, 있으면 재생된
//     가장 최근 시각과 wall clock now의 차이
//   - full / none: 0 (full은 완전, none은 적용 없음)
//
// 복구 가능 분량 (recoveredUpTo): 실제 적용된 마지막 엔트리의 wall clock (HLC physical).

import { logger } from '@/lib/logger';
import type {
  RecoveryMarkerPayload,
  JournalEntry,
  DeltaPayload,
} from './types';
import { GENESIS } from './types';
import { appendEntry, appendInitEntry, readAllEntries, seedHLCFromTip } from './journal';
import { estimateCrash } from './beacon';
import { restoreSnapshot, findLatestSnapshotEntry } from './snapshot';
import { idbListSnapshots, idbQuarantineEntry, type SnapshotRecord } from './indexeddb-adapter';
import { routerGetTip, routerBootCleanup } from './storage-router';
import { isIndexedDBAvailable } from './indexeddb-adapter';
import { isLocalStorageAvailable } from './localstorage-adapter';
import { verifyChain } from './hash';
import { replayDeltas } from './delta';

// ============================================================
// PART 2 — Result types (legacy + M1.2 strategy)
// ============================================================

export interface RecoveryPhase {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  label: string;
}

/** M1.2 — 복구 전략 분류. */
export type RecoveryStrategy = 'full' | 'journal-only' | 'degraded' | 'none';

/**
 * M1.2 결과 페이로드. 기존 필드는 전부 보존해 recovery.test.ts 호환.
 * 신규 필드는 strategy / recoveredUpTo / estimatedLossMs / corruptedEntries /
 * fallbackSnapshotId / state.
 */
export interface RecoveryResult {
  /** 복구된 projects (빈 시작이면 []) */
  projects: unknown;
  /** 크래시 이후 복구 여부 */
  recoveredFromCrash: boolean;
  /** 체인 손상 감지 여부 */
  chainDamaged: boolean;
  /** 격리된 엔트리 수 */
  quarantinedCount: number;
  /** 가장 최근 snapshot id (없으면 null) */
  snapshotId: string | null;
  /** 적용된 delta 수 */
  deltasReplayed: number;
  /** 소요 시간 (ms) */
  durationMs: number;
  /** 환경 진단 */
  environment: {
    indexedDB: boolean;
    localStorage: boolean;
  };
  phases: RecoveryPhase[];

  // --- M1.2 신규 필드 ---
  /** 사용된 복구 전략. */
  strategy: RecoveryStrategy;
  /** 복구된 마지막 엔트리의 wall clock ms. 없으면 null. */
  recoveredUpTo: number | null;
  /** 예상 손실 시간 ms. 무손실이면 0. */
  estimatedLossMs: number;
  /** 손상 엔트리 수 (= quarantinedCount와 동기화). */
  corruptedEntries: number;
  /** degraded/journal-only 시 부분 복구에 사용된 snapshot id. */
  fallbackSnapshotId: string | null;
  /** Studio가 주입할 수 있는 최종 상태(= projects의 alias). */
  state: unknown;
}

// ============================================================
// PART 3 — Orchestrator (Spec 7.1 9-step, M1.2 확장)
// ============================================================

/**
 * 부팅 시 1회 호출. 9-step 플로우를 실행하고 3-Strategy 중 하나를 선택한 결과를
 * 반환. 호출자는 반환 후 projects를 state에 주입하고 필요 시 RecoveryDialog 렌더.
 */
export async function runBootRecovery(): Promise<RecoveryResult> {
  const started = performance.now();
  const phases: RecoveryPhase[] = [];

  // Step 1 — 환경 감지
  const environment = {
    indexedDB: isIndexedDBAvailable(),
    localStorage: isLocalStorageAvailable(),
  };
  routerBootCleanup();
  phases.push({ step: 1, label: 'environment-detected' });

  // Step 2 — Beacon 평가 (M1.2 4-state)
  const crash = estimateCrash();
  phases.push({ step: 2, label: `beacon:${crash.reason}` });

  // Step 3 — Tip
  const tip = await routerGetTip();
  phases.push({ step: 3, label: `tip:${tip.tipId ? 'present' : 'missing'}` });

  if (!tip.tipId) {
    // 최초 부팅 — init 엔트리 append, 빈 Projects
    await appendInitEntry();
    return finalize({
      projects: [],
      recoveredFromCrash: false,
      chainDamaged: false,
      quarantinedCount: 0,
      snapshotId: null,
      deltasReplayed: 0,
      environment,
      phases,
      strategy: 'none',
      recoveredUpTo: null,
      estimatedLossMs: 0,
      corruptedEntries: 0,
      fallbackSnapshotId: null,
      started,
    });
  }

  // HLC seed
  const entries = await readAllEntries();
  const tipEntry = entries.find((e) => e.id === tip.tipId);
  if (tipEntry) seedHLCFromTip(tipEntry.clock);

  const recoveredFromCrash = crash.crashed;

  if (recoveredFromCrash) {
    await appendRecoveryMarker('enter', 'crash-detected', crash.lastHeartbeatAt);
    phases.push({ step: 5, label: 'recovery-marker-enter' });
  } else {
    phases.push({ step: 4, label: 'normal-boot' });
  }

  // 복구 실행 — 3 Strategy 선택
  const outcome = await executeRecoveryStrategies({
    allEntries: entries,
    phases,
  });

  if (recoveredFromCrash) {
    await appendRecoveryMarker('complete', 'crash-detected');
    phases.push({ step: 8, label: 'recovery-marker-complete' });
  }

  return finalize({
    projects: outcome.projects,
    recoveredFromCrash,
    chainDamaged: outcome.chainDamaged,
    quarantinedCount: outcome.quarantinedCount,
    snapshotId: outcome.snapshotId,
    deltasReplayed: outcome.deltasReplayed,
    environment,
    phases,
    strategy: outcome.strategy,
    recoveredUpTo: outcome.recoveredUpTo,
    estimatedLossMs: outcome.estimatedLossMs,
    corruptedEntries: outcome.quarantinedCount,
    fallbackSnapshotId: outcome.fallbackSnapshotId,
    started,
  });
}

// ============================================================
// PART 4 — Strategy executor (M1.2)
// ============================================================

interface StrategyInput {
  allEntries: JournalEntry[];
  phases: RecoveryPhase[];
}

interface StrategyOutcome {
  projects: unknown;
  snapshotId: string | null;
  deltasReplayed: number;
  chainDamaged: boolean;
  quarantinedCount: number;
  strategy: RecoveryStrategy;
  recoveredUpTo: number | null;
  estimatedLossMs: number;
  fallbackSnapshotId: string | null;
}

/**
 * 3-Strategy 우선순위:
 *   1) fullRecovery  (snapshot OK + chain OK)
 *   2) journalOnlyRecovery (snapshot 손상/없음, journal OK)
 *   3) degradedRecovery (부분 손상 — 격리 후 남은 것만)
 *   4) 'none' (완전 불가 — 빈 상태)
 */
async function executeRecoveryStrategies(input: StrategyInput): Promise<StrategyOutcome> {
  const snapshotEntry = await findLatestSnapshotEntry();

  // --- 시도 1: FULL ---
  const fullAttempt = await tryFullRecovery(input.allEntries, snapshotEntry, input.phases);
  if (fullAttempt) return fullAttempt;

  // --- 시도 2: JOURNAL-ONLY (snapshot 못 쓰는 경우) ---
  const journalAttempt = await tryJournalOnlyRecovery(input.allEntries, input.phases);
  if (journalAttempt) return journalAttempt;

  // --- 시도 3: DEGRADED (부분 복구) ---
  return await tryDegradedRecovery(input.allEntries, snapshotEntry, input.phases);
}

/**
 * snapshot 복원 + 이후 delta 전수 재생. 체인도 검증. 전부 통과해야 성공.
 */
async function tryFullRecovery(
  all: JournalEntry[],
  snapshotEntry: JournalEntry | null,
  phases: RecoveryPhase[],
): Promise<StrategyOutcome | null> {
  if (!snapshotEntry) return null;

  const snapshotRecord = await findSnapshotRecord(snapshotEntry);
  if (!snapshotRecord) return null;

  let projects: unknown;
  try {
    const restored = await restoreSnapshot(snapshotRecord);
    if (!restored.verified) return null;
    projects = restored.projects;
  } catch (err) {
    logger.warn('save-engine:recovery', 'tryFullRecovery snapshot 복원 실패', err);
    return null;
  }

  // snapshot 이후 entries
  const afterSnapshot = all.filter((e) => e.id > snapshotEntry.id);
  if (afterSnapshot.length > 0) {
    const verifyFrom = snapshotEntry.contentHash;
    const verifyResult = await verifyChain(afterSnapshot, { fromParentHash: verifyFrom });
    if (!verifyResult.ok) {
      // 체인 깨짐 → full 불가. degraded에서 처리.
      return null;
    }
  }

  const deltas = afterSnapshot
    .filter((e): e is JournalEntry & { payload: DeltaPayload } => e.entryType === 'delta')
    .map((e) => e.payload);
  projects = replayDeltas(projects, deltas);

  const lastEntry = afterSnapshot.length > 0 ? afterSnapshot[afterSnapshot.length - 1] : snapshotEntry;
  phases.push({ step: 4, label: `full-recovery:deltas=${deltas.length}` });

  return {
    projects,
    snapshotId: snapshotRecord.id,
    deltasReplayed: deltas.length,
    chainDamaged: false,
    quarantinedCount: 0,
    strategy: 'full',
    recoveredUpTo: lastEntry.clock.physical,
    estimatedLossMs: 0,
    fallbackSnapshotId: snapshotRecord.id,
  };
}

/**
 * snapshot이 없거나 손상됐지만 journal chain은 온전한 경우.
 * init 엔트리부터 처음부터 재생.
 */
async function tryJournalOnlyRecovery(
  all: JournalEntry[],
  phases: RecoveryPhase[],
): Promise<StrategyOutcome | null> {
  if (all.length === 0) return null;

  // GENESIS부터 verify
  const verifyResult = await verifyChain(all, { fromParentHash: GENESIS });
  if (!verifyResult.ok) return null;

  const deltas = all
    .filter((e): e is JournalEntry & { payload: DeltaPayload } => e.entryType === 'delta')
    .map((e) => e.payload);
  const projects = replayDeltas([] as unknown, deltas);

  const lastEntry = all[all.length - 1];
  phases.push({ step: 5, label: `journal-only-recovery:deltas=${deltas.length}` });

  return {
    projects,
    snapshotId: null,
    deltasReplayed: deltas.length,
    chainDamaged: false,
    quarantinedCount: 0,
    strategy: 'journal-only',
    recoveredUpTo: lastEntry.clock.physical,
    estimatedLossMs: 0,
    fallbackSnapshotId: null,
  };
}

/**
 * 부분 손상 — 가장 이른 break 지점까지만 복구, 이후는 격리.
 * snapshot을 기반으로 시도하고, snapshot 자체도 못 쓰면 GENESIS부터 시도.
 */
async function tryDegradedRecovery(
  all: JournalEntry[],
  snapshotEntry: JournalEntry | null,
  phases: RecoveryPhase[],
): Promise<StrategyOutcome> {
  let projects: unknown = [];
  let snapshotId: string | null = null;
  let fallbackSnapshotId: string | null = null;

  // snapshot 시도
  if (snapshotEntry) {
    const rec = await findSnapshotRecord(snapshotEntry);
    if (rec) {
      try {
        const restored = await restoreSnapshot(rec);
        if (restored.verified) {
          projects = restored.projects;
          snapshotId = rec.id;
          fallbackSnapshotId = rec.id;
        }
      } catch (err) {
        logger.warn('save-engine:recovery', 'degraded snapshot restore failed', err);
      }
    }
  }

  // snapshot 이후(없으면 전체) verify 시도
  const afterSnapshot = snapshotEntry
    ? all.filter((e) => e.id > snapshotEntry.id)
    : all;
  const verifyFrom = snapshotEntry ? snapshotEntry.contentHash : GENESIS;

  let quarantinedCount = 0;
  let appliedDeltas: DeltaPayload[] = [];
  let recoveredUpTo: number | null = snapshotEntry?.clock.physical ?? null;
  let estimatedLossMs = 0;

  if (afterSnapshot.length === 0) {
    // snapshot은 있고 이후 변경 없음 — 손상 없음 케이스 (full이 잡았어야 정상)
    phases.push({ step: 6, label: 'degraded:no-entries-after-snapshot' });
    return {
      projects,
      snapshotId,
      deltasReplayed: 0,
      chainDamaged: false,
      quarantinedCount: 0,
      strategy: snapshotId ? 'full' : 'none',
      recoveredUpTo,
      estimatedLossMs: 0,
      fallbackSnapshotId,
    };
  }

  const verifyResult = await verifyChain(afterSnapshot, { fromParentHash: verifyFrom });
  if (verifyResult.ok) {
    // 체인은 정상인데 full/journal 시도가 실패한 케이스 (예: snapshot 복원 실패 + journal은 OK이나 snapshot 참조 필요)
    // → 안전하게 journal-only 라우트처럼 재생
    appliedDeltas = afterSnapshot
      .filter((e): e is JournalEntry & { payload: DeltaPayload } => e.entryType === 'delta')
      .map((e) => e.payload);
    projects = replayDeltas(projects, appliedDeltas);
    const lastEntry = afterSnapshot[afterSnapshot.length - 1];
    recoveredUpTo = lastEntry.clock.physical;
    phases.push({ step: 6, label: `degraded:chain-ok-deltas=${appliedDeltas.length}` });
    return {
      projects,
      snapshotId,
      deltasReplayed: appliedDeltas.length,
      chainDamaged: false,
      quarantinedCount: 0,
      strategy: snapshotId ? 'full' : 'degraded',
      recoveredUpTo,
      estimatedLossMs: 0,
      fallbackSnapshotId,
    };
  }

  // 체인 손상 — break 지점까지만 재생, 이후 격리
  const breakIdx = afterSnapshot.findIndex((e) => e.id === verifyResult.breakAt);
  if (breakIdx >= 0) {
    const bad = afterSnapshot.slice(breakIdx);
    for (const b of bad) {
      try {
        await idbQuarantineEntry(b, verifyResult.reason ?? 'unknown');
        quarantinedCount++;
      } catch {
        /* noop — LS 전용 환경에서는 격리 skip */
      }
    }

    const safe = afterSnapshot.slice(0, breakIdx);
    appliedDeltas = safe
      .filter((e): e is JournalEntry & { payload: DeltaPayload } => e.entryType === 'delta')
      .map((e) => e.payload);
    projects = replayDeltas(projects, appliedDeltas);

    if (safe.length > 0) {
      recoveredUpTo = safe[safe.length - 1].clock.physical;
    }
    // 손실 추정 — 격리된 가장 이른 엔트리와 가장 늦은 엔트리 사이 시간
    if (bad.length > 0) {
      const earliestLost = bad[0].clock.physical;
      const latestLost = bad[bad.length - 1].clock.physical;
      estimatedLossMs = Math.max(0, latestLost - earliestLost);
    }

    phases.push({
      step: 6,
      label: `degraded:${verifyResult.reason ?? 'unknown'}:quarantined=${quarantinedCount}`,
    });
  } else {
    // break 지점 찾지 못함 — 방어적으로 snapshot까지만
    phases.push({ step: 6, label: 'degraded:unknown-break' });
  }

  return {
    projects,
    snapshotId,
    deltasReplayed: appliedDeltas.length,
    chainDamaged: true,
    quarantinedCount,
    strategy: 'degraded',
    recoveredUpTo,
    estimatedLossMs,
    fallbackSnapshotId,
  };
}

// ============================================================
// PART 5 — Helpers
// ============================================================

async function findSnapshotRecord(entry: JournalEntry): Promise<SnapshotRecord | null> {
  const list = await idbListSnapshots();
  return list.find((r) => r.id === entry.id) ?? null;
}

async function appendRecoveryMarker(
  phase: RecoveryMarkerPayload['phase'],
  reason: RecoveryMarkerPayload['reason'],
  lastHeartbeatAt?: number,
): Promise<void> {
  await appendEntry({
    entryType: 'recovery-marker',
    payload: { phase, reason, lastHeartbeatAt },
    createdBy: 'recovery',
    projectId: null,
  });
}

interface FinalizeInput extends Omit<RecoveryResult, 'durationMs' | 'state'> {
  started: number;
}

function finalize(partial: FinalizeInput): RecoveryResult {
  const { started, projects, ...rest } = partial;
  return {
    ...rest,
    projects,
    state: projects,
    durationMs: performance.now() - started,
  };
}
