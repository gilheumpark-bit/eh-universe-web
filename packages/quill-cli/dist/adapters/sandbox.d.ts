export interface SandboxConfig {
    timeout: number;
    maxMemoryMB: number;
    allowNetwork: boolean;
    env?: Record<string, string>;
    mode?: 'vm' | 'process';
}
export interface SandboxResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
    memoryUsedMB?: number;
    timedOut: boolean;
    mode: 'vm' | 'process';
}
export declare function runInVM(code: string, config?: Partial<SandboxConfig>): SandboxResult;
export declare function runInProcess(code: string, config?: Partial<SandboxConfig>): SandboxResult;
export declare function runInSandbox(code: string, config?: Partial<SandboxConfig>): SandboxResult;
export declare function runProjectInSandbox(files: Record<string, string>, entryPoint?: string, config?: Partial<SandboxConfig>): SandboxResult;
export declare function fuzzInSandbox(functionCode: string, functionName: string, config?: Partial<SandboxConfig>): Array<{
    input: string;
    result: SandboxResult;
}>;
