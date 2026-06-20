// ============================================================
// PART 1 — Module overview (M1.4 §3 File Tier — Tertiary)
// ============================================================
//
// 1시간 주기 ZIP 백업 파일 생성. 사용자 디스크에 직접 저장.
//
// Notification permission UX:
//   - 허락:   ZIP 완성 즉시 자동 다운로드 + Notification로 알림
//   - 거부/미요청: "백업 준비됨 — 다운로드 버튼" 토스트만 띄움
//   - permission 요청은 사용자가 BackupNowButton/Settings에서 명시 액션할 때만
//
// 파일명: loreguard-backup-{projectId}-{YYYYMMDD-HHMMSS}.zip
//
// 백업 이력:
//   - localStorage 'noa_file_backup_history' (최근 5개) — 복구 추천용
//   - 파일 자체 위치는 추적 불가 (브라우저 다운로드 폴더 일임)
//
// 의존:
//   - exportFullBundleAsZip (full-backup.ts) — ZIP 생성 재사용 (수정 금지)
//   - 어떤 save-engine 모듈에도 의존 안 함 (Primary 무영향)
//
// [C] permission 요청은 사용자 명시 액션 후에만 — 강제 요청 금지
// [G] 동시 백업 락 (concurrent generate 방지) — 메모리 + ZIP 둘 다 무거움
// [K] full-backup.ts 함수 import만, 새 ZIP 로직 작성 금지

import { logger } from '@/lib/logger';
import {
  exportFullBundleAsZip,
  downloadZipBundle,
  type FullExportBundle,
} from '@/lib/full-backup';

// ============================================================
// PART 2 — Types
// ============================================================

export type NotificationDecision = 'granted' | 'denied' | 'default' | 'unsupported';

export interface FileBackupRecord {
  /** 백업 시각 (ms) */
  ts: number;
  /** 백업 대상 projectId */
  projectId: string;
  /** 다운로드된 파일명 */
  filename: string;
  /** ZIP 사이즈 (bytes) */
  sizeBytes: number;
  /** 자동 다운로드 / 수동 다운로드 구분 */
  mode: 'auto' | 'manual';
}

export interface FileBackupResult {
  /** 백업 성공 여부 */
  success: boolean;
  /** 다운로드 트리거 됨? */
  downloaded: boolean;
  /** 자동 / 수동 / skip */
  mode: 'auto' | 'manual' | 'skipped';
  /** 결과 파일명 (다운로드 안 됐어도 미리 계산해 토스트에 노출) */
  filename: string;
  /** 사이즈 */
  sizeBytes: number;
  /** 실패 사유 */
  error?: string;
}

export interface FileTierOptions {
  /** Notification 자동 요청을 허용할지 (true면 사용자 액션 시 자동으로 한 번 요청) */
  promptNotificationOnUserAction?: boolean;
  /** 이력 최대 보존 개수 (기본 5) */
  historyLimit?: number;
}

export type ProjectIdProvider = () => string | null;

// ============================================================
// PART 3 — Constants
// ============================================================

const HISTORY_STORAGE_KEY = 'noa_file_backup_history';
const DEFAULT_HISTORY_LIMIT = 5;
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1시간
/** 동시 백업 진행 락 — 모듈 전역 */
let generationLock = false;

// ============================================================
// PART 4 — Notification helpers
// ============================================================

/** 현재 Notification permission 상태 (요청 없이 조회만) */
export function getNotificationPermission(): NotificationDecision {
  if (typeof window === 'undefined') return 'unsupported';
  const N = (window as unknown as { Notification?: { permission: NotificationDecision } }).Notification;
  if (!N) return 'unsupported';
  return N.permission;
}

/**
 * 사용자 명시 액션 후 한 번 permission 요청.
 * permission이 'default'(아직 답 안 함)일 때만 요청. 'denied'면 무시.
 */
export async function requestNotificationPermissionOnce(): Promise<NotificationDecision> {
  if (typeof window === 'undefined') return 'unsupported';
  const N = (window as unknown as { Notification?: {
    permission: NotificationDecision;
    requestPermission: () => Promise<NotificationDecision>;
  } }).Notification;
  if (!N) return 'unsupported';
  if (N.permission !== 'default') return N.permission;
  try {
    return await N.requestPermission();
  } catch (err) {
    logger.debug('save-engine:file-tier', 'requestPermission failed', err);
    return N.permission;
  }
}

