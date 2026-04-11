import { NextRequest, NextResponse } from 'next/server';
import { streamText, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createMistral } from '@ai-sdk/mistral';
import { buildPrompt, type BuildPromptParams } from '@/lib/build-prompt';
import {
  hasServerProviderCredentials,
  isServerProviderId,
  resolveServerProviderKey,
  type ServerProviderId,
} from '@/lib/server-ai';
import {
  createServerGeminiClient,
  hasGeminiServerCredentials,
  normalizeUserApiKey,
} from '@/lib/google-genai-server';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';
import { SPARK_SERVER_URL, streamSparkAI } from '@/services/sparkService';
import { logger } from '@/lib/logger';
import { checkRateLimit as sharedCheckRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const DEFAULT_MODELS: Record<string, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o',
  claude: 'claude-3-5-sonnet-latest',
  deepseek: 'deepseek-chat',
  mistral: 'mistral-large-latest',
};

const ALLOWED_PROVIDERS = new Set(Object.keys(DEFAULT_MODELS));

function approxTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

function resolveDeepseekEnvKey(): string {
  return process.env.DEEPSEEK_API_KEY?.trim() || '';
}

/** Hosted path (no BYOK in body): require Firebase ID token when server-side AI is used. */
async function gateHostedIfNoByok(req: NextRequest, clientKey: string): Promise<NextResponse | null> {
  if (clientKey.trim()) return null;
  const auth = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  const token = m?.[1]?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error:
          '호스티드 AI를 쓰려면 로그인하거나 설정에서 API 키(BYOK)를 입력하세요.',
      },
      { status: 401 },
    );
  }
  const verified = await verifyFirebaseIdToken(token);
  if (!verified) {
    return NextResponse.json({ error: '유효하지 않은 인증입니다.' }, { status: 401 });
  }
  return null;
}

