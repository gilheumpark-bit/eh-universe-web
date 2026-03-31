import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import type { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { resolveServerProviderKey } from '@/lib/server-ai';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import {
  handleCharacters, handleWorldDesign, handleWorldSim, handleSceneDirection, handleItems,
  StructuredTask, StoryHints, WorldContext, SceneTierContext
} from '@/services/geminiStructuredTaskService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 262_144; // 256KB
const SAFE_MODEL_PATTERN = /^[a-zA-Z0-9._-]+$/;

// Task implementations are now dynamically imported from @/services/geminiStructuredTaskService

// ============================================================
// PART 3 — Task validation helpers
// ============================================================

function validateTask(task: unknown): task is StructuredTask {
  return task === 'characters' || task === 'worldDesign' || task === 'worldSim' || task === 'sceneDirection' || task === 'items';
}

function clampCount(value: unknown, defaultVal: number): number {
  return typeof value === 'number' ? Math.min(Math.max(value, 1), 10) : defaultVal;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as unknown[]).filter((v): v is string => typeof v === 'string') : [];
}

function validateOrigin(req: NextRequest, _hasClientKey?: boolean): NextResponse | null {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  // Origin 검증 — BYOK 포함 모든 요청에 적용
  if (!origin) {
    return NextResponse.json({ error: 'Forbidden: Origin header required' }, { status: 403 });
  }
  if (host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

async function parseRequest(req: NextRequest): Promise<Record<string, unknown>> {
  const rawText = await req.text();
  if (Buffer.byteLength(rawText, 'utf8') > MAX_REQUEST_BYTES) {
    throw new Error('Request too large');
  }
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JSON');
  }
}

function getLanguage(value: unknown): AppLanguage {
  return value === 'EN' || value === 'JP' || value === 'CN' ? value : 'KO';
}

function getModel(value: unknown): string {
  if (typeof value === 'string' && SAFE_MODEL_PATTERN.test(value)) {
    return value;
  }
  return 'gemini-2.5-pro';
}

/** Dispatch task to the correct handler after validation. Returns data or error response. */
async function dispatchTask(
  task: StructuredTask,
  body: Record<string, unknown>,
  apiKey: string,
  model: string,
  language: AppLanguage,
): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  switch (task) {
    case 'characters': {
      const config = body.config as Pick<StoryConfig, 'genre' | 'synopsis'> | undefined;
      if (!config?.genre || !config?.synopsis) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid character config' }, { status: 400 }) };
      }
      return { ok: true, data: await handleCharacters(apiKey, model, config, language, clampCount(body.count, 4), toStringArray(body.existingNames)) };
    }
    case 'worldDesign': {
      if (typeof body.genre !== 'string' || !body.genre.trim()) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid genre' }, { status: 400 }) };
      }
      return { ok: true, data: await handleWorldDesign(apiKey, model, body.genre, language, body.hints as StoryHints | undefined) };
    }
    case 'worldSim': {
      if (typeof body.synopsis !== 'string' || typeof body.genre !== 'string') {
        return { ok: false, response: NextResponse.json({ error: 'Invalid world simulator input' }, { status: 400 }) };
      }
      return { ok: true, data: await handleWorldSim(apiKey, model, body.synopsis, body.genre, language, body.worldContext as WorldContext | undefined) };
    }
    case 'sceneDirection': {
      if (typeof body.synopsis !== 'string' || !Array.isArray(body.characters)) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid scene direction input' }, { status: 400 }) };
      }
      return { ok: true, data: await handleSceneDirection(apiKey, model, body.synopsis, toStringArray(body.characters), language, body.tierContext as SceneTierContext | undefined) };
    }
    case 'items': {
      const config = body.config as Pick<StoryConfig, 'genre' | 'synopsis'> | undefined;
      if (!config?.genre || !config?.synopsis) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid item config' }, { status: 400 }) };
      }
      return { ok: true, data: await handleItems(apiKey, model, config, language, clampCount(body.count, 3), toStringArray(body.existingNames)) };
    }
    default:
      return { ok: false, response: NextResponse.json({ error: 'Invalid task' }, { status: 400 }) };
  }
}

function errorToStatus(message: string): number {
  if (/Request too large/i.test(message)) return 413;
  if (/Invalid JSON/i.test(message)) return 400;
  if (/401|403|unauthorized/i.test(message)) return 401;
  return 500;
}

// ============================================================
// PART 4 — Route handler (thin orchestrator)
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(ip, 'gemini-structured', RATE_LIMITS.default);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await parseRequest(req);
    const forbidden = validateOrigin(req, !!body.apiKey);
    if (forbidden) return forbidden;

    const apiKey = resolveServerProviderKey('gemini', body.apiKey);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Set a personal key or configure GEMINI_API_KEY on the server.' },
        { status: 401 },
      );
    }

    if (!validateTask(body.task)) {
      return NextResponse.json({ error: 'Invalid task' }, { status: 400 });
    }

    const result = await dispatchTask(body.task, body, apiKey, getModel(body.model), getLanguage(body.language));
    if (!result.ok) return result.response;
    return NextResponse.json(result.data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('API:gemini-structured', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: message.slice(0, 240) }, { status: errorToStatus(message) });
  }
}
