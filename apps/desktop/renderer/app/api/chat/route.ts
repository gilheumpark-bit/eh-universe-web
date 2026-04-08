import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// ----------------------------------------------------------------------------
// EH Code Studio: Optimized Chat Route v3.4 (Production Grade)
// ----------------------------------------------------------------------------

export const runtime = 'nodejs';
export const maxDuration = 300; 

export async function POST(req: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  
  try {
    const body = await req.json();
    const { 
      messages, 
      provider, 
      model, 
      apiKey, 
      temperature, 
      maxTokens, 
      systemInstruction, 
      apiOptions 
    } = body;

    logger.info(`[CHAT:${requestId}] Request received`, { provider, model, messageCount: messages?.length });

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    let aiProvider;
    let effectiveApiKey = apiKey;

    // Provider Resolution
    try {
      if (provider === 'gemini') {
        const key = effectiveApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!key) throw new Error('Gemini API Key is missing');
        aiProvider = google(model || 'gemini-2.0-flash-exp');
      } else if (provider === 'openai') {
        const key = effectiveApiKey || process.env.OPENAI_API_KEY;
        if (!key) throw new Error('OpenAI API Key is missing');
        aiProvider = openai(model || 'gpt-4o');
      } else if (provider === 'claude') {
        const key = effectiveApiKey || process.env.ANTHROPIC_API_KEY;
        if (!key) throw new Error('Anthropic API Key is missing');
        aiProvider = anthropic(model || 'claude-3-5-sonnet-latest');
      } else {
        aiProvider = google('gemini-2.5-pro');
      }
    } catch (confError: any) {
      logger.error(`[CHAT:${requestId}] Config Error`, { error: confError.message });
      return NextResponse.json({ error: confError.message }, { status: 401 });
    }

    const result = await streamText({
      model: aiProvider,
      messages,
      system: systemInstruction,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 4096, // Increased default for code heavy tasks
      onFinish: (event) => {
        const { usage, finishReason } = event;
        logger.info(`[CHAT:${requestId}] Stream finished`, { 
          finishReason,
          usage: {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
          }
        });
      },
      ...apiOptions,
    });

    return result.toTextStreamResponse();

  } catch (error: any) {
    logger.error(`[CHAT:${requestId}] Critical Error`, { 
      message: error?.message, 
      stack: error?.stack 
    });
    
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to stream chat',
        type: error?.name || 'InternalServerError'
      },
      { status: 500 }
    );
  }
}

// IDENTITY_SEAL: PART-01 | role=api-route | inputs=JsonRequest | outputs=TextStreamResponse
