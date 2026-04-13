interface BenchOptions {
    save?: string;
    compare?: string;
    failIfSlower?: string;
}
export declare function runBench(path: string, opts: BenchOptions): Promise<void>;
export {};
