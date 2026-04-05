// ============================================================
// CS Quill 🦔 — Worker Pool (Multi-Agent Parallel)
// ============================================================
// Warp의 멀티 에이전트 동시 실행을 worker_threads로 구현.
// 8팀 병렬 검증, AST 분석, 보안 스캔을 동시에.

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';

// ============================================================
// PART 1 — Types
// ============================================================

export interface WorkerTask {
  id: string;
  type: string;
  payload: unknown;
}

export interface WorkerResult {
  id: string;
  type: string;
  success: boolean;
  result: unknown;
  error?: string;
  durationMs: number;
}

export interface PoolConfig {
  maxWorkers: number;
  taskTimeout: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=WorkerTask,WorkerResult

// ============================================================
// PART 2 — Task Runner (Worker Thread Side)
// ============================================================

// This code runs INSIDE each worker thread
if (!isMainThread && parentPort) {
  const task = workerData as WorkerTask;
  const start = performance.now();

  async function executeTask(): Promise<unknown> {
    switch (task.type) {
      case 'pipeline': {
        const { runStaticPipeline } = await import('@/lib/code-studio/pipeline/pipeline');
        const { code, language } = task.payload as { code: string; language: string };
        return runStaticPipeline(code, language);
      }
      case 'hollow': {
        const { scanForHollowCode } = await import('@/lib/code-studio/pipeline/ast-hollow-scanner');
        const { code, fileName } = task.payload as { code: string; fileName: string };
        return scanForHollowCode(code, fileName);
      }
      case 'dead-code': {
        const { scanDeadCode } = await import('@/lib/code-studio/pipeline/dead-code');
        const { code, language } = task.payload as { code: string; language: string };
        return scanDeadCode(code, language);
      }
      case 'design-lint': {
        const { runDesignLint } = await import('@/lib/code-studio/pipeline/design-lint');
        const { code } = task.payload as { code: string };
        return runDesignLint(code);
      }
      case 'cognitive-load': {
        const { analyzeCognitiveLoad } = await import('@/lib/code-studio/pipeline/cognitive-load');
        const { code } = task.payload as { code: string };
        return analyzeCognitiveLoad(code);
      }
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  executeTask()
    .then(result => {
      parentPort!.postMessage({
        id: task.id, type: task.type, success: true, result,
        durationMs: Math.round(performance.now() - start),
      } satisfies WorkerResult);
    })
    .catch(err => {
      parentPort!.postMessage({
        id: task.id, type: task.type, success: false, result: null,
        error: (err as Error).message, durationMs: Math.round(performance.now() - start),
      } satisfies WorkerResult);
    });
}

// IDENTITY_SEAL: PART-2 | role=task-runner | inputs=WorkerTask | outputs=WorkerResult

// ============================================================
// PART 3 — Pool Manager (Main Thread Side)
// ============================================================

const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxWorkers: Math.max(2, cpus().length - 1),
  taskTimeout: 30000,
};

export function runTasksParallel(
  tasks: WorkerTask[],
  config: Partial<PoolConfig> = {},
  onProgress?: (completed: number, total: number, result: WorkerResult) => void,
): Promise<WorkerResult[]> {
  const cfg = { ...DEFAULT_POOL_CONFIG, ...config };
  const maxConcurrency = Math.min(cfg.maxWorkers, tasks.length);

  return new Promise((resolve) => {
    const results: WorkerResult[] = [];
    let nextTaskIndex = 0;
    let completedCount = 0;

    function spawnWorker(): void {
      if (nextTaskIndex >= tasks.length) return;

      const task = tasks[nextTaskIndex++];
      const worker = new Worker(__filename, { workerData: task });

      const timer = setTimeout(() => {
        worker.terminate();
        const result: WorkerResult = {
          id: task.id, type: task.type, success: false,
          result: null, error: 'timeout', durationMs: cfg.taskTimeout,
        };
        results.push(result);
        completedCount++;
        onProgress?.(completedCount, tasks.length, result);
        if (completedCount === tasks.length) resolve(results);
        else spawnWorker();
      }, cfg.taskTimeout);

      worker.on('message', (result: WorkerResult) => {
        clearTimeout(timer);
        results.push(result);
        completedCount++;
        onProgress?.(completedCount, tasks.length, result);
        worker.terminate();
        if (completedCount === tasks.length) resolve(results);
        else spawnWorker();
      });

      worker.on('error', (err) => {
        clearTimeout(timer);
        const result: WorkerResult = {
          id: task.id, type: task.type, success: false,
          result: null, error: err.message, durationMs: 0,
        };
        results.push(result);
        completedCount++;
        onProgress?.(completedCount, tasks.length, result);
        if (completedCount === tasks.length) resolve(results);
        else spawnWorker();
      });
    }

    // Start initial batch
    for (let i = 0; i < maxConcurrency; i++) {
      spawnWorker();
    }
  });
}

// IDENTITY_SEAL: PART-3 | role=pool-manager | inputs=tasks,config | outputs=WorkerResult[]

// ============================================================
// PART 4 — Convenience: Parallel 8-Team Verify
// ============================================================

export async function runParallelVerify(
  files: Array<{ path: string; content: string; language: string }>,
  onProgress?: (completed: number, total: number) => void,
): Promise<WorkerResult[]> {
  const tasks: WorkerTask[] = files.map((f, i) => ({
    id: `verify-${i}`,
    type: 'pipeline',
    payload: { code: f.content, language: f.language },
  }));

  return runTasksParallel(tasks, {}, (completed, total, result) => {
    onProgress?.(completed, total);
  });
}

// IDENTITY_SEAL: PART-4 | role=parallel-verify | inputs=files | outputs=WorkerResult[]
