import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;

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
import { streamSparkAI } from '@/services/sparkService';
import { VLLM_MODEL_ID } from '@/lib/dgx-models';
import { isDgxDeveloperApiEnabled } from '@/lib/server-dgx-dev';
import { logger } from '@/lib/logger';
import { checkRateLimitAsync as sharedCheckRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import '@/lib/server-ai-init';
// [N2 — 2026-06-11] 전 AI 경로 서버 단일 게이트: runNoa 입력 판정 + filterTrademarks 출력 IP 필터
import { applyNoaGate, filterOutputIp, wrapStreamWithIpAudit } from '@/lib/noa/server-gate';
import { checkSameOriginHeaders } from '@/lib/api-origin-guard';
import { enforceServerTierLimit } from '@/lib/server-tier-limit';

export const runtime = 'nodejs';

const DEFAULT_MODELS: Record<string, string> = {
  upstage: 'solar-pro3',
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-5.4-mini',
  claude: 'claude-sonnet-4-6',
  deepseek: 'deepseek-v4-flash',
  mistral: 'mistral-medium-3-5',
};

const ALLOWED_PROVIDERS = new Set(Object.keys(DEFAULT_MODELS));
const GOOGLE_GENAI_TIMEOUT_MS = 55_000;

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
          '번역 보조를 쓰려면 로그인하거나 환경 설정에서 연결 키를 등록해 주세요.',
      },
      { status: 401 },
    );
  }
  const verified = await verifyFirebaseIdToken(token);
  if (!verified) {
    return NextResponse.json({ error: '유효하지 않은 로그인 상태입니다.' }, { status: 401 });
  }
  return null;
}

