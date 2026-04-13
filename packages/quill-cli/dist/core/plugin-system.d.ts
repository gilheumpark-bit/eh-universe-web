export interface PluginManifest {
    name: string;
    version: string;
    description: string;
    author?: string;
    type: 'engine' | 'command' | 'formatter' | 'preset';
    entryPoint: string;
    hooks?: {
        beforeVerify?: string;
        afterVerify?: string;
        beforeGenerate?: string;
        afterGenerate?: string;
    };
    dependencies?: string[];
}
export interface InstalledPlugin {
    manifest: PluginManifest;
    installedAt: number;
    enabled: boolean;
    path: string;
}
export declare function validateManifest(manifest: unknown): {
    valid: boolean;
    errors: string[];
};
export declare function installPlugin(manifest: PluginManifest, pluginPath: string): {
    success: boolean;
    errors?: string[];
};
export declare function uninstallPlugin(name: string): boolean;
export declare function enablePlugin(name: string): boolean;
export declare function disablePlugin(name: string): boolean;
export declare function listPlugins(): InstalledPlugin[];
export declare function getEnabledPlugins(): InstalledPlugin[];
export type HookType = 'beforeVerify' | 'afterVerify' | 'beforeGenerate' | 'afterGenerate';
export declare function executeHooks(hookType: HookType, context: Record<string, unknown>): Promise<void>;
export declare function searchPlugins(query: string): Promise<Array<{
    name: string;
    description: string;
    version: string;
}>>;
