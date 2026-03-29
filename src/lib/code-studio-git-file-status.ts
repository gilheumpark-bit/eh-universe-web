// ============================================================
// Code Studio — File Git Status
// ============================================================
// 파일별 git 상태 (modified/staged/untracked) + 색상 매핑.

import type { GitStatus } from './code-studio-git';

export type FileGitState = 'added' | 'modified' | 'deleted' | 'untracked' | 'staged' | 'conflicted' | 'clean';

export interface FileStatusInfo {
  state: FileGitState;
  color: string;
  label: string;
  indicator: string;
}

const STATUS_MAP: Record<FileGitState, Omit<FileStatusInfo, 'state'>> = {
  added:      { color: 'text-green-400',  label: 'Added',      indicator: 'A' },
  modified:   { color: 'text-yellow-400', label: 'Modified',   indicator: 'M' },
  deleted:    { color: 'text-red-400',    label: 'Deleted',    indicator: 'D' },
  untracked:  { color: 'text-gray-400',   label: 'Untracked',  indicator: 'U' },
  staged:     { color: 'text-green-300',  label: 'Staged',     indicator: 'S' },
  conflicted: { color: 'text-red-500',    label: 'Conflicted', indicator: '!' },
  clean:      { color: 'text-text-tertiary', label: 'Clean',   indicator: '' },
};

/** Get status info for a specific file path */
export function getFileGitStatus(filePath: string, status: GitStatus): FileStatusInfo {
  const normalized = filePath.replace(/\\/g, '/');

  if (status.conflicted.some(f => f === normalized)) {
    return { state: 'conflicted', ...STATUS_MAP.conflicted };
  }
  if (status.staged.some(f => f === normalized)) {
    return { state: 'staged', ...STATUS_MAP.staged };
  }
  if (status.deleted.some(f => f === normalized)) {
    return { state: 'deleted', ...STATUS_MAP.deleted };
  }
  if (status.modified.some(f => f === normalized)) {
    return { state: 'modified', ...STATUS_MAP.modified };
  }
  if (status.untracked.some(f => f === normalized)) {
    return { state: 'untracked', ...STATUS_MAP.untracked };
  }

  return { state: 'clean', ...STATUS_MAP.clean };
}

/** Build a map of all file paths to their status */
export function buildFileStatusMap(status: GitStatus): Map<string, FileStatusInfo> {
  const map = new Map<string, FileStatusInfo>();

  for (const f of status.conflicted) map.set(f, { state: 'conflicted', ...STATUS_MAP.conflicted });
  for (const f of status.staged) if (!map.has(f)) map.set(f, { state: 'staged', ...STATUS_MAP.staged });
  for (const f of status.deleted) if (!map.has(f)) map.set(f, { state: 'deleted', ...STATUS_MAP.deleted });
  for (const f of status.modified) if (!map.has(f)) map.set(f, { state: 'modified', ...STATUS_MAP.modified });
  for (const f of status.untracked) if (!map.has(f)) map.set(f, { state: 'untracked', ...STATUS_MAP.untracked });

  return map;
}

/** Count files by status */
export function countByStatus(status: GitStatus): Record<FileGitState, number> {
  return {
    added: 0,
    staged: status.staged.length,
    modified: status.modified.length,
    deleted: status.deleted.length,
    untracked: status.untracked.length,
    conflicted: status.conflicted.length,
    clean: 0,
  };
}

// IDENTITY_SEAL: role=FileGitStatus | inputs=filePath,GitStatus | outputs=FileStatusInfo,Map
