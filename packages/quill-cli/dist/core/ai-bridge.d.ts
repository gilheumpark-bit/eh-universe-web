import { type AITask } from './ai-config';
export interface StreamChatOptions {
    systemInstruction?: string;
    messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
    }>;
    onChunk?: (text: string) => void;
    temperature?: number;
    maxTokens?: number;
    task?: AITask;
}
export interface ChatResult {
    content: string;
    model: string;
    tokensUsed?: number;
    durationMs: number;
}
export declare function streamChat(opts: StreamChatOptions): Promise<ChatResult>;
export declare function quickAsk(prompt: string, system?: string, task?: AITask): Promise<string>;
export { getAIConfig } from './config';
