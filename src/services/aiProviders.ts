import { createServerGeminiClient } from '@/lib/google-genai-server';
import { streamSparkAI } from './sparkService';
import { VLLM_MODEL_ID } from '@/lib/dgx-models';
import { isDgxDeveloperApiEnabled } from '@/lib/server-dgx-dev';

const OPENAI_COMPAT_URLS: Record<string, string> = {
  openai:  'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  qwen:    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  minimax: 'https://api.minimax.io/v1/chat/completions',
  kimi:    'https://api.moonshot.ai/v1/chat/completions',
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

  // [QA-robustness (1)] 클라이언트 중단(stream.cancel) 시 업스트림 genai 호출을 abort 해
  // 토큰/컴퓨트 낭비를 끊는다. timeout(120s)도 같은 컨트롤러로 통합 — 둘 중 먼저 발생한 쪽이 abort.
  const controllerAbort = new AbortController();
  const timeoutId = setTimeout(() => controllerAbort.abort(new Error('Gemini stream timeout')), 120_000);

  const stream = await ai.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction: system,
      temperature,
      topP: 0.95,
      abortSignal: controllerAbort.signal,
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
        // cancel()로 abort 된 경우(소비자가 이미 떠남)는 정상 종료로 취급 — 노이즈 에러 억제.
        if (controllerAbort.signal.aborted) {
          try { controller.close(); } catch { /* already closed/errored */ }
        } else {
          controller.error(error);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    },
    // [QA-robustness (1)] 소비자가 스트림을 취소하면 업스트림 generator 를 abort 해 finalize.
    cancel(reason) {
      clearTimeout(timeoutId);
      if (!controllerAbort.signal.aborted) {
        controllerAbort.abort(reason instanceof Error ? reason : new Error(String(reason ?? 'stream cancelled')));
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
      case 'deepseek':
      case 'qwen':
      case 'minimax':
      case 'kimi':
      case 'groq':
      case 'mistral':
        return { ok: true, stream: await streamOpenAICompat(provider, apiKey, model, system, messages, temperature) };
      case 'ollama':
      case 'lmstudio':
        // DGX 개발 API 플래그가 켜진 경우에만 로컬/개발 서버로 폴백
        if (isDgxDeveloperApiEnabled()) {
          return { ok: true, stream: await streamSparkAI(VLLM_MODEL_ID, system, messages, temperature, { userId: 'vercel-server', userTier: 'free' }) };
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
