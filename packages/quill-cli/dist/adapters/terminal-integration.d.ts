import { type ChildProcess } from 'child_process';
export declare function getDefaultShell(): string;
export declare function runShellCommand(command: string, opts?: {
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
}): {
    stdout: string;
    stderr: string;
    exitCode: number;
};
export interface REPLSession {
    language: string;
    process: ChildProcess;
    send: (code: string) => void;
    kill: () => void;
}
export declare function startREPL(language: string): REPLSession | null;
export declare function getSupportedREPLs(): string[];
export declare function startBackground(command: string, cwd?: string): string;
export declare function listJobs(): Array<{
    id: string;
    command: string;
    status: string;
    duration: number;
}>;
export declare function getJobOutput(id: string): string;
export declare function killJob(id: string): boolean;
export declare function findProcessOnPort(port: number): {
    pid: number;
    command: string;
} | null;
export declare function killProcessOnPort(port: number): boolean;
export interface ProgressBarOptions {
    total: number;
    width?: number;
    label?: string;
    fillChar?: string;
    emptyChar?: string;
}
export declare class ProgressBar {
    private current;
    private total;
    private width;
    private label;
    private fillChar;
    private emptyChar;
    private startTime;
    constructor(opts: ProgressBarOptions);
    update(current: number, label?: string): void;
    increment(label?: string): void;
    private render;
    done(message?: string): void;
}
export declare class Spinner {
    private intervalId;
    private frameIndex;
    private message;
    constructor(message?: string);
    start(): void;
    update(message: string): void;
    stop(finalMessage?: string): void;
}
export declare function printTable(headers: string[], rows: string[][], colWidths?: number[]): void;
export declare function printBox(title: string, lines: string[], width?: number): void;
