interface StressOptions {
    scenario?: string;
    users: string;
    duration: string;
}
export declare function runStress(path: string, opts: StressOptions): Promise<void>;
export {};
