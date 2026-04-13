"use strict";
// ============================================================
// CS Quill 🦔 — Worker Pool (Multi-Agent Parallel)
// ============================================================
// worker_threads 기반 병렬 검증. @/ 경로 의존 제거.
// 태스크 핸들러 레지스트리로 확장 가능.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskHandler = registerTaskHandler;
exports.getRegisteredTypes = getRegisteredTypes;
exports.runTasksParallel = runTasksParallel;
exports.runTasksInProcess = runTasksInProcess;
exports.runParallelVerify = runParallelVerify;
const worker_threads_1 = require("worker_threads");
const os_1 = require("os");
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=WorkerTask,WorkerResult
// ============================================================
// PART 2 — Task Handler Registry (Main Thread)
// ============================================================
const _handlers = new Map();
function registerTaskHandler(type, handler) {
    _handlers.set(type, handler);
}
function getRegisteredTypes() {
    return [..._handlers.keys()];
}
// 기본 핸들러 등록: 코드 검증용
registerTaskHandler('eval', async (payload) => {
    const { code } = payload;
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
    const fn = new AsyncFunction('payload', code);
    return fn(payload);
});
registerTaskHandler('lint-file', async (payload) => {
    const { filePath } = payload;
    const { runESLint } = require('./lint-engine');
    return runESLint(filePath);
});
registerTaskHandler('security-scan', async (payload) => {
    const { rootPath } = payload;
    const { runNpmAudit } = require('./security-engine');
    return runNpmAudit(rootPath);
});
registerTaskHandler('dep-check', async (payload) => {
    const { rootPath } = payload;
    const { runDepcheck } = require('./dep-analyzer');
    return runDepcheck(rootPath);
});
registerTaskHandler('accessibility', async (payload) => {
    const { html } = payload;
    const { runAxeAccessibility } = require('./web-quality');
    return runAxeAccessibility(html);
});
// IDENTITY_SEAL: PART-2 | role=task-registry | inputs=type,handler | outputs=void
// ============================================================
// PART 3 — Worker Thread Execution
// ============================================================
// Worker thread: execute task using inline code from workerData
if (!worker_threads_1.isMainThread && worker_threads_1.parentPort) {
    const task = worker_threads_1.workerData;
    const start = performance.now();
    (async () => {
        try {
            let result;
            if (task.handlerCode) {
                // Execute serialized handler
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                const fn = new AsyncFunction('payload', task.handlerCode);
                result = await fn(task.payload);
            }
            else {
                throw new Error(`No handler for task type: ${task.type}`);
            }
            worker_threads_1.parentPort.postMessage({
                id: task.id, type: task.type, success: true, result,
                durationMs: Math.round(performance.now() - start),
            });
        }
        catch (err) {
            worker_threads_1.parentPort.postMessage({
                id: task.id, type: task.type, success: false, result: null,
                error: err.message, durationMs: Math.round(performance.now() - start),
            });
        }
    })();
}
// IDENTITY_SEAL: PART-3 | role=worker-exec | inputs=WorkerTask | outputs=WorkerResult
// ============================================================
// PART 4 — Pool Manager (Main Thread)
// ============================================================
const DEFAULT_POOL_CONFIG = {
    maxWorkers: Math.max(2, (0, os_1.cpus)().length - 1),
    taskTimeout: 30000,
};
function runTasksParallel(tasks, config = {}, onProgress) {
    const cfg = { ...DEFAULT_POOL_CONFIG, ...config };
    const maxConcurrency = Math.min(cfg.maxWorkers, tasks.length);
    return new Promise((resolve) => {
        if (tasks.length === 0) {
            resolve([]);
            return;
        }
        const results = [];
        let nextTaskIndex = 0;
        let completedCount = 0;
        function onComplete(result) {
            results.push(result);
            completedCount++;
            onProgress?.(completedCount, tasks.length, result);
            if (completedCount === tasks.length)
                resolve(results);
            else
                spawnWorker();
        }
        function spawnWorker() {
            if (nextTaskIndex >= tasks.length)
                return;
            const task = tasks[nextTaskIndex++];
            // CJS: __filename 사용 (ESM은 in-process 모드 사용 권장)
            const workerPath = __filename;
            const worker = new worker_threads_1.Worker(workerPath, {
                workerData: { ...task, handlerCode: undefined },
            });
            const timer = setTimeout(() => {
                worker.terminate();
                onComplete({
                    id: task.id, type: task.type, success: false,
                    result: null, error: 'timeout', durationMs: cfg.taskTimeout,
                });
            }, cfg.taskTimeout);
            worker.on('message', (result) => {
                clearTimeout(timer);
                worker.terminate();
                onComplete(result);
            });
            worker.on('error', (err) => {
                clearTimeout(timer);
                onComplete({
                    id: task.id, type: task.type, success: false,
                    result: null, error: err.message, durationMs: 0,
                });
            });
        }
        for (let i = 0; i < maxConcurrency; i++) {
            spawnWorker();
        }
    });
}
// IDENTITY_SEAL: PART-4 | role=pool-manager | inputs=tasks,config | outputs=WorkerResult[]
// ============================================================
// PART 5 — In-Process Parallel (Promise.allSettled 대안)
// ============================================================
// worker_threads가 실패하거나 오버헤드가 클 때 쓰는 경량 대안.
async function runTasksInProcess(tasks, config = {}, onProgress) {
    const cfg = { ...DEFAULT_POOL_CONFIG, ...config };
    const maxConcurrency = Math.min(cfg.maxWorkers, tasks.length);
    const results = [];
    let nextIdx = 0;
    let completed = 0;
    async function runOne() {
        while (nextIdx < tasks.length) {
            const task = tasks[nextIdx++];
            const handler = _handlers.get(task.type);
            const start = performance.now();
            let result;
            if (!handler) {
                result = {
                    id: task.id, type: task.type, success: false,
                    result: null, error: `No handler for type: ${task.type}`,
                    durationMs: 0,
                };
            }
            else {
                try {
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), cfg.taskTimeout));
                    const value = await Promise.race([handler(task.payload), timeoutPromise]);
                    result = {
                        id: task.id, type: task.type, success: true,
                        result: value, durationMs: Math.round(performance.now() - start),
                    };
                }
                catch (err) {
                    result = {
                        id: task.id, type: task.type, success: false,
                        result: null, error: err.message,
                        durationMs: Math.round(performance.now() - start),
                    };
                }
            }
            results.push(result);
            completed++;
            onProgress?.(completed, tasks.length, result);
        }
    }
    const workers = Array.from({ length: maxConcurrency }, () => runOne());
    await Promise.all(workers);
    return results;
}
// IDENTITY_SEAL: PART-5 | role=in-process-parallel | inputs=tasks | outputs=WorkerResult[]
// ============================================================
// PART 6 — Convenience: Parallel Verify
// ============================================================
async function runParallelVerify(files, onProgress) {
    const tasks = files.map((f, i) => ({
        id: `verify-${i}`,
        type: 'lint-file',
        payload: { filePath: f.path, code: f.content, language: f.language },
    }));
    return runTasksInProcess(tasks, {}, (completed, total) => {
        onProgress?.(completed, total);
    });
}
// IDENTITY_SEAL: PART-6 | role=parallel-verify | inputs=files | outputs=WorkerResult[]
