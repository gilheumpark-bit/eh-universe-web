export interface KeyConfig {
    id: string;
    provider: 'anthropic' | 'openai' | 'google' | 'groq' | 'mistral' | 'ollama' | 'lm-studio';
    key: string;
    model: string;
    roles: string[];
    budget?: string;
    url?: string;
}
export interface CSConfig {
    language: 'ko' | 'en' | 'ja' | 'zh';
    level: 'easy' | 'normal' | 'pro';
    structure: 'auto' | 'on' | 'off';
    fileMode: 'safe' | 'auto' | 'yolo';
    framework?: string;
    keys: KeyConfig[];
}
export declare function getGlobalConfigDir(): string;
export declare function getGlobalConfigPath(): string;
export declare function getLocalConfigPath(): string;
export declare function getGeneratedDir(): string;
export declare function getReceiptDir(): string;
export declare function loadGlobalConfig(): CSConfig;
export declare function loadLocalConfig(): Partial<CSConfig> | null;
export declare function loadMergedConfig(): CSConfig;
export declare function saveGlobalConfig(config: CSConfig): void;
export declare function saveLocalConfig(config: Partial<CSConfig>): void;
export declare function addKey(config: CSConfig, key: KeyConfig): CSConfig;
export declare function removeKey(config: CSConfig, keyId: string): CSConfig;
export declare function getKeyForRole(config: CSConfig, role: string): KeyConfig | undefined;
export declare function getAIConfig(): {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
};
