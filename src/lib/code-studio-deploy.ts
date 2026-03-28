// ============================================================
// Code Studio — Deploy Orchestration
// ============================================================
// Vercel 배포 트리거, 빌드 상태 폴링, 배포 URL 추출, 롤백.

// ============================================================
// PART 1 — Types
// ============================================================

export type DeployStatus = 'idle' | 'building' | 'deploying' | 'ready' | 'error' | 'cancelled';

export interface DeployConfig {
  projectId?: string;
  teamId?: string;
  token?: string;
  framework?: 'nextjs' | 'vite' | 'cra' | 'custom';
  buildCommand?: string;
  outputDirectory?: string;
}

export interface DeployResult {
  id: string;
  url: string;
  status: DeployStatus;
  createdAt: number;
  readyAt?: number;
  error?: string;
  buildLogs: string[];
}

export interface DeployHistoryEntry {
  id: string;
  url: string;
  status: DeployStatus;
  createdAt: number;
  commitMessage?: string;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=DeployConfig,DeployResult,DeployHistoryEntry

// ============================================================
// PART 2 — Deploy Trigger & Status
// ============================================================

/** Trigger a deployment via API */
export async function triggerDeploy(config: DeployConfig): Promise<DeployResult> {
  const res = await fetch('/api/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: config.projectId,
      teamId: config.teamId,
      framework: config.framework ?? 'nextjs',
      buildCommand: config.buildCommand,
      outputDirectory: config.outputDirectory,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    return {
      id: '',
      url: '',
      status: 'error',
      createdAt: Date.now(),
      error: `Deploy failed: ${res.status} ${errText}`,
      buildLogs: [],
    };
  }

  const data = await res.json();
  return {
    id: data.id ?? '',
    url: data.url ?? '',
    status: 'building',
    createdAt: Date.now(),
    buildLogs: [],
  };
}

/** Poll deployment status */
export async function getDeployStatus(deployId: string): Promise<DeployResult> {
  try {
    const res = await fetch(`/api/deploy/status?id=${encodeURIComponent(deployId)}`);
    if (!res.ok) {
      return { id: deployId, url: '', status: 'error', createdAt: 0, error: `Status check failed: ${res.status}`, buildLogs: [] };
    }

    const data = await res.json();
    return {
      id: deployId,
      url: data.url ?? '',
      status: mapStatus(data.readyState ?? data.status),
      createdAt: data.createdAt ?? 0,
      readyAt: data.ready ?? undefined,
      error: data.error ?? undefined,
      buildLogs: data.buildLogs ?? [],
    };
  } catch (e) {
    return { id: deployId, url: '', status: 'error', createdAt: 0, error: e instanceof Error ? e.message : 'Unknown', buildLogs: [] };
  }
}

function mapStatus(raw: string): DeployStatus {
  switch (raw?.toUpperCase()) {
    case 'READY': return 'ready';
    case 'BUILDING': return 'building';
    case 'DEPLOYING': return 'deploying';
    case 'ERROR': case 'FAILED': return 'error';
    case 'CANCELLED': return 'cancelled';
    default: return 'idle';
  }
}

// IDENTITY_SEAL: PART-2 | role=DeployTrigger | inputs=DeployConfig,deployId | outputs=DeployResult

// ============================================================
// PART 3 — Polling & Rollback
// ============================================================

/** Poll deploy status until complete or timeout */
export async function waitForDeploy(
  deployId: string,
  onUpdate?: (result: DeployResult) => void,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<DeployResult> {
  const interval = options.intervalMs ?? 5000;
  const timeout = options.timeoutMs ?? 300_000; // 5 minutes
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await getDeployStatus(deployId);
    onUpdate?.(result);

    if (result.status === 'ready' || result.status === 'error' || result.status === 'cancelled') {
      return result;
    }

    await new Promise(r => setTimeout(r, interval));
  }

  return { id: deployId, url: '', status: 'error', createdAt: 0, error: 'Deploy timed out', buildLogs: [] };
}

/** Rollback to a previous deployment */
export async function rollbackDeploy(deployId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/deploy/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deployId }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => 'Unknown');
      return { success: false, error: err };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}

/** Get deploy history from localStorage */
export function getDeployHistory(): DeployHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('eh-cs-deploy-history') ?? '[]');
  } catch { return []; }
}

/** Add entry to deploy history */
export function addDeployHistory(entry: DeployHistoryEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getDeployHistory();
    history.unshift(entry);
    localStorage.setItem('eh-cs-deploy-history', JSON.stringify(history.slice(0, 50)));
  } catch { /* quota */ }
}

// IDENTITY_SEAL: PART-3 | role=PollingRollback | inputs=deployId | outputs=DeployResult,DeployHistoryEntry[]
