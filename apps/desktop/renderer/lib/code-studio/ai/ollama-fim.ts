/**
 * ollama-fim.ts — Ollama Fill-In-the-Middle (FIM) provider
 *
 * Direct HTTP call to local Ollama for sub-200ms code completion.
 * Bypasses IPC for lowest possible latency.
 *
 * Supports native FIM tokens for CodeLlama, DeepSeek Coder, StarCoder, Qwen2.5-Coder.
 * Falls back to chat-style completion for models without FIM support.
 */

// ============================================================
// PART 1 — FIM model detection + prompt builders
// ============================================================

const FIM_MODELS: Record<string, { prefix: string; suffix: string; middle: string }> = {
  codellama:    { prefix: '<PRE> ',    suffix: ' <SUF>',    middle: ' <MID>' },
  'deepseek-coder': { prefix: '<｜fim▁begin｜>', suffix: '<｜fim▁hole｜>', middle: '<｜fim▁end｜>' },
  starcoder:    { prefix: '<fim_prefix>', suffix: '<fim_suffix>', middle: '<fim_middle>' },
  starcoder2:   { prefix: '<fim_prefix>', suffix: '<fim_suffix>', middle: '<fim_middle>' },
  'qwen2.5-coder': { prefix: '<|fim_prefix|>', suffix: '<|fim_suffix|>', middle: '<|fim_middle|>' },
  codegemma:    { prefix: '<|fim_prefix|>', suffix: '<|fim_suffix|>', middle: '<|fim_middle|>' },
};

export function supportsFIM(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  return Object.keys(FIM_MODELS).some((k) => lower.includes(k));
}

export function buildFIMPrompt(model: string, codeBefore: string, codeAfter: string): string {
  const lower = model.toLowerCase();
  for (const [key, tokens] of Object.entries(FIM_MODELS)) {
    if (lower.includes(key)) {
      return `${tokens.prefix}${codeBefore}${tokens.suffix}${codeAfter}${tokens.middle}`;
    }
  }
  // Fallback: generic instruction
  return `Complete the code at the cursor position:\n\n${codeBefore}<CURSOR>${codeAfter}`;
}

// ============================================================
// PART 2 — Direct HTTP FIM call
// ============================================================

export interface OllamaFIMOptions {
  baseUrl: string;
  model: string;
  codeBefore: string;
  codeAfter: string;
  language: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface OllamaFIMResult {
  completion: string;
  latencyMs: number;
  source: 'ollama-fim' | 'ollama-chat';
}

export async function ollamaFIM(opts: OllamaFIMOptions): Promise<OllamaFIMResult> {
  const t0 = performance.now();
  const { baseUrl, model, codeBefore, codeAfter, maxTokens = 150, signal } = opts;
  const url = baseUrl.replace(/\/+$/, '');

  if (supportsFIM(model)) {
    // Native FIM via /api/generate
    const prompt = buildFIMPrompt(model, codeBefore, codeAfter);
    const res = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: { num_predict: maxTokens, temperature: 0.1, stop: ['\n\n', '<|endoftext|>', '<|end|>', '</s>'] },
      }),
      signal,
    });

    if (!res.ok || !res.body) throw new Error(`Ollama FIM: ${res.status}`);
    return {
      completion: await consumeGenerateStream(res.body),
      latencyMs: performance.now() - t0,
      source: 'ollama-fim',
    };
  }

  // Non-FIM model: use chat completion endpoint
  const res = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a code completion engine. Output ONLY the code that goes at the cursor. No markdown, no explanation.' },
        { role: 'user', content: `Complete the code at <CURSOR>:\n\n${codeBefore}<CURSOR>${codeAfter}` },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
      stream: true,
    }),
    signal,
  });

  if (!res.ok || !res.body) throw new Error(`Ollama chat FIM: ${res.status}`);
  return {
    completion: await consumeChatStream(res.body),
    latencyMs: performance.now() - t0,
    source: 'ollama-chat',
  };
}

// ============================================================
// PART 3 — Stream consumers
// ============================================================

async function consumeGenerateStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line) as { response?: string; done?: boolean };
          if (obj.response) result += obj.response;
          if (obj.done) { await reader.cancel(); return result.trim(); }
        } catch { /* skip malformed */ }
      }

      // Safety: cap at 2KB to prevent runaway generation
      if (result.length > 2048) { await reader.cancel(); break; }
    }
  } finally {
    reader.releaseLock();
  }
  return result.trim();
}

async function consumeChatStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') { await reader.cancel(); return result.trim(); }
        try {
          const obj = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const chunk = obj.choices?.[0]?.delta?.content;
          if (chunk) result += chunk;
        } catch { /* skip */ }
      }

      if (result.length > 2048) { await reader.cancel(); break; }
    }
  } finally {
    reader.releaseLock();
  }
  return result.trim();
}

// ============================================================
// PART 4 — Latency tracker for adaptive switching
// ============================================================

const LATENCY_WINDOW = 10;
const latencyHistory: number[] = [];

export function recordLatency(ms: number): void {
  latencyHistory.push(ms);
  if (latencyHistory.length > LATENCY_WINDOW) latencyHistory.shift();
}

export function getAverageLatency(): number {
  if (latencyHistory.length === 0) return 0;
  return latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
}

/** Returns true if local model is consistently too slow (>500ms avg) */
export function shouldFallbackToCloud(): boolean {
  return latencyHistory.length >= 5 && getAverageLatency() > 500;
}
