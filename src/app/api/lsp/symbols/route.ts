// ============================================================
// /api/lsp/symbols — GET: Symbol Index export.
// Body 또는 Query 로 config + episodes 받아 빌드 결과 반환.
// ============================================================

import { NextResponse } from 'next/server';
import { isValidTokenFormat, checkRateLimit } from '@/lib/lsp/auth';
import { buildSymbolIndex } from '@/lib/symbol-index/builder';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';

export const runtime = 'nodejs';

interface SymbolsRequest {
  config: Partial<StoryConfig>;
  episodes?: EpisodeManuscript[];
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rl = checkRateLimit(token);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: SymbolsRequest;
  try {
    body = (await request.json()) as SymbolsRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // 최소 config 형식 보정
  const config: StoryConfig = {
    genre: 'fantasy',
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: 'LSP',
    totalEpisodes: body.episodes?.length ?? 0,
    guardrails: { language: 'KO' } as unknown as StoryConfig['guardrails'],
    characters: [],
    platform: 'web',
    ...body.config,
  } as StoryConfig;

  const index = buildSymbolIndex(config, body.episodes ?? []);

  return NextResponse.json({
    definitions: Array.from(index.definitions.values()),
    referencesCount: index.surfaceMap.size,
    byKindCounts: {
      character: index.byKind.character.length,
      place: index.byKind.place.length,
      item: index.byKind.item.length,
      concept: index.byKind.concept.length,
      event: index.byKind.event.length,
    },
    manuscriptHash: index.manuscriptHash,
    builtAt: index.builtAt,
  });
}
