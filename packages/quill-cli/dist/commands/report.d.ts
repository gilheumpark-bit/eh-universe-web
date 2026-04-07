interface ReportOptions {
    today?: boolean;
    team?: boolean;
    week?: boolean;
}
export declare function runReport(opts: ReportOptions): Promise<void>;
export {};
