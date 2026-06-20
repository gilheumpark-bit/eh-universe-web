// ============================================================
// PART 0: PROJECT MIGRATION — localStorage 세션→프로젝트 전환
// ============================================================

import { ChatSession, Project, Genre } from './studio-types';
import { logger } from '@/lib/logger';

export const STORAGE_KEY_SESSIONS_LEGACY = 'noa_chat_sessions_v2';
export const STORAGE_KEY_PROJECTS = 'noa_projects_v2';
export const STORAGE_KEY_PROJECTS_LEGACY = 'noa_projects';

// ============================================================
// PART 1: MIGRATION
// ============================================================

/**
 * Migrate legacy flat ChatSession[] to Project[] structure.
 * Creates a default "미분류" project containing all existing sessions.
 * Leaves the old key intact for rollback safety.
 */
export function migrateSessionsToProjects(): Project[] {
  if (typeof window === 'undefined') return [];

  const legacyRaw = localStorage.getItem(STORAGE_KEY_SESSIONS_LEGACY);
  if (!legacyRaw) return [];

  try {
    const sessions: ChatSession[] = JSON.parse(legacyRaw);
    if (!Array.isArray(sessions) || sessions.length === 0) return [];

    const defaultProject: Project = {
      id: 'project-default',
      name: '미분류',
      description: '',
      genre: Genre.SF,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      sessions,
    };

    return [defaultProject];
  } catch {
    return [];
  }
}

// ============================================================
// PART 2: LOAD / SAVE
// ============================================================

function normalizeProjects(rawProjects: unknown): Project[] {
  if (!Array.isArray(rawProjects)) return [];

  return rawProjects
    .filter((projectCandidate): projectCandidate is Record<string, unknown> => (
      typeof projectCandidate === 'object' && projectCandidate !== null
    ))
    .map((projectCandidate, index) => {
      const createdAt =
        typeof projectCandidate.createdAt === 'number'
          ? projectCandidate.createdAt
          : typeof projectCandidate.updatedAt === 'number'
            ? projectCandidate.updatedAt
            : Date.now();
      const lastUpdate =
        typeof projectCandidate.lastUpdate === 'number'
          ? projectCandidate.lastUpdate
          : typeof projectCandidate.updatedAt === 'number'
            ? projectCandidate.updatedAt
            : createdAt;
      const genre = Object.values(Genre).includes(projectCandidate.genre as Genre)
        ? projectCandidate.genre as Genre
        : Genre.SF;

      const project: Project = {
        id: typeof projectCandidate.id === 'string' && projectCandidate.id.trim()
          ? projectCandidate.id
          : `project-legacy-${index + 1}`,
        name: typeof projectCandidate.name === 'string' && projectCandidate.name.trim()
          ? projectCandidate.name
          : '미분류',
        description: typeof projectCandidate.description === 'string'
          ? projectCandidate.description
          : '',
        genre,
        createdAt,
        lastUpdate,
        sessions: Array.isArray(projectCandidate.sessions)
          ? projectCandidate.sessions as ChatSession[]
          : [],
      };

      if (Array.isArray(projectCandidate.volumes)) {
        project.volumes = projectCandidate.volumes as Project['volumes'];
      }
      if (typeof projectCandidate.currentBranch === 'string') {
        project.currentBranch = projectCandidate.currentBranch;
      }

      return project;
    });
}

