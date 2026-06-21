// ============================================================
// PART 1 — Inline Completion API Route
// ============================================================
// POST /api/complete
// Lightweight, fast completion for Tab-autocomplete in the novel editor.
// Prefers Hosted developer API. DGX is local/development fallback only when explicitly enabled.
// Max 100 tokens, low latency is priority.

import { NextRequest, NextResponse } from 'next/server';
import { VLLM_MODEL_ID } from '@/lib/dgx-models';
import { getFirstHostedProvider, resolveServerProviderKey } from '@/lib/server-ai';
import { getDgxDeveloperApiBaseUrl, isDgxDeveloperApiEnabled } from '@/lib/server-dgx-dev';
import { dispatchStream } from '@/services/aiProviders';
import { checkRateLimitAsync, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { buildAgentSystemPrompt } from '@/lib/ai/writing-agent-registry';
import { normalizeToAgentLang } from '@/lib/ai/lang-normalize';
import { checkSameOriginHeaders } from '@/lib/api-origin-guard';
// [N2 — 2026-06-11] 전 AI 경로 서버 단일 게이트: runNoa 입력 판정 + filterTrademarks 출력 IP 필터
import { applyNoaGate, filterOutputIp } from '@/lib/noa/server-gate';
import { enforceServerTierLimit } from '@/lib/server-tier-limit';

export const maxDuration = 15; // Quick timeout — completion must be fast
const COMPLETE_BODY_LIMIT_BYTES = 64 * 1024;

// ============================================================
// PART 2 — System Prompt (writing-agent-registry 위임)
// ============================================================
//
// [2026-05-10 — I-02·I-05 마이그레이션] inline buildSystemPrompt 제거.
// studio-inline-completion 레지스트리 정의 사용 → 4언어 자동 (ko/en/ja/zh).
//
// 변경 전: if (lang==='ko') { 한국어 } else { 영어 }   ← 한·영 2언어만
// 변경 후: buildAgentSystemPrompt('studio-inline-completion', { language })
//          → registry guards (no-english-thinking-korean-novel + ip-brand-guard)
//          + LANG_DIRECTIVE 자동 주입 + character-dna context block 슬롯

// ============================================================
// PART 3 — Request Handler
// ============================================================

/** Read an SSE ReadableStream to a single trimmed completion string (non-streaming). */
async function drainStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
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
  return fullText.trim();
}

