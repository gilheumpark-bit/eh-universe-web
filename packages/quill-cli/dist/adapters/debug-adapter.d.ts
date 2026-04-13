import { type ChildProcess } from 'child_process';
export interface BreakpointInfo {
    file: string;
    line: number;
    column?: number;
    condition?: string;
}
export interface DebugSession {
    pid: number;
    inspectorUrl: string;
    breakpoints: BreakpointInfo[];
    child: ChildProcess;
    wsUrl?: string;
}
export interface EvalResult {
    type: string;
    value: unknown;
    description?: string;
    error?: string;
}
export declare function launchDebug(filePath: string, breakpoints?: BreakpointInfo[]): Promise<DebugSession | null>;
export declare function getDebugTargets(inspectorUrl: string): Promise<Array<{
    id: string;
    title: string;
    url: string;
    wsUrl: string;
}>>;
export declare function quickInspect(code: string, expression: string): Promise<string>;
export declare function profileRun(filePath: string, durationSec?: number): Promise<{
    cpuProfilePath?: string;
    heapSnapshotPath?: string;
    duration: number;
}>;
export declare function takeHeapSnapshot(filePath: string): Promise<{
    snapshotPath?: string;
    sizeMB?: number;
}>;
export declare function killDebugSession(session: DebugSession): void;