function loadProjectsFromStorageKey(storageKey: string): Project[] {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    return normalizeProjects(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Load projects from localStorage.
 * If noa_projects_v2 exists with projects, use it.
 * Otherwise, migrate the older noa_projects key, then legacy flat sessions.
 */
export function loadProjects(): Project[] {
  if (typeof window === 'undefined') return [];

  const currentProjects = loadProjectsFromStorageKey(STORAGE_KEY_PROJECTS);
  if (currentProjects.length > 0) return currentProjects;

  const legacyProjects = loadProjectsFromStorageKey(STORAGE_KEY_PROJECTS_LEGACY);
  if (legacyProjects.length > 0) {
    saveProjects(legacyProjects);
    return legacyProjects;
  }

  // Attempt migration from legacy format
  const migrated = migrateSessionsToProjects();
  if (migrated.length > 0) {
    saveProjects(migrated);
  }
  return migrated;
}

/**
 * Estimate total localStorage usage across all keys (bytes, UTF-16).
 */
export function getTotalStorageUsageBytes(): number {
  if (typeof window === 'undefined') return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    total += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
  }
  return total;
}

const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024; // 5MB typical localStorage limit
const QUOTA_WARNING_RATIO = 0.8;

/**
 * Check if localStorage usage exceeds the warning threshold (80% of 5MB).
 */
export function isStorageNearQuota(): boolean {
  return getTotalStorageUsageBytes() > STORAGE_QUOTA_BYTES * QUOTA_WARNING_RATIO;
}

/**
 * Attempt to clear orphaned/stale data from localStorage to free space.
 * Removes legacy keys and old backup markers.
 */
function clearOrphanedData(): void {
  const orphanKeys = [
    STORAGE_KEY_SESSIONS_LEGACY,
    'noa_chat_sessions',
    'noa_chat_sessions_v1',
    'eh-active-provider',
    'eh-active-model',
  ];
  for (const key of orphanKeys) {
    localStorage.removeItem(key);
  }
}

/**
 * Save projects to localStorage.
 * Returns false if save failed (e.g. QuotaExceededError).
 * On QuotaExceededError, attempts to clear orphaned data and retry once.
 */
export function saveProjects(projects: Project[]): boolean {
  if (typeof window === 'undefined') return false;

  // Pre-save quota warning
  const payload = JSON.stringify(projects);
  const payloadBytes = payload.length * 2;
  const currentUsage = getTotalStorageUsageBytes();
  if ((currentUsage + payloadBytes) > STORAGE_QUOTA_BYTES * QUOTA_WARNING_RATIO) {
    window.dispatchEvent(new CustomEvent('noa:storage-warning', {
      detail: { usageMB: (currentUsage / 1024 / 1024).toFixed(1), payloadMB: (payloadBytes / 1024 / 1024).toFixed(1) },
    }));
  }

  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, payload);
    return true;
  } catch (e) {
    // QuotaExceededError — attempt cleanup and retry once
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      logger.warn('NOA', 'QuotaExceededError — clearing orphaned data and retrying...');
      clearOrphanedData();
      try {
        localStorage.setItem(STORAGE_KEY_PROJECTS, payload);
        return true;
      } catch (retryErr) {
        logger.error('NOA', 'localStorage write failed after cleanup:', retryErr);
        // [QA-robustness (4)] 정리 후에도 quota 초과 — 침묵 false(원고 유실) 대신 사용자 고지.
        // 전면 tiered eviction 은 범위 외 — 부족 사실 + 내보내기 권유 toast 만 발화.
        notifyStorageQuotaToast();
        return false;
      }
    }
    logger.error('NOA', 'localStorage write failed:', e);
    return false;
  }
}

/**
 * [QA-robustness (4)] 저장 공간 부족 사용자 고지 — noa:toast (ToastHost 계약).
 * SSR/이벤트 차단 환경에서는 조용히 no-op (호출자 흐름 방해 금지).
 */
function notifyStorageQuotaToast(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('noa:toast', {
      detail: {
        message: '저장 공간이 부족해 저장하지 못했습니다. 작품을 내보내기(백업)한 뒤 오래된 회차를 정리해 주세요.',
        variant: 'error',
        duration: 8000,
      },
    }));
  } catch { /* window/이벤트 차단 (SSR) */ }
}

/**
 * Estimate current localStorage usage for NOA data (bytes).
 */
export function getStorageUsageBytes(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
  return raw ? raw.length * 2 : 0; // UTF-16 = 2 bytes per char
}