async function readCompleteJson(req: NextRequest): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > COMPLETE_BODY_LIMIT_BYTES) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }

  if (!req.body) {
    return await req.json() as Record<string, unknown>;
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > COMPLETE_BODY_LIMIT_BYTES) {
      try { await reader.cancel(); } catch { /* body already closed */ }
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(merged)) as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const originCheck = checkSameOriginHeaders(req.headers);
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  // Rate limit: completion requests are frequent, limit tightly
  const ip = getClientIp(req.headers);
  const rl = await checkRateLimitAsync(ip, 'complete', RATE_LIMITS.default);
  if (!rl.allowed) {
    const retrySec = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Rate limited', retryAfter: retrySec },
      { status: 429, headers: { 'Retry-After': String(retrySec) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await readCompleteJson(req);
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Auth check — Firebase JWT 실검증 또는 BYOK 키 형식 검증
  const authHeader = req.headers.get('authorization');
  let verifiedUser: Awaited<ReturnType<typeof import('@/lib/firebase-id-token').verifyFirebaseIdToken>> = null;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    // 길이만 보던 기존 검증을 실제 JWT 검증으로 교체
    try {
      const { verifyFirebaseIdToken } = await import('@/lib/firebase-id-token');
      const verified = await verifyFirebaseIdToken(token);
      verifiedUser = verified;
    } catch { /* verification module load failed — deny */ }
  }
  // BYOK: 제공자 키 형식 검사 (sk-xxx / AIza... / gsk_... 등 최소 패턴) +
  // 키 prefix → 제공자 매핑. chat/structured-generate 정책과 동일하게,
  // BYOK 경로는 호스팅 서버 자원(DGX Spark·env 키)을 쓰지 않고 *유저 자기 키*로 생성한다.
  // (정규식 통과만으로 호스팅 크레딧을 소모하던 #17 인증 우회 차단.)
  const byokKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  let byokProvider: 'openai' | 'gemini' | 'groq' | null = null;
  if (/^AIza[A-Za-z0-9_-]{30,}$/.test(byokKey)) byokProvider = 'gemini';
  else if (/^gsk_[A-Za-z0-9_-]{20,}$/.test(byokKey)) byokProvider = 'groq';
  else if (/^sk-[A-Za-z0-9_-]{20,}$/.test(byokKey)) byokProvider = 'openai';
  const hasByok = byokProvider !== null;

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length < 10) {
    return NextResponse.json({ error: 'Text too short' }, { status: 400 });
  }

  const genre = typeof body.genre === 'string' ? body.genre : undefined;
  const characters = Array.isArray(body.characters) ? (body.characters as string[]).slice(0, 10) : [];
  // [I-05 — 2026-05-10] 4언어 정규화 ('ko'|'en'|'ja'|'zh'). 비표준 별칭 흡수 ('kr','jp','cn' 등).
  const language = normalizeToAgentLang(body.language);
  const maxTokens = Math.min(Number(body.maxTokens) || 100, 150);

  // Build user message — pure text (마지막 500자만 — Tab 컨텍스트).
  // [P-02 — 2026-05-10] genre/characters 가 user message 에 inline 되던 패턴 폐기 →
  // registry contextBlock 슬롯 (character-dna / genre-rules) 으로 단일 소스 통합.
  // [N2] NOA 서버 게이트 — 입력 판정 (AI 호출 전 차단·비용 절약).
  // 차단 계약: 200 + { blocked, reason, gradeRequired } (N4 고지 UI 와 공유 — 사일런트 차단 금지).
  const prismGrade = typeof body.prismMode === 'string' ? body.prismMode : undefined;
  const gate = await applyNoaGate({
    prompt: text,
    grade: prismGrade, // PRISM 등급 연동 차등 (ALL=최엄격 → M18=완화)
    domain: prismGrade ? undefined : 'creative', // 등급 미전달 시 기본: 소설 에디터 — creative 가중
    sourceTier: hasByok ? 1 : 2,
    route: '/api/complete',
    language,
    ip,
  });
  if (gate.blocked) {
    return NextResponse.json({ blocked: true, reason: gate.reason, gradeRequired: gate.gradeRequired }, { status: 200 });
  }

  const tierGate = await enforceServerTierLimit({
    headers: req.headers,
    ip,
    route: '/api/complete',
    feature: 'inline-completion',
    hasByok,
    verifiedUser,
  });
  if (!tierGate.ok) return tierGate.response;

  const userContent = text.slice(-500);
  const characterDnaBlock = characters.length > 0
    ? `Active characters in this scene: ${characters.join(', ')}`
    : undefined;
  const genreRulesBlock = genre
    ? `Target genre: ${genre}. Match its conventional rhythm and dialogue tone.`
    : undefined;

  // [I-02 — 2026-05-10 + P-02] 레지스트리 호출로 통합. 4언어 + guards + contextBlock 슬롯 자동 적용.
  // [autoTrim — 2026-05-10] critical token pressure 도달 시 자동 절삭 활성화.
  const systemPrompt = buildAgentSystemPrompt('studio-inline-completion', {
    language,
    'character-dna': characterDnaBlock,
    'genre-rules': genreRulesBlock,
  }, { autoTrim: true });
  const messages = [{ role: 'user', content: userContent }];

  const FAST_MODELS: Record<string, string> = {
    gemini: 'gemini-2.5-flash-lite',
    openai: 'gpt-5.4-nano',
    claude: 'claude-haiku-4-5',
    groq: 'llama-3.1-8b-instant',
    mistral: 'mistral-small-2603',
  };

  // ── Strategy 0: BYOK — 유저 자기 키로 생성 (호스팅 자원 미사용·자기 과금) ──
  // 로그인 여부와 무관하게 명시적 BYOK가 있으면 BYOK를 최우선 사용한다.
  if (hasByok && byokProvider) {
    const byokModel = FAST_MODELS[byokProvider] ?? 'gemini-2.5-flash-lite';
    try {
      const result = await dispatchStream(
        byokProvider, byokKey, byokModel,
        systemPrompt, messages,
        0.7, maxTokens,
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      const completion = await drainStream(result.stream);
      if (!completion) {
        return NextResponse.json({ error: 'Empty completion' }, { status: 502 });
      }
      // [N2] 출력 IP 필터 (fail-open — 필터 장애 시 원문 반환 + 로깅)
      return NextResponse.json({ completion: filterOutputIp(completion, '/api/complete').output });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ── Strategy 1: Hosted developer API provider ──
  const hostedProvider = getFirstHostedProvider();
  if (hostedProvider) {
    const apiKey = resolveServerProviderKey(hostedProvider) ?? '';
    if (!apiKey) {
      return NextResponse.json({ error: 'No connection key configured' }, { status: 503 });
    }

    const model = FAST_MODELS[hostedProvider] ?? 'gpt-5.4-nano';

    try {
      const result = await dispatchStream(
        hostedProvider, apiKey, model,
        systemPrompt, messages,
        0.7, maxTokens,
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }

      const completion = await drainStream(result.stream);
      if (!completion) {
        return NextResponse.json({ error: 'Empty completion' }, { status: 502 });
      }

      // [N2] 출력 IP 필터 (fail-open — 필터 장애 시 원문 반환 + 로깅)
      return NextResponse.json({ completion: filterOutputIp(completion, '/api/complete').output });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (!isDgxDeveloperApiEnabled()) {
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }
  }

  // ── Strategy 2: DGX local/development API fallback only when explicitly enabled ──
  if (isDgxDeveloperApiEnabled()) {
    const dgxBaseUrl = getDgxDeveloperApiBaseUrl();
    try {
      const sparkRes = await fetch(`${dgxBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: VLLM_MODEL_ID,
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
          return NextResponse.json({ completion: filterOutputIp(completion, '/api/complete').output });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'No AI provider available' }, { status: 503 });
}
