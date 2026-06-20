// ============================================================
// PART 1 — Migration: noa_projects_v2 → Journal (Spec Part 2.3 + 11)
// ============================================================
//
// 부팅 시 최초 1회:
//   1. localStorage['noa_projects_v2'] 확인
//   2. localStorage['noa_journal_migrated_v1'] 미존재 확인
//   3. migration:begin 엔트리
//   4. 기존 projects 파싱 → sanitize
//   5. snapshot 엔트리 (projectsCompressed)
//   6. migration:commit 엔트리
//   7. localStorage['noa_journal_migrated_v1'] = ISO
//   8. 기존 'noa_projects_v2' 키는 유지 (롤백 대비)

import { logger } from '@/lib/logger';
import type { MigrationPayload, SnapshotPayload, AppendResult } from './types';
import { CURRENT_SCHEMA_VERSION } from './types';
import { appendEntry } from './journal';
import { compressToBytes } from './compression';
import { sha256, utf8Encode } from './hash';

export const LS_KEY_LEGACY_PROJECTS = 'noa_projects_v2';
export const LS_KEY_MIGRATED_MARKER = 'noa_journal_migrated_v1';

// ============================================================
// PART 2 — State checks
// ============================================================

export function hasLegacyProjects(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY_LEGACY_PROJECTS) !== null;
  } catch {
    return false;
  }
}

export function isAlreadyMigrated(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY_MIGRATED_MARKER) !== null;
  } catch {
    return false;
  }
}

// ============================================================
// PART 3 — Migration orchestrator
// ============================================================

export interface MigrationResult {
  performed: boolean;
  reason: 'no-legacy' | 'already-migrated' | 'completed' | 'failed';
  snapshotEntryId?: string;
  error?: string;
}

/**
 * 기존 스토리지에서 projects 가져와 snapshot 엔트리로 보존.
 * 실패 시 rollback 마커 남김. 원본 데이터 절대 지우지 않음.
 */
export async function migrateLegacyProjects(): Promise<MigrationResult> {
  if (!hasLegacyProjects()) {
    return { performed: false, reason: 'no-legacy' };
  }
  if (isAlreadyMigrated()) {
    return { performed: false, reason: 'already-migrated' };
  }

  // Step 3: begin
  const beginResult = await appendMigrationPhase('begin');
  if (!beginResult.ok) {
    return { performed: false, reason: 'failed', error: 'begin append 실패' };
  }

  // Step 4: 파싱
  let raw: string | null;
  try { raw = localStorage.getItem(LS_KEY_LEGACY_PROJECTS); }
  catch (err) {
    await appendMigrationPhase('rollback');
    return { performed: false, reason: 'failed', error: `read 실패: ${errMsg(err)}` };
  }
  if (!raw) {
    await appendMigrationPhase('rollback');
    return { performed: false, reason: 'failed', error: '원본 키 null' };
  }

  // Step 5: snapshot 생성
  let snapshotResult: AppendResult;
  try {
    const json = raw;
    const bytes = utf8Encode(json);
    const rawHash = await sha256(bytes);
    const { bytes: compressed, compression } = await compressToBytes(bytes);

    const payload: SnapshotPayload = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      projectsCompressed: compressed,
      rawHash,
      compression,
      coversUpToEntryId: beginResult.entry!.id,
    };

    snapshotResult = await appendEntry({
      entryType: 'snapshot',
      payload,
      createdBy: 'migration',
      projectId: null,
    });
    if (!snapshotResult.ok) throw new Error('snapshot append 실패');
  } catch (err) {
    await appendMigrationPhase('rollback');
    return { performed: false, reason: 'failed', error: `snapshot: ${errMsg(err)}` };
  }

  // Step 6: commit
  const commitResult = await appendMigrationPhase('commit');
  if (!commitResult.ok) {
    return { performed: false, reason: 'failed', error: 'commit append 실패' };
  }

  // Step 7: marker (실패해도 재시도 안전 — snapshot은 이미 기록됨)
  try {
    localStorage.setItem(LS_KEY_MIGRATED_MARKER, new Date().toISOString());
  } catch (err) {
    logger.warn('save-engine:migration', 'marker write 실패', err);
  }

  return {
    performed: true,
    reason: 'completed',
    snapshotEntryId: snapshotResult.entry?.id,
  };
}

// ============================================================
// PART 4 — Phase helpers
// ============================================================

async function appendMigrationPhase(phase: MigrationPayload['phase']): Promise<AppendResult> {
  const payload: MigrationPayload = {
    fromVersion: 0, // 레거시 암시 버전
    toVersion: CURRENT_SCHEMA_VERSION,
    phase,
  };
  return appendEntry({
    entryType: 'migration',
    payload,
    createdBy: 'migration',
    projectId: null,
  });
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// ============================================================
// PART 5 — Rollback API (Phase 1.5 연결)
// ============================================================

/**
 * migration marker 제거. 다음 부팅 시 migrate 재시도됨.
 * 원본 LS_KEY_LEGACY_PROJECTS 는 건드리지 않음.
 */
export function rollbackMigrationMarker(): void {
  try {
    localStorage.removeItem(LS_KEY_MIGRATED_MARKER);
  } catch { /* noop */ }
}
