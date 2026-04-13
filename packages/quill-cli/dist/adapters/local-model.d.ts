interface LocalModelConfig {
    provider: 'ollama' | 'lmstudio';
    url: string;
    model: string;
}
interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
interface StreamOptions {
    systemInstruction: string;
    messages: ChatMessage[];
    onChunk: (text: string) => void;
    signal?: AbortSignal;
}
export declare function getLocalModelConfig(): LocalModelConfig | null;
export declare function isLocalModelAvailable(): Promise<boolean>;
export declare function streamLocalChat(opts: StreamOptions): Promise<void>;
export declare function streamWithFallback(opts: StreamOptions): Promise<{
    usedLocal: boolean;
}>;
export {};
