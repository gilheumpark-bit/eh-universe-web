export declare function progressBar(current: number, total: number, width?: number): string;
export declare function progressLine(current: number, total: number, label: string): string;
export declare class ProgressTimer {
    private startTime;
    private history;
    constructor();
    record(progress: number): void;
    getETA(currentProgress: number): string;
    getElapsed(): string;
}
export declare class Spinner {
    private interval;
    private frameIndex;
    private message;
    constructor(message: string);
    start(): void;
    update(message: string): void;
    stop(finalMessage?: string): void;
}
