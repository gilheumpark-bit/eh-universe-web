type CSConfig = import('../core/config').CSConfig;
interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}
declare function validateConfig(config: CSConfig): ValidationError[];
interface ConfigDiff {
    field: string;
    oldValue: string;
    newValue: string;
}
declare function diffConfigs(oldConfig: CSConfig, newConfig: CSConfig): ConfigDiff[];
interface ExportableConfig {
    _format: 'cs-quill-config';
    _version: '1.0';
    _exported: string;
    language: string;
    level: string;
    structure: string;
    fileMode: string;
    framework?: string;
    keys: Array<{
        id: string;
        provider: string;
        model: string;
        roles: string[];
        budget?: string;
    }>;
}
declare function exportConfig(config: CSConfig, includeSensitive?: boolean): ExportableConfig;
declare function importConfig(data: any): {
    config: Partial<CSConfig>;
    warnings: string[];
};
export declare function runConfig(action: string, extraArg?: string): Promise<void>;
export { validateConfig, diffConfigs, exportConfig, importConfig };