/** 백업 완성 알림 표시. permission 'granted'일 때만. */
function maybeShowNotification(filename: string, sizeBytes: number): void {
  if (typeof window === 'undefined') return;
  const N = (window as unknown as { Notification?: {
    permission: NotificationDecision;
    new(title: string, opts?: { body?: string; tag?: string }): unknown;
  } }).Notification;
  if (!N || N.permission !== 'granted') return;
  try {
    const sizeMb = (sizeBytes / 1024 / 1024).toFixed(2);
    new N('Loreguard backup ready', {
      body: `${filename} (${sizeMb} MB) saved to your Downloads.`,
      tag: 'loreguard-backup',
    });
  } catch (err) {
    logger.debug('save-engine:file-tier', 'notification failed', err);
  }
}

/** 백업 준비 토스트 (permission 없을 때) */
function dispatchPreparedToast(filename: string, sizeBytes: number): void {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof globalThis.CustomEvent !== 'function') return;
  try {
    globalThis.dispatchEvent(
      new CustomEvent('noa:alert', {
        detail: {
          tone: 'info',
          title: 'Backup ready',
          message: `${filename} is ready (${(sizeBytes / 1024 / 1024).toFixed(2)} MB). Click Backup Now to download.`,
        },
      }),
    );
  } catch (err) {
    logger.debug('save-engine:file-tier', 'toast dispatch failed', err);
  }
}

// ============================================================
// PART 5 — Filename builder
// ============================================================

