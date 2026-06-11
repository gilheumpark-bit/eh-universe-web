import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;

import { logger } from '@/lib/logger';
import type { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { executeGeminiHostedFirst, normalizeUserApiKey } from '@/lib/google-genai-server';
import { hasServerProviderCredentials } from '@/lib/server-ai';
import { SPARK_SERVER_URL } from '@/services/sparkService';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
// [N2 — 2026-06-11] 전 AI 경로 서버 단일 게이트: runNoa 입력 판정 + filterTrademarks 출력 IP 필터
import { applyNoaGate, filterJsonIp } from '@/lib/noa/server-gate';
import {
  handleCharacters, handleWorldDesign, handleWorldSim, handleSceneDirection, handleItems, handleSkills, handleMagicSystems,
  StructuredTask, StoryHints, WorldContext, SceneTierContext
} from '@/services/geminiStructuredTaskService';
// [Codex UI domain — 2026-05-10] 사용자가 언어와 다른 도메인 선택 가능 (예: 영어 작가가 무협).
import type { CodexDomain } from '@/lib/ai/codex-prompts';

const VALID_DOMAINS: readonly CodexDomain[] = [
  'korean-webnovel', 'western-fantasy', 'japanese-lightnovel', 'chinese-xianxia',
] as const;

function validateDomain(value: unknown): CodexDomain | undefined {
  if (typeof value !== 'string') return undefined;
  return VALID_DOMAINS.includes(value as CodexDomain) ? (value as CodexDomain) : undefined;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 262_144; // 256KB
const SAFE_MODEL_PATTERN = /^[a-zA-Z0-9._-]+$/;

// Task implementations are now dynamically imported from @/services/geminiStructuredTaskService

// ============================================================
// PART 3 — Task validation helpers
// ============================================================

function validateTask(task: unknown): task is StructuredTask {
  return task === 'characters' || task === 'worldDesign' || task === 'worldSim' || task === 'sceneDirection' || task === 'items' || task === 'skills' || task === 'magicSystems';
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
  domain?: CodexDomain,
): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  switch (task) {
    case 'characters': {
      const config = body.config as Pick<StoryConfig, 'genre' | 'synopsis'> | undefined;
      if (!config?.genre || !config?.synopsis) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid character config' }, { status: 400 }) };
      }
      return { ok: true, data: await handleCharacters(apiKey, model, config, language, clampCount(body.count, 4), toStringArray(body.existingNames), domain) };
    }
    case 'items': {
      const config = body.config as Pick<StoryConfig, 'genre' | 'synopsis'> | undefined;
      if (!config?.genre || !config?.synopsis) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid items config' }, { status: 400 }) };
      }
      return { ok: true, data: await handleItems(apiKey, model, config, language, clampCount(body.count, 3), toStringArray(body.existingNames), domain) };
    }
    case 'skills': {
      const config = body.config as Pick<StoryConfig, 'genre' | 'synopsis'> | undefined;
      if (!config?.genre || !config?.synopsis) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid skills config' }, { status: 400 }) };
      }
      return { ok: true, data: await handleSkills(apiKey, model, config, language, clampCount(body.count, 3), toStringArray(body.existingNames), domain) };
    }
    case 'magicSystems': {
      const config = body.config as Pick<StoryConfig, 'genre' | 'synopsis'> | undefined;
      if (!config?.genre || !config?.synopsis) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid magicSystems config' }, { status: 400 }) };
      }
      return { ok: true, data: await handleMagicSystems(apiKey, model, config, language, clampCount(body.count, 2), toStringArray(body.existingNames), domain) };
    }
    case 'worldDesign': {
      if (typeof body.genre !== 'string' || !body.genre.trim()) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid genre' }, { status: 400 }) };
      }
      return { ok: true, data: await handleWorldDesign(apiKey, model, body.genre, language, body.hints as StoryHints | undefined, domain) };
    }
    case 'worldSim': {
      if (typeof body.synopsis !== 'string' || typeof body.genre !== 'string') {
        return { ok: false, response: NextResponse.json({ error: 'Invalid world simulator input' }, { status: 400 }) };
      }
      return { ok: true, data: await handleWorldSim(apiKey, model, body.synopsis, body.genre, language, body.worldContext as WorldContext | undefined, domain) };
    }
    case 'sceneDirection': {
      if (typeof body.synopsis !== 'string' || !Array.isArray(body.characters)) {
        return { ok: false, response: NextResponse.json({ error: 'Invalid scene direction input' }, { status: 400 }) };
      }
      return { ok: true, data: await handleSceneDirection(apiKey, model, body.synopsis, toStringArray(body.characters), language, body.tierContext as SceneTierContext | undefined, domain) };
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

    const userApiKey = normalizeUserApiKey(body.apiKey);
    if (!userApiKey && !hasServerProviderCredentials('gemini') && !SPARK_SERVER_URL) {
      return NextResponse.json(
        { error: 'Gemini server credentials are not configured. Add your key in Settings or configure Vertex AI on the server.' },
        { status: 401 },
      );
    }

    // [C] 인증 게이트 — BYOK 없으면 Firebase JWT 필수 (호스팅 Gemini 크레딧 방어)
    if (!userApiKey) {
      const authHeader = req.headers.get('authorization');
      let verified = false;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const { verifyFirebaseIdToken } = await import('@/lib/firebase-id-token');
          const token = authHeader.slice(7).trim();
          verified = Boolean(await verifyFirebaseIdToken(token));
        } catch { /* verification failed */ }
      }
      if (!verified) {
        return NextResponse.json(
          { error: 'Authentication required for hosted credits (or provide apiKey)' },
          { status: 401 },
        );
      }
    }

    if (!validateTask(body.task)) {
      return NextResponse.json({ error: 'Invalid task' }, { status: 400 });
    }
    const task = body.task;

    // [N2] NOA 서버 게이트 — 입력 판정 (사용자 텍스트: synopsis·genre·characters. AI 호출 전 차단).
    // 차단 계약: 200 + { blocked, reason, gradeRequired } (N4 고지 UI 와 공유 — 사일런트 차단 금지).
    const cfg = (body.config && typeof body.config === 'object' ? body.config : undefined) as
      | { genre?: unknown; synopsis?: unknown }
      | undefined;
    const gateText = [cfg?.genre, cfg?.synopsis, body.genre, body.synopsis, ...toStringArray(body.characters)]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .join('\n');
    const prismGrade = typeof body.prismMode === 'string' ? body.prismMode : undefined;
    const gate = await applyNoaGate({
      prompt: gateText,
      grade: prismGrade, // PRISM 등급 연동 차등 (ALL=최엄격 → M18=완화)
      domain: prismGrade ? undefined : 'creative', // 등급 미전달 시 기본: 스튜디오 구조화 생성 — creative 가중
      sourceTier: userApiKey ? 1 : 2,
      route: '/api/gemini-structured',
      language: getLanguage(body.language),
      ip,
    });
    if (gate.blocked) {
      return NextResponse.json({ blocked: true, reason: gate.reason, gradeRequired: gate.gradeRequired }, { status: 200 });
    }

    // [Codex UI domain — 2026-05-10] body.domain (옵션) 으로 사용자가 도메인 명시 선택.
    const domain = validateDomain(body.domain);
    const execution = await executeGeminiHostedFirst(body.apiKey, (effectiveApiKey) =>
      dispatchTask(task, body, effectiveApiKey, getModel(body.model), getLanguage(body.language), domain),
    );
    if (!execution.result.ok) return execution.result.response;
    // [N2] 출력 IP 필터 — JSON 안전 치환 (치환이 JSON 을 깨면 fail-open: 원본 반환 + 로깅)
    return NextResponse.json(filterJsonIp(execution.result.data, '/api/gemini-structured').value);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('API:gemini-structured', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: message.slice(0, 240) }, { status: errorToStatus(message) });
  }
}
