interface ApplyOptions {
    all?: boolean;
    override?: boolean;
}
export declare function runApply(file: string | undefined, opts: ApplyOptions): Promise<void>;
interface UndoOptions {
    all?: boolean;
}
export declare function runUndo(opts: UndoOptions): Promise<void>;
export {};
