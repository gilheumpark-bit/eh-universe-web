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
export type TaskHandler = (payload: unknown) => Promise<unknown>;
export declare function registerTaskHandler(type: string, handler: TaskHandler): void;
export declare function getRegisteredTypes(): string[];
export declare function runTasksParallel(tasks: WorkerTask[], config?: Partial<PoolConfig>, onProgress?: (completed: number, total: number, result: WorkerResult) => void): Promise<WorkerResult[]>;
export declare function runTasksInProcess(tasks: WorkerTask[], config?: Partial<PoolConfig>, onProgress?: (completed: number, total: number, result: WorkerResult) => void): Promise<WorkerResult[]>;
export declare function runParallelVerify(files: Array<{
    path: string;
    content: string;
    language: string;
}>, onProgress?: (completed: number, total: number) => void): Promise<WorkerResult[]>;
