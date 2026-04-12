import { createServerGeminiClient } from '@/lib/google-genai-server';
import { streamSparkAI, SPARK_SERVER_URL } from './sparkService';

const OPENAI_COMPAT_URLS: Record<string, string> = {
  openai:  'https://api.openai.com/v1/chat/completions',
  groq:    'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

export async function streamOpenAICompat(
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
    signal: AbortSignal.timeout(120_000),
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
  return res.body;
}

export async function streamClaude(
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
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({ model, max_tokens: maxTokens ?? 8192, system, messages, temperature, stream: true }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  if (!res.body) throw new Error('Empty response body');
  return res.body;
}

export async function streamGemini(
  apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[], temperature: number
): Promise<ReadableStream> {
  const ai = createServerGeminiClient(apiKey);
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
  const stream = await ai.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction: system,
      temperature,
      topP: 0.95,
      abortSignal: AbortSignal.timeout(120_000),
    },
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let emittedText = '';
      try {
        for await (const chunk of stream) {
          const rawText = chunk.text ?? '';
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


export async function dispatchStream(
  provider: string, apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[],
  temperature: number, maxTokens?: number,
): Promise<{ ok: true; stream: ReadableStream } | { ok: false; error: string }> {
  try {
    switch (provider) {
      case 'spark':
        return { ok: true, stream: await streamSparkAI(model, system, messages, temperature, { userId: 'vercel-server', userTier: 'free' }) };
      case 'gemini':
        return { ok: true, stream: await streamGemini(apiKey, model, system, messages, temperature) };
      case 'openai':
      case 'groq':
      case 'mistral':
        return { ok: true, stream: await streamOpenAICompat(provider, apiKey, model, system, messages, temperature) };
      case 'ollama':
      case 'lmstudio':
        // 프로덕션: DGX Spark 서버로 폴백 (모델명을 DGX 기본 모델로 교체)
        if (SPARK_SERVER_URL) {
          return { ok: true, stream: await streamSparkAI('Qwen/Qwen2.5-14B-Instruct-AWQ', system, messages, temperature, { userId: 'vercel-server', userTier: 'free' }) };
        }
        return { ok: false, error: 'Local providers must use /api/local-proxy' };
      case 'claude':
        return { ok: true, stream: await streamClaude(apiKey, model, system, messages, temperature, maxTokens) };
      default:
        return { ok: false, error: 'Invalid provider' };
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
