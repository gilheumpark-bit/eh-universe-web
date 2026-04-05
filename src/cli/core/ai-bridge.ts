// ============================================================
// CS Quill 🦔 — AI Provider Bridge
// ============================================================
// @/lib/ai-providers 대신 CLI 자체 AI 호출 레이어.
// ai-config.ts 설정 기반으로 curl/fetch로 직접 호출.

import { getAIConfig } from './config';
import { routeTask, getTemperature, type AITask } from './ai-config';

// ============================================================
// PART 1 — Types
// ============================================================

export interface StreamChatOptions {
  systemInstruction?: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
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

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=StreamChatOptions,ChatResult

// ============================================================
// PART 2 — Provider Endpoints
// ============================================================

interface ProviderConfig {
  baseUrl: string;
  authHeader: (key: string) => Record<string, string>;
  bodyBuilder: (opts: StreamChatOptions, model: string) => Record<string, unknown>;
  extractContent: (data: unknown) => string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    bodyBuilder: (opts, model) => ({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature,
      system: opts.systemInstruction,
      messages: opts.messages.filter(m => m.role !== 'system'),
    }),
    extractContent: (data: any) => data?.content?.[0]?.text ?? '',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    bodyBuilder: (opts, model) => ({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature,
      messages: [
        ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
        ...opts.messages,
      ],
    }),
    extractContent: (data: any) => data?.choices?.[0]?.message?.content ?? '',
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    authHeader: () => ({}), // key goes in URL
    bodyBuilder: (opts, _model) => ({
      contents: opts.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: opts.systemInstruction ? { parts: [{ text: opts.systemInstruction }] } : undefined,
      generationConfig: { temperature: opts.temperature, maxOutputTokens: opts.maxTokens ?? 4096 },
    }),
    extractContent: (data: any) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    bodyBuilder: (opts, model) => ({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature,
      messages: [
        ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
        ...opts.messages,
      ],
    }),
    extractContent: (data: any) => data?.choices?.[0]?.message?.content ?? '',
  },
  ollama: {
    baseUrl: 'http://localhost:11434/api/chat',
    authHeader: () => ({}),
    bodyBuilder: (opts, model) => ({
      model,
      stream: false,
      messages: [
        ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
        ...opts.messages,
      ],
      options: { temperature: opts.temperature },
    }),
    extractContent: (data: any) => data?.message?.content ?? '',
  },
};

// IDENTITY_SEAL: PART-2 | role=providers | inputs=none | outputs=PROVIDERS

// ============================================================
// PART 3 — streamChat (핵심 API — @/lib/ai-providers 대체)
// ============================================================

export async function streamChat(opts: StreamChatOptions): Promise<ChatResult> {
  const config = getAIConfig();
  const start = performance.now();

  if (!config.apiKey) {
    const fallback = `[AI 미설정] cs config set-key <provider> <key> 로 설정하세요.`;
    opts.onChunk?.(fallback);
    return { content: fallback, model: 'none', durationMs: 0 };
  }

  const provider = PROVIDERS[config.provider];
  if (!provider) {
    const msg = `[미지원 provider: ${config.provider}]`;
    opts.onChunk?.(msg);
    return { content: msg, model: config.provider, durationMs: 0 };
  }

  // Temperature: task 기반 자동 설정 or 수동
  const temperature = opts.temperature ?? (opts.task ? getTemperature(opts.task) : 0.3);
  const optsWithTemp = { ...opts, temperature };

  const model = config.model ?? 'default';
  const body = JSON.stringify(provider.bodyBuilder(optsWithTemp, model));

  try {
    // Google은 URL에 key 포함
    let url = provider.baseUrl;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...provider.authHeader(config.apiKey),
    };

    if (config.provider === 'google') {
      url = `${provider.baseUrl}/${model}:generateContent?key=${config.apiKey}`;
    }

    // Custom base URL 지원
    if (config.baseUrl) {
      url = config.provider === 'google'
        ? `${config.baseUrl}/${model}:generateContent?key=${config.apiKey}`
        : config.baseUrl;
    }

    const response = await fetch(url, { method: 'POST', headers, body });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const msg = `[AI Error ${response.status}] ${errorText.slice(0, 200)}`;
      opts.onChunk?.(msg);
      return { content: msg, model, durationMs: Math.round(performance.now() - start) };
    }

    const data = await response.json();
    const content = provider.extractContent(data);

    opts.onChunk?.(content);

    return {
      content,
      model,
      tokensUsed: data?.usage?.total_tokens ?? data?.usageMetadata?.totalTokenCount,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (e) {
    const msg = `[AI 호출 실패] ${(e as Error).message}`;
    opts.onChunk?.(msg);
    return { content: msg, model, durationMs: Math.round(performance.now() - start) };
  }
}

// IDENTITY_SEAL: PART-3 | role=stream-chat | inputs=StreamChatOptions | outputs=ChatResult

// ============================================================
// PART 4 — Convenience: Quick Ask
// ============================================================

export async function quickAsk(
  prompt: string,
  system?: string,
  task?: AITask,
): Promise<string> {
  const result = await streamChat({
    systemInstruction: system,
    messages: [{ role: 'user', content: prompt }],
    task,
  });
  return result.content;
}

// IDENTITY_SEAL: PART-4 | role=quick-ask | inputs=prompt | outputs=string

// ============================================================
// PART 5 — getAIConfig re-export (호환성)
// ============================================================

export function getAIConfig(): { provider: string; model: string; apiKey: string; baseUrl?: string } {
  const { loadMergedConfig } = require('./config');
  const config = loadMergedConfig();
  return {
    provider: config.provider ?? 'groq',
    model: config.model ?? 'llama-3.3-70b-versatile',
    apiKey: config.keys?.[config.provider ?? 'groq'] ?? process.env.CS_API_KEY ?? '',
    baseUrl: config.baseUrl,
  };
}

// IDENTITY_SEAL: PART-5 | role=config-reexport | inputs=none | outputs=config
