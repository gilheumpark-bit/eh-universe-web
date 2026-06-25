// ============================================================
// /api/lsp/full-context — POST: 4 레이어 통합 prompt-ready 텍스트.
//
// 모델 구분 없는 외부 통합 — GPT/Claude/Gemini 어떤 AI 든 동일 적용.
// 외부 도구가 본 endpoint 호출 → 응답을 자기 system prompt 에 prepend.
//
// Body: { config?, episodes?, messages?, userInput?, language? }
// Response: { storyContext, intentMemory, metaContext, fullPrompt }
// ============================================================

import { NextResponse } from 'next/server';
import { authorizeLspRequest, lspAuthHeaders } from '@/lib/lsp/auth';
import { collectStoryContext, buildStoryContextModifier } from '@/engine/story-context';
import { buildIntentDigest, buildIntentMemoryModifier } from '@/engine/intent-memory';
import { extractMetaDefinitions } from '@/lib/meta-context/extractor';
import { buildMetaContextModifier } from '@/lib/meta-context/prompt-injector';
import type { StoryConfig, EpisodeManuscript, Message, AppLanguage } from '@/lib/studio-types';

export const runtime = 'nodejs';

interface FullContextRequest {
  config?: Partial<StoryConfig>;
  episodes?: EpisodeManuscript[];
  messages?: Message[];
  userInput?: string;
  language?: AppLanguage;
}

export async function POST(request: Request): Promise<NextResponse> {
  const authResult = await authorizeLspRequest(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status, headers: lspAuthHeaders(authResult) },
    );
  }

  let body: FullContextRequest;
  try {
    body = (await request.json()) as FullContextRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const language = body.language ?? 'KO';

  // L1: Story Context
  let storyContext = '';
  if (body.config) {
    const config: StoryConfig = {
      genre: 'fantasy',
      povCharacter: '',
      setting: '',
      primaryEmotion: '',
      episode: 1,
      title: 'LSP',
      totalEpisodes: body.episodes?.length ?? 0,
      // 의도적 double-cast: 이 LSP 라우트는 length guardrail(min/max) 미사용. PclGuardrails 완화/캐스트 제거 금지 — deref 사이트 TS18048 유발.
      guardrails: { language: 'KO' } as unknown as StoryConfig['guardrails'],
      characters: [],
      platform: 'web',
      ...body.config,
    } as unknown as StoryConfig;
    const snapshot = collectStoryContext({ config, episodes: body.episodes });
    storyContext = buildStoryContextModifier(snapshot, { language, charCap: 500 });
  }

  // L2: Intent Memory
  let intentMemory = '';
  if (body.messages && body.messages.length > 0) {
    const digest = buildIntentDigest(body.messages, { language, recentN: 5, userOnly: true });
    intentMemory = buildIntentMemoryModifier(digest, { language, charCap: 200 });
  }

  // L4: Meta-Context (서버측은 stateless — 단일 input 추출만)
  let metaContext = '';
  if (body.userInput) {
    const defs = extractMetaDefinitions(body.userInput, 0, Date.now());
    if (defs.length > 0) {
      const current: Record<string, typeof defs[0]> = {};
      for (const d of defs) current[`${d.kind}:${d.key}`] = d;
      metaContext = buildMetaContextModifier(
        { definitions: defs, current, conflicts: [] },
        { language, charCap: 400 },
      );
    }
  }

  const fullPrompt = [storyContext, intentMemory, metaContext]
    .filter((s) => s && s.length > 0)
    .join('\n\n---\n\n');

  return NextResponse.json(
    {
      storyContext,
      intentMemory,
      metaContext,
      fullPrompt,
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'X-RateLimit-Remaining': String(authResult.remaining) } },
  );
}

export function GET(): NextResponse {
  return NextResponse.json({
    name: 'Loreguard LSP — Full Context',
    description: '4-layer context (story / intent / meta) → AI prompt-ready text. Model-agnostic.',
    method: 'POST',
    headers: { Authorization: 'Bearer <LSP_TOKEN>' },
    body: { config: 'StoryConfig (optional)', episodes: 'EpisodeManuscript[] (optional)', messages: 'Message[] (optional)', userInput: 'string (optional)', language: 'KO|EN|JP|CN' },
    docs: 'docs/novel-ide/lsp-spec.md',
  });
}
