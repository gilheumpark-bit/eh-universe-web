// ============================================================
// PART 0: API Route — Server-side AI proxy
// ============================================================
// Accepts POST { provider, model, systemInstruction, messages, temperature, apiKey? }
// If apiKey is provided (BYOK mode), uses it.
// Otherwise falls back to server environment variables.
// Keys NEVER appear in client JS bundles.

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// PART 1: ENV KEY FALLBACKS
// ============================================================

const ENV_KEYS: Record<string, string | undefined> = {
  gemini:  process.env.GEMINI_API_KEY,
  openai:  process.env.OPENAI_API_KEY,
  claude:  process.env.CLAUDE_API_KEY,
  groq:    process.env.GROQ_API_KEY,
  mistral: process.env.MISTRAL_API_KEY,
};

// ============================================================
// PART 2: OPENAI-COMPATIBLE STREAMING
// ============================================================

const OPENAI_COMPAT_URLS: Record<string, string> = {
  openai:  'https://api.openai.com/v1/chat/completions',
  groq:    'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

async function streamOpenAICompat(
  provider: string, apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[], temperature: number
): Promise<ReadableStream> {
  const url = OPENAI_COMPAT_URLS[provider];
  if (!url) throw new Error(`Unknown provider: ${provider}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
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

  return res.body!;
}

// ============================================================
// PART 3: CLAUDE STREAMING
// ============================================================

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

  return res.body!;
}

// ============================================================
// PART 4: GEMINI STREAMING
// ============================================================

async function streamGemini(
  apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[], temperature: number
): Promise<ReadableStream> {
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature, topP: 0.95 },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }

  return res.body!;
}

// ============================================================
// PART 5: POST HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, model, systemInstruction, messages, temperature = 0.9, apiKey: clientKey, maxTokens } = body;

    // Resolve API key: client BYOK > server env
    const apiKey = clientKey || ENV_KEYS[provider];
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Set via BYOK or server environment variable.' },
        { status: 401 }
      );
    }

    let stream: ReadableStream;

    switch (provider) {
      case 'gemini':
        stream = await streamGemini(apiKey, model, systemInstruction, messages, temperature);
        break;
      case 'openai':
      case 'groq':
      case 'mistral':
        stream = await streamOpenAICompat(provider, apiKey, model, systemInstruction, messages, temperature);
        break;
      case 'claude':
        stream = await streamClaude(apiKey, model, systemInstruction, messages, temperature, maxTokens);
        break;
      default:
        return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
