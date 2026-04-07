interface VerifyOptions {
    threshold: string;
    format: string;
    watch?: boolean;
    parallel?: boolean;
    diff?: boolean;
    initBaseline?: boolean;
    showBaseline?: boolean;
}
export declare function runVerify(path: string, opts: VerifyOptions): Promise<void>;
export {};
