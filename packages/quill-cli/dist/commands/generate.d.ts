interface GenerateOptions {
    mode: 'fast' | 'full' | 'strict';
    structure: 'auto' | 'on' | 'off';
    withTests?: boolean;
    commit?: boolean;
    pr?: boolean;
    dryRun?: boolean;
    noTui?: boolean;
}
export declare function runGenerate(prompt: string, opts: GenerateOptions): Promise<void>;
export {};