async function runGeminiViaGoogleGenAI(params: {
  finalModel: string;
  prompt: string;
  promptTokens: number;
  stage: number;
  mode: 'novel' | 'general';
  ip?: string;
}): Promise<Response> {
  const { finalModel, prompt, promptTokens, stage, mode, ip } = params;
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
        abortSignal: AbortSignal.timeout(GOOGLE_GENAI_TIMEOUT_MS),
      },
    });
    const text = response.text ?? '';
    // [N2] 출력 IP 필터 (fail-open — 필터 장애 시 원문 반환 + 로깅)
    return NextResponse.json(
      { result: filterOutputIp(text, '/api/translate').output, stage, approxPromptTokens: promptTokens },
      { headers: { 'X-Approx-Prompt-Tokens': String(promptTokens) } },
    );
  }

  const stream = await ai.models.generateContentStream({
    model: finalModel,
    contents: prompt,
    config: {
      temperature: dynamicTemperature,
      topP: dynamicTopP,
      abortSignal: AbortSignal.timeout(GOOGLE_GENAI_TIMEOUT_MS),
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

  // [N2] plain-text 스트림 IP 검사 — notice 주입 시 본문 오염 → 검출 시 로깅만 (format: 'text')
  return new Response(wrapStreamWithIpAudit(readable, { route: '/api/translate', ip, format: 'text' }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Approx-Prompt-Tokens': String(promptTokens),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const originCheck = checkSameOriginHeaders(req.headers);
    if (!originCheck.ok) {
      return NextResponse.json({ error: originCheck.error }, { status: 403 });
    }

    const ip = getClientIp(req.headers);
    const rl = await sharedCheckRateLimit(ip, 'translate', RATE_LIMITS.translate);
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
    const { provider = 'upstage', apiKey: rawApiKey, model, stage = 0, mode = 'novel' } = body;

    if (!ALLOWED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: '지원하지 않는 번역 방식입니다.' }, { status: 400 });
    }

    const clientKey = normalizeUserApiKey(rawApiKey);
    const finalModel = model || DEFAULT_MODELS[provider] || 'gemini-2.5-flash';
    // [B.1 — 2026-05-08] raw 옵션: dual-pipeline 이 buildPrompt 를 이미 적용한 prompt 를 보낼 때
    // server-side 에서 buildPrompt 재호출을 건너뛴다 (이중 wrap 방지).
    const isRaw = (body as { raw?: boolean }).raw === true;
    const prompt = isRaw ? ((body as { text?: string }).text ?? '') : buildPrompt(body);
    const promptTokens = approxTokens(prompt);
    const dynamicTemperature = stage === 4 && mode === 'novel' ? 0.4 : 0.1;
    const dynamicTopP = stage === 4 && mode === 'novel' ? 0.95 : 0.9;

    // [N2] NOA 서버 게이트 — 입력 판정 (AI 호출 전 차단·비용 절약).
    // 차단 계약: 200 + { blocked, reason, gradeRequired } (N4 고지 UI 와 공유 — 사일런트 차단 금지).
    const rawPrismMode = (body as { prismMode?: unknown }).prismMode;
    const prismGrade = typeof rawPrismMode === 'string' ? rawPrismMode : undefined;
    const gate = await applyNoaGate({
      prompt,
      grade: prismGrade, // PRISM 등급 연동 차등 (ALL=최엄격 → M18=완화)
      domain: prismGrade ? undefined : (mode === 'novel' ? 'creative' : 'general'), // 등급 미전달 시: 소설 번역 — creative 가중
      sourceTier: clientKey ? 1 : 2,
      route: '/api/translate',
      language: body.to, // 차단 사유 언어 — 번역 목표 언어 기준 (en* → 영어)
      ip,
    });
    if (gate.blocked) {
      return NextResponse.json({ blocked: true, reason: gate.reason, gradeRequired: gate.gradeRequired }, { status: 200 });
    }

    const tierGate = await enforceServerTierLimit({
      headers: req.headers,
      ip,
      route: '/api/translate',
      feature: 'translation',
      hasByok: Boolean(clientKey),
    });
    if (!tierGate.ok) return tierGate.response;

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
          ip,
        });
      }

      // DGX 개발 API 폴백: 명시 플래그가 켜진 로컬/개발 실행에서만 허용
      if (isDgxDeveloperApiEnabled()) {
        try {
          const sparkStream = await streamSparkAI(
            VLLM_MODEL_ID, prompt, [{ role: 'user', content: prompt }], dynamicTemperature,
            { userId: 'vercel-server', userTier: 'free' }
          );
          const reader = sparkStream.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          let skipCount = 0;
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
              } catch { skipCount++; }
            }
          }
          if (skipCount > 0) logger.warn('api/translate', 'SSE partial chunks skipped', { skipCount });
          // [N2] 출력 IP 필터 (fail-open — 필터 장애 시 원문 반환 + 로깅)
          return NextResponse.json(
            { result: filterOutputIp(fullText, '/api/translate').output, stage, approxPromptTokens: promptTokens },
            { headers: { 'X-Approx-Prompt-Tokens': String(promptTokens) } },
          );
        } catch (e) {
          return NextResponse.json(
            { error: `번역 처리에 실패했습니다: ${e instanceof Error ? e.message : e}` },
            { status: 502 },
          );
        }
      }

      return NextResponse.json(
        { error: '선택한 번역 방식에 연결 키가 필요합니다.' },
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
      // DGX 개발 API 폴백: 명시 플래그가 켜진 로컬/개발 실행에서만 허용
      if (isDgxDeveloperApiEnabled()) {
        try {
          const sparkStream = await streamSparkAI(
            VLLM_MODEL_ID, prompt, [{ role: 'user', content: prompt }], dynamicTemperature,
            { userId: 'vercel-server', userTier: 'free' }
          );
          const reader = sparkStream.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          let skipCount = 0;
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
              } catch { skipCount++; }
            }
          }
          if (skipCount > 0) logger.warn('api/translate', 'SSE partial chunks skipped', { skipCount });
          // [N2] 출력 IP 필터 (fail-open — 필터 장애 시 원문 반환 + 로깅)
          return NextResponse.json(
            { result: filterOutputIp(fullText, '/api/translate').output, stage, approxPromptTokens: promptTokens },
            { headers: { 'X-Approx-Prompt-Tokens': String(promptTokens) } },
          );
        } catch (e) {
          return NextResponse.json({ error: `번역 처리에 실패했습니다: ${e instanceof Error ? e.message : e}` }, { status: 502 });
        }
      }
      return NextResponse.json(
        { error: '선택한 번역 방식에 연결 키가 필요합니다.' },
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
      case 'upstage':
        aiModel = createOpenAI({ apiKey: finalApiKey, baseURL: 'https://api.upstage.ai/v1' })(finalModel);
        break;
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
        return NextResponse.json({ error: '지원하지 않는 번역 방식입니다.' }, { status: 400 });
    }

    if (stage === 10 || stage === 0) {
      const { text } = await generateText({
        model: aiModel,
        prompt,
        temperature: dynamicTemperature,
        topP: dynamicTopP,
      });
      // [N2] 출력 IP 필터 (fail-open — 필터 장애 시 원문 반환 + 로깅)
      return NextResponse.json(
        { result: filterOutputIp(text, '/api/translate').output, stage, approxPromptTokens: promptTokens },
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
    // [N2] plain-text 스트림 IP 검사 — notice 주입 시 본문 오염 → 검출 시 로깅만 (format: 'text')
    if (res.body) {
      return new Response(
        wrapStreamWithIpAudit(res.body, { route: '/api/translate', ip, format: 'text' }),
        { headers: res.headers },
      );
    }
    return res;
  } catch (err: unknown) {
    logger.error('api/translate', 'Translation error', err);
    return NextResponse.json(
      { error: '번역 처리 중 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
}
