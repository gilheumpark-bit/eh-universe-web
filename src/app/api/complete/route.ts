// ============================================================
// PART 1 — Inline Completion API Route
// ============================================================
// POST /api/complete
// Lightweight, fast completion for Tab-autocomplete in the novel editor.
// Prefers DGX Spark → then cheapest hosted provider.
// Max 100 tokens, low latency is priority.

import { NextRequest, NextResponse } from 'next/server';
import { SPARK_SERVER_URL } from '@/services/sparkService';
import { MODEL_GENERAL } from '@/lib/dgx-models';
import { getFirstHostedProvider, resolveServerProviderKey } from '@/lib/server-ai';
import { dispatchStream } from '@/services/aiProviders';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

export const maxDuration = 15; // Quick timeout — completion must be fast

// ============================================================
// PART 2 — System Prompt
// ============================================================

function buildSystemPrompt(language: string): string {
  if (language === 'ko') {
    return '당신은 소설 집필 도우미입니다. 이야기를 자연스럽게 이어서 1~2문장만 작성하세요. 기존 문체와 톤을 유지하세요. 오직 이어질 문장만 출력하세요. 설명, 주석, 따옴표 없이 순수 텍스트만.';
  }
  return 'You are a novel writing assistant. Continue the story naturally in 1-2 sentences. Match the existing style and tone. Output only the continuation text. No explanations, no quotes, no annotations.';
}

// ============================================================
// PART 3 — Request Handler
// ============================================================

export async function POST(req: NextRequest) {
  // Rate limit: completion requests are frequent, limit tightly
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, 'complete', RATE_LIMITS.default);
  if (!rl.allowed) {
    const retrySec = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Rate limited', retryAfter: retrySec },
      { status: 429, headers: { 'Retry-After': String(retrySec) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length < 10) {
    return NextResponse.json({ error: 'Text too short' }, { status: 400 });
  }

  const genre = typeof body.genre === 'string' ? body.genre : undefined;
  const characters = Array.isArray(body.characters) ? (body.characters as string[]).slice(0, 10) : [];
  const language = body.language === 'ko' ? 'ko' : 'en';
  const maxTokens = Math.min(Number(body.maxTokens) || 100, 150);

  // Build user message with context
  let userContent = text.slice(-500);
  if (genre) userContent = `[Genre: ${genre}]\n${userContent}`;
  if (characters.length > 0) userContent = `[Characters: ${characters.join(', ')}]\n${userContent}`;

  const systemPrompt = buildSystemPrompt(language);
  const messages = [{ role: 'user', content: userContent }];

  // ── Strategy 1: DGX Spark (fastest, no key needed) ──
  if (SPARK_SERVER_URL) {
    try {
      const sparkRes = await fetch(`${SPARK_SERVER_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL_GENERAL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (sparkRes.ok) {
        const data = await sparkRes.json() as { choices?: Array<{ message?: { content?: string } }> };
        const completion = data.choices?.[0]?.message?.content?.trim();
        if (completion) {
          return NextResponse.json({ completion });
        }
      }
    } catch {
      // Fall through to hosted provider
    }
  }

  // ── Strategy 2: Hosted provider (cheapest available) ──
  const hostedProvider = getFirstHostedProvider();
  if (!hostedProvider) {
    return NextResponse.json({ error: 'No AI provider available' }, { status: 503 });
  }

  const apiKey = resolveServerProviderKey(hostedProvider) ?? '';
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 503 });
  }

  // Use the cheapest/fastest model per provider
  const FAST_MODELS: Record<string, string> = {
    gemini: 'gemini-2.5-flash-lite',
    openai: 'gpt-4.1-nano',
    claude: 'claude-haiku-4-5',
    groq: 'llama-3.1-8b-instant',
    mistral: 'mistral-small-latest',
  };
  const model = FAST_MODELS[hostedProvider] ?? 'gemini-2.5-flash-lite';

  try {
    const result = await dispatchStream(
      hostedProvider, apiKey, model,
      systemPrompt, messages,
      0.7, maxTokens,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // Read the full stream to string (non-streaming for completion)
    const reader = result.stream.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE data lines
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {
            // Non-JSON data line, might be raw text
            if (data && data !== '[DONE]') fullText += data;
          }
        }
      }
    }

    const completion = fullText.trim();
    if (!completion) {
      return NextResponse.json({ error: 'Empty completion' }, { status: 502 });
    }

    return NextResponse.json({ completion });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
