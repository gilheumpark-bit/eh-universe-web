import { GoogleGenAI } from '@google/genai';

// ============================================================
// PART 1: CONSTANTS & CONFIG
// ============================================================

const OPENAI_COMPAT_URLS: Record<string, string> = {
  openai:  'https://api.openai.com/v1/chat/completions',
  groq:    'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

// ============================================================
// PART 2: TYPES & HELPERS
// ============================================================

export type ServerProviderId = 'openai' | 'gemini' | 'claude' | 'groq' | 'mistral';
export type UserTier = 'free' | 'pro' | 'internal';
export type AdapterMode = 'LEFT_BRAIN' | 'RIGHT_BRAIN';

export function normalizeUserApiKey(key?: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.startsWith('sk-') || trimmed.startsWith('AIza')) return trimmed;
  return '';
}

export function isGeminiAllocationExhaustedError(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return (
    msg.includes('429') || 
    msg.includes('quota') || 
    msg.includes('limit') || 
    msg.includes('exhausted')
  );
}

export function resolveServerProviderKey(provider: string, _clientKey?: string): string | null {
  const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  return envKey || null;
}

export function hasServerProviderCredentials(provider: string): boolean {
  return !!process.env[`${provider.toUpperCase()}_API_KEY`];
}

export function getTierLimits(tier: string) {
  return { tier, dailyLimit: 500_000 };
}

export function createServerGeminiClient(apiKey?: string): GoogleGenAI {
  const explicitApiKey = apiKey?.trim();
  if (explicitApiKey) {
    return new GoogleGenAI({ apiKey: explicitApiKey });
  }

  const envApiKey = process.env.GEMINI_API_KEY?.trim();
  if (envApiKey) {
    return new GoogleGenAI({ apiKey: envApiKey });
  }

  throw new Error('Gemini server credentials are not configured');
}

// ============================================================
// PART 3: STREAMING PREPARATIONS
// ============================================================

async function streamOpenAICompat(
  provider: string, apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[], temperature: number,
  customBaseUrl?: string,
): Promise<ReadableStream> {
  const url = customBaseUrl
    ? `${customBaseUrl.replace(/\/$/, '')}/v1/chat/completions`
    : OPENAI_COMPAT_URLS[provider];
  if (!url) throw new Error(`Unknown provider: ${provider}`);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey && !customBaseUrl) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`${provider} API ${res.status}: ${err}`);
  }

  if (!res.body) throw new Error('Empty response body');
  return res.body as unknown as ReadableStream;
}

async function streamClaude(
  apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[], temperature: number,
  maxTokens?: number
): Promise<ReadableStream> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens ?? 8192, system, messages, temperature, stream: true }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  if (!res.body) throw new Error('Empty response body');
  return res.body as unknown as ReadableStream;
}

async function streamGemini(
  apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[], temperature: number
): Promise<ReadableStream> {
  const ai = createServerGeminiClient(apiKey);
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
  const streamingResponse = await ai.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction: system,
      temperature,
      topP: 0.95,
    },
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let emittedText = '';
      try {
        // Handle both object-with-stream and direct-generator patterns
        const chunks = (streamingResponse as any).stream || streamingResponse;
        for await (const chunk of chunks) {
          const rawText = (chunk as any).text ?? '';
          if (!rawText) continue;

          const text = rawText.startsWith(emittedText)
            ? rawText.slice(emittedText.length)
            : rawText;

          if (!text) continue;

          emittedText += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            candidates: [{ content: { parts: [{ text }] } }],
          })}\n\n`));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

// ============================================================
// PART 4: SECURITY & DISPATCHER
// ============================================================

export async function runNoa(_input: { text: string; domain?: string; sourceTier?: number }): Promise<{ allowed: boolean; tactical: { reason: string }; auditEntry: { id: string } }> {
  // Simplified NOA Passthrough for Main process
  return {
    allowed: true,
    tactical: { reason: 'MAIN_PROCESS_PASSTHROUGH' },
    auditEntry: { id: `main-${Date.now()}` }
  };
}

export async function dispatchStream(
  provider: string, apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[],
  temperature: number, maxTokens?: number,
): Promise<{ ok: true; stream: ReadableStream } | { ok: false; error: string }> {
  try {
    switch (provider) {
      case 'gemini':
        return { ok: true, stream: await streamGemini(apiKey, model, system, messages, temperature) };
      case 'openai':
      case 'groq':
      case 'mistral':
        return { ok: true, stream: await streamOpenAICompat(provider, apiKey, model, system, messages, temperature) };
      case 'claude':
        return { ok: true, stream: await streamClaude(apiKey, model, system, messages, temperature, maxTokens) };
      default:
        return { ok: false, error: `Invalid provider [${provider}] for main process.` };
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
