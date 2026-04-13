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
export const PROVIDERS = {
    gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        defaultModel: 'gemini-2.5-pro',
        models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    },
    openai: {
        id: 'openai',
        name: 'OpenAI',
        defaultModel: 'gpt-5.4',
        models: ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano'],
    },
    claude: {
        id: 'claude',
        name: 'Anthropic Claude',
        defaultModel: 'claude-sonnet-4-6',
        models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    },
    groq: {
        id: 'groq',
        name: 'Groq',
        defaultModel: 'llama-3.3-70b',
        models: ['llama-3.3-70b', 'llama-3.1-8b-instant', 'qwen-qwq-32b'],
    },
};
// No-op implementations for any function-shaped imports.
// If a pipeline file actually calls these at runtime, that's a bug
// (engine should not make AI calls — host does). They throw in dev.
function notImplemented(name) {
    throw new Error(`[quill-engine] ${name}() called from engine code — AI calls must go through the host (main/cli), not the engine itself.`);
}
export function callProvider() {
    notImplemented('callProvider');
}
// Renderer-side helpers re-exported as throwing stubs so engine
// pipeline code that still references them compiles. Real call sites
// should be migrated to receive AI results from the host instead.
export async function streamChat(..._args) {
    notImplemented('streamChat');
}
export function getApiKey(_provider) {
    // Engine has no access to keys — host owns keystore.
    return null;
}
export function getActiveProvider() {
    return null;
}
export function getProviderConfig(id) {
    return PROVIDERS[id];
}
