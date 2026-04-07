export interface Task {
    name: string;
    command: string;
    source: string;
    category: 'build' | 'test' | 'lint' | 'dev' | 'start' | 'custom';
}
export declare function detectTasks(rootPath: string): Task[];
export interface TaskResult {
    task: Task;
    success: boolean;
    output: string;
    duration: number;
    exitCode: number;
}
export declare function runTask(task: Task, rootPath: string, timeout?: number): TaskResult;
export declare function runBuild(rootPath: string): TaskResult | null;
export declare function runTests(rootPath: string): TaskResult | null;
export declare function runLint(rootPath: string): TaskResult | null;