/** YYYYMMDD-HHMMSS (UTC) */
function formatTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const MM = pad(d.getUTCMinutes());
  const SS = pad(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}-${HH}${MM}${SS}`;
}

export function buildBackupFilename(projectId: string, d: Date = new Date()): string {
  const safe = projectId.replace(/[^\w-]/g, '_').slice(0, 40) || 'project';
  return `loreguard-backup-${safe}-${formatTimestamp(d)}.zip`;
}

// ============================================================
// PART 6 — History (localStorage ring buffer)
// ============================================================

export function loadBackupHistory(): FileBackupRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is FileBackupRecord =>
      r != null && typeof r === 'object' &&
      typeof r.ts === 'number' &&
      typeof r.projectId === 'string' &&
      typeof r.filename === 'string',
    );
  } catch (err) {
    logger.warn('save-engine:file-tier', 'loadBackupHistory parse failed', err);
    return [];
  }
}

function saveBackupHistory(records: FileBackupRecord[], limit: number): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = records.slice(-limit);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    logger.warn('save-engine:file-tier', 'saveBackupHistory failed', err);
  }
}

function appendHistory(record: FileBackupRecord, limit: number): void {
  const all = [...loadBackupHistory(), record];
  saveBackupHistory(all, limit);
}

// ============================================================
// PART 7 — Core: generateBackup (Tier handler payload)
// ============================================================

/**
 * 1회 백업 생성 + 다운로드 시도.
 *   - permission granted: 자동 다운로드
 *   - 그 외: 토스트만 띄움 (사용자가 BackupNowButton 누르면 다운로드)
 *
 * 동시 호출 락 — 두 번째 호출은 즉시 skipped 반환.
 */
export async function generateBackup(
  projectId: string,
  options: FileTierOptions = {},
): Promise<FileBackupResult> {
  if (typeof window === 'undefined') {
    return { success: false, downloaded: false, mode: 'skipped', filename: '', sizeBytes: 0, error: 'ssr' };
  }
  if (generationLock) {
    return { success: false, downloaded: false, mode: 'skipped', filename: '', sizeBytes: 0, error: 'busy' };
  }
  generationLock = true;

  const filename = buildBackupFilename(projectId);
  let sizeBytes = 0;
  try {
    const blob = await exportFullBundleAsZip(projectId);
    if (!blob) {
      return { success: false, downloaded: false, mode: 'skipped', filename, sizeBytes: 0, error: 'zip-build-failed' };
    }
    sizeBytes = blob.size;

    const permission = getNotificationPermission();
    const limit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT;

    if (permission === 'granted') {
      // 자동 다운로드
      try {
        downloadZipBundle(blob, filename);
      } catch (err) {
        logger.warn('save-engine:file-tier', 'auto download failed', err);
        // 그래도 history는 기록 — 토스트로 fallback
        dispatchPreparedToast(filename, sizeBytes);
        appendHistory({ ts: Date.now(), projectId, filename, sizeBytes, mode: 'manual' }, limit);
        return { success: true, downloaded: false, mode: 'manual', filename, sizeBytes };
      }
      maybeShowNotification(filename, sizeBytes);
      appendHistory({ ts: Date.now(), projectId, filename, sizeBytes, mode: 'auto' }, limit);
      return { success: true, downloaded: true, mode: 'auto', filename, sizeBytes };
    }

    // permission 'default' / 'denied' / 'unsupported' — 토스트만
    dispatchPreparedToast(filename, sizeBytes);
    appendHistory({ ts: Date.now(), projectId, filename, sizeBytes, mode: 'manual' }, limit);
    return { success: true, downloaded: false, mode: 'manual', filename, sizeBytes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('save-engine:file-tier', 'generateBackup failed', err);
    return { success: false, downloaded: false, mode: 'skipped', filename, sizeBytes, error: message };
  } finally {
    generationLock = false;
  }
}

/**
 * 사용자 명시 "지금 백업" — 항상 다운로드 시도.
 * permission 무관. permission 'default'면 한 번 자동 요청.
 */
export async function backupNow(
  projectId: string,
  options: FileTierOptions = {},
): Promise<FileBackupResult> {
  if (typeof window === 'undefined') {
    return { success: false, downloaded: false, mode: 'skipped', filename: '', sizeBytes: 0, error: 'ssr' };
  }
  if (generationLock) {
    return { success: false, downloaded: false, mode: 'skipped', filename: '', sizeBytes: 0, error: 'busy' };
  }
  generationLock = true;

  const filename = buildBackupFilename(projectId);
  let sizeBytes = 0;
  try {
    // 사용자 명시 액션이므로 permission 한 번 요청 (옵션)
    if (options.promptNotificationOnUserAction !== false) {
      await requestNotificationPermissionOnce();
    }

    const blob = await exportFullBundleAsZip(projectId);
    if (!blob) {
      return { success: false, downloaded: false, mode: 'skipped', filename, sizeBytes: 0, error: 'zip-build-failed' };
    }
    sizeBytes = blob.size;
    try {
      downloadZipBundle(blob, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'download-failed';
      return { success: false, downloaded: false, mode: 'skipped', filename, sizeBytes, error: message };
    }

    const limit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT;
    appendHistory({ ts: Date.now(), projectId, filename, sizeBytes, mode: 'manual' }, limit);
    maybeShowNotification(filename, sizeBytes);
    return { success: true, downloaded: true, mode: 'manual', filename, sizeBytes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('save-engine:file-tier', 'backupNow failed', err);
    return { success: false, downloaded: false, mode: 'skipped', filename, sizeBytes, error: message };
  } finally {
    generationLock = false;
  }
}

// ============================================================
// PART 8 — Tier handler factory
// ============================================================

/**
 * BackupOrchestrator에 등록할 핸들러 생성.
 * provider null 반환 시 skip. 실패 시 throw.
 */
export function createFileTierHandler(
  provider: ProjectIdProvider,
  options: FileTierOptions = {},
): {
  handler: () => Promise<void>;
} {
  const handler = async (): Promise<void> => {
    const projectId = provider();
    if (!projectId) return;
    const result = await generateBackup(projectId, options);
    if (!result.success) {
      throw new Error(`file-tier failed: ${result.error ?? 'unknown'}`);
    }
  };
  return { handler };
}

// ============================================================
// PART 9 — Bundle preview helper (UI에 size 미리 표시용)
// ============================================================

export interface BundlePreview {
  estimatedBytes: number;
  episodeCount: number;
  sessionCount: number;
}

export function computeBundlePreview(bundle: FullExportBundle): BundlePreview {
  let bytes = 0;
  try {
    bytes = JSON.stringify(bundle).length;
  } catch {
    bytes = 0;
  }
  return {
    estimatedBytes: bytes,
    episodeCount: bundle.project?.episodes?.length ?? 0,
    sessionCount: bundle.sessions?.length ?? 0,
  };
}

// ============================================================
// PART 10 — Re-exports
// ============================================================

export const FILE_TIER_DEFAULTS = {
  HISTORY_STORAGE_KEY,
  DEFAULT_HISTORY_LIMIT,
  DEFAULT_INTERVAL_MS,
} as const;

/** 테스트용 — 락 해제 */
export function __resetFileTierLockForTests(): void {
  generationLock = false;
}
