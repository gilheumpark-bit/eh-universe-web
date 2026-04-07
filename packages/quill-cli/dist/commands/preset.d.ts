export interface Preset {
    name: string;
    version: string;
    framework: string;
    frameworkVersion: string;
    rules: {
        patterns: string[];
        antiPatterns: string[];
        deprecated: string[];
        conventions: string[];
    };
    createdAt: number;
    author?: string;
}
export declare function getPresetsForFramework(framework: string): Preset[];
export declare function buildPresetDirective(presets: Preset[]): string;
export declare function runPreset(action: string, args?: string[]): Promise<void>;
