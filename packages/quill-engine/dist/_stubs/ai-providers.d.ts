/**
 * packages/quill-engine/src/_stubs/ai-providers.ts
 *
 * Local minimal AI provider type — engine code originally imported
 * @/lib/ai-providers from the renderer. Engine is host-agnostic and
 * shouldn't depend on the renderer's full provider registry.
 *
 * The stub provides only the types/shapes that engine code reads.
 * Real provider calls are made by the host (main process or CLI),
 * not the engine itself.
 */
export type AIProviderId = 'gemini' | 'openai' | 'claude' | 'groq';
export interface AIProviderConfig {
    id: AIProviderId;
    name: string;
    defaultModel: string;
    models: string[];
}
export declare const PROVIDERS: Record<AIProviderId, AIProviderConfig>;
export type AIProvider = AIProviderConfig;
export type ProviderId = AIProviderId;
export declare function callProvider(): never;
export declare function streamChat(..._args: unknown[]): Promise<unknown>;
export declare function getApiKey(_provider?: string): string | null;
export declare function getActiveProvider(): AIProviderId | null;
export declare function getProviderConfig(id: AIProviderId): AIProviderConfig | undefined;
