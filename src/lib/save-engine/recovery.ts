// ============================================================
// PART 1 — Boot recovery (Spec Part 7.1, 9 단계)
// ============================================================
//
// Step 1. 환경 감지
// Step 2. Beacon 확인
// Step 3. Tip 확인
// Step 4. 정상 종료 경로 (snapshot + tip 이후 delta 재생)
// Step 5. 크래시 추정 경로
// Step 6. Degraded 모드 (체인 손상)
// Step 7. React state 주입 (호출자 책임, 여기서는 projects 반환)
// Step 8. recovery-marker complete
// Step 9. 통지는 UI가 처리

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
// PART 2 — Result types
// ============================================================

export interface RecoveryPhase {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  label: string;
}

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
}

// ============================================================
// PART 3 — Orchestrator
// ============================================================

export async function runBootRecovery(): Promise<RecoveryResult> {
  const started = performance.now();
  const phases: RecoveryPhase[] = [];

  // Step 1: 환경 감지
  const environment = {
    indexedDB: isIndexedDBAvailable(),
    localStorage: isLocalStorageAvailable(),
  };
  routerBootCleanup();
  phases.push({ step: 1, label: 'environment-detected' });

  // Step 2: Beacon
  const crash = estimateCrash();
  phases.push({ step: 2, label: `beacon:${crash.reason}` });

  // Step 3: Tip
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
      started,
    });
  }

  // Seed HLC from tip entry clock
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

  // Step 4/5: snapshot + delta 재생
  const snapshotEntry = await findLatestSnapshotEntry();
  let projects: unknown = [];
  let snapshotId: string | null = null;
  let deltasReplayed = 0;
  let chainDamaged = false;
  let quarantinedCount = 0;

  if (snapshotEntry) {
    const snapshotRecord = await findSnapshotRecord(snapshotEntry);
    if (snapshotRecord) {
      try {
        const restored = await restoreSnapshot(snapshotRecord);
        if (restored.verified) {
          projects = restored.projects;
          snapshotId = snapshotRecord.id;
        } else {
          chainDamaged = true;
        }
      } catch (err) {
        logger.warn('save-engine:recovery', 'snapshot 복원 실패', err);
        chainDamaged = true;
      }
    }
  }

  // snapshot 이후 delta 재생
  const coversUpTo = snapshotEntry?.id ?? null;
  const subsequentDeltas = entries
    .filter((e) => e.entryType === 'delta')
    .filter((e) => !coversUpTo || e.id > coversUpTo);

  // 체인 verify — 빠른 실패 정책
  if (!chainDamaged && subsequentDeltas.length > 0) {
    // snapshot 엔트리 이후 전체(snapshot 엔트리 포함 이후 모든 엔트리)를 verify
    const afterSnapshot = coversUpTo ? entries.filter((e) => e.id > coversUpTo) : entries;
    const verifyFrom = snapshotEntry ? snapshotEntry.contentHash : GENESIS;
    const result = await verifyChain(afterSnapshot, { fromParentHash: verifyFrom });
    if (!result.ok) {
      chainDamaged = true;
      // Step 6: Degraded — break 지점부터 격리
      const breakIdx = afterSnapshot.findIndex((e) => e.id === result.breakAt);
      if (breakIdx >= 0) {
        for (const bad of afterSnapshot.slice(breakIdx)) {
          try { await idbQuarantineEntry(bad, result.reason ?? 'unknown'); quarantinedCount++; } catch { /* noop */ }
        }
        // 손상 전까지만 적용
        const safeDeltas = afterSnapshot.slice(0, breakIdx)
          .filter((e): e is JournalEntry & { payload: DeltaPayload } => e.entryType === 'delta')
          .map((e) => e.payload);
        projects = replayDeltas(projects, safeDeltas);
        deltasReplayed = safeDeltas.length;
        phases.push({ step: 6, label: `degraded:${result.reason}` });
      }
    } else {
      // 정상 — snapshot 이후 delta 전부 적용
      const deltas = subsequentDeltas.map((e) => e.payload as DeltaPayload);
      projects = replayDeltas(projects, deltas);
      deltasReplayed = deltas.length;
    }
  } else if (subsequentDeltas.length > 0 && !chainDamaged) {
    // 예외: snapshot 없이 delta만 있는 경우(최초 마이그레이션 전)
    const deltas = subsequentDeltas.map((e) => e.payload as DeltaPayload);
    projects = replayDeltas(projects, deltas);
    deltasReplayed = deltas.length;
  }

  if (recoveredFromCrash) {
    await appendRecoveryMarker('complete', 'crash-detected');
    phases.push({ step: 8, label: 'recovery-marker-complete' });
  }

  return finalize({
    projects,
    recoveredFromCrash,
    chainDamaged,
    quarantinedCount,
    snapshotId,
    deltasReplayed,
    environment,
    phases,
    started,
  });
}

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

function finalize(partial: Omit<RecoveryResult, 'durationMs'> & { started: number }): RecoveryResult {
  const { started, ...rest } = partial;
  return { ...rest, durationMs: performance.now() - started };
}