async function runGeminiViaGoogleGenAI(params: {
  finalModel: string;
  prompt: string;
  promptTokens: number;
  stage: number;
  mode: 'novel' | 'general';
}): Promise<Response> {
  const { finalModel, prompt, promptTokens, stage, mode } = params;
  const dynamicTemperature = stage === 4 && mode === 'novel' ? 0.4 : 0.1;
  const dynamicTopP = stage === 4 && mode === 'novel' ? 0.95 : 0.9;

  const ai = createServerGeminiClient();

  if (stage === 10 || stage === 0) {
    const response = await ai.models.generateContent({
      model: finalModel,
      contents: prompt,
      config: {
        temperature: dynamicTemperature,
        topP: dynamicTopP,
        abortSignal: AbortSignal.timeout(120_000),
      },
    });
    const text = response.text ?? '';
    return NextResponse.json(
      { result: text, stage, approxPromptTokens: promptTokens },
      { headers: { 'X-Approx-Prompt-Tokens': String(promptTokens) } },
    );
  }

  const stream = await ai.models.generateContentStream({
    model: finalModel,
    contents: prompt,
    config: {
      temperature: dynamicTemperature,
      topP: dynamicTopP,
      abortSignal: AbortSignal.timeout(120_000),
    },
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const t = chunk.text ?? '';
          if (t) controller.enqueue(encoder.encode(t));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Approx-Prompt-Tokens': String(promptTokens),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (!origin) {
      return NextResponse.json({ error: 'Forbidden: Origin header required' }, { status: 403 });
    }
    try {
      if (host && new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ip = getClientIp(req.headers);
    const rl = sharedCheckRateLimit(ip, 'translate', RATE_LIMITS.translate);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = (await req.json()) as BuildPromptParams & {
      provider?: string;
      apiKey?: string;
      model?: string;
      stage?: number;
      mode?: 'novel' | 'general';
    };
    const { provider = 'gemini', apiKey: rawApiKey, model, stage = 0, mode = 'novel' } = body;

    if (!ALLOWED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: '지원하지 않는 번역 엔진입니다.' }, { status: 400 });
    }

    const clientKey = normalizeUserApiKey(rawApiKey);
    const finalModel = model || DEFAULT_MODELS[provider] || 'gemini-2.5-flash';
    const prompt = buildPrompt(body);
    const promptTokens = approxTokens(prompt);
    const dynamicTemperature = stage === 4 && mode === 'novel' ? 0.4 : 0.1;
    const dynamicTopP = stage === 4 && mode === 'novel' ? 0.95 : 0.9;

    if (provider === 'gemini') {
      const resolvedSdkKey = resolveServerProviderKey('gemini', clientKey) || '';

      if (resolvedSdkKey) {
        const hosted = !clientKey && hasServerProviderCredentials('gemini');
        if (hosted) {
          const denied = await gateHostedIfNoByok(req, clientKey);
          if (denied) return denied;
        }
        const aiModel = createGoogleGenerativeAI({ apiKey: resolvedSdkKey })(finalModel);

        if (stage === 10 || stage === 0) {
          const { text } = await generateText({
            model: aiModel,
            prompt,
            temperature: dynamicTemperature,
            topP: dynamicTopP,
          });
          return NextResponse.json(
            { result: text, stage, approxPromptTokens: promptTokens },
            { headers: { 'X-Approx-Prompt-Tokens': String(promptTokens) } },
          );
        }

        const resultStream = await streamText({
          model: aiModel,
          prompt,
          temperature: dynamicTemperature,
          topP: dynamicTopP,
        });

        const res = resultStream.toTextStreamResponse();
        res.headers.set('X-Approx-Prompt-Tokens', String(promptTokens));
        return res;
      }

      if (hasGeminiServerCredentials()) {
        const denied = await gateHostedIfNoByok(req, clientKey);
        if (denied) return denied;
        return runGeminiViaGoogleGenAI({
          finalModel,
          prompt,
          promptTokens,
          stage,
          mode,
        });
      }

      // DGX Spark 폴백: Gemini 서버 키도 없고 BYOK도 없을 때
      if (SPARK_SERVER_URL) {
        try {
          const sparkStream = await streamSparkAI(
            'google/gemma-4-26b-a4b', prompt, [{ role: 'user', content: prompt }], dynamicTemperature
          );
          const reader = sparkStream.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            // SSE 파싱
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
              try {
                const j = JSON.parse(line.slice(6));
                const delta = j.choices?.[0]?.delta?.content;
                if (delta) fullText += delta;
              } catch { /* skip */ }
            }
          }
          return NextResponse.json(
            { result: fullText, stage, approxPromptTokens: promptTokens },
            { headers: { 'X-Approx-Prompt-Tokens': String(promptTokens) } },
          );
        } catch (e) {
          return NextResponse.json(
            { error: `DGX Spark 번역 실패: ${e instanceof Error ? e.message : e}` },
            { status: 502 },
          );
        }
      }

      return NextResponse.json(
        { error: '선택한 번역 엔진의 API 키가 설정되지 않았습니다.' },
        { status: 400 },
      );
    }

    let finalApiKey = '';
    if (provider === 'deepseek') {
      finalApiKey = clientKey || resolveDeepseekEnvKey();
    } else if (isServerProviderId(provider)) {
      finalApiKey = resolveServerProviderKey(provider as ServerProviderId, clientKey) || '';
    } else {
      finalApiKey = clientKey || process.env[`${provider.toUpperCase()}_API_KEY`]?.trim() || '';
    }

    if (!finalApiKey) {
      // DGX Spark 폴백
      if (SPARK_SERVER_URL) {
        try {
          const sparkStream = await streamSparkAI(
            'google/gemma-4-26b-a4b', prompt, [{ role: 'user', content: prompt }], dynamicTemperature
          );
          const reader = sparkStream.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
              try {
                const j = JSON.parse(line.slice(6));
                const delta = j.choices?.[0]?.delta?.content;
                if (delta) fullText += delta;
              } catch { /* skip */ }
            }
          }
          return NextResponse.json(
            { result: fullText, stage, approxPromptTokens: promptTokens },
            { headers: { 'X-Approx-Prompt-Tokens': String(promptTokens) } },
          );
        } catch (e) {
          return NextResponse.json({ error: `DGX Spark 번역 실패: ${e instanceof Error ? e.message : e}` }, { status: 502 });
        }
      }
      return NextResponse.json(
        { error: '선택한 번역 엔진의 API 키가 설정되지 않았습니다.' },
        { status: 400 },
      );
    }

    const hostedNonByok =
      !clientKey &&
      (provider === 'deepseek'
        ? Boolean(resolveDeepseekEnvKey())
        : isServerProviderId(provider) && hasServerProviderCredentials(provider as ServerProviderId));

    if (hostedNonByok) {
      const denied = await gateHostedIfNoByok(req, clientKey);
      if (denied) return denied;
    }

    let aiModel;
    switch (provider) {
      case 'openai':
        aiModel = createOpenAI({ apiKey: finalApiKey })(finalModel);
        break;
      case 'claude':
        aiModel = createAnthropic({ apiKey: finalApiKey })(finalModel);
        break;
      case 'deepseek':
        aiModel = createDeepSeek({ apiKey: finalApiKey })(finalModel);
        break;
      case 'mistral':
        aiModel = createMistral({ apiKey: finalApiKey })(finalModel);
        break;
      default:
        return NextResponse.json({ error: '지원하지 않는 번역 엔진입니다.' }, { status: 400 });
    }

    if (stage === 10 || stage === 0) {
      const { text } = await generateText({
        model: aiModel,
        prompt,
        temperature: dynamicTemperature,
        topP: dynamicTopP,
      });
      return NextResponse.json(
        { result: text, stage, approxPromptTokens: promptTokens },
        { headers: { 'X-Approx-Prompt-Tokens': String(promptTokens) } },
      );
    }

    const resultStream = await streamText({
      model: aiModel,
      prompt,
      temperature: dynamicTemperature,
      topP: dynamicTopP,
    });

    const res = resultStream.toTextStreamResponse();
    res.headers.set('X-Approx-Prompt-Tokens', String(promptTokens));
    return res;
  } catch (err: unknown) {
    logger.error('api/translate', 'Translation error', err);
    return NextResponse.json(
      { error: '번역 처리 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    );
  }
}
